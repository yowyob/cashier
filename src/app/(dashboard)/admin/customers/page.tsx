"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface Customer {
    id: string;
    person: {
        id: string;
        user_first_name: string;
        mail: string | null;
    };
    phone: string | null;
    totalBalance: number;
    accountsCount: number;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [page, setPage] = useState(1);
    const router = useRouter();

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        try {
            const response = await fetch("/api/admin/customers");
            if (response.ok) {
                const data = await response.json();
                const grouped = new Map<string, Customer>();

                (Array.isArray(data) ? data : []).forEach((item: any, index: number) => {
                    const personId = item?.person?.id || item?.personId || item?.id || `row-${index}`;
                    const totalBalance = Number(
                        item?.totalBalance ??
                        item?.total_balance ??
                        (Array.isArray(item?.accounts)
                            ? item.accounts.reduce((sum: number, acc: any) => sum + Number(acc?.total_funds || 0), 0)
                            : 0)
                    ) || 0;
                    const accountsCount =
                        Number(item?.accountsCount ?? item?.accounts_count) ||
                        (Array.isArray(item?.accounts) ? item.accounts.length : 0);

                    const existing = grouped.get(personId);
                    if (existing) {
                        existing.totalBalance += totalBalance;
                        existing.accountsCount += accountsCount;
                        return;
                    }

                    grouped.set(personId, {
                        id: personId,
                        person: {
                            id: item?.person?.id || personId,
                            user_first_name: item?.person?.user_first_name || item?.person?.userFirstName || "-",
                            mail: item?.person?.mail ?? null
                        },
                        phone: item?.phone ?? item?.person?.phone ?? null,
                        totalBalance,
                        accountsCount
                    });
                });

                setCustomers(Array.from(grouped.values()));
            }
        } catch (error) {
            console.error("Failed to fetch customers:", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredCustomers = customers.filter((customer) => {
        const text = `${customer.person.user_first_name} ${customer.person.mail || ""} ${customer.phone || ""}`.toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());
        const minBal = minBalance ? parseFloat(minBalance) : 0;
        const maxBal = maxBalance ? parseFloat(maxBalance) : Infinity;
        const matchesMinBalance = !minBalance || customer.totalBalance >= minBal;
        const matchesMaxBalance = !maxBalance || customer.totalBalance <= maxBal;
        return matchesSearch && matchesMinBalance && matchesMaxBalance;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
    const pagedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, minBalance, maxBalance]);

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
                <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm font-medium">
                        Search
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name, email, phone"
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Min total balance
                        <input
                            type="number"
                            min="0"
                            value={minBalance}
                            onChange={(e) => setMinBalance(e.target.value)}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Max total balance
                        <input
                            type="number"
                            min="0"
                            value={maxBalance}
                            onChange={(e) => setMaxBalance(e.target.value)}
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
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Accounts</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No customers found
                                    </td>
                                </tr>
                            ) : (
                                pagedCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="border-b hover:bg-muted/50 cursor-pointer"
                                        onClick={() => router.push(`/admin/accounts?customerId=${customer.person.id}`)}
                                    >
                                        <td className="p-4 align-middle font-medium">
                                            {customer.person.user_first_name}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {customer.phone || '-'}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {customer.person.mail || '-'}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {customer.accountsCount}
                                        </td>
                                        <td className="p-4 align-middle font-medium">
                                            {customer.totalBalance.toLocaleString()} XAF
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
