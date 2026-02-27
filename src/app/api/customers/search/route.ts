import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";

function normalizeString(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeCustomer(raw: any) {
    const id = String(raw?.id ?? "");
    const accountNumber = normalizeString(raw?.bank_account_number ?? raw?.accounting_account);
    return {
        id,
        person: {
            id,
            user_first_name: raw?.name ?? raw?.short_name ?? "-",
            user_name: raw?.short_name ?? raw?.name ?? "-",
            phone: raw?.phone_number ?? null,
            mail: raw?.email ?? null
        },
        phone: raw?.phone_number ?? null,
        accounts: accountNumber
            ? [{
                id: `${id}:${accountNumber}`,
                account_number: accountNumber,
                total_funds: 0,
                is_active: raw?.active ?? true
            }]
            : []
    };
}

function matchesQuery(customer: any, query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    const fields = [
        customer?.person?.user_first_name,
        customer?.person?.user_name,
        customer?.person?.phone,
        customer?.person?.mail,
        ...(Array.isArray(customer?.accounts) ? customer.accounts.map((account: any) => account?.account_number) : [])
    ];
    return fields.some((value) => String(value || "").toLowerCase().includes(normalized));
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    if (!query) {
        return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId || session.organization?.id || null;
        if (!organizationId) {
            return NextResponse.json({ error: "Missing organization scope." }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/v1/customers", {
            cache: "no-store",
            headers: {
                "X-Tenant-ID": organizationId
            }
        }, "gestion");
        const body = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || body?.message || "Failed to search customers." },
                { status: backendResponse.status }
            );
        }

        const customers = (Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
            .map(normalizeCustomer)
            .filter((item) => matchesQuery(item, query));

        return NextResponse.json(customers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
