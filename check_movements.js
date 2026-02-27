const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMovements() {
    console.log('\n=== Checking All Movements ===\n');

    // Get all sessions
    const sessions = await prisma.cashRegisterSession.findMany({
        where: { state: 'ouverte' },
        include: {
            cashRegister: {
                select: { town: true }
            },
            opener: {
                select: { user_first_name: true }
            }
        }
    });

    console.log(`Found ${sessions.length} open sessions:\n`);

    for (const session of sessions) {
        console.log(`\n📍 Session: ${session.opener.user_first_name} at ${session.cashRegister.town}`);
        console.log(`   ID: ${session.id}`);
        console.log(`   Initial Funds: ${session.theorical_initial_funds}`);

        // Get movements for this session
        const movements = await prisma.cashRegisterMovement.findMany({
            where: {
                session_id: session.id,
                is_deleted: false
            },
            orderBy: { create_on: 'desc' },
            take: 10
        });

        console.log(`   Movements: ${movements.length}`);

        let total = Number(session.theorical_initial_funds);

        if (movements.length > 0) {
            console.log('\n   Recent Movements:');
            movements.forEach((m, i) => {
                const sign = m.sense === 'entree' ? '+' : '-';
                total += m.sense === 'entree' ? Number(m.amount) : -Number(m.amount);
                console.log(`   ${i + 1}. ${sign}${Number(m.amount).toLocaleString()} XAF | ${m.sense} | ${m.reason || 'No reason'}`);
            });
        }

        console.log(`\n   💰 Calculated Balance: ${total.toLocaleString()} XAF`);
        console.log('   ' + '─'.repeat(60));
    }
}

checkMovements()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
