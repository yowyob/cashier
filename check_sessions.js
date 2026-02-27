const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const registers = await prisma.cashRegister.findMany({
        include: {
            sessions: {
                orderBy: { open_on: 'desc' },
                take: 1
            }
        }
    });
    console.log(JSON.stringify(registers, null, 2));

    const events = await prisma.cashRegisterEvent.findMany({
        orderBy: { date_time: 'desc' },
        take: 5
    });
    console.log("Recent Events:", JSON.stringify(events, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
