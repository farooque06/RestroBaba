import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔍 Checking database connection and users...');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const userCount = await prisma.user.count();
        console.log(`✅ Connection successful. Total users: ${userCount}`);

        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                isActive: true
            }
        });

        console.log('👥 Users list:');
        console.table(users);
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
