import express, { Request, Response } from 'express';
import prisma from '../services/prisma.js';
import { roleMiddleware as authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Get staff ledger
router.get('/summary', authorize(['ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const staff = await prisma.user.findMany({
            where: { clientId: req.clientId as string, role: { not: 'SUPER_ADMIN' } },
            select: {
                id: true,
                name: true,
                salary: true,
                salaryType: true,
                staffTransactions: {
                    select: {
                        type: true,
                        amount: true
                    }
                }
            }
        });

        const summary = staff.map(member => {
            const advances = member.staffTransactions
                .filter(t => t.type === 'ADVANCE')
                .reduce((acc, t) => acc + t.amount, 0);
            const payments = member.staffTransactions
                .filter(t => t.type === 'PAYMENT')
                .reduce((acc, t) => acc + t.amount, 0);
            
            return {
                id: member.id,
                name: member.name,
                salary: member.salary,
                salaryType: member.salaryType,
                advances,
                payments,
                balance: (member.salary || 0) - advances - payments // Simple monthly balance logic
            };
        });

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// Get staff ledger
router.get('/:id/ledger', authorize(['ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const transactions = await prisma.staffTransaction.findMany({
            where: {
                userId: id as string,
                clientId: req.clientId as string
            },
            orderBy: { date: 'desc' },
            include: {
                shift: true
            }
        });

        const user = await prisma.user.findUnique({
            where: { id: id as string },
            select: { salary: true, salaryType: true, joiningDate: true, name: true }
        });

        res.json({ transactions, user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});

// Record staff transaction (Advance, Payment, Bonus, Fine)
router.post('/:id/transaction', authorize(['ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, amount, description, date } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        // Find current open shift for cash reconciliation
        const currentShift = await prisma.financialShift.findFirst({
            where: { clientId: req.clientId as string, status: 'OPEN' },
            orderBy: { openedAt: 'desc' }
        });

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Staff Transaction
            const transaction = await tx.staffTransaction.create({
                data: {
                    type,
                    amount: parseFloat(amount),
                    description,
                    date: date ? new Date(date) : new Date(),
                    userId: id as string,
                    clientId: req.clientId as string,
                    shiftId: currentShift?.id
                }
            });

            // 2. If it's a payment or advance, it's a restaurant expense
            if (type === 'ADVANCE' || type === 'PAYMENT') {
                await tx.expense.create({
                    data: {
                        description: `Staff ${type}: ${description || ''}`,
                        amount: parseFloat(amount),
                        category: 'Salary',
                        date: date ? new Date(date) : new Date(),
                        clientId: req.clientId as string,
                        shiftId: currentShift?.id
                    }
                });
            }

            return transaction;
        });

        res.json(result);
    } catch (error) {
        console.error('Staff transaction error:', error);
        res.status(500).json({ error: 'Failed to record transaction' });
    }
});

// Update staff salary settings
router.put('/:id/salary', authorize(['ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { salary, salaryType, joiningDate } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const user = await prisma.user.update({
            where: { id: id as string, clientId: req.clientId as string },
            data: {
                salary: parseFloat(salary),
                salaryType,
                joiningDate: joiningDate ? new Date(joiningDate) : undefined
            }
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update salary settings' });
    }
});

export default router;
