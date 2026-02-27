import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssignmentsPageClient } from "@/components/admin/assignments-page-client";

export default async function AssignmentsPage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const roleType = session.user?.roleType;
    const canAssign = roleType === "agency_admin";
    const canManageAgencyAssignments = roleType === "organization_admin";

    return <AssignmentsPageClient canAssign={canAssign} canManageAgencyAssignments={canManageAgencyAssignments} />;
}
