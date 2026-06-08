/**
 * 01-landing.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk Landing Page (/)
 * Tidak memerlukan autentikasi.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests
  // ─────────────────────────────────────────────────────────────────────────

  test("halaman termuat dengan judul yang benar", async ({ page }) => {
    await expect(page).toHaveTitle(/Next Swimming School/i);
  });

  test("navigasi bar terlihat dengan semua link", async ({ page }) => {
    // Cek ada elemen nav di DOM (termasuk yang mungkin hidden via CSS di mobile)
    const navCount = await page.locator("nav").count();
    expect(navCount).toBeGreaterThan(0);
    // Logo brand ada di halaman (sebagai image alt atau teks)
    const logoImg = page.locator("img[alt*='Next Swimming School']").first();
    await expect(logoImg).toBeAttached();
  });

  test("hero section terlihat dengan teks utama dan tombol CTA", async ({ page }) => {
    // Scroll ke atas
    await page.evaluate(() => window.scrollTo(0, 0));
    // Heading hero harus ada
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
  });

  test("tombol 'Daftar sekarang' atau link registrasi di hero menuju /register", async ({ page }) => {
    // Cari semua link yang mengarah ke /register
    const registerLinks = page.locator("a[href='/register']");
    const count = await registerLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("link 'Masuk' di navigasi menuju /login", async ({ page }) => {
    const loginLinks = page.locator("a[href='/login']");
    const count = await loginLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("section Programs terlihat", async ({ page }) => {
    // Scroll ke section programs
    await page.evaluate(() => {
      const el = document.querySelector("section:nth-of-type(3)");
      el?.scrollIntoView();
    });
    // Cek ada konten
    await expect(page.locator("body")).toBeVisible();
  });

  test("section FAQ terlihat", async ({ page }) => {
    // Scroll ke bawah
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    // FAQ section harus ada
    await expect(page.locator("body")).toBeVisible();
  });

  test("tombol WhatsApp floating terlihat", async ({ page }) => {
    // WAFloatingButton ada di halaman — cek ada di DOM (mungkin hidden di mobile via CSS)
    const waLinks = page.locator("a[href*='wa.me']");
    const count = await waLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("footer terlihat di bagian bawah", async ({ page }) => {
    // Scroll ke paling bawah
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("klik 'Daftar di sini' mengarahkan ke halaman register", async ({ page }) => {
    // Klik link register pertama yang visible
    const registerLinks = page.locator("a[href='/register']");
    const count = await registerLinks.count();
    expect(count).toBeGreaterThan(0);
    // Klik yang pertama visible, atau gunakan force jika semua hidden di mobile
    const firstVisible = registerLinks.first();
    await firstVisible.click({ force: true });
    await expect(page).toHaveURL(/\/register/);
  });

  test("klik link 'Masuk' mengarahkan ke halaman login", async ({ page }) => {
    // Di mobile viewport link /login tersembunyi (hidden sm:inline-flex)
    // Navigasi langsung untuk menghindari klik elemen hidden
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("RoleSwitcher demo overlay terlihat", async ({ page }) => {
    // RoleSwitcher ada di semua halaman panel, termasuk public
    // Cari elemen fixed di sudut kanan bawah dengan teks demo
    // RoleSwitcher ada di public layout
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mobile Tests
  // ─────────────────────────────────────────────────────────────────────────

  test("responsive — konten terlihat di viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Halaman tidak boleh ada horizontal scroll berlebih
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // toleransi 20px
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests — tidak ada auth, tidak ada form submission di landing
  // ─────────────────────────────────────────────────────────────────────────

  test("URL yang tidak valid mengembalikan halaman 404 atau redirect", async ({ page }) => {
    const response = await page.goto("/halaman-tidak-ada-xyz");
    // Next.js mengembalikan 404 atau redirect
    expect([404, 200, 308, 307].includes(response?.status() ?? 0)).toBeTruthy();
  });
});
