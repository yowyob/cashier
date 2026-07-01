"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";

type Notification = {
    id: string;
    organizationId?: string | null;
    channel?: string | null;
    subject?: string | null;
    recipient?: string | null;
    status?: string | null;
    createdAt?: string | null;
};

function formatDate(value?: string | null) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function statusClasses(status?: string | null) {
    const normalized = (status || "").toUpperCase();
    if (normalized === "SENT") return "bg-green-100 text-green-700";
    if (normalized === "FAILED" || normalized === "CANCELLED") return "bg-destructive/15 text-destructive";
    return "bg-muted text-muted-foreground";
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/notifications", { cache: "no-store" });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    throw new Error(data?.error || "Failed to load notifications.");
                }
                if (!cancelled) {
                    setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load notifications.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {loading && <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading...</div>}
                {error && <div className="rounded-md border p-4 text-sm text-destructive">{error}</div>}

                {!loading && !error && (
                    <div className="space-y-3">
                        {notifications.length === 0 ? (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div key={item.id} className="rounded-md border p-4 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-medium">{item.subject || "(no subject)"}</h4>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDate(item.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {item.channel && (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                                {item.channel}
                                            </span>
                                        )}
                                        {item.status && (
                                            <span className={`rounded-full px-2 py-0.5 ${statusClasses(item.status)}`}>
                                                {item.status}
                                            </span>
                                        )}
                                    </div>
                                    {item.recipient && (
                                        <p className="text-sm text-muted-foreground">To: {item.recipient}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function NotificationsButton() {
    const { openModal } = useAdminModal();

    return (
        <button
            type="button"
            onClick={() => openModal((close) => <NotificationsModal onClose={close} />)}
            className="relative rounded-full p-2 hover:bg-accent transition-colors"
        >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </button>
    );
}
