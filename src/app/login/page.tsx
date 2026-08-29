"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type OrganizationMembership = {
    organization_id: string;
    organization_name: string;
    role_id?: string | null;
    role_name?: string | null;
    agency_id?: string | null;
    agency_name?: string | null;
    access_token?: string | null;
    token_type?: string | null;
    expires_in?: number | null;
    is_active?: boolean | null;
    joined_at?: string | null;
};

type LoginResponse = {
    success: boolean;
    user?: {
        id: string;
        username: string;
        role?: string | null;
        role_type?: string | null;
        agency_id?: string | null;
        organization_id?: string | null;
    };
    organizations?: OrganizationMembership[];
};

type OrganizationGroup = {
    id: string;
    name: string;
    memberships: OrganizationMembership[];
};

const ROLE_REDIRECTS: Record<string, string> = {
    ROLE_ORG_ADMIN: "/",
    ROLE_ADMIN: "/",
    ROLE_MANAGER: "/",
    ROLE_SALESPERSON: "/",
    ROLE_USER: "/"
};

function resolveRedirectPath(roleName?: string | null) {
    const normalized = (roleName || "").toUpperCase();
    return ROLE_REDIRECTS[normalized] || "/";
}

function isCashierRole(roleName?: string | null) {
    const normalized = (roleName || "").toUpperCase();
    return normalized === "ROLE_SALESPERSON" || normalized === "ROLE_USER";
}

function resolveRoleName(
    orgRoleName: string | null | undefined,
    user: LoginResponse["user"] | null
) {
    if (orgRoleName && String(orgRoleName).trim().length > 0) {
        return orgRoleName;
    }
    const roleType = (user?.role_type || "").toLowerCase();
    const role = (user?.role || "").toLowerCase();
    if (roleType === "superadmin") return "ROLE_SUPERADMIN";
    if (roleType === "organization_admin") return "ROLE_ORG_ADMIN";
    if (roleType === "agency_admin") return "ROLE_MANAGER";
    if (roleType === "salesperson") return "ROLE_SALESPERSON";
    if (role === "cashier") return "ROLE_SALESPERSON";
    return null;
}

function LoginPageInner() {
    const searchParams = useSearchParams();
    const queryError = searchParams.get("error");
    const [step, setStep] = useState<"login" | "organization">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginUser, setLoginUser] = useState<LoginResponse["user"] | null>(null);

    const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [selectionError, setSelectionError] = useState<string | null>(null);

    const organizationGroups = useMemo<OrganizationGroup[]>(() => {
        const groups = new Map<string, OrganizationGroup>();
        for (const membership of organizations) {
            const current = groups.get(membership.organization_id);
            if (current) current.memberships.push(membership);
            else groups.set(membership.organization_id, {
                id: membership.organization_id,
                name: membership.organization_name || "Organisation",
                memberships: [membership],
            });
        }
        return Array.from(groups.values());
    }, [organizations]);

    const selectedGroup = useMemo(
        () => organizationGroups.find((group) => group.id === selectedOrganizationId) ?? null,
        [organizationGroups, selectedOrganizationId]
    );

    const canSubmitLogin = email.trim().length > 0 && password.length > 0;
    async function continueWithOrganization(org: OrganizationMembership) {
        setSelectionLoading(true);
        setSelectionError(null);

        try {
            const effectiveRoleName = resolveRoleName(org.role_name, loginUser);
            const selectResponse = await fetch("/api/auth/select-organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    organization_id: org.organization_id,
                    organization_name: org.organization_name,
                    agency_id: org.agency_id,
                    agency_name: org.agency_name,
                    role_name: effectiveRoleName,
                    access_token: org.access_token,
                    token_type: org.token_type,
                    expires_in: org.expires_in
                }),
            });

            if (!selectResponse.ok) {
                const body = await selectResponse.json().catch(() => null);
                throw new Error(body?.error || "Failed to select organization.");
            }

            if (!isCashierRole(effectiveRoleName)) {
                if (!org.agency_id) {
                    const organizationResponse = await fetch("/api/organizations/current", {
                        credentials: "include"
                    });
                    if (!organizationResponse.ok) {
                        const body = await organizationResponse.json().catch(() => null);
                        throw new Error(body?.error || "Failed to load organization.");
                    }
                } else {
                    const agencyResponse = await fetch(`/api/agencies/${org.agency_id}`, {
                        credentials: "include"
                    });
                    if (!agencyResponse.ok) {
                        const body = await agencyResponse.json().catch(() => null);
                        throw new Error(body?.error || "Failed to load agency.");
                    }
                }
            }

            window.location.href = resolveRedirectPath(effectiveRoleName);
        } catch (error: unknown) {
            setSelectionError(error instanceof Error ? error.message : "Failed to continue.");
        } finally {
            setSelectionLoading(false);
        }
    }

    async function onSubmitLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoginLoading(true);
        setLoginError(null);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: email.trim(),
                    password
                }),
            });

            const rawText = await response.text();

            if (!response.ok) {
                throw new Error("Invalid credentials");
            }

            let data: LoginResponse = { success: false };
            if (rawText) {
                try {
                    data = JSON.parse(rawText) as LoginResponse;
                } catch {
                    data = { success: false };
                }
            }
            setLoginUser(data.user || null);
            const orgs = data.organizations || [];
            setOrganizations(orgs);
            const uniqueOrganizationIds = Array.from(new Set(orgs.map((org) => org.organization_id)));
            if (orgs.length === 1) {
                await continueWithOrganization(orgs[0]);
            } else {
                setSelectedOrganizationId(uniqueOrganizationIds.length === 1 ? uniqueOrganizationIds[0] : "");
                setStep("organization");
            }
        } catch {
            setLoginError("Invalid credentials");
        } finally {
            setLoginLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-background p-6 shadow-lg">
                <div className="space-y-2 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-horizontal.png" alt="KSM Cashier" className="mx-auto h-10 w-auto" />
                    <p className="text-muted-foreground">
                        {step === "login"
                            ? "Enter your email and password"
                            : "Choose the organization you want to work with"}
                    </p>
                </div>

                {(loginError || queryError) && step === "login" && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {loginError || "Invalid credentials"}
                    </div>
                )}

                {selectionError && step === "organization" && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {selectionError}
                    </div>
                )}

                {step === "login" && (
                    <form onSubmit={onSubmitLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loginLoading || !canSubmitLogin}
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                            {loginLoading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                )}


                {step === "organization" && (
                    <div className="space-y-4">
                        {organizations.length === 0 ? (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                Aucune organisation disponible pour ce compte.
                            </div>
                        ) : selectedGroup && selectedGroup.memberships.length > 1 ? (
                            <div className="space-y-3">
                                <button type="button" onClick={() => setSelectedOrganizationId("")}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground">
                                    ← Changer d’organisation
                                </button>
                                <h2 className="font-semibold">{selectedGroup.name}</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {selectedGroup.memberships.map((membership, index) => (
                                        <button
                                            key={`${membership.organization_id}-${membership.agency_id || "org"}-${index}`}
                                            type="button"
                                            disabled={selectionLoading}
                                            onClick={() => void continueWithOrganization(membership)}
                                            className="min-h-24 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-muted/40 disabled:opacity-60"
                                        >
                                            <strong className="block">{membership.agency_name || "Périmètre organisation"}</strong>
                                            <span className="mt-1 block text-xs text-muted-foreground">{resolveRoleName(membership.role_name, loginUser) || "Accès caisse"}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {organizationGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        type="button"
                                        disabled={selectionLoading}
                                        onClick={() => {
                                            if (group.memberships.length === 1) void continueWithOrganization(group.memberships[0]);
                                            else setSelectedOrganizationId(group.id);
                                        }}
                                        className="min-h-28 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-muted/40 disabled:opacity-60"
                                    >
                                        <strong className="block">{group.name}</strong>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            {group.memberships.length > 1 ? `${group.memberships.length} agences ou rôles` : "Ouvrir la caisse"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep("login");
                                    setOrganizations([]);
                                    setSelectedOrganizationId("");
                                    setSelectionError(null);
                                }}
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                            >
                                Retour
                            </button>
                            <a href="https://ksm.yowyob.com"
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">
                                Créer une organisation dans KSM
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// useSearchParams() exige une frontière Suspense (Next 16) pour éviter le bailout au prerender.
export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageInner />
        </Suspense>
    );
}
