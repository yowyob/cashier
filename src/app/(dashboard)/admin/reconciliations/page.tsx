import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReconciliationsPageClient } from "@/components/admin/reconciliations-page-client";

export default async function ReconciliationsPage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const roleType = session.user?.roleType;
    const canReview = roleType === "agency_admin" || roleType === "organization_admin" || roleType === "superadmin";

    return <ReconciliationsPageClient canReview={canReview} />;
}
