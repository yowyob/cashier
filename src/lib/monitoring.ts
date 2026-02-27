import { prisma } from "@/lib/prisma";

type SessionUser = {
    id: string;
    role?: string | null;
    roleType?: string | null;
    agencyId?: string | null;
    organizationId?: string | null;
};

export type MonitoringScope = {
    agencyIds: string[] | null;
    registerIds: string[] | null;
};

function parseIdList(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
    } catch {
        return [];
    }
}

export function normalizeIdList(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return input.filter((item) => typeof item === "string" && item.trim().length > 0);
}

export async function getAdminMonitoringScope(session: { user?: SessionUser | null } | null): Promise<MonitoringScope> {
    if (!session?.user || session.user.role !== "admin") {
        return { agencyIds: null, registerIds: null };
    }

    const profile = await prisma.adminProfile.findUnique({
        where: { personId: session.user.id },
        select: {
            role_type: true,
            agency_id: true,
            organization_id: true,
            monitor_all_agencies: true,
            monitor_agency_ids: true,
            monitor_all_registers: true,
            monitor_register_ids: true
        }
    });

    if (!profile) {
        return { agencyIds: null, registerIds: null };
    }

    const roleType = session.user.roleType || profile.role_type || null;

    if (roleType === "agency_admin") {
        const agencyId = session.user.agencyId || profile.agency_id || null;
        if (!agencyId) {
            return { agencyIds: [], registerIds: [] };
        }

        const monitorAllRegisters = profile.monitor_all_registers !== false;
        if (monitorAllRegisters) {
            return { agencyIds: [agencyId], registerIds: null };
        }

        const candidateRegisters = parseIdList(profile.monitor_register_ids);
        if (candidateRegisters.length === 0) {
            return { agencyIds: [agencyId], registerIds: [] };
        }
        const allowedRegisters = await prisma.cashRegister.findMany({
            where: {
                id: { in: candidateRegisters },
                agency_id: agencyId
            },
            select: { id: true }
        });
        return {
            agencyIds: [agencyId],
            registerIds: allowedRegisters.map((item) => item.id)
        };
    }

    if (roleType === "organization_admin") {
        const organizationId = session.user.organizationId || profile.organization_id || null;
        if (!organizationId) {
            return { agencyIds: [], registerIds: [] };
        }

        const monitorAllAgencies = profile.monitor_all_agencies !== false;
        let agencyIds: string[] | null = null;
        if (!monitorAllAgencies) {
            const candidateAgencies = parseIdList(profile.monitor_agency_ids);
            if (candidateAgencies.length === 0) {
                agencyIds = [];
            } else {
                const allowedAgencies = await prisma.agency.findMany({
                    where: {
                        id: { in: candidateAgencies },
                        organization_id: organizationId
                    },
                    select: { id: true }
                });
                agencyIds = allowedAgencies.map((item) => item.id);
            }
        }

        const monitorAllRegisters = profile.monitor_all_registers !== false;
        if (monitorAllRegisters) {
            return { agencyIds, registerIds: null };
        }

        const candidateRegisters = parseIdList(profile.monitor_register_ids);
        if (candidateRegisters.length === 0) {
            return { agencyIds, registerIds: [] };
        }
        const registerWhere: any = { id: { in: candidateRegisters } };
        if (agencyIds) {
            registerWhere.agency_id = { in: agencyIds };
        } else {
            registerWhere.agency = { is: { organization_id: organizationId } };
        }
        const allowedRegisters = await prisma.cashRegister.findMany({
            where: registerWhere,
            select: { id: true }
        });
        return {
            agencyIds,
            registerIds: allowedRegisters.map((item) => item.id)
        };
    }

    return { agencyIds: null, registerIds: null };
}
