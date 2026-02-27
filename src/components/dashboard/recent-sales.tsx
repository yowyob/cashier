"use client";

import { useEffect, useState } from "react";

interface Transaction {
    id: string;
    amount: number;
    sense: string;
    reason: string;
    createdAt: string;
    cashier: string;
    register: string;
    customer: string | null;
    externalReference: string | null;
}

type RawTransaction = Record<string, any>;

function normalizeTransaction(item: RawTransaction): Transaction {
    const id = String(item.id ?? item.uuid ?? item.transaction_id ?? "");
    const amount = Number(item.amount ?? item.total ?? item.value ?? 0);
    const senseRaw = String(item.sense ?? item.type ?? item.direction ?? "");
    const normalizedSense = senseRaw.toLowerCase();
    const sense =
        normalizedSense === "in" || normalizedSense === "credit"
            ? "entree"
            : normalizedSense === "out" || normalizedSense === "debit"
                ? "sortie"
                : senseRaw;
    const reason = String(item.reason ?? item.motif ?? item.description ?? "");
    const createdAt =
        item.createdAt ??
        item.created_at ??
        item.create_on ??
        item.date ??
        new Date().toISOString();
    const cashier =
        item.cashier ??
        item.cashier_name ??
        item.cashierName ??
        item.employee_name ??
        item.employeeName ??
        "";
    const register =
        item.register ??
        item.register_name ??
        item.registerName ??
        item.agency_name ??
        item.agencyName ??
        "";
    const customer = item.customer ?? item.customer_name ?? item.customerName ?? null;
    const externalReference = item.externalReference ?? item.external_reference ?? item.reference ?? null;

    return {
        id,
        amount,
        sense,
        reason,
        createdAt: String(createdAt),
        cashier,
        register,
        customer,
        externalReference
    };
}

function normalizeTransactions(raw: any): Transaction[] {
    if (Array.isArray(raw)) return raw.map(normalizeTransaction);
    if (raw?.data && Array.isArray(raw.data)) return raw.data.map(normalizeTransaction);
    if (raw?.items && Array.isArray(raw.items)) return raw.items.map(normalizeTransaction);
    return [];
}

export function RecentSales() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTransactions() {
            try {
                const response = await fetch("/api/transactions/recent");
                if (response.ok) {
                    try {
                        const data = await response.json();
                        setTransactions(normalizeTransactions(data));
                    } catch (err) {
                        console.error("Failed to parse recent transactions", err);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch transactions:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchTransactions();
    }, []);

    useEffect(() => {
        if (!selectedId && transactions.length > 0) {
            setSelectedId(String(transactions[0].id));
        }
    }, [transactions, selectedId]);

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading...</div>;
    }

    if (transactions.length === 0) {
        return <div className="text-sm text-muted-foreground">No recent transactions</div>;
    }

    const getDisplayReference = (tx: Transaction) => {
        if (tx.reason && tx.reason.toLowerCase().includes("facture")) {
            const parts = tx.reason.split(":");
            return parts[parts.length - 1].trim();
        }
        return tx.externalReference || "-";
    };

    return (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {transactions.map((transaction) => {
                const id = String(transaction.id);
                const isExpanded = selectedId === id;
                const initials = transaction.customer
                    ? transaction.customer.split(" ").map(n => n[0]).join("").toUpperCase()
                    : transaction.cashier.split(" ").map(n => n[0]).join("").toUpperCase();

                const displayName = transaction.customer || transaction.cashier || "-";
                const displayInfo = transaction.reason || transaction.register || "-";
                const displayRef = getDisplayReference(transaction);

                return (
                    <div
                        key={id}
                        className={`rounded-lg border p-3 cursor-pointer transition-colors ${isExpanded ? "bg-muted/60 border-primary/50 shadow-sm" : "hover:bg-muted/50"}`}
                        onClick={() => setSelectedId(isExpanded ? null : id)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedId(isExpanded ? null : id);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                                {initials}
                            </div>
                            <div className="ml-4 space-y-1 flex-1">
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {displayInfo}
                                </p>
                            </div>
                            <div className={`ml-auto font-medium ${transaction.sense === "entree" ? "text-green-600" : "text-red-600"}`}>
                                {transaction.sense === "entree" ? "+" : "-"}{transaction.amount.toLocaleString()} XAF
                            </div>
                            <div className="text-xs text-muted-foreground ml-3">
                                {isExpanded ? "▲" : "▼"}
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground border-t pt-3">
                                <Detail label="Cashier" value={transaction.cashier || "-"} />
                                <Detail label="Register" value={transaction.register || "-"} />
                                <Detail label="Customer" value={transaction.customer || "-"} />
                                <Detail label="Reference" value={displayRef} mono />
                                <Detail label="Reason" value={transaction.reason || "-"} full />
                                <Detail label="Date" value={new Date(transaction.createdAt).toLocaleString()} full />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Detail({ label, value, full, mono }: { label: string; value: string; full?: boolean; mono?: boolean }) {
    return (
        <div className={full ? "col-span-2" : ""}>
            <div className="font-semibold text-foreground text-sm">{label}</div>
            <div className={mono ? "font-mono" : ""}>{value}</div>
        </div>
    );
}
