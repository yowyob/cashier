import { CashierList } from "@/components/admin/cashier-list";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

type RawCashier = Record<string, any>;

function normalizeCashier(raw: RawCashier) {
    const profile = raw.cashierProfile ?? raw.cashier_profile ?? raw.profile ?? {};
    const baseAgency = profile.baseAgency ?? profile.base_agency ?? raw.baseAgency ?? raw.base_agency ?? null;
    const townList = profile.town_list_chosen ?? profile.townListChosen ?? profile.town_list ?? raw.town_list_chosen;
    const normalizedTownList = Array.isArray(townList) ? JSON.stringify(townList) : (townList ?? null);

    return {
        id: String(raw.id ?? raw.person_id ?? raw.user_id ?? ""),
        user_name: raw.user_name ?? raw.username ?? raw.email ?? "",
        user_first_name: raw.user_first_name ?? raw.userFirstName ?? raw.full_name ?? raw.name ?? "",
        phone: raw.phone ?? null,
        account_number: raw.account_number ?? raw.accountNumber ?? null,
        country: raw.country ?? null,
        cashierProfile: {
            hire_date: profile.hire_date ?? profile.hireDate ?? null,
            town_list_chosen: normalizedTownList,
            work_town: profile.work_town ?? profile.workTown ?? raw.work_town ?? null,
            base_agency_id: profile.base_agency_id ?? profile.baseAgencyId ?? null,
            organization_id: profile.organization_id ?? profile.organizationId ?? null,
            baseAgency: baseAgency
                ? {
                      id: baseAgency.id ?? baseAgency.agency_id ?? baseAgency.organization_id ?? "",
                      name: baseAgency.name ?? baseAgency.agency_name ?? "",
                      town: baseAgency.town ?? baseAgency.agency_town ?? ""
                  }
                : null
        }
    };
}

function normalizeCashierList(payload: any) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload.map(normalizeCashier);
    if (Array.isArray(payload.data)) return payload.data.map(normalizeCashier);
    if (Array.isArray(payload.cashiers)) return payload.cashiers.map(normalizeCashier);
    if (Array.isArray(payload.items)) return payload.items.map(normalizeCashier);
    return [];
}

export default async function AdminCashiersPage() {
    const session = await getSession();
    if (!session) return null;
    const canManage = session.user?.roleType !== "agency_admin";

    let serializedCashiers: any[] = [];
    try {
        const response = await fetchBackend("/api/cashiers/with-profile", {
            cache: "no-store"
        });
        const body = await readBackendJson(response);
        if (response.ok) {
            const normalized = normalizeCashierList(body);
            serializedCashiers = normalized.map((cashier) => {
                let hireDate: string | null = null;
                if (cashier.cashierProfile?.hire_date) {
                    const parsed = new Date(cashier.cashierProfile.hire_date);
                    hireDate = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
                }
                return {
                    ...cashier,
                    cashierProfile: cashier.cashierProfile ? {
                        ...cashier.cashierProfile,
                        hire_date: hireDate
                    } : null
                };
            });
        }
    } catch {
        serializedCashiers = [];
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Manage Cashiers</h1>
            <div className="grid gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Existing Cashiers</h2>
                    <CashierList cashiers={serializedCashiers} canManage={canManage} />
                </div>
            </div>
        </div>
    );
}
