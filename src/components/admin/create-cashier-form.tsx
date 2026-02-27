"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TOWNS_BY_COUNTRY: Record<string, string[]> = {
    "Cameroon": [
        "Douala", "Yaoundé", "Bafoussam", "Garoua", "Maroua", "Bamenda",
        "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Kribi", "Limbe", "Dschang"
    ],
    "Senegal": [
        "Dakar", "Thiès", "Kaolack", "Saint-Louis", "Ziguinchor", "Touba", "Mbour"
    ],
    "Côte d'Ivoire": [
        "Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro", "Korhogo", "Man"
    ]
};

const COUNTRIES = Object.keys(TOWNS_BY_COUNTRY);

interface LookupCashier {
    id: string;
    user_name: string;
    user_first_name: string;
    account_number: string;
    country: string;
    mail?: string;
    phone?: string;
    password?: string;
    source?: string;
}

export function CreateCashierForm({
    roleType,
    organizationId
}: {
    roleType?: string | null;
    organizationId?: string | null;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lookupId, setLookupId] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [foundCashier, setFoundCashier] = useState<LookupCashier | null>(null);
    const [selectedCountry, setSelectedCountry] = useState("Cameroon");
    const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
    const [workTown, setWorkTown] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [userName, setUserName] = useState("");
    const [userFirstName, setUserFirstName] = useState("");
    const [password, setPassword] = useState("");
    const [mail, setMail] = useState("");
    const [phone, setPhone] = useState("");
    const [organizations, setOrganizations] = useState<{ id: string; name: string; country?: string | null }[]>([]);
    const [organizationQuery, setOrganizationQuery] = useState("");
    const [selectedOrganization, setSelectedOrganization] = useState("");
    const [agencies, setAgencies] = useState<{ id: string; name: string; town: string; organization_id?: string | null }[]>([]);
    const [baseAgencyId, setBaseAgencyId] = useState("");
    const [agenciesLoading, setAgenciesLoading] = useState(false);
    const [agenciesError, setAgenciesError] = useState<string | null>(null);

    const isSuperAdmin = roleType === "superadmin";
    const effectiveOrganizationId = isSuperAdmin ? selectedOrganization : organizationId || "";

    useEffect(() => {
        const trimmed = lookupId.trim();
        if (trimmed.length < 3) {
            setFoundCashier(null);
            setLookupError(null);
            setUserName("");
            setUserFirstName("");
            setAccountNumber("");
            setPassword("");
            setMail("");
            setPhone("");
            setSelectedCountry("Cameroon");
            setSelectedTowns([]);
            setWorkTown("");
            setBaseAgencyId("");
            setAgencies([]);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setLookupLoading(true);
            setLookupError(null);
            try {
                const res = await fetch(`/api/lookup/cashier?id=${encodeURIComponent(trimmed)}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "No matching cashier found.");
                }
                const data = (await res.json()) as LookupCashier;
                if (!cancelled) {
                    setFoundCashier(data);
                    setUserName(data.user_name || "");
                    setUserFirstName(data.user_first_name || "");
                    setAccountNumber(data.account_number || "");
                    setSelectedCountry(data.country || "Cameroon");
                    setPassword(data.password || "password123");
                    setMail(data.mail || "");
                    setPhone(data.phone || "");
                    setSelectedTowns([]);
                    setWorkTown("");
                    setBaseAgencyId("");
                    setAgencies([]);
                }
            } catch (e) {
                if (!cancelled) {
                    setFoundCashier(null);
                    setLookupError(e instanceof Error ? e.message : "Lookup failed.");
                    setUserName("");
                    setUserFirstName("");
                    setAccountNumber("");
                    setPassword("");
                    setMail("");
                    setPhone("");
                    setSelectedCountry("Cameroon");
                    setSelectedTowns([]);
                    setWorkTown("");
                    setBaseAgencyId("");
                    setAgencies([]);
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
    }, [lookupId]);

    useEffect(() => {
        if (!isSuperAdmin) {
            setSelectedOrganization(organizationId || "");
            return;
        }
        async function loadOrganizations() {
            try {
                const res = await fetch("/api/organizations");
                if (!res.ok) return;
                const data = await res.json();
                setOrganizations(data);
            } catch (err) {
                console.error("Failed to load organizations", err);
            }
        }
        loadOrganizations();
    }, [isSuperAdmin, organizationId]);

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

    useEffect(() => {
        if (!effectiveOrganizationId || !workTown) {
            setAgencies([]);
            setBaseAgencyId("");
            setAgenciesError(null);
            return;
        }
        let isActive = true;
        async function loadAgencies() {
            setAgenciesLoading(true);
            setAgenciesError(null);
            try {
                const params = new URLSearchParams({
                    town: workTown,
                    organization_id: effectiveOrganizationId
                });
                const res = await fetch(`/api/agencies?${params.toString()}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load agencies");
                }
                const data = await res.json();
                if (!isActive) return;
                const list = Array.isArray(data) ? data : [];
                setAgencies(list);
                setBaseAgencyId((prev) => list.some((agency: any) => agency.id === prev) ? prev : "");
            } catch (err) {
                if (!isActive) return;
                setAgencies([]);
                setBaseAgencyId("");
                setAgenciesError(err instanceof Error ? err.message : "Failed to load agencies");
            } finally {
                if (isActive) {
                    setAgenciesLoading(false);
                }
            }
        }
        loadAgencies();
        return () => {
            isActive = false;
        };
    }, [effectiveOrganizationId, workTown]);

    const handleTownChange = (town: string) => {
        if (town === workTown) return;
        setSelectedTowns((prev) =>
            prev.includes(town)
                ? prev.filter(t => t !== town)
                : [...prev, town]
        );
    };

    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        setSelectedTowns([]); // Reset selected towns when country changes
        setWorkTown("");
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Add selected towns as JSON string
        const payload = {
            ...data,
            user_name: userName,
            user_first_name: userFirstName,
            password,
            mail: mail || null,
            phone: phone || null,
            country: selectedCountry,
            town_list_chosen: JSON.stringify(selectedTowns),
            work_town: workTown,
            account_number: accountNumber,
            organization_id: isSuperAdmin ? selectedOrganization || null : organizationId || null,
            base_agency_id: baseAgencyId
        };

        if (!foundCashier) {
            setError("Select a valid cashier ID first.");
            setLoading(false);
            return;
        }
        if (isSuperAdmin && !selectedOrganization) {
            setError("Organization is required for this cashier.");
            setLoading(false);
            return;
        }
        if (!baseAgencyId) {
            setError("Base agency is required for this cashier.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/users/cashiers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to create cashier");
            }

            router.refresh();
            // Reset form
            (event.target as HTMLFormElement).reset();
            setLookupId("");
            setFoundCashier(null);
            setLookupError(null);
            setSelectedCountry("Cameroon");
            setSelectedTowns([]);
            setWorkTown("");
            setAccountNumber("");
            setUserName("");
            setUserFirstName("");
            setPassword("");
            setMail("");
            setPhone("");
            setBaseAgencyId("");
            setAgencies([]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create cashier");
        } finally {
            setLoading(false);
        }
    }

    const availableTowns = TOWNS_BY_COUNTRY[selectedCountry] || [];

    const handleWorkTownChange = (town: string) => {
        setWorkTown(town);
        if (town && !selectedTowns.includes(town)) {
            setSelectedTowns((prev) => [...prev, town]);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4 border p-4 rounded-md bg-card">
            <h3 className="text-lg font-medium">Create New Cashier</h3>
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <label htmlFor="lookup_id" className="text-sm font-medium">Cashier ID</label>
                    <input
                        id="lookup_id"
                        name="lookup_id"
                        value={lookupId}
                        onChange={(e) => setLookupId(e.target.value)}
                        placeholder="e.g. CASH001"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    {lookupLoading && <div className="text-xs text-muted-foreground">Searching...</div>}
                    {lookupError && <div className="text-xs text-destructive">{lookupError}</div>}
                    {foundCashier?.source && (
                        <div className="text-xs text-muted-foreground">Source: {foundCashier.source}</div>
                    )}
                </div>
                {isSuperAdmin && (
                    <div className="space-y-2 col-span-2">
                        <label htmlFor="organization_id" className="text-sm font-medium">Organization</label>
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
                <div className="space-y-2">
                    <label htmlFor="account_number" className="text-sm font-medium">Account Number</label>
                    <input
                        id="account_number"
                        name="account_number"
                        required
                        value={accountNumber}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="user_name" className="text-sm font-medium">Username</label>
                    <input
                        id="user_name"
                        name="user_name"
                        required
                        value={userName}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="user_first_name" className="text-sm font-medium">Full Name</label>
                    <input
                        id="user_first_name"
                        name="user_first_name"
                        required
                        value={userFirstName}
                        readOnly
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <input type="hidden" name="password" value={password} />
                <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium">Country</label>
                    <select
                        id="country"
                        value={selectedCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="hire_date" className="text-sm font-medium">Hire Date</label>
                    <input
                        id="hire_date"
                        name="hire_date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="work_town" className="text-sm font-medium">Work Town </label>
                    <select
                        id="work_town"
                        name="work_town"
                        required
                        value={workTown}
                        onChange={(e) => handleWorkTownChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="">Select a town...</option>
                        {availableTowns.map((town) => (
                            <option key={town} value={town}>{town}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="base_agency_id" className="text-sm font-medium">Base Agency</label>
                    <select
                        id="base_agency_id"
                        name="base_agency_id"
                        required
                        value={baseAgencyId}
                        onChange={(e) => setBaseAgencyId(e.target.value)}
                        disabled={!workTown || !effectiveOrganizationId || agenciesLoading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">
                            {agenciesLoading ? "Loading agencies..." : "Select a base agency..."}
                        </option>
                        {agencies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                                {agency.name} {agency.town ? `- ${agency.town}` : ""}
                            </option>
                        ))}
                    </select>
                    {agenciesError && (
                        <p className="text-xs text-red-500">{agenciesError}</p>
                    )}
                    {!agenciesLoading && workTown && effectiveOrganizationId && agencies.length === 0 && (
                        <p className="text-xs text-muted-foreground">No agencies found for this town.</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Towns ({selectedCountry})</label>
                <div className="grid grid-cols-3 gap-2 border p-3 rounded-md max-h-48 overflow-y-auto">
                    {availableTowns.map(town => (
                        <div key={town} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`town-${town}`}
                                checked={selectedTowns.includes(town)}
                                onChange={() => handleTownChange(town)}
                                disabled={town === workTown}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor={`town-${town}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                {town}
                            </label>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Select the towns where this cashier is authorized to work. The work town is required and always included.
                </p>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full md:w-auto"
            >
                {loading ? "Creating..." : "Create Cashier"}
            </button>
        </form>
    );
}
