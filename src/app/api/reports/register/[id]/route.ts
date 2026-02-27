import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();

        const backendResponse = await fetchBackend(`/api/reports/register/${id}`, {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: bodyText
        });

        if (backendResponse.ok) {
            const contentTypeHeader = backendResponse.headers.get("content-type") || "application/pdf";
            const disposition =
                backendResponse.headers.get("content-disposition") ||
                `attachment; filename=\"register-${id}-${new Date().toISOString().split("T")[0]}.pdf\"`;
            const buffer = await backendResponse.arrayBuffer();
            return new NextResponse(buffer, {
                headers: {
                    "Content-Type": contentTypeHeader,
                    "Content-Disposition": disposition
                }
            });
        }

        const body = await readBackendJson(backendResponse);
        if (backendResponse.status === 404 || backendResponse.status === 405) {
            return NextResponse.json(
                { error: "Register report endpoint is not available on the configured backends." },
                { status: 501 }
            );
        }

        return NextResponse.json(
            { error: body?.error || "Failed to generate register report." },
            { status: backendResponse.status }
        );
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to generate register report." }, { status: 500 });
    }
}
