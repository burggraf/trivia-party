import { expect, test } from '@playwright/test'

test('development API requests use the frontend origin so backend ports stay private', async ({ page, baseURL }) => {
  let healthUrl = ''
  await page.route('**/api/health', async route => {
    healthUrl = route.request().url()
    await route.fulfill({ json: { code: 200, message: 'Healthy' } })
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: "I Want to Host", exact: true })).toBeVisible()
  expect(new URL(healthUrl).origin).toBe(new URL(baseURL!).origin)
})
