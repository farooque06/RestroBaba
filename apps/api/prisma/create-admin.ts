import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('👷 Creating Test Super Admin...');

    const email = 'admin@test.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

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
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
