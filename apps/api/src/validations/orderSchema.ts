import { z } from 'zod';

export const createOrderSchema = z.object({
    tableId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    items: z.array(z.object({
        menuItemId: z.string().uuid(),
        variantId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().positive().or(z.string().regex(/^\d+$/).transform(v => parseInt(v))),
        price: z.number().positive().or(z.string().regex(/^\d+(\.\d+)?$/).transform(v => parseFloat(v))),
        notes: z.string().optional().nullable(),
    })).min(1),
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
