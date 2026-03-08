import express, { Request, Response } from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

// Get all inventory items for a client
router.get('/', async (req: Request, res: Response) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            where: { clientId: req.clientId! },
            orderBy: { name: 'asc' }
        });
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
    }
});

// Add new inventory item
router.post('/', async (req: Request, res: Response) => {
    const { name, unit, quantity, minThreshold, unitPrice } = req.body;
    const user = (req as any).user;
    try {
        const item = await prisma.inventoryItem.create({
            data: {
                name,
                unit,
                quantity: parseFloat(quantity) || 0,
                minThreshold: parseFloat(minThreshold) || 10,
                unitPrice: parseFloat(unitPrice) || 0,
                clientId: user.clientId
            }
        });

        // Log initial stock as IN transaction
        if (parseFloat(quantity) > 0) {
            await prisma.inventoryTransaction.create({
                data: {
                    inventoryItemId: item.id,
                    type: 'IN',
                    quantity: parseFloat(quantity),
                    userId: user.userId,
                    clientId: user.clientId,
                    reason: 'Initial stock entry'
                }
            });
        }

        // Activity Log (Non-blocking)
        if (user) {
            prisma.activityLog.create({
                data: {
                    action: 'INVENTORY_ADD',
                    details: `Added new inventory item: ${name}`,
                    userId: user.userId,
                    role: user.role,
                    clientId: user.clientId
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.json(item);
    } catch (error: any) {
        console.error('Create inventory error:', error);
        res.status(500).json({ error: 'Failed to create inventory item', details: error.message });
    }
});

// Update inventory item (Manual adjustment)
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, unit, quantity, minThreshold, unitPrice, adjustType, adjustQuantity, reason } = req.body;
    const user = (req as any).user;
    try {
        const currentItem = await prisma.inventoryItem.findUnique({
            where: { id: id as string, clientId: user.clientId }
        });

        if (!currentItem) return res.status(404).json({ error: 'Item not found' });

        let finalQuantity = parseFloat(quantity);

        // If it's a manual adjustment (delta)
        if (adjustType && adjustQuantity) {
            const delta = parseFloat(adjustQuantity);
            finalQuantity = adjustType === 'IN' ? currentItem.quantity + delta : currentItem.quantity - delta;

            // Log Transaction
            await prisma.inventoryTransaction.create({
                data: {
                    inventoryItemId: id as string,
                    type: adjustType,
                    quantity: delta,
                    userId: user.userId,
                    clientId: user.clientId,
                    reason: reason || 'Manual adjustment'
                }
            });
        } else if (quantity !== undefined && parseFloat(quantity) !== currentItem.quantity) {
            // Direct quantity update (log as manual)
            await prisma.inventoryTransaction.create({
                data: {
                    inventoryItemId: id as string,
                    type: parseFloat(quantity) > currentItem.quantity ? 'IN' : 'OUT',
                    quantity: Math.abs(parseFloat(quantity) - currentItem.quantity),
                    userId: user.userId,
                    clientId: user.clientId,
                    reason: reason || 'Direct quantity update'
                }
            });
        }

        const item = await prisma.inventoryItem.update({
            where: { id: id as string, clientId: req.clientId! },
            data: {
                name,
                unit,
                quantity: finalQuantity,
                minThreshold: minThreshold !== undefined ? parseFloat(minThreshold) : undefined,
                unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined
            }
        });

        // Activity Log
        await prisma.activityLog.create({
            data: {
                action: 'INVENTORY_UPDATE',
                details: `Updated inventory item: ${name}`,
                userId: user.userId,
                role: user.role,
                clientId: user.clientId
            }
        });

        res.json(item);
    } catch (error: any) {
        console.error('❌ [INVENTORY_UPDATE_ERROR]:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

// Delete inventory item
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deletedItem = await prisma.inventoryItem.findUnique({ where: { id: id as string } });
        await prisma.inventoryItem.delete({
            where: {
                id: id as string,
                clientId: req.clientId
            }
        });

        // Activity Log
        if (deletedItem) {
            await prisma.activityLog.create({
                data: {
                    action: 'INVENTORY_DELETE',
                    details: `Deleted inventory item: ${deletedItem.name}`,
                    userId: (req as any).user?.userId,
                    role: (req as any).user?.role,
                    clientId: req.clientId!
                }
            });
        }

        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
});

export default router;
