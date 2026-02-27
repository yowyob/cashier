import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export class MovementService {
    static async generateReference(prefix: string, preferred?: string) {
        // Try to keep a provided reference if it is free
        if (preferred) {
            const exists = await prisma.cashRegisterMovement.findFirst({
                where: { external_reference: preferred }
            });
            if (!exists) return preferred;
        }

        let attempt = 0;
        while (attempt < 5) {
            const candidate = `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
            const exists = await prisma.cashRegisterMovement.findFirst({
                where: { external_reference: candidate }
            });
            if (!exists) return candidate;
            attempt += 1;
        }
        throw new Error("Unable to generate a unique transaction reference.");
    }

    static async recordCollection(data: {
        session_id: string;
        amount: number;
        reason: string;
        create_by: string;
        reference?: string;
    }) {
        const reference = await this.generateReference("DEP", data.reference);
        return prisma.cashRegisterMovement.create({
            data: {
                session_id: data.session_id,
                sense: "entree",
                amount: data.amount,
                reason: data.reason,
                create_by: data.create_by,
                external_reference: reference,
                is_accounted: true,
            },
        });
    }

    static async recordDisbursement(data: {
        session_id: string;
        amount: number;
        reason: string;
        create_by: string;
        reference?: string;
    }) {
        const reference = await this.generateReference("WDR", data.reference);
        return prisma.cashRegisterMovement.create({
            data: {
                session_id: data.session_id,
                sense: "sortie",
                amount: data.amount,
                reason: data.reason,
                create_by: data.create_by,
                external_reference: reference,
                is_accounted: true,
            },
        });
    }

    static async getSessionFunds(sessionId: string, initialFunds: number) {
        const movements = await prisma.cashRegisterMovement.findMany({
            where: { session_id: sessionId, is_deleted: false }
        });

        let total = Number(initialFunds);
        for (const m of movements) {
            if (m.sense === "entree") total += Number(m.amount);
            if (m.sense === "sortie") total -= Number(m.amount);
        }
        return total;
    }

    static async findSourceRegister(amount: number, agencyId: string, excludeSessionId?: string, threshold: number = 100000) {
        // 1. Find all open sessions in the same agency (excluding the requester)
        const whereClause: any = {
            state: "ouverte",
            cashRegister: {
                agency_id: agencyId
            }
        };

        // IMPORTANT: Exclude the requester's session to prevent self-transfer
        if (excludeSessionId) {
            whereClause.id = {
                not: excludeSessionId
            };
        }

        const openSessions = await prisma.cashRegisterSession.findMany({
            where: whereClause,
            include: {
                cashRegister: true
            }
        });

        // 2. Check funds for each session
        for (const session of openSessions) {
            const currentFunds = await this.getSessionFunds(session.id, Number(session.theorical_initial_funds));

            // Check if taking 'amount' leaves at least 'threshold'
            if (currentFunds - amount >= threshold) {
                return session;
            }
        }

        return null;
    }

    static async transferFunds(
        sourceSessionId: string,
        destSessionId: string,
        amount: number,
        requesterId: string,
        ticketingData?: { total: number, denominations: Record<string, number> }
    ) {
        const reference = await this.generateReference("TRF");
        return prisma.$transaction(async (tx) => {
            // 1. Create OUT movement for source
            await tx.cashRegisterMovement.create({
                data: {
                    session_id: sourceSessionId,
                    sense: "sortie",
                    amount: amount,
                    reason: "Transfert de fonds (Source)",
                    create_by: requesterId, // Or system/admin? Let's say requester triggered it.
                    recipient_id: destSessionId, // Linking to destination session
                    external_reference: reference
                }
            });

            // 2. Create IN movement for destination
            const inMovement = await tx.cashRegisterMovement.create({
                data: {
                    session_id: destSessionId,
                    sense: "entree",
                    amount: amount,
                    reason: "Transfert de fonds (Destination)",
                    create_by: requesterId,
                    emitter_id: sourceSessionId, // Linking to source session
                    event_ticketing_details: !!ticketingData,
                    external_reference: reference
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
                                    session_id: destSessionId,
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
        });
    }
}
