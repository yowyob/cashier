"use client";

import { useEffect, useState } from "react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { TablePagination } from "@/components/ui/table-pagination";

interface Organization {
    id: string;
    name: string;
    country?: string | null;
    description?: string | null;
    is_active: boolean;
    create_on: string;
    creator?: {
        user_first_name: string;
        user_name: string;
    } | null;
    telegram_bot_token?: string | null;
    logo_id?: string | null;
}

interface OrganizationForm {
    name: string;
    country: string;
    description: string;
    telegram_bot_token: string;
}

const emptyForm: OrganizationForm = {
    name: "",
    country: "",
    description: "",
    telegram_bot_token: ""
};

function OrganizationCreateModal({
    onSaved,
    onClose
}: {
    onSaved?: () => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState<OrganizationForm>(emptyForm);
    const [lookupCode, setLookupCode] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookupSource, setLookupSource] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = lookupCode.trim();
        if (code.length < 2) {
            setLookupError(null);
            setLookupSource(null);
            setForm(emptyForm);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setLookupLoading(true);
            setLookupError(null);
            try {
                const res = await fetch(`/api/lookup/organization?code=${encodeURIComponent(code)}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Organization not found.");
                }
                const data = await res.json();
                if (!cancelled) {
                    setForm({
                        name: data.name || "",
                        country: data.country || "",
                        description: data.description || "",
                        telegram_bot_token: data.telegram_bot_token || ""
                    });
                    setLookupSource(data.source || null);
                }
            } catch (e) {
                if (!cancelled) {
                    setForm(emptyForm);
                    setLookupSource(null);
                    setLookupError(e instanceof Error ? e.message : "Lookup failed.");
                }
            } finally {
                if (!cancelled) {
                    setLookupLoading(false);
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [lookupCode]);

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (!form.name) {
                setLookupError("Organization lookup is required.");
                return;
            }
            const res = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    country: form.country || undefined,
                    description: form.description || undefined,
                    telegram_bot_token: form.telegram_bot_token || undefined
                })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to create organization");
            setForm(emptyForm);
            setLookupCode("");
            setLookupError(null);
            setLookupSource(null);
            onSaved?.();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create organization");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Add organization</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <form onSubmit={onSubmit} className="space-y-3">
                    <label className="flex flex-col gap-1 text-sm font-medium">
                        Organization code
                        <input
                            value={lookupCode}
                            onChange={(e) => setLookupCode(e.target.value)}
                            className="rounded-md border px-3 py-2 text-sm"
                        />
                        {lookupLoading && <span className="text-xs text-muted-foreground">Searching...</span>}
                        {lookupError && <span className="text-xs text-destructive">{lookupError}</span>}
                        {lookupSource && <span className="text-xs text-muted-foreground">Source: {lookupSource}</span>}
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                        Name
                        <input
                            value={form.name}
                            readOnly
                            className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                        Country
                        <input
                            value={form.country}
                            readOnly
                            className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                        Description
                        <input
                            value={form.description}
                            readOnly
                            className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                        Telegram bot token
                        <input
                            value={form.telegram_bot_token}
                            readOnly
                            className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.name}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Create organization"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function OrganizationEditModal({
    organization,
    onSaved,
    onClose
}: {
    organization: Organization;
    onSaved?: () => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(organization);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        setDraft(organization);
    }, [organization]);

    const onPickLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const upload = await fetch("/api/files", { method: "POST", body: form });
            const uploaded = await upload.json();
            if (!upload.ok) throw new Error(uploaded?.error || "Upload échoué");
            const id = uploaded?.id ?? uploaded?.fileId ?? uploaded?.file_id;
            if (!id) throw new Error("Identifiant de fichier manquant");
            setDraft((d) => ({ ...d, logo_id: id }));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload échoué");
        } finally {
            setUploadingLogo(false);
            event.target.value = "";
        }
    };

    const saveEdit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/organizations/${draft.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: draft.name,
                    country: draft.country || undefined,
                    description: draft.description || undefined,
                    is_active: draft.is_active,
                    telegram_bot_token: draft.telegram_bot_token ?? undefined,
                    logoId: draft.logo_id ?? undefined,
                    logo_id: draft.logo_id ?? undefined
                })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to update organization");
            onSaved?.();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update organization");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Edit organization</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <div className="flex items-center gap-4">
                    {draft.logo_id ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={`/api/files/${draft.logo_id}`}
                            alt="Logo"
                            className="h-16 w-16 rounded-md object-cover border"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            Logo
                        </div>
                    )}
                    <label className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                        {uploadingLogo ? "Envoi…" : "Changer le logo"}
                        <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} disabled={uploadingLogo} />
                    </label>
                </div>
                <label className="text-sm font-medium">
                    Name
                    <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </label>
                <label className="text-sm font-medium">
                    Country
                    <input
                        value={draft.country || ""}
                        onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </label>
                <label className="text-sm font-medium">
                    Description
                    <input
                        value={draft.description || ""}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </label>
                <label className="text-sm font-medium">
                    Telegram bot token
                    <input
                        value={draft.telegram_bot_token || ""}
                        onChange={(e) => setDraft({ ...draft, telegram_bot_token: e.target.value })}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={draft.is_active}
                        onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                    />
                    Active
                </label>
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

export function OrganizationManager({
    adminCounts = {},
    onSelectOrganization
}: {
    adminCounts?: Record<string, number>;
    onSelectOrganization?: (org: { id: string; name: string }) => void;
}) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const { openModal } = useAdminModal();

    async function fetchOrganizations() {
        setLoading(true);
        try {
            const res = await fetch("/api/organizations");
            if (!res.ok) throw new Error("Failed to load organizations");
            const data = await res.json();
            setOrganizations(data);
        } catch (e) {
            console.error("Failed to load organizations", e);
            setError(e instanceof Error ? e.message : "Failed to load organizations");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const toggleStatus = async (organization: Organization) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/organizations/${organization.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: organization.name,
                    country: organization.country || undefined,
                    description: organization.description || undefined,
                    is_active: !organization.is_active
                })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to update organization");
            fetchOrganizations();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update organization");
        } finally {
            setSaving(false);
        }
    };

    const deleteOrganization = async (organization: Organization) => {
        if (!confirm("Delete this organization?")) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/organizations/${organization.id}`, {
                method: "DELETE"
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Failed to delete organization");
            fetchOrganizations();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete organization");
        } finally {
            setSaving(false);
        }
    };

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(organizations.length / pageSize));
    const pagedOrganizations = organizations.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [organizations.length]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="rounded-md border p-4 bg-card space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Organizations</h2>
                    <p className="text-sm text-muted-foreground">Create or manage the top-level organizations.</p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        openModal((close) => (
                            <OrganizationCreateModal
                                onSaved={fetchOrganizations}
                                onClose={close}
                            />
                        ))
                    }
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Add organization
                </button>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b">
                    <tr>
                        <th className="p-2 text-left font-medium text-muted-foreground">Name</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Country</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Creator</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Admins</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Status</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Telegram Bot</th>
                        <th className="p-2 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-3 text-center text-muted-foreground">Loading...</td>
                            </tr>
                        ) : organizations.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-3 text-center text-muted-foreground">No organizations yet.</td>
                            </tr>
                        ) : (
                            pagedOrganizations.map((organization) => (
                                <tr key={organization.id} className="border-b">
                                    <td className="p-2 font-medium">
                                        <div className="flex items-center gap-2">
                                            {organization.logo_id ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={`/api/files/${organization.logo_id}`}
                                                    alt=""
                                                    className="h-7 w-7 rounded object-cover border"
                                                />
                                            ) : (
                                                <div className="h-7 w-7 rounded bg-muted border" />
                                            )}
                                            <span>{organization.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-muted-foreground">{organization.country || "-"}</td>
                                    <td className="p-2 text-muted-foreground">
                                        {organization.creator ? `${organization.creator.user_first_name} (${organization.creator.user_name})` : "-"}
                                    </td>
                                    <td className="p-2 text-muted-foreground">{adminCounts[organization.id] || 0}</td>
                                <td className="p-2">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${organization.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                        {organization.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="p-2 text-sm text-muted-foreground">
                                    {organization.telegram_bot_token ? "Configured" : "Not set"}
                                </td>
                                    <td className="p-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            {onSelectOrganization && (
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectOrganization({ id: organization.id, name: organization.name })}
                                                    className="inline-flex items-center justify-center rounded-md border border-input px-3 py-1 text-xs font-medium hover:bg-muted/50"
                                                >
                                                    View admins
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => toggleStatus(organization)}
                                                className="inline-flex items-center justify-center rounded-md border border-input px-3 py-1 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                                                disabled={saving}
                                            >
                                                {organization.is_active ? "Disable" : "Enable"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openModal((close) => (
                                                        <OrganizationEditModal
                                                            organization={organization}
                                                            onSaved={fetchOrganizations}
                                                            onClose={close}
                                                        />
                                                    ))
                                                }
                                                className="inline-flex items-center justify-center rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteOrganization(organization)}
                                                className="inline-flex items-center justify-center rounded-md border border-destructive px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                                disabled={saving}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

        </div>
    );
}
