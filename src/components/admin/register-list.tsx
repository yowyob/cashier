"use client";

import { Fragment, useEffect, useState } from "react";
import { format } from "date-fns";
import { TablePagination } from "@/components/ui/table-pagination";

interface Register {
    id: string;
    town: string | null;
    country: string | null;
    neighborhood?: string | null;
    adress?: string | null;
    create_on?: Date | string;
    ip_address?: string | null;
    mac_address?: string | null;
    min_open_time?: string | null;
    max_close_time?: string | null;
    sale_agent_bank_account?: string | null;
    sale_agent_accounting_account?: string | null;
    agency?: {
        id?: string;
        name: string;
        country?: string | null;
        town?: string | null;
        neighborhood?: string | null;
    } | null;
    is_active: boolean;
    assignedCashier?: {
        user_name: string;
        user_first_name: string;
    } | null;
    sessions?: {
        state: string;
        open_on: Date;
        theorical_initial_funds: number;
        theorical_close_funds: number | null;
    }[];
}

interface MovementDetail {
    id: string;
    sense: string;
    amount: number;
    reason: string | null;
    create_on: Date | string;
    creator?: {
        user_first_name: string;
    } | null;
    ticketingDetails?: TicketingDetail[];
}

interface TicketingDetail {
    id: string;
    connection_type: string;
    quantity: number;
    value: number;
    total: number;
    denomination?: {
        value: number;
        label?: string | null;
    } | null;
}

interface ReconciliationDetail {
    theorical_total: number;
    physical_total: number;
    difference: number;
    justification?: string | null;
}

interface SessionDetail {
    id: string;
    state: string;
    open_on: Date | string;
    close_on: Date | string | null;
    theorical_initial_funds: number;
    theorical_close_funds: number | null;
    is_locked: boolean;
    opener?: {
        user_first_name: string;
        user_name: string;
    } | null;
    closer?: {
        user_first_name: string;
    } | null;
    movements: MovementDetail[];
    ticketingDetails: TicketingDetail[];
    reconciliation?: ReconciliationDetail | null;
}

interface RegisterDetail {
    id: string;
    town: string | null;
    country: string | null;
    neighborhood?: string | null;
    adress?: string | null;
    create_on?: Date | string | null;
    ip_address?: string | null;
    mac_address?: string | null;
    min_open_time?: string | null;
    max_close_time?: string | null;
    sale_agent_bank_account?: string | null;
    sale_agent_accounting_account?: string | null;
    is_active: boolean;
    agency?: {
        id?: string;
        name?: string;
        country?: string | null;
        town?: string | null;
        neighborhood?: string | null;
    } | null;
    assignedCashier?: {
        user_name: string;
        user_first_name: string;
    } | null;
    sessions: SessionDetail[];
}

interface RegisterListProps {
    registers: Register[];
    hideTownAgency?: boolean;
    canManage?: boolean;
}

function normalizeTicketingDetail(detail: any): TicketingDetail {
    if (!detail) return detail;
    const denomination = detail.denomination
        ? {
            ...detail.denomination,
            value: detail.denomination.value != null ? Number(detail.denomination.value) : detail.denomination.value
        }
        : detail.denomination;
    return {
        ...detail,
        quantity: detail.quantity != null ? Number(detail.quantity) : detail.quantity,
        value: detail.value != null ? Number(detail.value) : detail.value,
        total: detail.total != null ? Number(detail.total) : detail.total,
        denomination
    };
}

function normalizeMovement(movement: any): MovementDetail {
    if (!movement) return movement;
    const ticketingSource = movement.ticketingDetails ?? movement.ticketing_details ?? [];
    return {
        ...movement,
        amount: movement.amount != null ? Number(movement.amount) : movement.amount,
        ticketingDetails: Array.isArray(ticketingSource)
            ? ticketingSource.map(normalizeTicketingDetail)
            : []
    };
}

function normalizeReconciliation(reconciliation: any): ReconciliationDetail | null {
    if (!reconciliation) return null;
    return {
        ...reconciliation,
        theorical_total: reconciliation.theorical_total != null
            ? Number(reconciliation.theorical_total)
            : reconciliation.theorical_total,
        physical_total: reconciliation.physical_total != null
            ? Number(reconciliation.physical_total)
            : reconciliation.physical_total,
        difference: reconciliation.difference != null ? Number(reconciliation.difference) : reconciliation.difference
    };
}

function normalizeSessionDetail(session: any): SessionDetail {
    if (!session) return session;
    const ticketingSource = session.ticketingDetails ?? session.ticketing_details ?? [];
    return {
        ...session,
        theorical_initial_funds: session.theorical_initial_funds != null
            ? Number(session.theorical_initial_funds)
            : session.theorical_initial_funds,
        theorical_close_funds: session.theorical_close_funds != null
            ? Number(session.theorical_close_funds)
            : session.theorical_close_funds,
        movements: Array.isArray(session.movements) ? session.movements.map(normalizeMovement) : [],
        ticketingDetails: Array.isArray(ticketingSource) ? ticketingSource.map(normalizeTicketingDetail) : [],
        reconciliation: normalizeReconciliation(session.reconciliation)
    };
}

function normalizeRegisterDetail(register: any): RegisterDetail {
    if (!register) return register;
    return {
        ...register,
        assignedCashier: register.assignedCashier ?? register.assigned_cashier ?? null,
        sessions: Array.isArray(register.sessions)
            ? register.sessions.map(normalizeSessionDetail)
            : []
    };
}

function RegisterEditModal({
    register,
    onClose
}: {
    register: Register;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState({
        ip_address: register.ip_address || "",
        mac_address: register.mac_address || "",
        min_open_time: register.min_open_time || "",
        max_close_time: register.max_close_time || "",
        sale_agent_bank_account: register.sale_agent_bank_account || "",
        sale_agent_accounting_account: register.sale_agent_accounting_account || "",
        is_active: register.is_active
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleUpdate() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/cash-registers/${register.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ip_address: draft.ip_address || null,
                    mac_address: draft.mac_address || null,
                    is_active: draft.is_active,
                    min_open_time: draft.min_open_time || null,
                    max_close_time: draft.max_close_time || null,
                    sale_agent_bank_account: draft.sale_agent_bank_account || null,
                    sale_agent_accounting_account: draft.sale_agent_accounting_account || null
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to update register");
            onClose();
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Edit Register</h3>
                    <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <label className="space-y-1">
                        <span className="font-medium">Country</span>
                        <input
                            value={register.country || ""}
                            disabled
                            className="w-full rounded-md border px-2 py-1 bg-muted/40 text-muted-foreground"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">Town</span>
                        <input
                            value={register.town || ""}
                            disabled
                            className="w-full rounded-md border px-2 py-1 bg-muted/40 text-muted-foreground"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">Neighborhood</span>
                        <input
                            value={register.neighborhood || ""}
                            disabled
                            className="w-full rounded-md border px-2 py-1 bg-muted/40 text-muted-foreground"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">IP</span>
                        <input
                            value={draft.ip_address}
                            onChange={(e) => setDraft({ ...draft, ip_address: e.target.value })}
                            className="w-full rounded-md border px-2 py-1"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">MAC</span>
                        <input
                            value={draft.mac_address}
                            onChange={(e) => setDraft({ ...draft, mac_address: e.target.value })}
                            className="w-full rounded-md border px-2 py-1"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">Min Open Time</span>
                        <input
                            type="time"
                            value={draft.min_open_time}
                            onChange={(e) => setDraft({ ...draft, min_open_time: e.target.value })}
                            className="w-full rounded-md border px-2 py-1"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">Max Close Time</span>
                        <input
                            type="time"
                            value={draft.max_close_time}
                            onChange={(e) => setDraft({ ...draft, max_close_time: e.target.value })}
                            className="w-full rounded-md border px-2 py-1"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">Agent bank account</span>
                        <input
                            value={draft.sale_agent_bank_account}
                            onChange={(e) => setDraft({ ...draft, sale_agent_bank_account: e.target.value })}
                            className="w-full rounded-md border px-2 py-1"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="font-medium">Agent accounting account</span>
                        <input
                            value={draft.sale_agent_accounting_account}
                            onChange={(e) => setDraft({ ...draft, sale_agent_accounting_account: e.target.value })}
                            className="w-full rounded-md border px-2 py-1"
                        />
                    </label>
                    <label className="flex items-center gap-2 mt-4">
                        <input
                            type="checkbox"
                            checked={draft.is_active}
                            onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                        />
                        <span className="text-sm font-medium">Active</span>
                    </label>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RegisterDeleteModal({
    register,
    onClose
}: {
    register: Register;
    onClose: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDelete() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/cash-registers/${register.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to delete register");
            onClose();
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <h3 className="font-semibold text-lg">Delete register?</h3>
                <p className="text-sm text-muted-foreground">
                    This action deletes the register only if it has no open session and no assignment.
                </p>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-destructive text-white px-4 py-2 text-sm disabled:opacity-50"
                    >
                        {saving ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function RegisterList({ registers, hideTownAgency, canManage = false }: RegisterListProps) {
    const [search, setSearch] = useState("");
    const [sessionFilter, setSessionFilter] = useState<"all" | "open" | "closed">("all");
    const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
    const [expandedRegisterId, setExpandedRegisterId] = useState<string | null>(null);
    const [detailsByRegister, setDetailsByRegister] = useState<Record<string, RegisterDetail>>({});
    const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [activeTabByRegister, setActiveTabByRegister] = useState<Record<string, "info" | "sessions">>({});
    const [expandedSessionByRegister, setExpandedSessionByRegister] = useState<Record<string, string | null>>({});
    const [ticketingExpandedBySession, setTicketingExpandedBySession] = useState<Record<string, { open: boolean; close: boolean }>>({});
    const [movementFilterBySession, setMovementFilterBySession] = useState<Record<string, string>>({});
    const [movementPageBySession, setMovementPageBySession] = useState<Record<string, number>>({});
    const [activeModal, setActiveModal] = useState<{
        type: "edit" | "delete";
        register: Register;
    } | null>(null);
    const [page, setPage] = useState(1);
    const colSpan = hideTownAgency ? 4 : 7;

    const canManageRegister = (register: Register) => {
        const latestSession = register.sessions?.[0];
        const isSessionOpen = latestSession?.state === 'ouverte';
        return !isSessionOpen || !register.assignedCashier;
    };

    const toggleRegister = async (registerId: string) => {
        if (expandedRegisterId === registerId) {
            setExpandedRegisterId(null);
            return;
        }
        setExpandedRegisterId(registerId);
        setDetailsError(null);
        setActiveTabByRegister((prev) => ({
            ...prev,
            [registerId]: prev[registerId] || "info"
        }));
        setExpandedSessionByRegister((prev) => ({
            ...prev,
            [registerId]: prev[registerId] || null
        }));
        if (!detailsByRegister[registerId]) {
            setDetailsLoadingId(registerId);
            try {
                const res = await fetch(`/api/cash-registers/${registerId}`);
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error || "Failed to load register details");
                const payload = body?.data ?? body;
                setDetailsByRegister((prev) => ({
                    ...prev,
                    [registerId]: normalizeRegisterDetail(payload)
                }));
            } catch (err: any) {
                setDetailsError(err.message || "Failed to load register details");
            } finally {
                setDetailsLoadingId(null);
            }
        }
    };

    const toggleSession = (registerId: string, sessionId: string) => {
        setExpandedSessionByRegister((prev) => ({
            ...prev,
            [registerId]: prev[registerId] === sessionId ? null : sessionId
        }));
    };

    const toggleTicketing = (sessionId: string, type: "open" | "close") => {
        setTicketingExpandedBySession((prev) => {
            const current = prev[sessionId] || { open: false, close: false };
            return {
                ...prev,
                [sessionId]: { ...current, [type]: !current[type] }
            };
        });
    };

    const filteredRegisters = registers.filter((register) => {
        const latestSession = register.sessions?.[0];
        const isSessionOpen = latestSession?.state === 'ouverte';
        const isAssigned = !!register.assignedCashier;

        const matchesSession =
            sessionFilter === "all" ||
            (sessionFilter === "open" ? isSessionOpen : !isSessionOpen);
        const matchesAssignment =
            assignmentFilter === "all" ||
            (assignmentFilter === "assigned" ? isAssigned : !isAssigned);

        const text = [
            register.town,
            register.country,
            register.neighborhood,
            register.agency?.name,
            register.ip_address,
            register.mac_address
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());

        return matchesSession && matchesAssignment && matchesSearch;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredRegisters.length / pageSize));
    const pagedRegisters = filteredRegisters.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, sessionFilter, assignmentFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="rounded-md border">
            <div className="flex flex-col gap-3 border-b bg-muted/30 p-4">
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter by town, agency, IP or MAC"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <select
                        value={sessionFilter}
                        onChange={(e) => setSessionFilter(e.target.value as any)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">Sessions: all</option>
                        <option value="open">Sessions: open</option>
                        <option value="closed">Sessions: closed</option>
                    </select>
                    <select
                        value={assignmentFilter}
                        onChange={(e) => setAssignmentFilter(e.target.value as any)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">Assignment: all</option>
                        <option value="assigned">Assigned</option>
                        <option value="unassigned">Unassigned</option>
                    </select>
                </div>
            </div>
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        {!hideTownAgency && (
                            <>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Town</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Agency</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">City</th>
                            </>
                        )}

                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">IP</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Assigned To</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Session Status</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {pagedRegisters.map((register) => {
                        const latestSession = register.sessions?.[0];
                        const isSessionOpen = latestSession?.state === 'ouverte';
                        const isExpanded = expandedRegisterId === register.id;
                        const details = detailsByRegister[register.id];
                        const activeTab = activeTabByRegister[register.id] || "info";
                        const expandedSessionId = expandedSessionByRegister[register.id] || null;

                        return (
                            <Fragment key={register.id}>
                                <tr
                                    onClick={() => toggleRegister(register.id)}
                                    className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`}
                                >
                                    {!hideTownAgency && (
                                        <>
                                            <td className="p-4 align-middle">{register.town}</td>
                                            <td className="p-4 align-middle">{register.agency?.name || "-"}</td>
                                            <td className="p-4 align-middle text-muted-foreground">{register.neighborhood || "-"}</td>
                                        </>
                                    )}

                                    <td className="p-4 align-middle text-xs font-mono text-muted-foreground">
                                        {register.ip_address || "-"}
                                    </td>
                                    <td className="p-4 align-middle">
                                        {register.assignedCashier ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{register.assignedCashier.user_first_name}</span>
                                                <span className="text-xs text-muted-foreground">{register.assignedCashier.user_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isSessionOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {latestSession ? latestSession.state : 'No Session'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex justify-end gap-1">
                                            {canManage && canManageRegister(register) && (
                                                <>
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setActiveModal({ type: "edit", register });
                                                        }}
                                                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setActiveModal({ type: "delete", register });
                                                        }}
                                                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-destructive text-destructive hover:bg-destructive/10 h-7 px-2"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="border-b">
                                        <td colSpan={colSpan} className="bg-muted/20 p-4">
                                            <div className="space-y-4">
                                                {detailsLoadingId === register.id && (
                                                    <div className="text-sm text-muted-foreground">Loading register details...</div>
                                                )}
                                                {detailsError && (
                                                    <div className="text-sm text-destructive">{detailsError}</div>
                                                )}
                                                {details && (
                                                    <>
                                                        <div className="flex flex-wrap gap-2 border-b">
                                                            <button
                                                                onClick={() => setActiveTabByRegister((prev) => ({ ...prev, [register.id]: "info" }))}
                                                                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                                                                    activeTab === "info"
                                                                        ? "border-primary text-primary"
                                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                Register Info
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveTabByRegister((prev) => ({ ...prev, [register.id]: "sessions" }))}
                                                                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                                                                    activeTab === "sessions"
                                                                        ? "border-primary text-primary"
                                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                Sessions ({details.sessions.length})
                                                            </button>
                                                        </div>
                                                        {activeTab === "info" ? (
                                                            <div className="grid gap-3 md:grid-cols-2 text-sm">
                                                                <div className="rounded-md border bg-background p-3 space-y-1">
                                                                    <div className="text-xs text-muted-foreground">Agency</div>
                                                                    <div className="font-medium">{details.agency?.name || "Not linked"}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {[details.agency?.town, details.agency?.country].filter(Boolean).join(", ") || "-"}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-md border bg-background p-3 space-y-1">
                                                                    <div className="text-xs text-muted-foreground">Location</div>
                                                                    <div className="font-medium">{details.town || "-"}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {[details.neighborhood, details.country].filter(Boolean).join(", ") || "-"}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-md border bg-background p-3 space-y-1">
                                                                    <div className="text-xs text-muted-foreground">Network</div>
                                                                    <div className="font-medium text-xs font-mono">{details.ip_address || "-"}</div>
                                                                    <div className="text-xs text-muted-foreground">MAC: {details.mac_address || "-"}</div>
                                                                </div>
                                                                <div className="rounded-md border bg-background p-3 space-y-1">
                                                                    <div className="text-xs text-muted-foreground">Operating Hours</div>
                                                                    <div className="font-medium">
                                                                        {details.min_open_time || "--:--"} → {details.max_close_time || "--:--"}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Status: {details.is_active ? "Active" : "Inactive"}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-md border bg-background p-3 space-y-1 md:col-span-2">
                                                                    <div className="text-xs text-muted-foreground">Assigned Cashier</div>
                                                                    {details.assignedCashier ? (
                                                                        <div className="font-medium">
                                                                            {details.assignedCashier.user_first_name} ({details.assignedCashier.user_name})
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-muted-foreground italic">Unassigned</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {details.sessions.length === 0 ? (
                                                                    <div className="text-sm text-muted-foreground">No sessions found for this register.</div>
                                                                ) : (
                                                                    details.sessions.map((sessionItem) => {
                                                                        const isSessionExpanded = expandedSessionId === sessionItem.id;
                                                                        const ticketingState = ticketingExpandedBySession[sessionItem.id] || { open: false, close: false };
                                                                        const ticketingDetails = sessionItem.ticketingDetails || [];
                                                                        const openingTicketing = ticketingDetails.filter(
                                                                            (detail) => detail.connection_type === "session_ouverture"
                                                                        );
                                                                        const closingTicketing = ticketingDetails.filter(
                                                                            (detail) => detail.connection_type === "session_fermeture"
                                                                        );
                                                                        const movementFilter = movementFilterBySession[sessionItem.id] || "";
                                                                        const filteredMovements = sessionItem.movements.filter((movement) => {
                                                                            if (!movementFilter) return true;
                                                                            const text = [
                                                                                movement.sense,
                                                                                movement.reason,
                                                                                movement.creator?.user_first_name,
                                                                                movement.amount?.toString(),
                                                                                movement.create_on ? format(new Date(movement.create_on), "dd/MM/yyyy HH:mm") : ""
                                                                            ]
                                                                                .filter(Boolean)
                                                                                .join(" ")
                                                                                .toLowerCase();
                                                                            return text.includes(movementFilter.toLowerCase());
                                                                        });
                                                                        const movementPageSize = 20;
                                                                        const movementTotalPages = Math.max(
                                                                            1,
                                                                            Math.ceil(filteredMovements.length / movementPageSize)
                                                                        );
                                                                        const movementPage = Math.min(
                                                                            movementPageBySession[sessionItem.id] || 1,
                                                                            movementTotalPages
                                                                        );
                                                                        const pagedMovements = filteredMovements.slice(
                                                                            (movementPage - 1) * movementPageSize,
                                                                            movementPage * movementPageSize
                                                                        );
                                                                        return (
                                                                            <div key={sessionItem.id} className="rounded-md border bg-background">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => toggleSession(register.id, sessionItem.id)}
                                                                                    className="w-full text-left p-3 hover:bg-muted/30 transition"
                                                                                >
                                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                        <div className="space-y-1">
                                                                                            <div className="font-medium">
                                                                                                {format(new Date(sessionItem.open_on), "dd/MM/yyyy HH:mm")}
                                                                                            </div>
                                                                                            <div className="text-xs text-muted-foreground">
                                                                                                Opened by {sessionItem.opener?.user_first_name || "-"} · {sessionItem.state}
                                                                                                {sessionItem.is_locked ? " · Locked" : ""}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="text-xs text-muted-foreground">
                                                                                            Closed: {sessionItem.close_on ? format(new Date(sessionItem.close_on), "dd/MM/yyyy HH:mm") : "Not closed"}
                                                                                        </div>
                                                                                    </div>
                                                                                </button>
                                                                                {isSessionExpanded && (
                                                                                    <div className="border-t p-3 space-y-3">
                                                                                        <div className="grid gap-3 md:grid-cols-3 text-sm">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => toggleTicketing(sessionItem.id, "open")}
                                                                                                className="rounded-md border bg-muted/30 p-2 text-left hover:bg-muted/40 transition"
                                                                                            >
                                                                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                                                    <span>Opening Funds</span>
                                                                                                    <span>{ticketingState.open ? "Hide ticketing" : "View ticketing"}</span>
                                                                                                </div>
                                                                                                <div className="font-semibold">
                                                                                                    {Number(sessionItem.theorical_initial_funds).toLocaleString()} XAF
                                                                                                </div>
                                                                                                <div className="text-xs text-muted-foreground">
                                                                                                    Ticketing: {openingTicketing.length}
                                                                                                </div>
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => toggleTicketing(sessionItem.id, "close")}
                                                                                                className="rounded-md border bg-muted/30 p-2 text-left hover:bg-muted/40 transition"
                                                                                            >
                                                                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                                                    <span>Closing Funds</span>
                                                                                                    <span>{ticketingState.close ? "Hide ticketing" : "View ticketing"}</span>
                                                                                                </div>
                                                                                                <div className="font-semibold">
                                                                                                    {sessionItem.theorical_close_funds !== null
                                                                                                        ? `${Number(sessionItem.theorical_close_funds).toLocaleString()} XAF`
                                                                                                        : "Not closed"}
                                                                                                </div>
                                                                                                <div className="text-xs text-muted-foreground">
                                                                                                    Ticketing: {closingTicketing.length}
                                                                                                </div>
                                                                                            </button>
                                                                                            <div className="rounded-md border bg-muted/30 p-2">
                                                                                                <div className="text-xs text-muted-foreground">Reconciliation</div>
                                                                                                {sessionItem.reconciliation ? (
                                                                                                    <div className="font-semibold">
                                                                                                        Diff: {Number(sessionItem.reconciliation.difference).toLocaleString()} XAF
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="text-muted-foreground">No reconciliation</div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        {ticketingState.open && (
                                                                                            <div className="space-y-2">
                                                                                                <div className="text-sm font-medium">Opening Ticketing</div>
                                                                                                {openingTicketing.length === 0 ? (
                                                                                                    <div className="text-xs text-muted-foreground">No opening ticketing details.</div>
                                                                                                ) : (
                                                                                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                                                                        {openingTicketing.map((detail) => (
                                                                                                            <div key={detail.id} className="rounded-md border p-2 text-xs">
                                                                                                                <div className="font-medium">
                                                                                                                    {detail.denomination?.label || `${detail.value.toLocaleString()} XAF`}
                                                                                                                </div>
                                                                                                                <div className="text-muted-foreground">x {detail.quantity}</div>
                                                                                                                <div className="font-semibold text-primary">
                                                                                                                    {detail.total.toLocaleString()} XAF
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                        {ticketingState.close && (
                                                                                            <div className="space-y-2">
                                                                                                <div className="text-sm font-medium">Closing Ticketing</div>
                                                                                                {closingTicketing.length === 0 ? (
                                                                                                    <div className="text-xs text-muted-foreground">No closing ticketing details.</div>
                                                                                                ) : (
                                                                                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                                                                        {closingTicketing.map((detail) => (
                                                                                                            <div key={detail.id} className="rounded-md border p-2 text-xs">
                                                                                                                <div className="font-medium">
                                                                                                                    {detail.denomination?.label || `${detail.value.toLocaleString()} XAF`}
                                                                                                                </div>
                                                                                                                <div className="text-muted-foreground">x {detail.quantity}</div>
                                                                                                                <div className="font-semibold text-primary">
                                                                                                                    {detail.total.toLocaleString()} XAF
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                        {sessionItem.reconciliation?.justification && (
                                                                                            <div className="text-sm">
                                                                                                <div className="text-xs text-muted-foreground">Justification</div>
                                                                                                <div>{sessionItem.reconciliation.justification}</div>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="space-y-2">
                                                                                            <div className="text-sm font-medium">
                                                                                                Transactions ({filteredMovements.length})
                                                                                            </div>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={movementFilter}
                                                                                                onChange={(event) => {
                                                                                                    const value = event.target.value;
                                                                                                    setMovementFilterBySession((prev) => ({
                                                                                                        ...prev,
                                                                                                        [sessionItem.id]: value
                                                                                                    }));
                                                                                                    setMovementPageBySession((prev) => ({
                                                                                                        ...prev,
                                                                                                        [sessionItem.id]: 1
                                                                                                    }));
                                                                                                }}
                                                                                                placeholder="Filter transactions (amount, reason, cashier, date)"
                                                                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                                                                            />
                                                                                            {filteredMovements.length === 0 ? (
                                                                                                <div className="text-xs text-muted-foreground">No transactions in this session.</div>
                                                                                            ) : (
                                                                                                <div className="rounded-md border overflow-hidden">
                                                                                                    <table className="w-full text-xs">
                                                                                                        <thead className="bg-muted/40 text-left">
                                                                                                            <tr>
                                                                                                                <th className="px-3 py-2 font-medium">Date</th>
                                                                                                                <th className="px-3 py-2 font-medium">Type</th>
                                                                                                                <th className="px-3 py-2 font-medium text-right">Amount</th>
                                                                                                                <th className="px-3 py-2 font-medium">Reason</th>
                                                                                                                <th className="px-3 py-2 font-medium">By</th>
                                                                                                            </tr>
                                                                                                        </thead>
                                                                                                        <tbody>
                                                                                                            {pagedMovements.map((movement) => (
                                                                                                                <tr key={movement.id} className="border-t">
                                                                                                                    <td className="px-3 py-2">
                                                                                                                        {format(new Date(movement.create_on), "dd/MM/yyyy HH:mm")}
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2 capitalize">{movement.sense}</td>
                                                                                                                    <td className="px-3 py-2 text-right">
                                                                                                                        {Number(movement.amount).toLocaleString()} XAF
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2">{movement.reason || "-"}</td>
                                                                                                                    <td className="px-3 py-2">{movement.creator?.user_first_name || "-"}</td>
                                                                                                                </tr>
                                                                                                            ))}
                                                                                                        </tbody>
                                                                                                    </table>
                                                                                                    <TablePagination
                                                                                                        page={movementPage}
                                                                                                        totalPages={movementTotalPages}
                                                                                                        onPageChange={(nextPage) =>
                                                                                                            setMovementPageBySession((prev) => ({
                                                                                                                ...prev,
                                                                                                                [sessionItem.id]: nextPage
                                                                                                            }))
                                                                                                        }
                                                                                                        className="border-t-0"
                                                                                                    />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

            {activeModal?.type === "edit" && (
                <RegisterEditModal
                    register={activeModal.register}
                    onClose={() => setActiveModal(null)}
                />
            )}
            {activeModal?.type === "delete" && (
                <RegisterDeleteModal
                    register={activeModal.register}
                    onClose={() => setActiveModal(null)}
                />
            )}
        </div>
    );
}
