import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ requestId: string }> }
) {
    try {
        const session = await getSession();
        if (
            !session ||
            session.user.role !== "admin" ||
            (session.user.roleType !== "agency_admin" && !session.user.agencyId)
        ) {
            return NextResponse.json(
                { error: "Unauthorized. Only agency admin can fund requests." },
                { status: 403 }
            );
        }

        const { requestId } = await params;
        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();

        const backendResponse = await fetchBackend(`/api/cashier/fund-requests/${requestId}/fund`, {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || body?.message || "Failed to fund request." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? { success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fund request.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
