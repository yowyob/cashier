import { UserService } from "../src/services/user.service";
import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("Creating Admin user...");

    const admin = await UserService.createAdmin({
        user_name: "admin",
        user_first_name: "Super Admin",
        password: "password123",
        office_adress: "HQ",
        mail: "admin@example.com"
    });

    console.log("✅ Admin created successfully!");
    console.log("Username: admin");
    console.log("Password: password123");
    console.log("Admin ID:", admin.id);
}

main()
    .catch((e) => {
        console.error("❌ Error:", e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
