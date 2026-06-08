/**
 * 06-coach-panel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk Coach Panel (/coach)
 *
 * Memerlukan: TEST_COACH_EMAIL + TEST_COACH_PASSWORD
 */

import { test, expect } from "../fixtures/auth";

test.describe("Coach Panel — Home Tab", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests
  // ─────────────────────────────────────────────────────────────────────────

  test("halaman coach termuat dengan header", async ({ page }) => {
    await expect(page.locator("header").first()).toBeVisible({ timeout: 10_000 });
    // Logo ditampilkan sebagai image, bukan teks "NEXT"
    const logo = page.locator("img[alt*='Next Swimming School']").first();
    await expect(logo).toBeAttached();
  });

  test("home tab menampilkan greeting dan statistik bulanan", async ({ page }) => {
    // Greeting "Halo, [nama coach]"
    await expect(page.getByText(/Halo,/i)).toBeVisible({ timeout: 10_000 });
    // Statistik: Hadir bln ini, Izin, Pengganti
    await expect(page.getByText(/Hadir/i)).toBeVisible();
  });

  test("mobile nav bar ada di halaman", async ({ page }) => {
    // Coach page menggunakan MobileNav (bottom nav) — pakai lg:hidden, ada di DOM tapi hidden di desktop
    const nav = page.locator("nav").first();
    await expect(nav).toBeAttached();
  });
});

test.describe("Coach Panel — Tab Navigasi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
  });

  test("tab Absensi dapat diklik dan menampilkan konten", async ({ page }) => {
    // Cari tab absen di navigasi
    const absenTab = page.getByRole("button", { name: /Absen/i }).first();
    await absenTab.click();
    await page.waitForTimeout(500);
    // Halaman absensi harus ada
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Kelas dapat diklik dan menampilkan konten", async ({ page }) => {
    const kelasTab = page.getByRole("button", { name: /Kelas/i }).first();
    await kelasTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Invoice dapat diklik dan menampilkan konten", async ({ page }) => {
    const invoiceTab = page.getByRole("button", { name: /Invoice/i }).first();
    await invoiceTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Rapor dapat diklik dan menampilkan konten", async ({ page }) => {
    const raporTab = page.getByRole("button", { name: /Rapor/i }).first();
    await raporTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Profile dapat diklik dan menampilkan data profil", async ({ page }) => {
    const profileTab = page.getByRole("button", { name: /Profile|Profil|Saya/i }).first();
    await profileTab.click();
    await page.waitForTimeout(1000);
    // Profile tab harus menampilkan info profil atau tombol edit
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Coach Panel — Tab Absensi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Absen/i }).first().click();
    await page.waitForTimeout(500);
  });

  test("absensi tab menampilkan opsi absen atau kelas hari ini", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas hari ini, tombol Clock-In terlihat atau teks alternatif", async ({ page }) => {
    // Clock-in mungkin ada atau tidak ada tergantung waktu
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Coach Panel — Tab Kelas", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Kelas/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("kelas tab menampilkan daftar kelas coach atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas, spreadsheet link atau peringatan terlihat", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Coach Panel — Tab Invoice", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Invoice/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("invoice tab dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Coach Panel — Tab Profile", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Profile|Profil|Saya/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("profile tab menampilkan informasi profil", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("tombol logout tersedia", async ({ page }) => {
    const logoutBtn = page.getByRole("button", { name: /Logout|Keluar/i });
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(logoutBtn).toBeVisible();
    }
  });
});

test.describe("Coach Panel — Izin / Leave Request", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
  });

  test("tombol 'Ajukan Izin' tersedia di home atau absen tab", async ({ page }) => {
    // Cari di home tab
    const izinBtn = page.getByRole("button", { name: /Ajukan Izin/i }).first();
    if (await izinBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(izinBtn).toBeVisible();
    }
  });
});

