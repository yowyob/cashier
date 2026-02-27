import { NextResponse } from "next/server";
import { ReportService } from "@/services/report.service";
import { CashierService } from "@/services/cashier.service";
import { getSession } from "@/lib/auth";
import { getAdminMonitoringScope } from "@/lib/monitoring";
import { AuditService } from "@/services/audit.service";

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const userId = session.user.id;

        // If cashier, return cashier-specific stats
        if (role === "cashier") {
            const cashierData = await CashierService.getCashierDashboardData(userId);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMovements = cashierData.movements.filter((m: any) => {
                const d = new Date(m.create_on);
                return d >= today;
            });

            // Transform to match dashboard stats format
            const stats = {
                totalRevenue: cashierData.currentFunds,
                activeSessions: cashierData.session ? 1 : 0,
                todayMovements: todayMovements.length,
                todayTotal: cashierData.currentFunds - Number(cashierData.session?.theorical_initial_funds || 0),
                monthlyRevenue: [], // Could be enhanced later
                cashierData: cashierData, // Include full cashier data
                cashierMovementsToday: todayMovements,
                role: "cashier"
            };

            await AuditService.log({
                type: "dashboard_stats_cashier",
                authorId: session.user.id,
                payload: { message: "Dashboard stats fetched (cashier)", subjectType: "cashier", subjectId: session.user.id }
            });
            return NextResponse.json(stats);
        }

        // Admin gets scoped stats
        const monitoring = await getAdminMonitoringScope(session);
        const stats = await ReportService.getAdminDashboardStats({
            agencyId: session.user.roleType === "agency_admin" ? session.user.agencyId || undefined : undefined,
            organizationId: session.user.roleType === "organization_admin" ? session.user.organizationId || undefined : undefined,
            agencyIds: monitoring.agencyIds || undefined,
            registerIds: monitoring.registerIds || undefined
        });
        await AuditService.log({
            type: "dashboard_stats_admin",
            authorId: session.user.id,
            payload: { message: "Dashboard stats fetched (admin)", subjectType: "admin", subjectId: session.user.id }
        });
        return NextResponse.json({ ...stats, role: "admin" });
    } catch (error: any) {
        await AuditService.log({
            type: "dashboard_stats_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
