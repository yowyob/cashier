"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TicketingInput } from "@/components/cashier/ticketing-input";

type FundRequestRaw = Record<string, unknown>;

type FundRequestOption = {
    id: string;
    reference: string | null;
    amount: number | null;
    reason: string | null;
    status: string | null;
    sessionId: string | null;
    sourceMacAddress: string | null;
};

function asString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizeFundRequest(item: unknown): FundRequestOption | null {
    if (!item || typeof item !== "object") return null;
    const row = item as FundRequestRaw;
    const session = (row.session as Record<string, unknown> | undefined) || {};
    const requestSource = (row.sourceRegister as Record<string, unknown> | undefined) || {};
    const requestSourceSnake = (row.source_register as Record<string, unknown> | undefined) || {};

    const id =
        asString(row.id) ??
        asString(row.request_id) ??
        asString(row.requestId);
    if (!id) return null;

    return {
        id,
        reference: asString(row.reference),
        amount: asNumber(row.amount),
        reason: asString(row.reason),
        status: asString(row.status) ?? asString(row.statut),
        sessionId:
            asString(row.session_id) ??
            asString(row.destination_session_id) ??
            asString(row.dest_session_id) ??
            asString(session.id),
        sourceMacAddress:
            asString(row.source_mac_address) ??
            asString(row.sourceMacAddress) ??
            asString(requestSource.mac_address) ??
            asString(requestSource.macAddress) ??
            asString(requestSourceSnake.mac_address) ??
            asString(requestSourceSnake.macAddress)
    };
}

function isPendingStatus(status: string | null): boolean {
    const normalized = (status || "").toLowerCase();
    return normalized === "pending" || normalized === "en_attente" || normalized === "requested" || normalized === "open";
}

export default function AddSessionFundsPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [requestId, setRequestId] = useState("");
    const [selectedRequestId, setSelectedRequestId] = useState("");
    const [reference, setReference] = useState("");
    const [sourceMacAddress, setSourceMacAddress] = useState("");
    const [ticketingData, setTicketingData] = useState<{ total: number; denominations: Record<string, number> } | null>(null);
    const [pendingRequests, setPendingRequests] = useState<FundRequestOption[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [requestsError, setRequestsError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const selectedRequest = pendingRequests.find((req) => req.id === selectedRequestId) || null;

    useEffect(() => {
        let mounted = true;

        async function loadPendingRequests() {
            setRequestsLoading(true);
            setRequestsError(null);
            try {
                const response = await fetch("/api/cashier/fund-requests?status=pending", {
                    cache: "no-store"
                });
                const body = await response.json().catch(() => []);
                if (!response.ok) {
                    throw new Error((body as { error?: string })?.error || "Failed to load fund requests.");
                }

                const list = Array.isArray(body)
                    ? body.map(normalizeFundRequest).filter((req): req is FundRequestOption => Boolean(req))
                    : [];

                const pending = list.filter((req) => {
                    if (!isPendingStatus(req.status)) return false;
                    if (!req.sessionId) return true;
                    return req.sessionId === sessionId;
                });

                if (!mounted) return;
                setPendingRequests(pending);
                if (pending.length > 0) {
                    setSelectedRequestId(pending[0].id);
                }
            } catch (e: unknown) {
                if (!mounted) return;
                setRequestsError(e instanceof Error ? e.message : "Failed to load fund requests.");
            } finally {
                if (mounted) {
                    setRequestsLoading(false);
                }
            }
        }

        loadPendingRequests();
        return () => {
            mounted = false;
        };
    }, [sessionId]);

    useEffect(() => {
        if (!selectedRequest) return;
        setRequestId(selectedRequest.id);
        if (!reference.trim() && selectedRequest.reference) {
            setReference(`${selectedRequest.reference}-OK`);
        }
        if (!sourceMacAddress.trim() && selectedRequest.sourceMacAddress) {
            setSourceMacAddress(selectedRequest.sourceMacAddress);
        }
    }, [selectedRequest, reference, sourceMacAddress]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!requestId.trim()) {
            setError("Request ID is required.");
            return;
        }
        if (!reference.trim()) {
            setError("Funding reference is required.");
            return;
        }
        if (!sourceMacAddress.trim()) {
            setError("Source MAC address is required.");
            return;
        }
        if (!ticketingData || ticketingData.total <= 0) {
            setError("Billetage is required.");
            return;
        }
        if (selectedRequest?.amount != null && ticketingData.total !== selectedRequest.amount) {
            setError(`Billetage total (${ticketingData.total}) must match request amount (${selectedRequest.amount}).`);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                reference: reference.trim(),
                source_mac_address: sourceMacAddress.trim(),
                ticketing: ticketingData
            };
            const response = await fetch(`/api/cashier/fund-requests/${encodeURIComponent(requestId.trim())}/fund`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body?.error || "Failed to add funds.");
            }

            setSuccess("Fund request validated successfully.");
            setTimeout(() => {
                router.push("/admin/sessions");
                router.refresh();
            }, 700);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to add funds.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <Link href="/admin/sessions" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold">Add Funds To Session</h1>
            </div>

            <div className="rounded-xl border bg-card p-6">
                <p className="text-sm text-muted-foreground mb-4">
                    Session ID context: <span className="font-mono">{sessionId}</span>. Validate a cashier fund request with billetage.
                </p>
                {requestsError && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {requestsError}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 rounded-md bg-green-500/15 p-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                    {requestsLoading ? (
                        <div className="text-sm text-muted-foreground">Loading pending requests...</div>
                    ) : pendingRequests.length > 0 ? (
                        <label className="text-sm font-medium block">
                            Pending request
                            <select
                                required
                                value={selectedRequestId}
                                onChange={(e) => setSelectedRequestId(e.target.value)}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            >
                                {pendingRequests.map((req) => (
                                    <option key={req.id} value={req.id}>
                                        {`${req.reference || req.id} | ${req.amount != null ? `${req.amount.toLocaleString()} XAF` : "N/A"}${req.reason ? ` | ${req.reason}` : ""}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <label className="text-sm font-medium block">
                            Fund request ID
                            <input
                                required
                                value={requestId}
                                onChange={(e) => setRequestId(e.target.value)}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="Enter request UUID"
                            />
                        </label>
                    )}

                    {selectedRequest && (
                        <div className="rounded-md border bg-muted/20 p-3 text-sm">
                            <div><span className="font-medium">Request ID:</span> <span className="font-mono">{selectedRequest.id}</span></div>
                            <div><span className="font-medium">Amount:</span> {selectedRequest.amount != null ? `${selectedRequest.amount.toLocaleString()} XAF` : "-"}</div>
                            <div><span className="font-medium">Reason:</span> {selectedRequest.reason || "-"}</div>
                        </div>
                    )}

                    <label className="text-sm font-medium block">
                        Funding reference
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            placeholder="FR-001-OK"
                        />
                    </label>

                    <label className="text-sm font-medium block">
                        Source MAC address
                        <input
                            type="text"
                            value={sourceMacAddress}
                            onChange={(e) => setSourceMacAddress(e.target.value)}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            placeholder="00:11:22:33:44:55"
                        />
                    </label>

                    <TicketingInput
                        onTotalChange={(total, denominations) => setTicketingData({ total, denominations })}
                        initialTotal={0}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? "Adding..." : "Add Funds"}
                    </button>
                </form>
            </div>
        </div>
    );
}
