import { UserService } from "../src/services/user.service";
import { CashRegisterService } from "../src/services/cash-register.service";
import { SessionService } from "../src/services/session.service";
import { MovementService } from "../src/services/movement.service";
import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("Starting test scenario...");

    // 1. Create Admin
    console.log("Creating Admin...");
    const admin = await UserService.createAdmin({
        user_name: "admin",
        user_first_name: "Super Admin",
        password: "password123",
        office_adress: "HQ",
    });
    console.log("Admin created:", admin.id);

    // 1.1 Create Organization
    const organization = await prisma.organization.create({
        data: {
            name: "Test Organization",
            country: "France"
        }
    });
    const agency = await prisma.agency.create({
        data: {
            name: "Paris Central",
            country: "France",
            town: "Paris",
            organization_id: organization.id
        }
    });

    // 2. Create Cashier
    console.log("Creating Cashier...");
    const cashier = await UserService.createCashier({
        user_name: "cashier1",
        user_first_name: "John Doe",
        password: "password123",
        town_list_chosen: JSON.stringify(["Paris", "Lyon"]),
        work_town: "Paris",
        account_number: "CASH-001",
        organization_id: organization.id,
        base_agency_id: agency.id
    });
    console.log("Cashier created:", cashier.id);

    // 3. Create Cash Register
    console.log("Creating Cash Register...");
    const register = await CashRegisterService.create({
        create_by: admin.id,
        town: "Paris",
        country: "France",
    });
    console.log("Register created:", register.id);

    // 4. Assign Cashier
    console.log("Assigning Cashier...");
    await CashRegisterService.linkCashierToRegister(register.id, cashier.id);
    console.log("Cashier assigned.");

    // 5. Open Session
    console.log("Opening Session...");
    const session = await SessionService.openSession({
        cash_register_id: register.id,
        open_by: cashier.id,
        theorical_initial_funds: 100,
    });
    console.log("Session opened:", session.id);

    // 6. Record Movements
    console.log("Recording Sale...");
    await MovementService.recordCollection({
        session_id: session.id,
        amount: 50,
        reason: "Sale #1",
        create_by: cashier.id,
    });

    console.log("Recording Expense...");
    await MovementService.recordDisbursement({
        session_id: session.id,
        amount: 10,
        reason: "Lunch",
        create_by: cashier.id,
    });

    // 7. Close Session
    // Initial (100) + In (50) - Out (10) = 140
    console.log("Closing Session (Physical Total: 140)...");
    const { updatedSession } = await SessionService.closeSession(session.id, cashier.id, 140);
    console.log("Session closed. Status:", updatedSession.state);

    // Verify reconciliation
    const reconciliation = await prisma.cashReconciliation.findUnique({
        where: { session_id: session.id }
    });
    console.log("Reconciliation Difference:", reconciliation?.difference);

    console.log("Test scenario completed successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
