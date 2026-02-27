import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { CashierRecentMovements } from "@/components/cashier/recent-movements";

export default async function CashierDashboardPage() {
    const session = await getSession();
    if (!session || session.user.role !== "cashier") {
        redirect("/login");
    }

    let dashboardData: any = null;
    try {
        const backendResponse = await fetchBackend("/api/cashier/sessions", { cache: "no-store" });
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            throw new Error(body?.error || "Failed to load cashier sessions.");
        }
        const sessions = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        const activeSession = sessions.find(
            (s: any) => s?.state === "ouverte" && !s?.is_locked
        );
        if (!activeSession) {
            throw new Error("No active session found.");
        }

        const movementsSource = activeSession.movements ?? [];
        const movements = Array.isArray(movementsSource) ? movementsSource : [];
        const currentFunds = movements.reduce((total: number, move: any) => {
            const amount = Number(move?.amount || 0);
            if (move?.sense === "entree") return total + amount;
            if (move?.sense === "sortie") return total - amount;
            return total;
        }, Number(activeSession?.theorical_initial_funds || 0));

        dashboardData = {
            session: activeSession,
            currentFunds,
            register: activeSession.cashRegister ?? activeSession.cash_register ?? null,
            movements
        };
    } catch (error) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-500">Error</h1>
                <p>Could not load dashboard data. Please contact support.</p>
            </div>
        );
    }

    const { currentFunds, register, movements, session: activeSession } = dashboardData;
    const recentMovements = movements.map((move: any) => ({
        id: move.id,
        sense: move.sense,
        amount: Number(move.amount),
        reason: move.reason,
        create_on: new Date(move.create_on).toISOString(),
        external_reference: move.external_reference,
        creator: move.creator,
        ticketingDetails: Array.isArray(move.ticketingDetails ?? move.ticketing_details)
            ? (move.ticketingDetails ?? move.ticketing_details).map((d: any) => ({
                quantity: d.quantity,
                value: Number(d.value),
                total: Number(d.total),
                denomination: d.denomination
                    ? {
                        ...d.denomination,
                        value: d.denomination.value ? Number(d.denomination.value) : null
                    }
                    : null
            }))
            : []
    }));

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <h1 className="text-xl font-semibold">Cashier Dashboard</h1>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        {session.user.username} @ {register.town}
                    </span>
                    <form action="/api/auth/logout" method="POST">
                        <button className="text-sm font-medium hover:underline">Logout</button>
                    </form>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border bg-card text-card-foreground shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="tracking-tight text-sm font-medium">Current Funds</h3>
                        </div>
                        <div className="p-6 pt-0">
                            <div className="text-2xl font-bold">{currentFunds.toLocaleString()} XAF</div>
                            <p className="text-xs text-muted-foreground">
                                Initial: {Number(activeSession.theorical_initial_funds).toLocaleString()} XAF
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="tracking-tight text-sm font-medium">Register Status</h3>
                        </div>
                        <div className="p-6 pt-0">
                            <div className="text-2xl font-bold text-green-600">OPEN</div>
                            <p className="text-xs text-muted-foreground">
                                Since {format(new Date(activeSession.open_on), "HH:mm")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
                        <div className="p-6 flex flex-row items-center justify-between">
                            <h3 className="font-semibold leading-none tracking-tight">Recent Transactions</h3>
                        </div>
                        <div className="p-6 pt-0">
                            <CashierRecentMovements movements={recentMovements} registerName={register.town} />
                        </div>
                    </div>

                    <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
                        <div className="p-6">
                            <h3 className="font-semibold leading-none tracking-tight mb-4">Actions</h3>
                            <div className="grid gap-2">
                                <Link href="/cashier/transfer" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                                    Request Funds
                                </Link>
                                <Link href="/cashier/deposit" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 w-full">
                                    Customer Deposit
                                </Link>
                                <Link href="/cashier/withdraw" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-orange-500 text-white hover:bg-orange-600 h-10 px-4 py-2 w-full">
                                    Customer Withdrawal
                                </Link>
                                <Link href="/cashier/transfer-p2p" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-purple-600 text-white hover:bg-purple-700 h-10 px-4 py-2 w-full">
                                    P2P Transfer
                                </Link>
                                <Link href="/cashier/bills" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 w-full">
                                    Bills
                                </Link>
                                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">
                                    Close Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
