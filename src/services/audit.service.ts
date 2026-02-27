import { prisma } from "@/lib/prisma";
import { TelegramService } from "./telegram.service";
import type { RequestInfo } from "@/lib/request-info";

interface AuditPayload {
    message?: string;
    data?: any;
    agencyId?: string | null;
    organizationId?: string | null;
    subjectType?: string | null;
    subjectId?: string | null;
    requestInfo?: RequestInfo;
}

export class AuditService {
    static async log(options: {
        type: string;
        authorId?: string | null;
        payload?: AuditPayload;
    }) {
        const payload = options.payload || {};
        try {
            let authorId: string | null = options.authorId || null;
            if (authorId) {
                const authorExists = await prisma.person.findUnique({
                    where: { id: authorId },
                    select: { id: true }
                });
                if (!authorExists) {
                    authorId = null;
                }
            }
            await prisma.cashRegisterEvent.create({
                data: {
                    type: options.type,
                    author_id: authorId,
                    subject_type: payload.subjectType || payload.subjectType === null ? payload.subjectType : payload.subjectType,
                    subject_id: payload.subjectId || payload.subjectId === null ? payload.subjectId : payload.subjectId,
                    payload: JSON.stringify({
                        ...payload,
                        agencyId: payload.agencyId || null,
                        ip: payload.requestInfo?.ip || undefined,
                        userAgent: payload.requestInfo?.userAgent || undefined,
                        timestamp: payload.requestInfo?.timestamp || undefined,
                    })
                }
            });

            // Notifications Telegram pour les erreurs / échecs
            const isError = options.type?.toLowerCase().includes("error") || options.type === "login_fail";
            if (isError) {
                let targetAgencyId = payload.agencyId || null;
                let targetOrganizationId = payload.organizationId || null;
                let recipients: { superadmin?: boolean; organizationAdmin?: boolean; agencyAdmin?: boolean } | undefined;

                if (options.authorId) {
                    const author = await prisma.person.findUnique({
                        where: { id: options.authorId },
                        include: { adminProfile: true, cashierProfile: true }
                    });

                    if (author?.adminProfile) {
                        const roleType = author.adminProfile.role_type;
                        if (roleType === "organization_admin") {
                            recipients = { superadmin: true, organizationAdmin: false, agencyAdmin: false };
                        } else if (roleType === "superadmin") {
                            recipients = { superadmin: true, organizationAdmin: false, agencyAdmin: false };
                        } else if (author.adminProfile.agency_id) {
                            targetAgencyId = targetAgencyId || author.adminProfile.agency_id;
                            targetOrganizationId = targetOrganizationId || author.adminProfile.organization_id;
                            recipients = { superadmin: false, organizationAdmin: true, agencyAdmin: false };
                        }
                    } else if (author?.cashierProfile) {
                        targetAgencyId = targetAgencyId || author.cashierProfile.base_agency_id || null;
                        targetOrganizationId = targetOrganizationId || author.cashierProfile.organization_id || null;
                        recipients = { superadmin: false, organizationAdmin: false, agencyAdmin: true };
                    }
                }

                if (!targetOrganizationId && targetAgencyId) {
                    const agency = await prisma.agency.findUnique({
                        where: { id: targetAgencyId },
                        select: { organization_id: true }
                    });
                    targetOrganizationId = agency?.organization_id || null;
                }

                // Enrichir le message avec les infos de requête
                let enrichedMessage = payload.message || `Event ${options.type}`;
                if (payload.requestInfo) {
                    enrichedMessage += `\n\n🌐 *Source:*\n`;
                    enrichedMessage += `IP: \`${payload.requestInfo.ip}\`\n`;
                    enrichedMessage += `User-Agent: \`${payload.requestInfo.userAgent}\`\n`;
                    enrichedMessage += `Time: ${payload.requestInfo.timestamp}`;
                }

                TelegramService.notifyAdmins({
                    type: options.type,
                    agencyId: targetAgencyId,
                    organizationId: targetOrganizationId,
                    recipients,
                    message: enrichedMessage,
                    data: payload.data,
                }).catch(() => { /* ne bloque pas l'audit */ });
            }
        } catch (e) {
            // Do not throw from audit logging to avoid breaking main flow
            console.error("Audit log failed", e);
        }
    }
}
