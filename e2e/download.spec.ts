import { expect, test } from '@playwright/test'

test('offers the macOS and Android TV display downloads', async ({ page }) => {
  await page.goto('/download')

  await expect(page.getByRole('heading', { name: 'Download Trivia Party Display' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download for macOS' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download Android TV APK' })).toBeVisible()
})
