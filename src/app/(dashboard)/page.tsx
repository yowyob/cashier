"use client";

import { useEffect, useState } from "react";
import { Overview } from "@/components/dashboard/overview";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { format } from "date-fns";
import Link from "next/link";
import { TablePagination } from "@/components/ui/table-pagination";

interface DashboardStats {
  totalRevenue: number;
  activeSessions: number;
  todayMovements: number;
  todayTotal: number;
  monthlyRevenue: { name: string; total: number }[];
  dailyRevenue?: { name: string; total: number }[];
  hourlyRevenue?: { name: string; total: number }[];
  role?: string;
  cashierData?: any;
  cashierMovementsToday?: any[];
}

type RawStats = Record<string, any> | null;

function normalizeStats(raw: RawStats): DashboardStats | null {
  const payload = raw?.data ?? raw?.stats ?? raw?.result ?? raw;
  if (!payload || typeof payload !== "object") {
    return {
      totalRevenue: 0,
      activeSessions: 0,
      todayMovements: 0,
      todayTotal: 0,
      monthlyRevenue: [],
      dailyRevenue: [],
      hourlyRevenue: [],
      role: raw?.role ?? raw?.role_name ?? raw?.roleType ?? raw?.role_type,
      cashierData: undefined,
      cashierMovementsToday: undefined
    };
  }

  const monthlyRevenue = payload.monthlyRevenue ?? payload.monthly_revenue ?? [];
  const dailyRevenue = payload.dailyRevenue ?? payload.daily_revenue ?? [];
  const hourlyRevenue = payload.hourlyRevenue ?? payload.hourly_revenue ?? [];

  const roleRaw = payload.role ?? payload.role_name ?? payload.roleType ?? payload.role_type;
  const role =
    roleRaw === "ROLE_USER"
      ? "cashier"
      : roleRaw === "ROLE_ADMIN"
        ? "admin"
        : roleRaw;

  return {
    totalRevenue: Number(payload.totalRevenue ?? payload.total_revenue ?? 0),
    activeSessions: Number(payload.activeSessions ?? payload.active_sessions ?? 0),
    todayMovements: Number(payload.todayMovements ?? payload.today_movements ?? 0),
    todayTotal: Number(payload.todayTotal ?? payload.today_total ?? 0),
    monthlyRevenue: Array.isArray(monthlyRevenue) ? monthlyRevenue : [],
    dailyRevenue: Array.isArray(dailyRevenue) ? dailyRevenue : [],
    hourlyRevenue: Array.isArray(hourlyRevenue) ? hourlyRevenue : [],
    role,
    cashierData: payload.cashierData ?? payload.cashier_data,
    cashierMovementsToday: payload.cashierMovementsToday ?? payload.cashier_movements_today
  };
}

export default function DashboardPage() {
  const overviewRanges = ["monthly", "daily", "hourly"] as const;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [overviewRange, setOverviewRange] = useState<"monthly" | "daily" | "hourly">("monthly");
  const [cashierMovementsPage, setCashierMovementsPage] = useState(1);

  const cashierMovements = stats?.cashierData?.movements ?? [];
  const cashierMovementsPageSize = 20;
  const cashierMovementsTotalPages = Math.max(
    1,
    Math.ceil(cashierMovements.length / cashierMovementsPageSize)
  );
  const pagedCashierMovements = cashierMovements.slice(
    (cashierMovementsPage - 1) * cashierMovementsPageSize,
    cashierMovementsPage * cashierMovementsPageSize
  );

  useEffect(() => {
    if (cashierMovementsPage > cashierMovementsTotalPages) {
      setCashierMovementsPage(cashierMovementsTotalPages);
    }
  }, [cashierMovementsPage, cashierMovementsTotalPages]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stat");
        if (response.ok) {
          try {
            const data = await response.json();
            setStats(normalizeStats(data));
          } catch (err) {
            console.error("Failed to parse stats response", err);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    // Initial fetch
    fetchStats();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Cashier Dashboard
  if (stats?.role === "cashier" && stats.cashierData) {
    const { currentFunds, register, movements, session } = stats.cashierData;
    const todayMovementsCount = stats.cashierMovementsToday?.length ?? movements.length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">Cash Register: {register.town}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Current Funds</h3>
            </div>
            <div className="text-2xl font-bold">{currentFunds.toLocaleString()} XAF</div>
            <p className="text-xs text-muted-foreground">
              Initial: {Number(session?.theorical_initial_funds || 0).toLocaleString()} XAF
            </p>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Session Status</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {session ? "OPEN" : "CLOSED"}
            </div>
            <p className="text-xs text-muted-foreground">
              {session ? `Since ${format(new Date(session.open_on), "HH:mm")}` : "No active session"}
            </p>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Today's Transactions</h3>
            </div>
            <div className="text-2xl font-bold">{todayMovementsCount}</div>
            <p className="text-xs text-muted-foreground">Movements today</p>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Net Flow</h3>
            </div>
            <div className="text-2xl font-bold">
              {(currentFunds - Number(session?.theorical_initial_funds || 0)).toLocaleString()} XAF
            </div>
            <p className="text-xs text-muted-foreground">Since session opened</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 border-b">
            <h3 className="font-semibold leading-none tracking-tight">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {cashierMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  pagedCashierMovements.map((move: any) => (
                    <tr key={move.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle">{format(new Date(move.create_on), "HH:mm:ss")}</td>
                      <td className="p-4 align-middle capitalize">{move.sense}</td>
                      <td className={`p-4 align-middle font-medium ${move.sense === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                        {move.sense === 'entree' ? '+' : '-'}{Number(move.amount).toLocaleString()} XAF
                      </td>
                      <td className="p-4 align-middle">{move.reason || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={cashierMovementsPage}
            totalPages={cashierMovementsTotalPages}
            onPageChange={setCashierMovementsPage}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/operations/deposit"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">Deposit</h3>
            <p className="text-xs text-muted-foreground">Customer deposit</p>
          </Link>
          <Link
            href="/operations/withdraw"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">Withdraw</h3>
            <p className="text-xs text-muted-foreground">Customer withdrawal</p>
          </Link>
          <Link
            href="/operations/transfer-p2p"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">P2P Transfer</h3>
            <p className="text-xs text-muted-foreground">Between accounts</p>
          </Link>
          <Link
            href="/cashier/bills"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">Bills</h3>
            <p className="text-xs text-muted-foreground">Invoices sent to your register</p>
          </Link>
          <Link
            href="/operations/fund-request"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">Fund Request</h3>
            <p className="text-xs text-muted-foreground">From other registers</p>
          </Link>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  const overviewData =
    overviewRange === "monthly"
      ? stats?.monthlyRevenue || []
      : overviewRange === "daily"
        ? stats?.dailyRevenue || []
        : stats?.hourlyRevenue || [];

  const overviewLabel =
    overviewRange === "monthly"
      ? "Vue mensuelle"
      : overviewRange === "daily"
        ? "Vue quotidienne"
        : "Vue horaire";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Revenue</h3>
          </div>
          <div className="text-2xl font-bold">
            {loading ? "..." : `${Number(stats?.totalRevenue ?? 0).toLocaleString()} XAF`}
          </div>
          <p className="text-xs text-muted-foreground">From all closed sessions</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Sessions</h3>
          </div>
          <div className="text-2xl font-bold">
            {loading ? "..." : Number(stats?.activeSessions ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground">Currently open</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Today's Movements</h3>
          </div>
          <div className="text-2xl font-bold">
            {loading ? "..." : Number(stats?.todayMovements ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground">Transactions today</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Today's Total</h3>
          </div>
          <div className="text-2xl font-bold">
            {loading ? "..." : `${Number(stats?.todayTotal ?? 0).toLocaleString()} XAF`}
          </div>
          <p className="text-xs text-muted-foreground">Net flow today</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 items-start">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold leading-none tracking-tight">Overview</h3>
              </div>
              <div className="flex items-center gap-2">
                {overviewRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setOverviewRange(range)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      overviewRange === range
                        ? "bg-primary text-primary-foreground"
                        : "border border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {range === "monthly" ? "Mois" : range === "daily" ? "Jour" : "Heure"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 pt-0 pl-2">
            {loading ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : (
              <Overview data={overviewData} unitLabel="x100k XAF" />
            )}
          </div>
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6">
            <h3 className="font-semibold leading-none tracking-tight">Recent Transactions</h3>
            <p className="text-sm text-muted-foreground">
              Latest movements across all registers
            </p>
          </div>
          <div className="p-6 pt-0">
            <RecentSales />
          </div>
        </div>
      </div>
    </div>
  );
}
