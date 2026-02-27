"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Denomination {
    id: string;
    label: string;
    value: number;
}

export default function CloseSessionPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [denominations, setDenominations] = useState<Denomination[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetch("/api/config/denominations")
            .then(async (res) => {
                const json = await res.json();
                if (!res.ok || !Array.isArray(json)) {
                    throw new Error(json?.error || "Failed to load denominations");
                }
                setDenominations(json);
            })
            .catch((err) => {
                console.error("Failed to fetch denominations", err);
                setDenominations([]);
                setError("Unable to load denominations. Please try again.");
            });
    }, []);

    useEffect(() => {
        let t = 0;
        for (const d of denominations) {
            const qty = quantities[d.id] || 0;
            t += qty * Number(d.value);
        }
        setTotal(t);
    }, [quantities, denominations]);

    const handleQuantityChange = (id: string, qty: number) => {
        setQuantities(prev => ({ ...prev, [id]: qty }));
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        // We need the closer ID. Assuming Admin is logged in.
        // We'll fetch it from session/cookie in the API, but the API expects 'close_by'.
        // Let's update the API to use the cookie too, or pass a placeholder if we are lazy.
        // But since we did it properly for Transfer, let's assume we pass a placeholder "admin-id" 
        // or the API handles it.
        // Actually, the API I just wrote expects `close_by`.
        // I should update the API to get it from cookie.
        // For now, I'll send a placeholder and fix the API in the next step.

        try {
            const response = await fetch(`/api/sessions/${sessionId}/close`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    physical_total: total
                }),
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to close session");
            }

            router.push("/admin/sessions");
            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6 flex items-center gap-2">
                <Link href="/admin/sessions" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold">Close Session & Reconcile</h1>
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            <form onSubmit={onSubmit} className="space-y-6 bg-card p-6 rounded-xl border shadow">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Physical Count (Billetage)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {Array.isArray(denominations) && denominations.length > 0 ? (
                            denominations.map((denom) => (
                                <div key={denom.id} className="flex items-center justify-between gap-2">
                                    <label className="text-sm font-medium w-24">{denom.label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                        placeholder="0"
                                        onChange={(e) =>
                                            handleQuantityChange(denom.id, parseInt(e.target.value) || 0)
                                        }
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground col-span-2">
                                No denominations available.
                            </p>
                        )}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t mt-4">
                        <span className="font-bold text-lg">Total Physical Funds:</span>
                        <span className="font-bold text-2xl text-primary">{total.toLocaleString()} XAF</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 px-4 py-2"
                >
                    {loading ? "Closing Session..." : "Close Session & Generate Report"}
                </button>
            </form>
        </div>
    );
}
