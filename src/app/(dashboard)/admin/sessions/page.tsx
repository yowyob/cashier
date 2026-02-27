import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionsPageClient } from "@/components/admin/sessions-page-client";

export default async function AdminSessionsPage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const canControl =
        session.user?.role === "admin" &&
        (session.user?.roleType === "agency_admin" || Boolean(session.user?.agencyId));

    return <SessionsPageClient canControl={canControl} />;
}
