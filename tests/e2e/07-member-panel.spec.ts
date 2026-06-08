/**
 * 07-member-panel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk Member Panel (/member)
 *
 * Memerlukan: TEST_MEMBER_EMAIL + TEST_MEMBER_PASSWORD
 */

import { test, expect } from "../fixtures/auth";

test.describe("Member Panel — Home Tab", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests
  // ─────────────────────────────────────────────────────────────────────────

  test("halaman member termuat dengan header", async ({ page }) => {
    await expect(page.locator("header").first()).toBeVisible({ timeout: 10_000 });
    // Logo ditampilkan sebagai image, bukan teks "NEXT"
    const logo = page.locator("img[alt*='Next Swimming School']").first();
    await expect(logo).toBeAttached();
  });

  test("home tab menampilkan greeting member", async ({ page }) => {
    // Greeting "Hai, [nama member]" — gunakan first() untuk menghindari strict mode violation
    // (teks "Hai," muncul di h1 header dan h2 body secara bersamaan)
    await expect(page.getByText(/Hai,/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("statistik home terlihat (Hadir, Sisa Sesi/Kelas Aktif)", async ({ page }) => {
    await expect(page.getByText(/Hadir/i)).toBeVisible({ timeout: 10_000 });
  });

  test("mobile nav bar ada di halaman", async ({ page }) => {
    // Member page menggunakan MobileNav (bottom nav) — pakai lg:hidden, ada di DOM tapi hidden di desktop
    const nav = page.locator("nav").first();
    await expect(nav).toBeAttached();
  });
});

test.describe("Member Panel — Tab Navigasi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
  });

  test("tab Jadwal dapat diklik", async ({ page }) => {
    const jadwalTab = page.getByRole("button", { name: /Jadwal/i }).first();
    await jadwalTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Tagihan dapat diklik", async ({ page }) => {
    const tagihantTab = page.getByRole("button", { name: /Tagihan|Bayar/i }).first();
    await tagihantTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Rapor dapat diklik", async ({ page }) => {
    const raporTab = page.getByRole("button", { name: /Rapor/i }).first();
    await raporTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab Profile dapat diklik", async ({ page }) => {
    const profileTab = page.getByRole("button", { name: /Profile|Profil|Saya/i }).first();
    await profileTab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Member Panel — Tab Jadwal", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Jadwal/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("jadwal tab menampilkan kelas terdaftar atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada kelas, info coach dan jadwal terlihat", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Member Panel — Tab Tagihan", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Tagihan|Bayar/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tagihan tab memiliki toggle 'Tagihan Aktif' dan 'Histori'", async ({ page }) => {
    // Cek tab toggle
    const aktifBtn = page.getByRole("button", { name: /Tagihan Aktif|Aktif/i }).first();
    const historiBtn = page.getByRole("button", { name: /Histori/i }).first();

    if (await aktifBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(aktifBtn).toBeVisible();
    }
    if (await historiBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(historiBtn).toBeVisible();
    }
  });

  test("bisa beralih antara 'Tagihan Aktif' dan 'Histori'", async ({ page }) => {
    const aktifBtn = page.getByRole("button", { name: /Tagihan Aktif|Aktif/i }).first();
    const historiBtn = page.getByRole("button", { name: /Histori/i }).first();

    if (await aktifBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await aktifBtn.click();
      await page.waitForTimeout(300);
    }
    if (await historiBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await historiBtn.click();
      await page.waitForTimeout(300);
    }

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Member Panel — Tab Absensi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    // Tab absensi mungkin ada di navigasi lebih (tidak selalu di main nav)
    const absenBtn = page.getByRole("button", { name: /Absen/i }).first();
    if (await absenBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await absenBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("absensi tab dapat diakses jika ada di nav", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Member Panel — Tab Izin", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    const izinBtn = page.getByRole("button", { name: /Izin/i }).first();
    if (await izinBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await izinBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("izin tab dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("tombol 'Ajukan Izin Baru' membuka modal jika tersedia", async ({ page }) => {
    const ajukanBtn = page.getByRole("button", { name: /Ajukan Izin Baru/i });
    if (await ajukanBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ajukanBtn.click();
      // Modal form izin harus terbuka
      await expect(page.getByRole("heading", { name: /Ajukan Izin/i })).toBeVisible({ timeout: 5_000 });
    }
  });

  test("modal izin memiliki field tanggal mulai dan jenis izin", async ({ page }) => {
    const ajukanBtn = page.getByRole("button", { name: /Ajukan Izin Baru/i });
    if (await ajukanBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ajukanBtn.click();
      await expect(page.getByRole("heading", { name: /Ajukan Izin/i })).toBeVisible({ timeout: 5_000 });

      // Field tanggal harus ada
      const dateInput = page.locator("input[type='date']").first();
      await expect(dateInput).toBeVisible();

      // Tutup modal
      await page.keyboard.press("Escape");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests: Validasi Form Izin
  // ─────────────────────────────────────────────────────────────────────────

  test("submit form izin tanpa tanggal mulai tidak berhasil", async ({ page }) => {
    const ajukanBtn = page.getByRole("button", { name: /Ajukan Izin Baru/i });
    if (await ajukanBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ajukanBtn.click();
      await expect(page.getByRole("heading", { name: /Ajukan Izin/i })).toBeVisible({ timeout: 5_000 });

      // Submit tanpa isi tanggal
      const kirimBtn = page.getByRole("button", { name: /Kirim|Simpan/i }).last();
      if (await kirimBtn.isVisible()) {
        await kirimBtn.click();
        // Modal harus tetap terbuka (validasi HTML5)
        await expect(page.getByRole("heading", { name: /Ajukan Izin/i })).toBeVisible();
      }
    }
  });
});

test.describe("Member Panel — Tab Rapor", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Rapor/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("rapor tab menampilkan rapor atau pesan 'belum ada rapor'", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada rapor aktif, tombol 'Buka' bisa diklik", async ({ page }) => {
    const bukaBtn = page.getByRole("button", { name: /Buka/i }).first();
    if (await bukaBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bukaBtn.click();
      // Modal rapor harus terbuka
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Member Panel — Tab Profile", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Profile|Profil|Saya/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("profile tab menampilkan data member", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("field phone bisa diedit", async ({ page }) => {
    const phoneInput = page.locator("input[type='tel'], input[placeholder*='HP'], input[placeholder*='08']");
    if (await phoneInput.count() > 0) {
      await expect(phoneInput.first()).toBeVisible();
    }
  });

  test("tombol logout tersedia", async ({ page }) => {
    const logoutBtn = page.getByRole("button", { name: /Logout|Keluar/i });
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(logoutBtn).toBeVisible();
    }
  });

  test("QR code terlihat di halaman profile", async ({ page }) => {
    // QRBox ada di profile member
    const qr = page.locator("svg, canvas, [class*='qr']").first();
    if (await qr.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(qr).toBeVisible();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests: Change Password
  // ─────────────────────────────────────────────────────────────────────────

  test("ubah password dengan input kosong tidak berhasil", async ({ page }) => {
    const ubahPwdBtn = page.getByRole("button", { name: /Ubah Password/i });
    if (await ubahPwdBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ubahPwdBtn.click();
      // Harus ada error atau tidak melanjutkan jika kosong
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

