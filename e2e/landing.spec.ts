import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health', route => route.fulfill({
    json: { code: 200, message: 'API is healthy.', data: {} },
  }))
})

test('shows version 1.9.0, 500k+ questions, and Host Only Mode in both feature sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Azabab Trivia Party v.1.9.0', exact: true })).toBeVisible()
  const hosts = page.getByRole('heading', { name: 'For Hosts', exact: true }).locator('../..')
  await expect(hosts.getByText('500k+ Questions:', { exact: true })).toBeVisible()
  await expect(page.getByText(/60k\+ questions/i)).toHaveCount(0)
  await expect(hosts).toContainText('Host Only Mode: Host classic, manual trivia games at your own pace')
  const highlights = page.getByRole('heading', { name: 'Everything You Need for an Amazing Trivia Night', exact: true }).locator('..')
  const hostOnly = highlights.getByText('Host Only Mode', { exact: true }).locator('..')
  await expect(hostOnly).toContainText("Present questions one at a time and reveal each round's answers when you're ready.")
})

test('keeps the Host Only highlight readable in mobile and desktop themes', async ({ page }, testInfo) => {
  await page.goto('/')
  const feature = page.getByText('Host Only Mode', { exact: true }).locator('..')
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: /Current theme:/ }).click()
    await page.getByRole('menuitem', { name: theme, exact: true }).click()
    await expect(page.locator('html')).toHaveClass(theme.toLowerCase())
    await expect(page.locator('body')).toHaveCSS('background-color', theme === 'Dark' ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)')
    for (const width of [375, 640, 1024]) {
      await page.setViewportSize({ width, height: 800 })
      await expect(feature).toBeVisible()
      const box = (await feature.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await feature.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy()
      if (width === 375) await page.screenshot({ path: testInfo.outputPath(`landing-${theme.toLowerCase()}.png`), fullPage: true })
    }
  }
})
