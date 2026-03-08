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
    console.log('🗑️  Deleting all data...');

    // Delete in dependency order
    await prisma.activityLog.deleteMany();
    await prisma.inventoryTransaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.recipeItem.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.menuCategory.deleteMany();
    await prisma.table.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.user.deleteMany();
    await prisma.client.deleteMany();

    console.log('✅ All data deleted.');

    // Create Super Admin
    const hashedPassword = await bcrypt.hash('superadmin', 10);
    const superAdmin = await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: 'super@restroflow.com',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            totpSecret: null,
        }
    });

    console.log('\n👑 Super Admin Created!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Email:    super@restroflow.com');
    console.log('   Password: superadmin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
