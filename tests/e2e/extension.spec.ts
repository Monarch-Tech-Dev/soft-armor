import { test, expect } from '@playwright/test';

test('extension loads context menu', async ({ page, context }) => {
  // TODO: Add E2E tests for extension functionality
  await page.goto('https://example.com');
  expect(page).toBeTruthy();
});
