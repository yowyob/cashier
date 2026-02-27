const TELEGRAM_API_BASE = "https://api.telegram.org";

interface NotifyAdminsInput {
    type: string;
    agencyId?: string | null;
    organizationId?: string | null;
    message: string;
    data?: Record<string, any> | null;
    recipients?: {
        superadmin?: boolean;
        organizationAdmin?: boolean;
        agencyAdmin?: boolean;
    };
}

export class TelegramService {
    private static token = process.env.TELEGRAM_BOT_TOKEN;

    private static async sendMessageWithToken(chatId: string, text: string, token: string) {
        if (!token || !chatId) return;
        const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

        const body = {
            chat_id: chatId,
            // Pas de parse_mode pour éviter les erreurs Markdown quand l'UA/IP contient des caractères spéciaux
            text,
        };

        try {
            // Essai via fetch natif
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
        } catch (e) {
            // Fallback Node (curl) si fetch échoue (ex: restrictions réseau/fetch)
            try {
                const { exec } = await import("child_process");
                await new Promise((resolve, reject) => {
                    const cmd = `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(body).replace(/'/g, "'\"'\"'")}'`;
                    exec(cmd, (err, stdout, stderr) => {
                        if (err) return reject(err);
                        if (stderr) console.error("Telegram curl stderr:", stderr);
                        resolve(stdout);
                    });
                });
            } catch (err) {
                console.error("Telegram notify failed (fetch+curl)", err);
            }
        }
    }

    static async sendTestMessage(input: { chatId: string; token: string; message: string }) {
        await this.sendMessageWithToken(input.chatId, input.message, input.token);
    }

    static async notifyAdmins(input: NotifyAdminsInput) {
        try {
            const includeSuperadmin = input.recipients?.superadmin ?? true;
            const includeOrganizationAdmin = input.recipients?.organizationAdmin ?? true;
            const includeAgencyAdmin = input.recipients?.agencyAdmin ?? true;

            const conditions: any[] = [];
            if (includeSuperadmin) {
                conditions.push({ adminProfile: { role_type: "superadmin" } });
            }
            if (includeOrganizationAdmin && input.organizationId) {
                conditions.push({
                    adminProfile: { role_type: "organization_admin", organization_id: input.organizationId }
                });
            }
            if (includeAgencyAdmin && input.agencyId) {
                conditions.push({
                    adminProfile: { agency_id: input.agencyId }
                });
            }

            if (conditions.length === 0) {
                return;
            }

            // Récupère admins ciblés
            const { prisma } = await import("@/lib/prisma");
            const admins = await prisma.person.findMany({
                where: {
                    telegram_chat_id: { not: null },
                    OR: conditions as never
                },
                select: {
                    telegram_chat_id: true,
                    telegram_bot_token: true,
                    adminProfile: true,
                    user_first_name: true,
                    user_name: true
                }
            });

            const payloadText = [
                `*${input.type}*`,
                input.message,
                input.agencyId ? `Agency: ${input.agencyId}` : null,
                input.organizationId ? `Organization: ${input.organizationId}` : null,
                input.data ? `Data: \`${JSON.stringify(input.data)}\`` : null
            ].filter(Boolean).join("\n");

            let organizationToken: string | null = null;
            if (input.organizationId) {
                const organization = await prisma.organization.findUnique({
                    where: { id: input.organizationId },
                    select: {
                        telegram_bot_token: true
                    }
                });
                organizationToken = organization?.telegram_bot_token || null;
            }

            await Promise.all(
                admins.map((admin) => {
                    const chatId = admin.telegram_chat_id;
                    if (!chatId) return Promise.resolve();
                    const isSuperadmin = admin.adminProfile?.role_type === "superadmin";
                    const token =
                        admin.telegram_bot_token ||
                        (isSuperadmin ? this.token : organizationToken || this.token);
                    if (!token) return Promise.resolve();
                    return this.sendMessageWithToken(chatId, payloadText, token);
                })
            );
        } catch (e) {
            console.error("Telegram notify failed", e);
        }
    }
}
