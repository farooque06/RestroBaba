import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { resolveComboOrderItems } from '../services/comboOrderItems.js';
import { createOrderSchema } from '../validations/orderSchema.js';

const mainItemId = '11111111-1111-4111-8111-111111111111';
const drinkItemId = '22222222-2222-4222-8222-222222222222';
const dealId = '33333333-3333-4333-8333-333333333333';
const mainGroupId = '44444444-4444-4444-8444-444444444444';
const upgradeGroupId = '55555555-5555-4555-8555-555555555555';
const mainOptionId = '66666666-6666-4666-8666-666666666666';
const drinkOptionId = '77777777-7777-4777-8777-777777777777';
const clientId = '88888888-8888-4888-8888-888888888888';

const makeDeal = () => ({
    id: dealId,
    name: 'Lunch combo',
    price: 100,
    isAvailable: true,
    isDeleted: false,
    startsAt: null,
    endsAt: null,
    groups: [
        {
            id: mainGroupId,
            name: 'Main',
            required: true,
            options: [{
                id: mainOptionId,
                extraPrice: 0,
                menuItem: { id: mainItemId, name: 'Burger', price: 200, clientId, available: true, isDeleted: false }
            }]
        },
        {
            id: upgradeGroupId,
            name: 'Drink upgrade',
            required: false,
            options: [{
                id: drinkOptionId,
                extraPrice: 25,
                menuItem: { id: drinkItemId, name: 'Shake', price: 50, clientId, available: true, isDeleted: false }
            }]
        }
    ]
});

const makeDb = (deal: ReturnType<typeof makeDeal> | null) => ({
    comboDeal: { findMany: vi.fn().mockResolvedValue(deal ? [deal] : []) }
}) as unknown as Prisma.TransactionClient;

describe('combo order item resolution', () => {
    it('allocates the fixed deal price and upgrade charge across its real menu items', async () => {
        const db = makeDb(makeDeal());
        const result = await resolveComboOrderItems(db, clientId, [{
            dealId,
            quantity: 2,
            selections: [
                { groupId: mainGroupId, optionId: mainOptionId },
                { groupId: upgradeGroupId, optionId: drinkOptionId }
            ]
        }]);

        expect(result).toEqual([
            { menuItemId: mainItemId, quantity: 2, price: 100, comboDealName: 'Lunch combo', comboGroupName: 'Main' },
            { menuItemId: drinkItemId, quantity: 2, price: 25, comboDealName: 'Lunch combo', comboGroupName: 'Drink upgrade' }
        ]);
        expect(result.reduce((sum, item) => sum + item.price * item.quantity, 0)).toBe(250);
    });

    it('rejects missing required choices and unavailable deals', async () => {
        await expect(resolveComboOrderItems(makeDb(makeDeal()), clientId, [{
            dealId,
            quantity: 1,
            selections: []
        }])).rejects.toThrow('Choose an option for Main');

        await expect(resolveComboOrderItems(makeDb(null), clientId, [{
            dealId,
            quantity: 1,
            selections: [{ groupId: mainGroupId, optionId: mainOptionId }]
        }])).rejects.toThrow('unavailable');
    });

    it('rejects options owned by a different restaurant', async () => {
        const foreignDeal = makeDeal();
        foreignDeal.groups[0].options[0].menuItem.clientId = '99999999-9999-4999-8999-999999999999';

        await expect(resolveComboOrderItems(makeDb(foreignDeal), clientId, [{
            dealId,
            quantity: 1,
            selections: [{ groupId: mainGroupId, optionId: mainOptionId }]
        }])).rejects.toThrow('currently unavailable');
    });

    it('accepts combo-only orders and rejects empty order submissions', () => {
        const comboOnly = createOrderSchema.safeParse({
            combos: [{ dealId, quantity: 1, selections: [{ groupId: mainGroupId, optionId: mainOptionId }] }]
        });
        expect(comboOnly.success).toBe(true);
        expect(createOrderSchema.safeParse({ items: [], combos: [] }).success).toBe(false);
    });
});
