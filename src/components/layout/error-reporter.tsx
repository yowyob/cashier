"use client";

import { useEffect, useRef } from "react";

type ReportPayload = {
    type: string;
    path: string;
    method: string;
    ip: string | null;
    payload: {
        message?: string;
        stack?: string;
        source?: string;
        detail?: any;
    };
};

function buildPayload(error: unknown, source: string): ReportPayload {
    let message = "Unknown error";
    let stack = "";
    if (error instanceof Error) {
        message = error.message;
        stack = error.stack || "";
    } else if (typeof error === "string") {
        message = error;
    } else if (error && typeof error === "object") {
        try {
            message = JSON.stringify(error);
        } catch {
            message = String(error);
        }
    }

    return {
        type: "ui_error",
        path: typeof window !== "undefined" ? window.location.pathname : "/",
        method: "render",
        ip: null,
        payload: {
            message,
            stack,
            source,
            detail: error
        }
    };
}

async function sendAudit(payload: ReportPayload) {
    const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (response.status === 401 || response.status === 403) {
        await fetch("/api/notify-unauthorized", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                path: payload.path,
                method: payload.method,
                ip: payload.ip,
                payload: payload.payload,
                username: null,
                userId: null,
                agencyId: null,
                organizationId: null,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
                macAddress: null
            })
        });
    }
}

export function ErrorReporter() {
    const reportingRef = useRef(false);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            if (reportingRef.current) return;
            if (event?.filename?.includes("/api/audit") || event?.filename?.includes("/api/notify-unauthorized")) {
                return;
            }
            reportingRef.current = true;
            const payload = buildPayload(event.error || event.message, "window.onerror");
            sendAudit(payload).catch(() => {}).finally(() => {
                reportingRef.current = false;
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            if (reportingRef.current) return;
            reportingRef.current = true;
            const payload = buildPayload(event.reason, "unhandledrejection");
            sendAudit(payload).catch(() => {}).finally(() => {
                reportingRef.current = false;
            });
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleRejection);
        };
    }, []);

    return null;
}
