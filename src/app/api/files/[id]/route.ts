import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend } from "@/lib/backend";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendResponse = await fetchBackend(`/api/files/${id}`, { cache: "no-store" }, "cashier");
        if (!backendResponse.ok || !backendResponse.body) {
            return NextResponse.json({ error: "File not found." }, { status: backendResponse.status || 404 });
        }

        const headers = new Headers();
        const contentType = backendResponse.headers.get("content-type");
        if (contentType) headers.set("content-type", contentType);
        const contentLength = backendResponse.headers.get("content-length");
        if (contentLength) headers.set("content-length", contentLength);
        headers.set("cache-control", "private, max-age=3600");
        return new NextResponse(backendResponse.body, { status: 200, headers });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "File not found." }, { status: 500 });
    }
}
