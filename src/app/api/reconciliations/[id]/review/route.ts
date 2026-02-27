import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

// Admin validates or rejects reconciliation
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized. Only admins can review reconciliations." }, { status: 403 });
        }

        const { id: reconciliationId } = await params;
        const body = await request.json();

        const primaryResponse = await fetchBackend(`/api/admin/reconciliations/${reconciliationId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const primaryPayload = await readBackendJson(primaryResponse);

        if (primaryResponse.ok) {
            return NextResponse.json(primaryPayload ?? {});
        }

        // Fallback: some backends expose non-admin route
        const fallbackResponse = await fetchBackend(`/api/reconciliations/${reconciliationId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const fallbackPayload = await readBackendJson(fallbackResponse);

        if (fallbackResponse.ok) {
            return NextResponse.json(fallbackPayload ?? {});
        }

        return NextResponse.json(
            { error: primaryPayload?.error || primaryPayload?.message || fallbackPayload?.error || "Reconciliation review failed" },
            { status: primaryResponse.status }
        );
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
