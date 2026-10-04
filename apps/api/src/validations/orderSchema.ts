import { z } from 'zod';
import { comboOrderSchema } from './comboSchema.js';

export const createOrderSchema = z.object({
    tableId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).optional().default('DINE_IN'),
    items: z.array(z.object({
        menuItemId: z.string().uuid(),
        variantId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().positive().or(z.string().regex(/^\d+$/).transform(v => parseInt(v))),
        price: z.number().positive().or(z.string().regex(/^\d+(\.\d+)?$/).transform(v => parseFloat(v))),
        notes: z.string().optional().nullable(),
    })).default([]),
    combos: z.array(comboOrderSchema).default([])
}).refine(order => order.items.length + order.combos.length > 0, {
    path: ['items'],
    message: 'At least one menu item or combo deal is required'
});

export const updateOrderDiscountSchema = z.object({
    promotionId: z.string().uuid().nullable(),
    manualDiscountAmount: z.number().finite().nonnegative()
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(['Pending', 'Cooking', 'Ready', 'Served', 'Paid', 'Cancelled']),
    paymentMethod: z.enum(['Cash', 'Card', 'UPI', 'Split']).optional().nullable(),
});

export const paymentSchema = z.object({
    payments: z.array(z.object({
        amount: z.number().positive().or(z.string().regex(/^\d+(\.\d+)?$/).transform(v => parseFloat(v))),
        method: z.enum(['Cash', 'Card', 'UPI']),
        label: z.string().optional().nullable(),
        itemIds: z.array(z.string().uuid()).optional().nullable(),
    })).min(1),
});
