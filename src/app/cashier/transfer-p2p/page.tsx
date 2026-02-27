"use client";

import { useState } from "react";
import { ArrowLeft, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TicketingInput } from "@/components/cashier/ticketing-input";

export default function P2PTransferPage() {
    // Source State
    const [sourceQuery, setSourceQuery] = useState("");
    const [sourceCustomers, setSourceCustomers] = useState<any[]>([]);
    const [sourceAccount, setSourceAccount] = useState<any | null>(null);

    // Dest State
    const [destQuery, setDestQuery] = useState("");
    const [destCustomers, setDestCustomers] = useState<any[]>([]);
    const [destAccount, setDestAccount] = useState<any | null>(null);

    const [amount, setAmount] = useState("");
    const [showTicketing, setShowTicketing] = useState(false);
    const [ticketingData, setTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function searchCustomer(query: string, setCustomers: any) {
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

        if (sourceAccount.id === destAccount.id) {
            setError("Source and destination accounts cannot be the same");
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
            const response = await fetch("/api/accounts/transfer-p2p", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_account_id: sourceAccount.id,
                    dest_account_id: destAccount.id,
                    amount: Number(amount),
                    ticketing: showTicketing ? ticketingData : undefined
                }),
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Transfer failed");
            }

            setSuccess("Transfer successful!");
            setAmount("");
            setSourceAccount(null);
            setDestAccount(null);
            setSourceCustomers([]);
            setDestCustomers([]);
            setSourceQuery("");
            setDestQuery("");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/20 p-4">
            <div className="max-w-4xl mx-auto mt-10 p-6 bg-card rounded-xl shadow border">
                <div className="mb-6 flex items-center gap-2">
                    <Link href="/cashier" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold">P2P Transfer (Customer to Customer)</h1>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">{success}</div>}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Source Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2">1. Source (Sender)</h3>
                        {!sourceAccount ? (
                            <>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={sourceQuery}
                                        onChange={(e) => setSourceQuery(e.target.value)}
                                        placeholder="Search sender..."
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                    <button
                                        onClick={() => searchCustomer(sourceQuery, setSourceCustomers)}
                                        className="bg-secondary text-secondary-foreground px-3 rounded-md"
                                    >
                                        <Search className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                    {sourceCustomers.map(c =>
                                        c.accounts.map((acc: any) => {
                                            const isSame = destAccount?.id === acc.id;
                                            return (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                disabled={isSame}
                                                onClick={() => setSourceAccount({ ...acc, name: c.person.user_first_name })}
                                                className="text-left text-xs p-2 border rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div className="font-medium truncate">{c.person.user_first_name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {c.person.phone || c.person.user_name}
                                                </div>
                                                <div className="mt-2 text-[10px] text-muted-foreground">
                                                    <div>
                                                        Accounting:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {acc.accounting_account || acc.account_number || acc.id.slice(0, 4)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Banking:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {acc.bank_account_number || acc.banking_account_number || "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="font-semibold text-primary mt-1">{acc.total_funds} XAF</div>
                                            </button>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-orange-800">{sourceAccount.name}</div>
                                        <div className="text-xs text-orange-600">Balance: {sourceAccount.total_funds} XAF</div>
                                    </div>
                                    <button onClick={() => setSourceAccount(null)} className="text-xs text-red-500">Change</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Destination Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2">2. Destination (Receiver)</h3>
                        {!destAccount ? (
                            <>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={destQuery}
                                        onChange={(e) => setDestQuery(e.target.value)}
                                        placeholder="Search receiver..."
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                    <button
                                        onClick={() => searchCustomer(destQuery, setDestCustomers)}
                                        className="bg-secondary text-secondary-foreground px-3 rounded-md"
                                    >
                                        <Search className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                    {destCustomers.map(c =>
                                        c.accounts.map((acc: any) => {
                                            const isSame = sourceAccount?.id === acc.id;
                                            return (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                disabled={isSame}
                                                onClick={() => setDestAccount({ ...acc, name: c.person.user_first_name })}
                                                className="text-left text-xs p-2 border rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div className="font-medium truncate">{c.person.user_first_name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {c.person.phone || c.person.user_name}
                                                </div>
                                                <div className="mt-2 text-[10px] text-muted-foreground">
                                                    <div>
                                                        Accounting:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {acc.accounting_account || acc.account_number || acc.id.slice(0, 4)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Banking:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {acc.bank_account_number || acc.banking_account_number || "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="font-semibold text-primary mt-1">{acc.total_funds} XAF</div>
                                            </button>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-green-800">{destAccount.name}</div>
                                        <div className="text-xs text-green-600">Account #{destAccount.id.slice(0, 8)}</div>
                                    </div>
                                    <button onClick={() => setDestAccount(null)} className="text-xs text-red-500">Change</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transfer Action */}
                {sourceAccount && destAccount && (
                    <div className="mt-8 border-t pt-6">
                        <form onSubmit={handleTransfer} className="max-w-md mx-auto space-y-4">
                            <div className="flex items-center justify-center gap-4 text-muted-foreground mb-4">
                                <div className="text-sm">{sourceAccount.name}</div>
                                <ArrowRight className="h-4 w-4" />
                                <div className="text-sm">{destAccount.name}</div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount to Transfer (XAF)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={sourceAccount.total_funds}
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                {loading ? "Processing..." : "Confirm Transfer"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
