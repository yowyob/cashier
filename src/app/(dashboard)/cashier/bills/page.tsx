"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { TablePagination } from "@/components/ui/table-pagination";

interface BillItem {
    id: string;
    invoice_code: string;
    amount: number;
    customer_name: string;
    due_date: string | null;
    payment_mode: "cash" | "account";
    account?: {
        account_number: string | null;
        customer_phone: string | null;
    };
}

interface Movement {
    id: string;
    amount: number;
    reason?: string | null;
    external_reference: string | null;
    create_on: Date;
    sense?: string | null;
    session_id?: string | null;
    session?: {
        id?: string | null;
        cashRegister?: {
            sale_agent_accounting_account?: string | null;
        } | null;
        cash_register?: {
            sale_agent_accounting_account?: string | null;
        } | null;
    } | null;
    cashRegister?: {
        sale_agent_accounting_account?: string | null;
    } | null;
    cash_register?: {
        sale_agent_accounting_account?: string | null;
    } | null;
    emitter_accounting_account?: string | null;
    recipient_accounting_account?: string | null;
    emitter_id?: string | null;
    recipient_id?: string | null;
    create_by?: string | null;
    creator_id?: string | null;
    ticketingDetails?: unknown[] | null;
    ticketing_details?: unknown[] | null;
    is_accounted?: boolean;
}

export default function CashierBillsPage() {
    const router = useRouter();
    const [bills, setBills] = useState<BillItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [payments, setPayments] = useState<Movement[]>([]);
    const [paymentLoading, setPaymentLoading] = useState(true);
    const [paymentSearch, setPaymentSearch] = useState("");
    const [paymentPage, setPaymentPage] = useState(1);
    const [paymentProcessing, setPaymentProcessing] = useState<Record<string, boolean>>({});
    const [paymentBulkAccounting, setPaymentBulkAccounting] = useState(false);
    const [paymentBulkText, setPaymentBulkText] = useState("Working");

    useEffect(() => {
        async function loadBills() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch("/api/cashier/bills");
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load bills");
                }
                const data = await response.json();
                setBills(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load bills");
            } finally {
                setLoading(false);
            }
        }

        loadBills();
    }, []);

    useEffect(() => {
        async function fetchPaymentHistory() {
            try {
                const response = await fetch("/api/cashier/movements?sense=entree&hasInvoice=true");
                if (response.ok) {
                    const text = await response.text();
                    if (text) {
                        try {
                            const data = JSON.parse(text);
                            setPayments(Array.isArray(data) ? data : []);
                        } catch (e) {
                            console.error("Failed to parse payment history", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch payment history:", error);
            } finally {
                setPaymentLoading(false);
            }
        }

        fetchPaymentHistory();
    }, []);

    useEffect(() => {
        if (!paymentBulkAccounting) return;
        let dots = 0;
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            setPaymentBulkText(`Working${".".repeat(dots)}`);
        }, 500);
        return () => clearInterval(interval);
    }, [paymentBulkAccounting]);

    const filteredBills = useMemo(() => {
        if (!search) return bills;
        const term = search.toLowerCase();
        return bills.filter((bill) => {
            const text = `${bill.invoice_code} ${bill.customer_name} ${bill.account?.account_number || ""}`.toLowerCase();
            return text.includes(term);
        });
    }, [bills, search]);

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
    const pagedBills = filteredBills.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const getInvoiceFromMovement = (payment: Movement) => {
        if (payment.reason && payment.reason.includes(":")) {
            const parts = payment.reason.split(":");
            return parts[parts.length - 1].trim();
        }
        return payment.external_reference || "-";
    };

    const filteredPayments = payments.filter((payment) => {
        const invoice = getInvoiceFromMovement(payment);
        if (!invoice.toUpperCase().startsWith("INV")) return false;
        if (!paymentSearch) return true;
        return invoice.toLowerCase().includes(paymentSearch.toLowerCase());
    });

    const paymentTotalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
    const pagedPayments = filteredPayments.slice((paymentPage - 1) * pageSize, paymentPage * pageSize);

    useEffect(() => {
        setPaymentPage(1);
    }, [paymentSearch]);

    useEffect(() => {
        if (paymentPage > paymentTotalPages) {
            setPaymentPage(paymentTotalPages);
        }
    }, [paymentPage, paymentTotalPages]);

    function buildAccountingPayload(movement: Movement) {
        const register =
            movement.cashRegister ??
            movement.cash_register ??
            movement.session?.cashRegister ??
            movement.session?.cash_register ??
            null;
        const cashierAccountingAccount =
            register?.sale_agent_accounting_account ??
            null;
        return {
            id: movement.id,
            session_id: movement.session_id ?? movement.session?.id ?? null,
            sense: movement.sense ?? null,
            amount: Number(movement.amount ?? 0),
            reason: movement.reason ?? null,
            recipient_id: movement.recipient_id ?? null,
            emitter_id: movement.emitter_id ?? null,
            is_accounted: false,
            event_ticketing_details: Boolean(movement.ticketingDetails?.length || movement.ticketing_details?.length),
            external_reference: movement.external_reference ?? null,
            create_on: movement.create_on ?? null,
            create_by: movement.create_by ?? movement.creator_id ?? null,
            emitter_accounting_account:
                movement.emitter_accounting_account ?? cashierAccountingAccount ?? null,
            recipient_accounting_account:
                movement.recipient_accounting_account ?? cashierAccountingAccount ?? null,
            is_deleted: false
        };
    }

    async function handlePaymentMarkAccounted(movementId: string) {
        const movement = payments.find((m) => m.id === movementId);
        if (!movement) return;
        setPaymentProcessing(prev => ({ ...prev, [movementId]: true }));
        try {
            const payload = buildAccountingPayload(movement);
            const response = await fetch("/api/accounting/cash-movements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const refreshed = await fetch("/api/cashier/movements?sense=entree&hasInvoice=true");
                if (refreshed.ok) {
                    const text = await refreshed.text();
                    if (text) {
                        const data = JSON.parse(text);
                        setPayments(Array.isArray(data) ? data : []);
                    }
                }
                setPaymentPage(1);
            } else {
                throw new Error("Failed to mark as accounted");
            }
        } catch (err) {
            console.error("Failed to mark as accounted", err);
        } finally {
            setPaymentProcessing(prev => ({ ...prev, [movementId]: false }));
        }
    }

    async function handlePaymentBulkAccount() {
        const targets = filteredPayments.filter((m) => !m.is_accounted);
        if (targets.length === 0) return;
        setPaymentBulkAccounting(true);
        try {
            for (const movement of targets) {
                const payload = buildAccountingPayload(movement);
                const response = await fetch("/api/accounting/cash-movements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error("Failed to mark movement as accounted");
                }
            }
            const refreshed = await fetch("/api/cashier/movements?sense=entree&hasInvoice=true");
            if (refreshed.ok) {
                const text = await refreshed.text();
                if (text) {
                    const data = JSON.parse(text);
                    setPayments(Array.isArray(data) ? data : []);
                }
            }
            setPaymentPage(1);
        } catch (err) {
            console.error("Bulk accounting failed:", err);
        } finally {
            setPaymentBulkAccounting(false);
            setPaymentBulkText("Working");
        }
    }

    function goToPayment(billId: string) {
        router.push(`/operations/bill-payment?bill_id=${encodeURIComponent(billId)}`);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
                    <p className="text-muted-foreground">Bills sent to your register</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by invoice, customer, or account..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </label>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Invoice</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Customer</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Due date</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Payment</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="h-24 text-center text-muted-foreground">Loading...</td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="h-24 text-center text-destructive">{error}</td>
                                    </tr>
                                ) : pagedBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="h-24 text-center text-muted-foreground">No bills available</td>
                                    </tr>
                                ) : (
                                    pagedBills.map((bill) => (
                                        <tr key={bill.id} className="border-b hover:bg-muted/40">
                                            <td className="px-4 py-3 font-mono text-sm">{bill.invoice_code}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{bill.customer_name}</div>
                                                {bill.account?.account_number && (
                                                    <div className="text-xs text-muted-foreground">Account: {bill.account.account_number}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {bill.due_date ? format(new Date(bill.due_date), "dd/MM/yyyy") : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bill.payment_mode === "account" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                                                    {bill.payment_mode === "account" ? "Account" : "Cash"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold">
                                                {Number(bill.amount).toLocaleString()} XAF
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => goToPayment(bill.id)}
                                                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                                >
                                                    Pay
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

                <div className="rounded-xl border bg-card">
                    <div className="p-6 border-b flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">Payment History</h2>
                            <p className="text-sm text-muted-foreground">Recent bill payments (INV)</p>
                        </div>
                        <button
                            type="button"
                            onClick={handlePaymentBulkAccount}
                            disabled={paymentBulkAccounting || filteredPayments.every((m) => m.is_accounted)}
                            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                        >
                            {paymentBulkAccounting ? paymentBulkText : "Count all"}
                        </button>
                    </div>
                    <div className="border-b px-4 py-3">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={paymentSearch}
                                onChange={(e) => setPaymentSearch(e.target.value)}
                                placeholder="Filter by invoice code..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </label>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Invoice Code</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Is accounted</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentLoading ? (
                                    <tr>
                                        <td colSpan={4} className="h-24 text-center text-muted-foreground">Loading...</td>
                                    </tr>
                                ) : pagedPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="h-24 text-center text-muted-foreground">No payments yet</td>
                                    </tr>
                                ) : (
                                    pagedPayments.map((payment) => (
                                        <tr key={payment.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4 align-middle">
                                                {format(new Date(payment.create_on), "dd/MM/yyyy HH:mm:ss")}
                                            </td>
                                            <td className="p-4 align-middle font-mono text-sm">
                                                {getInvoiceFromMovement(payment)}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePaymentMarkAccounted(payment.id)}
                                                    disabled={payment.is_accounted || paymentProcessing[payment.id]}
                                                    className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium border transition-colors ${
                                                        payment.is_accounted
                                                            ? "border-muted bg-muted text-muted-foreground opacity-60 cursor-default"
                                                            : "border-primary text-primary hover:bg-primary/10"
                                                    }`}
                                                >
                                                    {payment.is_accounted ? "OK" : (paymentProcessing[payment.id] ? "..." : "Count")}
                                                </button>
                                            </td>
                                            <td className="p-4 align-middle text-right font-medium text-green-600">
                                                +{Number(payment.amount).toLocaleString()} XAF
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <TablePagination page={paymentPage} totalPages={paymentTotalPages} onPageChange={setPaymentPage} />
                </div>
            </div>
        </div>
    );
}
