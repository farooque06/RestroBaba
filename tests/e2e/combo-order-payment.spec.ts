import { expect, test, type Page, type Route } from '@playwright/test';

const clientId = '88888888-8888-4888-8888-888888888888';
const tableId = '99999999-9999-4999-9999-999999999999';
const mainItemId = '11111111-1111-4111-8111-111111111111';
const drinkItemId = '22222222-2222-4222-8222-222222222222';
const dealId = '33333333-3333-4333-8333-333333333333';
const orderId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const mainGroupId = '44444444-4444-4444-8444-444444444444';
const drinkGroupId = '55555555-5555-4555-8555-555555555555';
const mainOptionId = '66666666-6666-4666-8666-666666666666';
const drinkOptionId = '77777777-7777-4777-8777-777777777777';

const menuItems = [
    {
        id: mainItemId,
        name: 'Burger',
        price: 350,
        available: true,
        isDeleted: false,
        image: '',
        variants: [],
        categoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        category: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Mains' }
    },
    {
        id: drinkItemId,
        name: 'Cola',
        price: 60,
        available: true,
        isDeleted: false,
        image: '',
        variants: [],
        categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        category: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Drinks' }
    }
];

const categories = [
    { id: menuItems[0].categoryId, name: 'Mains' },
    { id: menuItems[1].categoryId, name: 'Drinks' }
];

const installApiMocks = async (page: Page) => {
    let savedDeal: Record<string, any> | null = null;
    let order: Record<string, any> | null = null;
    let orderPayload: Record<string, any> | null = null;
    let paymentPayload: Record<string, any> | null = null;
    let tableStatus = 'Available';

    await page.addInitScript(({ clientId: tenantId }) => {
        localStorage.setItem('restroToken', 'combo-flow-test-token');
        localStorage.setItem('restroClientId', tenantId);
        localStorage.setItem('restroUser', JSON.stringify({
            id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            userId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            role: 'ADMIN',
            clientId: tenantId,
            clientName: 'Combo Test Restaurant',
            client: { plan: 'DIAMOND' }
        }));
    }, { clientId });

    await page.route('**/api/**', async (route: Route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        if (!path.startsWith('/api/')) return route.continue();
        const json = (body: unknown, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body)
        });

        if (path === '/api/auth/me') {
            return json({
                user: {
                    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                    userId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                    role: 'ADMIN',
                    clientId,
                    clientName: 'Combo Test Restaurant',
                    client: {
                        plan: 'DIAMOND',
                        useTax: false,
                        taxRate: 0,
                        useServiceCharge: false,
                        serviceChargeRate: 0,
                        subscriptionPlan: { hasKDS: true }
                    }
                }
            });
        }
        if (path === '/api/menu/items') return json(menuItems);
        if (path === '/api/menu/categories') return json(categories);
        if (path === '/api/tables' && request.method() === 'GET') {
            return json([{
                id: tableId,
                number: '1',
                capacity: 4,
                status: tableStatus,
                clientId
            }]);
        }
        if (path === '/api/combos' && request.method() === 'GET') {
            return json(savedDeal ? [savedDeal] : []);
        }
        if (path === '/api/combos' && request.method() === 'POST') {
            const body = request.postDataJSON();
            const groupIds = [mainGroupId, drinkGroupId];
            savedDeal = {
                ...body,
                id: dealId,
                isDeleted: false,
                groups: body.groups.map((group: any, groupIndex: number) => ({
                    ...group,
                    id: groupIds[groupIndex],
                    options: group.options.map((option: any) => ({
                        ...option,
                        id: groupIndex === 0 ? mainOptionId : drinkOptionId,
                        menuItem: menuItems.find(item => item.id === option.menuItemId)
                    }))
                }))
            };
            return json(savedDeal, 201);
        }
        if (path === '/api/orders' && request.method() === 'POST') {
            orderPayload = request.postDataJSON();
            const selections = orderPayload.combos[0].selections;
            const selectedMain = selections.find((selection: any) => selection.groupId === mainGroupId);
            const selectedDrink = selections.find((selection: any) => selection.groupId === drinkGroupId);
            order = {
                id: orderId,
                status: 'Served',
                totalAmount: 529,
                subtotal: 529,
                taxAmount: 0,
                serviceChargeAmount: 0,
                paymentMethod: null,
                createdAt: new Date().toISOString(),
                table: { id: tableId, number: '1' },
                customer: null,
                items: [
                    {
                        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                        menuItemId: mainItemId,
                        price: 451.95,
                        quantity: 1,
                        status: 'Pending',
                        comboDealName: 'Family meal',
                        comboGroupName: 'Choose from Mains',
                        menuItem: menuItems[0]
                    },
                    {
                        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
                        menuItemId: drinkItemId,
                        price: 77.05,
                        quantity: 1,
                        status: 'Pending',
                        comboDealName: 'Family meal',
                        comboGroupName: 'Choose from Drinks',
                        menuItem: menuItems[1]
                    }
                ]
            };
            tableStatus = 'Occupied';
            return json(order, 201);
        }
        if (path === '/api/orders' && request.method() === 'GET') {
            return json(order ? [order] : []);
        }
        if (path === `/api/orders/${orderId}/status` && request.method() === 'PUT') {
            paymentPayload = request.postDataJSON();
            order = { ...order!, status: 'Paid', paymentMethod: paymentPayload.paymentMethod };
            tableStatus = 'Available';
            return json(order);
        }

        return json({ error: `Unhandled API request: ${request.method()} ${path}` }, 404);
    });

    return {
        getSavedDeal: () => savedDeal,
        getOrderPayload: () => orderPayload,
        getPaymentPayload: () => paymentPayload
    };
};

test('manager creates a combo, adds it to a table order, and processes payment', async ({ page }) => {
    const api = await installApiMocks(page);

    await page.goto('/combos');
    await expect(page.getByRole('heading', { name: 'Combo Deals' })).toBeVisible();
    await page.getByLabel('Deal name').fill('Family meal');
    await page.getByLabel('Bundle price').fill('499');

    await page.locator('.combo-category-filter .dropdown-trigger').nth(0).click();
    await page.getByText('Mains', { exact: true }).last().click();
    await page.locator('.combo-option-item .dropdown-trigger').nth(0).click();
    await page.getByText(/Burger/).last().click();

    await page.getByRole('button', { name: 'Add group' }).click();
    await page.locator('.combo-group-name').nth(1).fill('Choose from Drinks');
    await page.locator('.combo-required input').nth(1).uncheck();
    await page.locator('.combo-category-filter .dropdown-trigger').nth(1).click();
    await page.getByText('Drinks', { exact: true }).last().click();
    await page.locator('.combo-option-item .dropdown-trigger').nth(1).click();
    await page.getByText(/Cola/).last().click();
    await page.locator('.combo-option-extra input').nth(1).fill('30');
    await page.getByRole('button', { name: 'Create deal' }).click();

    await expect.poll(() => api.getSavedDeal()).not.toBeNull();
    expect(api.getSavedDeal()).toMatchObject({
        name: 'Family meal',
        price: 499,
        groups: [
            { name: 'Choose from Mains', required: true, options: [{ menuItemId: mainItemId, extraPrice: 0 }] },
            { name: 'Choose from Drinks', required: false, options: [{ menuItemId: drinkItemId, extraPrice: 30 }] }
        ]
    });
    await expect(page.getByRole('heading', { name: 'Family meal' })).toBeVisible();
    await page.goto('/tables');
    await expect(page.getByText('Floor Plan')).toBeVisible();
    await page.getByRole('button', { name: 'Order' }).click();
    await page.getByRole('button', { name: /Family meal From/ }).click();
    await expect(page.getByRole('heading', { name: 'Family meal' })).toBeVisible();

    await page.locator('.combo-order-picker .dropdown-trigger').nth(0).click();
    await page.getByText(/Burger/).last().click();
    await page.locator('.combo-order-picker .dropdown-trigger').nth(1).click();
    await page.getByText(/Cola/).last().click();
    await expect(page.getByText('Rs. 529.00')).toBeVisible();
    await page.getByRole('button', { name: 'Add to order' }).click();
    await expect(page.getByText('Family meal', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Order' }).click();

    await expect.poll(() => api.getOrderPayload()).not.toBeNull();
    expect(api.getOrderPayload()?.combos).toEqual([{
        dealId,
        quantity: 1,
        selections: [
            { groupId: mainGroupId, optionId: mainOptionId },
            { groupId: drinkGroupId, optionId: drinkOptionId }
        ]
    }]);

    await page.goto('/billing');
    await expect(page.getByRole('heading', { name: 'Billing & Invoices' })).toBeVisible();
    await expect(page.getByText('Rs. 529.00').first()).toBeVisible();
    await page.getByRole('button', { name: /Quick Pay/ }).click();
    await page.getByRole('button', { name: /Paid History/ }).click();
    await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    expect(api.getPaymentPayload()).toMatchObject({ status: 'Paid', paymentMethod: 'Cash' });
});
