import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { RegisterList } from "@/components/admin/register-list";
import { CreateRegisterForm } from "@/components/admin/create-register-form";

export default async function AdminRegistersPage() {
    const session = await getSession();
    if (!session) return null;

    const adminId = session.user.id;
    const isAgencyAdmin = session.user.roleType === "agency_admin";
    const agencyId = session.user.agencyId || null;

    let serializedRegisters: any[] = [];
    try {
        const response = await fetchBackend("/api/cash-registers", { cache: "no-store" });
        const body = await readBackendJson(response);
        const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        if (response.ok && Array.isArray(list)) {
            serializedRegisters = list.map((register: any) => ({
                ...register,
                assignedCashier: register.assignedCashier ?? register.assigned_cashier ?? null,
                sessions: Array.isArray(register.sessions)
                    ? register.sessions.map((session: any) => ({
                          ...session,
                          theorical_initial_funds: session.theorical_initial_funds != null
                              ? Number(session.theorical_initial_funds)
                              : session.theorical_initial_funds,
                          theorical_close_funds: session.theorical_close_funds != null
                              ? Number(session.theorical_close_funds)
                              : session.theorical_close_funds
                      }))
                    : []
            }));
        }
    } catch {
        serializedRegisters = [];
    }

    let agency: { id: string; name: string; country: string; town: string; neighborhood?: string | null; address?: string | null } | null = null;
    if (isAgencyAdmin && agencyId) {
        try {
            const agencyRes = await fetchBackend(`/api/agencies/${agencyId}`, { cache: "no-store" });
            const agencyBody = await readBackendJson(agencyRes);
            const payload = agencyBody?.data ?? agencyBody ?? null;
            if (agencyRes.ok && payload) {
                agency = {
                    id: String(payload.id),
                    name: payload.name,
                    country: payload.country,
                    town: payload.town,
                    neighborhood: payload.neighborhood ?? null,
                    address: payload.address ?? payload.adress ?? null
                };
            }
        } catch {
            agency = null;
        }
    }

    const showForm = isAgencyAdmin;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Manage Cash Registers</h1>
            <div className={`grid gap-6 ${showForm ? "md:grid-cols-2" : "grid-cols-1"}`}>
                {showForm && (
                    <div>
                        <CreateRegisterForm
                            adminId={adminId}
                            roleType={session.user.roleType}
                            agencyOverride={agency || undefined}
                        />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Existing Registers</h2>
                    <RegisterList
                        registers={serializedRegisters}
                        canManage={isAgencyAdmin}
                        hideTownAgency={session.user.roleType === "agency_admin"}
                    />
                </div>
            </div>
        </div>
    );
}
