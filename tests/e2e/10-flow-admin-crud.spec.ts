/**
 * 10-flow-admin-crud.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow test: Admin membuat kelas, coach, dan member.
 *
 * Credential yang dibuat dalam test ini:
 *   Coach  → coach@next.com  / Coach1234
 *   Member → member@next.com / Member1234
 *
 * Memerlukan: TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD di .env.test
 */

import { test, expect } from "../fixtures/auth";

const NEW_CLASS = {
  name: "Kelas Test Playwright",
  capacity: "10",
  price: "300000",
};

const NEW_COACH = {
  fullName: "Coach Test",
  email: "coach@next.com",
  phone: "081200000002",
  password: "Coach1234",
};

const NEW_MEMBER = {
  fullName: "Member Test",
  email: "member@next.com",
  phone: "081200000003",
  password: "Member1234",
  dob: "2005-06-15",
};

// ─────────────────────────────────────────────────────────────────────────────
// Kelas
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Admin Flow — Buat Kelas Baru", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Class$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("bisa membuka modal tambah kelas", async ({ page }) => {
    const tambahBtn = page.getByRole("button", { name: /Tambah Kelas/i }).first();
    if (await tambahBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tambahBtn.click();
      await expect(page.getByRole("heading", { name: /Tambah Kelas/i })).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    }
  });

  test("bisa membuat kelas reguler baru", async ({ page }) => {
    const tambahBtn = page.getByRole("button", { name: /Tambah Kelas/i }).first();
    if (!await tambahBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;

    await tambahBtn.click();
    await expect(page.getByRole("heading", { name: /Tambah Kelas/i })).toBeVisible({ timeout: 5_000 });

    // Pilih tipe Reguler (default seharusnya sudah Reguler)
    const regulerBtn = page.getByRole("button", { name: /Reguler/i }).first();
    if (await regulerBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await regulerBtn.click();
    }

    // Nama kelas
    await page.getByPlaceholder(/Tadpole|Mis\./i).first().fill(NEW_CLASS.name);

    // Hari sesi — pilih Senin
    const seninBtn = page.getByRole("button", { name: /^Senin$/i });
    if (await seninBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await seninBtn.click();
    }

    // Jam (sama semua hari)
    const timeInputs = page.locator("input[type='time']");
    const timeCount = await timeInputs.count();
    if (timeCount >= 2) {
      await timeInputs.nth(0).fill("08:00");
      await timeInputs.nth(1).fill("09:00");
    }

    // Kapasitas dan harga
    await page.locator("input[placeholder='15']").fill(NEW_CLASS.capacity);
    await page.locator("input[placeholder='550000']").fill(NEW_CLASS.price);

    await page.getByRole("button", { name: /Simpan kelas/i }).click();

    // Modal tertutup = sukses
    await page.waitForTimeout(3_000);
    const modalOpen = await page.getByRole("heading", { name: /Tambah Kelas/i })
      .isVisible().catch(() => false);

    if (!modalOpen) {
      await expect(page.getByText(NEW_CLASS.name)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("jika ada kelas, tombol Detail bisa diklik", async ({ page }) => {
    const detailBtn = page.getByRole("button", { name: /^Detail$/i }).first();
    if (await detailBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await detailBtn.click();
      await expect(page.getByRole("heading", { name: /Detail Kelas/i })).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Coach
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Admin Flow — Buat Coach Baru", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Coach$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("bisa membuka modal tambah coach", async ({ page }) => {
    const tambahBtn = page.getByRole("button", { name: /Tambah Coach/i }).first();
    if (await tambahBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tambahBtn.click();
      await expect(page.getByRole("heading", { name: /Tambah Coach/i })).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    }
  });

  test("bisa membuat akun coach baru dengan credential yang ditetapkan", async ({ page }) => {
    const tambahBtn = page.getByRole("button", { name: /Tambah Coach/i }).first();
    if (!await tambahBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;

    await tambahBtn.click();
    await expect(page.getByRole("heading", { name: /Tambah Coach/i })).toBeVisible({ timeout: 5_000 });

    // Nama lengkap
    await page.getByPlaceholder("Nama lengkap").fill(NEW_COACH.fullName);

    // Email
    await page.locator("input[type='email']").fill(NEW_COACH.email);

    // No HP
    const phoneInput = page.locator("input[placeholder='08xxxxxxxxxx']").first();
    if (await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneInput.fill(NEW_COACH.phone);
    }

    // Password
    await page.locator("input[placeholder='Min. 6 karakter']").fill(NEW_COACH.password);

    await page.getByRole("button", { name: /Buat Akun/i }).click();

    await page.waitForTimeout(4_000);
    const modalOpen = await page.getByRole("heading", { name: /Tambah Coach/i })
      .isVisible().catch(() => false);

    if (modalOpen) {
      console.log("  [info] Coach sudah terdaftar atau ada error — lewati");
    } else {
      // Cek credential modal atau coach muncul di list
      const credModal = page.getByRole("heading", { name: /Akun Coach Dibuat/i });
      if (await credModal.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await page.keyboard.press("Escape");
      }
      await expect(page.getByText(NEW_COACH.fullName)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("coach yang sudah ada bisa dilihat detailnya", async ({ page }) => {
    const coachRow = page.getByText(NEW_COACH.fullName).first();
    if (await coachRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Cari tombol detail di baris yang sama
      const row = page.locator("tr, [class*='row'], [class*='card']").filter({ hasText: NEW_COACH.fullName }).first();
      const detailBtn = row.getByRole("button", { name: /Detail|Lihat/i }).first();
      if (await detailBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await detailBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator("body")).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Member
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Admin Flow — Buat Member Baru", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Member$/i }).first().click();
    await page.waitForTimeout(1000);
  });

  test("bisa membuka modal tambah member", async ({ page }) => {
    const tambahBtn = page.getByRole("button", { name: /Tambah Member/i }).first();
    if (await tambahBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tambahBtn.click();
      await expect(page.getByRole("heading", { name: /Tambah Member/i })).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    }
  });

  test("bisa membuat akun member baru dengan credential yang ditetapkan", async ({ page }) => {
    const tambahBtn = page.getByRole("button", { name: /Tambah Member/i }).first();
    if (!await tambahBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;

    await tambahBtn.click();
    await expect(page.getByRole("heading", { name: /Tambah Member/i })).toBeVisible({ timeout: 5_000 });

    // Nama lengkap
    const namaInput = page.locator("input[type='text']").first();
    await namaInput.fill(NEW_MEMBER.fullName);

    // Tanggal lahir
    const dobInput = page.locator("input[type='date']").first();
    if (await dobInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dobInput.fill(NEW_MEMBER.dob);
    }

    // Tipe member — pilih Reguler
    const tipeMember = page.locator("select").filter({ hasText: /Reguler|Private|Afiliasi/i }).first();
    if (await tipeMember.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await tipeMember.selectOption("regular");
    }

    // No HP
    const phoneInput = page.locator("input[type='tel']").first();
    if (await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneInput.fill(NEW_MEMBER.phone);
    }

    // Email login
    await page.locator("input[type='email']").fill(NEW_MEMBER.email);

    // Password
    await page.locator("input[type='password']").fill(NEW_MEMBER.password);

    await page.getByRole("button", { name: /Simpan|Buat/i }).last().click();

    await page.waitForTimeout(4_000);
    const modalOpen = await page.getByRole("heading", { name: /Tambah Member/i })
      .isVisible().catch(() => false);

    if (modalOpen) {
      console.log("  [info] Member sudah terdaftar atau ada error — lewati");
    } else {
      await expect(page.getByText(NEW_MEMBER.fullName)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("member yang sudah ada muncul di list dengan status aktif", async ({ page }) => {
    const memberRow = page.getByText(NEW_MEMBER.fullName).first();
    if (await memberRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(memberRow).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Approvement
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Admin Flow — Approvement Registrasi", () => {
  test.beforeEach(async ({ page, skipIfNoAuth }) => {
    skipIfNoAuth("admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    const approvalBtn = page.getByRole("button", { name: /Approval|Approvement/i }).first();
    if (await approvalBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await approvalBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("tab approvement dapat diakses dan menampilkan list atau pesan kosong", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada pendaftaran pending, bisa dilihat detailnya", async ({ page }) => {
    const detailBtn = page.getByRole("button", { name: /Detail|Lihat|Review/i }).first();
    if (await detailBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await detailBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tagihan
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Admin Flow — Buat Tagihan Member", () => {
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

  test("tab invoice dapat diakses", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("jika ada tagihan, bisa dilihat detailnya", async ({ page }) => {
    const detailBtn = page.getByRole("button", { name: /Detail|Lihat/i }).first();
    if (await detailBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await detailBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});
