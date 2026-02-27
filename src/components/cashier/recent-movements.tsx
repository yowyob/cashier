"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { TablePagination } from "@/components/ui/table-pagination";

type TicketingDetail = {
    denomination?: { label?: string | null; value?: number | null } | null;
    quantity: number;
    value: number;
    total: number;
};

type Movement = {
    id: string;
    sense: string;
    amount: number | string;
    reason?: string | null;
    create_on: string | Date;
    external_reference?: string | null;
    creator?: { user_first_name?: string | null; user_name?: string | null } | null;
    ticketingDetails?: TicketingDetail[] | null;
};

export function CashierRecentMovements({
    movements,
    registerName
}: {
    movements: Movement[];
    registerName?: string | null;
}) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [ticketingPageByMovement, setTicketingPageByMovement] = useState<Record<string, number>>({});

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil((movements || []).length / pageSize));
    const pagedMovements = (movements || []).slice((page - 1) * pageSize, page * pageSize);
    const ticketingPageSize = 20;

    useEffect(() => {
        if (!expandedId && pagedMovements.length > 0) {
            setExpandedId(String(pagedMovements[0].id));
        }
    }, [pagedMovements, expandedId]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const getDisplayReference = (movement: Movement) => {
        const reason = movement.reason || "";
        if (reason.toLowerCase().includes("facture")) {
            const parts = reason.split(":");
            return parts[parts.length - 1].trim();
        }
        return movement.external_reference || "-";
    };

    return (
        <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {(!movements || movements.length === 0) && (
                        <tr>
                            <td colSpan={4} className="p-4 text-center text-muted-foreground">No transactions yet.</td>
                        </tr>
                    )}
                    {pagedMovements.map((move) => {
                        const id = String(move.id);
                        const isExpanded = expandedId === id;
                        const amount = Number(move.amount);
                        return (
                            <React.Fragment key={id}>
                                <tr
                                    className={`border-b transition-colors cursor-pointer ${isExpanded ? "bg-muted/60" : "hover:bg-muted/50"}`}
                                    onClick={() => setExpandedId(isExpanded ? null : id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setExpandedId(isExpanded ? null : id);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-expanded={isExpanded}
                                >
                                    <td className="p-4 align-middle">{format(new Date(move.create_on), "HH:mm:ss")}</td>
                                    <td className="p-4 align-middle capitalize">{move.sense}</td>
                                    <td className={`p-4 align-middle font-medium ${move.sense === "entree" ? "text-green-600" : "text-red-600"}`}>
                                        {move.sense === "entree" ? "+" : "-"}{amount.toLocaleString()}
                                    </td>
                                    <td className="p-4 align-middle">{move.reason || "-"}</td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-muted/40">
                                        <td colSpan={4} className="p-4">
                                            <div className="grid gap-3 md:grid-cols-2 text-sm">
                                                <Detail label="Cashier" value={move.creator?.user_first_name || move.creator?.user_name || "-"} />
                                                <Detail label="Register" value={registerName || "-"} />
                                                <Detail label="Reference" value={getDisplayReference(move)} mono />
                                                <Detail label="Reason" value={move.reason || "-"} />
                                                <Detail label="Date" value={format(new Date(move.create_on), "dd/MM/yyyy HH:mm:ss")} />
                                                <Detail label="Amount" value={`${move.sense === "entree" ? "+" : "-"}${amount.toLocaleString()} XAF`} />
                                            </div>
                                            {move.ticketingDetails && move.ticketingDetails.length > 0 && (() => {
                                                const ticketingTotalPages = Math.max(
                                                    1,
                                                    Math.ceil(move.ticketingDetails.length / ticketingPageSize)
                                                );
                                                const ticketingPage = Math.min(
                                                    ticketingPageByMovement[id] || 1,
                                                    ticketingTotalPages
                                                );
                                                const pagedTicketing = move.ticketingDetails.slice(
                                                    (ticketingPage - 1) * ticketingPageSize,
                                                    ticketingPage * ticketingPageSize
                                                );
                                                return (
                                                    <div className="mt-4">
                                                        <div className="text-sm font-semibold mb-2">Billetage</div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs border">
                                                                <thead className="bg-muted/50">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left">Denomination</th>
                                                                        <th className="px-3 py-2 text-right">Qty</th>
                                                                        <th className="px-3 py-2 text-right">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                {pagedTicketing.map((d, idx) => (
                                                                    <tr key={idx} className="border-t">
                                                                        <td className="px-3 py-2">
                                                                            {d.denomination?.label || `${Number(d.value).toLocaleString()} XAF`}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right">{d.quantity}</td>
                                                                        <td className="px-3 py-2 text-right">{Number(d.total).toLocaleString()} XAF</td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                            <TablePagination
                                                                page={ticketingPage}
                                                                totalPages={ticketingTotalPages}
                                                                onPageChange={(nextPage) =>
                                                                    setTicketingPageByMovement((prev) => ({
                                                                        ...prev,
                                                                        [id]: nextPage
                                                                    }))
                                                                }
                                                                className="border-t-0"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={mono ? "font-mono" : ""}>{value}</span>
        </div>
    );
}
