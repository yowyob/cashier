const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const denoms = await prisma.currencyDenomination.findMany();
    console.log(JSON.stringify(denoms, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
