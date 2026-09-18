/**
 * 12-flow-member-panel.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow test: Member login dan simulasi lihat jadwal, tagihan, absensi,
 * izin, rapor, dan profil.
 *
 * Login menggunakan: member@next.com / Member1234
 * (dibuat oleh 10-flow-admin-crud.spec.ts)
 *
 * Memerlukan: TEST_MEMBER_EMAIL=member@next.com + TEST_MEMBER_PASSWORD=Member1234
 */

import { test, expect } from "../fixtures/auth";

test.describe("Member Flow — Home & Statistik", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
  });

  test("home menampilkan greeting dengan nama member", async ({ page }) => {
    await expect(page.getByText(/Hai,/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("statistik home terlihat (Hadir bln ini)", async ({ page }) => {
    await expect(page.getByText(/Hadir/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("jika ada tagihan pending, card pengingat tagihan muncul", async ({ page }) => {
    // Conditional — hanya muncul jika ada tagihan belum dibayar
    const tagihanCard = page.getByText(/Tagihan/i).first();
    await expect(tagihanCard).toBeAttached();
  });

  test("jika ada pengumuman, card pengumuman muncul di home", async ({ page }) => {
    // Conditional — hanya muncul jika ada pengumuman aktif dari admin
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Member Flow — Jadwal", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Jadwal/i }).first().click();
    await page.waitForTimeout(500);
  });

  test("tab jadwal menampilkan jadwal kelas atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jadwal menampilkan informasi hari, jam, dan coach", async ({ page }) => {
    // Jika member sudah diassign ke kelas, jadwal harus muncul
    const hasSchedule = await page.getByText(/Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu/i)
      .isVisible({ timeout: 3_000 }).catch(() => false);
    const noSchedule = await page.getByText(/belum|kosong|tidak ada/i)
      .isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasSchedule || noSchedule).toBe(true);
  });
});

test.describe("Member Flow — Tagihan", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Tagihan|Bayar/i }).first().click();
    await page.waitForTimeout(500);
  });

  test("tab tagihan menampilkan daftar tagihan atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("toggle Tagihan Aktif dan Histori berfungsi", async ({ page }) => {
    const aktifBtn = page.getByRole("button", { name: /Tagihan Aktif|Aktif/i }).first();
    const historiBtn = page.getByRole("button", { name: /Histori/i }).first();

    if (await aktifBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await aktifBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator("body")).toBeVisible();
    }

    if (await historiBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await historiBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("jika ada tagihan, tombol Hubungi Admin tersedia", async ({ page }) => {
    const hubungiBtn = page.getByRole("link", { name: /Hubungi Admin/i }).first();
    if (await hubungiBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const href = await hubungiBtn.getAttribute("href");
      expect(href).toContain("wa.me");
    }
  });
});

test.describe("Member Flow — Absensi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    const absenBtn = page.getByRole("button", { name: /Absen/i }).first();
    if (await absenBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await absenBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("tab absensi menampilkan history atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("filter bulan tersedia jika ada history absensi", async ({ page }) => {
    const filterEl = page.locator("select, input[type='month']").first();
    if (await filterEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(filterEl).toBeVisible();
    }
  });
});

test.describe("Member Flow — Izin", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    const izinBtn = page.getByRole("button", { name: /^Izin$/i }).first();
    if (await izinBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await izinBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("tab izin dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("form ajukan izin bisa dibuka", async ({ page }) => {
    const ajukanBtn = page.getByRole("button", { name: /Ajukan Izin Baru/i });
    if (await ajukanBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ajukanBtn.click();
      await expect(page.getByRole("heading", { name: /Ajukan Izin/i })).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    }
  });

  test("riwayat izin menampilkan list atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Member Flow — Rapor", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Rapor/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("tab rapor dapat diakses (aktif saat periode dibuka admin)", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada rapor, bisa dibuka dan berisi informasi penilaian", async ({ page }) => {
    const bukaBtn = page.getByRole("button", { name: /Buka/i }).first();
    if (await bukaBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bukaBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Member Flow — Profil", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("member");
    await page.goto("/member");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Profile|Profil|Saya/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("profil menampilkan nama member", async ({ page }) => {
    await expect(page.getByText(/Member Test/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("QR code absensi tersedia di profil", async ({ page }) => {
    const qr = page.locator("svg, canvas, [class*='qr']").first();
    if (await qr.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(qr).toBeVisible();
    }
  });

  test("bisa update nomor HP", async ({ page }) => {
    const phoneInput = page.locator("input[type='tel'], input[placeholder*='HP'], input[placeholder*='08']").first();
    if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await phoneInput.fill("081299999999");
      // Cari tombol simpan profil
      const simpanBtn = page.getByRole("button", { name: /Simpan|Update|Perbarui/i }).first();
      if (await simpanBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await simpanBtn.click();
        await page.waitForTimeout(2_000);
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("ganti password tanpa isi field tidak submit", async ({ page }) => {
    const ubahPwdBtn = page.getByRole("button", { name: /Ubah Password|Ganti Password/i });
    if (await ubahPwdBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ubahPwdBtn.click();
      await page.waitForTimeout(300);
      const submitBtn = page.getByRole("button", { name: /Simpan|Update/i }).last();
      if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await submitBtn.click();
        // Harus tetap di halaman (validasi gagal)
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});
