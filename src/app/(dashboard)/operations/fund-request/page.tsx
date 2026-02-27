"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import { TablePagination } from "@/components/ui/table-pagination";

interface Movement {
    id: string;
    amount: number;
    reason: string | null;
    sense: string;
    create_on: string | Date;
    session: {
        cashRegister: {
            town: string | null;
            mac_address?: string | null;
        };
    };
    ticketingDetails?: {
        quantity: number;
        value: number;
        total: number;
        denomination?: {
            label: string;
            value: number;
        } | null;
    }[];
    sourceRegister?: {
        town: string | null;
        country: string | null;
        adress: string | null;
        mac_address?: string | null;
    } | null;
    destinationRegister?: {
        town: string | null;
        country: string | null;
        adress: string | null;
        mac_address?: string | null;
    } | null;
}

type RegisterWithAliases = {
    town: string | null;
    country: string | null;
    adress: string | null;
    mac_address?: string | null;
    macAddress?: string | null;
    city?: string | null;
};

type MovementWithAliases = Movement & {
    source_register?: RegisterWithAliases | null;
    sourceRegisterDto?: RegisterWithAliases | null;
    destination_register?: RegisterWithAliases | null;
    destinationRegisterDto?: RegisterWithAliases | null;
};

export default function FundRequestPage() {
    // Request Form
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("Besoin de liquidite");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [clientRef, setClientRef] = useState<string | null>(null);

    // History Table
    const [requests, setRequests] = useState<Movement[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [sourceMacFilter, setSourceMacFilter] = useState("");
    const [destMacFilter, setDestMacFilter] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [ticketingPageByRequest, setTicketingPageByRequest] = useState<Record<string, number>>({});
    const getSourceRegister = (req: Movement) => {
        const item = req as MovementWithAliases;
        return (
        req.sourceRegister ??
        item.source_register ??
        item.sourceRegisterDto ??
        null
        );
    };
    const getDestinationRegister = (req: Movement) => {
        const item = req as MovementWithAliases;
        return (
        req.destinationRegister ??
        item.destination_register ??
        item.destinationRegisterDto ??
        null
        );
    };

    const filteredRequests = requests.filter((req) => {
        const source = getSourceRegister(req);
        const destination = getDestinationRegister(req);
        const sourceMac = (source?.mac_address || source?.macAddress || "").toLowerCase();
        const destMac = (destination?.mac_address || destination?.macAddress || "").toLowerCase();
        const srcOk = sourceMacFilter ? sourceMac.includes(sourceMacFilter.toLowerCase()) : true;
        const dstOk = destMacFilter ? destMac.includes(destMacFilter.toLowerCase()) : true;
        return srcOk && dstOk;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
    const pagedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
        setExpandedId(null);
    }, [sourceMacFilter, destMacFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        fetchRequestHistory();
    }, []);

    async function fetchRequestHistory() {
        try {
            const response = await fetch("/api/cashier/fund-requests");
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error("Failed to fetch request history:", error);
        } finally {
            setHistoryLoading(false);
        }
    }

    async function handleRequest(e: React.FormEvent) {
        e.preventDefault();
        if (!amount) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const reference = clientRef || `REQ-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
            if (!clientRef) {
                setClientRef(reference);
            }
            const response = await fetch("/api/cashier/fund-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(amount),
                    reference,
                    reason: reason.trim() || "Besoin de liquidite",
                }),
            });

            const raw = await response.text();
            const res: { message?: string; error?: string; reference?: string } = raw
                ? JSON.parse(raw) as { message?: string; error?: string; reference?: string }
                : {};

            if (!response.ok) {
                throw new Error(res.message || res.error || "Fund request failed");
            }

            const refLabel = res.reference || reference;
            setSuccess(`Fund request successful! Reference: ${refLabel}`);
            setAmount("");
            setReason("Besoin de liquidite");
            setClientRef(null);

            // Refresh history
            fetchRequestHistory();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Fund request failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Fund Request</h1>
                <p className="text-muted-foreground">Request funds from other cash registers</p>
            </div>

            {/* Request Form */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">New Fund Request</h2>

                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Submit only the requested amount. The agency manager validates and adds funds from the session with denomination details.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 rounded-md bg-green-500/15 p-3 text-sm text-green-600">
                        {success}
                    </div>
                )}

                <form onSubmit={handleRequest} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Requested Amount (XAF)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            step="1"
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Enter amount to request..."
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Reason</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Reason for this fund request..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : (
                            <>
                                <ArrowDownToLine className="h-4 w-4" />
                                Request Funds
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Request History */}
            <div className="rounded-xl border bg-card">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Fund Request History</h2>
                    <p className="text-sm text-muted-foreground">Recent fund transfers (received or sent)</p>
                </div>
                <div className="overflow-x-auto">
                    <div className="flex flex-col md:flex-row gap-3 p-4">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-muted-foreground">Filter by source MAC</label>
                            <input
                                type="text"
                                value={sourceMacFilter}
                                onChange={(e) => setSourceMacFilter(e.target.value)}
                                placeholder="e.g. AA:BB:CC"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-muted-foreground">Filter by destination MAC</label>
                            <input
                                type="text"
                                value={destMacFilter}
                                onChange={(e) => setDestMacFilter(e.target.value)}
                                placeholder="e.g. DD:EE:FF"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Source (MAC)</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Destination (MAC)</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <tr>
                                    <td colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No fund requests yet
                                    </td>
                                </tr>
                            ) : (
                                pagedRequests.map((request) => {
                                    const isExpanded = expandedId === request.id;
                                    const source = getSourceRegister(request);
                                    const destination = getDestinationRegister(request);
                                    return (
                                        <React.Fragment key={request.id}>
                                            <tr
                                                className={`border-b hover:bg-muted/50 cursor-pointer ${isExpanded ? "bg-muted/60" : ""}`}
                                                onClick={() => setExpandedId(isExpanded ? null : request.id)}
                                            >
                                                <td className="p-4 align-middle">
                                                    {format(new Date(request.create_on), "dd/MM/yyyy HH:mm:ss")}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {source ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                Caisse {source.town || source.city || "Unknown"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                MAC: {source.mac_address || source.macAddress || "N/A"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Unknown</span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {destination ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                Caisse {destination.town || destination.city || "Unknown"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                MAC: {destination.mac_address || destination.macAddress || "N/A"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {request.reason || "Fund transfer"}
                                                </td>
                                                <td className="p-4 align-middle text-right font-medium text-green-600">
                                                    {request.sense === "sortie" ? "-" : "+"}{Number(request.amount).toLocaleString()} XAF
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-muted/20">
                                                    <td colSpan={5} className="p-4">
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            <div className="rounded-md border p-3">
                                                                <div className="text-xs text-muted-foreground">Source</div>
                                                                <div className="font-medium">{source?.town || source?.city || "Unknown"}</div>
                                                                <div className="text-xs text-muted-foreground">MAC: {source?.mac_address || source?.macAddress || "N/A"}</div>
                                                            </div>
                                                            <div className="rounded-md border p-3">
                                                                <div className="text-xs text-muted-foreground">Destination</div>
                                                                <div className="font-medium">{destination?.town || destination?.city || "Unknown"}</div>
                                                                <div className="text-xs text-muted-foreground">MAC: {destination?.mac_address || destination?.macAddress || "N/A"}</div>
                                                            </div>
                                                            <div className="rounded-md border p-3">
                                                                <div className="text-xs text-muted-foreground">Reason</div>
                                                                <div className="font-medium">{request.reason || "Fund transfer"}</div>
                                                            </div>
                                                            <div className="rounded-md border p-3">
                                                                <div className="text-xs text-muted-foreground">Amount</div>
                                                                <div className={`font-semibold ${request.sense === "sortie" ? "text-red-600" : "text-green-600"}`}>
                                                                    {request.sense === "sortie" ? "-" : "+"}{Number(request.amount).toLocaleString()} XAF
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {request.ticketingDetails && request.ticketingDetails.length > 0 && (() => {
                                                            const ticketingPageSize = 20;
                                                            const ticketingTotalPages = Math.max(
                                                                1,
                                                                Math.ceil(request.ticketingDetails.length / ticketingPageSize)
                                                            );
                                                            const ticketingPage = Math.min(
                                                                ticketingPageByRequest[request.id] || 1,
                                                                ticketingTotalPages
                                                            );
                                                            const pagedTicketing = request.ticketingDetails.slice(
                                                                (ticketingPage - 1) * ticketingPageSize,
                                                                ticketingPage * ticketingPageSize
                                                            );
                                                            return (
                                                            <div className="mt-4">
                                                                <div className="text-sm font-semibold mb-2">Billetage</div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm border">
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
                                                                                    <td className="px-3 py-2">{d.denomination?.label || `${Number(d.value).toLocaleString()} XAF`}</td>
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
                                                                            setTicketingPageByRequest((prev) => ({
                                                                                ...prev,
                                                                                [request.id]: nextPage
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
                                })
                            )}
                        </tbody>
                    </table>
                    <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}
