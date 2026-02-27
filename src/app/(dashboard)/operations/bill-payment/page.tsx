"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { TicketingInput } from "@/components/cashier/ticketing-input";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { useRouter, useSearchParams } from "next/navigation";

type PaymentMode = "cash" | "account";
const PAYMENT_METHODS = ["OM", "MOMO", "CASH", "CHEQUE"] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

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

interface Customer {
    id: string;
    person: {
        user_first_name: string;
        user_name: string;
        phone: string | null;
    };
    accounts: {
        id: string;
        account_number?: string | null;
        total_funds: number;
        is_active: boolean;
    }[];
}

interface AccountSelection {
    id: string;
    account_number?: string | null;
    total_funds: number;
    is_active: boolean;
    customer?: {
        person: {
            user_first_name: string;
            user_name: string;
            phone: string | null;
        };
    };
}

interface BillDetails {
    id: string;
    invoice_code: string;
    amount: number;
    customer_name: string;
    due_date: string | null;
    payment_mode: "cash" | "account";
    items: Array<{ description: string; quantity: number; amount: number }>;
    account?: {
        id: string;
        account_number: string | null;
        total_funds: number;
        is_active: boolean;
        customer_name: string;
        customer_phone: string | null;
    };
}

export default function BillPaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const billId = searchParams.get("bill_id");
    // Payment Form
    const [invoiceCode, setInvoiceCode] = useState("");
    const [billAmount, setBillAmount] = useState("");
    const [cashGiven, setCashGiven] = useState("");
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [creditMode, setCreditMode] = useState<"none" | "with_money" | "without_money">("none");

    // Account mode search
    const [query, setQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<AccountSelection | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [invoiceItems, setInvoiceItems] = useState<Array<{ description: string; quantity: number; amount: number }>>([]);
    const [invoiceCustomer, setInvoiceCustomer] = useState<string | null>(null);
    const [invoiceDueDate, setInvoiceDueDate] = useState<string | null>(null);
    const [billLoading, setBillLoading] = useState(false);
    const [billError, setBillError] = useState<string | null>(null);
    const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
    const [showTicketing, setShowTicketing] = useState(false);
    const [ticketingData, setTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);
    const [showChangeTicketing, setShowChangeTicketing] = useState(false);
    const [changeTicketingData, setChangeTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // History moved to bills list page

    useEffect(() => {
        if (!billId) {
            setBillDetails(null);
            return;
        }

        let cancelled = false;
        async function loadBillDetails() {
            setBillLoading(true);
            setBillError(null);
            try {
                const response = await fetch(`/api/cashier/bills/${encodeURIComponent(billId)}`);
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load bill details");
                }
                const data: BillDetails = await response.json();
                if (cancelled) return;

                setBillDetails(data);
                setInvoiceCode(data.invoice_code || "");
                setBillAmount(String(data.amount || ""));
                setInvoiceCustomer(data.customer_name || null);
                setInvoiceDueDate(data.due_date || null);
                setInvoiceItems(Array.isArray(data.items) ? data.items : []);
                setCustomers([]);
                setQuery("");

                if (data.payment_mode === "account") {
                    const accountId =
                        data.account?.id ??
                        (data.account as any)?.account_id ??
                        (data.account as any)?.accountId ??
                        null;
                    if (data.account && accountId) {
                        setPaymentMode("account");
                        setSelectedAccount({
                            id: accountId,
                            account_number: data.account.account_number || null,
                            total_funds: data.account.total_funds,
                            is_active: data.account.is_active,
                            customer: {
                                person: {
                                    user_first_name: data.account.customer_name,
                                    user_name: data.account.account_number || data.account.customer_name,
                                    phone: data.account.customer_phone || null
                                }
                            }
                        });
                        setCashGiven("");
                    } else {
                        setPaymentMode("account");
                        setSelectedAccount(null);
                    }
                } else {
                    setPaymentMode("cash");
                    setSelectedAccount(null);
                    setCashGiven(String(data.amount || ""));
                }
            } catch (err) {
                if (!cancelled) {
                    setBillError(err instanceof Error ? err.message : "Failed to load bill details");
                }
            } finally {
                if (!cancelled) {
                    setBillLoading(false);
                }
            }
        }

        loadBillDetails();
        return () => {
            cancelled = true;
        };
    }, [billId]);

    useEffect(() => {
        if (paymentMode === "account" && creditMode !== "none") {
            setCreditMode("none");
        }
    }, [paymentMode, creditMode]);

    useEffect(() => {
        if (creditMode === "without_money") {
            setCashGiven("");
            setShowTicketing(false);
            setTicketingData(null);
            setShowChangeTicketing(false);
            setChangeTicketingData(null);
        }
    }, [creditMode]);

    // payment history now handled in bills list page

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (accountLocked) return;
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

    async function handlePayment(e: React.FormEvent) {
        e.preventDefault();
        if (!invoiceCode || !billAmount) return;

        const bill = Number(billAmount);
        const cash = Number(cashGiven);
        const isCredit = creditMode !== "none";
        const creditWithMoney = creditMode === "with_money";
        const effectiveCash = paymentMode === "cash" && creditMode === "without_money" ? 0 : cash;
        const change = Math.max(0, effectiveCash - bill);

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            let payload: any = { invoice_code: invoiceCode, amount: bill };

            if (paymentMode === "cash") {
                if (creditMode === "none") {
                    if (!cashGiven) {
                        setError("Cash given is required for cash payments.");
                        setLoading(false);
                        return;
                    }

                    if (cash < bill) {
                        setError("Cash given is less than the bill amount.");
                        setLoading(false);
                        return;
                    }

                    if (showTicketing && ticketingData && ticketingData.total !== bill) {
                        setError(`Ticketing total (${ticketingData.total}) does not match bill amount (${bill})`);
                        setLoading(false);
                        return;
                    }
                } else if (creditWithMoney) {
                    if (!cashGiven) {
                        setError("Cash given is required for credit with money.");
                        setLoading(false);
                        return;
                    }
                    if (showTicketing && ticketingData && ticketingData.total !== cash) {
                        setError(`Ticketing total (${ticketingData.total}) does not match cash given (${cash})`);
                        setLoading(false);
                        return;
                    }
                }

                if (change > 0 && showChangeTicketing && changeTicketingData && changeTicketingData.total !== change) {
                    setError(`Change ticketing total (${changeTicketingData.total}) does not match change (${change})`);
                    setLoading(false);
                    return;
                }

                payload = {
                    ...payload,
                    payment_mode: "cash",
                    cash_given: effectiveCash,
                    ticketing: showTicketing ? ticketingData : undefined,
                    change_ticketing: change > 0 && showChangeTicketing ? changeTicketingData : undefined,
                    payment_method: paymentMethod,
                    ...(creditMode === "none"
                        ? {}
                        : { is_credit: true, credit_with_money: creditWithMoney })
                };
            } else {
                const accountId =
                    selectedAccount?.id ??
                    (selectedAccount as any)?.account_id ??
                    (selectedAccount as any)?.accountId ??
                    null;
                if (!accountId) {
                    setError("Select a customer account to debit.");
                    setLoading(false);
                    return;
                }
                payload = {
                    ...payload,
                    payment_mode: "account",
                    account_id: accountId
                };
            }

            const response = await fetch("/api/bills/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const raw = await response.text();
            const res = raw ? JSON.parse(raw) : {};

            if (!response.ok) {
                throw new Error(res.error || "Payment failed");
            }

            const creditLabel =
                creditMode === "none"
                    ? ""
                    : creditWithMoney
                        ? " (credit with money)"
                        : " (credit without money)";
            setSuccess(
                paymentMode === "cash"
                    ? `Bill payment successful${creditLabel}! Invoice: ${invoiceCode}${change > 0 ? ` | Change: ${change.toLocaleString()} XAF` : ""}`
                    : `Bill paid from account. Invoice: ${invoiceCode}`
            );
            generateReceipt({
                reference: res.reference || res.movement_id,
                change,
                mode: paymentMode,
                invoice: invoiceCode
            });
            if (billDetails) {
                router.push("/cashier/bills");
                return;
            }
            setBillAmount("");
            setCashGiven("");
            setInvoiceCode("");
            setShowTicketing(false);
            setTicketingData(null);
            setShowChangeTicketing(false);
            setChangeTicketingData(null);
            setSelectedAccount(null);
            setCustomers([]);
            setQuery("");
            setInvoiceItems([]);
            setInvoiceCustomer(null);
            setInvoiceDueDate(null);

            // History handled in bills list page
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    const bill = Number(billAmount) || 0;
    const cash = Number(cashGiven) || 0;
    const effectiveCash = paymentMode === "cash" && creditMode === "without_money" ? 0 : cash;
    const change = Math.max(0, effectiveCash - bill);
    const isBillLocked = Boolean(billDetails);
    const accountLocked = billDetails?.payment_mode === "account" &&
        Boolean((billDetails.account as any)?.id ?? (billDetails.account as any)?.account_id ?? (billDetails.account as any)?.accountId);

    // accounting now handled in bills list page

    function generateReceipt(options: { reference?: string; change: number; mode: PaymentMode; invoice: string }) {
        const doc = new jsPDF();
        const now = format(new Date(), "dd/MM/yyyy HH:mm");
        doc.setFontSize(16);
        doc.text("Reçu Paiement Facture", 14, 18);
        doc.setFontSize(10);
        doc.text(`Facture: ${options.invoice || invoiceCode || "-"}`, 14, 26);
        doc.text(`Date: ${now}`, 14, 32);
        doc.text(`Client: ${invoiceCustomer || "Client"}`, 14, 38);
        doc.text(`Mode: ${options.mode === "cash" ? "Espèces" : "Compte client"}`, 14, 44);
        if (options.reference) doc.text(`Réf: ${options.reference}`, 14, 50);

        let y = 60;
        doc.setFontSize(12);
        doc.text("Détails", 14, y);
        y += 6;
        doc.setFontSize(10);
        const items = invoiceItems.length > 0 ? invoiceItems : [{ description: "Facture", quantity: 1, amount: bill }];
        items.forEach((item) => {
            doc.text(`${item.description} x${item.quantity}`, 14, y);
            doc.text(`${item.amount.toLocaleString()} XAF`, 170, y, { align: "right" });
            y += 6;
        });
        y += 2;
        doc.text("Total", 14, y);
        doc.text(`${bill.toLocaleString()} XAF`, 170, y, { align: "right" });
        if (options.mode === "cash" && options.change > 0) {
            y += 6;
            doc.text("Rendu", 14, y);
            doc.text(`${options.change.toLocaleString()} XAF`, 170, y, { align: "right" });
        }

        doc.save(`receipt-${invoiceCode || "facture"}-${Date.now()}.pdf`);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bill Payment</h1>
                <p className="text-muted-foreground">Process customer bill payments</p>
            </div>

            {/* Payment Form */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">New Bill Payment</h2>

                {billError && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {billError}
                    </div>
                )}

                {billLoading && (
                    <div className="mb-4 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        Loading bill details...
                    </div>
                )}

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

                <form onSubmit={handlePayment} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentMode("cash")}
                            disabled={isBillLocked}
                            className={`px-3 py-2 rounded-md text-sm font-medium border ${paymentMode === "cash" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"} disabled:opacity-60`}
                        >
                            Cash
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMode("account")}
                            disabled={isBillLocked}
                            className={`px-3 py-2 rounded-md text-sm font-medium border ${paymentMode === "account" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"} disabled:opacity-60`}
                        >
                            Account
                        </button>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">Invoice/Bill Code</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={invoiceCode}
                                onChange={(e) => setInvoiceCode(e.target.value)}
                                required
                                readOnly={isBillLocked}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm disabled:opacity-60"
                                placeholder="Enter invoice or bill code..."
                            />
                        </div>
                        {invoiceDueDate && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                Due date: {format(new Date(invoiceDueDate), "dd/MM/yyyy")}
                            </div>
                        )}
                        {invoiceCustomer && (
                            <div className="mt-3 rounded-md border p-3 bg-muted/30">
                                <div className="text-sm font-semibold">{invoiceCustomer}</div>
                                {invoiceItems.length > 0 && (
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {invoiceItems.map((item, idx) => (
                                            <li key={idx} className="flex justify-between">
                                                <span>{item.description} x{item.quantity}</span>
                                                <span className="font-medium">{item.amount.toLocaleString()} XAF</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="mt-2 text-sm font-semibold">
                                    Total: {bill.toLocaleString()} XAF
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Bill Amount (XAF)</label>
                            <input
                                type="number"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                min="1"
                                step="1"
                                required
                                readOnly={isBillLocked}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                                placeholder="Enter bill amount..."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Cash Given (XAF)</label>
                            <input
                                type="number"
                                value={cashGiven}
                                onChange={(e) => setCashGiven(e.target.value)}
                                min="0"
                                step="1"
                                required={paymentMode === "cash" && creditMode !== "without_money"}
                                disabled={paymentMode === "account" || creditMode === "without_money"}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Amount received from customer..."
                            />
                            <p className={`text-xs mt-1 ${change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                Change to return: {change < 0 ? "N/A" : `${change.toLocaleString()} XAF`}
                            </p>
                        </div>
                    </div>

                    {paymentMode === "cash" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    disabled={isBillLocked}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                                >
                                    {PAYMENT_METHODS.map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Credit</label>
                                <select
                                    value={creditMode}
                                    onChange={(e) => setCreditMode(e.target.value as "none" | "with_money" | "without_money")}
                                    disabled={isBillLocked}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                                >
                                    <option value="none">No credit</option>
                                    <option value="with_money">Credit with money</option>
                                    <option value="without_money">Credit without money</option>
                                </select>
                                {creditMode !== "none" && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Credit payments allow partial or zero cash collection.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {paymentMode === "account" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted/40 rounded border text-sm">
                                The bill will be paid by debiting the customer's account. No cash handling or ticketing.
                            </div>

                            {selectedAccount && (
                                <div className="rounded-md border p-3 text-sm">
                                    <div className="font-medium">Selected account</div>
                                    <div className="text-muted-foreground">
                                        {selectedAccount.customer?.person.user_first_name || "Customer"}{" "}
                                        {selectedAccount.customer?.person.phone ? `(${selectedAccount.customer.person.phone})` : ""}
                                    </div>
                                    {selectedAccount.account_number && (
                                        <div className="text-muted-foreground">Account: {selectedAccount.account_number}</div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search Customer</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Name or phone number..."
                                        disabled={accountLocked}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        disabled={searchLoading || accountLocked}
                                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                        {searchLoading ? "Searching..." : "Search"}
                                    </button>
                                </div>
                            </div>

                            {customers.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Account</label>
                                    {customers.map((customer) =>
                                        customer.accounts.map((account) => (
                                            <div
                                                key={account.id}
                                                onClick={() =>
                                                    setSelectedAccount({
                                                        ...account,
                                                        customer: { person: customer.person }
                                                    })
                                                }
                                                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                                                    selectedAccount?.id === account.id
                                                        ? "border-primary bg-primary/5"
                                                        : "hover:bg-muted/50"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">{customer.person.user_first_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {customer.person.phone || customer.person.user_name}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold">{Number(account.total_funds).toLocaleString()} XAF</div>
                                                        <div className={`text-xs ${account.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                            {account.is_active ? 'Active' : 'Inactive'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {paymentMode === "cash" && (
                        <>
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

                            {showTicketing && (
                                <TicketingInput
                                    onTotalChange={(total, denominations) => setTicketingData({ total, denominations })}
                                    initialTotal={bill}
                                />
                            )}

                            {change > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="change_ticketing"
                                            checked={showChangeTicketing}
                                            onChange={(e) => setShowChangeTicketing(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <label htmlFor="change_ticketing" className="text-sm font-medium">
                                            Add cash denomination details for change (Billetage rendu)
                                        </label>
                                    </div>
                                    {showChangeTicketing && (
                                        <TicketingInput
                                            onTotalChange={(total, denominations) => setChangeTicketingData({ total, denominations })}
                                            initialTotal={change}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Process Payment"}
                    </button>
                </form>
            </div>

            {/* Payment History moved to bills list page */}
        </div>
    );
}
