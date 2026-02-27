import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { hashPassword } from "@/lib/passwords";
import { buildMockCustomerFromPhone } from "@/lib/customer-mock";

function normalizePhone(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function normalizeString(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function buildDefaultUsername(phone?: string | null) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    return digits ? `customer_${digits}` : null;
}

async function ensureUniqueUserName(candidate: string) {
    let next = candidate;
    let counter = 1;
    while (await prisma.person.findUnique({ where: { user_name: next } })) {
        next = `${candidate}_${counter}`;
        counter += 1;
    }
    return next;
}

async function generateUniqueAccountNumber() {
    let attempt = 0;
    while (attempt < 10) {
        const value = `ACC-${Math.floor(100000 + Math.random() * 900000)}`;
        const existing = await prisma.account.findUnique({
            where: { account_number: value }
        });
        if (!existing) return value;
        attempt += 1;
    }
    throw new Error("Unable to generate unique account number.");
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const phone = normalizePhone(body.phone);
        const lookup = buildMockCustomerFromPhone(phone || "");
        const userFirstName = normalizeString(body.user_first_name) || lookup?.user_first_name || null;
        const mail = normalizeString(body.mail) || lookup?.mail || null;
        const country = normalizeString(body.country) || lookup?.country || null;
        const profession = normalizeString(body.profession) || lookup?.profession || null;
        const accountNumber = normalizeString(body.account_number);
        const initialBalance = Number(body.initial_balance || 0);
        const providedUsername = normalizeString(body.user_name);
        const userName = providedUsername || lookup?.user_name || buildDefaultUsername(phone);

        const missingFields = [
            ["user_first_name", userFirstName],
            ["phone", phone],
            ["user_name", userName]
        ]
            .filter(([, value]) => !value)
            .map(([field]) => field);
        if (missingFields.length > 0) {
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(", ")}` },
                { status: 400 }
            );
        }
        if (Number.isNaN(initialBalance) || initialBalance < 0) {
            return NextResponse.json({ error: "Initial balance must be a positive number." }, { status: 400 });
        }

        const existingPerson = await prisma.person.findFirst({
            where: {
                OR: [
                    { user_name: userName },
                    phone ? { phone } : undefined,
                    mail ? { mail } : undefined
                ].filter(Boolean) as any
            }
        });
        if (existingPerson) {
            return NextResponse.json({ error: "Customer already exists." }, { status: 400 });
        }
        let finalAccountNumber = accountNumber;
        if (finalAccountNumber) {
            const existingAccount = await prisma.account.findUnique({
                where: { account_number: finalAccountNumber }
            });
            if (existingAccount) {
                finalAccountNumber = null;
            }
        }
        if (!finalAccountNumber) {
            finalAccountNumber = await generateUniqueAccountNumber();
        }

        const finalUserName = await ensureUniqueUserName(userName!);

        const hashedPassword = await hashPassword(body.password?.trim() || "password123");
        const result = await prisma.$transaction(async (tx) => {
            const person = await tx.person.create({
                data: {
                    user_name: finalUserName,
                    user_first_name: userFirstName!,
                    password: hashedPassword,
                    phone,
                    mail,
                    country,
                    customerProfile: {
                        create: {
                            profession,
                            date_of_joining: new Date()
                        }
                    }
                },
                include: {
                    customerProfile: true
                }
            });

            const account = await tx.account.create({
                data: {
                    client_id: person.customerProfile!.id,
                    account_number: finalAccountNumber,
                    total_funds: initialBalance,
                    is_active: true,
                    create_by: session.user.id
                }
            });

            return { person, account };
        });

        await AuditService.log({
            type: "customer_admin_create",
            authorId: session.user.id,
            payload: {
                message: "Customer account created",
                subjectType: "customer",
                subjectId: result.person.id,
                agencyId: session.user.roleType === "agency_admin" ? session.user.agencyId : null
            }
        });

        return NextResponse.json({
            id: result.person.id,
            person: result.person,
            accounts: [result.account]
        });
    } catch (error: any) {
        await AuditService.log({
            type: "customer_admin_create_error",
            payload: { message: error.message }
        });
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { search } = new URL(request.url);
        const backendResponse = await fetchBackend(`/api/admin/customers${search}`, {
            cache: "no-store"
        });
        const body = await readBackendJson(backendResponse);

        if (!backendResponse.ok) {
            return NextResponse.json(
                { error: body?.error || "Failed to load customers." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
