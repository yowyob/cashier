"use client";

import { useEffect, useState } from "react";
import { TablePagination } from "@/components/ui/table-pagination";

type Session = {
    id: string;
    state: string;
    open_on: string | Date;
    close_on: string | Date | null;
    theorical_initial_funds: number;
    theorical_close_funds: number | null;
    cashRegister?: {
        town?: string | null;
        country?: string | null;
    } | null;
    opener?: {
        user_first_name?: string | null;
        user_name?: string | null;
    } | null;
    closer?: {
        user_first_name?: string | null;
    } | null;
};

export function SessionList() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
    const pagedSessions = sessions.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        let cancelled = false;

        async function fetchSessions() {
            try {
                const response = await fetch("/api/sessions");
                if (!response.ok) return;
                const data = await response.json();
                if (!cancelled) {
                    setSessions(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchSessions();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="rounded-md border">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Register</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cashier</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Open Time</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Close Time</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Initial Funds</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Closing Funds</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                Loading...
                            </td>
                        </tr>
                    ) : pagedSessions.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                No sessions found.
                            </td>
                        </tr>
                    ) : (
                        pagedSessions.map((session) => (
                            <tr key={session.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle">
                                    <div className="font-medium">{session.cashRegister?.town || "-"}</div>
                                    <div className="text-xs text-muted-foreground">{session.cashRegister?.country || "-"}</div>
                                </td>
                                <td className="p-4 align-middle">
                                    <div>{session.opener?.user_first_name || "-"}</div>
                                    <div className="text-xs text-muted-foreground">{session.opener?.user_name || "-"}</div>
                                </td>
                                <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${session.state === 'ouverte' ? 'bg-green-100 text-green-800' :
                                            session.state === 'fermee' ? 'bg-gray-100 text-gray-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {session.state}
                                    </span>
                                </td>
                                <td className="p-4 align-middle">{new Date(session.open_on).toLocaleString()}</td>
                                <td className="p-4 align-middle">{session.close_on ? new Date(session.close_on).toLocaleString() : '-'}</td>
                                <td className="p-4 align-middle text-right">{Number(session.theorical_initial_funds).toFixed(2)}</td>
                                <td className="p-4 align-middle text-right">{session.theorical_close_funds ? Number(session.theorical_close_funds).toFixed(2) : '-'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}
