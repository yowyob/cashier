import { MonitoringScope } from "@/lib/monitoring";

function asString(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) return value;
    return null;
}

function collectRegisterIds(item: any): string[] {
    const ids: string[] = [];
    const payload = item?.payload && typeof item.payload === "object" ? item.payload : null;
    const direct =
        asString(item?.cash_register_id) ??
        asString(item?.cashRegisterId) ??
        asString(item?.register_id) ??
        asString(item?.registerId) ??
        asString(item?.cashRegister?.id) ??
        asString(item?.cash_register?.id) ??
        asString(item?.session?.cashRegister?.id) ??
        asString(item?.session?.cash_register?.id) ??
        asString(item?.register?.id) ??
        asString(payload?.cash_register_id) ??
        asString(payload?.cashRegisterId) ??
        asString(payload?.register_id) ??
        asString(payload?.registerId) ??
        asString(payload?.cashRegister?.id) ??
        asString(payload?.cash_register?.id);
    if (direct) ids.push(direct);

    const registers =
        item?.cash_registers ??
        item?.cashRegisters ??
        item?.registers ??
        item?.cash_register_list ??
        payload?.cash_registers ??
        payload?.cashRegisters ??
        payload?.registers ??
        payload?.cash_register_list ??
        null;
    if (Array.isArray(registers)) {
        for (const reg of registers) {
            const id = asString(reg?.id) ?? asString(reg?.cash_register_id);
            if (id) ids.push(id);
        }
    }

    const isRegisterLike =
        item?.ip_address ||
        item?.mac_address ||
        item?.min_open_time ||
        item?.max_close_time ||
        item?.assigned_cashier ||
        item?.agency;
    const selfId = asString(item?.id);
    if (selfId && isRegisterLike) {
        ids.push(selfId);
    }

    return Array.from(new Set(ids));
}

function extractAgencyId(item: any): string | null {
    const payload = item?.payload && typeof item.payload === "object" ? item.payload : null;
    return (
        asString(item?.agency_id) ??
        asString(item?.agencyId) ??
        asString(item?.agency?.id) ??
        asString(item?.cashRegister?.agency_id) ??
        asString(item?.cash_register?.agency_id) ??
        asString(item?.cashRegister?.agency?.id) ??
        asString(item?.cash_register?.agency?.id) ??
        asString(item?.session?.cashRegister?.agency_id) ??
        asString(item?.session?.cash_register?.agency_id) ??
        asString(item?.session?.cashRegister?.agency?.id) ??
        asString(item?.session?.cash_register?.agency?.id) ??
        asString(item?.register?.agency_id) ??
        asString(item?.register?.agency?.id) ??
        asString(item?.adminProfile?.agency_id) ??
        asString(item?.admin_profile?.agency_id) ??
        asString(item?.cashierProfile?.base_agency_id) ??
        asString(item?.cashier_profile?.base_agency_id) ??
        asString(item?.cashierProfile?.agency_id) ??
        asString(item?.cashier_profile?.agency_id) ??
        asString(payload?.agency_id) ??
        asString(payload?.agencyId) ??
        asString(payload?.cashRegister?.agency_id) ??
        asString(payload?.cash_register?.agency_id) ??
        asString(payload?.cashRegister?.agency?.id) ??
        asString(payload?.cash_register?.agency?.id) ??
        (Array.isArray(item?.cashRegisters) ||
        Array.isArray(item?.cash_registers) ||
        Array.isArray(item?.registers) ||
        Array.isArray(item?.cash_register_list)
            ? asString(item?.id)
            : null)
    );
}

export function applyMonitoringScope<T>(items: T[], scope: MonitoringScope): T[] {
    if (!Array.isArray(items)) return [];
    const registerIds = scope.registerIds;
    const agencyIds = scope.agencyIds;
    if (registerIds == null && agencyIds == null) return items;

    const registerSet = registerIds ? new Set(registerIds) : null;
    const agencySet = agencyIds ? new Set(agencyIds) : null;

    return items.filter((item: any) => {
        const registerList = collectRegisterIds(item);
        const agencyId = extractAgencyId(item);

        if (registerSet) {
            if (registerSet.size === 0) return false;
            if (registerList.length > 0) {
                return registerList.some((id) => registerSet.has(id));
            }
            if (agencySet) {
                return agencyId ? agencySet.has(agencyId) : false;
            }
            return false;
        }

        if (agencySet) {
            if (agencySet.size === 0) return false;
            if (agencyId) return agencySet.has(agencyId);
            return false;
        }

        return true;
    });
}
