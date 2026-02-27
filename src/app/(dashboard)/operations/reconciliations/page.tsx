"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
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
    cashRegister: {
        id: string;
        town: string;
        country: string;
        neighborhood: string;
    };
    opener: { id: string; userName: string; userFirstName: string };
    closer: { id: string; userName: string; userFirstName: string } | null;
    creator: { id: string; userName: string; userFirstName: string };
}

function JustificationModal({
    reconciliation,
    onSubmitted,
    onClose
}: {
    reconciliation: ReconciliationItem;
    onSubmitted: () => void;
    onClose: () => void;
}) {
    const [justification, setJustification] = useState(reconciliation.reconciliation.justification || "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submitJustification() {
        if (!justification.trim()) {
            setError("Please provide a justification");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/reconciliations/${reconciliation.reconciliation.id}/justify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ justification })
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to submit justification");
            }

            onSubmitted();
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
                <h2 className="text-xl font-semibold mb-4">
                    Justify Reconciliation
                </h2>

                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Physical:</span>
                            <span className="font-semibold ml-2">
                                {Number(reconciliation.reconciliation.physicalTotal).toLocaleString()} XAF
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Theorical:</span>
                            <span className="font-semibold ml-2">
                                {Number(reconciliation.reconciliation.theoricalTotal).toLocaleString()} XAF
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-muted-foreground">Difference:</span>
                            <span className={`font-bold ml-2 ${reconciliation.reconciliation.difference > 0 ? "text-green-600" : "text-red-600"}`}>
                                {reconciliation.reconciliation.difference > 0 ? "+" : ""}{Number(reconciliation.reconciliation.difference).toLocaleString()} XAF
                            </span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">
                        Explain the difference
                    </label>
                    <textarea
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        rows={4}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Provide a detailed explanation for the difference..."
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
                        onClick={submitJustification}
                        disabled={submitting}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-50"
                    >
                        {submitting ? "Submitting..." : "Submit Justification"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CashierReconciliationsPage() {
    const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("all");
    const { openModal } = useAdminModal();

    useEffect(() => {
        fetchReconciliations();
    }, [status]);

    async function fetchReconciliations() {
        try {
            const query = status && status !== "all" ? `?type=${encodeURIComponent(status)}` : "";
            const response = await fetch(`/api/cashier/reconciliations${query}`);
            if (response.ok) {
                const data = await response.json();
                setReconciliations(data);
            }
        } catch (error) {
            console.error("Failed to fetch reconciliations:", error);
        } finally {
            setLoading(false);
        }
    }

    function openJustificationModal(recon: Reconciliation) {
        setSuccess(null);
        openModal((close) => (
            <JustificationModal
                reconciliation={recon}
                onSubmitted={() => {
                    setSuccess("Justification submitted successfully!");
                    fetchReconciliations();
                }}
                onClose={close}
            />
        ));
    }

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(reconciliations.length / pageSize));
    const pagedReconciliations = reconciliations.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Reconciliations</h1>
                <p className="text-muted-foreground">View and justify your session reconciliations</p>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm font-medium">
                        Status
                        <select
                            value={status}
                            onChange={(e) => {
                                setPage(1);
                                setStatus(e.target.value);
                            }}
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
                </div>
            </div>

            {success && (
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">
                    {success}
                </div>
            )}

            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Physical</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Theorical</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Difference</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedReconciliations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No reconciliations found
                                    </td>
                                </tr>
                            ) : (
                                pagedReconciliations.map((recon) => {
                                    const diffColor = recon.reconciliation.difference === 0
                                        ? "text-gray-600"
                                        : recon.reconciliation.difference > 0
                                            ? "text-green-600"
                                            : "text-red-600";

                                    return (
                                        <tr key={recon.reconciliation.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4 align-middle">
                                                {format(new Date(recon.reconciliation.createOn), "dd/MM/yyyy HH:mm")}
                                            </td>
                                            <td className="p-4 align-middle">
                                                {recon.cashRegister.town}
                                            </td>
                                            <td className="p-4 align-middle text-right font-medium">
                                                {Number(recon.reconciliation.physicalTotal).toLocaleString()} XAF
                                            </td>
                                            <td className="p-4 align-middle text-right font-medium">
                                                {Number(recon.reconciliation.theoricalTotal).toLocaleString()} XAF
                                            </td>
                                            <td className={`p-4 align-middle text-right font-bold ${diffColor}`}>
                                                {recon.reconciliation.difference > 0 ? "+" : ""}{Number(recon.reconciliation.difference).toLocaleString()} XAF
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
                                                {(recon.reconciliation.statut === "en_attente" || recon.reconciliation.statut === "justifie") && (
                                                    <button
                                                        onClick={() => openJustificationModal(recon)}
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        {recon.reconciliation.justification ? "Edit Justification" : "Add Justification"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>

        </div>
    );
}
