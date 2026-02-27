require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const crypto = require("crypto");

const rawUrl = process.env.DATABASE_URL || "file:./dev.db";
const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: rawUrl })
});

function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function main() {
    console.log("Clearing any existing ERP admin rows...");
    await prisma.person.deleteMany({ where: { user_name: "erp_admin" } });

    const hashed = hashPassword("ERPadmin123!");

    const erpAdmin = await prisma.person.create({
        data: {
            user_name: "erp_admin",
            user_first_name: "ERP Main Admin",
            password: hashed,
            mail: "erp_admin@example.com",
            account_number: "ERP-0001",
            telegram_chat_id: "000000000",
            adminProfile: {
                create: {
                    role_type: "superadmin",
                    office_adress: "Headquarters"
                }
            }
        }
    });

    console.log("ERP admin created:");
    console.log(`  username: ${erpAdmin.user_name}`);
    console.log("  password: ERPadmin123!");
}

main()
    .catch((error) => {
        console.error("Failed to create ERP admin", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
