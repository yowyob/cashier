"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminList } from "@/components/admin/admin-list";
import { OrganizationManager } from "@/components/admin/organization-manager";
import Link from "next/link";
import { useAdminModal } from "@/components/admin/admin-modal-provider";

type RoleType = "superadmin" | "organization_admin" | "agency_admin" | string;

export function AdminsClient({
    roleType,
    organizationId
}: {
    roleType: RoleType;
    organizationId: string | null;
}) {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"admins" | "organizations">("admins");
    const [organizationFilter, setOrganizationFilter] = useState<{ id: string; name: string } | null>(null);
    const { openAssignAdmin } = useAdminModal();

    const isErpAdmin = roleType === "superadmin";
    const isOrgAdmin = roleType === "organization_admin";

    async function fetchAdmins() {
        setLoading(true);
        try {
            const res = await fetch("/api/users/admins");
            if (res.ok) {
                const text = await res.text();
                try {
                    const data = text ? JSON.parse(text) : [];
                    setAdmins(data);
                } catch (parseErr) {
                    console.error("Failed to parse admins response", parseErr);
                    setAdmins([]);
                }
            } else {
                setAdmins([]);
            }
        } catch (e) {
            console.error("Failed to load admins", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAdmins();
    }, []);

    const filtered = useMemo(() => {
        let list = admins;
        if (isErpAdmin && organizationFilter) {
            list = list.filter((admin) => admin.adminProfile?.organization?.id === organizationFilter.id);
        }
        return list.filter((admin) => {
            const text = `${admin.user_first_name} ${admin.user_name} ${admin.mail || ""}`.toLowerCase();
            const matchesSearch = !search || text.includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [admins, search, isErpAdmin, organizationFilter]);

    const adminCountsByOrganization = useMemo(() => {
        const counts: Record<string, number> = {};
        if (!isErpAdmin) return counts;
        admins.forEach((admin) => {
            const orgId = admin.adminProfile?.organization?.id;
            if (!orgId) return;
            counts[orgId] = (counts[orgId] || 0) + 1;
        });
        return counts;
    }, [admins, isErpAdmin]);

    const pageTitle = isErpAdmin ? "ERP Admin" : "Admins";
    const listTitle = isErpAdmin ? "Organization admins" : isOrgAdmin ? "Agency admins" : "Admins";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
            {isErpAdmin && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("admins")}
                        className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium ${
                            activeTab === "admins" ? "bg-primary text-primary-foreground" : "bg-background"
                        }`}
                    >
                        Organization admins
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("organizations")}
                        className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium ${
                            activeTab === "organizations" ? "bg-primary text-primary-foreground" : "bg-background"
                        }`}
                    >
                        Organizations
                    </button>
                </div>
            )}

            {isErpAdmin && activeTab === "organizations" ? (
                <OrganizationManager
                    adminCounts={adminCountsByOrganization}
                    onSelectOrganization={(org) => {
                        setOrganizationFilter(org);
                        setActiveTab("admins");
                    }}
                />
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-semibold">{listTitle}</h2>
                            {!isErpAdmin && (
                                <Link href="/admin/audit" className="text-sm text-primary hover:underline">Audit Trail</Link>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                openAssignAdmin({
                                    currentRoleType: isErpAdmin ? "superadmin" : "organization_admin",
                                    organizationId,
                                    onAssigned: fetchAdmins
                                })
                            }
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Assign admin
                        </button>
                    </div>
                    {isErpAdmin && organizationFilter && (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <span className="font-medium">Filtered organization:</span>
                            <span className="text-muted-foreground">{organizationFilter.name}</span>
                            <button
                                type="button"
                                onClick={() => setOrganizationFilter(null)}
                                className="ml-auto text-sm text-primary hover:underline"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, username, email"
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    {loading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <AdminList
                            admins={filtered}
                            onUpdated={fetchAdmins}
                            onDeleted={fetchAdmins}
                            currentRoleType={isErpAdmin ? "superadmin" : "organization_admin"}
                            organizationId={organizationId}
                        />
                    )}

                </div>
            )}
        </div>
    );
}
