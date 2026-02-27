import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminsClient } from "./admins-client";

export default async function AdminsPage() {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        redirect("/login");
    }

    return (
        <AdminsClient
            roleType={session.user.roleType || "superadmin"}
            organizationId={session.user.organizationId || null}
        />
    );
}
