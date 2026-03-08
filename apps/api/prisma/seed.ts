import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding database...')

    // Create Super Admin (Unique System Owner)
    const superAdminHash = await bcrypt.hash('super123', 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'super@restroflow.com' },
        update: { password: superAdminHash, totpSecret: null },
        create: {
            name: 'Super Admin',
            email: 'super@restroflow.com',
            password: superAdminHash,
            role: 'SUPER_ADMIN',
            totpSecret: null,
        }
    })
    console.log('👑 Created Super Admin:', superAdmin.name)

    console.log('\n✨ Seeding complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('   Email:    super@restroflow.com')
    console.log('   Password: super123')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
