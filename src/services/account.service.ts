import { prisma } from "@/lib/prisma";
import { MovementService } from "@/services/movement.service";

export class AccountService {
    static async searchCustomers(query: string) {
        return prisma.customerProfile.findMany({
            where: {
                OR: [
                    { person: { user_name: { contains: query } } },
                    { person: { user_first_name: { contains: query } } },
                    { person: { phone: { contains: query } } }
                ]
            },
            include: {
                person: true,
                accounts: true
            }
        });
    }

    static async makeTransferToCustomer(
        cashRegisterId: string,
        accountId: string,
        amount: number,
        cashierId: string,
        ticketingData?: { total: number, denominations: Record<string, number> },
        customReason?: string,
        reference?: string
    ) {
        // 1. Validate Account
        const account = await prisma.account.findUnique({
            where: { id: accountId },
            include: { customer: { include: { person: true } } }
        });

        if (!account) throw new Error("Account not found.");
        if (!account.is_active) throw new Error("Account is not active.");

        // 2. Validate Cash Register Session
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                cash_register_id: cashRegisterId,
                state: "ouverte"
            }
        });

        if (!session) throw new Error("No active session found for this register.");

        // 3. Execute Transaction (Deposit: Customer gives Cash -> Register IN -> Account Credit)
        return prisma.$transaction(async (tx) => {
            // Add to Account
            const updatedAccount = await tx.account.update({
                where: { id: accountId },
                data: {
                    total_funds: { increment: amount }
                }
            });

            // Create IN Movement (Register receives cash)
            const ref = reference || await MovementService.generateReference("DEP");
            const movement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "entree",
                    amount: amount,
                    reason: customReason || `Depot compte client: ${account.customer.person.user_first_name}`,
                    create_by: cashierId,
                    recipient_id: accountId, // Linking to account
                    event_ticketing_details: !!ticketingData,
                    external_reference: ref
                }
            });

            // Save Ticketing Details if provided
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
                                    movement_id: movement.id
                                }
                            });
                        }
                    }
                }
            }

            return { account: updatedAccount, movement };
        });
    }

    static async makeWithdrawalFromCustomer(
        cashRegisterId: string,
        accountId: string,
        amount: number,
        cashierId: string,
        ticketingData?: { total: number, denominations: Record<string, number> },
        customReason?: string,
        reference?: string
    ) {
        // 1. Validate Account
        const account = await prisma.account.findUnique({
            where: { id: accountId },
            include: { customer: { include: { person: true } } }
        });

        if (!account) throw new Error("Account not found.");
        if (!account.is_active) throw new Error("Account is not active.");
        if (account.total_funds < amount) throw new Error("Insufficient funds in customer account.");

        // 2. Validate Cash Register Session
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                cash_register_id: cashRegisterId,
                state: "ouverte"
            }
        });

        if (!session) throw new Error("No active session found for this register.");

        // 3. Check Register Funds (Withdrawal: Register gives Cash -> Register OUT)
        const currentFunds = await MovementService.getSessionFunds(session.id, Number(session.theorical_initial_funds));
        if (currentFunds < amount) {
            throw new Error("Insufficient funds in cash register to perform withdrawal.");
        }

        // 4. Execute Transaction
        return prisma.$transaction(async (tx) => {
            // Deduct from Account
            const updatedAccount = await tx.account.update({
                where: { id: accountId },
                data: {
                    total_funds: { decrement: amount }
                }
            });

            // Create OUT Movement (Register gives cash)
            const ref = reference || await MovementService.generateReference("WDR");
            const movement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "sortie",
                    amount: amount,
                    reason: customReason || `Retrait compte client: ${account.customer.person.user_first_name}`,
                    create_by: cashierId,
                    emitter_id: accountId, // Linking to account
                    event_ticketing_details: !!ticketingData,
                    external_reference: ref
                }
            });

            // Save Ticketing Details if provided
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
                                    movement_id: movement.id
                                }
                            });
                        }
                    }
                }
            }

            return { account: updatedAccount, movement };
        });
    }

    static async makeTransferBetweenCustomers(
        cashRegisterId: string,
        sourceAccountId: string,
        destAccountId: string,
        amount: number,
        cashierId: string,
        ticketingData?: { total: number, denominations: Record<string, number> },
        reference?: string
    ) {
        // 1. Validate Accounts
        const sourceAccount = await prisma.account.findUnique({
            where: { id: sourceAccountId },
            include: { customer: { include: { person: true } } }
        });
        if (!sourceAccount || !sourceAccount.is_active) throw new Error("Source account invalid.");
        if (sourceAccount.total_funds < amount) throw new Error("Insufficient funds in source account.");

        const destAccount = await prisma.account.findUnique({
            where: { id: destAccountId },
            include: { customer: { include: { person: true } } }
        });
        if (!destAccount || !destAccount.is_active) throw new Error("Destination account invalid.");

        // 2. Validate Cash Register Session
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                cash_register_id: cashRegisterId,
                state: "ouverte"
            }
        });
        if (!session) throw new Error("No active session found for this register.");

        // 3. Execute Transaction (Withdraw from Source -> Register -> Deposit to Dest)
        return prisma.$transaction(async (tx) => {
            // A. Withdraw from Source
            await tx.account.update({
                where: { id: sourceAccountId },
                data: { total_funds: { decrement: amount } }
            });

            // Record IN movement (Source -> Register)
            const ref = reference || await MovementService.generateReference("P2P");
            const inMovement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "entree",
                    amount: amount,
                    reason: `Transfert P2P (Source): ${sourceAccount.customer.person.user_first_name}`,
                    create_by: cashierId,
                    emitter_id: sourceAccountId,
                    event_ticketing_details: !!ticketingData,
                    external_reference: ref
                }
            });

            // Save Ticketing Details for IN movement if provided
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

            // B. Deposit to Dest
            await tx.account.update({
                where: { id: destAccountId },
                data: { total_funds: { increment: amount } }
            });

            // Record OUT movement (Register -> Dest)
            // Note: We typically only record ticketing on the "cash handling" part. 
            // In P2P, the cash handling is usually the IN part (customer gives cash to send) 
            // OR the OUT part (customer receives cash).
            // Actually, P2P usually implies NO cash handling if it's account to account?
            // But here it seems to be mediated by the register.
            // If it's pure account-to-account, there shouldn't be cash involved.
            // But the user asked for "Global Ticketing Option".
            // If the cashier is just moving numbers, there is no ticketing.
            // Ticketing implies PHYSICAL CASH.
            // If I am doing P2P transfer, am I taking cash from A and giving it to B?
            // Or is it a digital transfer?
            // The prompt says "P2P Transfer (Customer Account to Customer Account)".
            // Usually this is digital. But if the user wants ticketing, maybe they mean:
            // "Customer A gives Cash -> Deposit to A -> Transfer to B -> Withdraw by B -> Cash to B"?
            // Or maybe just "A sends to B".
            // If it's a digital transfer, ticketing shouldn't apply.
            // However, the user asked for "Global option to record ticketing details for ANY transaction".
            // I will add it as an option. If they use it, it will attach to the IN movement (Source -> Register) 
            // assuming the cashier might be counting cash if it was a cash-based transfer?
            // Actually, if it's Account to Account, it's purely digital.
            // But I will support it just in case.

            const outMovement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: session.id,
                    sense: "sortie",
                    amount: amount,
                    reason: `Transfert P2P (Dest): ${destAccount.customer.person.user_first_name}`,
                    create_by: cashierId,
                    recipient_id: destAccountId,
                    external_reference: ref
                }
            });

            return { sourceAccount, destAccount, inMovement, outMovement, reference: ref };
        });
    }
}
