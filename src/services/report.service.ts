import { prisma } from "@/lib/prisma";

export class ReportService {
    private static toHundredThousands(value: number) {
        // Normalize to chunks of 100,000 to keep dashboard readable
        return Number((value / 100000).toFixed(2));
    }

    private static buildSessionScope(filters: {
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
    }) {
        const scope: any = {};
        if (filters.registerIds) {
            scope.cash_register_id = { in: filters.registerIds };
        }
        const cashRegister: any = {};
        if (filters.agencyId) {
            cashRegister.agency_id = filters.agencyId;
        }
        if (filters.agencyIds) {
            cashRegister.agency_id = { in: filters.agencyIds };
        }
        if (filters.organizationId) {
            cashRegister.agency = { is: { organization_id: filters.organizationId } };
        }
        if (Object.keys(cashRegister).length > 0) {
            scope.cashRegister = cashRegister;
        }
        return Object.keys(scope).length > 0 ? scope : undefined;
    }

    /**
     * Get dashboard statistics for admin
     */
    static async getAdminDashboardStats(filters: {
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
    }) {
        const sessionScope = this.buildSessionScope(filters);
        const registerScope = sessionScope?.cashRegister || undefined;
        // Get total revenue from all closed sessions (filtered by agency if provided)
        const closedSessions = await prisma.cashRegisterSession.findMany({
            where: {
                state: "fermee",
                cashRegister: registerScope
            },
            include: {
                reconciliation: true
            }
        });

        const totalRevenue = closedSessions.reduce((sum: number, session) => {
            return sum + Number(session.theorical_initial_funds || 0);
        }, 0);

        // Get active sessions count
        const activeSessions = await prisma.cashRegisterSession.count({
            where: {
                state: "ouverte",
                cashRegister: registerScope
            }
        });

        // Get today's movements count
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayMovements = await prisma.cashRegisterMovement.count({
            where: {
                create_on: {
                    gte: today
                },
                session: sessionScope
            }
        });

        // Get total movements amount today
        const todayMovementsData = await prisma.cashRegisterMovement.findMany({
            where: {
                create_on: {
                    gte: today
                },
                session: sessionScope
            }
        });

        const todayTotal = todayMovementsData.reduce((sum: number, mov) => {
            return sum + (mov.sense === "entree" ? Number(mov.amount) : -Number(mov.amount));
        }, 0);

        // Get monthly revenue for the current year
        const monthlyRevenue = await this.getMonthlyRevenue(new Date().getFullYear(), filters);
        const dailyRevenue = await this.getDailyRevenue(7, filters);
        const hourlyRevenue = await this.getHourlyRevenue(24, filters);

        return {
            totalRevenue,
            activeSessions,
            todayMovements,
            todayTotal,
            monthlyRevenue,
            dailyRevenue,
            hourlyRevenue
        };
    }

    /**
     * Get monthly revenue for a specific year
     */
    static async getMonthlyRevenue(year: number, filters: {
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
    }) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const movements = await prisma.cashRegisterMovement.findMany({
            where: {
                create_on: {
                    gte: startDate,
                    lte: endDate
                },
                session: this.buildSessionScope(filters)
            },
            select: {
                create_on: true,
                amount: true,
                sense: true
            }
        });

        const monthlyData = Array(12).fill(0).map((_, index) => {
            const monthName = new Date(year, index).toLocaleString('default', { month: 'short' });
            return { name: monthName, total: 0 };
        });

        movements.forEach(mov => {
            const month = new Date(mov.create_on).getMonth();
            const amount = Number(mov.amount);
            if (mov.sense === 'entree') {
                monthlyData[month].total += amount;
            } else {
                monthlyData[month].total -= amount;
            }
        });

        return monthlyData.map(item => ({
            ...item,
            total: this.toHundredThousands(item.total)
        }));
    }

    /**
     * Get daily revenue for the last N days (default 7)
     */
    static async getDailyRevenue(days: number = 7, filters: {
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
    }) {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const movements = await prisma.cashRegisterMovement.findMany({
            where: {
                create_on: {
                    gte: startDate,
                    lte: now
                },
                session: this.buildSessionScope(filters)
            },
            select: {
                create_on: true,
                amount: true,
                sense: true
            }
        });

        const dailyData = Array.from({ length: days }, (_, idx) => {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + idx);
            const name = day.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
            return { name, total: 0, date: day };
        });

        movements.forEach(mov => {
            const movDate = new Date(mov.create_on);
            const diffDays = Math.floor((movDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < days) {
                const amount = Number(mov.amount);
                dailyData[diffDays].total += mov.sense === 'entree' ? amount : -amount;
            }
        });

        return dailyData.map(item => ({
            name: item.name,
            total: this.toHundredThousands(item.total)
        }));
    }

    /**
     * Get hourly revenue for the last N hours (default 24)
     */
    static async getHourlyRevenue(hours: number = 24, filters: {
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
    }) {
        const now = new Date();
        const start = new Date(now);
        start.setHours(now.getHours() - (hours - 1), 0, 0, 0);

        const movements = await prisma.cashRegisterMovement.findMany({
            where: {
                create_on: {
                    gte: start,
                    lte: now
                },
                session: this.buildSessionScope(filters)
            },
            select: {
                create_on: true,
                amount: true,
                sense: true
            }
        });

        const hourlyData = Array.from({ length: hours }, (_, idx) => {
            const slot = new Date(start);
            slot.setHours(start.getHours() + idx);
            const name = slot.toLocaleTimeString('fr-FR', { hour: '2-digit' });
            return { name, total: 0, slot };
        });

        movements.forEach(mov => {
            const movDate = new Date(mov.create_on);
            const diffHours = Math.floor((movDate.getTime() - start.getTime()) / (1000 * 60 * 60));
            if (diffHours >= 0 && diffHours < hours) {
                const amount = Number(mov.amount);
                hourlyData[diffHours].total += mov.sense === 'entree' ? amount : -amount;
            }
        });

        return hourlyData.map(item => ({
            name: item.name,
            total: this.toHundredThousands(item.total)
        }));
    }

    /**
     * Get recent transactions with details
     */
    static async getRecentTransactions(limit: number = 10, filters: {
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
    }) {
        const movements = await prisma.cashRegisterMovement.findMany({
            take: limit,
            orderBy: { create_on: 'desc' },
            where: this.buildSessionScope(filters) ? { session: this.buildSessionScope(filters) } : undefined,
            include: {
                session: {
                    include: {
                        cashRegister: true
                    }
                },
                creator: {
                    include: {
                        cashierProfile: true
                    }
                }
            }
        });

        return movements.map((mov: any) => ({
            id: mov.id,
            amount: Number(mov.amount),
            sense: mov.sense,
            reason: mov.reason,
            createdAt: mov.create_on,
            cashier: mov.creator?.user_first_name || 'Unknown',
            register: mov.session?.cashRegister?.town || 'Unknown',
            customer: null, // Will need to fetch separately if needed
            externalReference: mov.external_reference
        }));
    }

    /**
     * Get all transactions with filters
     */
    static async getAllTransactions(filters: {
        startDate?: Date;
        endDate?: Date;
        registerId?: string;
        cashierId?: string;
        agencyId?: string;
        organizationId?: string;
        agencyIds?: string[];
        registerIds?: string[];
        type?: 'entree' | 'sortie';
        page?: number;
        limit?: number;
    }) {
        const {
            startDate,
            endDate,
            registerId,
            cashierId,
            agencyId,
            organizationId,
            agencyIds,
            registerIds,
            type,
        page = 1,
        limit = 50
    } = filters;
        const shouldPaginate = limit > 0;
        const safePage = page > 0 ? page : 1;

        if (registerIds && registerId && !registerIds.includes(registerId)) {
            return { movements: [], total: 0, page, totalPages: 0 };
        }
        if (agencyIds && agencyId && !agencyIds.includes(agencyId)) {
            return { movements: [], total: 0, page, totalPages: 0 };
        }

        const where: any = {};

        if (startDate || endDate) {
            where.create_on = {};
            if (startDate) where.create_on.gte = startDate;
            if (endDate) where.create_on.lte = endDate;
        }

        if (type) {
            where.sense = type;
        }

        if (cashierId) {
            where.create_by = cashierId;
        }

        const sessionScope = this.buildSessionScope({
            agencyId,
            organizationId,
            agencyIds,
            registerIds: registerIds || undefined
        });

        if (registerId) {
            where.session = {
                ...(where.session || {}),
                cash_register_id: registerId
            };
        }
        if (sessionScope) {
            where.session = {
                ...(where.session || {}),
                ...sessionScope
            };
        }

        const pagination = shouldPaginate ? { skip: (safePage - 1) * limit, take: limit } : {};
        const [movements, total] = await Promise.all([
            prisma.cashRegisterMovement.findMany({
                where,
                ...pagination,
                orderBy: { create_on: 'desc' },
                include: {
                    session: {
                        include: {
                            cashRegister: true
                        }
                    },
                    creator: true
                }
            }),
            prisma.cashRegisterMovement.count({ where })
        ]);

        return {
            movements,
            total,
            page: shouldPaginate ? safePage : 1,
            totalPages: shouldPaginate ? Math.ceil(total / limit) : 1
        };
    }

    /**
     * Get session report data
     */
    static async getSessionReportData(sessionId: string) {
        const session = await prisma.cashRegisterSession.findUnique({
            where: { id: sessionId },
            include: {
                cashRegister: true,
                opener: true,
                closer: true,
                movements: {
                    orderBy: { create_on: 'asc' },
                    include: {
                        creator: true
                    }
                },
                reconciliation: true,
                ticketingDetails: {
                    include: {
                        denomination: true
                    }
                }
            }
        });

        if (!session) {
            throw new Error("Session not found");
        }

        // Calculate totals
        const totalIn = session.movements
            .filter((m: any) => m.sense === 'entree')
            .reduce((sum: number, m: any) => sum + Number(m.amount), 0);

        const totalOut = session.movements
            .filter((m: any) => m.sense === 'sortie')
            .reduce((sum: number, m: any) => sum + Number(m.amount), 0);

        const theoricalFinal = Number(session.theorical_initial_funds) + totalIn - totalOut;

        return {
            session,
            totalIn,
            totalOut,
            theoricalFinal,
            movementsCount: session.movements.length
        };
    }

    /**
     * Get register activity report
     */
    static async getRegisterReportData(registerId: string, startDate: Date, endDate: Date) {
        const register = await prisma.cashRegister.findUnique({
            where: { id: registerId }
        });

        if (!register) {
            throw new Error("Register not found");
        }

        const sessions = await prisma.cashRegisterSession.findMany({
            where: {
                cash_register_id: registerId,
                open_on: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                opener: true,
                closer: true,
                movements: true,
                reconciliation: true
            },
            orderBy: { open_on: 'desc' }
        });

        const totalSessions = sessions.length;
        const totalRevenue = sessions.reduce((sum: number, s: any) => {
            const sessionTotal = s.movements.reduce((mSum: number, m: any) => {
                return mSum + (m.sense === 'entree' ? Number(m.amount) : -Number(m.amount));
            }, 0);
            return sum + sessionTotal;
        }, 0);

        return {
            register,
            sessions,
            totalSessions,
            totalRevenue,
            startDate,
            endDate
        };
    }
}
