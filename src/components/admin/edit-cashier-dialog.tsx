"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

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

function normalizeTown(value: string) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

function canonicalizeTowns(towns: string[], available: string[]) {
    const availableByNorm = new Map<string, string>();
    available.forEach((town) => {
        const norm = normalizeTown(town);
        if (!availableByNorm.has(norm)) {
            availableByNorm.set(norm, town);
        }
    });

    const seen = new Set<string>();
    const result: string[] = [];
    towns.forEach((town) => {
        const norm = normalizeTown(town);
        if (seen.has(norm)) return;
        const canonical = availableByNorm.get(norm) || town;
        result.push(canonical);
        seen.add(norm);
    });

    return result;
}

interface Cashier {
    id: string;
    user_name: string;
    user_first_name: string;
    country: string | null;
    cashierProfile: {
        town_list_chosen: string | null;
        work_town?: string | null;
        hire_date: string | null;
        organization_id?: string | null;
        base_agency_id?: string | null;
    } | null;
}

interface EditCashierDialogProps {
    cashier: Cashier;
    isOpen: boolean;
    onClose: () => void;
}

export function EditCashierDialog({ cashier, isOpen, onClose }: EditCashierDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState(cashier.country || "Cameroon");
    const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
    const [hireDate, setHireDate] = useState(
        cashier.cashierProfile?.hire_date ? new Date(cashier.cashierProfile.hire_date).toISOString().split("T")[0] : ""
    );
    const [workTown, setWorkTown] = useState(cashier.cashierProfile?.work_town || "");

    useEffect(() => {
        const nextCountry = cashier.country || "Cameroon";
        const availableTowns = TOWNS_BY_COUNTRY[nextCountry] || [];
        let townsList: string[] = [];
        if (cashier.cashierProfile?.town_list_chosen) {
            try {
                const towns = JSON.parse(cashier.cashierProfile.town_list_chosen);
                if (Array.isArray(towns)) {
                    townsList = towns;
                }
            } catch (e) {
                console.error("Failed to parse town list", e);
            }
        }
        const nextWorkTown = cashier.cashierProfile?.work_town || "";
        setSelectedCountry(nextCountry);
        setWorkTown(nextWorkTown);
        if (nextWorkTown) {
            const normalizedWorkTown = normalizeTown(nextWorkTown);
            const hasWorkTown = townsList.some((town) => normalizeTown(town) === normalizedWorkTown);
            if (!hasWorkTown) {
                townsList = [...townsList, nextWorkTown];
            }
        }
        setSelectedTowns(canonicalizeTowns(townsList, availableTowns));
        if (cashier.cashierProfile?.hire_date) {
            setHireDate(new Date(cashier.cashierProfile.hire_date).toISOString().split('T')[0]);
        } else {
            setHireDate("");
        }
    }, [cashier]);

    const handleTownChange = (town: string) => {
        const normalizedTown = normalizeTown(town);
        if (workTown && normalizeTown(workTown) === normalizedTown) return;
        setSelectedTowns((prev) => {
            const exists = prev.some((item) => normalizeTown(item) === normalizedTown);
            if (exists) {
                return prev.filter((item) => normalizeTown(item) !== normalizedTown);
            }
            return [...prev, town];
        });
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const baseAgencyId = cashier.cashierProfile?.base_agency_id || null;
        if (!baseAgencyId) {
            setError("Base agency is required.");
            setLoading(false);
            return;
        }

        const payload: Record<string, string> = {
            town_list_chosen: JSON.stringify(selectedTowns),
            base_agency_id: baseAgencyId
        };
        if (hireDate) {
            payload.hire_date = hireDate;
        }

        try {
            const response = await fetch(`/api/users/cashiers/${cashier.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to update cashier");
            }

            router.refresh();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update cashier");
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    const availableTowns = TOWNS_BY_COUNTRY[selectedCountry] || [];

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Edit Cashier</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="edit_hire_date" className="text-sm font-medium">Hire Date</label>
                            <input
                                id="edit_hire_date"
                                type="date"
                                value={hireDate}
                                onChange={(e) => setHireDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Assigned Towns ({selectedCountry})</label>
                        <div className="grid grid-cols-3 gap-2 border p-3 rounded-md max-h-48 overflow-y-auto">
                            {availableTowns.map(town => (
                                <div key={town} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`edit-town-${town}`}
                                        checked={selectedTowns.some((item) => normalizeTown(item) === normalizeTown(town))}
                                        onChange={() => handleTownChange(town)}
                                        disabled={workTown ? normalizeTown(town) === normalizeTown(workTown) : false}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`edit-town-${town}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                        {town}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The work town is required and always included.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
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
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
