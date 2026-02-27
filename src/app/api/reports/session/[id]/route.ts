import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend } from "@/lib/backend";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/reports/session/${id}${search}`);

        if (!backendResponse.ok) {
            const body = await backendResponse.json().catch(() => null);
            return NextResponse.json(
                { error: body?.error || "Failed to generate session report." },
                { status: backendResponse.status }
            );
        }

        const buffer = await backendResponse.arrayBuffer();
        const contentType = backendResponse.headers.get("content-type") || "application/pdf";
        const contentDisposition = backendResponse.headers.get("content-disposition") ||
            `attachment; filename="session-${id}.pdf"`;

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": contentDisposition
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to generate session report." }, { status: 500 });
    }
}
