import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/prisma";
import { AdminModalProvider } from "@/components/admin/admin-modal-provider";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    const role = session?.user?.role;
    const roleType = (session as any)?.user?.roleType;
    const agencyId = (session as any)?.user?.agencyId as string | undefined;
    const organizationId = (session as any)?.user?.organizationId as string | undefined;
    const showSidebar = roleType !== "superadmin";
    const showLogout = Boolean(role);
    const showSettings = role === "admin";

    let headerTitle: string | null = null;
    let contextLabel: string | null = null;
    if (roleType === "agency_admin" && agencyId) {
        const agency = await prisma.agency.findUnique({
            where: { id: agencyId },
            select: { name: true }
        });
        headerTitle = agency?.name || null;
        contextLabel = "Agency";
    } else if (roleType === "organization_admin" && organizationId) {
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { name: true }
        });
        headerTitle = organization?.name || null;
        contextLabel = "Organization";
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {showSidebar && (
                <Sidebar
                    role={role}
                    roleType={roleType}
                    contextLabel={contextLabel}
                    contextName={headerTitle}
                />
            )}
            <div className={`flex flex-1 flex-col overflow-hidden${showSidebar ? "" : " w-full"}`}>
                <AdminModalProvider>
                    <Header title={headerTitle} showLogout={showLogout} showSettings={showSettings} />
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </AdminModalProvider>
            </div>
        </div>
    );
}
