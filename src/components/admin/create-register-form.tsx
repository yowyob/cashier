"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, townsFor, neighborhoodsFor } from "@/lib/locations";

interface Agency {
    id: string;
    name: string;
    country: string;
    town: string;
    neighborhood?: string | null;
    address?: string | null;
}

interface Props {
    adminId: string;
    roleType?: string | null;
    agencyOverride?: {
        id: string;
        name: string;
        country: string;
        town: string;
        neighborhood?: string | null;
        address?: string | null;
    };
}

export function CreateRegisterForm({ adminId, roleType, agencyOverride }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState(agencyOverride?.country || "Cameroon");
    const [selectedTown, setSelectedTown] = useState(agencyOverride?.town || "");
    const [selectedNeighborhood, setSelectedNeighborhood] = useState(agencyOverride?.neighborhood || "");
    const [selectedAgency, setSelectedAgency] = useState(agencyOverride?.id || "");
    const [address, setAddress] = useState(agencyOverride?.address || "");
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [minOpen, setMinOpen] = useState("");
    const [maxClose, setMaxClose] = useState("");
    const [agencyWarning, setAgencyWarning] = useState<string | null>(null);
    const isAgencyAdmin = roleType === "agency_admin";

    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        setSelectedTown(""); // Reset selected town when country changes
        setSelectedNeighborhood("");
        setSelectedAgency("");
        setAddress("");
        setAgencyWarning(null);
    };

    useEffect(() => {
        async function fetchAgencies() {
            if (isAgencyAdmin && agencyOverride) {
                setAgencies([agencyOverride]);
                setSelectedAgency(agencyOverride.id);
                setAgencyWarning(null);
                return;
            }
            if (!selectedCountry) return;
            const params = new URLSearchParams({
                country: selectedCountry,
                ...(selectedTown ? { town: selectedTown } : {})
            });
            try {
                const res = await fetch(`/api/agencies?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setAgencies(data);
                    // Reset agency if not in filtered list
                    if (selectedAgency && !data.find((a: Agency) => a.id === selectedAgency)) {
                        setSelectedAgency("");
                    }
                }
            } catch (e) {
                console.error("Failed to load agencies", e);
            }
        }
        fetchAgencies();
    }, [selectedCountry, selectedTown, selectedAgency, isAgencyAdmin]);

    useEffect(() => {
        if (agencyOverride) {
            setSelectedCountry(agencyOverride.country);
            setSelectedTown(agencyOverride.town);
            setSelectedNeighborhood(agencyOverride.neighborhood || "");
            setSelectedAgency(agencyOverride.id);
            setAddress(agencyOverride.address || "");
            setAgencyWarning(null);
        }
    }, [agencyOverride]);

    useEffect(() => {
        if (isAgencyAdmin && agencyOverride) {
            setSelectedAgency(agencyOverride.id);
            setAgencyWarning(null);
            return;
        }
        if (!selectedNeighborhood) {
            setAgencyWarning(null);
            return;
        }

        const matching = agencies.find((a) =>
            (!selectedTown || a.town === selectedTown) &&
            a.neighborhood &&
            a.neighborhood.toLowerCase() === selectedNeighborhood.toLowerCase()
        );

        if (matching) {
            setSelectedAgency(matching.id);
            setAgencyWarning(null);
        } else {
            setSelectedAgency("");
            setAgencyWarning(`Aucune agence enregistrée pour le quartier "${selectedNeighborhood}".`);
        }
    }, [selectedNeighborhood, agencies, selectedTown]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        const saleAgentBankAccount =
            typeof data.sale_agent_bank_account === "string" ? data.sale_agent_bank_account.trim() : "";
        const saleAgentAccountingAccount =
            typeof data.sale_agent_accounting_account === "string" ? data.sale_agent_accounting_account.trim() : "";

        try {
            const response = await fetch("/api/cash-registers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    sale_agent_bank_account: saleAgentBankAccount || undefined,
                    sale_agent_accounting_account: saleAgentAccountingAccount || undefined,
                    adress: address || undefined,
                    town: selectedTown,
                    country: selectedCountry,
                    neighborhood: selectedNeighborhood,
                    agency_id: isAgencyAdmin && agencyOverride ? agencyOverride.id : (selectedAgency || undefined),
                    create_by: adminId,
                    min_open_time: minOpen || undefined,
                    max_close_time: maxClose || undefined
                }),
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to create register");
            }

            router.refresh();
            (event.target as HTMLFormElement).reset();
            if (!isAgencyAdmin) {
                setSelectedCountry("Cameroon");
                setSelectedTown("");
                setSelectedNeighborhood("");
                setSelectedAgency("");
            }
            setMinOpen("");
            setMaxClose("");
            setAgencyWarning(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create register");
        } finally {
            setLoading(false);
        }
    }

    const availableTowns = townsFor(selectedCountry);
    const availableNeighborhoods = neighborhoodsFor(selectedCountry, selectedTown);
    const filteredAgencies = isAgencyAdmin && agencyOverride
        ? agencies.filter(a => a.id === agencyOverride.id)
        : agencies.filter(a => !selectedTown || a.town === selectedTown);

    return (
        <form onSubmit={onSubmit} className="space-y-4 border p-4 rounded-md bg-card">
            <h3 className="text-lg font-medium">Create New Cash Register</h3>
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium">Country</label>
                    <select
                        id="country"
                        value={selectedCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        disabled={isAgencyAdmin}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="town" className="text-sm font-medium">Town</label>
                    <select
                        id="town"
                        value={selectedTown}
                        onChange={(e) => {
                            setSelectedTown(e.target.value);
                            setSelectedNeighborhood("");
                            setSelectedAgency("");
                            setAgencyWarning(null);
                        }}
                        required
                        disabled={isAgencyAdmin}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Select a town...</option>
                        {availableTowns.map(town => (
                            <option key={town} value={town}>{town}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="neighborhood" className="text-sm font-medium">City</label>
                    <select
                        id="neighborhood"
                        value={selectedNeighborhood}
                        onChange={(e) => setSelectedNeighborhood(e.target.value)}
                        required
                        disabled={isAgencyAdmin}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Select city...</option>
                        {availableNeighborhoods.map(q => (
                            <option key={q} value={q}>{q}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2 col-span-2">
                    <label htmlFor="adress" className="text-sm font-medium">Address</label>
                    <input
                        id="adress"
                        name="adress"
                        placeholder="Agency address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isAgencyAdmin}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="ip_address" className="text-sm font-medium">Adresse IP</label>
                    <input
                        id="ip_address"
                        name="ip_address"
                        placeholder="192.168.1.10"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="mac_address" className="text-sm font-medium">Adresse MAC</label>
                    <input
                        id="mac_address"
                        name="mac_address"
                        placeholder="AA:BB:CC:DD:EE:FF"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="sale_agent_bank_account" className="text-sm font-medium">Compte bancaire agent</label>
                    <input
                        id="sale_agent_bank_account"
                        name="sale_agent_bank_account"
                        placeholder="0123 4567 8901"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="sale_agent_accounting_account" className="text-sm font-medium">Compte comptable agent</label>
                    <input
                        id="sale_agent_accounting_account"
                        name="sale_agent_accounting_account"
                        placeholder="4112"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="min_open_time">Heure minimale d&#39;ouverture</label>
                    <input
                        id="min_open_time"
                        type="time"
                        value={minOpen}
                        onChange={(e) => setMinOpen(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="max_close_time">Heure maximale de fermeture</label>
                    <input
                        id="max_close_time"
                        type="time"
                        value={maxClose}
                        onChange={(e) => setMaxClose(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                </div>
                <div className="space-y-2 col-span-2">
                    <label htmlFor="agency_id" className="text-sm font-medium">Agency</label>
                    <select
                        id="agency_id"
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        disabled={isAgencyAdmin}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Sélect agency</option>
                        {filteredAgencies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                                {agency.name} ({agency.town}{agency.neighborhood ? ` - ${agency.neighborhood}` : ""})
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Auto fill</p>
                    {agencyWarning && (
                        <p className="text-xs text-red-500">{agencyWarning} Create agency first</p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || (!!agencyWarning && !!selectedNeighborhood)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full md:w-auto"
            >
                {loading ? "Creating..." : "Create Register"}
            </button>
        </form>
    );
}
