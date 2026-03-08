import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
    try {
        const categories = await prisma.menuCategory.findMany({
            include: { _count: { select: { items: true } } }
        });

        const orders = await prisma.order.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { menuItem: true } } }
        });

        console.log('--- CATEGORIES & STATIONS ---');
        categories.forEach(c => {
            console.log(`- ${c.name} (Station: ${c.station || 'Default'}): ${c._count.items} items`);
        });

        console.log('\n--- ORDER PATTERNS ---');
        let multiItemOrders = 0;
        let avgItems = 0;
        orders.forEach(o => {
            if (o.items.length > 2) multiItemOrders++;
            avgItems += o.items.length;
            console.log(`Order #${o.orderNumber}: ${o.items.length} items (${o.items.map(i => i.menuItem?.name).join(', ')})`);
        });

        console.log(`\nAverage items per order: ${(avgItems / orders.length).toFixed(1)}`);
        console.log(`Orders with >2 items: ${multiItemOrders} out of ${orders.length}`);

    } catch (err) {
        console.error('Analysis failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

analyze();
