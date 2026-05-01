import express from 'express';
import prisma from '../services/prisma.js';
import { notifyClient } from '../services/socket.js';
import { createOrderSchema, updateOrderStatusSchema, paymentSchema } from '../validations/orderSchema.js';
import { generateTaxInvoice } from './taxInvoice.js';

const router = express.Router();

// Valid status transitions map (Issue #1)
const VALID_TRANSITIONS: Record<string, string[]> = {
    'Pending': ['Cooking', 'Cancelled'],
    'Cooking': ['Ready', 'Cancelled'],
    'Ready': ['Served', 'Cooking', 'Cancelled'],
    'Served': ['Paid', 'Cooking', 'Cancelled'],
};

// Create or Update an order
router.post('/', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }
    const { tableId, items, customerId, type } = validation.data;

    try {
        const order = await prisma.$transaction(async (tx) => {
            // 0. Get current open shift
            const currentShift = await tx.financialShift.findFirst({
                where: { clientId: req.clientId!, status: 'OPEN' },
                orderBy: { openedAt: 'desc' }
            });

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
                select: { 
                    useTax: true, 
                    taxRate: true, 
                    useServiceCharge: true, 
                    serviceChargeRate: true,
                    plan: true,
                    subscriptionPlan: true
                }
            });
            if (!client) throw new Error('Client not found');

            const hasKDS = client.subscriptionPlan?.hasKDS !== false; // Default to true if not set
            const initialStatus = hasKDS ? 'Pending' : 'Served';

            let orderId: string;
            let action: string;

            if (existingOrder) {
                // UPDATE EXISTING ORDER — only add new items, don't touch existing ones
                orderId = existingOrder.id;
                action = 'ORDER_ITEMS_ADDED';

                // Add NEW items to the existing order
                const newItemsData = items.map((item: any) => ({
                    orderId,
                    menuItemId: item.menuItemId,
                    variantId: item.variantId, // NEW
                    quantity: parseInt(item.quantity),
                    price: parseFloat(item.price),
                    notes: item.notes,
                    status: initialStatus
                }));
                await tx.orderItem.createMany({ data: newItemsData });
            } else {
                // CREATE NEW ORDER
                action = 'ORDER_NEW';
                const newOrder = await tx.order.create({
                    data: {
                        tableId,
                        customerId,
                        type: type || 'DINE_IN',
                        subtotal: 0,
                        totalAmount: 0,
                        clientId: req.clientId!,
                        status: initialStatus,
                        items: {
                            create: items.map((item: any) => ({
                                menuItemId: item.menuItemId,
                                variantId: item.variantId, // NEW
                                quantity: parseInt(item.quantity),
                                price: parseFloat(item.price),
                                notes: item.notes,
                                status: initialStatus
                            }))
                        },
                        shiftId: currentShift?.id
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
                    status: initialStatus
                },
                include: { items: { include: { variant: true, menuItem: { include: { category: true } } } }, table: true }
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

            // Collect only the newly-added items (status='Pending' just created)
            const newlyAddedItems = action === 'ORDER_ITEMS_ADDED'
                ? finalOrder.items.filter((i: any) => i.status === 'Pending')
                : [];

            return { finalOrder, action, newlyAddedItems };
        });

        // Emit the correct socket event
        if (order.action === 'ORDER_ITEMS_ADDED') {
            // Send specific event with only the new items + order context
            notifyClient(req.clientId!, 'ORDER_ITEMS_ADDED', {
                orderId: order.finalOrder.id,
                tableNumber: order.finalOrder.table?.number || 'Walk-in',
                newItems: order.newlyAddedItems,
                order: order.finalOrder
            });
        } else {
            notifyClient(req.clientId!, 'ORDER_NEW', order.finalOrder);
        }
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
                items: { 
                    include: { 
                        menuItem: { include: { category: true } },
                        variant: true 
                    } 
                },
                table: true,
                customer: true,
                taxInvoice: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Link a customer to an order
router.put('/:id/customer', async (req, res) => {
    const { id } = req.params;
    const { customerId } = req.body;

    if (!customerId) return res.status(400).json({ error: 'Customer ID is required' });

    try {
        const order = await prisma.order.update({
            where: { id: id as string, clientId: req.clientId! },
            data: { customerId },
            include: { customer: true }
        });
        res.json(order);
    } catch (error) {
        console.error('Failed to link customer', error);
        res.status(500).json({ error: 'Failed to link customer to order' });
    }
});

// Update order status with VALIDATION (Issue #1, #2, #3)
router.put('/:id/status', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    const validation = updateOrderStatusSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }
    const { id } = req.params;
    const { status, paymentMethod } = validation.data;
    const user = (req as any).user;

    try {
        const order = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findUnique({
                where: { id: id as string },
                include: { 
                    items: { 
                        include: { 
                            variant: { include: { recipe: true } }, 
                            menuItem: { include: { recipe: true } } 
                        } 
                    } 
                }
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
                include: { 
                    items: { 
                        include: { 
                            variant: { include: { recipe: true } }, 
                            menuItem: { include: { recipe: true, category: true } } 
                        } 
                    }, 
                    table: true 
                }
            });

            const now = new Date();

            // --- Issue #2: Item-level inventory deduction (only Pending items) ---
            if (status === 'Cooking') {
                const pendingItems = updatedOrder.items.filter(item => item.status === 'Pending');
                for (const item of pendingItems) {
                    // Decide which recipe to use: Variant specific or Base item
                    const recipe = (item.variant && item.variant.recipe && item.variant.recipe.length > 0) 
                        ? item.variant.recipe 
                        : item.menuItem.recipe;

                    for (const recipeItem of recipe) {
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
                        data: { status: 'Cooking', cookingStartedAt: now }
                    });
                }
            }

            // --- Sync item statuses on order transitions ---
            if (status === 'Ready') {
                // Mark all actionable items as 'Ready'
                await tx.orderItem.updateMany({
                    where: { orderId: id as string, status: { in: ['Pending', 'Cooking'] } },
                    data: { status: 'Ready', readyAt: now }
                });
            }

            if (status === 'Served') {
                // Mark all prepared items as 'Served'
                await tx.orderItem.updateMany({
                    where: { orderId: id as string, status: { in: ['Pending', 'Cooking', 'Ready'] } },
                    data: { status: 'Served' }
                });
            }

            // --- Issue #3: Only restore non-waste items on cancel ---
            if (status === 'Cancelled' && ['Cooking', 'Ready', 'Served'].includes(currentOrder.status)) {
                const restorableItems = updatedOrder.items.filter(item => item.status !== 'Waste' && item.status !== 'Pending');
                for (const item of restorableItems) {
                    const recipe = (item.variant && item.variant.recipe && item.variant.recipe.length > 0)
                        ? item.variant.recipe
                        : item.menuItem.recipe;

                    for (const recipeItem of recipe) {
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

            // If status is Paid, free up the table and save payment method
            if (status === 'Paid') {
                const updateData: any = { status };
                if (paymentMethod) updateData.paymentMethod = paymentMethod;

                await tx.order.update({
                    where: { id: id as string, clientId: req.clientId! },
                    data: updateData
                });

                // --- NEW: Ensure a Payment record exists for shift reconciliation ---
                const existingPayments = await tx.payment.count({ where: { orderId: id as string } });
                if (existingPayments === 0) {
                    await tx.payment.create({
                        data: {
                            orderId: id as string,
                            amount: currentOrder.totalAmount,
                            method: paymentMethod || 'Cash',
                            clientId: req.clientId!
                        }
                    });
                }

                if (updatedOrder.tableId) {
                    await tx.table.update({
                        where: { id: updatedOrder.tableId },
                        data: { status: 'Available' }
                    });
                }

                // Auto-generate Tax Invoice for VAT-registered clients
                await generateTaxInvoice(tx, id as string, req.clientId!);
            }

            // --- Activity Log ---
            await tx.activityLog.create({
                data: {
                    action: 'STATUS_CHANGE',
                    details: `Order #${updatedOrder.id.slice(-4).toUpperCase()} changed to ${status}${paymentMethod ? ` via ${paymentMethod}` : ''}`,
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
                items: { include: { variant: true, menuItem: { include: { category: true } } } },
                taxInvoice: true
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
        const now = new Date();
        const updateData: any = { status };
        
        if (status === 'Cooking') updateData.cookingStartedAt = now;
        if (status === 'Ready') updateData.readyAt = now;

        const orderItem = await prisma.orderItem.update({
            where: { id: itemId },
            data: updateData,
            include: { 
                order: { include: { table: true } },
                menuItem: true
            }
        });

        // Notify client about the update
        notifyClient(req.clientId!, 'ORDER_ITEM_UPDATE', {
            orderId: orderItem.orderId,
            itemId: orderItem.id,
            status,
            itemName: orderItem.menuItem.name,
            tableNumber: orderItem.order.table?.number || 'Walk-in'
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
                    variant: { include: { recipe: { include: { inventoryItem: true } } } },
                    menuItem: { include: { recipe: { include: { inventoryItem: true } } } }
                }
            });

            if (!item) throw new Error('Order item not found');
            if (item.order.clientId !== req.clientId) throw new Error('Unauthorized');

            // Log ingredients as WASTE and deduct for remake
            const recipe = (item.variant && item.variant.recipe && item.variant.recipe.length > 0)
                ? item.variant.recipe
                : item.menuItem.recipe;

            for (const recipeItem of recipe) {
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
                    variantId: item.variantId,
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

// Handle Split/Partial Payments
router.post('/:id/pay', async (req, res) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    const validation = paymentSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Validation Error', details: validation.error.issues });
    }
    const { id } = req.params;
    const { payments } = validation.data; // Array of { amount, method, label, itemIds }
    const user = (req as any).user;

    try {
        const order = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findUnique({
                where: { id: id as string },
                include: { items: true }
            });

            if (!currentOrder) throw new Error('Order not found');
            if (currentOrder.clientId !== req.clientId) throw new Error('Unauthorized');

            const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

            // Allow a tiny margin for float precision
            if (totalPaid < currentOrder.totalAmount - 0.01) {
                throw new Error(`Insufficient payment: Total required ${currentOrder.totalAmount}, provided ${totalPaid}`);
            }

            // 1. Create payment records
            await tx.payment.createMany({
                data: payments.map((p: any) => ({
                    orderId: id,
                    amount: parseFloat(p.amount),
                    method: p.method,
                    label: p.label,
                    itemIds: p.itemIds ? JSON.stringify(p.itemIds) : null,
                    clientId: req.clientId!
                }))
            });

            // 2. Update order status and method
            const updatedOrder = await tx.order.update({
                where: { id: id as string },
                data: {
                    status: 'Paid',
                    paymentMethod: payments.length > 1 ? 'Split' : payments[0].method
                },
                include: { table: true }
            });

            // 3. Free the table
            if (updatedOrder.tableId) {
                await tx.table.update({
                    where: { id: updatedOrder.tableId },
                    data: { status: 'Available' }
                });
            }

            // 4. Log Activity
            await tx.activityLog.create({
                data: {
                    action: 'PAYMENT_RECEIVED',
                    details: `Payment received for Order #${updatedOrder.id.slice(-4).toUpperCase()} - Total: ${totalPaid.toFixed(2)} (${updatedOrder.paymentMethod})`,
                    userId: user.userId,
                    role: user.role,
                    clientId: req.clientId!
                }
            });

            return updatedOrder;
        });

        // Auto-generate Tax Invoice for VAT-registered clients
        await generateTaxInvoice(prisma, id as string, req.clientId!);

        notifyClient(req.clientId!, 'ORDER_UPDATE', order);
        res.json(order);
    } catch (error: any) {
        console.error('Payment processing error:', error);
        res.status(500).json({ error: error.message || 'Failed to process payment' });
    }
});

// Transfer order to a new table
router.post('/:id/transfer', async (req, res) => {
    const { id } = req.params;
    const { targetTableId } = req.body;
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const user = (req as any).user;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current order and target table
            const order = await tx.order.findUnique({
                where: { id: id as string, clientId: req.clientId! },
                include: { table: true }
            });

            if (!order) throw new Error('Order not found');
            if (order.status === 'Paid' || order.status === 'Cancelled') {
                throw new Error('Cannot transfer a completed or cancelled order');
            }

            const targetTable = await tx.table.findUnique({
                where: { id: targetTableId, clientId: req.clientId! }
            });

            if (!targetTable) throw new Error('Target table not found');
            if (!['Available', 'Reserved'].includes(targetTable.status)) {
                throw new Error('Target table is not available or reserved');
            }

            // 2. Update order with new tableId
            const updatedOrder = await tx.order.update({
                where: { id: id as string },
                data: { tableId: targetTableId },
                include: { table: true }
            });

            // 3. Set source table to Available (if it exists)
            if (order.tableId) {
                await tx.table.update({
                    where: { id: order.tableId },
                    data: { status: 'Available' }
                });
            }

            // 4. Set target table to Occupied
            await tx.table.update({
                where: { id: targetTableId },
                data: { status: 'Occupied' }
            });

            // 5. Activity Log
            await tx.activityLog.create({
                data: {
                    action: 'TABLE_TRANSFER',
                    details: `Transferred Order #${order.id.slice(-4).toUpperCase()} from Table #${order.table?.number || 'Walk-in'} to Table #${targetTable.number}`,
                    userId: user.userId,
                    role: user.role,
                    clientId: req.clientId!
                }
            });

            return updatedOrder;
        });

        // Notify client about the update
        notifyClient(req.clientId!, 'ORDER_UPDATE', result);
        // Also notify about table updates
        notifyClient(req.clientId!, 'TABLE_UPDATE', { orderId: result.id });

        res.json({ message: 'Transfer successful', order: result });
    } catch (error: any) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: error.message || 'Failed to transfer table' });
    }
});

export default router;
