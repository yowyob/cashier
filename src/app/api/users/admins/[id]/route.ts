import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const contentType = request.headers.get("content-type") || "application/json";
        const bodyText = await request.text();

        const backendResponse = await fetchBackend(`/api/users/admins/${id}`, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: bodyText
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to update admin." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? {});
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to update admin." }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const backendResponse = await fetchBackend(`/api/users/admins/${id}`, {
            method: "DELETE"
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to delete admin." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(body ?? { success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to delete admin." }, { status: 500 });
    }
}
