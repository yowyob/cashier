const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const registers = await prisma.cashRegister.findMany({
            include: {
                assignedCashier: true
            },
            take: 1
        });
        console.log("Successfully fetched registers with assignedCashier:", JSON.stringify(registers, null, 2));
    } catch (e) {
        console.error("Error fetching registers:", e);
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
