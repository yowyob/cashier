"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { TicketingInput } from "@/components/cashier/ticketing-input";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { TablePagination } from "@/components/ui/table-pagination";

interface Customer {
    id: string;
    person: {
        user_first_name: string;
        user_name: string;
        phone: string | null;
    };
    accounts: {
        id: string;
        total_funds: number;
        is_active: boolean;
    }[];
}

interface Movement {
    id: string;
    amount: number;
    reason: string | null;
    create_on: Date;
    external_reference: string | null;
    is_accounted: boolean;
    emitter: {
        person: {
            user_first_name: string;
            user_name?: string;
            phone?: string | null;
        };
    } | null;
}

interface Denomination {
    id: string;
    label: string;
    value: number;
}

const FALLBACK_DENOMS: Denomination[] = [
    { id: "fallback-10000", label: "10 000 XAF", value: 10000 },
    { id: "fallback-5000", label: "5 000 XAF", value: 5000 },
    { id: "fallback-2000", label: "2 000 XAF", value: 2000 },
    { id: "fallback-1000", label: "1 000 XAF", value: 1000 },
    { id: "fallback-500", label: "500 XAF", value: 500 },
    { id: "fallback-200", label: "200 XAF", value: 200 },
    { id: "fallback-100", label: "100 XAF", value: 100 },
    { id: "fallback-50", label: "50 XAF", value: 50 },
    { id: "fallback-25", label: "25 XAF", value: 25 },
    { id: "fallback-10", label: "10 XAF", value: 10 },
    { id: "fallback-5", label: "5 XAF", value: 5 },
    { id: "fallback-1", label: "1 XAF", value: 1 }
];

export default function WithdrawPage() {
    // Search & Selection
    const [query, setQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [cashierName, setCashierName] = useState("");
    const [cashierUsername, setCashierUsername] = useState("");
    const [denominations, setDenominations] = useState<Denomination[]>(FALLBACK_DENOMS);

    // Withdraw Form
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [showTicketing, setShowTicketing] = useState(false);
    const [ticketingData, setTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [clientRef, setClientRef] = useState<string | null>(null);
    const [hasDownloadedReceipt, setHasDownloadedReceipt] = useState(false);
    const [processing, setProcessing] = useState<Record<string, boolean>>({});
    const [bulkAccounting, setBulkAccounting] = useState(false);
    const [bulkText, setBulkText] = useState("Working");
    const [receiptData, setReceiptData] = useState<{
        movementId: string;
        reference: string;
        amount: number;
        customerName: string;
        accountId: string;
        accountingAccountNumber?: string | null;
        bankingAccountNumber?: string | null;
        cashierName?: string | null;
        cashierUsername?: string | null;
        reason?: string | null;
        timestamp: string;
        ticketing?: { total: number; denominations: Record<string, number> } | null;
    } | null>(null);

    // History Table
    const [withdrawals, setWithdrawals] = useState<Movement[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [customerFilter, setCustomerFilter] = useState("");
    const [referenceFilter, setReferenceFilter] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchWithdrawalHistory();
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadDenominations() {
            try {
                const res = await fetch("/api/config/denominations");
                const text = await res.text();
                if (!text) throw new Error("Empty denominations payload");
                const data = JSON.parse(text);
                if (!cancelled && Array.isArray(data) && data.length > 0) {
                    setDenominations(data);
                } else if (!cancelled) {
                    setDenominations(FALLBACK_DENOMS);
                }
            } catch (err) {
                if (!cancelled) {
                    setDenominations(FALLBACK_DENOMS);
                }
            }
        }
        loadDenominations();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        async function loadCashierProfile() {
            try {
                const res = await fetch("/api/users/profile");
                if (!res.ok) return;
                const data = await res.json();
                const name =
                    data?.userFirstName ??
                    data?.user_first_name ??
                    data?.user?.userFirstName ??
                    data?.user?.user_first_name ??
                    "";
                const username =
                    data?.userName ??
                    data?.user_name ??
                    data?.user?.userName ??
                    data?.user?.user_name ??
                    "";
                setCashierName(String(name || ""));
                setCashierUsername(String(username || ""));
            } catch {
                // ignore
            }
        }
        loadCashierProfile();
    }, []);

    async function fetchWithdrawalHistory() {
        try {
            const response = await fetch("/api/cashier/movements?sense=sortie&type=withdrawal");
            if (response.ok) {
                const data = await response.json();
                setWithdrawals(data);
            }
        } catch (error) {
            console.error("Failed to fetch withdrawal history:", error);
        } finally {
            setHistoryLoading(false);
        }
    }

    useEffect(() => {
        if (!bulkAccounting) return;
        let dots = 0;
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            setBulkText(`Working${".".repeat(dots)}`);
        }, 500);
        return () => clearInterval(interval);
    }, [bulkAccounting]);

    function buildAccountingPayload(movement: any) {
        const register =
            movement?.cashRegister ??
            movement?.cash_register ??
            movement?.session?.cashRegister ??
            movement?.session?.cash_register ??
            null;
        const cashierAccountingAccount =
            register?.sale_agent_accounting_account ??
            register?.saleAgentAccountingAccount ??
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

    async function handleMarkAccounted(movementId: string) {
        const movement = withdrawals.find((m) => m.id === movementId);
        if (!movement) return;
        setProcessing(prev => ({ ...prev, [movementId]: true }));
        try {
            const payload = buildAccountingPayload(movement);
            const response = await fetch("/api/accounting/cash-movements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                await fetchWithdrawalHistory();
                setPage(1);
            } else {
                throw new Error("Failed to mark as accounted");
            }
        } catch (err) {
            console.error("Failed to mark as accounted", err);
        } finally {
            setProcessing(prev => ({ ...prev, [movementId]: false }));
        }
    }

    async function handleBulkAccount() {
        const targets = withdrawals.filter((m) => !m.is_accounted);
        if (targets.length === 0) return;
        setBulkAccounting(true);
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
            await fetchWithdrawalHistory();
            setPage(1);
        } catch (err) {
            console.error("Bulk accounting failed:", err);
        } finally {
            setBulkAccounting(false);
            setBulkText("Working");
        }
    }

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query) return;
        setSearchLoading(true);
        setCustomers([]);
        setSelectedAccount(null);
        try {
            const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setCustomers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchLoading(false);
        }
    }

    async function handleWithdraw(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAccount || !amount) return;
        if (!hasDownloadedReceipt) {
            setError("Merci de télécharger le reçu avant de procéder.");
            return;
        }

        if (showTicketing && ticketingData && ticketingData.total !== Number(amount)) {
            setError(`Ticketing total (${ticketingData.total}) does not match amount (${amount})`);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/accounts/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_id: selectedAccount.id,
                    amount: Number(amount),
                    reason: reason || undefined,
                    ticketing: showTicketing ? ticketingData : undefined,
                    reference: clientRef || undefined
                }),
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Withdrawal failed");
            }

            const rawBalance =
                res?.newBalance ??
                res?.new_balance ??
                res?.balance ??
                res?.account?.total_funds ??
                res?.account?.totalFunds ??
                null;
            const numericBalance = rawBalance != null ? Number(rawBalance) : null;
            if (numericBalance != null && !Number.isNaN(numericBalance)) {
                setSuccess(`Withdrawal successful! New balance: ${numericBalance.toLocaleString()} XAF`);
            } else {
                setSuccess(`Withdrawal successful!`);
            }
            setAmount("");
            setReason("");
            setShowTicketing(false);
            setTicketingData(null);
            const customer = customers.find(c => c.accounts.some(a => a.id === selectedAccount.id));
            const accountingNumber =
                selectedAccount.accounting_account ??
                selectedAccount.account_number ??
                selectedAccount.accountingAccountNumber ??
                selectedAccount.accountNumber ??
                null;
            const bankingNumber =
                selectedAccount.bank_account_number ??
                selectedAccount.banking_account_number ??
                selectedAccount.bank_account ??
                selectedAccount.banking_account ??
                selectedAccount.bankAccountNumber ??
                selectedAccount.bankingAccountNumber ??
                null;
            const receipt = {
                movementId: res.movementId,
                reference: res.reference || clientRef || res.movementId,
                amount: Number(amount),
                customerName: customer?.person.user_first_name || "Client",
                accountId: selectedAccount.id,
                accountingAccountNumber: accountingNumber,
                bankingAccountNumber: bankingNumber,
                cashierName: cashierName || null,
                cashierUsername: cashierUsername || null,
                reason: reason || null,
                timestamp: new Date().toISOString(),
                ticketing: showTicketing ? ticketingData : null
            };
            setReceiptData(receipt);
            generateReceipt(receipt);
            setSelectedAccount(null);
            setCustomers([]);
            setQuery("");
            setClientRef(null);
            setHasDownloadedReceipt(false);

            // Refresh history
            fetchWithdrawalHistory();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function downloadReceipt() {
        if (!receiptData) return;
        generateReceipt(receiptData);
        setHasDownloadedReceipt(true);
    }

    function ensureReference() {
        if (clientRef) return clientRef;
        const ref = `WDR-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
        setClientRef(ref);
        return ref;
    }

    const getDisplayReference = (withdrawal: Movement) => {
        if (withdrawal.reason && withdrawal.reason.toLowerCase().includes("facture")) {
            const parts = withdrawal.reason.split(":");
            return parts[parts.length - 1].trim();
        }
        return withdrawal.external_reference || "-";
    };

    const filteredWithdrawals = withdrawals.filter((w) => {
        const ref = getDisplayReference(w).toLowerCase();
        const cust = (w.emitter?.person.user_first_name || "-").toLowerCase();
        const refOk = referenceFilter ? ref.includes(referenceFilter.toLowerCase()) : true;
        const custOk = customerFilter ? cust.includes(customerFilter.toLowerCase()) : true;
        return refOk && custOk;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredWithdrawals.length / pageSize));
    const pagedWithdrawals = filteredWithdrawals.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [customerFilter, referenceFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    function generateReceipt(data: {
        movementId: string;
        reference: string;
        amount: number;
        customerName: string;
        accountId: string;
        accountingAccountNumber?: string | null;
        bankingAccountNumber?: string | null;
        cashierName?: string | null;
        cashierUsername?: string | null;
        reason?: string | null;
        timestamp: string;
        ticketing?: { total: number; denominations: Record<string, number> } | null;
    }) {
        const doc = new jsPDF({ format: "a5", unit: "mm" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const now = format(new Date(data.timestamp), "dd/MM/yyyy HH:mm");
        const labelX = 14;
        const valueX = pageWidth - 14;
        let y = 16;
        const safeText = (value: unknown) => String(value ?? "-");
        const ensureSpace = (lines = 1, lineHeight = 4) => {
            if (y + lines * lineHeight > pageHeight - 16) {
                doc.addPage();
                y = 16;
            }
        };

        doc.setFontSize(14);
        doc.text("WITHDRAWAL RECEIPT", pageWidth / 2, y, { align: "center" });
        y += 6;
        doc.setFontSize(9);
        doc.text("KSM Cashier", pageWidth / 2, y, { align: "center" });

        y += 6;
        doc.setLineWidth(0.3);
        doc.line(14, y, pageWidth - 14, y);
        y += 6;

        doc.setFontSize(9);
        ensureSpace();
        doc.text("Reference", labelX, y);
        doc.text(safeText(data.reference), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Transaction ID", labelX, y);
        doc.text(safeText(data.movementId), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Date / Time", labelX, y);
        doc.text(safeText(now), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Customer", labelX, y);
        doc.text(safeText(data.customerName), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Cashier", labelX, y);
        doc.text(safeText(data.cashierName || data.cashierUsername), valueX, y, { align: "right" });
        y += 5;
        if (data.reason) {
            ensureSpace();
            doc.text("Reason", labelX, y);
            doc.text(safeText(data.reason), valueX, y, { align: "right" });
            y += 5;
        }
        ensureSpace();
        doc.text("Account (Accounting)", labelX, y);
        doc.text(safeText(data.accountingAccountNumber), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Account (Banking)", labelX, y);
        doc.text(safeText(data.bankingAccountNumber), valueX, y, { align: "right" });
        y += 5;

        if (data.ticketing?.denominations) {
            const lines = denominations
                .map((denom) => {
                    const rawQty =
                        data.ticketing?.denominations?.[denom.id] ??
                        data.ticketing?.denominations?.[String(denom.value)] ??
                        0;
                    const qty = Number(rawQty || 0);
                    if (qty <= 0) return null;
                    const denomValue =
                        typeof denom.value === "number"
                            ? denom.value
                            : Number(String(denom.label ?? "").replace(/[^\d]/g, "")) || 0;
                    return {
                        label: denom.label || String(denom.value ?? denom.id),
                        qty,
                        total: qty * Number(denomValue || 0)
                    };
                })
                .filter(Boolean) as Array<{ label: string; qty: number; total: number }>;

            if (lines.length > 0) {
                y += 2;
                doc.setLineWidth(0.2);
                doc.line(14, y, pageWidth - 14, y);
                y += 6;
                doc.setFontSize(9);
                ensureSpace();
                doc.text("Billetage", labelX, y);
                y += 5;
                lines.forEach((line) => {
                    ensureSpace();
                    doc.text(safeText(line.label), labelX, y);
                    doc.text(`x${safeText(line.qty)}`, pageWidth / 2 + 10, y, { align: "left" });
                    doc.text(`${Number(line.total || 0).toLocaleString()} XAF`, valueX, y, { align: "right" });
                    y += 4;
                });
                y += 1;
                ensureSpace();
                doc.text("Total billetage", labelX, y);
                doc.text(`${Number(data.ticketing.total || 0).toLocaleString()} XAF`, valueX, y, { align: "right" });
                y += 4;
            }
        }

        y += 2;
        doc.setLineWidth(0.2);
        doc.line(14, y, pageWidth - 14, y);
        y += 8;

        doc.setFontSize(12);
        ensureSpace();
        doc.text("TOTAL", labelX, y);
        doc.text(`${Number(data.amount || 0).toLocaleString()} XAF`, valueX, y, { align: "right" });

        y += 10;
        doc.setFontSize(8);
        ensureSpace();
        doc.text("Thank you for your business.", pageWidth / 2, y, { align: "center" });

        y += 8;
        doc.setLineWidth(0.2);
        ensureSpace();
        doc.line(20, y, pageWidth / 2 - 10, y);
        doc.line(pageWidth / 2 + 10, y, pageWidth - 20, y);
        y += 4;
        doc.setFontSize(7);
        ensureSpace();
        doc.text("Client signature", pageWidth / 4, y, { align: "center" });
        doc.text("Cashier signature", (pageWidth * 3) / 4, y, { align: "center" });

        doc.save(`receipt-withdrawal-${data.reference}.pdf`);
        setHasDownloadedReceipt(true);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Customer Withdrawal</h1>
                <p className="text-muted-foreground">Withdraw funds from customer accounts</p>
            </div>
            {receiptData && (
                <div className="rounded-md border bg-card p-4 flex items-center justify-between">
                    <div className="text-sm">
                        Reçu prêt : {receiptData.reference}
                    </div>
                    <button
                        onClick={downloadReceipt}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Télécharger le reçu (A5)
                    </button>
                </div>
            )}

            {/* Withdraw Form */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">New Withdrawal</h2>

                {error && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 rounded-md bg-green-500/15 p-3 text-sm text-green-600">
                        {success}
                    </div>
                )}

                {/* Customer Search */}
                <form onSubmit={handleSearch} className="mb-6">
                    <label className="text-sm font-medium mb-2 block">Search Customer</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Name or phone number..."
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={searchLoading}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            {searchLoading ? "Searching..." : "Search"}
                        </button>
                    </div>
                </form>

                {/* Customer Results */}
                {customers.length > 0 && (
                    <div className="mb-6 space-y-2">
                        <label className="text-sm font-medium">Select Account</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                            {customers.map((customer) =>
                                customer.accounts.map((account) => (
                                    <div
                                        key={account.id}
                                        onClick={() => {
                                            setSelectedAccount(account);
                                            setHasDownloadedReceipt(false);
                                        }}
                                        className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                                            selectedAccount?.id === account.id
                                                ? "border-primary bg-primary/5"
                                                : "hover:bg-muted/50"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate">{customer.person.user_first_name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {customer.person.phone || customer.person.user_name}
                                                </div>
                                                <div className="mt-2 text-[10px] text-muted-foreground space-y-1">
                                                    <div>
                                                        Accounting:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {account.accounting_account || account.account_number || "-"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Banking:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {account.bank_account_number || account.banking_account_number || "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-sm">{Number(account.total_funds).toLocaleString()} XAF</div>
                                                <div className={`text-[10px] ${account.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                    {account.is_active ? 'Active' : 'Inactive'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Withdraw Form */}
                {selectedAccount && (
                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                                <strong>Available balance:</strong> {Number(selectedAccount.total_funds).toLocaleString()} XAF
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Amount (XAF)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setHasDownloadedReceipt(false);
                                }}
                                min="1"
                                max={selectedAccount.total_funds}
                                step="1"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Enter amount..."
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Reason (Optional)</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    setHasDownloadedReceipt(false);
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Enter reason for withdrawal..."
                            />
                        </div>

                        {/* Ticketing Toggle */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="ticketing"
                                checked={showTicketing}
                                onChange={(e) => setShowTicketing(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor="ticketing" className="text-sm font-medium">
                                Add cash denomination details (Billetage)
                            </label>
                        </div>

                        {/* Ticketing Input */}
                        {showTicketing && (
                            <TicketingInput
                                onTotalChange={(total, denominations) => setTicketingData({ total, denominations })}
                                initialTotal={Number(amount) || 0}
                            />
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const ref = ensureReference();
                                    const customer = customers.find(c => c.accounts.some(a => a.id === selectedAccount?.id));
                                    const accountingNumber =
                                        selectedAccount?.accounting_account ??
                                        selectedAccount?.account_number ??
                                        selectedAccount?.accountingAccountNumber ??
                                        selectedAccount?.accountNumber ??
                                        null;
                                    const bankingNumber =
                                        selectedAccount?.bank_account_number ??
                                        selectedAccount?.banking_account_number ??
                                        selectedAccount?.bank_account ??
                                        selectedAccount?.banking_account ??
                                        selectedAccount?.bankAccountNumber ??
                                        selectedAccount?.bankingAccountNumber ??
                                        null;
                                    const draft = {
                                        movementId: ref,
                                        reference: ref,
                                        amount: Number(amount || 0),
                                        customerName: customer?.person.user_first_name || "Client",
                                        accountId: selectedAccount?.id || "N/A",
                                        accountingAccountNumber: accountingNumber,
                                        bankingAccountNumber: bankingNumber,
                                        cashierName: cashierName || null,
                                        cashierUsername: cashierUsername || null,
                                        reason: reason || null,
                                        timestamp: new Date().toISOString(),
                                        ticketing: showTicketing ? ticketingData : null
                                    };
                                    setReceiptData(draft);
                                    generateReceipt(draft);
                                    setHasDownloadedReceipt(true);
                                }}
                            disabled={!selectedAccount || !amount}
                            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                        >
                            Télécharger le reçu
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !hasDownloadedReceipt}
                                className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? "Processing..." : "Process Withdrawal"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Withdrawal History */}
            <div className="rounded-xl border bg-card">
                <div className="p-6 border-b flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">Withdrawal History</h2>
                        <p className="text-sm text-muted-foreground">Recent customer withdrawals</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleBulkAccount}
                        disabled={bulkAccounting || withdrawals.every((m) => m.is_accounted)}
                        className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                        {bulkAccounting ? bulkText : "Count all"}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <div className="flex flex-col md:flex-row gap-3 p-4">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-muted-foreground">Filter by customer</label>
                            <input
                                type="text"
                                value={customerFilter}
                                onChange={(e) => setCustomerFilter(e.target.value)}
                                placeholder="Customer name"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-muted-foreground">Filter by reference</label>
                            <input
                                type="text"
                                value={referenceFilter}
                                onChange={(e) => setReferenceFilter(e.target.value)}
                                placeholder="Invoice/ref"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Customer</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reference</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Is accounted</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <tr>
                                    <td colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedWithdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No withdrawals yet
                                    </td>
                                </tr>
                            ) : (
                                pagedWithdrawals.map((withdrawal) => (
                                    <tr key={withdrawal.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            {format(new Date(withdrawal.create_on), "dd/MM/yyyy HH:mm:ss")}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {withdrawal.emitter?.person.user_first_name || "-"}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {withdrawal.reason || "Customer withdrawal"}
                                        </td>
                                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                                            {getDisplayReference(withdrawal)}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <button
                                                type="button"
                                                onClick={() => handleMarkAccounted(withdrawal.id)}
                                                disabled={withdrawal.is_accounted || processing[withdrawal.id]}
                                                className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium border transition-colors ${
                                                    withdrawal.is_accounted
                                                        ? "border-muted bg-muted text-muted-foreground opacity-60 cursor-default"
                                                        : "border-primary text-primary hover:bg-primary/10"
                                                }`}
                                            >
                                                {withdrawal.is_accounted ? "OK" : (processing[withdrawal.id] ? "..." : "Count")}
                                            </button>
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium text-red-600">
                                            -{Number(withdrawal.amount).toLocaleString()} XAF
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}
