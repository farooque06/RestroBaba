import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('👷 Creating Test Super Admin...');

    const email = 'admin@test.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('⚠️  User already exists.');
            return;
        }

        const admin = await prisma.user.create({
            data: {
                name: 'Test Super Admin',
                email: email,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                isActive: true
            }
        });

        console.log('✅ Super Admin created successfully!');
        console.log('-----------------------------------');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('-----------------------------------');
    } catch (err) {
        console.error('❌ Database Error:', err);
    }
}

main()
    .catch((e) => {
        console.error('❌ Script Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
