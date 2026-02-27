"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface Transaction {
    id: string;
    amount: number;
    sense: string;
    reason: string | null;
    create_on: string | Date;
    create_by: string;
    external_reference: string | null;
    is_accounted: boolean;
    session: {
        cashRegister: {
            id: string;
            town: string;
        };
    };
    creator: {
        user_first_name: string;
    };
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: '',
        registerId: '',
        cashierId: '',
        search: ''
    });

    useEffect(() => {
        let cancelled = false;

        async function fetchTransactions() {
            setLoading(true);
            try {
                const response = await fetch(`/api/transactions?all=1`);
                if (response.ok) {
                    const data = await response.json();
                    if (!cancelled) {
                        const payload = Array.isArray(data)
                            ? data
                            : Array.isArray(data?.data)
                                ? data.data
                                : data?.movements;
                        setTransactions(Array.isArray(payload) ? payload : []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch transactions:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchTransactions();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredTransactions = useMemo(() => {
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);
        const query = filters.search.trim().toLowerCase();

        return transactions.filter((transaction) => {
            if (filters.type && transaction.sense !== filters.type) return false;
            if (filters.registerId && transaction.session?.cashRegister?.id !== filters.registerId) return false;
            if (filters.cashierId && transaction.create_by !== filters.cashierId) return false;
            const createdAt = new Date(transaction.create_on);
            if (start && createdAt < start) return false;
            if (end && createdAt > end) return false;
            if (query) {
                const reason = transaction.reason?.toLowerCase() || "";
                const reference = transaction.external_reference?.toLowerCase() || "";
                if (!reason.includes(query) && !reference.includes(query)) return false;
            }
            return true;
        });
    }, [transactions, filters]);

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
    const pagedTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    function handleFilterChange(key: string, value: string) {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }

    async function exportToPDF() {
        const params = new URLSearchParams({
            ...(filters.startDate && { startDate: filters.startDate }),
            ...(filters.endDate && { endDate: filters.endDate }),
            ...(filters.type && { type: filters.type }),
            ...(filters.registerId && { registerId: filters.registerId }),
            ...(filters.cashierId && { cashierId: filters.cashierId })
        });

        window.open(`/api/reports/transactions?${params}`, '_blank');
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">All Transactions</h1>
                </div>
                <button
                    onClick={exportToPDF}
                    className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 text-sm font-medium"
                >
                    <Download className="h-4 w-4" />
                    Export PDF
                </button>
            </div>

            {/* Filters */}
            <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">All</option>
                            <option value="entree">In (Entree)</option>
                            <option value="sortie">Out (Sortie)</option>
                        </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Search</label>
                        <input
                            type="text"
                            placeholder="Search by reason..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cashier</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Poste</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reference</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Is accounted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                pagedTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            {format(new Date(transaction.create_on), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${transaction.sense === 'entree'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {transaction.sense === 'entree' ? 'IN' : 'OUT'}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle font-medium">
                                            {transaction.sense === 'entree' ? '+' : '-'}{Number(transaction.amount).toLocaleString()} XAF
                                        </td>
                                        <td className="p-4 align-middle">{transaction.reason || '-'}</td>
                                        <td className="p-4 align-middle">{transaction.creator?.user_first_name || transaction.create_by || '-'}</td>
                                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                                            {transaction.session?.cashRegister?.id || transaction.session?.cash_register?.id || '-'}
                                        </td>
                                        <td className="p-4 align-middle">{transaction.session?.cashRegister?.town || transaction.session?.cash_register?.town || '-'}</td>
                                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                                            {transaction.external_reference || "-"}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                transaction.is_accounted
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}>
                                                {transaction.is_accounted ? "Oui" : "Non"}
                                            </span>
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
