"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { TablePagination } from "@/components/ui/table-pagination";

interface AuditEvent {
    id: string;
    type: string;
    date_time: string;
    payload: string | null;
    author?: {
        user_first_name?: string | null;
        user_name?: string | null;
        adminProfile?: { role_type: string; agency_id?: string | null } | null;
    } | null;
}

export default function AuditPage() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [agencyFilter, setAgencyFilter] = useState("");
    const [authorFilter, setAuthorFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    async function fetchEvents() {
        setLoading(true);
        setError(null);
        try {
            const url = new URL("/api/audit", window.location.origin);
            if (agencyFilter) url.searchParams.set("agencyId", agencyFilter);
            const res = await fetch(url.toString());
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to load audit logs");
            }
            const data = await res.json();
            setEvents(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agencyFilter]);

    const filteredEvents = events.filter((ev) => {
        const authorText = `${ev.author?.user_first_name || ""} ${ev.author?.user_name || ""}`.toLowerCase();
        if (authorFilter && !authorText.includes(authorFilter.toLowerCase())) return false;
        const evDate = new Date(ev.date_time);
        if (startDate) {
            const s = new Date(startDate);
            if (evDate < s) return false;
        }
        if (endDate) {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            if (evDate > e) return false;
        }
        return true;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
    const pagedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [agencyFilter, authorFilter, startDate, endDate]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="p-4 border-b flex flex-col gap-3">
                    <div className="space-y-1">
                        <h3 className="font-semibold">Recent events</h3>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 md:items-center md:flex-wrap">
                        <input
                            type="text"
                            value={agencyFilter}
                            onChange={(e) => setAgencyFilter(e.target.value)}
                            placeholder="Filter by agencyId"
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="text"
                            value={authorFilter}
                            onChange={(e) => setAuthorFilter(e.target.value)}
                            placeholder="Filter by author"
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <button
                            onClick={fetchEvents}
                            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Type</th>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Author</th>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Payload</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="h-24 text-center text-destructive">{error}</td></tr>
                            ) : pagedEvents.length === 0 ? (
                                <tr><td colSpan={4} className="h-24 text-center text-muted-foreground">No events</td></tr>
                            ) : (
                                pagedEvents.map((ev) => {
                                    const isExpanded = expandedId === ev.id;
                                    let payloadObj: any = null;
                                    let payloadText = "-";
                                    try {
                                        payloadObj = ev.payload ? JSON.parse(ev.payload) : null;
                                        payloadText = payloadObj ? JSON.stringify(payloadObj) : "-";
                                    } catch {
                                        payloadText = ev.payload || "-";
                                    }
                                    return (
                                        <React.Fragment key={ev.id}>
                                            <tr
                                                className={`border-b cursor-pointer hover:bg-muted/50 ${isExpanded ? "bg-muted/60" : ""}`}
                                                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                                            >
                                                <td className="p-4 align-middle text-muted-foreground">
                                                    {format(new Date(ev.date_time), "dd/MM/yyyy HH:mm:ss")}
                                                </td>
                                                <td className="p-4 align-middle font-medium">{ev.type}</td>
                                                <td className="p-4 align-middle text-sm">
                                                    {ev.author?.user_first_name || "-"}{" "}
                                                    <span className="text-muted-foreground text-xs">{ev.author?.user_name || ""}</span>
                                                </td>
                                                <td className="p-4 align-middle text-xs text-muted-foreground truncate max-w-xs">
                                                    {payloadText}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="border-b bg-muted/30">
                                                    <td colSpan={4} className="p-4 text-xs">
                                                        <div className="space-y-2">
                                                            <div className="font-semibold text-sm">Details</div>
                                                            <div className="grid md:grid-cols-2 gap-2">
                                                                <div>
                                                                    <div className="text-muted-foreground">Type</div>
                                                                    <div className="font-mono text-xs">{ev.type}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-muted-foreground">Date</div>
                                                                    <div className="font-mono text-xs">
                                                                        {format(new Date(ev.date_time), "dd/MM/yyyy HH:mm:ss")}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-muted-foreground">Author</div>
                                                                    <div className="font-mono text-xs">
                                                                        {ev.author?.user_first_name || "-"} ({ev.author?.user_name || "-"})
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-muted-foreground">Payload</div>
                                                                <pre className="text-xs bg-background/60 border rounded p-2 whitespace-pre-wrap break-words">
                                                                    {payloadObj ? JSON.stringify(payloadObj, null, 2) : (ev.payload || "-")}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
        </div>
    );
}
