import { prisma } from "@/lib/prisma";

export class AgencyService {
    static async create(data: {
        name: string;
        country: string;
        town: string;
        neighborhood?: string;
        address?: string;
        location_hint?: string;
        organization_id: string;
    }) {
        return prisma.agency.create({
            data: {
                name: data.name,
                country: data.country,
                town: data.town,
                neighborhood: data.neighborhood,
                address: data.address,
                location_hint: data.location_hint,
                organization_id: data.organization_id
            },
        });
    }

    static async list(params?: { country?: string; town?: string }) {
        return prisma.agency.findMany({
            where: {
                ...(params?.country ? { country: params.country } : {}),
                ...(params?.town ? { town: params.town } : {}),
            },
            include: {
                cashRegisters: {
                    include: {
                        sessions: {
                            select: {
                                state: true,
                                is_locked: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: "asc" },
        });
    }

    static async update(
        id: string,
        data: {
            name?: string;
            neighborhood?: string | null;
            address?: string | null;
            location_hint?: string | null;
            town?: string;
            country?: string;
        }
    ) {
        const agency = await prisma.agency.findUnique({
            where: { id },
            include: {
                cashRegisters: {
                    include: {
                        sessions: {
                            select: {
                                state: true,
                                is_locked: true
                            }
                        }
                    }
                }
            }
        });
        if (!agency) {
            throw new Error("Agency not found");
        }

        const hasBlockingSession = agency.cashRegisters.some((reg) =>
            reg.sessions.some((s) => s.state === "ouverte" || s.is_locked)
        );

        if (hasBlockingSession) {
            throw new Error("Cannot edit this agency because one of its registers has an open or locked session.");
        }

        return prisma.agency.update({
            where: { id },
            data: {
                name: data.name ?? agency.name,
                neighborhood: data.neighborhood ?? agency.neighborhood,
                address: data.address ?? agency.address,
                location_hint: data.location_hint ?? agency.location_hint,
                town: data.town ?? agency.town,
                country: data.country ?? agency.country
            }
        });
    }

    static async remove(id: string) {
        const agency = await prisma.agency.findUnique({
            where: { id },
            include: {
                cashRegisters: {
                    include: {
                        sessions: {
                            select: {
                                state: true,
                                is_locked: true
                            }
                        }
                    }
                }
            }
        });
        if (!agency) {
            throw new Error("Agency not found");
        }

        const hasBlockingSession = agency.cashRegisters.some((reg) =>
            reg.sessions.some((s) => s.state === "ouverte" || s.is_locked)
        );

        if (hasBlockingSession) {
            throw new Error("Cannot delete this agency because one of its registers has an open or locked session.");
        }

        return prisma.agency.delete({ where: { id } });
    }
}
