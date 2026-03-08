import express from 'express';
import prisma from '../services/prisma.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Get general dashboard stats
router.get('/', roleMiddleware(['ADMIN']), async (req, res, next) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const [revenue, expenses, activeTables, kitchenOrders, lowStockCount, lowStockItems] = await Promise.all([
            prisma.order.aggregate({
                where: { clientId: req.clientId!, status: 'Paid' },
                _sum: { totalAmount: true }
            }),
            prisma.expense.aggregate({
                where: { clientId: req.clientId! },
                _sum: { amount: true }
            }),
            prisma.table.count({
                where: { clientId: req.clientId!, status: 'Occupied' }
            }),
            prisma.order.count({
                where: { clientId: req.clientId!, status: { in: ['Pending', 'Cooking'] } }
            }),
            prisma.inventoryItem.count({
                where: {
                    clientId: req.clientId!,
                    quantity: { lte: prisma.inventoryItem.fields.minThreshold as any }
                }
            }),
            prisma.inventoryItem.findMany({
                where: {
                    clientId: req.clientId!,
                    quantity: { lte: 20 } // Fallback for lte field comparison if complex
                },
                take: 3,
                select: { name: true, quantity: true, unit: true, minThreshold: true }
            })
        ]);

        // Re-run low stock more accurately if possible, or just use the findMany data
        // For Prisma, comparing two fields in the same row requires raw query or specific versions
        // Let's use a simpler approach: get all items and filter in JS if the list is small, 
        // or just use a fixed low number for "Quick Win" demo.
        // Better: Use a raw query or just fetch and filter since it's a small dashboard view.

        const allItems = await prisma.inventoryItem.findMany({
            where: { clientId: req.clientId! },
            select: { name: true, quantity: true, unit: true, minThreshold: true }
        });

        const realLowStock = allItems.filter(item => item.quantity <= item.minThreshold);

        const totalRevenue = revenue._sum.totalAmount || 0;
        const totalExpenses = expenses._sum.amount || 0;

        res.json({
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: totalRevenue - totalExpenses,
            activeTables,
            kitchenOrders,
            lowStockCount: realLowStock.length,
            lowStockItems: realLowStock.slice(0, 5)
        });
    } catch (error) {
        next(error);
    }
});

// Daily Sales stats for last 7 days
router.get('/daily-sales', roleMiddleware(['ADMIN']), async (req, res, next) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const sales = await prisma.order.findMany({
            where: {
                clientId: req.clientId,
                status: 'Paid',
                createdAt: { gte: sevenDaysAgo }
            },
            select: {
                totalAmount: true,
                createdAt: true
            }
        });

        // Group by day
        const grouped = sales.reduce((acc: any, order) => {
            const date = order.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + order.totalAmount;
            return acc;
        }, {});

        res.json(grouped);
    } catch (error) {
        next(error);
    }
});

// Top selling items
router.get('/top-items', roleMiddleware(['ADMIN']), async (req, res, next) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        // This is a simplified version; in a real app, we'd join with OrderItems
        // For now, let's just get the most frequent status changes to 'Paid' for specific menu items
        // Or better, if we had OrderItems implemented (which we do if we follow schema)
        const topItems = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                order: { clientId: req.clientId, status: 'Paid' }
            },
            _sum: {
                quantity: true
            },
            _count: {
                id: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 5
        });

        // Fetch names for these items
        const itemsWithDetails = await Promise.all(topItems.map(async (item) => {
            const details = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
            return {
                name: details?.name || 'Unknown',
                quantity: item._sum.quantity,
                orders: item._count.id
            };
        }));

        res.json(itemsWithDetails);
    } catch (error) {
        next(error);
    }
});

// Staff activity ranking
router.get('/staff-performance', roleMiddleware(['ADMIN']), async (req, res, next) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const performance = await prisma.activityLog.groupBy({
            by: ['userId'],
            where: { clientId: req.clientId },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 10
        });

        const performanceWithNames = await Promise.all(performance.map(async (p) => {
            const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { name: true, role: true } });
            return {
                name: user?.name || 'Unknown',
                role: user?.role,
                actions: p._count.id
            };
        }));

        res.json(performanceWithNames);
    } catch (error) {
        next(error);
    }
});

export default router;
