"use client";

import { useState, useEffect, useRef } from "react";

interface Denomination {
    id: string;
    label: string;
    value: number;
}

interface TicketingInputProps {
    onTotalChange: (total: number, denominations: Record<string, number>) => void;
    initialTotal?: number;
}

export function TicketingInput({ onTotalChange, initialTotal = 0 }: TicketingInputProps) {
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
        { id: "fallback-1", label: "1 XAF", value: 1 },
    ];

    const [denominations, setDenominations] = useState<Denomination[]>(fallbackDenoms);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const onTotalChangeRef = useRef(onTotalChange);

    // Keep the latest callback without retriggering calculations endlessly
    useEffect(() => {
        onTotalChangeRef.current = onTotalChange;
    }, [onTotalChange]);

    useEffect(() => {
        fetch('/api/config/denominations')
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
                if (Array.isArray(data) && data.length > 0) {
                    setDenominations(data);
                } else {
                    setDenominations(fallbackDenoms);
                }
            })
            .catch(err => {
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
        onTotalChangeRef.current(t, quantities);
    }, [quantities, denominations]);

    const handleQuantityChange = (id: string, qty: number) => {
        setQuantities(prev => ({ ...prev, [id]: qty }));
    };

    return (
        <div className="space-y-4 border p-4 rounded-md bg-muted/10">
            <h3 className="font-semibold text-sm">Billetage (Optional)</h3>
            {denominations.length === 0 ? (
                <div className="text-sm text-muted-foreground">No denominations configured.</div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {denominations.map(denom => (
                        <div key={denom.id} className="flex items-center justify-between gap-2">
                            <label className="text-xs font-medium w-20">{denom.label}</label>
                            <input
                                type="number"
                                min="0"
                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                placeholder="0"
                                onChange={(e) => handleQuantityChange(denom.id, parseInt(e.target.value) || 0)}
                            />
                        </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-bold text-sm">Total Billetage:</span>
                <span className={`font-bold text-sm ${initialTotal > 0 && total !== initialTotal ? 'text-red-500' : 'text-green-600'}`}>
                    {total.toLocaleString()} XAF
                </span>
            </div>
            {initialTotal > 0 && total !== initialTotal && (
                <p className="text-xs text-red-500">Total does not match transaction amount ({initialTotal.toLocaleString()} XAF)</p>
            )}
        </div>
    );
}
