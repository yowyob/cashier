"use client";

import { useEffect, useState } from "react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { TablePagination } from "@/components/ui/table-pagination";

interface Agency {
    id: string;
    name: string;
    country: string;
    town: string;
    neighborhood?: string | null;
    organization_id?: string | null;
}

interface Organization {
    id: string;
    name: string;
    country?: string | null;
}

interface Admin {
    id: string;
    user_name: string;
    user_first_name: string;
    mail?: string | null;
    telegram_chat_id?: string | null;
    account_number?: string | null;
    country?: string | null;
    phone?: string | null;
    actif: boolean;
    adminProfile?: {
        role_type: string;
        agency?: Agency | null;
        organization?: { id: string; name: string; country?: string | null; telegram_bot_token?: string | null } | null;
    } | null;
}

const roleColor = (role?: string) => {
    if (role === "agency_admin") return "bg-blue-500";
    if (role === "organization_admin") return "bg-purple-500";
    return "bg-gray-500";
};

function AdminViewModal({ admin, onClose }: { admin: Admin; onClose: () => void }) {
    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-3 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Admin details</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 rounded-full ${roleColor(admin.adminProfile?.role_type)}`} />
                        <span className="font-medium">{admin.user_first_name}</span>
                        <span className="text-muted-foreground">({admin.user_name})</span>
                    </div>
                    <div><span className="font-semibold">Email:</span> {admin.mail || "-"}</div>
                    <div><span className="font-semibold">Account #:</span> {admin.account_number || "-"}</div>
                    <div><span className="font-semibold">Telegram chat ID:</span> {admin.telegram_chat_id || "-"}</div>
                    <div><span className="font-semibold">Role:</span> {admin.adminProfile?.role_type || "agency_admin"}</div>
                    <div>
                        <span className="font-semibold">Agency:</span>{" "}
                        {admin.adminProfile?.agency
                            ? `${admin.adminProfile.agency.name} (${admin.adminProfile.agency.country}/${admin.adminProfile.agency.town}${admin.adminProfile.agency.neighborhood ? " - " + admin.adminProfile.agency.neighborhood : ""})`
                            : "-"}
                    </div>
                    <div>
                        <span className="font-semibold">Organization:</span>{" "}
                        {admin.adminProfile?.organization
                            ? `${admin.adminProfile.organization.name} (${admin.adminProfile.organization.country || "?"})`
                            : "-"}
                    </div>
                    <div><span className="font-semibold">Status:</span> {admin.actif ? "Active" : "Disabled"}</div>
                    <div><span className="font-semibold">Country:</span> {admin.country || "-"}</div>
                    <div><span className="font-semibold">Phone:</span> {admin.phone || "-"}</div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function AdminEditModal({
    admin,
    allowedRoles,
    agencies,
    organizations,
    onSaved,
    onClose
}: {
    admin: Admin;
    allowedRoles: Array<"organization_admin" | "agency_admin">;
    agencies: Agency[];
    organizations: Organization[];
    onSaved?: () => void;
    onClose: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        user_first_name: "",
        user_name: "",
        mail: "",
        role: allowedRoles[0],
        agency_id: "",
        organization_id: "",
        telegram_chat_id: "",
        account_number: "",
        country: "",
        phone: "",
        organization_bot_token: "",
        actif: true
    });

    useEffect(() => {
        setForm({
            user_first_name: admin.user_first_name || "",
            user_name: admin.user_name || "",
            mail: admin.mail || "",
            role: (admin.adminProfile?.role_type as "organization_admin" | "agency_admin") || allowedRoles[0],
            agency_id: admin.adminProfile?.agency?.id || "",
            organization_id: admin.adminProfile?.organization?.id || "",
            telegram_chat_id: admin.telegram_chat_id || "",
            account_number: admin.account_number || "",
            country: admin.country || "",
            phone: admin.phone || "",
            organization_bot_token: admin.adminProfile?.organization?.telegram_bot_token || "",
            actif: admin.actif
        });
    }, [admin, allowedRoles]);

    useEffect(() => {
        if (form.role !== "organization_admin" && form.organization_id) {
            setForm((prev) => ({ ...prev, organization_id: "" }));
        }
        if (form.role !== "organization_admin" && form.organization_bot_token) {
            setForm((prev) => ({ ...prev, organization_bot_token: "" }));
        }
        if (form.role !== "agency_admin" && form.agency_id) {
            setForm((prev) => ({ ...prev, agency_id: "" }));
        }
    }, [form.role, form.organization_id, form.organization_bot_token, form.agency_id]);

    const saveEdit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/admins/${admin.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_first_name: form.user_first_name,
                    user_name: form.user_name,
                    mail: form.mail || null,
                    account_number: form.account_number,
                    role_type: form.role,
                    agency_id: form.role === "agency_admin" ? form.agency_id : null,
                    organization_id: form.role === "organization_admin" ? form.organization_id : null,
                    organization_bot_token: form.role === "organization_admin" ? form.organization_bot_token || undefined : undefined,
                    country: form.country || null,
                    phone: form.phone || null,
                    telegram_chat_id: form.telegram_chat_id || null,
                    actif: form.actif
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to update admin");
            onSaved?.();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update admin");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Edit admin</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <div className="space-y-3">
                    <label className="text-sm font-medium">
                        Account number
                        <input
                            value={form.account_number}
                            onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Full name
                        <input
                            value={form.user_first_name}
                            onChange={(e) => setForm({ ...form, user_first_name: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Username
                        <input
                            value={form.user_name}
                            onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Email
                        <input
                            type="email"
                            value={form.mail}
                            onChange={(e) => setForm({ ...form, mail: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Role
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value as "organization_admin" | "agency_admin" })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        >
                            {allowedRoles.map((role) => (
                                <option key={role} value={role}>
                                    {role === "organization_admin" ? "Organization admin" : "Agency admin"}
                                </option>
                            ))}
                        </select>
                    </label>
                    {form.role === "organization_admin" && (
                        <label className="text-sm font-medium">
                            Organization
                            <select
                                value={form.organization_id}
                                onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            >
                                <option value="">Select organization</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name} ({org.country || "Unknown"})
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {form.role === "organization_admin" && (
                        <label className="text-sm font-medium">
                            Organization Telegram bot token
                            <input
                                value={form.organization_bot_token}
                                onChange={(e) => setForm({ ...form, organization_bot_token: e.target.value })}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            />
                        </label>
                    )}
                    {form.role === "agency_admin" && (
                        <label className="text-sm font-medium">
                            Agency
                            <select
                                value={form.agency_id}
                                onChange={(e) => setForm({ ...form, agency_id: e.target.value })}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            >
                                <option value="">Select agency</option>
                                {agencies.map((ag) => (
                                    <option key={ag.id} value={ag.id}>
                                        {ag.name} ({ag.country}/{ag.town}{ag.neighborhood ? " - " + ag.neighborhood : ""})
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="text-sm font-medium">
                        Country
                        <input
                            value={form.country}
                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Phone number
                        <input
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.actif}
                            onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                        />
                        Active
                    </label>
                    <label className="text-sm font-medium">
                        Telegram chat ID
                        <input
                            value={form.telegram_chat_id}
                            onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AdminList({
    admins,
    onUpdated,
    onDeleted,
    currentRoleType,
    organizationId
}: {
    admins: Admin[];
    onUpdated?: () => void;
    onDeleted?: () => void;
    currentRoleType: "superadmin" | "organization_admin";
    organizationId?: string | null;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { openModal } = useAdminModal();
    const [page, setPage] = useState(1);

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(admins.length / pageSize));
    const pagedAdmins = admins.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [admins]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);
    const allowedRoles: Array<"organization_admin" | "agency_admin"> =
        currentRoleType === "superadmin" ? ["organization_admin"] : ["agency_admin"];
    const [agencies, setAgencies] = useState<Agency[]>([]);

    const [organizations, setOrganizations] = useState<Organization[]>([]);

    useEffect(() => {
        async function loadReferences() {
            try {
                if (currentRoleType === "superadmin") {
                    const orgRes = await fetch("/api/organizations");
                    if (orgRes.ok) {
                        const orgData = await orgRes.json();
                        setOrganizations(orgData);
                    }
                    setAgencies([]);
                    return;
                }

                const agRes = await fetch("/api/agencies");
                if (agRes.ok) {
                    const data = await agRes.json();
                    const scoped = organizationId
                        ? data.filter((agency: Agency) => agency.organization_id === organizationId)
                        : data;
                    setAgencies(scoped);
                }
                setOrganizations([]);
            } catch (e) {
                console.error("Failed to load agencies or organizations", e);
            }
        }
        loadReferences();
    }, [currentRoleType, organizationId]);

    if (admins.length === 0) {
        return <div className="rounded-md border p-4 text-sm text-muted-foreground">Aucun admin créé.</div>;
    }

    const deleteAdmin = async (admin: Admin) => {
        if (!confirm("Delete this admin?")) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/admins/${admin.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to delete admin");
            onDeleted?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete admin");
        } finally {
            setSaving(false);
        }
    };

    const toggleAdminStatus = async (admin: Admin) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/admins/${admin.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_first_name: admin.user_first_name,
                    user_name: admin.user_name,
                    mail: admin.mail || null,
                    account_number: admin.account_number ?? null,
                    role_type: admin.adminProfile?.role_type || allowedRoles[0],
                    agency_id: admin.adminProfile?.role_type === "agency_admin" ? admin.adminProfile.agency?.id || null : null,
                    organization_id: admin.adminProfile?.role_type === "organization_admin" ? admin.adminProfile.organization?.id || null : null,
                    organization_bot_token: admin.adminProfile?.organization?.telegram_bot_token || undefined,
                    country: admin.country || null,
                    phone: admin.phone || null,
                    telegram_chat_id: admin.telegram_chat_id || null,
                    actif: !admin.actif
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to update admin");
            onUpdated?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update admin");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-md border">
            {error && <div className="p-3 text-sm text-destructive bg-destructive/10 border-b">{error}</div>}
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nom</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Username</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Agency</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Organization</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                </thead>
                <tbody className="[&>tr:last-child]:border-0">
                    {pagedAdmins.map((admin) => {
                        const agency = admin.adminProfile?.agency;
                        return (
                            <tr key={admin.id} className="border-b">
                                <td className="p-4 align-middle font-medium">{admin.user_first_name}</td>
                                <td className="p-4 align-middle text-muted-foreground">{admin.user_name}</td>
                                <td className="p-4 align-middle">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block h-3 w-3 rounded-full ${roleColor(admin.adminProfile?.role_type)}`} />
                                        <span className="text-sm font-semibold">{admin.adminProfile?.role_type || allowedRoles[0]}</span>
                                    </div>
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground">
                                    {agency ? `${agency.name} (${agency.country}/${agency.town}${agency.neighborhood ? " - " + agency.neighborhood : ""})` : "-"}
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground">
                                    {admin.adminProfile?.organization
                                        ? `${admin.adminProfile.organization.name} (${admin.adminProfile.organization.country || "?"})`
                                        : "-"}
                                </td>
                                <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${admin.actif ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                        {admin.actif ? "Active" : "Disabled"}
                                    </span>
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground">{admin.mail || "-"}</td>
                                <td className="p-4 align-middle text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                openModal((close) => (
                                                    <AdminViewModal admin={admin} onClose={close} />
                                                ));
                                            }}
                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => {
                                                openModal((close) => (
                                                    <AdminEditModal
                                                        admin={admin}
                                                        allowedRoles={allowedRoles}
                                                        agencies={agencies}
                                                        organizations={organizations}
                                                        onSaved={onUpdated}
                                                        onClose={close}
                                                    />
                                                ));
                                            }}
                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => toggleAdminStatus(admin)}
                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-secondary text-secondary hover:bg-secondary/10 h-8 px-3"
                                            disabled={saving}
                                        >
                                            {admin.actif ? "Disable" : "Enable"}
                                        </button>
                                        <button
                                            onClick={() => deleteAdmin(admin)}
                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-destructive text-destructive hover:bg-destructive/10 h-8 px-3"
                                            disabled={saving}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

        </div>
    );
}
