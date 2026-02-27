import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin" || session.user.roleType !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizations = await prisma.organization.findMany({
            orderBy: { create_on: "desc" },
            include: {
                creator: {
                    select: {
                        user_first_name: true,
                        user_name: true
                    }
                }
            }
        });
        return NextResponse.json(organizations);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin" || session.user.roleType !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        if (!body.name) {
            return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
        }

        const created = await prisma.organization.create({
            data: {
                name: body.name,
                country: body.country || null,
                description: body.description || null,
                telegram_bot_token: body.telegram_bot_token || null,
                is_active: body.is_active ?? true,
                create_by: session.user.id || null
            },
            include: {
                creator: {
                    select: {
                        user_first_name: true,
                        user_name: true
                    }
                }
            }
        });
        return NextResponse.json(created);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
