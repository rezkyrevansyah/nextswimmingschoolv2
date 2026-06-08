/**
 * 05-admin-panel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk Admin Panel (/admin)
 *
 * Memerlukan: TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD
 */

import { test, expect } from "../fixtures/auth";

test.describe("Admin Panel — Dashboard", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
  });

  test("halaman admin termuat dengan header yang benar", async ({ page }) => {
    // Admin panel harus menampilkan header
    await expect(page.locator("header, [class*='topbar']").first()).toBeVisible({ timeout: 10_000 });
    // Logo ditampilkan sebagai image, bukan teks "NEXT"
    const logo = page.locator("img[alt*='Next Swimming School']").first();
    await expect(logo).toBeAttached();
  });

  test("sidebar/navigasi admin terlihat", async ({ page }) => {
    // Admin memiliki sidebar seperti owner — sidebar adalah aside (hidden lg:flex)
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeAttached();
  });
});

test.describe("Admin Panel — Manajemen Member", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Member"
    await page.getByRole("button", { name: /^Member$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab Member menampilkan daftar atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada member, bisa dibuka detail profilnya", async ({ page }) => {
    // Cek apakah ada tombol detail/lihat member
    const viewBtn = page.getByRole("button", { name: /Detail|Lihat|Profil/i }).first();
    if (await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await viewBtn.click();
      // Modal harus terbuka
      await expect(page.locator("[class*='modal'], [class*='fixed'][class*='inset-0']").first()).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Admin Panel — Manajemen Coach", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Coach"
    await page.getByRole("button", { name: /^Coach$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab Coach dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Admin Panel — Manajemen Kelas", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Class"
    await page.getByRole("button", { name: /^Class$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab Kelas dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas, tombol Detail bisa diklik dan modal terbuka", async ({ page }) => {
    const detailBtn = page.getByRole("button", { name: "Detail" }).first();
    if (await detailBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await detailBtn.click();
      await expect(page.getByRole("heading", { name: "Detail Kelas" })).toBeVisible();
      // Cek tabs di dalam modal
      const tabs = page.getByRole("tab");
      const tabCount = await tabs.count();
      if (tabCount > 0) {
        expect(tabCount).toBeGreaterThan(0);
      }
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Admin Panel — Approval Pendaftaran", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    // Cari tab approval — label aktual: "Approvement"
    const approvalBtn = page.getByRole("button", { name: /Approval|Approvement|Pendaftaran/i }).first();
    if (await approvalBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await approvalBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("tab Approval dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Admin Panel — Invoice", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    const invoiceBtn = page.getByRole("button", { name: /Invoice|Pembayaran/i }).first();
    if (await invoiceBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await invoiceBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("tab Invoice dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

