import express from 'express';
import prisma from '../services/prisma.js';
import { notifyClient } from '../services/socket.js';

const router = express.Router();

// Valid status transitions map (Issue #1)
const VALID_TRANSITIONS: Record<string, string[]> = {
    'Pending': ['Cooking', 'Cancelled'],
    'Cooking': ['Ready', 'Cancelled'],
    'Ready': ['Served', 'Cancelled'],
    'Served': ['Paid', 'Cancelled'],
};

// Create or Update an order
router.post('/', async (req, res) => {
    const { tableId, items, customerId } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const order = await prisma.$transaction(async (tx) => {
            // 1. Check for existing active order for this table
            let existingOrder = null;
            if (tableId) {
                existingOrder = await tx.order.findFirst({
                    where: {
                        tableId,
                        status: { notIn: ['Paid', 'Cancelled'] },
                        clientId: req.clientId!
                    },
                    include: { items: true }
                });
            }

            // 2. Fetch client settings
            const client = await tx.client.findUnique({
                where: { id: req.clientId! },
                select: { useTax: true, taxRate: true, useServiceCharge: true, serviceChargeRate: true }
            });
            if (!client) throw new Error('Client not found');

            let orderId: string;
            let action: string;

            if (existingOrder) {
                // UPDATE EXISTING ORDER
                orderId = existingOrder.id;
                action = 'ORDER_UPDATE';

                // Add NEW items to the existing order
                await tx.orderItem.createMany({
                    data: items.map((item: any) => ({
                        orderId,
                        menuItemId: item.menuItemId,
                        quantity: parseInt(item.quantity),
                        price: parseFloat(item.price),
                        notes: item.notes,
                        status: 'Pending'
                    }))
                });
            } else {
                // CREATE NEW ORDER
                action = 'ORDER_NEW';
                const newOrder = await tx.order.create({
                    data: {
                        tableId,
                        customerId,
                        subtotal: 0,
                        totalAmount: 0,
                        clientId: req.clientId!,
                        status: 'Pending',
                        items: {
                            create: items.map((item: any) => ({
                                menuItemId: item.menuItemId,
                                quantity: parseInt(item.quantity),
                                price: parseFloat(item.price),
                                notes: item.notes
                            }))
                        }
                    }
                });
                orderId = newOrder.id;
            }

            // CRITICAL: Ensure table is Occupied whenever an order is active
            if (tableId) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'Occupied' }
                });
            }

            // 3. Recalculate Totals
            const allItems = await tx.orderItem.findMany({ where: { orderId } });
            const subtotal = allItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

            let taxAmount = 0;
            if (client.useTax) taxAmount = subtotal * (client.taxRate / 100);

            let serviceChargeAmount = 0;
            if (client.useServiceCharge) serviceChargeAmount = subtotal * (client.serviceChargeRate / 100);

            const totalAmount = subtotal + taxAmount + serviceChargeAmount;

            const finalOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    subtotal,
                    taxAmount,
                    serviceChargeAmount,
                    totalAmount,
                    // If order was already Ready or Served, move it back to Cooking 
                    // so the chef sees the additions in the right column.
                    status: (existingOrder?.status === 'Ready' || existingOrder?.status === 'Served')
                        ? 'Cooking'
                        : (existingOrder?.status || 'Pending')
                },
                include: { items: { include: { menuItem: { include: { category: true } } } }, table: true }
            });

            // 4. Loyalty Points (incremental based on new items only)
            if (customerId) {
                const newItemsTotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
                const incrementalPoints = Math.floor(newItemsTotal / 100);

                if (incrementalPoints > 0) {
                    await tx.customer.update({
                        where: { id: customerId },
                        data: { points: { increment: incrementalPoints } }
                    });
                }
            }

            // 5. Activity Log
            await tx.activityLog.create({
                data: {
                    action: action === 'ORDER_NEW' ? 'ORDER_CREATE' : 'ORDER_ADD_ITEMS',
                    details: `${action === 'ORDER_NEW' ? 'New order' : 'Added items'} for Table #${finalOrder.table?.number || 'Walk-in'} - Total: ${totalAmount.toFixed(2)}`,
                    userId: (req as any).user?.userId,
                    role: (req as any).user?.role || 'UNKNOWN',
                    clientId: req.clientId!
                }
            });

            return { finalOrder, action };
        });

        notifyClient(req.clientId!, order.action, order.finalOrder);
        res.status(order.action === 'ORDER_NEW' ? 201 : 200).json(order.finalOrder);
    } catch (error) {
        console.error('Order processing error:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

// Get orders for the client (Issue #9: supports ?status= filter)
router.get('/', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const statusFilter = req.query.status as string | undefined;
        const whereClause: any = { clientId: req.clientId! };

        if (statusFilter) {
            // Support comma-separated statuses: ?status=Pending,Cooking
            const statuses = statusFilter.split(',').map(s => s.trim());
            whereClause.status = { in: statuses };
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                items: { include: { menuItem: { include: { category: true } } } },
                table: true,
                customer: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Update order status with VALIDATION (Issue #1, #2, #3)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, paymentMethod } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const user = (req as any).user;

    try {
        const order = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findUnique({
                where: { id: id as string },
                include: { items: { include: { menuItem: { include: { recipe: true } } } } }
            });

            if (!currentOrder) throw new Error('Order not found');
            if (currentOrder.clientId !== req.clientId) throw new Error('Unauthorized');

            // --- Issue #1: Validate status transition ---
            const allowedNext = VALID_TRANSITIONS[currentOrder.status];
            if (!allowedNext || !allowedNext.includes(status)) {
                throw new Error(`Invalid transition: ${currentOrder.status} → ${status}. Allowed: ${allowedNext?.join(', ') || 'none'}`);
            }

            const updatedOrder = await tx.order.update({
                where: { id: id as string, clientId: req.clientId! },
                data: { status },
                include: { items: { include: { menuItem: { include: { recipe: true, category: true } } } }, table: true }
            });

            // --- Issue #2: Item-level inventory deduction (only Pending items) ---
            if (status === 'Cooking') {
                const pendingItems = updatedOrder.items.filter(item => item.status === 'Pending');
                for (const item of pendingItems) {
                    for (const recipeItem of item.menuItem.recipe) {
                        const amountToDeduct = recipeItem.quantity * item.quantity;
                        await tx.inventoryItem.update({
                            where: { id: recipeItem.inventoryItemId },
                            data: { quantity: { decrement: amountToDeduct } }
                        });

                        await tx.inventoryTransaction.create({
                            data: {
                                inventoryItemId: recipeItem.inventoryItemId,
                                type: 'ORDER_DEDUCTION',
                                quantity: amountToDeduct,
                                orderId: updatedOrder.id,
                                userId: user.userId,
                                clientId: req.clientId!,
                                reason: `Order #${updatedOrder.id.slice(-4).toUpperCase()} started cooking`
                            }
                        });
                    }

                    // Mark item as Cooking so it doesn't get deducted again
                    await tx.orderItem.update({
                        where: { id: item.id },
                        data: { status: 'Cooking' }
                    });
                }
            }

            // --- Issue #3: Only restore non-waste items on cancel ---
            if (status === 'Cancelled' && ['Cooking', 'Ready', 'Served'].includes(currentOrder.status)) {
                const restorableItems = updatedOrder.items.filter(item => item.status !== 'Waste' && item.status !== 'Pending');
                for (const item of restorableItems) {
                    for (const recipeItem of item.menuItem.recipe) {
                        const amountToRestore = recipeItem.quantity * item.quantity;
                        await tx.inventoryItem.update({
                            where: { id: recipeItem.inventoryItemId },
                            data: { quantity: { increment: amountToRestore } }
                        });

                        await tx.inventoryTransaction.create({
                            data: {
                                inventoryItemId: recipeItem.inventoryItemId,
                                type: 'ORDER_CANCELLED',
                                quantity: amountToRestore,
                                orderId: updatedOrder.id,
                                userId: user.userId,
                                clientId: req.clientId!,
                                reason: `Order #${updatedOrder.id.slice(-4).toUpperCase()} cancelled`
                            }
                        });
                    }
                }
            }

            // If Cancelled and table exists, free it if no other active orders
            if (status === 'Cancelled' && updatedOrder.tableId) {
                const otherActive = await tx.order.count({
                    where: {
                        tableId: updatedOrder.tableId,
                        clientId: req.clientId!,
                        status: { notIn: ['Paid', 'Cancelled'] },
                        id: { not: updatedOrder.id }
                    }
                });
                if (otherActive === 0) {
                    await tx.table.update({
                        where: { id: updatedOrder.tableId },
                        data: { status: 'Available' }
                    });
                }
            }

            // If status is Paid, free up the table
            if (status === 'Paid' && updatedOrder.tableId) {
                await tx.table.update({
                    where: { id: updatedOrder.tableId },
                    data: { status: 'Available' }
                });
            }

            // --- Activity Log ---
            await tx.activityLog.create({
                data: {
                    action: 'STATUS_CHANGE',
                    details: `Order #${updatedOrder.id.slice(-4).toUpperCase()} changed to ${status}`,
                    userId: user.userId,
                    role: user.role,
                    clientId: req.clientId!
                }
            });

            return updatedOrder;
        });

        // --- Socket Notification ---
        notifyClient(req.clientId!, 'ORDER_UPDATE', order);

        res.json(order);
    } catch (error: any) {
        console.error('Status update error:', error);
        if (error.message?.startsWith('Invalid transition')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Get active order for a specific table
router.get('/table/:tableId', async (req, res) => {
    const { tableId } = req.params;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const order = await prisma.order.findFirst({
            where: {
                tableId: tableId as string,
                clientId: req.clientId!,
                status: { notIn: ['Paid', 'Cancelled'] }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                items: { include: { menuItem: { include: { category: true } } } }
            }
        });
        res.json(order || null);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active order' });
    }
});

// Update individual order item status (e.g. mark one dish as Ready)
router.patch('/item/:itemId/status', async (req, res) => {
    const { itemId } = req.params;
    const { status } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        const orderItem = await prisma.orderItem.update({
            where: { id: itemId },
            data: { status },
            include: { order: true }
        });

        // Notify client about the update
        notifyClient(req.clientId!, 'ORDER_ITEM_UPDATE', {
            orderId: orderItem.orderId,
            itemId: orderItem.id,
            status
        });

        res.json(orderItem);
    } catch (error) {
        console.error('Item status update error:', error);
        res.status(500).json({ error: 'Failed to update item status' });
    }
});

// Remake an order item (Spillage/Waste handling)
router.post('/item/:itemId/remake', async (req, res) => {
    const { itemId } = req.params;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const user = (req as any).user;

    try {
        const order = await prisma.$transaction(async (tx) => {
            const item = await tx.orderItem.findUnique({
                where: { id: itemId },
                include: {
                    order: true,
                    menuItem: { include: { recipe: { include: { inventoryItem: true } } } }
                }
            });

            if (!item) throw new Error('Order item not found');
            if (item.order.clientId !== req.clientId) throw new Error('Unauthorized');

            // Log ingredients as WASTE and deduct for remake
            for (const recipeItem of item.menuItem.recipe) {
                const wasteQuantity = recipeItem.quantity * item.quantity;

                await tx.inventoryItem.update({
                    where: { id: recipeItem.inventoryItemId },
                    data: { quantity: { decrement: wasteQuantity } }
                });

                await tx.inventoryTransaction.create({
                    data: {
                        inventoryItemId: recipeItem.inventoryItemId,
                        type: 'WASTE',
                        quantity: wasteQuantity,
                        reason: `Remake: Spillage/Error on Order #${item.order.orderNumber}`,
                        userId: user.userId,
                        clientId: req.clientId!,
                        orderId: item.orderId
                    }
                });
            }

            // Mark original as Waste with price 0
            await tx.orderItem.update({
                where: { id: itemId },
                data: { status: 'Waste', price: 0 }
            });

            // Create fresh duplicate for kitchen
            await tx.orderItem.create({
                data: {
                    orderId: item.orderId,
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    price: item.price,
                    status: 'Pending',
                    notes: `REMAKE: ${item.notes || ''}`
                }
            });

            // Recalculate order totals
            const allItems = await tx.orderItem.findMany({ where: { orderId: item.orderId } });
            const subtotal = allItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

            const client = await tx.client.findUnique({ where: { id: req.clientId! } });
            let taxAmount = 0;
            let serviceChargeAmount = 0;
            if (client?.useTax) taxAmount = subtotal * (client.taxRate / 100);
            if (client?.useServiceCharge) serviceChargeAmount = subtotal * (client.serviceChargeRate / 100);
            const totalAmount = subtotal + taxAmount + serviceChargeAmount;

            await tx.order.update({
                where: { id: item.orderId },
                data: { subtotal, taxAmount, serviceChargeAmount, totalAmount }
            });

            await tx.activityLog.create({
                data: {
                    action: 'ITEM_REMAKE',
                    details: `Remake triggered for ${item.menuItem.name} on Order #${item.order.orderNumber}`,
                    userId: user.userId,
                    role: user.role,
                    clientId: req.clientId!
                }
            });

            return { orderId: item.orderId };
        });

        notifyClient(req.clientId!, 'ORDER_UPDATE', { id: order.orderId });
        res.json({ message: 'Remake triggered successfully' });
    } catch (error: any) {
        console.error('Remake error:', error);
        res.status(500).json({ error: error.message || 'Failed to trigger remake' });
    }
});

export default router;
