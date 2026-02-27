"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AssignCashierDialog } from "@/components/admin/assign-cashier-dialog";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { TablePagination } from "@/components/ui/table-pagination";

interface Cashier {
    id: string;
    user_first_name: string;
    user_name: string;
    cashierProfile?: {
        town_list_chosen: string[] | string | null;
        work_town?: string | null;
    } | null;
}

interface Agency {
    id: string;
    name: string;
    country: string;
    town: string;
    neighborhood?: string | null;
}

interface Register {
    id: string;
    town: string | null;
    country: string | null;
    neighborhood?: string | null;
    user_id?: string | null;
    ip_address?: string | null;
    mac_address?: string | null;
    is_active: boolean;
    assignedCashier?: {
        user_first_name: string;
        user_name: string;
    } | null;
    sessions?: {
        state: string;
        open_on: Date;
    }[];
    agency?: { id?: string | null; name?: string | null } | null;
}

interface SessionInfo {
    id: string;
    open_by: string;
    state: string;
    is_locked: boolean;
    cashRegister?: {
        town: string | null;
    } | null;
}

interface Props {
    canAssign: boolean;
    canManageAgencyAssignments?: boolean;
}

interface CashierAgencyAssignment {
    id: string;
    assigned_on: Date;
    start_on: Date | null;
    end_on: Date | null;
    agency_id: string;
    cashier: Cashier;
    agency: Agency;
}

function normalizeCashier(raw: any): Cashier {
    const profile = raw?.cashierProfile ?? raw?.cashier_profile ?? raw?.profile ?? {};
    const townList = profile?.town_list_chosen ?? profile?.townListChosen ?? profile?.town_list ?? raw?.town_list_chosen ?? null;
    return {
        id: String(raw?.id ?? raw?.person_id ?? raw?.user_id ?? ""),
        user_first_name: raw?.user_first_name ?? raw?.userFirstName ?? raw?.full_name ?? raw?.name ?? "",
        user_name: raw?.user_name ?? raw?.username ?? raw?.email ?? "",
        cashierProfile: {
            town_list_chosen: townList,
            work_town: profile?.work_town ?? profile?.workTown ?? raw?.work_town ?? null
        }
    };
}

function normalizeCashierList(payload: any): Cashier[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload.map(normalizeCashier);
    if (Array.isArray(payload.data)) return payload.data.map(normalizeCashier);
    if (Array.isArray(payload.cashiers)) return payload.cashiers.map(normalizeCashier);
    return [];
}

function parseTownList(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((town) => String(town)).filter(Boolean);
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((town) => String(town)).filter(Boolean);
            }
        } catch {
            // ignore parse errors
        }
        return value
            .split(",")
            .map((town) => town.trim())
            .filter(Boolean);
    }
    return [];
}

function normalizeTownKey(value: string | null | undefined): string {
    if (!value) return "";
    return value
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function AgencyAssignmentModal({
    agencies,
    onAssigned,
    onClose
}: {
    agencies: Agency[];
    onAssigned?: () => void;
    onClose: () => void;
}) {
    const [cashiers, setCashiers] = useState<Cashier[]>([]);
    const [cashiersLoading, setCashiersLoading] = useState(false);
    const [cashiersError, setCashiersError] = useState<string | null>(null);
    const [selectedCashierId, setSelectedCashierId] = useState("");
    const [selectedTown, setSelectedTown] = useState("");
    const [selectedAgencyId, setSelectedAgencyId] = useState("");
    const [assignmentStart, setAssignmentStart] = useState("");
    const [assignmentEnd, setAssignmentEnd] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedCashier = cashiers.find((c) => c.id === selectedCashierId) || null;
    const selectedCashierTowns = (() => {
        const workTown = selectedCashier?.cashierProfile?.work_town || "";
        const townsRaw = selectedCashier?.cashierProfile?.town_list_chosen;
        const towns = parseTownList(townsRaw);
        if (!workTown) return towns;
        return towns.includes(workTown) ? towns : [...towns, workTown];
    })();

    const allowedTownKeys = new Set(
        selectedCashierTowns.map((town) => normalizeTownKey(town)).filter(Boolean)
    );
    const availableAgenciesForCashier = agencies.filter((agency) => {
        if (selectedCashierTowns.length === 0) return false;
        return allowedTownKeys.has(normalizeTownKey(agency.town));
    });

    const availableTownsForCashier = Array.from(
        new Set(availableAgenciesForCashier.map((agency) => agency.town).filter(Boolean))
    );

    const filteredAgenciesByTown = selectedTown
        ? availableAgenciesForCashier.filter((agency) => agency.town === selectedTown)
        : [];

    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const todayIso = new Date(todayLocal.getTime() - todayLocal.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

    useEffect(() => {
        setCashiers([]);
        setSelectedCashierId("");
        setCashiersError(null);
        if (!assignmentStart || !assignmentEnd) return;

        const loadCashiers = async () => {
            setCashiersLoading(true);
            setCashiersError(null);
            try {
                const params = new URLSearchParams({
                    start_on: assignmentStart,
                    end_on: assignmentEnd
                });
                const response = await fetch(`/api/cashiers/available?${params}`);
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load available cashiers");
                }
                const data = await response.json();
                setCashiers(normalizeCashierList(data));
            } catch (err: any) {
                setCashiersError(err.message || "Failed to load available cashiers");
                setCashiers([]);
            } finally {
                setCashiersLoading(false);
            }
        };

        loadCashiers();
    }, [assignmentStart, assignmentEnd]);

    useEffect(() => {
        if (!selectedCashierId) {
            setSelectedTown("");
        }
        if (selectedAgencyId && !filteredAgenciesByTown.find((a) => a.id === selectedAgencyId)) {
            setSelectedAgencyId("");
        }
    }, [selectedAgencyId, filteredAgenciesByTown, selectedCashierId]);

    async function assignCashierToAgency() {
        if (!selectedCashierId || !selectedAgencyId || !assignmentStart || !assignmentEnd) return;
        setAssigning(true);
        setError(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
            const startDate = new Date(assignmentStart);
            if (Number.isNaN(startDate.getTime()) || startDate < todayLocal) {
                throw new Error("Start date must be today or later.");
            }
            const response = await fetch("/api/admin/cashier-agency-assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    cashier_id: selectedCashierId,
                    agency_id: selectedAgencyId,
                    start_on: assignmentStart,
                    end_on: assignmentEnd
                })
            });

            if (!response.ok) {
                const text = await response.text();
                let message = "Failed to assign cashier to agency";
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

            setSelectedAgencyId("");
            setAssignmentStart("");
            setAssignmentEnd("");
            setSelectedCashierId("");
            onAssigned?.();
            onClose();
        } catch (err: any) {
            if (err?.name === "AbortError") {
                setError("La requête a expiré. Réessayez.");
            } else {
                setError(err.message || "Failed to assign cashier to agency");
            }
        } finally {
            clearTimeout(timeoutId);
            setAssigning(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Assign Cashier to Agency</h3>
                    <button
                        onClick={onClose}
                        className="text-sm text-muted-foreground hover:text-foreground"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-sm text-muted-foreground">
                    Only agencies located in the cashier&apos;s allowed towns are available.
                </p>
                {cashiersError && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                        {cashiersError}
                    </div>
                )}
                {selectedCashierId && selectedCashierTowns.length === 0 && !cashiersLoading && (
                    <p className="text-sm text-destructive">
                        This cashier has no allowed towns. Update the cashier profile first.
                    </p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium">
                        Cashier
                        <select
                            value={selectedCashierId}
                            onChange={(e) => setSelectedCashierId(e.target.value)}
                            disabled={cashiersLoading || !assignmentStart || !assignmentEnd}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="">
                                {!assignmentStart || !assignmentEnd
                                    ? "Select dates first..."
                                    : cashiersLoading
                                        ? "Loading..."
                                        : cashiers.length === 0
                                            ? "No available cashiers"
                                            : "Select a cashier..."}
                            </option>
                            {!cashiersLoading &&
                                cashiers.map((cashier) => (
                                    <option key={cashier.id} value={cashier.id}>
                                        {cashier.user_first_name} ({cashier.user_name}){" "}
                                        {cashier.cashierProfile?.work_town ? `- ${cashier.cashierProfile.work_town}` : ""}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Town
                        <select
                            value={selectedTown}
                            onChange={(e) => setSelectedTown(e.target.value)}
                            disabled={!selectedCashierId || availableTownsForCashier.length === 0}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                        >
                            <option value="">Select a town...</option>
                            {availableTownsForCashier.map((town) => (
                                <option key={town} value={town}>
                                    {town}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Agency
                        <select
                            value={selectedAgencyId}
                            onChange={(e) => setSelectedAgencyId(e.target.value)}
                            disabled={!selectedCashierId || !selectedTown}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                        >
                            <option value="">Select an agency...</option>
                            {filteredAgenciesByTown.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name} ({agency.town}{agency.neighborhood ? ` - ${agency.neighborhood}` : ""})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Start date
                        <input
                            type="date"
                            value={assignmentStart}
                            onChange={(e) => setAssignmentStart(e.target.value)}
                            min={todayIso}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        End date
                        <input
                            type="date"
                            value={assignmentEnd}
                            onChange={(e) => setAssignmentEnd(e.target.value)}
                            min={assignmentStart || todayIso}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                </div>
                {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                        {error}
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={assignCashierToAgency}
                        disabled={!selectedCashierId || !selectedAgencyId || !assignmentStart || !assignmentEnd || assigning}
                        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
                    >
                        {assigning ? "Assigning..." : "Assign"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AssignmentsPageClient({ canAssign, canManageAgencyAssignments = false }: Props) {
    const router = useRouter();
    const showRegisterAssignment = canAssign && !canManageAgencyAssignments;
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [cashiers, setCashiers] = useState<Cashier[]>([]);
    const [registers, setRegisters] = useState<Register[]>([]);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [selectedRegisterId, setSelectedRegisterId] = useState("");
    const [selectedCashierId, setSelectedCashierId] = useState("");
    const [cashierSearch, setCashierSearch] = useState("");
    const [agencyAssignments, setAgencyAssignments] = useState<CashierAgencyAssignment[]>([]);
    const [agencyAssignmentsLoading, setAgencyAssignmentsLoading] = useState(false);
    const [agencyAssignmentError, setAgencyAssignmentError] = useState<string | null>(null);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [stoppingAssignmentId, setStoppingAssignmentId] = useState<string | null>(null);
    const [agencyAssignmentFilters, setAgencyAssignmentFilters] = useState({
        search: "",
        status: "all",
        startDate: "",
        endDate: ""
    });
    const [agencyPage, setAgencyPage] = useState(1);
    const { openModal } = useAdminModal();

    useEffect(() => {
        fetchOptions();
        if (canManageAgencyAssignments) {
            fetchAgencyAssignments();
            fetchAgencyAssignmentOptions();
        }
    }, []);

    async function fetchOptions() {
        setOptionsLoading(true);
        try {
            const [cashierRes, registerRes, sessionRes] = await Promise.all([
                fetch("/api/users/cashiers"),
                fetch("/api/cash-registers"),
                fetch("/api/sessions")
            ]);

            if (cashierRes.ok) {
                const cash = await cashierRes.json();
                setCashiers(cash);
            }

            if (registerRes.ok) {
                const regs = await registerRes.json();
                setRegisters(regs);
                if (!selectedRegisterId && regs.length > 0) {
                    setSelectedRegisterId(regs[0].id);
                }
            }

            if (sessionRes.ok) {
                const sess = await sessionRes.json();
                setSessions(sess);
            }
        } catch (error) {
            console.error("Failed to load options", error);
        } finally {
            setOptionsLoading(false);
        }
    }

    async function fetchAgencyAssignments(options?: { silent?: boolean }) {
        if (!canManageAgencyAssignments) return;
        if (!options?.silent) {
            setAgencyAssignmentsLoading(true);
        }
        setAgencyAssignmentError(null);
        try {
            const response = await fetch("/api/admin/cashier-agency-assignments");
            if (response.ok) {
                const data = await response.json();
                setAgencyAssignments(data);
            } else {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || "Failed to load agency assignments");
            }
        } catch (error: any) {
            setAgencyAssignmentError(error.message || "Failed to load agency assignments");
        } finally {
            if (!options?.silent) {
                setAgencyAssignmentsLoading(false);
            }
        }
    }

    async function fetchAgencyAssignmentOptions() {
        if (!canManageAgencyAssignments) return;
        try {
            const agencyRes = await fetch("/api/agencies");
            const agenciesData = agencyRes.ok ? await agencyRes.json() : [];
            setAgencies(agenciesData);
        } catch (error) {
            console.error("Failed to load agency assignment options", error);
        }
    }

    function openAssignDialog(regId: string) {
        if (!showRegisterAssignment) return;
        const register = availableRegisters.find((r) => r.id === regId);
        if (!register) return;
        const filteredCashiers = getFilteredCashiers(register);
        openModal((close) => (
            <AssignCashierDialog
                registerId={register.id}
                cashiers={filteredCashiers}
                isOpen
                onClose={() => {
                    close();
                    fetchOptions();
                }}
            />
        ));
    }

    const getFilteredCashiers = (register: Register) => {
        if (!register.town) return cashiers;
        const registerTownKey = normalizeTownKey(register.town);
        return cashiers.filter((c) => {
            const towns = parseTownList(c.cashierProfile?.town_list_chosen);
            const workTown = c.cashierProfile?.work_town;
            const allowedTowns = [
                ...towns,
                ...(workTown ? [workTown] : [])
            ];
            const allowedKeys = new Set(allowedTowns.map((town) => normalizeTownKey(town)).filter(Boolean));
            if (allowedKeys.size === 0) return false;
            if (!allowedKeys.has(registerTownKey)) return false;

            const hasOpenOrLockedInTown = sessions.some(
                (s) =>
                    (s.state === "ouverte" || s.is_locked) &&
                    s.open_by === c.id &&
                    normalizeTownKey(s.cashRegister?.town) === registerTownKey
            );

            return !hasOpenOrLockedInTown;
        });
    };

    const registerLabel = (reg: Register) => {
        const parts = [reg.town, reg.neighborhood, reg.country].filter(Boolean);
        const location = parts.join(" / ");
        const mac = reg.mac_address ? `MAC: ${reg.mac_address}` : null;
        return [location || reg.id.substring(0, 8), mac].filter(Boolean).join(" • ");
    };
    const registersLoading = optionsLoading;
    const hasOpenOrLockedSession = (reg: Register) => {
        const latest = reg.sessions?.[0];
        if (!latest) return false;
        return (
            latest.state === "ouverte" ||
            latest.state === "en_cloture" ||
            latest.state === "en_clôture" ||
            latest.state === "locked" ||
            latest.state === "bloquee" ||
            latest.state === "bloquée" ||
            reg.sessions?.some((s) => s.state === "ouverte" || s.state === "en_cloture" || s.state === "en_clôture")
        );
    };

    const availableRegisters = registers.filter((r) => !hasOpenOrLockedSession(r));

    const selectedRegister = selectedRegisterId ? availableRegisters.find((r) => r.id === selectedRegisterId) : null;
    const selectableCashiers = selectedRegister ? getFilteredCashiers(selectedRegister) : cashiers;
    const filteredSelectableCashiers = selectableCashiers.filter((c) => {
        if (!cashierSearch) return true;
        const text = `${c.user_first_name} ${c.user_name}`.toLowerCase();
        const phone = (c as any).phone || "";
        return text.includes(cashierSearch.toLowerCase()) || phone.includes(cashierSearch);
    });

    useEffect(() => {
        const nextId = selectedRegister && filteredSelectableCashiers.length > 0 ? filteredSelectableCashiers[0].id : "";
        setSelectedCashierId((prev) => (prev === nextId ? prev : nextId));
    });

    async function stopAgencyAssignment(assignmentId: string) {
        setStoppingAssignmentId(assignmentId);
        setAgencyAssignmentError(null);
        try {
            const response = await fetch("/api/admin/cashier-agency-assignments", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: assignmentId })
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || "Failed to stop assignment");
            }
            setAgencyAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
            fetchAgencyAssignments({ silent: true });
        } catch (error: any) {
            setAgencyAssignmentError(error.message || "Failed to stop assignment");
        } finally {
            setStoppingAssignmentId(null);
        }
    }

    const filteredAgencyAssignments = agencyAssignments.filter((assignment) => {
        const text = [
            assignment.cashier.user_first_name,
            assignment.cashier.user_name,
            assignment.agency.name,
            assignment.agency.town,
            assignment.agency.country,
            assignment.cashier.cashierProfile?.work_town || ""
        ].join(" ").toLowerCase();
        const matchesSearch = !agencyAssignmentFilters.search || text.includes(agencyAssignmentFilters.search.toLowerCase());

        const now = new Date();
        const endDate = assignment.end_on ? new Date(assignment.end_on) : null;
        const isActive = !endDate || endDate >= now;
        const matchesStatus =
            agencyAssignmentFilters.status === "all" ||
            (agencyAssignmentFilters.status === "active" ? isActive : !isActive);

        const startFilter = agencyAssignmentFilters.startDate ? new Date(agencyAssignmentFilters.startDate) : null;
        const endFilter = agencyAssignmentFilters.endDate ? new Date(`${agencyAssignmentFilters.endDate}T23:59:59`) : null;
        const assignmentStartDate = assignment.start_on ? new Date(assignment.start_on) : null;
        const assignmentEndDate = assignment.end_on ? new Date(assignment.end_on) : null;
        const matchesStart = !startFilter || (assignmentStartDate ? assignmentStartDate >= startFilter : false);
        const matchesEnd = !endFilter || (assignmentEndDate ? assignmentEndDate <= endFilter : false);

        return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });

    const agencyPageSize = 20;
    const agencyTotalPages = Math.max(1, Math.ceil(filteredAgencyAssignments.length / agencyPageSize));
    const pagedAgencyAssignments = filteredAgencyAssignments.slice(
        (agencyPage - 1) * agencyPageSize,
        agencyPage * agencyPageSize
    );

    useEffect(() => {
        setAgencyPage(1);
    }, [agencyAssignmentFilters.search, agencyAssignmentFilters.status, agencyAssignmentFilters.startDate, agencyAssignmentFilters.endDate]);

    useEffect(() => {
        if (agencyPage > agencyTotalPages) {
            setAgencyPage(agencyTotalPages);
        }
    }, [agencyPage, agencyTotalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Cashier Assignments</h1>
            </div>

            {canManageAgencyAssignments && (
                <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3 flex items-center justify-between">
                        <h3 className="font-semibold">Agency Assignments</h3>
                        <button
                            type="button"
                            onClick={() =>
                                openModal((close) => (
                                    <AgencyAssignmentModal
                                        agencies={agencies}
                                        onAssigned={() => {
                                            fetchAgencyAssignments();
                                            fetchAgencyAssignmentOptions();
                                        }}
                                        onClose={close}
                                    />
                                ))
                            }
                            className="inline-flex items-center justify-center rounded-md bg-black text-white h-9 px-3 text-sm font-medium hover:bg-black/90"
                        >
                            Assign cashier
                        </button>
                    </div>
                    <div className="border-b px-4 py-3 bg-muted/20">
                        <div className="grid gap-3 md:grid-cols-4">
                            <label className="text-sm font-medium">
                                Search
                                <input
                                    type="text"
                                    value={agencyAssignmentFilters.search}
                                    onChange={(e) => setAgencyAssignmentFilters((prev) => ({ ...prev, search: e.target.value }))}
                                    placeholder="Cashier, agency, town..."
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="text-sm font-medium">
                                Status
                                <select
                                    value={agencyAssignmentFilters.status}
                                    onChange={(e) => setAgencyAssignmentFilters((prev) => ({ ...prev, status: e.target.value }))}
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                >
                                    <option value="all">All</option>
                                    <option value="active">Active</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </label>
                            <label className="text-sm font-medium">
                                Start date
                                <input
                                    type="date"
                                    value={agencyAssignmentFilters.startDate}
                                    onChange={(e) => setAgencyAssignmentFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="text-sm font-medium">
                                End date
                                <input
                                    type="date"
                                    value={agencyAssignmentFilters.endDate}
                                    onChange={(e) => setAgencyAssignmentFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </label>
                        </div>
                        {agencyAssignmentError && (
                            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                                {agencyAssignmentError}
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cashier</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Agency</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Town</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Work Town</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Period</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Assigned On</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agencyAssignmentsLoading ? (
                                    <tr>
                                        <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : pagedAgencyAssignments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No agency assignments found
                                        </td>
                                    </tr>
                                ) : (
                                    pagedAgencyAssignments.map((assignment) => {
                                        const now = new Date();
                                        const endDate = assignment.end_on ? new Date(assignment.end_on) : null;
                                        const isActive = !endDate || endDate >= now;
                                        const isStopping = stoppingAssignmentId === assignment.id;
                                        const startIso = assignment.start_on
                                            ? new Date(assignment.start_on).toISOString().split("T")[0]
                                            : "";
                                        const endIso = assignment.end_on
                                            ? new Date(assignment.end_on).toISOString().split("T")[0]
                                            : "";
                                        return (
                                            <tr
                                                key={assignment.id}
                                                className="border-b hover:bg-muted/50 cursor-pointer"
                                                onClick={() => {
                                                    const params = new URLSearchParams();
                                                    params.set("cashierId", assignment.cashier.id);
                                                    if (startIso) params.set("start", startIso);
                                                    if (endIso) {
                                                        params.set("end", endIso);
                                                    } else {
                                                        params.set("end", new Date().toISOString().split("T")[0]);
                                                    }
                                                    router.push(`/admin/sessions?${params.toString()}`);
                                                }}
                                            >
                                                <td className="p-4 align-middle font-medium">
                                                    {assignment.cashier.user_first_name}{" "}
                                                    <span className="text-xs text-muted-foreground">({assignment.cashier.user_name})</span>
                                                </td>
                                                <td className="p-4 align-middle">{assignment.agency.name}</td>
                                                <td className="p-4 align-middle">
                                                    {assignment.agency.town}, {assignment.agency.country}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {assignment.cashier.cashierProfile?.work_town || "-"}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <div>
                                                            {assignment.start_on
                                                                ? format(new Date(assignment.start_on), "dd/MM/yyyy")
                                                                : "-"}{" "}
                                                            →{" "}
                                                            {assignment.end_on
                                                                ? format(new Date(assignment.end_on), "dd/MM/yyyy")
                                                                : "-"}
                                                        </div>
                                                        <span
                                                            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                                                            }`}
                                                        >
                                                            {isActive ? "ACTIVE" : "EXPIRED"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {format(new Date(assignment.assigned_on), "dd/MM/yyyy HH:mm")}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            stopAgencyAssignment(assignment.id);
                                                        }}
                                                        disabled={!isActive || isStopping}
                                                        className="inline-flex items-center justify-center rounded-md border border-destructive px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isStopping ? "Stopping..." : "Stop"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <TablePagination
                            page={agencyPage}
                            totalPages={agencyTotalPages}
                            onPageChange={setAgencyPage}
                        />
                    </div>
                </div>
            )}

            {showRegisterAssignment && (
                <div className="rounded-xl border bg-card p-4">
                    <h3 className="font-semibold mb-2">Assign a register</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Choose a register and a cashier, then start the assignment (cash breakdown required).
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm font-medium">
                            Caisse
                            <select
                                value={selectedRegisterId}
                                onChange={(e) => setSelectedRegisterId(e.target.value)}
                                disabled={registersLoading}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            >
                                <option value="">Select...</option>
                                {availableRegisters.map((reg) => (
                                    <option key={reg.id} value={reg.id}>
                                        {registerLabel(reg)}
                                    </option>
                                ))}
                    </select>
                </label>
                <label className="text-sm font-medium">
                    Cashier (authorized town)
                    <input
                        type="text"
                        value={cashierSearch}
                        onChange={(e) => setCashierSearch(e.target.value)}
                        placeholder="Search name or phone"
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            />
                            <select
                                value={selectedCashierId}
                                onChange={(e) => setSelectedCashierId(e.target.value)}
                                disabled={!selectedRegister || filteredSelectableCashiers.length === 0}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            >
                                <option value="">Select...</option>
                                {filteredSelectableCashiers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.user_first_name} ({c.user_name})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => selectedRegisterId && openAssignDialog(selectedRegisterId)}
                                disabled={!selectedRegisterId || selectableCashiers.length === 0}
                                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 w-full md:w-auto"
                            >
                                Assigner (billetage)
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
