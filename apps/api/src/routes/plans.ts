import express, { Request, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware as authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware as authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Everyone can view active plans
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(plans);
    } catch (error) {
        console.error('List plans error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
});

// SUPER_ADMIN CRUD operations
router.post('/', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    try {
        const plan = await prisma.subscriptionPlan.create({
            data: req.body
        });
        res.status(201).json(plan);
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

router.patch('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    try {
        const plan = await prisma.subscriptionPlan.update({
            where: { id: req.params.id as string },
            data: req.body
        });
        res.json(plan);
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

router.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    try {
        await prisma.subscriptionPlan.update({
            where: { id: req.params.id as string },
            data: { isActive: false }
        });
        res.json({ message: 'Plan deactivated successfully' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Failed to deactivate plan' });
    }
});

export default router;
