"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Mail, Lock, Building2, Loader2 } from "lucide-react";

type OrganizationMembership = {
    organization_id: string;
    organization_name: string;
    role_name?: string | null;
    agency_id?: string | null;
    agency_name?: string | null;
    access_token?: string | null;
    token_type?: string | null;
    expires_in?: number | null;
};

type LoginResponse = {
    success: boolean;
    user?: {
        id: string;
        username: string;
        role?: string | null;
        role_type?: string | null;
    };
    organizations?: OrganizationMembership[];
};

function resolveRoleName(orgRoleName: string | null | undefined, user: LoginResponse["user"] | null) {
    if (orgRoleName && String(orgRoleName).trim().length > 0) return orgRoleName;
    const roleType = (user?.role_type || "").toLowerCase();
    const role = (user?.role || "").toLowerCase();
    if (roleType === "superadmin") return "ROLE_SUPERADMIN";
    if (roleType === "organization_admin") return "ROLE_ORG_ADMIN";
    if (roleType === "agency_admin") return "ROLE_MANAGER";
    if (roleType === "salesperson") return "ROLE_SALESPERSON";
    if (role === "cashier") return "ROLE_SALESPERSON";
    return null;
}

function isCashierRole(roleName?: string | null) {
    const n = (roleName || "").toUpperCase();
    return n === "ROLE_SALESPERSON" || n === "ROLE_USER";
}

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState<"login" | "organization">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<LoginResponse["user"] | null>(null);
    const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
    const [selectedKey, setSelectedKey] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setStep("login");
            setEmail("");
            setPassword("");
            setError(null);
            setUser(null);
            setOrganizations([]);
            setSelectedKey("");
            setLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        if (isOpen) document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    const selectedOrganization = useMemo(() => {
        if (!selectedKey) return null;
        const i = Number(selectedKey);
        return Number.isFinite(i) ? organizations[i] || null : null;
    }, [organizations, selectedKey]);

    const orgLabel = (org: OrganizationMembership) => {
        const parts = [org.organization_name];
        if (org.agency_name) parts.push(`Agence : ${org.agency_name}`);
        const role = resolveRoleName(org.role_name, user);
        if (role) parts.push(role);
        return parts.join(" — ");
    };

    async function continueWithOrganization(org: OrganizationMembership) {
        setLoading(true);
        setError(null);
        try {
            const role = resolveRoleName(org.role_name, user);
            const res = await fetch("/api/auth/select-organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    organization_id: org.organization_id,
                    organization_name: org.organization_name,
                    agency_id: org.agency_id,
                    agency_name: org.agency_name,
                    role_name: role,
                    access_token: org.access_token,
                    token_type: org.token_type,
                    expires_in: org.expires_in,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.error || "Échec de la sélection de l'organisation.");
            }
            if (!isCashierRole(role)) {
                if (!org.agency_id) {
                    const r = await fetch("/api/organizations/current", { credentials: "include" });
                    if (!r.ok) throw new Error("Échec du chargement de l'organisation.");
                } else {
                    const r = await fetch(`/api/agencies/${org.agency_id}`, { credentials: "include" });
                    if (!r.ok) throw new Error("Échec du chargement de l'agence.");
                }
            }
            window.location.href = "/";
        } catch (e: any) {
            setError(e?.message || "Échec.");
            setLoading(false);
        }
    }

    async function onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const raw = await res.text();
            if (!res.ok) throw new Error("Identifiants invalides");
            let data: LoginResponse = { success: false };
            if (raw) {
                try {
                    data = JSON.parse(raw) as LoginResponse;
                } catch {
                    data = { success: false };
                }
            }
            setUser(data.user || null);
            const orgs = data.organizations || [];
            setOrganizations(orgs);
            setSelectedKey(orgs.length === 1 ? "0" : "");
            setStep("organization");
            if (orgs.length === 1) {
                await continueWithOrganization(orgs[0]);
                return;
            }
        } catch {
            setError("Identifiants invalides");
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#03045e]/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Fermer"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6 space-y-1 text-center">
                    <h2 className="text-2xl font-bold text-foreground">
                        {step === "login" ? "Connexion" : "Votre organisation"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {step === "login"
                            ? "Accédez à votre espace caisse"
                            : "Choisissez l'organisation à utiliser"}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                )}

                {step === "login" && (
                    <form onSubmit={onSubmitLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="lm-email" className="text-sm font-medium text-foreground">Email</label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="lm-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                                    placeholder="vous@entreprise.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="lm-pwd" className="text-sm font-medium text-foreground">Mot de passe</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="lm-pwd"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || email.trim().length === 0 || password.length === 0}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? "Connexion…" : "Se connecter"}
                        </button>
                    </form>
                )}

                {step === "organization" && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (selectedOrganization) continueWithOrganization(selectedOrganization);
                        }}
                        className="space-y-4"
                    >
                        {organizations.length === 0 ? (
                            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                                Aucune organisation pour ce compte.
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label htmlFor="lm-org" className="text-sm font-medium text-foreground">Organisation</label>
                                <div className="relative">
                                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <select
                                        id="lm-org"
                                        value={selectedKey}
                                        onChange={(e) => setSelectedKey(e.target.value)}
                                        className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                                    >
                                        <option value="">Sélectionner</option>
                                        {organizations.map((org, i) => (
                                            <option key={`${org.organization_id}-${org.agency_id || "org"}-${i}`} value={String(i)}>
                                                {orgLabel(org)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep("login");
                                    setOrganizations([]);
                                    setSelectedKey("");
                                    setError(null);
                                }}
                                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-muted-foreground transition hover:bg-muted"
                            >
                                Retour
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedKey}
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {loading ? "Chargement…" : "Continuer"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
