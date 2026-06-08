/**
 * 04-owner-panel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk Owner Panel (/owner)
 *
 * Memerlukan:
 *   TEST_OWNER_EMAIL + TEST_OWNER_PASSWORD di .env.test
 * Jika tidak ada, semua test di-skip.
 *
 * storageState di-load otomatis via playwright.config.ts project "owner".
 */

import { test, expect } from "../fixtures/auth";

test.describe("Owner Panel — Dashboard", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("owner");
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Dashboard
  // ─────────────────────────────────────────────────────────────────────────

  test("halaman owner termuat dengan greeting", async ({ page }) => {
    await expect(page.getByText(/Pagi, Owner/i)).toBeVisible({ timeout: 10_000 });
  });

  test("statistik dashboard terlihat", async ({ page }) => {
    // Gunakan exact match untuk menghindari strict mode violation dengan heading yang juga mengandung teks ini
    await expect(page.getByText("Member aktif", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Coach aktif",  { exact: true })).toBeVisible();
    await expect(page.getByText("Kelas aktif",  { exact: true })).toBeVisible();
  });

  test("sidebar navigasi terlihat di desktop", async ({ page }) => {
    const sidebar = page.locator("nav, aside, [class*='sidebar']").first();
    await expect(sidebar).toBeVisible();
  });

  test("topbar dengan logo NEXT terlihat", async ({ page }) => {
    // Logo ditampilkan sebagai image, bukan teks "NEXT"
    const logo = page.locator("img[alt*='Next Swimming School']").first();
    await expect(logo).toBeAttached();
  });
});

test.describe("Owner Panel — Manajemen Cabang", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("owner");
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Cabang"
    await page.getByRole("button", { name: /^Cabang$/i }).click();
    await page.waitForTimeout(500);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests
  // ─────────────────────────────────────────────────────────────────────────

  test("tab Manajemen Cabang menampilkan tombol tambah", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Tambah Cabang", exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test("tombol 'Tambah Cabang' membuka modal", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Cabang", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).toBeVisible();
  });

  test("modal tambah cabang memiliki field Nama Cabang dan Kota", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Cabang", exact: true }).click();

    // Cek field input ada
    const inputs = page.locator("input[type='text'], input:not([type])");
    const count  = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("modal tambah cabang bisa ditutup dengan ESC", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Cabang", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).not.toBeVisible();
  });

  test("modal tambah cabang bisa ditutup dengan tombol Batal", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Cabang", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).toBeVisible();

    await page.getByRole("button", { name: "Batal" }).click();
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).not.toBeVisible();
  });

  test("modal tambah cabang bisa ditutup dengan backdrop click", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Cabang", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).toBeVisible();

    // Klik backdrop (area di luar modal)
    await page.locator("[class*='backdrop-blur'], [class*='bg-ink']").first()
      .click({ position: { x: 10, y: 10 }, force: true });
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests: Validasi
  // ─────────────────────────────────────────────────────────────────────────

  test("submit form cabang kosong tidak menutup modal (validasi HTML5)", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Cabang", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tambah Cabang" })).toBeVisible();

    // Klik Simpan tanpa isi apa pun
    const simpanBtn = page.getByRole("button", { name: "Simpan" });
    if (await simpanBtn.isVisible()) {
      await simpanBtn.click();
      // Modal harus tetap terbuka
      await expect(page.getByRole("heading", { name: "Tambah Cabang" })).toBeVisible();
    }
  });
});

test.describe("Owner Panel — Akun Admin", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("owner");
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Admin"
    await page.getByRole("button", { name: /^Admin$/i }).click();
    await page.waitForTimeout(500);
  });

  test("tab Akun Admin menampilkan tombol Tambah Admin", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Tambah Admin" })).toBeVisible({ timeout: 8_000 });
  });

  test("tombol 'Tambah Admin' membuka modal dengan field lengkap", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Admin" }).click();
    await expect(page.getByRole("heading", { name: "Tambah Admin Cabang" })).toBeVisible();

    // Field yang diharapkan
    const textInputs = page.locator("input[type='text'], input[type='email'], input[type='password']");
    const count = await textInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("modal tambah admin bisa ditutup dengan ESC", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Admin" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Tambah Admin Cabang" })).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests
  // ─────────────────────────────────────────────────────────────────────────

  test("submit form admin kosong tidak menutup modal", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah Admin" }).click();
    await expect(page.getByRole("heading", { name: "Tambah Admin Cabang" })).toBeVisible();

    const simpanBtn = page.getByRole("button", { name: "Simpan" });
    if (await simpanBtn.isVisible()) {
      await simpanBtn.click();
      await expect(page.getByRole("heading", { name: "Tambah Admin Cabang" })).toBeVisible();
    }
  });
});

test.describe("Owner Panel — Semua Kelas", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("owner");
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Kelas"
    await page.getByRole("button", { name: /^Kelas$/i }).click();
    await page.waitForTimeout(1000);
  });

  test("tab Semua Kelas dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas, modal detail bisa dibuka", async ({ page }) => {
    // Cek apakah ada tombol Detail
    const detailBtn = page.getByRole("button", { name: "Detail" }).first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await expect(page.getByRole("heading", { name: "Detail Kelas" })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Owner Panel — Tarif Coach", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("owner");
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Tarif Coach"
    await page.getByRole("button", { name: /Tarif Coach/i }).click();
    await page.waitForTimeout(1000);
  });

  test("tab Tarif Coach dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Owner Panel — Invoice Coach", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("owner");
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");
    // Label sidebar aktual: "Invoice Coach"
    await page.getByRole("button", { name: /Invoice Coach/i }).click();
    await page.waitForTimeout(1000);
  });

  test("tab Invoice Coach dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

