import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding customers...');

    // Create customers
    const customers = [
        {
            user_name: 'jean.dupont',
            user_first_name: 'Jean Dupont',
            password: 'password123',
            phone: '+237650123456',
            mail: 'jean.dupont@example.com',
            born_on: new Date('1985-03-15'),
            sexe: 'M',
            adresse: '123 Avenue de la Liberté',
            country: 'Cameroon',
            actif: true,
            profession: 'Commerçant',
            initialBalance: 500000
        },
        {
            user_name: 'marie.ngono',
            user_first_name: 'Marie Ngono',
            password: 'password123',
            phone: '+237670234567',
            mail: 'marie.ngono@example.com',
            born_on: new Date('1990-07-22'),
            sexe: 'F',
            adresse: '45 Rue du Marché',
            country: 'Cameroon',
            actif: true,
            profession: 'Enseignante',
            initialBalance: 750000
        },
        {
            user_name: 'paul.kamga',
            user_first_name: 'Paul Kamga',
            password: 'password123',
            phone: '+237680345678',
            mail: 'paul.kamga@example.com',
            born_on: new Date('1978-11-30'),
            sexe: 'M',
            adresse: '78 Boulevard du 20 Mai',
            country: 'Cameroon',
            actif: true,
            profession: 'Entrepreneur',
            initialBalance: 1200000
        },
        {
            user_name: 'alice.fotso',
            user_first_name: 'Alice Fotso',
            password: 'password123',
            phone: '+237690456789',
            mail: 'alice.fotso@example.com',
            born_on: new Date('1995-05-18'),
            sexe: 'F',
            adresse: '12 Quartier Briqueterie',
            country: 'Cameroon',
            actif: true,
            profession: 'Infirmière',
            initialBalance: 320000
        },
        {
            user_name: 'robert.mbida',
            user_first_name: 'Robert Mbida',
            password: 'password123',
            phone: '+237650567890',
            mail: 'robert.mbida@example.com',
            born_on: new Date('1982-09-25'),
            sexe: 'M',
            adresse: '56 Avenue Kennedy',
            country: 'Cameroon',
            actif: true,
            profession: 'Chauffeur',
            initialBalance: 180000
        },
        {
            user_name: 'grace.talla',
            user_first_name: 'Grace Talla',
            password: 'password123',
            phone: '+237670678901',
            mail: 'grace.talla@example.com',
            born_on: new Date('1988-12-10'),
            sexe: 'F',
            adresse: '89 Rue de la Réunification',
            country: 'Cameroon',
            actif: true,
            profession: 'Couturière',
            initialBalance: 450000
        },
        {
            user_name: 'eric.ngouo',
            user_first_name: 'Eric Ngouo',
            password: 'password123',
            phone: '+237680789012',
            mail: 'eric.ngouo@example.com',
            born_on: new Date('1992-04-08'),
            sexe: 'M',
            adresse: '23 Carrefour Warda',
            country: 'Cameroon',
            actif: true,
            profession: 'Mécanicien',
            initialBalance: 280000
        },
        {
            user_name: 'sandra.mba',
            user_first_name: 'Sandra Mba',
            password: 'password123',
            phone: '+237690890123',
            mail: 'sandra.mba@example.com',
            born_on: new Date('1987-06-14'),
            sexe: 'F',
            adresse: '67 Quartier Bastos',
            country: 'Cameroon',
            actif: true,
            profession: 'Pharmacienne',
            initialBalance: 980000
        }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const customerData of customers) {
        try {
            // Check if customer already exists
            const existing = await prisma.person.findUnique({
                where: { user_name: customerData.user_name }
            });

            if (existing) {
                console.log(`⏭️  Customer ${customerData.user_first_name} already exists, skipping...`);
                skippedCount++;
                continue;
            }

            // Create Person with CustomerProfile and Account in a transaction
            const customer = await prisma.person.create({
                data: {
                    user_name: customerData.user_name,
                    user_first_name: customerData.user_first_name,
                    password: customerData.password,
                    phone: customerData.phone,
                    mail: customerData.mail,
                    born_on: customerData.born_on,
                    sexe: customerData.sexe,
                    adresse: customerData.adresse,
                    country: customerData.country,
                    actif: customerData.actif,
                    customerProfile: {
                        create: {
                            profession: customerData.profession,
                            date_of_joining: new Date()
                        }
                    }
                },
                include: {
                    customerProfile: true
                }
            });

            // Create account for the customer
            if (customer.customerProfile) {
                await prisma.account.create({
                    data: {
                        client_id: customer.customerProfile.id,
                        total_funds: customerData.initialBalance,
                        is_active: true
                    }
                });
            }

            console.log(`✅ Created customer: ${customerData.user_first_name} (Balance: ${customerData.initialBalance.toLocaleString()} XAF)`);
            createdCount++;

        } catch (error: any) {
            console.error(`❌ Error creating customer ${customerData.user_first_name}:`, error.message);
        }
    }

    console.log('\n🎉 Seeding completed!');
    console.log(`   ✅ Created: ${createdCount} customers`);
    console.log(`   ⏭️  Skipped: ${skippedCount} customers (already exist)`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
