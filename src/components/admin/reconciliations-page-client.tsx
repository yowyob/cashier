"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { TablePagination } from "@/components/ui/table-pagination";

interface ReconciliationItem {
    reconciliation: {
        id: string;
        physicalTotal: number;
        theoricalTotal: number;
        difference: number;
        statut: string;
        justification: string | null;
        createOn: string | Date;
        checkOn: string | Date | null;
    };
    session: {
        id: string;
        state: string;
        openOn: string | Date;
        closeOn: string | Date | null;
    };
    cashRegister?: {
        id: string;
        town: string;
        country: string;
        neighborhood: string;
    };
    cash_register?: {
        id: string;
        town?: string;
        country?: string;
        neighborhood?: string;
    };
    opener: { id: string; userName: string; userFirstName: string };
    closer: { id: string; userName: string; userFirstName: string } | null;
    creator: { id: string; userName: string; userFirstName: string };
}

interface Props {
    canReview: boolean;
}

function ReconciliationReviewModal({
    reconciliation,
    onReviewed,
    onClose
}: {
    reconciliation: ReconciliationItem;
    onReviewed: (action: "valide" | "rejete") => void;
    onClose: () => void;
}) {
    const [adminComment, setAdminComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reviewReconciliation(action: "valide" | "rejete") {
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/reconciliations/${reconciliation.reconciliation.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, admin_comment: adminComment })
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to review reconciliation");
            }

            onReviewed(action);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-xl border shadow-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Review Reconciliation</h2>

                <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Physical Total:</span>
                            <span className="font-semibold ml-2">
                                {(() => {
                                    const physical = toNumber(
                                        getReconField(reconciliation.reconciliation, "physicalTotal", "physical_total")
                                    );
                                    return physical != null ? `${physical.toLocaleString()} XAF` : "-";
                                })()}
                            </span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Theorical Total:</span>
                        <span className="font-semibold ml-2">
                            {(() => {
                                const theorical = toNumber(
                                    getReconField(reconciliation.reconciliation, "theoricalTotal", "theorical_total")
                                );
                                return theorical != null ? `${theorical.toLocaleString()} XAF` : "-";
                            })()}
                        </span>
                    </div>
                    <div className="col-span-2">
                        <span className="text-muted-foreground">Difference:</span>
                        <span
                            className={`font-bold ml-2 ${(() => {
                                const diffValue = toNumber(
                                    getReconField(reconciliation.reconciliation, "difference", "difference")
                                );
                                const physical = toNumber(
                                    getReconField(reconciliation.reconciliation, "physicalTotal", "physical_total")
                                );
                                const theorical = toNumber(
                                    getReconField(reconciliation.reconciliation, "theoricalTotal", "theorical_total")
                                );
                                const delta =
                                    diffValue != null
                                        ? diffValue
                                        : physical != null && theorical != null
                                        ? physical - theorical
                                        : 0;
                                return delta > 0
                                    ? "text-green-600"
                                    : delta < 0
                                    ? "text-red-600"
                                    : "text-gray-600";
                            })()}`}
                        >
                            {(() => {
                                const diffValue = toNumber(
                                    getReconField(reconciliation.reconciliation, "difference", "difference")
                                );
                                const physical = toNumber(
                                    getReconField(reconciliation.reconciliation, "physicalTotal", "physical_total")
                                );
                                const theorical = toNumber(
                                    getReconField(reconciliation.reconciliation, "theoricalTotal", "theorical_total")
                                );
                                const delta =
                                    diffValue != null
                                        ? diffValue
                                        : physical != null && theorical != null
                                        ? physical - theorical
                                        : null;
                                if (delta == null) return "-";
                                return `${delta > 0 ? "+" : ""}${delta.toLocaleString()} XAF`;
                            })()}
                        </span>
                    </div>
                </div>

                    {reconciliation.reconciliation.justification && (
                        <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground mb-1">Cashier Justification:</p>
                            <p className="text-sm bg-white p-2 rounded border">{reconciliation.reconciliation.justification}</p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Admin Comment</label>
                    <textarea
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Add your comment or additional notes..."
                    />
                </div>

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md border hover:bg-muted text-sm"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => reviewReconciliation("rejete")}
                        disabled={submitting}
                        className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
                    >
                        {submitting ? "Processing..." : "Reject"}
                    </button>
                    <button
                        onClick={() => reviewReconciliation("valide")}
                        disabled={submitting}
                        className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
                    >
                        {submitting ? "Processing..." : "Validate"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatDateSafe(value: string | Date | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return format(date, "dd/MM/yyyy HH:mm");
}

function getTextName(person: any) {
    return (
        person?.userFirstName ??
        person?.user_first_name ??
        person?.fullName ??
        person?.full_name ??
        person?.name ??
        "-"
    );
}

function getReconField(recon: any, camelKey: string, snakeKey: string) {
    return recon?.[camelKey] ?? recon?.[snakeKey] ?? null;
}

function toNumber(value: any) {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
}

export function ReconciliationsPageClient({ canReview }: Props) {
    const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        startDate: "",
        endDate: ""
    });
    const [page, setPage] = useState(1);
    const { openModal } = useAdminModal();

    useEffect(() => {
        fetchReconciliations();
    }, [filters.status]);

    async function fetchReconciliations() {
        try {
            const type = filters.status === "all" ? "all" : filters.status;
            const query = type && type !== "all" ? `?type=${encodeURIComponent(type)}` : "";
            const response = await fetch(`/api/admin/reconciliations${query}`);
            if (response.ok) {
                const data = await response.json();
                setReconciliations(data);
            }
        } catch (err) {
            console.error("Failed to fetch reconciliations:", err);
        } finally {
            setLoading(false);
        }
    }

    function downloadSessionPDF(sessionId: string) {
        window.open(`/api/reports/session/${sessionId}`, "_blank");
    }

    function openReviewModal(recon: Reconciliation) {
        setSuccess(null);
        openModal((close) => (
            <ReconciliationReviewModal
                reconciliation={recon}
                onReviewed={(action) => {
                    setSuccess(`Reconciliation ${action === "valide" ? "validated" : "rejected"} successfully!`);
                    fetchReconciliations();
                }}
                onClose={close}
            />
        ));
    }

    const filteredReconciliations = reconciliations.filter((recon) => {
        const registerTown =
            recon.cashRegister?.town ||
            recon.cash_register?.town ||
            "";
        const openerName = getTextName(recon.opener);
        const closerName = getTextName(recon.closer);
        const creatorName = getTextName(recon.creator);
        const text = `${registerTown} ${openerName} ${closerName} ${creatorName}`.toLowerCase();
        const matchesSearch = !filters.search || text.includes(filters.search.toLowerCase());
        const statut =
            getReconField(recon.reconciliation, "statut", "statut") ??
            getReconField(recon.reconciliation, "status", "status") ??
            "";
        const matchesStatus =
            filters.status === "all" ||
            (filters.status === "pending" && statut === "en_attente") ||
            (filters.status === "justify" && statut === "justifie") ||
            (filters.status === "review" && (statut === "valide" || statut === "rejete")) ||
            (filters.status === "valide" && statut === "valide") ||
            (filters.status === "rejete" && statut === "rejete");
        const createValue =
            getReconField(recon.reconciliation, "createOn", "create_on") ??
            getReconField(recon.reconciliation, "createdOn", "created_on");
        const createDate = new Date(createValue || "");
        const hasValidDate = !Number.isNaN(createDate.getTime());
        const matchesStart = !filters.startDate || (hasValidDate && createDate >= new Date(filters.startDate));
        const matchesEnd = !filters.endDate || (hasValidDate && createDate <= new Date(`${filters.endDate}T23:59:59`));
        return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredReconciliations.length / pageSize));
    const pagedReconciliations = filteredReconciliations.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [filters.search, filters.status, filters.startDate, filters.endDate]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Cash Reconciliations</h1>
            </div>

            {success && (
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">
                    {success}
                </div>
            )}

            <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <div className="grid gap-3 md:grid-cols-4">
                    <label className="text-sm font-medium">
                        Search
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            placeholder="Register, cashier..."
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Status
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="justify">Justified</option>
                            <option value="review">Reviewed</option>
                            <option value="valide">Validated</option>
                            <option value="rejete">Rejected</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Start date
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        End date
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cashier</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Theoretical</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Physical</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Difference</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedReconciliations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No reconciliations found
                                    </td>
                                </tr>
                            ) : (
                                pagedReconciliations.map((recon) => (
                                    <tr key={recon.reconciliation.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            {formatDateSafe(
                                                getReconField(recon.reconciliation, "createOn", "create_on") ??
                                                    getReconField(recon.reconciliation, "createdOn", "created_on")
                                            )}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {recon.cashRegister?.town || recon.cash_register?.town || "-"}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {getTextName(recon.opener)}
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium">
                                            {(() => {
                                                const value = toNumber(
                                                    getReconField(recon.reconciliation, "theoricalTotal", "theorical_total")
                                                );
                                                return value != null ? `${value.toLocaleString()} XAF` : "-";
                                            })()}
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium">
                                            {(() => {
                                                const value = toNumber(
                                                    getReconField(recon.reconciliation, "physicalTotal", "physical_total")
                                                );
                                                return value != null ? `${value.toLocaleString()} XAF` : "-";
                                            })()}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <span
                                                className={`font-bold ${
                                                    (() => {
                                                        const diffValue = toNumber(
                                                            getReconField(recon.reconciliation, "difference", "difference")
                                                        );
                                                        if (diffValue != null) return diffValue === 0;
                                                        const physical = toNumber(
                                                            getReconField(recon.reconciliation, "physicalTotal", "physical_total")
                                                        );
                                                        const theorical = toNumber(
                                                            getReconField(recon.reconciliation, "theoricalTotal", "theorical_total")
                                                        );
                                                        if (physical == null || theorical == null) return true;
                                                        return physical - theorical === 0;
                                                    })()
                                                        ? "text-gray-600"
                                                        : (() => {
                                                              const diffValue = toNumber(
                                                                  getReconField(recon.reconciliation, "difference", "difference")
                                                              );
                                                              const physical = toNumber(
                                                                  getReconField(recon.reconciliation, "physicalTotal", "physical_total")
                                                              );
                                                              const theorical = toNumber(
                                                                  getReconField(recon.reconciliation, "theoricalTotal", "theorical_total")
                                                              );
                                                              const delta =
                                                                  diffValue != null
                                                                      ? diffValue
                                                                      : physical != null && theorical != null
                                                                      ? physical - theorical
                                                                      : 0;
                                                              return delta > 0 ? "text-green-600" : "text-red-600";
                                                          })()
                                                }`}
                                            >
                                                {(() => {
                                                    const diffValue = toNumber(
                                                        getReconField(recon.reconciliation, "difference", "difference")
                                                    );
                                                    const physical = toNumber(
                                                        getReconField(recon.reconciliation, "physicalTotal", "physical_total")
                                                    );
                                                    const theorical = toNumber(
                                                        getReconField(recon.reconciliation, "theoricalTotal", "theorical_total")
                                                    );
                                                    const delta =
                                                        diffValue != null
                                                            ? diffValue
                                                            : physical != null && theorical != null
                                                            ? physical - theorical
                                                            : null;
                                                    if (delta == null) return "-";
                                                    return `${delta > 0 ? "+" : ""}${delta.toLocaleString()} XAF`;
                                                })()}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {recon.reconciliation.statut === "valide" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Validated
                                                </span>
                                            ) : recon.reconciliation.statut === "rejete" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                                                    <XCircle className="h-3 w-3" />
                                                    Rejected
                                                </span>
                                            ) : recon.reconciliation.statut === "justifie" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Justified
                                                </span>
                                            ) : recon.reconciliation.statut === "en_attente" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {recon.reconciliation.statut}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {canReview && (recon.reconciliation.statut === "justifie" || recon.reconciliation.statut === "en_attente") && (
                                                    <button
                                                        onClick={() => openReviewModal(recon)}
                                                        className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        Reconcile
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => downloadSessionPDF(recon.session.id)}
                                                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    PDF
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

        </div>
    );
}
