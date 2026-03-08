import express from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get all tables for the client
router.get('/', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const tables = await prisma.table.findMany({
            where: { clientId: req.clientId! },
            orderBy: { number: 'asc' }
        });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// Create a new table
router.post('/', async (req, res) => {
    const { number, capacity } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const table = await prisma.table.create({
            data: {
                number,
                capacity: parseInt(capacity),
                clientId: req.clientId!
            }
        });

        // Log Activity
        await prisma.activityLog.create({
            data: {
                action: 'TABLE_CREATE',
                details: `Created table #${number} (Capacity: ${capacity})`,
                userId: (req as any).user.userId,
                role: (req as any).user.role,
                clientId: req.clientId!
            }
        });

        res.status(201).json(table);
    } catch (error: any) {
        // Handle unique constraint violation (number + clientId)
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Table number already exists' });
        }
        res.status(500).json({ error: 'Failed to create table' });
    }
});

// Update table status or capacity
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { number, capacity, status } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const table = await prisma.table.update({
            where: {
                id: id as string,
                clientId: req.clientId!
            },
            data: {
                number,
                capacity: capacity ? parseInt(capacity) : undefined,
                status
            }
        });

        // Log Activity
        await prisma.activityLog.create({
            data: {
                action: 'TABLE_UPDATE',
                details: `Updated table #${table.number} (Status: ${table.status})`,
                userId: (req as any).user.userId,
                role: (req as any).user.role,
                clientId: req.clientId!
            }
        });

        res.json(table);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update table' });
    }
});

// Delete a table
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const deletedTable = await prisma.table.findUnique({ where: { id: id as string } });
        await prisma.table.delete({
            where: {
                id: id as string,
                clientId: req.clientId!
            }
        });

        // Log Activity
        if (deletedTable) {
            await prisma.activityLog.create({
                data: {
                    action: 'TABLE_DELETE',
                    details: `Deleted table #${deletedTable.number}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            });
        }

        res.json({ message: 'Table deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete table' });
    }
});

export default router;
