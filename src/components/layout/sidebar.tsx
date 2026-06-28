"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Monitor, LogOut, History, ClipboardList, ArrowRightLeft, FileText, UserCircle, CreditCard, Scale, Wallet, Download, ArrowLeftRight, ArrowDownToLine, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
];


interface SidebarProps {
    role?: string;
    roleType?: string | null;
    contextLabel?: string | null;
    contextName?: string | null;
}

export function Sidebar({ role, roleType, contextLabel, contextName }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    const navItems = roleType === "superadmin" ? [] : navigation;

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
            <div className="flex h-16 items-center justify-center border-b px-6">
                <div className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-horizontal.png" alt="KSM Cashier" className="mx-auto h-8 w-auto" />
                    {contextName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {contextLabel ? `${contextLabel}: ` : ""}{contextName}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex-1 px-4 py-4">
                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    ))}

                    {/* Operations Section - Only visible for cashiers */}
                    {role === 'cashier' && (
                    <div className="pt-4 pb-2">
                        <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground">Operations</h4>
                        <Link
                            href="/operations/deposit"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === "/operations/deposit" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <Wallet className="h-4 w-4" />
                            Deposit
                        </Link>
                        <Link
                            href="/operations/withdraw"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === "/operations/withdraw" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <Download className="h-4 w-4" />
                            Withdraw
                        </Link>
                        <Link
                            href="/operations/transfer-p2p"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === "/operations/transfer-p2p" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                            P2P Transfer
                        </Link>
                        <Link
                            href="/cashier/bills"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === "/cashier/bills" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <FileText className="h-4 w-4" />
                            Bills
                        </Link>
                        <Link
                            href="/operations/fund-request"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === "/operations/fund-request" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <ArrowDownToLine className="h-4 w-4" />
                            Fund Request
                        </Link>
                    </div>
                    )}

                    {role === 'admin' && roleType !== "superadmin" && (
                        <div className="pt-4 pb-2">
                            <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground">Admin</h4>
                            {roleType !== "agency_admin" && (
                                <Link
                                    href="/admin/cashiers"
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                        pathname === "/admin/cashiers" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                    Cashiers
                                </Link>
                            )}
                            <Link
                                href="/admin/registers"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/registers" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <Monitor className="h-4 w-4" />
                                Registers
                            </Link>
                            <Link
                                href="/admin/sessions"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/sessions" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <History className="h-4 w-4" />
                                Sessions
                            </Link>
                            {roleType !== "agency_admin" && (
                                <>
                                    <Link
                                        href="/admin/admins"
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                            pathname === "/admin/admins" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        <Users className="h-4 w-4" />
                                        Admins
                                    </Link>
                                    <Link
                                        href="/admin/agencies"
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                            pathname === "/admin/agencies" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        <Monitor className="h-4 w-4" />
                                        Agencies
                                    </Link>
                                </>
                            )}
                            <Link
                                href="/admin/assignments"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/assignments" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <ClipboardList className="h-4 w-4" />
                                Assignments
                            </Link>
                            <Link
                                href="/admin/transactions"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/transactions" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <ArrowRightLeft className="h-4 w-4" />
                                Movements
                            </Link>
                            <Link
                                href="/admin/audit"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/audit" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <Shield className="h-4 w-4" />
                                Audit Trail
                            </Link>
                            <Link
                                href="/admin/documents"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/documents" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <FileText className="h-4 w-4" />
                                Documents
                            </Link>
                            <Link
                                href="/admin/accounts"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/accounts" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <CreditCard className="h-4 w-4" />
                                Accounts
                            </Link>
                            <Link
                                href="/admin/customers"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/customers" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <UserCircle className="h-4 w-4" />
                                Customers
                            </Link>
                            <Link
                                href="/admin/reconciliations"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === "/admin/reconciliations" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <Scale className="h-4 w-4" />
                                Reconciliations
                            </Link>
                        </div>
                    )}
                </nav>
            </div>
            {/*<div className="border-t p-4">*/}
            {/*    <button*/}
            {/*        onClick={handleLogout}*/}
            {/*        className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"*/}
            {/*    >*/}
            {/*        <LogOut className="mr-3 h-5 w-5" />*/}
            {/*        Logout*/}
            {/*    </button>*/}
            {/*</div>*/}
        </div>
    );
}
