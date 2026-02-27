"use client";

import { useState } from "react";
import { TicketingInput } from "@/components/cashier/ticketing-input";

export function TransferForm() {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showTicketing, setShowTicketing] = useState(false);
    const [ticketingData, setTicketingData] = useState<{ total: number, denominations: Record<string, number> } | null>(null);

    async function handleRequest(e: React.FormEvent) {
        e.preventDefault();
        if (!amount) return;

        if (showTicketing && ticketingData && ticketingData.total !== Number(amount)) {
            setMessage({ type: 'error', text: `Ticketing total (${ticketingData.total}) does not match amount (${amount})` });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/movements/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(amount),
                    ticketing: showTicketing ? ticketingData : undefined
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Transfer failed");

            setMessage({ type: 'success', text: "Funds requested successfully!" });
            setAmount("");
            setShowTicketing(false);
            setTicketingData(null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleRequest} className="space-y-4 mt-4">
            {message && (
                <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">Amount Needed (XAF)</label>
                <input
                    id="amount"
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="e.g. 50000"
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
                {loading ? "Processing..." : "Request Funds"}
            </button>
        </form>
    );
}
