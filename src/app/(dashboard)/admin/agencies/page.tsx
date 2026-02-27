"use client";

import { useEffect, useState } from "react";
import { AgencyList } from "@/components/admin/agency-list";

interface Agency {
    id: string;
    name: string;
    country: string;
    town: string;
    neighborhood?: string | null;
    address?: string | null;
    location_hint?: string | null;
    cashRegisters?: { sessions: { state: string; is_locked: boolean }[] }[];
}

export default function AgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchAgencies() {
        setLoading(true);
        try {
            const res = await fetch("/api/agencies");
            if (res.ok) {
                const data = await res.json();
                setAgencies(data);
            }
        } catch (e) {
            console.error("Failed to load agencies", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAgencies();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Agences</h1>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Agency List</h2>
                {loading ? (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading...</div>
                ) : (
                    <AgencyList agencies={agencies} readOnly />
                )}
            </div>
        </div>
    );
}
