import express, { Request, Response } from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get recipe for a menu item
router.get('/:menuItemId', async (req: Request, res: Response) => {
    const { menuItemId } = req.params;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const mid = menuItemId as string;
        const variantId = req.query.variantId as string | undefined;

        // Security: Ensure the item belongs to the client
        const menuItem = await prisma.menuItem.findFirst({
            where: { id: mid, clientId: req.clientId }
        });

        if (!menuItem) return res.status(404).json({ error: 'Menu item not found or unauthorized' });

        const recipe = await prisma.recipeItem.findMany({
            where: { 
                menuItemId: mid,
                variantId: variantId || null // Fetch specifically for this variant or base
            },
            include: { inventoryItem: true }
        });
        res.json(recipe);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recipe' });
    }
});

// Set recipe for a menu item (Issue #14: Transaction, Issue #16: Ownership)
router.post('/', async (req: Request, res: Response) => {
    const { menuItemId, variantId, ingredients } = req.body; // ingredients: [{ inventoryItemId, quantity }]
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Verify ownership of the menu item
            const menuItem = await tx.menuItem.findFirst({
                where: { id: menuItemId, clientId: req.clientId }
            });

            if (!menuItem) throw new Error('Menu item not found or unauthorized');

            // 2. Delete old recipe items for this specific variant/base
            await tx.recipeItem.deleteMany({
                where: { 
                    menuItemId: menuItemId as string,
                    variantId: variantId || null
                }
            });

            // 3. Create new recipe items
            if (ingredients && ingredients.length > 0) {
                await tx.recipeItem.createMany({
                    data: ingredients.map((ing: any) => ({
                        menuItemId,
                        variantId: variantId || null,
                        inventoryItemId: ing.inventoryItemId,
                        quantity: parseFloat(ing.quantity)
                    }))
                });
            }

            // 4. Log Activity
            await tx.activityLog.create({
                data: {
                    action: 'RECIPE_UPDATE',
                    details: `Updated recipe for: ${menuItem.name}`,
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: req.clientId!
                }
            });
        });

        res.json({ message: 'Recipe saved successfully' });
    } catch (error: any) {
        console.error('Recipe save error:', error);
        res.status(error.message?.includes('unauthorized') ? 403 : 500).json({ error: error.message || 'Failed to save recipe' });
    }
});

export default router;
