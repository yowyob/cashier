"use client";

import { useEffect, useMemo, useState } from "react";

interface Agency {
    id: string;
    name: string;
    country: string;
    town: string;
    neighborhood?: string | null;
    requires_admin_assignment?: boolean;
    is_active?: boolean;
    organization_id?: string | null;
}

interface Organization {
    id: string;
    name: string;
    country?: string | null;
    is_active: boolean;
}

interface LookupPerson {
    id: string;
    user_name: string;
    user_first_name: string;
    mail?: string | null;
    account_number?: string | null;
    telegram_chat_id?: string | null;
    phone?: string | null;
    actif: boolean;
    adminProfile?: {
        role_type?: string | null;
        organization_id?: string | null;
        agency_id?: string | null;
    } | null;
}

export function CreateAdminForm({
    onCreated,
    currentRoleType,
    organizationId,
    variant = "inline",
    hideTitle = false
}: {
    onCreated?: () => void;
    currentRoleType: "superadmin" | "organization_admin";
    organizationId?: string | null;
    variant?: "inline" | "modal";
    hideTitle?: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [foundPerson, setFoundPerson] = useState<LookupPerson | null>(null);
    const [availableAgencies, setAvailableAgencies] = useState<Agency[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedAgency, setSelectedAgency] = useState("");
    const [selectedOrganization, setSelectedOrganization] = useState("");

    const targetRole = currentRoleType === "superadmin" ? "organization_admin" : "agency_admin";

    useEffect(() => {
        fetchOptions();
    }, [currentRoleType, organizationId]);

    useEffect(() => {
        setSelectedAgency("");
        setSelectedOrganization("");
    }, [currentRoleType, organizationId]);

    useEffect(() => {
        const trimmed = phone.trim();
        if (trimmed.length < 3) {
            setFoundPerson(null);
            setLookupError(null);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setLookupLoading(true);
            setLookupError(null);
            try {
                const res = await fetch(`/api/lookup/admin?phone=${encodeURIComponent(trimmed)}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "No matching admin found.");
                }
                const data = (await res.json()) as LookupPerson;
                if (!cancelled) {
                    setFoundPerson(data);
                }
            } catch (e) {
                if (!cancelled) {
                    setFoundPerson(null);
                    setLookupError(e instanceof Error ? e.message : "Lookup failed.");
                }
            } finally {
                if (!cancelled) {
                    setLookupLoading(false);
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [phone]);

    const canSubmit = useMemo(() => {
        if (!foundPerson) return false;
        if (targetRole === "organization_admin") return Boolean(selectedOrganization);
        return Boolean(selectedAgency);
    }, [foundPerson, targetRole, selectedAgency, selectedOrganization]);

    async function fetchOptions() {
        try {
            if (currentRoleType === "superadmin") {
                const orgRes = await fetch("/api/organizations");
                const organizationsData: Organization[] = orgRes.ok ? await orgRes.json() : [];
                setOrganizations(organizationsData.filter((org) => org.is_active));
                return;
            }

            const [agRes, adminRes] = await Promise.all([
                fetch("/api/agencies"),
                fetch("/api/users/admins")
            ]);

            const agenciesData: Agency[] = agRes.ok ? await agRes.json() : [];
            const adminsData = adminRes.ok ? await adminRes.json() : [];

            const scopedAgencies = organizationId
                ? agenciesData.filter((agency) => agency.organization_id === organizationId)
                : agenciesData;

            const agenciesWithAdmin = new Set(
                (adminsData || [])
                    .filter((a: any) => a.actif !== false && a.adminProfile?.agency_id)
                    .map((a: any) => a.adminProfile.agency_id as string)
            );

            setAvailableAgencies(
                scopedAgencies.filter((agency: Agency) => {
                    const hasAdmin = agenciesWithAdmin.has(agency.id);
                    return !hasAdmin || agency.requires_admin_assignment || !agency.is_active;
                })
            );
        } catch (e) {
            console.error("Failed to load agencies or organizations", e);
        }
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!foundPerson) {
            setError("Select a valid admin by phone number first.");
            setLoading(false);
            return;
        }

        if (targetRole === "organization_admin" && !selectedOrganization) {
            setError("Select an organization for this admin.");
            setLoading(false);
            return;
        }

        if (targetRole === "agency_admin" && !selectedAgency) {
            setError("Select an agency for this admin.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/users/admins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    person_id: foundPerson.id,
                    role_type: targetRole,
                    organization_id: targetRole === "organization_admin" ? selectedOrganization : undefined,
                    agency_id: targetRole === "agency_admin" ? selectedAgency : undefined
                })
            });

            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || "Failed to assign admin");
            }

            setPhone("");
            setFoundPerson(null);
            setLookupError(null);
            setSelectedAgency("");
            setSelectedOrganization("");
            onCreated?.();
            fetchOptions();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to assign admin");
        } finally {
            setLoading(false);
        }
    }

    const formClassName =
        variant === "modal"
            ? "space-y-4"
            : "space-y-4 border p-4 rounded-md bg-card";

    return (
        <form onSubmit={onSubmit} className={formClassName}>
            {!hideTitle && <h3 className="text-lg font-medium">Assign admin</h3>}
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium" htmlFor="phone">Phone number</label>
                    <input
                        id="phone"
                        name="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+237 6XX XXX XXX"
                        inputMode="tel"
                        pattern="^[0-9+ ]{6,}$"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="text-xs text-muted-foreground">Format: +237 6XX XXX XXX (digits, space, +)</div>
                    {lookupLoading && <div className="text-xs text-muted-foreground">Searching...</div>}
                    {lookupError && <div className="text-xs text-destructive">{lookupError}</div>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Full name</label>
                    <input
                        value={foundPerson?.user_first_name || ""}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <input
                        value={foundPerson?.user_name || ""}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                        value={foundPerson?.mail || ""}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Account number</label>
                    <input
                        value={foundPerson?.account_number || ""}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Telegram chat ID</label>
                    <input
                        value={foundPerson?.telegram_chat_id || ""}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                    />
                </div>

                {targetRole === "organization_admin" && (
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium" htmlFor="organization">Organization</label>
                        <select
                            id="organization"
                            value={selectedOrganization}
                            onChange={(e) => setSelectedOrganization(e.target.value)}
                            disabled={!foundPerson}
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                        >
                            <option value="">Select an organization</option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name} ({org.country || "Unknown"})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {targetRole === "agency_admin" && (
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium" htmlFor="agency">Agency</label>
                        <select
                            id="agency"
                            value={selectedAgency}
                            onChange={(e) => setSelectedAgency(e.target.value)}
                            disabled={!foundPerson}
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                        >
                            <option value="">Select an agency</option>
                            {availableAgencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name} ({agency.country} / {agency.town}{agency.neighborhood ? ` / ${agency.neighborhood}` : ""})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <button
                type="submit"
                disabled={loading || !canSubmit}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
            >
                {loading ? "Saving..." : "Assign admin"}
            </button>
        </form>
    );
}
