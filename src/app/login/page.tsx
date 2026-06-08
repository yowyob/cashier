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
    const [selectedOrganizationKey, setSelectedOrganizationKey] = useState("");
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [selectionError, setSelectionError] = useState<string | null>(null);

    const selectedOrganization = useMemo(() => {
        if (!selectedOrganizationKey) return null;
        const index = Number(selectedOrganizationKey);
        if (!Number.isFinite(index)) return null;
        return organizations[index] || null;
    }, [organizations, selectedOrganizationKey]);

    const canSubmitLogin = email.trim().length > 0 && password.length > 0;
    const canSubmitSelection = Boolean(selectedOrganizationKey);

    const formatOrganizationLabel = (org: OrganizationMembership) => {
        const details = [org.organization_name];
        if (org.agency_name) {
            details.push(`Agency: ${org.agency_name}`);
        }
        const roleName = resolveRoleName(org.role_name, loginUser);
        if (roleName) {
            details.push(roleName);
        }
        return details.join(" - ");
    };

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
        } catch (error: any) {
            setSelectionError(error?.message || "Failed to continue.");
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
            setSelectedOrganizationKey(orgs.length === 1 ? "0" : "");
            setStep("organization");

            if (orgs.length === 1) {
                await continueWithOrganization(orgs[0]);
            }
        } catch (_e: any) {
            setLoginError("Invalid credentials");
        } finally {
            setLoginLoading(false);
        }
    }

    async function onSubmitOrganization(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedOrganization) {
            setSelectionError("Select an organization.");
            return;
        }
        await continueWithOrganization(selectedOrganization);
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-background p-6 shadow-lg">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Login</h1>
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
                    <form onSubmit={onSubmitOrganization} className="space-y-4">
                        {organizations.length === 0 ? (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                No organizations available for this account.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="organization" className="text-sm font-medium">Organization</label>
                                <select
                                    id="organization"
                                    name="organization"
                                    value={selectedOrganizationKey}
                                    onChange={(e) => setSelectedOrganizationKey(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Select organization</option>
                                    {organizations.map((org, index) => (
                                        <option
                                            key={`${org.organization_id}-${org.agency_id || "org"}-${org.role_name || "role"}-${index}`}
                                            value={String(index)}
                                        >
                                            {formatOrganizationLabel(org)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep("login");
                                    setOrganizations([]);
                                    setSelectedOrganizationKey("");
                                    setSelectionError(null);
                                }}
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={selectionLoading || !canSubmitSelection}
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                            >
                                {selectionLoading ? "Loading..." : "Continue"}
                            </button>
                        </div>
                    </form>
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
