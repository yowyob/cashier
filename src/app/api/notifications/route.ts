import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

type Newsletter = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    category?: string | null;
};

type ForumMessage = {
    id: string;
    author: string;
    body: string;
    created_at: string;
};

type Forum = {
    id: string;
    title: string;
    description: string;
    created_at: string;
    participants: number;
    messages: ForumMessage[];
};

function buildNewsletters(role: string, roleType?: string | null): Newsletter[] {
    const now = new Date();
    const items: Newsletter[] = [
        {
            id: "news-ops-001",
            title: "Daily Operations Summary",
            content: "Highlights from today across cash registers and sessions.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
            category: "Operations"
        },
        {
            id: "news-security-001",
            title: "Security Reminder",
            content: "Review session locking and reconciliation procedures before close.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 20).toISOString(),
            category: "Compliance"
        }
    ];

    if (role === "cashier") {
        items.unshift({
            id: "news-cashier-001",
            title: "Cashier Best Practices",
            content: "Verify billetage and ensure all transactions are within session hours.",
            created_at: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
            category: "Training"
        });
    }

    if (role === "admin" && roleType === "organization_admin") {
        items.unshift({
            id: "news-org-001",
            title: "Organization Updates",
            content: "New agencies and assignments need review this week.",
            created_at: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
            category: "Organization"
        });
    }

    if (role === "admin" && roleType === "superadmin") {
        items.unshift({
            id: "news-erp-001",
            title: "ERP Admin Bulletin",
            content: "Monitor organization onboarding and admin assignments.",
            created_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
            category: "ERP"
        });
    }

    return items;
}

function buildForums(role: string, roleType?: string | null): Forum[] {
    const now = new Date();
    const baseForums: Forum[] = [
        {
            id: "forum-ops-001",
            title: "Operations Corner",
            description: "Discuss daily session handling, billetage tips, and reconciliations.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 30).toISOString(),
            participants: 18,
            messages: [
                {
                    id: "forum-ops-001-msg-01",
                    author: "Audit Team",
                    body: "Please share any issues encountered during closing sessions this week.",
                    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString()
                },
                {
                    id: "forum-ops-001-msg-02",
                    author: "Branch Lead",
                    body: "Reminder: verify opening funds ticketing before assigning a register.",
                    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString()
                }
            ]
        },
        {
            id: "forum-support-001",
            title: "Support & Help",
            description: "Ask for help or request clarifications on workflows.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
            participants: 12,
            messages: [
                {
                    id: "forum-support-001-msg-01",
                    author: "Support",
                    body: "Drop your questions here, we answer within 24h.",
                    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 10).toISOString()
                }
            ]
        }
    ];

    if (role === "cashier") {
        baseForums.unshift({
            id: "forum-cashier-001",
            title: "Cashier Forum",
            description: "Share tips for faster processing and customer service.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 20).toISOString(),
            participants: 22,
            messages: [
                {
                    id: "forum-cashier-001-msg-01",
                    author: "Senior Cashier",
                    body: "Remember: transactions must be within the session window.",
                    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString()
                }
            ]
        });
    }

    if (role === "admin" && roleType === "organization_admin") {
        baseForums.unshift({
            id: "forum-org-001",
            title: "Org Admin Forum",
            description: "Coordinate agency onboarding and cashier assignments.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
            participants: 7,
            messages: [
                {
                    id: "forum-org-001-msg-01",
                    author: "Org Lead",
                    body: "Post assignment updates and staffing changes here.",
                    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString()
                }
            ]
        });
    }

    if (role === "admin" && roleType === "superadmin") {
        baseForums.unshift({
            id: "forum-erp-001",
            title: "ERP Admin Forum",
            description: "Track organization creation and admin lifecycle.",
            created_at: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(),
            participants: 4,
            messages: [
                {
                    id: "forum-erp-001-msg-01",
                    author: "ERP Ops",
                    body: "Please review pending organization onboarding.",
                    created_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString()
                }
            ]
        });
    }

    return baseForums;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role || "user";
        const roleType = session.user.roleType || null;

        return NextResponse.json({
            newsletters: buildNewsletters(role, roleType),
            forums: buildForums(role, roleType)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
