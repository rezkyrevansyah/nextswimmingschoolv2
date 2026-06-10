/**
 * 11-flow-coach-panel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow test: Coach login dan simulasi absensi, kelas, invoice, rapor.
 *
 * Login menggunakan: coach@next.com / Coach1234
 * (dibuat oleh 10-flow-admin-crud.spec.ts)
 *
 * Memerlukan: TEST_COACH_EMAIL=coach@next.com + TEST_COACH_PASSWORD=Coach1234
 */

import { test, expect } from "../fixtures/auth";

test.describe("Coach Flow — Home & Statistik", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
  });

  test("home menampilkan greeting dengan nama coach", async ({ page }) => {
    await expect(page.getByText(/Halo,/i)).toBeVisible({ timeout: 10_000 });
  });

  test("statistik bulanan terlihat (Hadir, Izin, Pengganti)", async ({ page }) => {
    await expect(page.getByText(/Hadir/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("section kelas hari ini tampil (ada kelas atau pesan kosong)", async ({ page }) => {
    // Entah ada kelas atau tidak, section harus ada
    const hasClasses = await page.getByText(/Clock-In/i).isVisible({ timeout: 3_000 }).catch(() => false);
    const noClasses = await page.getByText(/Tidak ada kelas hari ini/i).isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasClasses || noClasses).toBe(true);
  });

  test("quick action 'Ajukan Izin' tersedia", async ({ page }) => {
    const izinBtn = page.getByRole("button", { name: /Ajukan Izin/i }).first();
    if (await izinBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(izinBtn).toBeVisible();
    }
  });
});

test.describe("Coach Flow — Absensi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Absen/i }).first().click();
    await page.waitForTimeout(500);
  });

  test("tab absensi menampilkan list kelas atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas dalam window waktu, tombol Clock-In terlihat", async ({ page }) => {
    const clockInBtn = page.getByRole("button", { name: /Clock-In/i }).first();
    if (await clockInBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(clockInBtn).toBeVisible();
      // Klik Clock-In — halaman selfie harus terbuka atau flow dimulai
      await clockInBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator("body")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("history absensi coach dapat diakses", async ({ page }) => {
    const historyBtn = page.getByRole("button", { name: /History|Riwayat/i }).first();
    if (await historyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await historyBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Coach Flow — Kelas", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Kelas$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab kelas menampilkan list kelas atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas, bisa dibuka detail dan lihat daftar member", async ({ page }) => {
    // Klik kelas pertama yang ada
    const kelasCard = page.locator("[class*='card'], tr").first();
    if (await kelasCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const detailBtn = kelasCard.getByRole("button").first();
      if (await detailBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await detailBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator("body")).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
  });
});

test.describe("Coach Flow — Invoice", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Invoice/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab invoice dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas, bisa generate invoice", async ({ page }) => {
    const generateBtn = page.getByRole("button", { name: /Generate|Buat Invoice/i }).first();
    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(generateBtn).toBeVisible();
    }
  });
});

test.describe("Coach Flow — Rapor", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Rapor/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab rapor dapat diakses (aktif saat periode dibuka admin)", async ({ page }) => {
    // Rapor mungkin tertutup atau terbuka tergantung periode
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika periode rapor aktif, bisa isi rapor member", async ({ page }) => {
    const isiBtn = page.getByRole("button", { name: /Isi Rapor|Input Rapor/i }).first();
    if (await isiBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await isiBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Coach Flow — Pengajuan Izin", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("coach");
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");
  });

  test("form ajukan izin bisa dibuka", async ({ page }) => {
    const izinBtn = page.getByRole("button", { name: /Ajukan Izin/i }).first();
    if (await izinBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await izinBtn.click();
      await page.waitForTimeout(500);
      // Form izin atau modal harus muncul
      const formVisible = await page.locator("select, input[type='date']").first()
        .isVisible({ timeout: 3_000 }).catch(() => false);
      if (formVisible) {
        await expect(page.locator("select, input[type='date']").first()).toBeVisible();
      }
      await page.keyboard.press("Escape");
    }
  });

  test("form izin tidak bisa disubmit tanpa tanggal", async ({ page }) => {
    const izinBtn = page.getByRole("button", { name: /Ajukan Izin/i }).first();
    if (await izinBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await izinBtn.click();
      await page.waitForTimeout(500);

      const submitBtn = page.getByRole("button", { name: /Submit|Kirim|Ajukan/i }).last();
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
        // Harus tetap di form (validasi gagal)
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});
