import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const form = await request.formData();
        const backendResponse = await fetchBackend("/api/files", { method: "POST", body: form }, "cashier");
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json({ error: body?.error || "Upload failed." }, { status: backendResponse.status });
        }
        return NextResponse.json(body || {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Upload failed." }, { status: 500 });
    }
}
