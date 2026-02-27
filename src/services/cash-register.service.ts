import { prisma } from "@/lib/prisma";
import { SessionService } from "./session.service";

export class CashRegisterService {
    static async create(data: {
        create_by: string;
        adress?: string;
        country?: string;
        town?: string;
        neighborhood?: string;
        agency_id?: string;
        ip_address?: string;
        mac_address?: string;
        image_url?: string;
        min_open_time?: string;
        max_close_time?: string;
    }) {
        // Validate agency if provided
        if (data.agency_id) {
            const agency = await prisma.agency.findUnique({ where: { id: data.agency_id } });
            if (!agency) {
                throw new Error("Agence introuvable.");
            }
            // Ensure location consistency with agency
            if (data.country && data.country !== agency.country) {
                throw new Error("Le pays de la caisse doit correspondre à celui de l'agence.");
            }
            if (data.town && data.town !== agency.town) {
                throw new Error("La ville de la caisse doit correspondre à celle de l'agence.");
            }
        }

        const created = await prisma.cashRegister.create({
            data: {
                create_by: data.create_by,
                adress: data.adress,
                country: data.country,
                town: data.town,
                neighborhood: data.neighborhood,
                agency_id: data.agency_id,
                ip_address: data.ip_address,
                mac_address: data.mac_address,
                image_url: data.image_url,
                is_active: true,
            },
        });

        // Persist open/close hours via raw query to avoid client schema mismatch
        if (data.min_open_time || data.max_close_time) {
            await prisma.$executeRawUnsafe(
                `UPDATE CashRegister SET min_open_time = COALESCE(?, min_open_time), max_close_time = COALESCE(?, max_close_time) WHERE id = ?`,
                data.min_open_time ?? null,
                data.max_close_time ?? null,
                created.id
            );
        }

        return prisma.cashRegister.findUnique({ where: { id: created.id } });
    }

    static async assignCashier(
        cashRegisterId: string,
        cashierId: string,
        adminId: string,
        initialFunds: {
            total: number;
            denominations: Record<string, number>; // denominationId -> quantity
        }
    ) {
        // Validation 1: Check if register is locked
        const isNotLocked = await SessionService.checkIfItNotLockedSession(cashRegisterId);
        if (!isNotLocked) {
            throw new Error("This cash register is locked.");
        }

        // Validation 2: Check if cashier already has an open session
        const hasOpenSession = await SessionService.checkIfHisHasOpennedSession(cashierId);
        if (hasOpenSession) {
            throw new Error("Cashier already has an active session.");
        }

        // Validation 2.5: Check if cashier has any locked session
        const lockedSession = await prisma.cashRegisterSession.findFirst({
            where: {
                open_by: cashierId,
                is_locked: true
            }
        });

        if (lockedSession) {
            throw new Error("This cashier has a locked session. Please unlock or resolve the locked session before assigning a new one.");
        }

        // Validation 3: Check Town Authorization
        const cashier = await prisma.person.findUnique({
            where: { id: cashierId },
            include: { cashierProfile: true }
        });

        if (!cashier || !cashier.cashierProfile) {
            throw new Error("Invalid cashier profile.");
        }

        const register = await prisma.cashRegister.findUnique({
            where: { id: cashRegisterId }
        });

        if (!register) {
            throw new Error("Cash register not found.");
        }

        if (register.town) {
            const allowedTownsJson = cashier.cashierProfile.town_list_chosen;
            const workTown = cashier.cashierProfile.work_town || null;
            let allowedTowns: string[] = [];

            if (allowedTownsJson) {
                try {
                    allowedTowns = JSON.parse(allowedTownsJson);
                } catch (e) {
                    // If parsing fails, assume it might be a single string or invalid format.
                    // If it's not an array, we treat it as empty or handle accordingly.
                    // For now, let's assume strict JSON array format as enforced by UI.
                    console.error("Failed to parse allowed towns:", e);
                }
            }

            // If allowedTowns is empty, maybe allow all? Or allow none?
            // Requirement: "Enforce that a cashier can only be assigned to a register located in one of their assigned towns."
            // So if list is empty, they can't be assigned anywhere (unless register has no town).

            if (workTown && !allowedTowns.includes(workTown)) {
                allowedTowns.push(workTown);
            }

            if (!allowedTowns.includes(register.town)) {
                throw new Error(`Cashier is not authorized to work in ${register.town}. Allowed towns: ${allowedTowns.join(", ")}`);
            }
        }

        // Validation 4: Validate initial funds amount is non-negative
        if (initialFunds.total < 0) {
            throw new Error("Initial funds cannot be negative.");
        }

        // Transaction to ensure atomicity
        return prisma.$transaction(async (tx) => {
            // 1. Create the management record
            const assignment = await tx.cashierManageCashRegister.create({
                data: {
                    cash_register_id: cashRegisterId,
                    user_id: cashierId,
                    day: new Date(),
                },
            });

            // 2. Update the cash register to reflect the current cashier
            await tx.cashRegister.update({
                where: { id: cashRegisterId },
                data: {
                    user_id: cashierId,
                }
            });

            // 3. Open the session (ALWAYS - required for cashier to login)
            const session = await tx.cashRegisterSession.create({
                data: {
                    cash_register_id: cashRegisterId,
                    open_by: cashierId,
                    state: "ouverte",
                    theorical_initial_funds: initialFunds.total,
                    open_on: new Date(),
                }
            });

            // 4. Record the ticketing details (billetage) for each denomination
            let calculatedTotal = 0;
            for (const [denomId, quantity] of Object.entries(initialFunds.denominations)) {
                if (quantity > 0) {
                    // Fetch denomination value to calculate total for this line
                    const denom = await tx.currencyDenomination.findUnique({ where: { id: denomId } });
                    if (denom) {
                        const lineTotal = Number(denom.value) * quantity;
                        calculatedTotal += lineTotal;

                        await tx.eventTicketingDetail.create({
                            data: {
                                session_id: session.id,
                                connection_type: "session_ouverture",
                                quantity: quantity,
                                value: denom.value,
                                total: lineTotal,
                                denomination_id: denomId,
                            }
                        });
                    }
                }
            }

            // 5. Validate that the billetage total matches the declared total
            if (Object.keys(initialFunds.denominations).length > 0 && calculatedTotal !== initialFunds.total) {
                throw new Error(`Billetage mismatch: declared total is ${initialFunds.total} XAF but calculated total is ${calculatedTotal} XAF`);
            }

            // 6. Create an "ouverture" event
            await tx.cashRegisterEvent.create({
                data: {
                    session_id: session.id,
                    type: "ouverture",
                    author_id: adminId, // Admin triggered the assignment/opening
                    payload: JSON.stringify(initialFunds),
                }
            });

            return assignment;
        });
    }

    // Correction: assignCashier should probably update the CashRegister.cashier field OR create the relation.
    // The requirement says "CashierManageCashRegister" is created.
    // Let's implement creating that record.
    static async linkCashierToRegister(cashRegisterId: string, cashierId: string) {
        return prisma.cashierManageCashRegister.create({
            data: {
                cash_register_id: cashRegisterId,
                user_id: cashierId,
                day: new Date()
            }
        })
    }

    static async get(id: string) {
        return prisma.cashRegister.findUnique({
            where: { id },
            include: {
                sessions: {
                    orderBy: { open_on: 'desc' },
                    take: 1
                }
            }
        });
    }

    static async list() {
        return prisma.cashRegister.findMany({
            include: {
                assignedCashier: true,
                sessions: {
                    orderBy: { open_on: 'desc' },
                    take: 1
                },
                agency: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { create_on: 'desc' }
        });
    }
}
