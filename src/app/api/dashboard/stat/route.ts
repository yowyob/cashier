import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function asArray(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

function amountOf(value: any) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function createdAtOf(item: any) {
    const raw = item?.create_on ?? item?.created_at ?? item?.createOn ?? item?.createdAt ?? null;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isEntry(item: any) {
    const value = String(item?.sense ?? "").toLowerCase();
    return value === "entree" || value === "in";
}

function netOf(items: any[]) {
    return items.reduce((sum, item) => {
        const amount = amountOf(item?.amount);
        return sum + (isEntry(item) ? amount : -amount);
    }, 0);
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (session.user.role === "cashier") {
            const [sessionsRes, movementsRes] = await Promise.all([
                fetchBackend("/api/cashier/sessions", { cache: "no-store" }, "cashier"),
                fetchBackend("/api/cashier/movements", { cache: "no-store" }, "cashier")
            ]);
            const sessionsBody = await readBackendJson(sessionsRes);
            const movementsBody = await readBackendJson(movementsRes);
            if (!sessionsRes.ok) {
                return NextResponse.json(
                    { error: sessionsBody?.error || "Failed to load cashier sessions." },
                    { status: sessionsRes.status }
                );
            }
            if (!movementsRes.ok) {
                return NextResponse.json(
                    { error: movementsBody?.error || "Failed to load cashier movements." },
                    { status: movementsRes.status }
                );
            }

            const sessions = asArray(sessionsBody);
            const movements = asArray(movementsBody);
            const activeSession =
                sessions.find((item) => String(item?.state ?? "").toLowerCase() === "ouverte") ||
                sessions.find((item) => String(item?.state ?? "").toLowerCase() === "open") ||
                sessions[0] ||
                null;

            const initialFunds = amountOf(activeSession?.theorical_initial_funds);
            const currentFunds = initialFunds + netOf(movements);
            const todayMovements = movements.filter((item) => {
                const created = createdAtOf(item);
                return created ? created >= today : false;
            });
            const todayTotal = netOf(todayMovements);

            return NextResponse.json({
                totalRevenue: currentFunds,
                activeSessions: activeSession ? 1 : 0,
                todayMovements: todayMovements.length,
                todayTotal,
                monthlyRevenue: [],
                role: "cashier",
                cashierData: {
                    currentFunds,
                    register: activeSession?.cash_register ?? null,
                    movements,
                    session: activeSession
                },
                cashierMovementsToday: todayMovements
            });
        }

        const [sessionsRes, transactionsRes] = await Promise.all([
            fetchBackend("/api/sessions", { cache: "no-store" }, "cashier"),
            fetchBackend("/api/transactions", { cache: "no-store" }, "cashier")
        ]);
        const sessionsBody = await readBackendJson(sessionsRes);
        const transactionsBody = await readBackendJson(transactionsRes);
        if (!sessionsRes.ok) {
            return NextResponse.json(
                { error: sessionsBody?.error || "Failed to load sessions." },
                { status: sessionsRes.status }
            );
        }
        if (!transactionsRes.ok) {
            return NextResponse.json(
                { error: transactionsBody?.error || "Failed to load transactions." },
                { status: transactionsRes.status }
            );
        }

        const sessions = asArray(sessionsBody);
        const transactions = asArray(transactionsBody);
        const todayTransactions = transactions.filter((item) => {
            const created = createdAtOf(item);
            return created ? created >= today : false;
        });
        const activeSessions = sessions.filter((item) => {
            const state = String(item?.state ?? "").toLowerCase();
            return state === "ouverte" || state === "open";
        }).length;

        const totalRevenue = transactions.reduce((sum, item) => sum + amountOf(item?.amount), 0);
        const todayTotal = netOf(todayTransactions);

        return NextResponse.json({
            totalRevenue,
            activeSessions,
            todayMovements: todayTransactions.length,
            todayTotal,
            monthlyRevenue: [],
            role: "admin"
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load dashboard stats." }, { status: 500 });
    }
}
