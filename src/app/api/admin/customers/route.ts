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

function filterCustomers(customers: any[], query: string | null) {
    if (!query) return customers;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter((item) => {
        const fields = [
            item?.person?.user_first_name,
            item?.person?.user_name,
            item?.person?.phone,
            item?.person?.mail,
            ...(Array.isArray(item?.accounts) ? item.accounts.map((account: any) => account?.account_number) : [])
        ];
        return fields.some((value) => String(value || "").toLowerCase().includes(normalized));
    });
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const organizationId =
            session.user.organizationId ||
            body.organization_id ||
            session.organization?.id ||
            null;
        if (!organizationId) {
            return NextResponse.json({ error: "Missing organization scope." }, { status: 400 });
        }

        const payload = {
            name: normalizeString(body.user_first_name) || normalizeString(body.user_name),
            shortName: normalizeString(body.user_name) || normalizeString(body.user_first_name),
            email: normalizeString(body.mail),
            phoneNumber: normalizeString(body.phone),
            country: normalizeString(body.country),
            description: normalizeString(body.profession),
            bankAccountNumber: normalizeString(body.account_number),
            active: true
        };

        if (!payload.name) {
            return NextResponse.json({ error: "user_first_name is required" }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/v1/customers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Tenant-ID": organizationId
            },
            body: JSON.stringify(payload)
        }, "gestion");
        const raw = await readBackendJson(backendResponse);
        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: raw?.error || raw?.message || "Failed to create customer." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(normalizeCustomer(raw ?? {}));
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to create customer." }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const organizationId =
            session.user.organizationId ||
            searchParams.get("organization_id") ||
            session.organization?.id ||
            null;
        if (!organizationId) {
            return NextResponse.json({ error: "Missing organization scope." }, { status: 400 });
        }

        const backendResponse = await fetchBackend("/api/v1/customers", {
            cache: "no-store",
            headers: {
                "X-Tenant-ID": organizationId
            }
        }, "gestion");
        const raw = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: raw?.error || raw?.message || "Failed to load customers." },
                { status: backendResponse.status }
            );
        }

        const customers = (Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [])
            .map(normalizeCustomer);

        return NextResponse.json(filterCustomers(customers, searchParams.get("search")));
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load customers." }, { status: 500 });
    }
}
