"use client";

import { useEffect, useRef, useState } from "react";
import { CloudOff, TriangleAlert } from "lucide-react";

type NetworkState = "online" | "unstable" | "offline";

const TECHNICAL_NETWORK_ERROR = /(network|fetch failed|failed to fetch|network request failed|connection attempt|econn|enotfound|etimedout|socket|dns)/i;

export function NetworkStatus() {
    const [state, setState] = useState<NetworkState>("online");
    const timer = useRef<number | null>(null);

    useEffect(() => {
        const nativeFetch = window.fetch.bind(window);
        const clear = () => {
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = null;
        };
        const markOffline = () => { clear(); setState("offline"); };
        const markOnline = () => { clear(); setState("online"); };
        const markUnstable = () => {
            clear();
            if (!navigator.onLine) { setState("offline"); return; }
            setState("unstable");
            timer.current = window.setTimeout(() => setState("online"), 8000);
        };

        const safeFetch: typeof window.fetch = async (...args) => {
            try {
                const response = await nativeFetch(...args);
                if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
                    const payload = await response.clone().json().catch(() => null) as Record<string, unknown> | null;
                    const raw = String(payload?.error ?? payload?.message ?? "");
                    if (TECHNICAL_NETWORK_ERROR.test(raw)) {
                        markUnstable();
                        return new Response(JSON.stringify({ ...payload, error: "Erreur de connexion", message: "Erreur de connexion" }), {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        });
                    }
                }
                markOnline();
                return response;
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") throw error;
                markUnstable();
                throw new Error("Erreur de connexion");
            }
        };

        window.fetch = safeFetch;
        setState(navigator.onLine ? "online" : "offline");
        window.addEventListener("offline", markOffline);
        window.addEventListener("online", markOnline);
        return () => {
            clear();
            if (window.fetch === safeFetch) window.fetch = nativeFetch;
            window.removeEventListener("offline", markOffline);
            window.removeEventListener("online", markOnline);
        };
    }, []);

    if (state === "online") return null;
    const Icon = state === "offline" ? CloudOff : TriangleAlert;
    return (
        <aside role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-amber-500/30 bg-background/95 px-4 py-3 text-sm text-foreground shadow-2xl backdrop-blur-xl">
            <Icon className="h-5 w-5 shrink-0 text-amber-500" />
            <span>{state === "offline" ? "Aucune connexion Internet" : "Connexion Internet instable"}</span>
        </aside>
    );
}
