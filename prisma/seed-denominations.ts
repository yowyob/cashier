import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const denominations = [
    { value: 10000, label: '10 000 XAF', order: 1 },
    { value: 5000, label: '5 000 XAF', order: 2 },
    { value: 2000, label: '2 000 XAF', order: 3 },
    { value: 1000, label: '1 000 XAF', order: 4 },
    { value: 500, label: '500 XAF', order: 5 },
    { value: 100, label: '100 XAF', order: 6 },
    { value: 50, label: '50 XAF', order: 7 },
    { value: 25, label: '25 XAF', order: 8 },
];

async function main() {
    console.log('Seeding denominations...');
    for (const d of denominations) {
        await prisma.currencyDenomination.create({
            data: {
                currency: 'XAF',
                value: d.value,
                label: d.label,
                order: d.order,
            },
        });
    }
    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
