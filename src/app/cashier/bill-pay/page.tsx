"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TicketingInput } from "@/components/cashier/ticketing-input";

const PAYMENT_METHODS = ["OM", "MOMO", "CASH", "CHEQUE"] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

export default function BillPayPage() {
    const [invoiceCode, setInvoiceCode] = useState("");
    const [amount, setAmount] = useState("");
    const [cashGiven, setCashGiven] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [creditMode, setCreditMode] = useState<"none" | "with_money" | "without_money">("none");
    const [showTicketing, setShowTicketing] = useState(false);
    const [ticketingData, setTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function handlePay(e: React.FormEvent) {
        e.preventDefault();
        if (!invoiceCode || !amount) return;

        const bill = Number(amount);
        const cash = Number(cashGiven);
        const isCredit = creditMode !== "none";
        const creditWithMoney = creditMode === "with_money";
        const effectiveCash = creditMode === "without_money" ? 0 : cash;

        // Validate ticketing if enabled
        if (creditMode === "none") {
            if (!cashGiven) {
                setError("Cash given is required for cash payments.");
                return;
            }
            if (cash < bill) {
                setError("Cash given is less than the bill amount.");
                return;
            }
            if (showTicketing && ticketingData && ticketingData.total !== bill) {
                setError(`Ticketing total (${ticketingData.total}) does not match amount (${amount})`);
                return;
            }
        } else if (creditWithMoney) {
            if (!cashGiven) {
                setError("Cash given is required for credit with money.");
                return;
            }
            if (showTicketing && ticketingData && ticketingData.total !== cash) {
                setError(`Ticketing total (${ticketingData.total}) does not match cash given (${cash})`);
                return;
            }
        } else if (creditMode === "without_money") {
            if (showTicketing) {
                setShowTicketing(false);
                setTicketingData(null);
            }
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/bills/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoice_code: invoiceCode,
                    amount: bill,
                    cash_given: effectiveCash,
                    ticketing: showTicketing ? ticketingData : undefined,
                    payment_method: paymentMethod,
                    ...(isCredit ? { is_credit: true, credit_with_money: creditWithMoney } : {})
                }),
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Payment failed");
            }

            setSuccess("Bill payment successful!");
            setAmount("");
            setInvoiceCode("");
            setCashGiven("");
            setPaymentMethod("CASH");
            setCreditMode("none");
            setShowTicketing(false);
            setTicketingData(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/20 p-4">
            <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded-xl shadow border">
                <div className="mb-6 flex items-center gap-2">
                    <Link href="/cashier" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold">Bill Payment</h1>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">{success}</div>}

                <form onSubmit={handlePay} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Invoice Code</label>
                        <input
                            type="text"
                            required
                            value={invoiceCode}
                            onChange={(e) => setInvoiceCode(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="e.g. INV-2024-001"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount (XAF)</label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="e.g. 5000"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cash Given (XAF)</label>
                        <input
                            type="number"
                            min="0"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            disabled={creditMode === "without_money"}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                            placeholder="Amount received..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {PAYMENT_METHODS.map((method) => (
                                <option key={method} value={method}>
                                    {method}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Credit</label>
                        <select
                            value={creditMode}
                            onChange={(e) => setCreditMode(e.target.value as "none" | "with_money" | "without_money")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="none">No credit</option>
                            <option value="with_money">Credit with money</option>
                            <option value="without_money">Credit without money</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="ticketing"
                            checked={showTicketing}
                            onChange={(e) => setShowTicketing(e.target.checked)}
                            disabled={creditMode === "without_money"}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-60"
                        />
                        <label htmlFor="ticketing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Include Billetage (Ticketing)
                        </label>
                    </div>

                    {showTicketing && (
                        <TicketingInput
                            initialTotal={Number(amount)}
                            onTotalChange={(total, denominations) => setTicketingData({ total, denominations })}
                        />
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        {loading ? "Processing..." : "Pay Bill"}
                    </button>
                </form>
            </div>
        </div>
    );
}
