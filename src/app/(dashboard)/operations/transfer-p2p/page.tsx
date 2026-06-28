"use client";

import { useState, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
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

interface Transfer {
    id: string;
    amount: number;
    reason: string | null;
    create_on: Date;
    external_reference?: string | null;
    is_accounted?: boolean;
    sense?: string | null;
    emitter: {
        person: {
            user_first_name: string;
        };
    } | null;
    recipient: {
        person: {
            user_first_name: string;
        };
    } | null;
}

export default function TransferP2PPage() {
    // Source Customer
    const [sourceQuery, setSourceQuery] = useState("");
    const [sourceCustomers, setSourceCustomers] = useState<Customer[]>([]);
    const [sourceAccount, setSourceAccount] = useState<any | null>(null);

    // Destination Customer
    const [destQuery, setDestQuery] = useState("");
    const [destCustomers, setDestCustomers] = useState<Customer[]>([]);
    const [destAccount, setDestAccount] = useState<any | null>(null);

    // Transfer Form
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [clientRef, setClientRef] = useState<string | null>(null);
    const [hasDownloadedReceipt, setHasDownloadedReceipt] = useState(false);
    const [cashierName, setCashierName] = useState("");
    const [cashierUsername, setCashierUsername] = useState("");
    const [processing, setProcessing] = useState<Record<string, boolean>>({});
    const [bulkAccounting, setBulkAccounting] = useState(false);
    const [bulkText, setBulkText] = useState("Working");
    const [receiptData, setReceiptData] = useState<{
        inMovementId: string;
        outMovementId: string;
        amount: number;
        sourceName: string;
        destName: string;
        sourceAccountingAccountNumber?: string | null;
        sourceBankingAccountNumber?: string | null;
        destAccountingAccountNumber?: string | null;
        destBankingAccountNumber?: string | null;
        cashierName?: string | null;
        cashierUsername?: string | null;
        timestamp: string;
        reference?: string | null;
    } | null>(null);

    // History Table
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [page, setPage] = useState(1);

    const pageSize = 20;
    const normalizeSense = (sense?: string | null) => (sense || "").toLowerCase();
    const isOutgoing = (sense?: string | null) => ["sortie", "out", "debit"].includes(normalizeSense(sense));
    const isIncoming = (sense?: string | null) => ["entree", "in", "credit"].includes(normalizeSense(sense));
    const getPersonName = (person: any) =>
        person?.user_first_name ||
        person?.userFirstName ||
        person?.full_name ||
        person?.fullName ||
        person?.name ||
        null;
    const getMovementName = (movement: Transfer | undefined, role: "from" | "to") => {
        if (!movement) return null;
        const emitterName = getPersonName(movement.emitter?.person ?? movement.emitter);
        const recipientName = getPersonName(movement.recipient?.person ?? movement.recipient);
        if (role === "from") {
            return emitterName || recipientName || null;
        }
        return recipientName || emitterName || null;
    };
    const displayTransfers = (() => {
        const groups = new Map<string, {
            key: string;
            movements: Transfer[];
            amount: number;
            create_on: Date;
            fromName: string | null;
            toName: string | null;
        }>();
        for (const movement of transfers) {
            const key = movement.external_reference || movement.id;
            const entry = groups.get(key) || {
                key,
                movements: [],
                amount: Number(movement.amount || 0),
                create_on: movement.create_on,
                fromName: null,
                toName: null
            };
            entry.movements.push(movement);
            if (movement.create_on && new Date(movement.create_on) > new Date(entry.create_on)) {
                entry.create_on = movement.create_on;
            }
            if (Number(movement.amount || 0) > entry.amount) {
                entry.amount = Number(movement.amount || 0);
            }
            if (isOutgoing(movement.sense)) {
                entry.fromName = getMovementName(movement, "from") || entry.fromName;
            } else if (isIncoming(movement.sense)) {
                entry.toName = getMovementName(movement, "to") || entry.toName;
            }
            groups.set(key, entry);
        }
        return Array.from(groups.values());
    })();

    const totalPages = Math.max(1, Math.ceil(displayTransfers.length / pageSize));
    const pagedTransfers = displayTransfers.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        fetchTransferHistory();
    }, []);

    useEffect(() => {
        if (!bulkAccounting) return;
        let dots = 0;
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            setBulkText(`Working${".".repeat(dots)}`);
        }, 500);
        return () => clearInterval(interval);
    }, [bulkAccounting]);

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

    async function fetchTransferHistory() {
        try {
            const response = await fetch("/api/cashier/movements?type=p2p_transfer");
            if (response.ok) {
                const data = await response.json();
                setTransfers(data);
            }
        } catch (error) {
            console.error("Failed to fetch transfer history:", error);
        } finally {
            setHistoryLoading(false);
        }
    }

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

    async function handleMarkAccounted(groupKey: string) {
        const group = displayTransfers.find((g) => g.key === groupKey);
        if (!group) return;
        setProcessing(prev => ({ ...prev, [groupKey]: true }));
        try {
            for (const movement of group.movements.filter((m) => !m.is_accounted)) {
                const payload = buildAccountingPayload(movement);
                const response = await fetch("/api/accounting/cash-movements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error("Failed to mark as accounted");
                }
            }
            await fetchTransferHistory();
            setPage(1);
        } catch (err) {
            console.error("Failed to mark as accounted", err);
        } finally {
            setProcessing(prev => ({ ...prev, [groupKey]: false }));
        }
    }

    async function handleBulkAccount() {
        const targets = transfers.filter((m) => !m.is_accounted);
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
            await fetchTransferHistory();
            setPage(1);
        } catch (err) {
            console.error("Bulk accounting failed:", err);
        } finally {
            setBulkAccounting(false);
            setBulkText("Working");
        }
    }

    async function searchCustomer(query: string, setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>) {
        if (!query) return;
        try {
            const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setCustomers(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleTransfer(e: React.FormEvent) {
        e.preventDefault();
        if (!sourceAccount || !destAccount || !amount) return;
        if (!hasDownloadedReceipt) {
            setError("Merci de télécharger le reçu avant de procéder.");
            return;
        }

        if (sourceAccount.id === destAccount.id) {
            setError("Source and destination accounts cannot be the same");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/accounts/transfer-p2p", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_account_id: sourceAccount.id,
                    dest_account_id: destAccount.id,
                    amount: Number(amount),
                    reference: clientRef || undefined
                }),
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Transfer failed");
            }

            setSuccess(`Transfer successful! ${Number(amount).toLocaleString()} XAF transferred.`);
            setAmount("");
            setSourceAccount(null);
            setDestAccount(null);
            setSourceCustomers([]);
            setDestCustomers([]);
            setSourceQuery("");
            setDestQuery("");
            setClientRef(null);
            setHasDownloadedReceipt(false);
            const sourceCustomer = sourceCustomers.find(c => c.accounts.some(a => a.id === sourceAccount.id));
            const destCustomer = destCustomers.find(c => c.accounts.some(a => a.id === destAccount.id));
            const sourceAccountingNumber =
                sourceAccount.accounting_account ??
                sourceAccount.account_number ??
                sourceAccount.accountingAccountNumber ??
                sourceAccount.accountNumber ??
                null;
            const sourceBankingNumber =
                sourceAccount.bank_account_number ??
                sourceAccount.banking_account_number ??
                sourceAccount.bank_account ??
                sourceAccount.banking_account ??
                sourceAccount.bankAccountNumber ??
                sourceAccount.bankingAccountNumber ??
                null;
            const destAccountingNumber =
                destAccount.accounting_account ??
                destAccount.account_number ??
                destAccount.accountingAccountNumber ??
                destAccount.accountNumber ??
                null;
            const destBankingNumber =
                destAccount.bank_account_number ??
                destAccount.banking_account_number ??
                destAccount.bank_account ??
                destAccount.banking_account ??
                destAccount.bankAccountNumber ??
                destAccount.bankingAccountNumber ??
                null;
            const receipt = {
                inMovementId: res.inMovementId,
                outMovementId: res.outMovementId,
                amount: Number(amount),
                sourceName: sourceCustomer?.person.user_first_name || "Client source",
                destName: destCustomer?.person.user_first_name || "Client destinataire",
                sourceAccountingAccountNumber: sourceAccountingNumber,
                sourceBankingAccountNumber: sourceBankingNumber,
                destAccountingAccountNumber: destAccountingNumber,
                destBankingAccountNumber: destBankingNumber,
                cashierName: cashierName || null,
                cashierUsername: cashierUsername || null,
                timestamp: new Date().toISOString(),
                reference: res.reference || clientRef || res.inMovementId
            };
            setReceiptData(receipt);
            generateReceipt(receipt);

            // Refresh history
            fetchTransferHistory();
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

    function generateReceipt(data: {
        inMovementId: string;
        outMovementId: string;
        amount: number;
        sourceName: string;
        destName: string;
        sourceAccountingAccountNumber?: string | null;
        sourceBankingAccountNumber?: string | null;
        destAccountingAccountNumber?: string | null;
        destBankingAccountNumber?: string | null;
        cashierName?: string | null;
        cashierUsername?: string | null;
        timestamp: string;
        reference?: string | null;
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
        doc.text("TRANSFER RECEIPT", pageWidth / 2, y, { align: "center" });
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
        doc.text(safeText(data.reference || data.inMovementId), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Date / Time", labelX, y);
        doc.text(safeText(now), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Cashier", labelX, y);
        doc.text(safeText(data.cashierName || data.cashierUsername), valueX, y, { align: "right" });
        y += 6;

        doc.setFontSize(9);
        ensureSpace();
        doc.text("SOURCE", labelX, y);
        y += 4;
        ensureSpace();
        doc.text("Customer", labelX, y);
        doc.text(safeText(data.sourceName), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Account (Accounting)", labelX, y);
        doc.text(safeText(data.sourceAccountingAccountNumber), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Account (Banking)", labelX, y);
        doc.text(safeText(data.sourceBankingAccountNumber), valueX, y, { align: "right" });
        y += 6;

        doc.setFontSize(9);
        ensureSpace();
        doc.text("DESTINATION", labelX, y);
        y += 4;
        ensureSpace();
        doc.text("Customer", labelX, y);
        doc.text(safeText(data.destName), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Account (Accounting)", labelX, y);
        doc.text(safeText(data.destAccountingAccountNumber), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Account (Banking)", labelX, y);
        doc.text(safeText(data.destBankingAccountNumber), valueX, y, { align: "right" });
        y += 6;

        ensureSpace();
        doc.text("Movement IN", labelX, y);
        doc.text(safeText(data.inMovementId), valueX, y, { align: "right" });
        y += 5;
        ensureSpace();
        doc.text("Movement OUT", labelX, y);
        doc.text(safeText(data.outMovementId), valueX, y, { align: "right" });
        y += 6;

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
        doc.text("Sender signature", pageWidth / 4, y, { align: "center" });
        doc.text("Receiver signature", (pageWidth * 3) / 4, y, { align: "center" });

        doc.save(`receipt-transfer-${data.reference || data.inMovementId}.pdf`);
        setHasDownloadedReceipt(true);
    }

    function ensureReference() {
        if (clientRef) return clientRef;
        const ref = `P2P-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
        setClientRef(ref);
        return ref;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">P2P Transfer</h1>
                <p className="text-muted-foreground">Transfer funds between customer accounts</p>
            </div>

            {/* Transfer Form */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">New Transfer</h2>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Source Customer */}
                    <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">FROM</span>
                            Source Account
                        </h3>

                        <form onSubmit={(e) => { e.preventDefault(); searchCustomer(sourceQuery, setSourceCustomers); }} className="mb-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={sourceQuery}
                                    onChange={(e) => setSourceQuery(e.target.value)}
                                    placeholder="Search source customer..."
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </div>
                        </form>

                        {sourceCustomers.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {sourceCustomers.map((customer) =>
                                    customer.accounts.map((account) => {
                                        const isSame = destAccount?.id === account.id;
                                        return (
                                        <div
                                            key={account.id}
                                            onClick={() => {
                                                if (isSame) return;
                                                setSourceAccount(account);
                                                setHasDownloadedReceipt(false);
                                            }}
                                            className={`rounded-lg border p-2 text-sm transition-colors ${
                                                sourceAccount?.id === account.id
                                                    ? "border-primary bg-primary/5"
                                                    : "hover:bg-muted/50"
                                            } ${isSame ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
                                        >
                                            <div className="font-medium truncate">{customer.person.user_first_name}</div>
                                            <div className="text-[10px] text-muted-foreground truncate">{customer.person.phone || customer.person.user_name}</div>
                                            <div className="mt-2 text-[10px] text-muted-foreground">
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
                                            <div className="font-semibold text-primary mt-1">{Number(account.total_funds).toLocaleString()} XAF</div>
                                        </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {sourceAccount && !sourceCustomers.length && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                                <div className="text-sm font-medium text-green-800">Selected</div>
                                <div className="text-xs text-green-600">{Number(sourceAccount.total_funds).toLocaleString()} XAF</div>
                            </div>
                        )}
                    </div>

                    {/* Destination Customer */}
                    <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">TO</span>
                            Destination Account
                        </h3>

                        <form onSubmit={(e) => { e.preventDefault(); searchCustomer(destQuery, setDestCustomers); }} className="mb-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={destQuery}
                                    onChange={(e) => setDestQuery(e.target.value)}
                                    placeholder="Search destination customer..."
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </div>
                        </form>

                        {destCustomers.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {destCustomers.map((customer) =>
                                    customer.accounts.map((account) => {
                                        const isSame = sourceAccount?.id === account.id;
                                        return (
                                        <div
                                            key={account.id}
                                            onClick={() => {
                                                if (isSame) return;
                                                setDestAccount(account);
                                                setHasDownloadedReceipt(false);
                                            }}
                                            className={`rounded-lg border p-2 text-sm transition-colors ${
                                                destAccount?.id === account.id
                                                    ? "border-primary bg-primary/5"
                                                    : "hover:bg-muted/50"
                                            } ${isSame ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
                                        >
                                            <div className="font-medium truncate">{customer.person.user_first_name}</div>
                                            <div className="text-[10px] text-muted-foreground truncate">{customer.person.phone || customer.person.user_name}</div>
                                            <div className="mt-2 text-[10px] text-muted-foreground">
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
                                            <div className="font-semibold text-primary mt-1">{Number(account.total_funds).toLocaleString()} XAF</div>
                                        </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {destAccount && !destCustomers.length && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                                <div className="text-sm font-medium text-green-800">Selected</div>
                                <div className="text-xs text-green-600">{Number(destAccount.total_funds).toLocaleString()} XAF</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transfer Amount */}
                {sourceAccount && destAccount && (
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Transfer Amount (XAF)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setHasDownloadedReceipt(false);
                                }}
                                min="1"
                                max={sourceAccount.total_funds}
                                step="1"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Enter amount..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Max: {Number(sourceAccount.total_funds).toLocaleString()} XAF
                            </p>
                        </div>

                       <div className="flex items-center gap-2">
                           <button
                               type="button"
                               onClick={() => {
                                   const ref = ensureReference();
                                   const sourceCustomer = sourceCustomers.find(c => c.accounts.some(a => a.id === sourceAccount?.id));
                                   const destCustomer = destCustomers.find(c => c.accounts.some(a => a.id === destAccount?.id));
                                   const sourceAccountingNumber =
                                       sourceAccount?.accounting_account ??
                                       sourceAccount?.account_number ??
                                       sourceAccount?.accountingAccountNumber ??
                                       sourceAccount?.accountNumber ??
                                       null;
                                   const sourceBankingNumber =
                                       sourceAccount?.bank_account_number ??
                                       sourceAccount?.banking_account_number ??
                                       sourceAccount?.bank_account ??
                                       sourceAccount?.banking_account ??
                                       sourceAccount?.bankAccountNumber ??
                                       sourceAccount?.bankingAccountNumber ??
                                       null;
                                   const destAccountingNumber =
                                       destAccount?.accounting_account ??
                                       destAccount?.account_number ??
                                       destAccount?.accountingAccountNumber ??
                                       destAccount?.accountNumber ??
                                       null;
                                   const destBankingNumber =
                                       destAccount?.bank_account_number ??
                                       destAccount?.banking_account_number ??
                                       destAccount?.bank_account ??
                                       destAccount?.banking_account ??
                                       destAccount?.bankAccountNumber ??
                                       destAccount?.bankingAccountNumber ??
                                       null;
                                   const draft = {
                                       inMovementId: ref,
                                       outMovementId: ref,
                                       amount: Number(amount || 0),
                                       sourceName: sourceCustomer?.person.user_first_name || "Client source",
                                       destName: destCustomer?.person.user_first_name || "Client destinataire",
                                       sourceAccountingAccountNumber: sourceAccountingNumber,
                                       sourceBankingAccountNumber: sourceBankingNumber,
                                       destAccountingAccountNumber: destAccountingNumber,
                                       destBankingAccountNumber: destBankingNumber,
                                       cashierName: cashierName || null,
                                       cashierUsername: cashierUsername || null,
                                       timestamp: new Date().toISOString(),
                                       reference: ref
                                   };
                                   setReceiptData(draft);
                                   generateReceipt(draft);
                                   setHasDownloadedReceipt(true);
                               }}
                                disabled={!amount}
                                className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                            >
                                Télécharger le reçu
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !hasDownloadedReceipt}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? "Processing..." : (
                                    <>
                                        Process Transfer <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Transfer History */}
            <div className="rounded-xl border bg-card">
                <div className="p-6 border-b flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">Transfer History</h2>
                        <p className="text-sm text-muted-foreground">Recent P2P transfers</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleBulkAccount}
                        disabled={bulkAccounting || transfers.every((m) => m.is_accounted)}
                        className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                        {bulkAccounting ? bulkText : "Count all"}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">From</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">To</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Is accounted</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedTransfers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No transfers yet
                                    </td>
                                </tr>
                            ) : (
                                pagedTransfers.map((transfer) => {
                                    const isAccounted = transfer.movements.every((m) => m.is_accounted);
                                    return (
                                    <tr key={transfer.key} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            {format(new Date(transfer.create_on), "dd/MM/yyyy HH:mm:ss")}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {transfer.fromName ||
                                                getMovementName(
                                                    transfer.movements.find((m) => isOutgoing(m.sense)),
                                                    "from"
                                                ) ||
                                                getMovementName(
                                                    transfer.movements.find((m) => isIncoming(m.sense)),
                                                    "from"
                                                ) ||
                                                "-"}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {transfer.toName ||
                                                getMovementName(
                                                    transfer.movements.find((m) => isIncoming(m.sense)),
                                                    "to"
                                                ) ||
                                                getMovementName(
                                                    transfer.movements.find((m) => isOutgoing(m.sense)),
                                                    "to"
                                                ) ||
                                                "-"}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <button
                                                type="button"
                                                onClick={() => handleMarkAccounted(transfer.key)}
                                                disabled={isAccounted || processing[transfer.key]}
                                                className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium border transition-colors ${
                                                    isAccounted
                                                        ? "border-muted bg-muted text-muted-foreground opacity-60 cursor-default"
                                                        : "border-primary text-primary hover:bg-primary/10"
                                                }`}
                                            >
                                                {isAccounted ? "OK" : (processing[transfer.key] ? "..." : "Count")}
                                            </button>
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium text-purple-600">
                                            {Number(transfer.amount).toLocaleString()} XAF
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
            {receiptData && (
                <div className="rounded-md border bg-card p-4 flex items-center justify-between">
                    <div className="text-sm">
                        Reçu prêt : {receiptData.reference || receiptData.inMovementId}
                    </div>
                    <button
                        onClick={downloadReceipt}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Télécharger le reçu (A5)
                    </button>
                </div>
            )}
        </div>
    );
}
