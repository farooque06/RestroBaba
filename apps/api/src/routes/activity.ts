import express, { Request, Response } from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get recent activity logs with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const { startDate, endDate, type } = req.query;

    try {
        const where: any = {};
        
        // If not a Super Admin, restrict to their own clientId
        if (user.role !== 'SUPER_ADMIN') {
            where.clientId = user.clientId;
        }

        if (type) {
            where.type = type as string;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const logs = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { 
                user: { select: { name: true } },
                client: { select: { name: true } }
            }
        });

        const total = await prisma.activityLog.count({ where });

        res.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                hasMore: total > skip + logs.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Get inventory transactions with pagination and filtering
router.get('/inventory', async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { itemId, startDate, endDate, type, reason } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    try {
        const where: any = { clientId: user.clientId };
        if (itemId) where.inventoryItemId = itemId as string;
        if (type) where.type = type as string;
        if (reason) where.reason = reason as string;

        // RBAC: Waiters and Chefs see only their own transactions, Admins see all
        if (user.role !== 'ADMIN') {
            where.userId = user.userId;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const transactions = await prisma.inventoryTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                inventoryItem: true,
                user: { select: { name: true } },
                order: { select: { id: true, orderNumber: true } }
            }
        });

        const total = await prisma.inventoryTransaction.count({ where });

        res.json({
            transactions,
            pagination: {
                total,
                page,
                limit,
                hasMore: total > skip + transactions.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory transactions' });
    }
});

export default router;
