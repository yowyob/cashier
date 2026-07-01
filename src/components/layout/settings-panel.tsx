"use client";

import { useEffect, useMemo, useState } from "react";

type MonitoringAgency = {
    id: string;
    name: string;
    town?: string | null;
    neighborhood?: string | null;
};

type MonitoringRegister = {
    id: string;
    town?: string | null;
    neighborhood?: string | null;
    ip_address?: string | null;
    mac_address?: string | null;
    adress?: string | null;
    agency?: MonitoringAgency | null;
};

export function SettingsPanel({ onSaved }: { onSaved?: () => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [telegramChatId, setTelegramChatId] = useState("");
    const [telegramBotToken, setTelegramBotToken] = useState("");
    const [profileName, setProfileName] = useState("");
    const [username, setUsername] = useState("");
    const [organizationName, setOrganizationName] = useState("");
    const [organizationCountry, setOrganizationCountry] = useState("");
    const [organizationActive, setOrganizationActive] = useState<boolean | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [roleType, setRoleType] = useState<string | null>(null);
    const [monitorAgencyIds, setMonitorAgencyIds] = useState<string[]>([]);
    const [monitorRegisterIds, setMonitorRegisterIds] = useState<string[]>([]);
    const [monitorOptionsLoading, setMonitorOptionsLoading] = useState(false);
    const [monitorAgencies, setMonitorAgencies] = useState<MonitoringAgency[]>([]);
    const [monitorRegisters, setMonitorRegisters] = useState<MonitoringRegister[]>([]);

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/users/profile");
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load profile");
                }
                const data = await res.json();
                setProfileName(data.userFirstName || data.user_first_name || "");
                setUsername(data.userName || data.user_name || "");
                setTelegramChatId(data.telegramChatId || data.telegram_chat_id || "");
                setTelegramBotToken(data.telegramBotToken || data.telegram_bot_token || "");
                setMonitorAgencyIds(parseIdList(data.monitorAgencyIds ?? data.monitor_agency_ids));
                setMonitorRegisterIds(parseIdList(data.monitorRegisterIds ?? data.monitor_register_ids));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load profile");
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    useEffect(() => {
        async function loadSessionInfo() {
            try {
                const res = await fetch("/api/auth/session");
                if (!res.ok) return;
                const data = await res.json();
                setRole(data?.user?.role || null);
                setRoleType(data?.user?.roleType || null);
            } catch (err) {
                console.error("Failed to load session role", err);
            }
        }
        loadSessionInfo();
    }, []);

    useEffect(() => {
        async function loadOrganization() {
            try {
                const res = await fetch("/api/organizations/current");
                if (!res.ok) return;
                const data = await res.json();
                setOrganizationName(data.name || "");
                setOrganizationCountry(data.country || "");
                setOrganizationActive(typeof data.isActive === "boolean" ? data.isActive : null);
            } catch (err) {
                console.error("Failed to load organization info", err);
            }
        }
        loadOrganization();
    }, []);

    useEffect(() => {
        async function loadMonitoringOptions() {
            if (role !== "admin") {
                return;
            }
            setMonitorOptionsLoading(true);
            try {
                const res = await fetch("/api/settings/monitoring-options");
                if (!res.ok) return;
                const data = await res.json();
                setMonitorAgencies(Array.isArray(data.agencies) ? data.agencies : []);
                setMonitorRegisters(Array.isArray(data.registers) ? data.registers : []);
            } catch (err) {
                console.error("Failed to load monitoring options", err);
            } finally {
                setMonitorOptionsLoading(false);
            }
        }
        loadMonitoringOptions();
    }, [role, roleType]);

    const visibleRegisters = useMemo(() => {
        const restrictByAgency =
            roleType === "organization_admin" || roleType === "superadmin";
        if (restrictByAgency && monitorAgencyIds.length > 0) {
            const allowed = new Set(monitorAgencyIds);
            return monitorRegisters.filter((reg) => reg.agency && allowed.has(reg.agency.id));
        }
        return monitorRegisters;
    }, [roleType, monitorAgencyIds, monitorRegisters]);

    useEffect(() => {
        if (roleType !== "organization_admin" && roleType !== "superadmin") return;
        if (monitorAgencyIds.length === 0) return;
        const allowed = new Set(visibleRegisters.map((reg) => reg.id));
        setMonitorRegisterIds((prev) => prev.filter((id) => allowed.has(id)));
    }, [roleType, monitorAgencyIds, visibleRegisters]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch("/api/users/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telegramChatId: telegramChatId || null,
                    telegramBotToken: telegramBotToken || null,
                    ...(roleType === "organization_admin" || roleType === "superadmin"
                        ? { monitorAgencyIds }
                        : {}),
                    ...(roleType === "organization_admin" || roleType === "agency_admin" || roleType === "superadmin"
                        ? { monitorRegisterIds }
                        : {})
                })
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to update settings");
            }
            setSuccess("Settings updated.");
            onSaved?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update settings");
        } finally {
            setSaving(false);
        }
    }

    async function handleTest() {
        setTesting(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch("/api/notifications/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channel: "WEBSOCKET",
                    subject: "Test KSM Cashier — notification-core",
                    recipient: username || profileName || "cashier-admin"
                })
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to send test message");
            }
            setSuccess("Test message sent.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send test message");
        } finally {
            setTesting(false);
        }
    }

    if (loading) {
        return (
            <div className="text-muted-foreground">
                Loading settings...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <div className="text-sm text-muted-foreground">Account</div>
                <div className="text-lg font-semibold">{profileName || "Admin"}</div>
                {username && <div className="text-sm text-muted-foreground">{username}</div>}
            </div>
            {(organizationName || organizationCountry || organizationActive !== null) && (
                <div>
                    <div className="text-sm text-muted-foreground">Organization</div>
                    <div className="text-lg font-semibold">{organizationName || "Organization"}</div>
                    {organizationCountry && (
                        <div className="text-sm text-muted-foreground">{organizationCountry}</div>
                    )}
                    {organizationActive !== null && (
                        <div className="text-xs text-muted-foreground">
                            Status: {organizationActive ? "Active" : "Inactive"}
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="text-sm font-medium block">
                    Telegram chat ID
                    <input
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Enter your Telegram chat ID"
                    />
                </label>
                <label className="text-sm font-medium block">
                    Telegram bot token
                    <input
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Enter your Telegram bot token"
                    />
                </label>
                {error && <div className="text-sm text-destructive">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing}
                        className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
                    >
                        {testing ? "Sending..." : "Send test"}
                    </button>
                </div>

                {role === "admin" && (
                    <div className="space-y-4 border-t pt-4">
                        <div className="text-sm font-semibold">Monitoring filters</div>
                        {(roleType === "organization_admin" || roleType === "superadmin") && (
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                    Agencies (leave empty to include all agencies)
                                </div>
                                {monitorOptionsLoading && (
                                    <div className="text-sm text-muted-foreground">Loading agencies...</div>
                                )}
                                {!monitorOptionsLoading && monitorAgencies.length === 0 && (
                                    <div className="text-sm text-muted-foreground">No agencies available.</div>
                                )}
                                {!monitorOptionsLoading && monitorAgencies.length > 0 && (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {monitorAgencies.map((agency) => (
                                            <label key={agency.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={monitorAgencyIds.includes(agency.id)}
                                                    onChange={() =>
                                                        setMonitorAgencyIds((prev) =>
                                                            prev.includes(agency.id)
                                                                ? prev.filter((id) => id !== agency.id)
                                                                : [...prev, agency.id]
                                                        )
                                                    }
                                                />
                                                <span>
                                                    {agency.name}
                                                    {agency.town ? ` (${agency.town}` : ""}
                                                    {agency.neighborhood ? ` - ${agency.neighborhood}` : ""}
                                                    {agency.town ? ")" : ""}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Registers (leave empty to include all registers)
                            </div>
                            {monitorOptionsLoading && (
                                <div className="text-sm text-muted-foreground">Loading registers...</div>
                            )}
                            {!monitorOptionsLoading && visibleRegisters.length === 0 && (
                                <div className="text-sm text-muted-foreground">No registers available.</div>
                            )}
                            {!monitorOptionsLoading && visibleRegisters.length > 0 && (
                                <div className="grid gap-2">
                                    {visibleRegisters.map((register) => (
                                        <label key={register.id} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={monitorRegisterIds.includes(register.id)}
                                                onChange={() =>
                                                    setMonitorRegisterIds((prev) =>
                                                        prev.includes(register.id)
                                                            ? prev.filter((id) => id !== register.id)
                                                            : [...prev, register.id]
                                                    )
                                                }
                                            />
                                            <span>{formatRegisterLabel(register)}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}

function parseIdList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
            }
        } catch {
            return [];
        }
    }
    return [];
}

function formatRegisterLabel(register: MonitoringRegister) {
    const shortId = register.id ? register.id.slice(0, 8) : "Register";
    const location = register.town || register.agency?.town || "";
    const neighborhood = register.neighborhood || register.agency?.neighborhood || "";
    const locationParts = [location, neighborhood].filter(Boolean).join(" - ");
    const ip = register.ip_address ? `IP ${register.ip_address}` : "";
    const mac = register.mac_address ? `MAC ${register.mac_address}` : "";
    const suffix = [locationParts, ip, mac].filter(Boolean).join(" | ");
    const agencyName = register.agency?.name ? `${register.agency.name} - ` : "";
    return `${agencyName}Register ${shortId}${suffix ? ` (${suffix})` : ""}`;
}
