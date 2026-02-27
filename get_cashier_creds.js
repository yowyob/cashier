const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cashiers = await prisma.person.findMany({
        where: {
            cashierProfile: {
                isNot: null
            }
        },
        select: {
            user_name: true,
            user_first_name: true,
            password: true
        }
    });

    if (cashiers.length === 0) {
        console.log("No cashiers found.");
    } else {
        console.log("Cashier Credentials:");
        cashiers.forEach(c => {
            console.log(`Name: ${c.user_first_name}, Username: ${c.user_name}, Password: ${c.password}`);
        });
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
