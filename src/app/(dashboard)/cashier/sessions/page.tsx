"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Download } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface TicketingDetail {
    id: string;
    quantity: number;
    denomination: {
        currency_value: number;
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
    theorical_initial_funds: number;
    theorical_close_funds: number | null;
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

export default function CashierSessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ticketing' | 'movements' | 'reconciliation'>('ticketing');
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchSessions();
    }, []);

    async function fetchSessions() {
        try {
            const response = await fetch("/api/cashier/sessions");
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
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

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
    const pagedSessions = sessions.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/cashier" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-8"></th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
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
                                    <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No sessions found
                                    </td>
                                </tr>
                            ) : (
                                pagedSessions.map((session) => (
                                    <>
                                        <tr key={session.id} className="border-b hover:bg-muted/50">
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
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${session.state === 'ouverte'
                                                        ? 'bg-green-100 text-green-800'
                                                        : session.state === 'fermee'
                                                            ? 'bg-gray-100 text-gray-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {session.state}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">{format(new Date(session.open_on), 'dd/MM/yyyy HH:mm')}</td>
                                            <td className="p-4 align-middle">{session.close_on ? format(new Date(session.close_on), 'dd/MM/yyyy HH:mm') : '-'}</td>
                                            <td className="p-4 align-middle text-right font-medium">{Number(session.theorical_initial_funds).toLocaleString()} XAF</td>
                                            <td className="p-4 align-middle text-right">
                                                {session.state === 'fermee' && (
                                                    <button
                                                        onClick={() => downloadSessionPDF(session.id)}
                                                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        PDF
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedSession === session.id && (
                                            <tr>
                                                <td colSpan={7} className="bg-muted/20 p-4">
                                                    <div className="space-y-4">
                                                        {/* Tabs */}
                                                        <div className="flex gap-2 border-b">
                                                            <button
                                                                onClick={() => setActiveTab('ticketing')}
                                                                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'ticketing'
                                                                        ? 'border-primary text-primary'
                                                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                            >
                                                                Opening Ticketing ({session.ticketingDetails.length})
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveTab('movements')}
                                                                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'movements'
                                                                        ? 'border-primary text-primary'
                                                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                            >
                                                                Movements ({session.movements.length})
                                                            </button>
                                                            {session.state === 'fermee' && session.reconciliation && (
                                                                <button
                                                                    onClick={() => setActiveTab('reconciliation')}
                                                                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'reconciliation'
                                                                            ? 'border-primary text-primary'
                                                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                                                        }`}
                                                                >
                                                                    Reconciliation
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Tab Content */}
                                                        {activeTab === 'ticketing' && (
                                                            <div className="space-y-2">
                                                                <h4 className="font-semibold text-sm">Opening Cash Denominations</h4>
                                                                {session.ticketingDetails.length === 0 ? (
                                                                    <p className="text-sm text-muted-foreground">No ticketing details</p>
                                                                ) : (
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {session.ticketingDetails.map((detail) => (
                                                                            <div key={detail.id} className="border rounded p-2 text-sm">
                                                                                <div className="font-medium">{detail.denomination.currency_value} XAF</div>
                                                                                <div className="text-muted-foreground">x {detail.quantity}</div>
                                                                                <div className="font-semibold text-primary">
                                                                                    {(detail.denomination.currency_value * detail.quantity).toLocaleString()} XAF
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {activeTab === 'movements' && (
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
                                                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${movement.sense === 'entree'
                                                                                                ? 'bg-green-100 text-green-800'
                                                                                                : 'bg-red-100 text-red-800'
                                                                                            }`}>
                                                                                            {movement.sense === 'entree' ? 'IN' : 'OUT'}
                                                                                        </span>
                                                                                        <span className="font-medium">{movement.reason || 'No reason'}</span>
                                                                                    </div>
                                                                                    <span className="font-semibold">{Number(movement.amount).toLocaleString()} XAF</span>
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                                    {format(new Date(movement.create_on), 'dd/MM/yyyy HH:mm')}
                                                                                </div>
                                                                                {movement.ticketingDetails.length > 0 && (
                                                                                    <div className="mt-2 pt-2 border-t">
                                                                                        <div className="text-xs font-medium mb-1">Denominations:</div>
                                                                                        <div className="flex gap-2 flex-wrap">
                                                                                            {movement.ticketingDetails.map((detail) => (
                                                                                                <span key={detail.id} className="text-xs bg-muted px-2 py-1 rounded">
                                                                                                    {detail.denomination.currency_value} x {detail.quantity}
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

                                                        {activeTab === 'reconciliation' && session.reconciliation && (
                                                            <div className="space-y-2">
                                                                <h4 className="font-semibold text-sm">Cash Reconciliation</h4>
                                                                <div className="grid grid-cols-3 gap-4">
                                                                    <div className="border rounded p-3">
                                                                        <div className="text-xs text-muted-foreground">Theoretical Total</div>
                                                                        <div className="text-lg font-semibold">{Number(session.reconciliation.theorical_total).toLocaleString()} XAF</div>
                                                                    </div>
                                                                    <div className="border rounded p-3">
                                                                        <div className="text-xs text-muted-foreground">Physical Total</div>
                                                                        <div className="text-lg font-semibold">{Number(session.reconciliation.physical_total).toLocaleString()} XAF</div>
                                                                    </div>
                                                                    <div className="border rounded p-3">
                                                                        <div className="text-xs text-muted-foreground">Difference</div>
                                                                        <div className={`text-lg font-semibold ${Number(session.reconciliation.difference) === 0
                                                                                ? 'text-green-600'
                                                                                : 'text-red-600'
                                                                            }`}>
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
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(next) => {
                        setPage(next);
                        setExpandedSession(null);
                    }}
                />
            </div>
        </div>
    );
}
