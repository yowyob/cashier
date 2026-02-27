"use client";

import { useState, useEffect } from "react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { TablePagination } from "@/components/ui/table-pagination";

interface Agency {
    id: string;
    name: string;
    country: string;
    town: string;
    neighborhood?: string | null;
    address?: string | null;
    location_hint?: string | null;
    cashRegisters?: { sessions: { state: string; is_locked: boolean }[] }[];
}

function AgencyEditModal({
    agency,
    onSaved,
    onClose
}: {
    agency: Agency;
    onSaved?: () => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        name: agency.name,
        neighborhood: agency.neighborhood || "",
        address: agency.address || "",
        location_hint: agency.location_hint || ""
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/agencies/${agency.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    neighborhood: form.neighborhood || null,
                    address: form.address || null,
                    location_hint: form.location_hint || null
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to update agency");
            onSaved?.();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update agency");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Edit agency</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <div className="space-y-3">
                    <label className="text-sm font-medium">
                        Name
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        City
                        <input
                            value={form.neighborhood}
                            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Address / GPS (JSON)
                        <input
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Landmark / Directions
                        <input
                            value={form.location_hint}
                            onChange={(e) => setForm({ ...form, location_hint: e.target.value })}
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
                        onClick={handleSave}
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

export function AgencyList({
    agencies,
    onUpdated,
    onDeleted,
    readOnly = false
}: {
    agencies: Agency[];
    onUpdated?: () => void;
    onDeleted?: (id: string) => void;
    readOnly?: boolean;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [countryFilter, setCountryFilter] = useState("");
    const [townFilter, setTownFilter] = useState("");
    const [page, setPage] = useState(1);
    const { openModal } = useAdminModal();

    if (!agencies.length) {
        return <div className="rounded-md border p-4 text-sm text-muted-foreground">No agencies yet.</div>;
    }

    const filteredAgencies = agencies.filter((agency) => {
        const text = `${agency.name} ${agency.country} ${agency.town} ${agency.neighborhood || ""} ${agency.location_hint || ""}`.toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());
        const matchesCountry = !countryFilter || agency.country.toLowerCase().includes(countryFilter.toLowerCase());
        const matchesTown = !townFilter || agency.town.toLowerCase().includes(townFilter.toLowerCase());
        return matchesSearch && matchesCountry && matchesTown;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredAgencies.length / pageSize));
    const pagedAgencies = filteredAgencies.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, countryFilter, townFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const canEdit = (agency: Agency) => {
        return !(agency.cashRegisters || []).some((reg) =>
            reg.sessions.some((s) => s.state === "ouverte" || s.is_locked)
        );
    };

    const handleDelete = async (agency: Agency) => {
        if (!confirm("Delete this agency?")) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/agencies/${agency.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to delete agency");
            onDeleted?.(agency.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete agency");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-md border">
            {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border-b">{error}</div>
            )}
            <div className="flex flex-col gap-2 md:flex-row md:items-center border-b bg-muted/30 p-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or location"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                    type="text"
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    placeholder="Country"
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                    type="text"
                    value={townFilter}
                    onChange={(e) => setTownFilter(e.target.value)}
                    placeholder="Town / neighborhood"
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
            </div>
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Location</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Address</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Landmark</th>
                        {!readOnly && (
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {pagedAgencies.map((agency) => {
                        const blocked = !canEdit(agency);
                        return (
                            <tr key={agency.id} className="border-b">
                                <td className="p-4 align-middle font-medium">{agency.name}</td>
                                <td className="p-4 align-middle text-sm text-muted-foreground">
                                    {agency.country} / {agency.town}{agency.neighborhood ? ` / ${agency.neighborhood}` : ""}
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground">
                                    {agency.address || "-"}
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground">
                                    {agency.location_hint || "-"}
                                </td>
                                {!readOnly && (
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                disabled={blocked}
                                                onClick={() =>
                                                    openModal((close) => (
                                                        <AgencyEditModal
                                                            agency={agency}
                                                            onSaved={onUpdated}
                                                            onClose={close}
                                                        />
                                                    ))
                                                }
                                                className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                disabled={blocked}
                                                onClick={() => handleDelete(agency)}
                                                className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-destructive text-destructive hover:bg-destructive/10 h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        {blocked && (
                                            <p className="text-[10px] text-muted-foreground mt-1">Locked: open/blocked session exists</p>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

        </div>
    );
}
