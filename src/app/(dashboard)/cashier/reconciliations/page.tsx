"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
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

export default function CashierReconciliationsPage() {
    const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("all");

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

    function downloadSessionPDF(sessionId: string) {
        window.open(`/api/reports/session/${sessionId}`, '_blank');
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
            <div className="flex items-center gap-4">
                <Link href="/cashier" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">My Reconciliations</h1>
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

            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Theoretical</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Physical</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Difference</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedReconciliations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No reconciliations found
                                    </td>
                                </tr>
                            ) : (
                                pagedReconciliations.map((recon) => (
                                    <tr key={recon.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            {format(new Date(recon.reconciliation.createOn), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {recon.cashRegister.town}
                                        </td>
                                        <td className="p-4 align-middle font-medium">
                                            {Number(recon.reconciliation.theoricalTotal).toLocaleString()} XAF
                                        </td>
                                        <td className="p-4 align-middle font-medium">
                                            {Number(recon.reconciliation.physicalTotal).toLocaleString()} XAF
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className={`font-medium ${Number(recon.reconciliation.difference) === 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }`}>
                                                {Number(recon.reconciliation.difference).toLocaleString()} XAF
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <button
                                                onClick={() => downloadSessionPDF(recon.session.id)}
                                                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                                            >
                                                <Download className="h-4 w-4" />
                                                PDF
                                            </button>
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
