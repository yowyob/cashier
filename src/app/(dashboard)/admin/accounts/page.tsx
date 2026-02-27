"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface Event {
    id: string;
    type: string;
    date_time: Date;
    payload: string | null;
}

interface Account {
    id: string;
    account_number: string;
    total_funds: number;
    is_active: boolean;
    create_on: Date;
    ownerId?: string | null;
    owner: {
        name: string;
        username: string;
        role: string;
    };
    events: Event[];
    operations: any[];
}

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const searchParams = useSearchParams();
    const customerIdFilter = searchParams.get("customerId");

    useEffect(() => {
        fetchAccounts();
    }, []);

    async function fetchAccounts() {
        try {
            const response = await fetch("/api/admin/accounts");
            if (response.ok) {
                const data = await response.json();
                const normalized = data.map((acc: any) => ({
                    ...acc,
                    total_funds: Number(acc.total_funds),
                    events: (acc.events || []).map((ev: any) => ({
                        ...ev,
                        date_time: ev.date_time
                    })),
                    operations: (acc.operations || []).map((op: any) => ({
                        ...op,
                        create_on: op.create_on
                    }))
                }));
                setAccounts(normalized);
            }
        } catch (error) {
            console.error("Failed to fetch accounts:", error);
        } finally {
            setLoading(false);
        }
    }

    function toggleExpand(accountId: string) {
        setExpandedAccount(expandedAccount === accountId ? null : accountId);
    }

    const filteredAccounts = accounts.filter((acc) => {
        const matchesCustomer = !customerIdFilter || acc.ownerId === customerIdFilter;
        const matchesSearch =
            !search ||
            acc.owner.name.toLowerCase().includes(search.toLowerCase()) ||
            acc.owner.username.toLowerCase().includes(search.toLowerCase()) ||
            (acc.account_number || "").toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === "all" || acc.owner.role === roleFilter;
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" ? acc.is_active : !acc.is_active);
        return matchesCustomer && matchesSearch && matchesRole && matchesStatus;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
    const pagedAccounts = filteredAccounts.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
        setExpandedAccount(null);
    }, [search, roleFilter, statusFilter, customerIdFilter]);

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
                <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="p-4 border-b flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search (name, username, account number)"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">All roles</option>
                        <option value="customer">Customer</option>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-8"></th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Account Number</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Owner</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Balance</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No accounts found
                                    </td>
                                </tr>
                            ) : (
                                pagedAccounts.map((account) => (
                                    <React.Fragment key={account.id}>
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="p-4 align-middle">
                                                <button
                                                    onClick={() => toggleExpand(account.id)}
                                                    className="hover:bg-accent rounded p-1"
                                                >
                                                    {expandedAccount === account.id ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4 align-middle font-medium">
                                                {account.account_number || ""}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{account.owner.name}</span>
                                                    <span className="text-xs text-muted-foreground">{account.owner.username}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle text-xs">
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-semibold">
                                                    {account.owner.role}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle font-medium">
                                                {Number(account.total_funds).toLocaleString()} XAF
                                            </td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${account.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {account.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {format(new Date(account.create_on), 'dd/MM/yyyy')}
                                            </td>
                                        </tr>
                                        {expandedAccount === account.id && (
                                            <tr>
                                                <td colSpan={6} className="bg-muted/20 p-4">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <h4 className="font-semibold text-sm">Operations ({account.operations?.length || 0})</h4>
                                                            {(account.operations?.length || 0) === 0 ? (
                                                                <p className="text-sm text-muted-foreground">Aucune opération</p>
                                                            ) : (
                                                                <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                                                                    {account.operations?.map((op: any) => {
                                                                        const isCredit = op.recipient_id === account.id || op.sense === "entree";
                                                                        return (
                                                                            <div key={op.id} className="flex items-center gap-3 text-sm border-l-2 border-primary pl-3 py-1">
                                                                                <span className={`font-semibold ${isCredit ? "text-green-700" : "text-red-700"}`}>
                                                                                    {isCredit ? "+" : "-"}{Number(op.amount).toLocaleString()} XAF
                                                                                </span>
                                                                                <span className="text-muted-foreground">
                                                                                    {format(new Date(op.create_on), 'dd/MM/yyyy HH:mm')}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground truncate">
                                                                                    {op.reason || op.external_reference || "Mouvement"}
                                                                                </span>
                                                                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                                                    {op.session?.cashRegister?.town || "-"}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h4 className="font-semibold text-sm">Account Events ({account.events.length})</h4>
                                                            {account.events.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">No events recorded</p>
                                                            ) : (
                                                                <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                                                                    {account.events.map((event) => (
                                                                        <div key={event.id} className="flex items-center gap-4 text-sm border-l-2 border-primary pl-3 py-1">
                                                                            <span className="font-medium">{event.type}</span>
                                                                            <span className="text-muted-foreground">
                                                                                {format(new Date(event.date_time), 'dd/MM/yyyy HH:mm')}
                                                                            </span>
                                                                            {event.payload && (
                                                                                <span className="text-xs text-muted-foreground truncate">{event.payload.substring(0, 80)}...</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
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
