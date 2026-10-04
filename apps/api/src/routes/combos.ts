import express from 'express';
import prisma from '../services/prisma.js';
import { comboDealSchema } from '../validations/comboSchema.js';

const router = express.Router();

const managerOnly = (req: express.Request, res: express.Response) => {
    if (!['ADMIN', 'MANAGER'].includes(req.user?.role)) {
        res.status(403).json({ error: 'Only managers and administrators can manage combo deals' });
        return false;
    }
    return true;
};

const dealInclude = {
    groups: {
        orderBy: { position: 'asc' as const },
        include: {
            options: {
                include: {
                    menuItem: {
                        select: { id: true, name: true, price: true, categoryId: true, available: true, isDeleted: true }
                    }
                }
            }
        }
    }
};

const validateMenuItems = async (clientId: string, menuItemIds: string[]) => {
    const ids = [...new Set(menuItemIds)];
    const items = await prisma.menuItem.findMany({
        where: { id: { in: ids }, clientId, isDeleted: false },
        select: { id: true }
    });
    return items.length === ids.length;
};

const nestedGroups = (groups: Array<{ name: string; required: boolean; options: Array<{ menuItemId: string; extraPrice: number }> }>) =>
    groups.map((group, position) => ({
        name: group.name,
        required: group.required,
        position,
        options: {
            create: group.options.map(option => ({
                menuItemId: option.menuItemId,
                extraPrice: option.extraPrice
            }))
        }
    }));

router.get('/', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const manage = req.query.manage === 'true';
    if (manage && !managerOnly(req, res)) return;

    const now = new Date();
    try {
        const deals = await prisma.comboDeal.findMany({
            where: manage
                ? { clientId: req.clientId, isDeleted: false }
                : {
                    clientId: req.clientId,
                    isDeleted: false,
                    isAvailable: true,
                    AND: [
                        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
                    ]
                },
            include: dealInclude,
            orderBy: { createdAt: 'desc' }
        });
        res.json(deals);
    } catch (error) {
        console.error('Fetch combo deals error:', error);
        res.status(500).json({ error: 'Failed to fetch combo deals' });
    }
});

router.post('/', async (req, res) => {
    if (!managerOnly(req, res)) return;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    const validation = comboDealSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }

    try {
        const itemIds = validation.data.groups.flatMap(group => group.options.map(option => option.menuItemId));
        if (!(await validateMenuItems(req.clientId, itemIds))) {
            return res.status(400).json({ error: 'Every combo option must use an active menu item from this restaurant' });
        }
        const deal = await prisma.comboDeal.create({
            data: {
                ...validation.data,
                clientId: req.clientId,
                groups: { create: nestedGroups(validation.data.groups) }
            },
            include: dealInclude
        });
        res.status(201).json(deal);
    } catch (error) {
        console.error('Create combo deal error:', error);
        res.status(500).json({ error: 'Failed to create combo deal' });
    }
});

router.put('/:id', async (req, res) => {
    if (!managerOnly(req, res)) return;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    const validation = comboDealSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }

    try {
        const existing = await prisma.comboDeal.findFirst({
            where: { id: req.params.id, clientId: req.clientId, isDeleted: false },
            select: { id: true }
        });
        if (!existing) return res.status(404).json({ error: 'Combo deal not found' });

        const itemIds = validation.data.groups.flatMap(group => group.options.map(option => option.menuItemId));
        if (!(await validateMenuItems(req.clientId, itemIds))) {
            return res.status(400).json({ error: 'Every combo option must use an active menu item from this restaurant' });
        }

        const deal = await prisma.comboDeal.update({
            where: { id: existing.id },
            data: {
                ...validation.data,
                groups: {
                    deleteMany: {},
                    create: nestedGroups(validation.data.groups)
                }
            },
            include: dealInclude
        });
        res.json(deal);
    } catch (error) {
        console.error('Update combo deal error:', error);
        res.status(500).json({ error: 'Failed to update combo deal' });
    }
});

router.delete('/:id', async (req, res) => {
    if (!managerOnly(req, res)) return;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const result = await prisma.comboDeal.updateMany({
            where: { id: req.params.id, clientId: req.clientId, isDeleted: false },
            data: { isDeleted: true, isAvailable: false }
        });
        if (result.count === 0) return res.status(404).json({ error: 'Combo deal not found' });
        res.json({ message: 'Combo deal deleted' });
    } catch (error) {
        console.error('Delete combo deal error:', error);
        res.status(500).json({ error: 'Failed to delete combo deal' });
    }
});

export default router;
