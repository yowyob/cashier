import { prisma } from "@/lib/prisma";
import { MovementService } from "@/services/movement.service";

type TicketingData = { total: number; denominations: Record<string, number> };

export class BillService {
    static async payBillFromAccount(
        cashRegisterId: string,
        accountId: string,
        amount: number,
        cashierId: string,
        invoiceCode: string
    ) {
        if (amount <= 0) throw new Error("Invalid bill amount.");

        // Validate account
        const account = await prisma.account.findUnique({
            where: { id: accountId },
            include: { customer: { include: { person: true } } }
        });
        if (!account) throw new Error("Account not found.");
        if (!account.is_active) throw new Error("Account is not active.");
        if (account.total_funds < amount) throw new Error("Insufficient funds in customer account.");

        // Validate active session
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                cash_register_id: cashRegisterId,
                state: "ouverte"
            }
        });

        if (!session) throw new Error("No active session found for this register.");

        // Net-zero on the register: we record an entree and a sortie with the same amount
        // so the cash position remains unchanged, but the movements are auditable.
        return prisma.$transaction(async (tx) => {
            // Debit account
            await tx.account.update({
                where: { id: accountId },
                data: { total_funds: { decrement: amount } }
            });

            const reference = await MovementService.generateReference("BILL");

            const inMovement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "entree",
                    amount,
                    reason: `Paiement Facture (Compte): ${invoiceCode}`,
                    create_by: cashierId,
                    emitter_id: accountId,
                    external_reference: reference,
                }
            });

            const outMovement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "sortie",
                    amount,
                    reason: `Paiement Facture (Compte): ${invoiceCode}`,
                    create_by: cashierId,
                    external_reference: reference,
                }
            });

            return { inMovement, outMovement, reference };
        });
    }

    static async payBill(
        cashRegisterId: string,
        invoiceCode: string,
        amount: number,
        cashGiven: number,
        cashierId: string,
        ticketingData?: TicketingData,
        changeTicketingData?: TicketingData
    ) {
        // 1. Validate Session
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                cash_register_id: cashRegisterId,
                state: "ouverte"
            }
        });

        if (!session) throw new Error("No active session found for this register.");

        if (amount <= 0) {
            throw new Error("Invalid bill amount.");
        }

        if (cashGiven < amount) {
            throw new Error("Cash given is less than the bill amount.");
        }

        const change = cashGiven - amount;

        // Ensure there is enough cash to give change
        if (change > 0) {
            const currentFunds = await MovementService.getSessionFunds(
                session.id,
                Number(session.theorical_initial_funds)
            );

            if (change > currentFunds) {
                throw new Error("Insufficient funds in register to give change.");
            }

            if (changeTicketingData && changeTicketingData.total && changeTicketingData.total !== change) {
                throw new Error("Change ticketing total does not match the change amount.");
            }
        }

        if (ticketingData && ticketingData.total && ticketingData.total !== amount) {
            throw new Error("Payment ticketing total does not match the bill amount.");
        }

        // 2. Execute Transaction
        return prisma.$transaction(async (tx) => {
            // Create IN movement
            const reference = await MovementService.generateReference("BILL");
            const inMovement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "entree",
                    amount: amount,
                    reason: `Paiement Facture: ${invoiceCode}`,
                    create_by: cashierId,
                    external_reference: reference,
                    event_ticketing_details: !!ticketingData
                }
            });

            // 3. Save Ticketing Details if provided (payment)
            if (ticketingData && ticketingData.total > 0) {
                for (const [denomId, quantity] of Object.entries(ticketingData.denominations)) {
                    if (quantity > 0) {
                        const denom = await tx.currencyDenomination.findUnique({ where: { id: denomId } });
                        if (denom) {
                            await tx.eventTicketingDetail.create({
                                data: {
                                    session_id: session.id,
                                    connection_type: "mouvement",
                                    quantity: quantity,
                                    value: denom.value,
                                    total: Number(denom.value) * quantity,
                                    denomination_id: denomId,
                                    movement_id: inMovement.id
                                }
                            });
                        }
                    }
                }
            }

            let changeMovement = null;
            // 4. If change, create OUT movement and ticketing
            if (change > 0) {
                changeMovement = await tx.cashRegisterMovement.create({
                    data: {
                        session_id: session.id,
                        sense: "sortie",
                        amount: change,
                        reason: `Rendu facture: ${invoiceCode}`,
                        create_by: cashierId,
                        event_ticketing_details: !!changeTicketingData,
                        external_reference: reference
                    }
                });

                if (changeTicketingData && changeTicketingData.total > 0) {
                    for (const [denomId, quantity] of Object.entries(changeTicketingData.denominations)) {
                        if (quantity > 0) {
                            const denom = await tx.currencyDenomination.findUnique({ where: { id: denomId } });
                            if (denom) {
                                await tx.eventTicketingDetail.create({
                                    data: {
                                        session_id: session.id,
                                        connection_type: "mouvement",
                                        quantity: quantity,
                                        value: denom.value,
                                        total: Number(denom.value) * quantity,
                                        denomination_id: denomId,
                                        movement_id: changeMovement.id
                                    }
                                });
                            }
                        }
                    }
                }
            }

            return { inMovement, changeMovement, change };
        });
    }
}
