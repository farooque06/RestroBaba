import { z } from 'zod';

const moneySchema = (minimum: number) => z.coerce.number().finite().min(minimum).refine(
    value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
    'Use no more than two decimal places'
);

const comboOptionSchema = z.object({
    menuItemId: z.string().uuid(),
    extraPrice: moneySchema(0)
});

const comboGroupSchema = z.object({
    name: z.string().trim().min(1).max(80),
    required: z.boolean().default(true),
    options: z.array(comboOptionSchema).min(1).max(30)
});

export const comboDealSchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional().nullable(),
    price: moneySchema(0.01),
    isAvailable: z.boolean().default(true),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
    groups: z.array(comboGroupSchema).min(1).max(10)
}).superRefine((deal, context) => {
    if (!deal.groups.some(group => group.required)) {
        context.addIssue({
            code: 'custom',
            path: ['groups'],
            message: 'At least one required choice group is needed'
        });
    }
    if (deal.startsAt && deal.endsAt && deal.endsAt <= deal.startsAt) {
        context.addIssue({
            code: 'custom',
            path: ['endsAt'],
            message: 'End date must be after the start date'
        });
    }
});

export const comboOrderSchema = z.object({
    dealId: z.string().uuid(),
    quantity: z.number().int().positive().max(50),
    selections: z.array(z.object({
        groupId: z.string().uuid(),
        optionId: z.string().uuid()
    })).max(10)
});
