"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Cashier {
    id: string;
    user_name: string;
    user_first_name: string;
}

interface Denomination {
    id: string;
    label: string;
    value: number;
}

interface AssignCashierDialogProps {
    registerId: string;
    cashiers: Cashier[];
    isOpen: boolean;
    onClose: () => void;
}

export function AssignCashierDialog({ registerId, cashiers, isOpen, onClose }: AssignCashierDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fallbackDenoms: Denomination[] = [
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
    const [denominations, setDenominations] = useState<Denomination[]>(fallbackDenoms);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch denominations (we could also pass this as props, but fetching here is fine for now)
        // Actually, we don't have an API for denominations yet. 
        // Let's hardcode them or create an API. 
        // Better to create a quick server action or API. 
        // For speed, let's assume we pass them or fetch from a new endpoint.
        // Let's create a simple server action or just fetch from a new route.
        // Or, since we are in a client component, we can't directly access DB.
        // I'll add a route /api/config/denominations quickly.

        fetch("/api/config/denominations")
            .then(async (res) => {
                const text = await res.text();
                if (!text) return [];
                try {
                    return JSON.parse(text);
                } catch (err) {
                    console.error("Failed to parse denominations", err);
                    return [];
                }
            })
            .then((data) => {
                const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
                if (list.length > 0) {
                    setDenominations(list);
                } else {
                    setDenominations(fallbackDenoms);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch denominations", err);
                setDenominations(fallbackDenoms);
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

    if (!isOpen) return null;

    const handleQuantityChange = (id: string, qty: number) => {
        setQuantities(prev => ({ ...prev, [id]: qty }));
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setLocalError(null);

        const formData = new FormData(event.currentTarget);
        const cashierId = String(formData.get("cashier_id") || "");
        if (!cashierId) {
            setLocalError("Veuillez sélectionner un caissier.");
            return;
        }

        const hasLines = Object.values(quantities).some((q) => q > 0);
        if (!hasLines || total <= 0) {
            setLocalError("Le billetage est obligatoire et doit être supérieur à 0 XAF.");
            return;
        }

        const denominationsById: Record<string, number> = {};
        const denominationsByValue: Record<string, number> = {};
        for (const denom of denominations) {
            const qty = quantities[denom.id] || 0;
            if (qty > 0) {
                denominationsById[denom.id] = qty;
                if (denom.value != null) {
                    denominationsByValue[String(denom.value)] = qty;
                }
            }
        }

        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(`/api/cash-registers/${registerId}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    cashier_id: cashierId,
                    cashierId,
                    initial_funds: {
                        total,
                        denominations: denominationsById
                    },
                    initialFunds: {
                        total,
                        denominations: denominationsByValue
                    }
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                let message = "Failed to assign cashier";
                if (text) {
                    try {
                        const data = JSON.parse(text);
                        message = data?.error || message;
                    } catch {
                        message = text;
                    }
                }
                throw new Error(message);
            }

            router.refresh();
            onClose();
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
                setError("La requête a expiré. Réessayez.");
            } else {
                setError(e instanceof Error ? e.message : "Failed to assign cashier");
            }
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Assign Cashier & Initialize Funds</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {(error || localError) && <div className="mb-4 text-sm text-red-500">{error || localError}</div>}

                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="cashier_id" className="text-sm font-medium">Select Cashier</label>
                        <select
                            id="cashier_id"
                            name="cashier_id"
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">-- Select a cashier --</option>
                            {cashiers.map((cashier) => (
                                <option key={cashier.id} value={cashier.id}>
                                    {cashier.user_first_name} ({cashier.user_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Initial Funds (Billetage)</h4>
                            <span className="text-xs text-muted-foreground">Obligatoire</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
                            {denominations.map(denom => (
                                <div key={denom.id} className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-medium w-24">{denom.label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                        placeholder="0"
                                        onChange={(e) => handleQuantityChange(denom.id, parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-bold text-sm">Total Initial Funds:</span>
                            <span className="font-bold text-lg">{total.toLocaleString()} XAF</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {loading ? "Assigning..." : "Assign & Open"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
