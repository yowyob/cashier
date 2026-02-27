"use client";

import { useState, Fragment, useEffect } from "react";
import { EditCashierDialog } from "./edit-cashier-dialog";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { TablePagination } from "@/components/ui/table-pagination";

interface Cashier {
    id: string;
    user_name: string;
    user_first_name: string;
    phone?: string | null;
    account_number?: string | null;
    country: string | null;
    cashierProfile: {
        hire_date: string | null;
        town_list_chosen: string | null;
        work_town?: string | null;
        base_agency_id?: string | null;
        baseAgency?: {
            id: string;
            name: string;
            town: string;
        } | null;
    } | null;
}

interface CashierListProps {
    cashiers: Cashier[];
    canManage?: boolean;
}

export function CashierList({ cashiers, canManage }: CashierListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [townFilter, setTownFilter] = useState("");
    const [page, setPage] = useState(1);
    const { openModal } = useAdminModal();

    const deleteCashier = async (cashier: Cashier) => {
        if (!confirm("Delete this cashier?")) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/cashiers/${cashier.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to delete cashier");
            // Refresh UI by reloading page (simpler for now)
            window.location.reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete cashier");
        } finally {
            setSaving(false);
        }
    };

    const filteredCashiers = cashiers.filter((cashier) => {
        const text = `${cashier.user_first_name} ${cashier.user_name} ${cashier.phone || ""} ${cashier.cashierProfile?.work_town || ""}`.toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());

        const towns = (() => {
            try {
                return cashier.cashierProfile?.town_list_chosen
                    ? JSON.parse(cashier.cashierProfile.town_list_chosen)
                    : [];
            } catch {
                return [];
            }
        })();
        const matchesTown =
            !townFilter ||
            (Array.isArray(towns) && towns.some((t: string) => t.toLowerCase().includes(townFilter.toLowerCase()))) ||
            (cashier.cashierProfile?.work_town || "").toLowerCase().includes(townFilter.toLowerCase());

        return matchesSearch && matchesTown;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredCashiers.length / pageSize));
    const pagedCashiers = filteredCashiers.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, townFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const toggleExpand = (cashierId: string) => {
        setExpandedId((prev) => (prev === cashierId ? null : cashierId));
    };

    return (
        <div className="rounded-md border">
            {error && <div className="p-3 text-sm text-destructive bg-destructive/10 border-b">{error}</div>}
            <div className="flex flex-col md:flex-row gap-2 border-b bg-muted/30 p-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, username, or phone"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                    type="text"
                    value={townFilter}
                    onChange={(e) => setTownFilter(e.target.value)}
                    placeholder="Filter by authorized town"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
            </div>
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Username</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Work Town</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Hire Date</th>
                        {canManage && <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>}
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {pagedCashiers.map((cashier) => {
                        const isExpanded = expandedId === cashier.id;
                        return (
                            <Fragment key={cashier.id}>
                                <tr
                                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                                    onClick={() => toggleExpand(cashier.id)}
                                    title="Click to view more details"
                                >
                                    <td className="p-4 align-middle">{cashier.user_first_name}</td>
                                    <td className="p-4 align-middle">{cashier.user_name}</td>
                                    <td className="p-4 align-middle">{cashier.cashierProfile?.work_town || "-"}</td>
                                    <td className="p-4 align-middle">{cashier.cashierProfile?.hire_date ? new Date(cashier.cashierProfile.hire_date).toLocaleDateString() : '-'}</td>
                                    {canManage && (
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openModal((close) => (
                                                            <EditCashierDialog
                                                                cashier={cashier}
                                                                isOpen
                                                                onClose={close}
                                                            />
                                                        ));
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteCashier(cashier);
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-destructive text-destructive hover:bg-destructive/10 h-8 px-3"
                                                    disabled={saving}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                                {isExpanded && (
                                    <tr className="border-b bg-muted/20">
                                        <td colSpan={canManage ? 5 : 4} className="p-4 align-middle">
                                            <div className="rounded-md border bg-background p-3 text-sm">
                                                <div className="grid gap-2 md:grid-cols-2">
                                                    <div><span className="font-medium">Account #:</span> {cashier.account_number || "-"}</div>
                                                    <div><span className="font-medium">Phone:</span> {cashier.phone || "-"}</div>
                                                    <div><span className="font-medium">Work town:</span> {cashier.cashierProfile?.work_town || "-"}</div>
                                                    <div><span className="font-medium">Base agency:</span> {cashier.cashierProfile?.baseAgency?.name || "-"}</div>
                                                    <div><span className="font-medium">Hire date:</span> {cashier.cashierProfile?.hire_date ? new Date(cashier.cashierProfile.hire_date).toLocaleDateString() : "-"}</div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="font-medium">Authorized towns:</span>{" "}
                                                    {cashier.cashierProfile?.town_list_chosen
                                                        ? JSON.parse(cashier.cashierProfile.town_list_chosen).join(", ")
                                                        : "-"}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

        </div>
    );
}
