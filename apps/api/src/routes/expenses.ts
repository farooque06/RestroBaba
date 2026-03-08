import express, { Request, Response } from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get all expenses for a client
router.get('/', async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const expenses = await prisma.expense.findMany({
            where: { clientId: req.clientId },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// Add new expense
router.post('/', async (req: Request, res: Response) => {
    const { description, amount, category, date } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const expense = await prisma.expense.create({
            data: {
                description,
                amount: parseFloat(amount),
                category,
                date: date ? new Date(date) : new Date(),
                clientId: req.clientId
            }
        });

        // Log Activity
        await prisma.activityLog.create({
            data: {
                action: 'EXPENSE_CREATE',
                details: `Added expense: ${description} (${amount})`,
                userId: (req as any).user.userId,
                role: (req as any).user.role,
                clientId: req.clientId
            }
        });

        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

// Update expense
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, amount, category, date } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const expense = await prisma.expense.update({
            where: {
                id: id as string,
                clientId: req.clientId
            },
            data: {
                description,
                amount: parseFloat(amount),
                category,
                date: date ? new Date(date) : undefined
            }
        });

        // Log Activity
        await prisma.activityLog.create({
            data: {
                action: 'EXPENSE_UPDATE',
                details: `Updated expense: ${expense.description}`,
                userId: (req as any).user.userId,
                role: (req as any).user.role,
                clientId: req.clientId
            }
        });

        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// Delete expense
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const deletedExpense = await prisma.expense.findUnique({ where: { id: id as string } });
        await prisma.expense.delete({
            where: {
                id: id as string,
                clientId: req.clientId
            }
        });

        // Log Activity
        if (deletedExpense) {
            await prisma.activityLog.create({
                data: {
                    action: 'EXPENSE_DELETE',
                    details: `Deleted expense: ${deletedExpense.description}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId
                }
            });
        }

        res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

export default router;
