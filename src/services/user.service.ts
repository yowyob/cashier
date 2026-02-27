import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

export class UserService {
    static async createAdmin(data: {
        user_name: string;
        user_first_name: string;
        password: string;
        office_adress?: string;
        mail?: string;
        role_type?: "superadmin" | "organization_admin" | "agency_admin";
        agency_id?: string | null;
        organization_id?: string | null;
        telegram_chat_id?: string | null;
        account_number: string;
        country?: string | null;
        phone?: string | null;
        organization_bot_token?: string | null;
    }) {
        const hashedPassword = await hashPassword(data.password);

        const id = crypto.randomUUID();

        return prisma.$transaction(async (tx) => {
            const person = await tx.person.create({
                data: {
                    id,
                    user_name: data.user_name,
                    user_first_name: data.user_first_name,
                    password: hashedPassword,
                    mail: data.mail,
                },
                include: {
                    adminProfile: true,
                },
            });

            await tx.adminProfile.upsert({
                where: { personId: id },
                create: {
                    personId: id,
                    office_adress: data.office_adress,
                    role_type: data.role_type || "superadmin",
                    agency_id: data.role_type === "agency_admin" ? data.agency_id ?? null : null,
                    organization_id: data.role_type === "organization_admin" ? data.organization_id ?? null : null
                },
                update: {
                    office_adress: data.office_adress,
                    role_type: data.role_type || "superadmin",
                    agency_id: data.role_type === "agency_admin" ? data.agency_id ?? null : null,
                    organization_id: data.role_type === "organization_admin" ? data.organization_id ?? null : null
                }
            });

            await tx.$executeRaw`UPDATE Person SET account_number = ${data.account_number}, telegram_chat_id = ${data.telegram_chat_id || null}, country = ${data.country || null}, phone = ${data.phone || null} WHERE id = ${id}`;

            if (data.role_type === "agency_admin" && data.agency_id) {
                await tx.agency.update({
                    where: { id: data.agency_id },
                    data: {
                        requires_admin_assignment: false
                    }
                });
            }
            if (data.role_type === "organization_admin" && data.organization_id) {
                const orgUpdate: any = {};
                if (data.organization_bot_token !== undefined) {
                    orgUpdate.telegram_bot_token = data.organization_bot_token || null;
                }
                if (Object.keys(orgUpdate).length > 0) {
                    await tx.organization.update({
                        where: { id: data.organization_id },
                        data: orgUpdate
                    });
                }
            }

            return person;
        });
    }

    static async createCashier(data: {
        user_name: string;
        user_first_name: string;
        password: string;
        town_list_chosen?: string;
        work_town: string;
        hire_date?: Date;
        mail?: string;
        account_number: string;
        organization_id: string;
        base_agency_id: string;
    }) {
        const hashedPassword = await hashPassword(data.password);

        return prisma.person.create({
            data: {
                user_name: data.user_name,
                user_first_name: data.user_first_name,
                password: hashedPassword,
                mail: data.mail,
                account_number: data.account_number,
                cashierProfile: {
                    create: {
                        town_list_chosen: data.town_list_chosen,
                        work_town: data.work_town,
                        hire_date: data.hire_date,
                        organization_id: data.organization_id,
                        base_agency_id: data.base_agency_id
                    },
                },
            },
            include: {
                cashierProfile: true,
            },
        });
    }

    static async findByUsername(username: string) {
        return prisma.person.findUnique({
            where: { user_name: username },
            include: {
                adminProfile: true,
                cashierProfile: true,
            },
        });
    }
}
