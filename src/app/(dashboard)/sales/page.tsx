"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface BillPayment {
    id: string;
    amount: number;
    reason: string;
    external_reference: string;
    create_on: string | Date;
    creator: {
        user_first_name: string;
    };
    session: {
        cashRegister: {
            town: string;
        };
    };
}

export default function BillPaymentsPage() {
    const [bills, setBills] = useState<BillPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchBills() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/bills?all=1`);
                if (response.ok) {
                    const data = await response.json();
                    if (cancelled) return;
                    const payload = Array.isArray(data) ? data : data?.bills;
                    setBills(Array.isArray(payload) ? payload : []);
                } else {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to fetch bills");
                }
            } catch (error) {
                if (cancelled) return;
                setError(error instanceof Error ? error.message : "Failed to fetch bills");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchBills();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredBills = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return bills;
        return bills.filter((bill) => {
            const reason = bill.reason?.toLowerCase() || "";
            const reference = bill.external_reference?.toLowerCase() || "";
            return reason.includes(query) || reference.includes(query);
        });
    }, [bills, search]);

    const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
    const pagedBills = filteredBills.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Bill Payments</h1>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by invoice code..."
                        value={search}
                        onChange={(e) => {
                            setPage(1);
                            setSearch(e.target.value);
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Bills Table */}
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="border-b bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="h-12 px-4 align-middle font-medium">Date</th>
                                <th className="h-12 px-4 align-middle font-medium">Invoice Code</th>
                                <th className="h-12 px-4 align-middle font-medium">Amount</th>
                                <th className="h-12 px-4 align-middle font-medium">Cashier</th>
                                <th className="h-12 px-4 align-middle font-medium">Register</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedBills.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No bill payments found
                                    </td>
                                </tr>
                            ) : (
                                pagedBills.map((bill) => (
                                    <tr key={bill.id} className="border-b hover:bg-muted/50 transition-colors">
                                        <td className="p-4 align-middle">
                                            {format(new Date(bill.create_on), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4 align-middle font-medium">
                                            {bill.external_reference || '-'}
                                        </td>
                                        <td className="p-4 align-middle font-bold">
                                            {Number(bill.amount).toLocaleString()} XAF
                                        </td>
                                        <td className="p-4 align-middle">{bill.creator.user_first_name}</td>
                                        <td className="p-4 align-middle">{bill.session.cashRegister.town}</td>
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
