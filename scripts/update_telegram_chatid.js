#!/usr/bin/env node
/**
 * Script pour mettre à jour le telegram_chat_id d'un admin
 *
 * Usage: node scripts/update_telegram_chatid.js <username> <chat_id>
 * Exemple: node scripts/update_telegram_chatid.js admin2 987654321
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const [, , username, chatId] = process.argv;

if (!username || !chatId) {
    console.error('❌ Usage: node scripts/update_telegram_chatid.js <username> <chat_id>');
    console.error('   Exemple: node scripts/update_telegram_chatid.js admin2 987654321');
    process.exit(1);
}

(async () => {
    try {
        const updated = await prisma.person.updateMany({
            where: { user_name: username },
            data: { telegram_chat_id: chatId }
        });

        if (updated.count === 0) {
            console.log(`❌ Utilisateur "${username}" non trouvé`);
        } else {
            console.log(`✅ Chat ID mis à jour pour ${username}: ${chatId}`);
        }

        // Afficher tous les admins
        const admins = await prisma.person.findMany({
            where: { telegram_chat_id: { not: null } },
            select: {
                user_name: true,
                user_first_name: true,
                telegram_chat_id: true,
                adminProfile: { select: { role_type: true } }
            }
        });

        console.log('\n📋 Tous les admins avec Telegram:');
        admins.forEach(admin => {
            console.log(`  • ${admin.user_first_name} (@${admin.user_name}): ${admin.telegram_chat_id}`);
        });

    } catch (e) {
        console.error('Erreur:', e.message);
    } finally {
        await prisma.$disconnect();
    }
})();
