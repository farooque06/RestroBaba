import express from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get current active shift
router.get('/current', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const shift = await prisma.financialShift.findFirst({
            where: {
                clientId: req.clientId,
                status: 'OPEN'
            },
            include: {
                orders: {
                    where: { status: 'Paid' },
                    include: { payments: true }
                },
                expenses: true
            },
            orderBy: { openedAt: 'desc' }
        });

        if (shift) {
            // Calculate Totals on-the-fly for live reporting
            let totalSales = 0;
            let cashSales = 0;
            let cardSales = 0;
            let upiSales = 0;
            
            shift.orders.forEach(order => {
                totalSales += order.totalAmount;
                if (order.payments && order.payments.length > 0) {
                    order.payments.forEach(p => {
                        if (p.method === 'Cash') cashSales += p.amount;
                        if (p.method === 'Card') cardSales += p.amount;
                        if (p.method === 'UPI') upiSales += p.amount;
                    });
                } else {
                    // Fallback for orders without detailed payment records
                    const method = order.paymentMethod || 'Cash';
                    if (method === 'Cash') cashSales += order.totalAmount;
                    if (method === 'Card') cardSales += order.totalAmount;
                    if (method === 'UPI') upiSales += order.totalAmount;
                }
            });

            const totalExpenses = shift.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            // Assign calculated values to the shift object (not saved to DB)
            (shift as any).totalSales = totalSales;
            (shift as any).cashSales = cashSales;
            (shift as any).cardSales = cardSales;
            (shift as any).upiSales = upiSales;
            (shift as any).totalExpenses = totalExpenses;
            (shift as any).expectedCash = shift.openingCash + cashSales - totalExpenses;
        }

        res.json(shift);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch current shift' });
    }
});

// Open a new shift
router.post('/open', async (req, res) => {
    const { openingCash } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        // Check if a shift is already open
        const existingShift = await prisma.financialShift.findFirst({
            where: {
                clientId: req.clientId,
                status: 'OPEN'
            }
        });

        if (existingShift) {
            return res.status(400).json({ error: 'A shift is already open' });
        }

        const shift = await prisma.financialShift.create({
            data: {
                clientId: req.clientId,
                openedById: req.user.userId,
                openingCash: parseFloat(openingCash) || 0,
                status: 'OPEN'
            }
        });

        res.status(201).json(shift);
    } catch (error) {
        res.status(500).json({ error: 'Failed to open shift' });
    }
});

// Close a shift (Generates Z-Report data)
router.post('/close/:id', async (req, res) => {
    const { id } = req.params;
    const { closingCash } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const shift = await prisma.financialShift.findUnique({
            where: { id, clientId: req.clientId },
            include: {
                orders: {
                    where: { status: 'Paid' },
                    include: { payments: true }
                },
                expenses: true
            }
        });

        if (!shift) return res.status(404).json({ error: 'Shift not found' });
        if (shift.status === 'CLOSED') return res.status(400).json({ error: 'Shift is already closed' });

        // Calculate Totals
        let totalSales = 0;
        let cashSales = 0;
        let cardSales = 0;
        let upiSales = 0;
        
        shift.orders.forEach(order => {
            totalSales += order.totalAmount;
            if (order.payments && order.payments.length > 0) {
                order.payments.forEach(p => {
                    if (p.method === 'Cash') cashSales += p.amount;
                    if (p.method === 'Card') cardSales += p.amount;
                    if (p.method === 'UPI') upiSales += p.amount;
                });
            } else {
                // Fallback for orders without detailed payment records
                const method = order.paymentMethod || 'Cash';
                if (method === 'Cash') cashSales += order.totalAmount;
                if (method === 'Card') cardSales += order.totalAmount;
                if (method === 'UPI') upiSales += order.totalAmount;
            }
        });

        const totalExpenses = shift.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const expectedCash = shift.openingCash + cashSales - totalExpenses;

        const updatedShift = await prisma.financialShift.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closedById: req.user.userId,
                closingCash: parseFloat(closingCash),
                expectedCash,
                totalSales,
                totalExpenses,
                cashSales,
                cardSales,
                upiSales
            }
        });

        res.json(updatedShift);
    } catch (error) {
        console.error('Shift closure error:', error);
        res.status(500).json({ error: 'Failed to close shift' });
    }
});

// Get shift history
router.get('/history', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const shifts = await prisma.financialShift.findMany({
            where: { clientId: req.clientId },
            include: {
                orders: {
                    where: { status: 'Paid' },
                    include: { payments: true }
                },
                expenses: true
            },
            orderBy: { openedAt: 'desc' },
            take: 30
        });

        // Calculate totals for any OPEN shifts in history
        const processedShifts = shifts.map(shift => {
            if (shift.status === 'OPEN') {
                let totalSales = 0;
                let cashSales = 0;
                let cardSales = 0;
                let upiSales = 0;
                
                shift.orders.forEach(order => {
                    totalSales += order.totalAmount;
                    if (order.payments && order.payments.length > 0) {
                        order.payments.forEach(p => {
                            if (p.method === 'Cash') cashSales += p.amount;
                            if (p.method === 'Card') cardSales += p.amount;
                            if (p.method === 'UPI') upiSales += p.amount;
                        });
                    } else {
                        // Fallback for orders without detailed payment records
                        const method = order.paymentMethod || 'Cash';
                        if (method === 'Cash') cashSales += order.totalAmount;
                        if (method === 'Card') cardSales += order.totalAmount;
                        if (method === 'UPI') upiSales += order.totalAmount;
                    }
                });

                const totalExpenses = shift.expenses.reduce((sum, exp) => sum + exp.amount, 0);

                return {
                    ...shift,
                    totalSales,
                    cashSales,
                    cardSales,
                    upiSales,
                    totalExpenses,
                    expectedCash: shift.openingCash + cashSales - totalExpenses
                };
            }
            return shift;
        });

        res.json(processedShifts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch shift history' });
    }
});

export default router;
