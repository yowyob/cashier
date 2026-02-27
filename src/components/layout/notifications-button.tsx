"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";

type Newsletter = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    category?: string | null;
};

type ForumMessage = {
    id: string;
    author: string;
    body: string;
    created_at: string;
};

type Forum = {
    id: string;
    title: string;
    description: string;
    created_at: string;
    participants: number;
    messages: ForumMessage[];
};

type NotificationPayload = {
    newsletters: Newsletter[];
    forums: Forum[];
};

function formatDate(value: string) {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function clampPreview(text: string, max: number) {
    if (!text) return "";
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max)}...`;
}

function getLastMessagePreview(messages: ForumMessage[]) {
    if (!messages || messages.length === 0) return "-";
    const sorted = [...messages].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
    });
    const last = sorted[sorted.length - 1];
    return clampPreview(last.body, 10);
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<"newsletter" | "forum">("newsletter");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<NotificationPayload | null>(null);
    const [selectedForumId, setSelectedForumId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/notifications");
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    throw new Error(data?.error || "Failed to load notifications.");
                }
                if (!cancelled) {
                    setPayload(data);
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

    const forums = payload?.forums || [];
    const newsletters = payload?.newsletters || [];
    const selectedForum = forums.find((forum) => forum.id === selectedForumId) || null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("newsletter")}
                        className={`rounded-md border px-3 py-1 text-sm ${
                            activeTab === "newsletter" ? "bg-primary text-primary-foreground" : "bg-background"
                        }`}
                    >
                        Newsletter
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("forum")}
                        className={`rounded-md border px-3 py-1 text-sm ${
                            activeTab === "forum" ? "bg-primary text-primary-foreground" : "bg-background"
                        }`}
                    >
                        Forums
                    </button>
                </div>

                {loading && <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading...</div>}
                {error && <div className="rounded-md border p-4 text-sm text-destructive">{error}</div>}

                {!loading && !error && activeTab === "newsletter" && (
                    <div className="space-y-3">
                        {newsletters.length === 0 ? (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                No newsletters yet.
                            </div>
                        ) : (
                            newsletters.map((item) => (
                                <div key={item.id} className="rounded-md border p-4 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{item.title}</h4>
                                        <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                                    </div>
                                    {item.category && (
                                        <div className="text-xs text-muted-foreground">{item.category}</div>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {clampPreview(item.content, 31)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {!loading && !error && activeTab === "forum" && (
                    <div className="space-y-4">
                        {forums.length === 0 ? (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                No forums yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {forums.map((forum) => (
                                    <button
                                        key={forum.id}
                                        type="button"
                                        onClick={() => setSelectedForumId(forum.id)}
                                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                                            selectedForumId === forum.id ? "bg-muted/40" : "hover:bg-muted/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{forum.title}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {forum.participants} participants
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{formatDate(forum.created_at)}</span>
                                            <span>Last: {getLastMessagePreview(forum.messages)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="rounded-md border p-4">
                            {selectedForum ? (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold">{selectedForum.title}</h4>
                                        <p className="text-sm text-muted-foreground">{selectedForum.description}</p>
                                        <div className="text-xs text-muted-foreground">
                                            Created {formatDate(selectedForum.created_at)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Messages</div>
                                        {selectedForum.messages.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">No messages yet.</div>
                                        ) : (
                                            selectedForum.messages.map((message) => (
                                                <div key={message.id} className="rounded-md border p-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{message.author}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(message.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{message.body}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Select a forum to view details and messages.
                                </div>
                            )}
                        </div>
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
