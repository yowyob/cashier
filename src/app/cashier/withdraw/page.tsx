"use client";

import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { TicketingInput } from "@/components/cashier/ticketing-input";

export default function WithdrawPage() {
    const [query, setQuery] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [amount, setAmount] = useState("");
    const [showTicketing, setShowTicketing] = useState(false);
    const [ticketingData, setTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
                    ticketing: showTicketing ? ticketingData : undefined
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
            setSelectedAccount(null);
            setCustomers([]);
            setQuery("");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/20 p-4">
            <div className="max-w-2xl mx-auto mt-10 p-6 bg-card rounded-xl shadow border">
                <div className="mb-6 flex items-center gap-2">
                    <Link href="/cashier" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold">Customer Withdrawal</h1>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">{success}</div>}

                {/* Search Section */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search customer by name or phone..."
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <button
                        type="submit"
                        disabled={searchLoading}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </form>

                {/* Results Section */}
                {customers.length > 0 && !selectedAccount && (
                    <div className="space-y-2 mb-6">
                        <h3 className="text-sm font-medium text-muted-foreground">Select an Account:</h3>
                        {customers.map(customer => (
                            <div key={customer.id} className="border rounded-lg p-3">
                                <div className="font-medium">{customer.person.user_first_name} {customer.person.user_name}</div>
                                <div className="text-xs text-muted-foreground mb-2">{customer.person.phone}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                                    {customer.accounts.map((acc: any) => (
                                        <button
                                            key={acc.id}
                                            onClick={() => setSelectedAccount({ ...acc, customerName: customer.person.user_first_name })}
                                            className="text-left text-sm p-2 bg-muted rounded hover:bg-muted/80 flex justify-between items-center"
                                        >
                                            <span>
                                                <span className="font-medium">
                                                    {acc.accounting_account || acc.account_number || acc.id.slice(0, 8)}
                                                </span>
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    Bank: {acc.bank_account_number || acc.banking_account_number || "-"}
                                                </span>
                                            </span>
                                            <span className="font-mono">{acc.total_funds.toLocaleString()} XAF</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Withdrawal Form */}
                {selectedAccount && (
                    <form onSubmit={handleWithdraw} className="space-y-4 border-t pt-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-medium">Withdraw from {selectedAccount.customerName}</h3>
                                <p className="text-xs text-muted-foreground">Account: {selectedAccount.id}</p>
                                <p className="text-sm font-bold text-primary">Balance: {selectedAccount.total_funds.toLocaleString()} XAF</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAccount(null)}
                                className="text-xs text-red-500 hover:underline"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="amount" className="text-sm font-medium">Amount (XAF)</label>
                            <input
                                id="amount"
                                type="number"
                                min="1"
                                max={selectedAccount.total_funds}
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="e.g. 5000"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="ticketing"
                                checked={showTicketing}
                                onChange={(e) => setShowTicketing(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2"
                        >
                            {loading ? "Processing..." : "Confirm Withdrawal"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
