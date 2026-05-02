import { test, expect } from '@playwright/test';

// ─── Login ───────────────────────────────────────────────────────────────────

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('renders all form elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('navigates to register page', async ({ page }) => {
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

// ─── Register ────────────────────────────────────────────────────────────────

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('renders all form elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('shows validation errors for empty required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    await expect(page.getByText('Please confirm your password')).toBeVisible();
  });

  test('shows password mismatch error', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('Password1');
    await page.getByLabel('Confirm password').fill('Different1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('shows password complexity error', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('weakpass');
    await page.getByLabel('Confirm password').fill('weakpass');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByText('Must contain at least one uppercase letter'),
    ).toBeVisible();
  });

  test('toggles password visibility on both fields', async ({ page }) => {
    const [passToggle, confirmToggle] = await page
      .getByRole('button', { name: 'Show password' })
      .all();
    await passToggle.click();
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'text');
    await confirmToggle.click();
    await expect(page.getByLabel('Confirm password')).toHaveAttribute('type', 'text');
  });

  test('navigates back to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
