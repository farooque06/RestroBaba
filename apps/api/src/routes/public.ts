import express from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get public menu items for a specific client
router.get('/menu/:clientId', async (req, res) => {
    const { clientId } = req.params;

    try {
        const items = await prisma.menuItem.findMany({
            where: {
                clientId,
                available: true
            },
            include: {
                category: true
            },
            orderBy: { name: 'asc' }
        });

        // Return sanitized data (no recipe info needed for public)
        const sanitizedItems = items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            category: item.category.name
        }));

        res.json(sanitizedItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch public menu' });
    }
});

// Get client details (to show restaurant name)
router.get('/client-info/:clientId', async (req, res) => {
    const { clientId } = req.params;
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { name: true }
        });
        if (!client) return res.status(404).json({ error: 'Restaurant not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client info' });
    }
});

export default router;
