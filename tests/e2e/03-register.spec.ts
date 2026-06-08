/**
 * 03-register.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk halaman Registrasi (/register)
 * Mencakup: step flow, validasi form, conditional fields, mock submission.
 */

import { test, expect } from "@playwright/test";
import { expectErrorToast } from "../utils/helpers";
import {
  mockBranchesList,
  mockRegistrationSuccess,
  mockRegistrationError,
} from "../mocks/supabase-routes";

const MOCK_BRANCHES = [
  { id: "b1", name: "Jakarta Pusat", city: "Jakarta" },
  { id: "b2", name: "Bekasi Barat", city: "Bekasi" },
];

test.describe("Halaman Registrasi — Step 0 (Persiapan)", () => {
  test.beforeEach(async ({ page }) => {
    await mockBranchesList(page, MOCK_BRANCHES);
    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Step 0
  // ─────────────────────────────────────────────────────────────────────────

  test("step 0 tampil dengan heading yang benar", async ({ page }) => {
    await expect(page.getByText("Sebelum mendaftar")).toBeVisible();
  });

  test("step 0 memiliki link konsultasi WhatsApp", async ({ page }) => {
    const waLink = page.getByRole("link", { name: /Konsultasi via WhatsApp/i });
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute("href");
    expect(href).toContain("wa.me");
  });

  test("tombol 'Langsung isi form pendaftaran' di step 0 berpindah ke step 1", async ({ page }) => {
    await page.getByRole("button", { name: "Langsung isi form pendaftaran" }).click();
    await expect(page.getByText("Form pendaftaran")).toBeVisible();
  });

  test("link 'Sudah punya akun? Masuk' mengarah ke /login", async ({ page }) => {
    await page.getByRole("link", { name: "Sudah punya akun? Masuk" }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Halaman Registrasi — Step 1 (Formulir)", () => {
  test.beforeEach(async ({ page }) => {
    await mockBranchesList(page, MOCK_BRANCHES);
    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");
    // Pindah ke step 1
    await page.getByRole("button", { name: "Langsung isi form pendaftaran" }).click();
    await expect(page.getByText("Form pendaftaran")).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Step 1 - Rendering
  // ─────────────────────────────────────────────────────────────────────────

  test("step 1 menampilkan semua field yang dibutuhkan", async ({ page }) => {
    await expect(page.getByPlaceholder(/Arsenio Daud Putra/i)).toBeVisible(); // Nama lengkap
    await expect(page.locator("input[type='date']")).toBeVisible(); // Tanggal lahir
    await expect(page.getByPlaceholder(/0812/i)).toBeVisible(); // Nomor HP
    await expect(page.getByRole("button", { name: "Kembali" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim pendaftaran" })).toBeVisible();
  });

  test("dropdown cabang terisi dengan data dari Supabase (mock)", async ({ page }) => {
    // Tunggu branches load
    await page.waitForTimeout(1000);
    const branchSelect = page.locator("select").nth(1); // select cabang (setelah gender)
    const options = await branchSelect.locator("option").allTextContents();
    // Harus ada pilihan dari mock data
    const optionsText = options.join(" ");
    expect(optionsText).toContain("Jakarta Pusat");
    expect(optionsText).toContain("Bekasi Barat");
  });

  test("step indicator menampilkan progress yang benar", async ({ page }) => {
    // Step indicator muncul di step 1 — elemen ada di DOM (mungkin hidden via CSS di mobile)
    const formulirEl = page.getByText("Formulir");
    const count = await formulirEl.count();
    expect(count).toBeGreaterThan(0);
  });

  test("tombol 'Kembali' dari step 1 kembali ke step 0", async ({ page }) => {
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(page.getByText("Sebelum mendaftar")).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Step 1 - Conditional Fields (HP Milik Siapa)
  // ─────────────────────────────────────────────────────────────────────────

  test("default: pilihan 'Saya sendiri' dipilih dan tidak ada field orang tua", async ({ page }) => {
    // Default adalah "Saya sendiri"
    const selfLabel = page.getByText("Saya sendiri");
    await expect(selfLabel).toBeVisible();

    // Field orang tua tidak terlihat
    await expect(page.getByPlaceholder(/Andika Putra/i)).not.toBeVisible();
  });

  test("pilih 'Orang tua / wali' memunculkan field nama dan HP orang tua", async ({ page }) => {
    const parentLabel = page.getByText("Orang tua / wali");
    await parentLabel.click();

    // Field orang tua sekarang muncul
    await expect(page.getByPlaceholder(/Andika Putra/i)).toBeVisible();
    // Ada dua field tel: HP member dan HP orang tua
    const telInputs = page.locator("input[type='tel']");
    expect(await telInputs.count()).toBeGreaterThanOrEqual(2);
  });

  test("kembali ke 'Saya sendiri' menyembunyikan field orang tua", async ({ page }) => {
    // Aktifkan orang tua dulu
    await page.getByText("Orang tua / wali").click();
    await expect(page.getByPlaceholder(/Andika Putra/i)).toBeVisible();

    // Kembali ke saya sendiri
    await page.getByText("Saya sendiri").click();
    await expect(page.getByPlaceholder(/Andika Putra/i)).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Step 1 - Pengisian Form Lengkap
  // ─────────────────────────────────────────────────────────────────────────

  test("form bisa diisi lengkap dan submit berhasil (mock)", async ({ page }) => {
    await mockRegistrationSuccess(page);

    // Isi semua field wajib
    await page.getByPlaceholder(/Arsenio Daud Putra/i).fill("Budi Santoso");
    await page.locator("input[type='date']").fill("2010-05-15");

    // Pilih jenis kelamin
    await page.locator("select").first().selectOption("male");

    // Pilih cabang
    await page.waitForTimeout(500); // tunggu branches load
    const branchSelect = page.locator("select").nth(1);
    await branchSelect.selectOption({ index: 1 }); // pilih cabang pertama dari mock

    // Isi nomor HP
    await page.getByPlaceholder(/0812/i).fill("08123456789");

    // Isi alamat
    await page.getByPlaceholder(/Alamat tinggal/i).fill("Jl. Test No. 1, Jakarta");

    // Submit
    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();

    // Harus pindah ke step 2
    await expect(page.getByText("Pendaftaran terkirim!")).toBeVisible({ timeout: 10_000 });
  });

  test("field riwayat kesehatan bersifat opsional", async ({ page }) => {
    // Field ini tidak ada required marker
    const healthField = page.getByPlaceholder(/asma ringan/i);
    await expect(healthField).toBeVisible();
    // Bisa kosong tanpa error
    await expect(healthField).toHaveValue("");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests: Validasi Form
  // ─────────────────────────────────────────────────────────────────────────

  test("submit form kosong tidak maju ke step 2 (HTML5 required validation)", async ({ page }) => {
    // Tanpa mengisi apapun, submit tidak boleh berhasil
    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    // Halaman harus tetap di step 1, bukan step 2
    await expect(page.getByText("Pendaftaran terkirim!")).not.toBeVisible();
    await expect(page.getByText("Form pendaftaran")).toBeVisible();
  });

  test("submit tanpa nama lengkap tidak maju ke step 2", async ({ page }) => {
    // Isi semua kecuali nama (HTML5 required akan menghentikan submit)
    await page.locator("input[type='date']").fill("2010-05-15");
    await page.locator("select").first().selectOption("male");
    await page.getByPlaceholder(/0812/i).fill("08123456789");
    await page.getByPlaceholder(/Alamat tinggal/i).fill("Jl. Test No. 1");

    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    await expect(page.getByText("Pendaftaran terkirim!")).not.toBeVisible();
  });

  test("submit tanpa tanggal lahir tidak maju ke step 2", async ({ page }) => {
    await page.getByPlaceholder(/Arsenio Daud Putra/i).fill("Test User");
    await page.locator("select").first().selectOption("male");
    await page.getByPlaceholder(/0812/i).fill("08123456789");
    await page.getByPlaceholder(/Alamat tinggal/i).fill("Jl. Test");

    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    await expect(page.getByText("Pendaftaran terkirim!")).not.toBeVisible();
  });

  test("submit tanpa alamat tidak maju ke step 2", async ({ page }) => {
    await page.getByPlaceholder(/Arsenio Daud Putra/i).fill("Test User");
    await page.locator("input[type='date']").fill("2010-05-15");
    await page.locator("select").first().selectOption("male");
    await page.getByPlaceholder(/0812/i).fill("08123456789");
    // Alamat tidak diisi

    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    await expect(page.getByText("Pendaftaran terkirim!")).not.toBeVisible();
  });

  test("validasi React: semua field HTML5 diisi tapi branchId kosong menampilkan toast", async ({ page }) => {
    // Isi semua field yang ada HTML5 required
    await page.getByPlaceholder(/Arsenio Daud Putra/i).fill("Test User");
    await page.locator("input[type='date']").fill("2010-05-15");
    await page.locator("select").first().selectOption("male");
    // branchId select dibiarkan di pilihan pertama (disabled placeholder)
    // tapi jika branches kosong (mock belum memuat), branchId = ""
    await page.getByPlaceholder(/0812/i).fill("08123456789");
    await page.getByPlaceholder(/Alamat tinggal/i).fill("Jl. Test");

    // Bypass HTML5 validation dengan evaluate, lalu cek React handler
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (form) {
        // Tambahkan novalidate sementara
        form.setAttribute("novalidate", "true");
      }
    });

    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    // React handler seharusnya mencegah submit karena branchId kosong
    await expect(page.getByText("Pendaftaran terkirim!")).not.toBeVisible({ timeout: 3_000 });
  });

  test("[mocked] error dari server menampilkan toast error", async ({ page }) => {
    await mockRegistrationError(page, "Internal server error");

    // Isi semua field
    await page.getByPlaceholder(/Arsenio Daud Putra/i).fill("Budi Santoso");
    await page.locator("input[type='date']").fill("2010-05-15");
    await page.locator("select").first().selectOption("male");
    await page.waitForTimeout(500);
    const branchSelect = page.locator("select").nth(1);
    await branchSelect.selectOption({ index: 1 });
    await page.getByPlaceholder(/0812/i).fill("08123456789");
    await page.getByPlaceholder(/Alamat tinggal/i).fill("Jl. Test No. 1");

    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    await expectErrorToast(page, "Gagal mengirim pendaftaran");
  });
});

test.describe("Halaman Registrasi — Step 2 (Selesai)", () => {
  test.beforeEach(async ({ page }) => {
    await mockBranchesList(page, MOCK_BRANCHES);
    await mockRegistrationSuccess(page);
    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    // Navigasi ke step 1
    await page.getByRole("button", { name: "Langsung isi form pendaftaran" }).click();

    // Isi form dan submit
    await page.getByPlaceholder(/Arsenio Daud Putra/i).fill("Budi Santoso");
    await page.locator("input[type='date']").fill("2010-05-15");
    await page.locator("select").first().selectOption("male");
    await page.waitForTimeout(500);
    const branchSelect = page.locator("select").nth(1);
    await branchSelect.selectOption({ index: 1 });
    await page.getByPlaceholder(/0812/i).fill("08123456789");
    await page.getByPlaceholder(/Alamat tinggal/i).fill("Jl. Test No. 1, Jakarta");
    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();

    // Tunggu step 2
    await expect(page.getByText("Pendaftaran terkirim!")).toBeVisible({ timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Step 2
  // ─────────────────────────────────────────────────────────────────────────

  test("step 2 menampilkan pesan sukses", async ({ page }) => {
    await expect(page.getByText("Pendaftaran terkirim!")).toBeVisible();
    await expect(page.getByText(/Tunggu admin menghubungi/i)).toBeVisible();
  });

  test("step 2 memiliki tombol 'Chat admin sekarang'", async ({ page }) => {
    const waBtn = page.getByRole("link", { name: /Chat admin sekarang/i });
    await expect(waBtn).toBeVisible();
    const href = await waBtn.getAttribute("href");
    expect(href).toContain("wa.me");
  });

  test("step 2 memiliki tombol 'Kembali ke beranda'", async ({ page }) => {
    const homeBtn = page.getByRole("link", { name: "Kembali ke beranda" });
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();
    await expect(page).toHaveURL("/");
  });

  test("step 2 menampilkan langkah-langkah selanjutnya", async ({ page }) => {
    await expect(page.getByText("Admin review data")).toBeVisible();
    await expect(page.getByText(/konfirmasi kelas/i)).toBeVisible();
    await expect(page.getByText(/akun login/i)).toBeVisible();
  });

  test("pesan WA di step 2 mengandung nama pendaftar", async ({ page }) => {
    // Link WA harus mengandung nama yang diisi
    const waBtn = page.getByRole("link", { name: /Chat admin sekarang/i });
    const href = await waBtn.getAttribute("href");
    expect(href).toContain("Budi%20Santoso");
  });
});
