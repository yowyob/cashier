#!/usr/bin/env node
/**
 * Script pour obtenir les chat_ids des utilisateurs qui ont interagi avec le bot
 *
 * Usage:
 * 1. Demandez à chaque admin d'ouvrir Telegram
 * 2. Rechercher le bot: @yowyob_ERP_cashiers_bot
 * 3. Cliquer sur "Start" ou envoyer /start
 * 4. Exécuter ce script: node scripts/get_telegram_updates.js
 */

const https = require('https');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const url = `https://api.telegram.org/bot${TOKEN}/getUpdates`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);

            if (!response.ok) {
                console.error('Erreur API Telegram:', response);
                return;
            }

            console.log('\n📱 Utilisateurs ayant interagi avec le bot:\n');

            const uniqueUsers = new Map();

            response.result.forEach(update => {
                const user = update.message?.from || update.callback_query?.from;
                if (user) {
                    uniqueUsers.set(user.id, {
                        chat_id: user.id,
                        username: user.username || 'N/A',
                        first_name: user.first_name || '',
                        last_name: user.last_name || ''
                    });
                }
            });

            if (uniqueUsers.size === 0) {
                console.log('❌ Aucun utilisateur trouvé.');
                console.log('\nAssurez-vous que les admins ont:');
                console.log('1. Ouvert Telegram');
                console.log('2. Recherché: @yowyob_ERP_cashiers_bot');
                console.log('3. Cliqué sur "Start" ou envoyé /start');
                return;
            }

            uniqueUsers.forEach((user, id) => {
                console.log(`👤 ${user.first_name} ${user.last_name} (@${user.username})`);
                console.log(`   Chat ID: ${id}`);
                console.log('');
            });

            console.log('\n💡 Pour mettre à jour la base de données:');
            console.log('   Utilisez le chat_id ci-dessus pour chaque admin\n');

        } catch (e) {
            console.error('Erreur:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('Erreur réseau:', err.message);
});
