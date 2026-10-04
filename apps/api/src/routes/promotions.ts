import express from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.js';

const router = express.Router();

const promotionSchema = z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(300).optional().nullable(),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().finite().positive(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
}).superRefine((promotion, context) => {
    if (promotion.type === 'PERCENTAGE' && promotion.value > 100) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['value'],
            message: 'Percentage discounts cannot exceed 100%'
        });
    }
    if (new Date(promotion.startsAt) >= new Date(promotion.endsAt)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endsAt'],
            message: 'End time must be after start time'
        });
    }
});

const canManagePromotions = (req: express.Request, res: express.Response) => {
    const role = (req as any).user?.role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
        res.status(403).json({ error: 'Only administrators and managers can manage promotions' });
        return false;
    }
    return true;
};

router.get('/active', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: {
                clientId: req.clientId,
                isActive: true,
                startsAt: { lte: now },
                endsAt: { gt: now }
            },
            orderBy: [{ endsAt: 'asc' }, { name: 'asc' }]
        });
        res.json(promotions);
    } catch (error) {
        console.error('Failed to fetch active promotions', error);
        res.status(500).json({ error: 'Failed to fetch active promotions' });
    }
});

router.get('/', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    if (!canManagePromotions(req, res)) return;

    try {
        const [promotions, usage] = await Promise.all([
            prisma.promotion.findMany({
                where: { clientId: req.clientId },
                orderBy: [{ createdAt: 'desc' }]
            }),
            prisma.order.groupBy({
                by: ['promotionId'],
                where: { clientId: req.clientId, status: 'Paid', promotionId: { not: null } },
                _count: { _all: true },
                _sum: { discountAmount: true, totalAmount: true }
            })
        ]);
        const usageByPromotion = new Map(
            usage.flatMap(item => item.promotionId ? [[item.promotionId, {
                redemptionCount: item._count._all,
                discountGiven: item._sum.discountAmount ?? 0,
                netSales: item._sum.totalAmount ?? 0
            }] as const] : [])
        );
        res.json(promotions.map(promotion => ({
            ...promotion,
            ...(usageByPromotion.get(promotion.id) ?? {
                redemptionCount: 0,
                discountGiven: 0,
                netSales: 0
            })
        })));
    } catch (error) {
        console.error('Failed to fetch promotions', error);
        res.status(500).json({ error: 'Failed to fetch promotions' });
    }
});

router.post('/', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    if (!canManagePromotions(req, res)) return;

    const validation = promotionSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }

    try {
        const promotion = await prisma.promotion.create({
            data: {
                ...validation.data,
                startsAt: new Date(validation.data.startsAt),
                endsAt: new Date(validation.data.endsAt),
                clientId: req.clientId
            }
        });
        res.status(201).json(promotion);
    } catch (error) {
        console.error('Failed to create promotion', error);
        res.status(500).json({ error: 'Failed to create promotion' });
    }
});

router.put('/:id', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    if (!canManagePromotions(req, res)) return;

    const validation = promotionSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }

    try {
        const result = await prisma.promotion.updateMany({
            where: { id: req.params.id, clientId: req.clientId },
            data: {
                ...validation.data,
                startsAt: new Date(validation.data.startsAt),
                endsAt: new Date(validation.data.endsAt)
            }
        });
        if (result.count === 0) return res.status(404).json({ error: 'Promotion not found' });
        const promotion = await prisma.promotion.findFirst({
            where: { id: req.params.id, clientId: req.clientId }
        });
        res.json(promotion);
    } catch (error) {
        console.error('Failed to update promotion', error);
        res.status(500).json({ error: 'Failed to update promotion' });
    }
});

router.patch('/:id/active', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    if (!canManagePromotions(req, res)) return;
    if (typeof req.body.isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    try {
        const result = await prisma.promotion.updateMany({
            where: { id: req.params.id, clientId: req.clientId },
            data: { isActive: req.body.isActive }
        });
        if (result.count === 0) return res.status(404).json({ error: 'Promotion not found' });
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update promotion status', error);
        res.status(500).json({ error: 'Failed to update promotion status' });
    }
});

export default router;
