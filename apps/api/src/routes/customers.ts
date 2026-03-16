import express from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get all customers for the client
router.get('/', async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            where: { clientId: req.clientId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Search customers by phone or name
router.get('/search', async (req, res) => {
    const { query } = req.query;
    try {
        const customers = await prisma.customer.findMany({
            where: {
                clientId: req.clientId,
                OR: [
                    { phone: { contains: query as string, mode: 'insensitive' } },
                    { name: { contains: query as string, mode: 'insensitive' } }
                ]
            },
            take: 10
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// Upsert a customer (create if doesn't exist, update if it does)
router.post('/upsert', async (req, res) => {
    const { name, phone, email } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    try {
        const customer = await prisma.customer.upsert({
            where: {
                phone_clientId: {
                    phone,
                    clientId: req.clientId!
                }
            },
            update: {
                name: name || undefined,
                email: email || undefined
            },
            create: {
                name: name || 'Guest',
                phone,
                email,
                clientId: req.clientId!
            }
        });

        res.json(customer);
    } catch (error) {
        console.error('Upsert failed', error);
        res.status(500).json({ error: 'Failed to upsert customer' });
    }
});

// Create a new customer
router.post('/', async (req, res) => {
    const { name, phone, email } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    try {
        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                email,
                clientId: req.clientId!
            }
        });

        // Log Activity
        await prisma.activityLog.create({
            data: {
                action: 'CUSTOMER_CREATE',
                details: `Created customer: ${name} (${phone})`,
                userId: (req as any).user.userId,
                role: (req as any).user.role,
                clientId: req.clientId!
            }
        });

        res.status(201).json(customer);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Customer with this phone already exists' });
        }
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// Update customer details
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, points } = req.body;

    try {
        const customer = await prisma.customer.update({
            where: { id, clientId: req.clientId },
            data: { name, phone, email, points }
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// Get customer history (visits/orders)
router.get('/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
        const orders = await prisma.order.findMany({
            where: { customerId: id, clientId: req.clientId },
            include: { items: { include: { menuItem: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customer history' });
    }
});

export default router;
