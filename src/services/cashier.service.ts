import { prisma } from "@/lib/prisma";

export class CashierService {
    static async getCashierDashboardData(cashierId: string) {
        // 1. Get Active Session
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                open_by: cashierId,
                state: "ouverte",
            },
            include: {
                cashRegister: true,
                movements: {
                    orderBy: { create_on: 'desc' },
                    include: {
                        creator: true,
                        ticketingDetails: {
                            include: {
                                denomination: true
                            }
                        }
                    }
                },
                events: {
                    where: { type: "ouverture" }
                }
            }
        });

        if (!session) {
            throw new Error("No active session found.");
        }

        // 2. Calculate Current Funds
        let currentFunds = Number(session.theorical_initial_funds);
        for (const move of session.movements) {
            if (move.sense === "entree") currentFunds += Number(move.amount);
            if (move.sense === "sortie") currentFunds -= Number(move.amount);
        }

        return {
            session,
            currentFunds,
            register: session.cashRegister,
            movements: session.movements
        };
    }
}
