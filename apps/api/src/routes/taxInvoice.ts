import express from 'express';
import prisma from '../services/prisma.js';
import { roleMiddleware as authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ─── Helper: Get Nepal Fiscal Year ───────────────────────────────────────────
const getNepalFiscalYear = (): string => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed (0=Jan)
    const year = now.getFullYear();

    // Nepal fiscal year starts mid-July (Shrawan)
    // If July onwards -> FY starts this year, else previous year
    const bsOffset = 57; // Approximate BS offset from AD
    if (month >= 6) { // July onwards
        return `${year + bsOffset}/${(year + bsOffset + 1).toString().slice(-2)}`;
    } else {
        return `${year + bsOffset - 1}/${(year + bsOffset).toString().slice(-2)}`;
    }
};

// ─── Generate Tax Invoice for an Order ───────────────────────────────────────
// Called internally when an order is paid (for VAT_REGISTERED clients)
export const generateTaxInvoice = async (
    tx: any,
    orderId: string,
    clientId: string,
    buyerName?: string,
    buyerPAN?: string
) => {
    // Fetch client settings
    const client = await tx.client.findUnique({
        where: { id: clientId },
        select: {
            taxMode: true,
            panNumber: true,
            vatNumber: true,
            name: true,
            businessAddress: true,
            invoicePrefix: true,
            nextInvoiceNumber: true,
            taxRate: true
        }
    });

    if (!client || client.taxMode !== 'VAT_REGISTERED') {
        return null; // Only generate for VAT registered
    }

    // Fetch order
    const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
            subtotal: true,
            taxAmount: true,
            serviceChargeAmount: true,
            totalAmount: true,
            taxInvoice: true
        }
    });

    if (!order || order.taxInvoice) {
        return null; // Already has invoice or order not found
    }

    const fiscalYear = getNepalFiscalYear();
    const prefix = client.invoicePrefix || 'INV';
    const invoiceNum = client.nextInvoiceNumber || 1;
    const invoiceNumber = `${prefix}-${invoiceNum.toString().padStart(4, '0')}`;

    // Create immutable tax invoice snapshot
    const taxInvoice = await tx.taxInvoice.create({
        data: {
            invoiceNumber,
            fiscalYear,
            orderId,
            subtotal: order.subtotal,
            taxableAmount: order.subtotal + (order.serviceChargeAmount || 0),
            taxRate: client.taxRate,
            taxAmount: order.taxAmount,
            serviceCharge: order.serviceChargeAmount || 0,
            totalAmount: order.totalAmount,
            sellerName: client.name,
            sellerPAN: client.panNumber || client.vatNumber,
            sellerAddress: client.businessAddress,
            buyerName: buyerName || null,
            buyerPAN: buyerPAN || null,
            clientId
        }
    });

    // Increment invoice counter
    await tx.client.update({
        where: { id: clientId },
        data: { nextInvoiceNumber: invoiceNum + 1 }
    });

    return taxInvoice;
};

// ─── GET: List Tax Invoices (for reports) ────────────────────────────────────
router.get('/', authorize(['ADMIN']), async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const { from, to, fiscalYear, page = '1', limit = '50' } = req.query as any;

        const where: any = { clientId: req.clientId };

        if (fiscalYear) {
            where.fiscalYear = fiscalYear;
        }

        if (from || to) {
            where.issuedAt = {};
            if (from) where.issuedAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.issuedAt.lte = toDate;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [invoices, total] = await Promise.all([
            prisma.taxInvoice.findMany({
                where,
                include: {
                    order: {
                        select: {
                            id: true,
                            orderNumber: true,
                            paymentMethod: true,
                            status: true,
                            table: { select: { number: true } },
                            customer: { select: { name: true, phone: true } }
                        }
                    }
                },
                orderBy: { issuedAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.taxInvoice.count({ where })
        ]);

        res.json({ invoices, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Tax invoice list error:', error);
        res.status(500).json({ error: 'Failed to fetch tax invoices' });
    }
});

// ─── GET: VAT Summary Report ─────────────────────────────────────────────────
router.get('/vat-summary', authorize(['ADMIN']), async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const { from, to } = req.query as any;

        const where: any = { clientId: req.clientId };
        if (from || to) {
            where.issuedAt = {};
            if (from) where.issuedAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.issuedAt.lte = toDate;
            }
        }

        const invoices = await prisma.taxInvoice.findMany({ where });

        const summary = {
            totalInvoices: invoices.length,
            totalSales: invoices.reduce((sum, inv) => sum + inv.subtotal, 0),
            totalTaxableAmount: invoices.reduce((sum, inv) => sum + inv.taxableAmount, 0),
            totalVATCollected: invoices.reduce((sum, inv) => sum + inv.taxAmount, 0),
            totalServiceCharge: invoices.reduce((sum, inv) => sum + inv.serviceCharge, 0),
            totalGrandTotal: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
            vatRate: 13 // Nepal standard
        };

        res.json(summary);
    } catch (error) {
        console.error('VAT summary error:', error);
        res.status(500).json({ error: 'Failed to generate VAT summary' });
    }
});

// ─── GET: Daily Sales Register ───────────────────────────────────────────────
router.get('/daily-register', authorize(['ADMIN']), async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const { date } = req.query as any;
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Get all paid orders for the day
        const orders = await prisma.order.findMany({
            where: {
                clientId: req.clientId,
                status: 'Paid',
                createdAt: { gte: startOfDay, lte: endOfDay }
            },
            include: {
                items: {
                    where: { status: { not: 'Waste' } },
                    include: {
                        menuItem: true,
                        variant: true
                    }
                },
                table: true,
                customer: true,
                payments: true,
                taxInvoice: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Get cancelled orders for audit trail
        const cancelledOrders = await prisma.order.findMany({
            where: {
                clientId: req.clientId,
                status: 'Cancelled',
                updatedAt: { gte: startOfDay, lte: endOfDay }
            },
            select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                createdAt: true,
                table: { select: { number: true } }
            }
        });

        // Calculate summaries
        const cashOrders = orders.filter(o => o.paymentMethod === 'Cash' || (!o.paymentMethod && o.payments.every(p => p.method === 'Cash')));
        const cardOrders = orders.filter(o => o.paymentMethod === 'Card');
        const onlineOrders = orders.filter(o => o.paymentMethod === 'UPI');
        const splitOrders = orders.filter(o => o.paymentMethod === 'Split');

        const summary = {
            date: targetDate.toISOString().split('T')[0],
            totalOrders: orders.length,
            totalSubtotal: orders.reduce((s, o) => s + o.subtotal, 0),
            totalTax: orders.reduce((s, o) => s + o.taxAmount, 0),
            totalServiceCharge: orders.reduce((s, o) => s + o.serviceChargeAmount, 0),
            totalRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
            cashSales: cashOrders.reduce((s, o) => s + o.totalAmount, 0),
            cardSales: cardOrders.reduce((s, o) => s + o.totalAmount, 0),
            onlineSales: onlineOrders.reduce((s, o) => s + o.totalAmount, 0),
            splitSales: splitOrders.reduce((s, o) => s + o.totalAmount, 0),
            cancelledCount: cancelledOrders.length,
            cancelledValue: cancelledOrders.reduce((s, o) => s + o.totalAmount, 0)
        };

        res.json({ summary, orders, cancelledOrders });
    } catch (error) {
        console.error('Daily register error:', error);
        res.status(500).json({ error: 'Failed to generate daily register' });
    }
});

// ─── GET: Monthly Tax Summary ────────────────────────────────────────────────
router.get('/monthly-summary', authorize(['ADMIN']), async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const { year, month } = req.query as any;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        const startOfMonth = new Date(y, m - 1, 1);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

        const orders = await prisma.order.findMany({
            where: {
                clientId: req.clientId,
                status: 'Paid',
                createdAt: { gte: startOfMonth, lte: endOfMonth }
            },
            select: {
                subtotal: true,
                taxAmount: true,
                serviceChargeAmount: true,
                totalAmount: true,
                paymentMethod: true,
                createdAt: true
            }
        });

        // Group by day
        const dailyBreakdown: any = {};
        orders.forEach(order => {
            const day = order.createdAt.toISOString().split('T')[0];
            if (!dailyBreakdown[day]) {
                dailyBreakdown[day] = { orders: 0, subtotal: 0, tax: 0, serviceCharge: 0, total: 0 };
            }
            dailyBreakdown[day].orders++;
            dailyBreakdown[day].subtotal += order.subtotal;
            dailyBreakdown[day].tax += order.taxAmount;
            dailyBreakdown[day].serviceCharge += order.serviceChargeAmount;
            dailyBreakdown[day].total += order.totalAmount;
        });

        const summary = {
            year: y,
            month: m,
            totalOrders: orders.length,
            totalSubtotal: orders.reduce((s, o) => s + o.subtotal, 0),
            totalTax: orders.reduce((s, o) => s + o.taxAmount, 0),
            totalServiceCharge: orders.reduce((s, o) => s + o.serviceChargeAmount, 0),
            totalRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
            dailyBreakdown: Object.entries(dailyBreakdown)
                .map(([date, data]) => ({ date, ...(data as any) }))
                .sort((a, b) => a.date.localeCompare(b.date))
        };

        res.json(summary);
    } catch (error) {
        console.error('Monthly summary error:', error);
        res.status(500).json({ error: 'Failed to generate monthly summary' });
    }
});

export default router;
