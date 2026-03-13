import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function main() {
    console.log('🔍 Checking for the admin user...');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const user = await prisma.user.findUnique({
            where: { email: 'admin@test.com' }
        });

        if (user) {
            console.log(`✅ Admin user found: ${user.email}`);
            const isMatch = await bcrypt.compare('password123', user.password);
            console.log(`🔑 Password check ('password123'): ${isMatch ? 'MATCH' : 'FAIL'}`);
        } else {
            console.log('❌ Admin user admin@test.com NOT found.');
        }
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
