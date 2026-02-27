"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Download, Lock, Unlock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { TablePagination } from "@/components/ui/table-pagination";

interface TicketingDetail {
    id: string;
    quantity: number;
    denomination: {
        value: number;
    };
}

interface Movement {
    id: string;
    sense: string;
    amount: number;
    reason: string | null;
    create_on: Date;
    creator: {
        user_first_name: string;
    };
    ticketingDetails: TicketingDetail[];
}

interface Reconciliation {
    id: string;
    theorical_total: number;
    physical_total: number;
    difference: number;
}

interface Session {
    id: string;
    state: string;
    open_on: Date;
    close_on: Date | null;
    open_by: string;
    theorical_initial_funds: number;
    theorical_close_funds: number | null;
    is_locked: boolean;
    cashRegister: {
        town: string;
        country: string;
    };
    opener: {
        user_first_name: string;
        user_name: string;
    };
    closer: {
        user_first_name: string;
    } | null;
    movements: Movement[];
    ticketingDetails: TicketingDetail[];
    reconciliation: Reconciliation | null;
}

interface Props {
    canControl: boolean;
}

type FundRequestRaw = Record<string, unknown>;

function asString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function isPendingStatus(value: unknown): boolean {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    return normalized === "pending" || normalized === "en_attente" || normalized === "requested" || normalized === "open";
}

function extractSessionId(item: FundRequestRaw): string | null {
    const session = (item.session as Record<string, unknown> | undefined) || {};
    return (
        asString(item.session_id) ??
        asString(item.destination_session_id) ??
        asString(item.dest_session_id) ??
        asString(session.id)
    );
}

export function SessionsPageClient({ canControl }: Props) {
    const searchParams = useSearchParams();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ticketing' | 'movements' | 'events' | 'reconciliation'>('ticketing');
    const [initializedFilters, setInitializedFilters] = useState(false);
    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        locked: "all",
        startDate: "",
        endDate: "",
        cashierId: ""
    });
    const [page, setPage] = useState(1);
    const [pendingBySession, setPendingBySession] = useState<Record<string, number>>({});
    const [pendingUnscopedCount, setPendingUnscopedCount] = useState(0);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (!canControl) return;

        let mounted = true;
        async function fetchPendingFundRequests() {
            try {
                const response = await fetch("/api/cashier/fund-requests?status=pending", {
                    cache: "no-store"
                });
                if (!response.ok) return;
                const payload = await response.json().catch(() => []);
                if (!Array.isArray(payload)) return;

                const map: Record<string, number> = {};
                let unscoped = 0;
                for (const rawItem of payload) {
                    if (!rawItem || typeof rawItem !== "object") continue;
                    const item = rawItem as FundRequestRaw;
                    if (!isPendingStatus(item.status ?? item.statut)) continue;
                    const sessionId = extractSessionId(item);
                    if (!sessionId) {
                        unscoped += 1;
                        continue;
                    }
                    map[sessionId] = (map[sessionId] || 0) + 1;
                }

                if (mounted) {
                    setPendingBySession(map);
                    setPendingUnscopedCount(unscoped);
                }
            } catch {
                // Keep silent to avoid breaking sessions page if fund requests are unavailable.
            }
        }

        fetchPendingFundRequests();
        return () => {
            mounted = false;
        };
    }, [canControl]);

    useEffect(() => {
        if (initializedFilters) return;
        const cashierId = searchParams.get("cashierId") || "";
        const start = searchParams.get("start") || "";
        const end = searchParams.get("end") || "";
        if (cashierId || start || end) {
            setFilters((prev) => ({
                ...prev,
                cashierId: cashierId || prev.cashierId,
                startDate: start || prev.startDate,
                endDate: end || prev.endDate
            }));
        }
        setInitializedFilters(true);
    }, [searchParams, initializedFilters]);

    async function fetchSessions() {
        try {
            const response = await fetch("/api/sessions");
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    try {
                        const data = JSON.parse(text);
                        setSessions(data);
                    } catch (err) {
                        console.error("Failed to parse sessions response", err);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        } finally {
            setLoading(false);
        }
    }

    function toggleExpand(sessionId: string) {
        setExpandedSession(expandedSession === sessionId ? null : sessionId);
        setActiveTab('ticketing');
    }

    function downloadSessionPDF(sessionId: string) {
        window.open(`/api/reports/session/${sessionId}`, '_blank');
    }

    async function lockSession(sessionId: string) {
        if (!confirm("Are you sure you want to LOCK this session? The cashier will not be able to login.")) {
            return;
        }

        try {
            const response = await fetch(`/api/sessions/${sessionId}/lock`, {
                method: "POST"
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchSessions(); // Refresh
            } else {
                const error = await response.json();
                alert(error.error || "Failed to lock session");
            }
        } catch (error) {
            console.error("Failed to lock session:", error);
            alert("Failed to lock session");
        }
    }

    async function unlockSession(sessionId: string) {
        if (!confirm("Are you sure you want to UNLOCK this session? The cashier will be able to login again.")) {
            return;
        }

        try {
            const response = await fetch(`/api/sessions/${sessionId}/lock`, {
                method: "DELETE"
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchSessions(); // Refresh
            } else {
                const error = await response.json();
                alert(error.error || "Failed to unlock session");
            }
        } catch (error) {
            console.error("Failed to unlock session:", error);
            alert("Failed to unlock session");
        }
    }

    const filteredSessions = sessions.filter((session) => {
        const text = `${session.cashRegister.town} ${session.cashRegister.country} ${session.opener.user_first_name} ${session.opener.user_name}`.toLowerCase();
        const matchesSearch = !filters.search || text.includes(filters.search.toLowerCase());
        const matchesStatus = filters.status === "all" || session.state === filters.status;
        const matchesLock =
            filters.locked === "all" ||
            (filters.locked === "locked" ? session.is_locked : !session.is_locked);
        const openDate = new Date(session.open_on);
        const matchesStart = !filters.startDate || openDate >= new Date(filters.startDate);
        const matchesEnd = !filters.endDate || openDate <= new Date(`${filters.endDate}T23:59:59`);
        const matchesCashier = !filters.cashierId || session.open_by === filters.cashierId;
        return matchesSearch && matchesStatus && matchesLock && matchesStart && matchesEnd && matchesCashier;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
    const pagedSessions = filteredSessions.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [filters.search, filters.status, filters.locked, filters.startDate, filters.endDate, filters.cashierId]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm font-medium">
                        Search
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            placeholder="Register, cashier, country..."
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Status
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="all">All</option>
                            <option value="ouverte">Open</option>
                            <option value="fermee">Closed</option>
                            <option value="en_cloture">Closing</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Lock state
                        <select
                            value={filters.locked}
                            onChange={(e) => setFilters((prev) => ({ ...prev, locked: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="all">All</option>
                            <option value="locked">Locked</option>
                            <option value="unlocked">Unlocked</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Start date
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        End date
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                </div>
                {filters.cashierId && (
                    <div className="mt-3 text-xs text-muted-foreground">
                        Assignment filter active for cashier ID {filters.cashierId}.
                    </div>
                )}
            </div>

            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-8"></th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cashier</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Open Time</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Close Time</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Initial Funds</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No sessions found
                                    </td>
                                </tr>
                            ) : (
                                pagedSessions.map((session) => (
                                    <React.Fragment key={session.id}>
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="p-4 align-middle">
                                                <button
                                                    onClick={() => toggleExpand(session.id)}
                                                    className="hover:bg-accent rounded p-1"
                                                >
                                                    {expandedSession === session.id ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="font-medium">{session.cashRegister.town}</div>
                                                <div className="text-xs text-muted-foreground">{session.cashRegister.country}</div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div>{session.opener.user_first_name}</div>
                                                <div className="text-xs text-muted-foreground">{session.opener.user_name}</div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                            session.state === "ouverte"
                                                                ? "bg-green-100 text-green-800"
                                                                : session.state === "fermee"
                                                                ? "bg-gray-100 text-gray-800"
                                                                : "bg-yellow-100 text-yellow-800"
                                                        }`}
                                                    >
                                                        {session.state}
                                                    </span>
                                                    {session.is_locked && (
                                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                                                            <Lock className="h-3 w-3" />
                                                            LOCKED
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {format(new Date(session.open_on), "dd/MM/yyyy HH:mm")}
                                            </td>
                                            <td className="p-4 align-middle">
                                                {session.close_on ? format(new Date(session.close_on), "dd/MM/yyyy HH:mm") : "-"}
                                            </td>
                                            <td className="p-4 align-middle text-right font-medium">
                                                {Number(session.theorical_initial_funds).toLocaleString()} XAF
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canControl && session.state === "ouverte" && !session.is_locked && (
                                                        <Link
                                                            href={`/admin/sessions/${session.id}/close`}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-orange-600 text-white hover:bg-orange-700 text-sm font-medium"
                                                        >
                                                            Close Session
                                                        </Link>
                                                    )}
                                                    {canControl &&
                                                        session.state === "ouverte" &&
                                                        !session.is_locked &&
                                                        ((pendingBySession[session.id] || 0) > 0 || pendingUnscopedCount > 0) && (
                                                        <Link
                                                            href={`/admin/sessions/${session.id}/add-funds`}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                                                        >
                                                            Add Funds ({(pendingBySession[session.id] || 0) > 0 ? pendingBySession[session.id] : pendingUnscopedCount})
                                                        </Link>
                                                    )}

                                                    {canControl && session.state === "ouverte" && (
                                                        session.is_locked ? (
                                                            <button
                                                                onClick={() => unlockSession(session.id)}
                                                                className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                                                                title="Unlock session"
                                                            >
                                                                <Unlock className="h-4 w-4" />
                                                                Unlock
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => lockSession(session.id)}
                                                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                                                                title="Lock session"
                                                            >
                                                                <Lock className="h-4 w-4" />
                                                                Lock
                                                            </button>
                                                        )
                                                    )}

                                                    {session.state === "fermee" && (
                                                        <button
                                                            onClick={() => downloadSessionPDF(session.id)}
                                                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            PDF
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedSession === session.id && (
                                            <tr>
                                                <td colSpan={8} className="bg-muted/20 p-4">
                                                    <div className="space-y-4">
                                                        <div className="flex gap-2 border-b">
                                                            <button
                                                                onClick={() => setActiveTab("ticketing")}
                                                                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                                                    activeTab === "ticketing"
                                                                        ? "border-primary text-primary"
                                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                Opening Ticketing ({session.ticketingDetails.length})
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveTab("movements")}
                                                                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                                                    activeTab === "movements"
                                                                        ? "border-primary text-primary"
                                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                Movements ({session.movements.length})
                                                            </button>
                                                            {session.state === "fermee" && session.reconciliation && (
                                                                <button
                                                                    onClick={() => setActiveTab("reconciliation")}
                                                                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                                                        activeTab === "reconciliation"
                                                                            ? "border-primary text-primary"
                                                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                                                    }`}
                                                                >
                                                                    Reconciliation
                                                                </button>
                                                            )}
                                                        </div>

                                                        {activeTab === "ticketing" && (
                                                            <div className="space-y-2">
                                                                <h4 className="font-semibold text-sm">Opening Cash Denominations</h4>
                                                                {session.ticketingDetails.length === 0 ? (
                                                                    <p className="text-sm text-muted-foreground">No ticketing details</p>
                                                                ) : (
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {session.ticketingDetails.map((detail) => (
                                                                            <div key={detail.id} className="border rounded p-2 text-sm">
                                                                                <div className="font-medium">{detail.denomination.value} XAF</div>
                                                                                <div className="text-muted-foreground">x {detail.quantity}</div>
                                                                                <div className="font-semibold text-primary">
                                                                                    {(detail.denomination.value * detail.quantity).toLocaleString()} XAF
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {activeTab === "movements" && (
                                                            <div className="space-y-2">
                                                                <h4 className="font-semibold text-sm">Session Movements</h4>
                                                                {session.movements.length === 0 ? (
                                                                    <p className="text-sm text-muted-foreground">No movements</p>
                                                                ) : (
                                                                    <div className="space-y-1">
                                                                        {session.movements.map((movement) => (
                                                                            <div key={movement.id} className="border rounded p-3 text-sm">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span
                                                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                                                                movement.sense === "entree"
                                                                                                    ? "bg-green-100 text-green-800"
                                                                                                    : "bg-red-100 text-red-800"
                                                                                            }`}
                                                                                        >
                                                                                            {movement.sense === "entree" ? "IN" : "OUT"}
                                                                                        </span>
                                                                                        <span className="font-medium">{movement.reason || "No reason"}</span>
                                                                                        <span className="text-muted-foreground">{movement.creator.user_first_name}</span>
                                                                                    </div>
                                                                                    <span className="font-semibold">
                                                                                        {Number(movement.amount).toLocaleString()} XAF
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                                    {format(new Date(movement.create_on), "dd/MM/yyyy HH:mm")}
                                                                                </div>
                                                                                {movement.ticketingDetails.length > 0 && (
                                                                                    <div className="mt-2 pt-2 border-t">
                                                                                        <div className="text-xs font-medium mb-1">Denominations:</div>
                                                                                        <div className="flex gap-2 flex-wrap">
                                                                                            {movement.ticketingDetails.map((detail) => (
                                                                                                <span key={detail.id} className="text-xs bg-muted px-2 py-1 rounded">
                                                                                                    {detail.denomination.value} x {detail.quantity}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {activeTab === "reconciliation" && session.reconciliation && (
                                                            <div className="space-y-2">
                                                                <h4 className="font-semibold text-sm">Cash Reconciliation</h4>
                                                                <div className="grid grid-cols-3 gap-4">
                                                                    <div className="border rounded p-3">
                                                                        <div className="text-xs text-muted-foreground">Theoretical Total</div>
                                                                        <div className="text-lg font-semibold">
                                                                            {Number(session.reconciliation.theorical_total).toLocaleString()} XAF
                                                                        </div>
                                                                    </div>
                                                                    <div className="border rounded p-3">
                                                                        <div className="text-xs text-muted-foreground">Physical Total</div>
                                                                        <div className="text-lg font-semibold">
                                                                            {Number(session.reconciliation.physical_total).toLocaleString()} XAF
                                                                        </div>
                                                                    </div>
                                                                    <div className="border rounded p-3">
                                                                        <div className="text-xs text-muted-foreground">Difference</div>
                                                                        <div
                                                                            className={`text-lg font-semibold ${
                                                                                Number(session.reconciliation.difference) === 0
                                                                                    ? "text-green-600"
                                                                                    : "text-red-600"
                                                                            }`}
                                                                        >
                                                                            {Number(session.reconciliation.difference).toLocaleString()} XAF
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
        </div>
    );
}
