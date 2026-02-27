import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { AuditService } from "@/services/audit.service";

export async function POST() {
    const session = await getSession().catch(() => null);
    (await cookies()).delete("session");
    await AuditService.log({
        type: "logout",
        authorId: session?.user?.id || null,
        payload: {
            message: "Logout",
            subjectType: session?.user?.role || null,
            subjectId: session?.user?.id || null,
            agencyId: session?.user?.agencyId || null
        }
    });
    return NextResponse.json({ success: true });
}
