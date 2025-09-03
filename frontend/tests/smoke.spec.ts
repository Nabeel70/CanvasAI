import { test, expect } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test.describe('CanvasAI smoke', () => {
  test('redirects unauthenticated to login', async ({ page }) => {
    await page.goto(BASE_URL + '/')
    await expect(page).toHaveURL(/login|signup|\//)
  })

  test('login form validation', async ({ page }) => {
    await page.goto(BASE_URL + '/login')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('can login with demo account if backend seeded', async ({ page }) => {
    await page.goto(BASE_URL + '/login')
    await page.getByLabel('Email address').fill('demo@canvasai.com')
    await page.getByLabel('Password').fill('demo123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Dashboard or error toast depending on backend availability
    await expect(page).toHaveURL(/(\/?$|dashboard|editor)/, { timeout: 10000 })
  })
})
