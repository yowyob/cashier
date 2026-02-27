"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, townsFor, neighborhoodsFor } from "@/lib/locations";

export function CreateAgencyForm({
    onCreated,
}: {
    onCreated?: (agency: {
        id: string;
        name: string;
        country: string;
        town: string;
        neighborhood?: string | null;
        address?: string | null;
        location_hint?: string | null;
    }) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState("Cameroon");
    const [selectedTown, setSelectedTown] = useState("");
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
    const [organizations, setOrganizations] = useState<{ id: string; name: string; country?: string | null }[]>([]);
    const [organizationQuery, setOrganizationQuery] = useState("");
    const [selectedOrganization, setSelectedOrganization] = useState("");
    const [roleType, setRoleType] = useState<string | null>(null);
    const [sessionOrganizationId, setSessionOrganizationId] = useState<string | null>(null);
    const [sessionOrganizationName, setSessionOrganizationName] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);

    const isSuperAdmin = roleType === "superadmin";
    const isOrgAdmin = roleType === "organization_admin";

    useEffect(() => {
        async function loadSession() {
            try {
                const res = await fetch("/api/auth/session");
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load session");
                }
                const data = await res.json();
                setRoleType(data?.user?.roleType || null);
                setSessionOrganizationId(data?.organization?.id || data?.user?.organizationId || null);
                setSessionOrganizationName(data?.organization?.name || null);
            } catch (err) {
                console.error("Failed to load session", err);
                setSessionError(err instanceof Error ? err.message : "Failed to load session");
            }
        }
        loadSession();
    }, []);

    useEffect(() => {
        if (!isSuperAdmin) return;
        async function loadOrganizations() {
            try {
                const res = await fetch("/api/organizations");
                if (!res.ok) return;
                const data = await res.json();
                if (Array.isArray(data)) {
                    setOrganizations(data);
                }
            } catch (err) {
                console.error("Failed to load organizations", err);
            }
        }
        loadOrganizations();
    }, [isSuperAdmin]);

    const formatOrganizationLabel = (org: { id: string; name: string; country?: string | null }) => {
        return `${org.name}${org.country ? ` (${org.country})` : ""}`;
    };

    const handleOrganizationInput = (value: string) => {
        setOrganizationQuery(value);
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            setSelectedOrganization("");
            return;
        }
        const match = organizations.find(
            (org) => formatOrganizationLabel(org).toLowerCase() === normalized || org.name.toLowerCase() === normalized
        );
        setSelectedOrganization(match ? match.id : "");
    };

    const availableTowns = townsFor(selectedCountry);
    const availableNeighborhoods = neighborhoodsFor(selectedCountry, selectedTown);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        if (isSuperAdmin && !selectedOrganization) {
            setError("Organization is required.");
            setLoading(false);
            return;
        }
        if (isOrgAdmin && !sessionOrganizationId) {
            setError("Organization scope is missing for this admin.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/agencies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    address: data.address || undefined,
                    location_hint: data.location_hint || undefined,
                    country: selectedCountry,
                    town: selectedTown,
                    neighborhood: selectedNeighborhood || undefined,
                    organization_id: isSuperAdmin ? selectedOrganization : sessionOrganizationId || undefined
                })
            });
            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || "Failed to create agency");
            }
            const created = await response.json();
            (event.target as HTMLFormElement).reset();
            setSelectedTown("");
            setSelectedNeighborhood("");
            setOrganizationQuery("");
            setSelectedOrganization("");
            onCreated?.(created);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create agency");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 border p-4 rounded-md bg-card">
            <h3 className="text-lg font-medium">Créer une agence</h3>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {sessionError && <div className="text-red-500 text-sm">{sessionError}</div>}

            <div className="grid grid-cols-2 gap-4">
                {isSuperAdmin && (
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium" htmlFor="organization_id">Organization</label>
                        <input
                            id="organization_id"
                            name="organization_id"
                            list="organization-options"
                            value={organizationQuery}
                            onChange={(e) => handleOrganizationInput(e.target.value)}
                            placeholder="Search organization"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <datalist id="organization-options">
                            {organizations.map((org) => (
                                <option key={org.id} value={formatOrganizationLabel(org)} />
                            ))}
                        </datalist>
                    </div>
                )}
                {isOrgAdmin && (
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Organization</label>
                        <input
                            value={sessionOrganizationName || "Unknown organization"}
                            readOnly
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                        />
                    </div>
                )}
                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium" htmlFor="name">Nom</label>
                    <input
                        id="name"
                        name="name"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="country">Pays</label>
                    <select
                        id="country"
                        value={selectedCountry}
                        onChange={(e) => {
                            setSelectedCountry(e.target.value);
                            setSelectedTown("");
                            setSelectedNeighborhood("");
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        {COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="town">Ville</label>
                    <select
                        id="town"
                        value={selectedTown}
                        onChange={(e) => {
                            setSelectedTown(e.target.value);
                            setSelectedNeighborhood("");
                        }}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="">Sélectionner une ville...</option>
                        {availableTowns.map(town => (
                            <option key={town} value={town}>{town}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium" htmlFor="neighborhood">Quartier (optionnel)</label>
                    <select
                        id="neighborhood"
                        value={selectedNeighborhood}
                        onChange={(e) => setSelectedNeighborhood(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="">Sélectionner un quartier...</option>
                        {availableNeighborhoods.map(q => (
                            <option key={q} value={q}>{q}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium" htmlFor="address">Address / GPS (JSON)</label>
                    <input
                        id="address"
                        name="address"
                        placeholder='{"gps": "4.0500,9.7000", "full": "Full address"}'
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                </div>
                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium" htmlFor="location_hint">Landmark / Directions</label>
                    <input
                        id="location_hint"
                        name="location_hint"
                        placeholder="Near the main market, next to..."
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
                {loading ? "Création..." : "Créer l'agence"}
            </button>
        </form>
    );
}
