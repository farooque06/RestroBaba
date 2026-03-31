import express from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// --- Categories ---

// Get all categories for the client
router.get('/categories', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const categories = await prisma.menuCategory.findMany({
            where: { 
                clientId: req.clientId,
                isDeleted: false
            },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create a new category
router.post('/categories', async (req, res) => {
    if ((req as any).user?.role === 'WAITER') return res.status(403).json({ error: 'Waiters cannot create categories' });

    const { name, station } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    try {
        const category = await prisma.menuCategory.create({
            data: {
                name: name.trim(),
                station: station || 'Kitchen',
                clientId: req.clientId!
            }
        });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'CATEGORY_CREATE',
                    details: `Created menu category: ${name}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.status(201).json(category);
    } catch (error: any) {
        console.error('Create category error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'A category with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create category', details: error.message });
    }
});

// Update a category
router.put('/categories/:id', async (req, res) => {
    if ((req as any).user?.role === 'WAITER') return res.status(403).json({ error: 'Waiters cannot update categories' });

    const { id } = req.params;
    const { name, station } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const category = await prisma.menuCategory.update({
            where: {
                id,
                clientId: req.clientId!
            },
            data: {
                name: name ? name.trim() : undefined,
                station
            }
        });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'CATEGORY_UPDATE',
                    details: `Updated category: ${name} (Station: ${station})`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.json(category);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update category', details: error.message });
    }
});

// Delete a category
router.delete('/categories/:id', async (req, res) => {
    if ((req as any).user?.role === 'WAITER') return res.status(403).json({ error: 'Waiters cannot delete categories' });

    const { id } = req.params;
    try {
        await prisma.menuCategory.update({
            where: {
                id,
                clientId: req.clientId!
            },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// --- Menu Items ---

// Get all menu items for the client
router.get('/items', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const items = await prisma.menuItem.findMany({
            where: { 
                clientId: req.clientId!,
                isDeleted: false
            },
            include: {
                category: true,
                variants: true,
                recipe: {
                    include: {
                        inventoryItem: {
                            select: {
                                quantity: true,
                                unit: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch menu items', details: error.message });
    }
});

// Create a new menu item
router.post('/items', async (req, res) => {
    if ((req as any).user?.role === 'WAITER') return res.status(403).json({ error: 'Waiters cannot create menu items' });

    const { name, description, price, categoryId, image, available, variants } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const item = await prisma.menuItem.create({
            data: {
                name,
                description,
                price: Number(price),
                categoryId,
                image,
                available: available ?? true,
                clientId: req.clientId!,
                variants: variants && variants.length > 0 ? {
                    create: variants.map((v: any) => ({
                        name: v.name,
                        price: Number(v.price)
                    }))
                } : undefined
            },
            include: { category: true, variants: true }
        });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'MENU_ITEM_CREATE',
                    details: `Created menu item: ${name}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.status(201).json(item);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create menu item', details: error.message });
    }
});

// Update a menu item
router.put('/items/:id', async (req, res) => {
    if ((req as any).user?.role === 'WAITER') return res.status(403).json({ error: 'Waiters cannot update menu items' });

    const { id } = req.params;
    const { name, description, price, categoryId, image, available, variants } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        // Use a transaction to update item and variants
        const item = await prisma.$transaction(async (tx) => {
            // 1. Delete existing variants if we are syncing
            if (variants) {
                await tx.menuItemVariant.deleteMany({
                    where: { menuItemId: id as string }
                });
            }

            // 2. Update the main item
            return await tx.menuItem.update({
                where: {
                    id: id as string,
                    clientId: req.clientId!
                },
                data: {
                    name,
                    description,
                    price: price ? Number(price) : undefined,
                    categoryId,
                    image,
                    available,
                    variants: variants && variants.length > 0 ? {
                        create: variants.map((v: any) => ({
                            name: v.name,
                            price: Number(v.price)
                        }))
                    } : undefined
                },
                include: { category: true, variants: true }
            });
        });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'MENU_ITEM_UPDATE',
                    details: `Updated menu item: ${item.name}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// Delete a menu item
router.delete('/items/:id', async (req, res) => {
    if ((req as any).user?.role === 'WAITER') return res.status(403).json({ error: 'Waiters cannot delete menu items' });

    const { id } = req.params;
    try {
        const deletedItem = await prisma.menuItem.findUnique({ where: { id: id as string } });
        await prisma.menuItem.update({
            where: {
                id: id as string,
                clientId: req.clientId // Security: Ensure item belongs to client
            },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });

        // Log Activity (Non-blocking)
        if (deletedItem && req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'MENU_ITEM_DELETE',
                    details: `Deleted menu item: ${deletedItem.name}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.json({ message: 'Item deleted successfullly' });
    } catch (error: any) {
        console.error('Delete item error:', error);
        res.status(500).json({ error: 'Failed to delete menu item', details: error.message });
    }
});

export default router;
