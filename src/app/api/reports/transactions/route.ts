import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend } from "@/lib/backend";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/reports/transactions${search}`, {
            cache: "no-store"
        });

        if (!backendResponse.ok) {
            const text = await backendResponse.text().catch(() => "");
            return NextResponse.json(
                { error: text || "Failed to generate transactions report." },
                { status: backendResponse.status }
            );
        }

        const pdfBuffer = await backendResponse.arrayBuffer();
        const contentType = backendResponse.headers.get("Content-Type") || "application/pdf";
        const contentDisposition = backendResponse.headers.get("Content-Disposition");

        const headers: Record<string, string> = {
            "Content-Type": contentType
        };
        if (contentDisposition) {
            headers["Content-Disposition"] = contentDisposition;
        }

        return new NextResponse(pdfBuffer, { headers });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to generate transactions report." },
            { status: 500 }
        );
    }
}
