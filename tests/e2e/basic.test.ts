import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/RestroBaba/i);
});

test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    // Check for the "RestroFlow" heading or "Enter Shop Code" text
    await expect(page.getByRole('heading', { name: /RestroFlow/i })).toBeVisible();
    await expect(page.getByText(/Enter Shop Code/i)).toBeVisible();
});
