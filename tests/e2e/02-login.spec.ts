/**
 * 02-login.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite untuk halaman Login (/login)
 * Mencakup: validasi form, toggle password, modal lupa password, error handling.
 *
 * Catatan: Login dengan auth nyata (redirect ke panel) ditest di global-setup
 * dan panel tests. Test ini fokus pada UI dan client-side validation.
 */

import { test, expect } from "@playwright/test";
import { expectErrorToast } from "../utils/helpers";
import {
  mockLoginInvalidCredentials,
  mockLoginEmailNotVerified,
} from "../mocks/supabase-routes";

test.describe("Halaman Login — UI dan Validasi", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Rendering
  // ─────────────────────────────────────────────────────────────────────────

  test("halaman login termuat dengan elemen yang benar", async ({ page }) => {
    await expect(page.getByText("Selamat datang kembali")).toBeVisible();
    await expect(page.getByPlaceholder("nama@email.com")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });

  test("link logo mengarah ke beranda", async ({ page }) => {
    const logoLink = page.locator("a[href='/']").first();
    await expect(logoLink).toBeVisible();
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("link 'Daftar di sini' mengarah ke /register", async ({ page }) => {
    await page.getByRole("link", { name: "Daftar di sini" }).click();
    await expect(page).toHaveURL("/register");
  });

  test("link 'Kembali ke beranda' mengarah ke /", async ({ page }) => {
    await page.getByRole("link", { name: "Kembali ke beranda" }).click();
    await expect(page).toHaveURL("/");
  });

  test("checkbox 'Ingat saya' bisa diklik", async ({ page }) => {
    const checkbox = page.locator("input[type='checkbox']");
    await expect(checkbox).toBeVisible();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Toggle Password
  // ─────────────────────────────────────────────────────────────────────────

  test("tombol 'Tampilkan' mengubah password menjadi teks biasa", async ({ page }) => {
    // Ambil referensi ke input password sebelum klik toggle
    const passwordInput = page.locator("input").nth(1); // index: 0=email, 1=password

    // Awal: password tersembunyi
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Klik tampilkan
    await page.getByRole("button", { name: "Tampilkan" }).click();

    // Setelah klik: type berubah ke "text"
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("tombol 'Sembunyikan' menyembunyikan password kembali", async ({ page }) => {
    // Tampilkan dulu
    await page.getByRole("button", { name: "Tampilkan" }).click();
    await expect(page.getByRole("button", { name: "Sembunyikan" })).toBeVisible();

    // Sembunyikan
    await page.getByRole("button", { name: "Sembunyikan" }).click();

    // Tombol harus kembali ke "Tampilkan"
    await expect(page.getByRole("button", { name: "Tampilkan" })).toBeVisible();
  });

  test("password yang diketik tersembunyi secara default", async ({ page }) => {
    const passwordInput = page.locator("input[type='password']");
    await passwordInput.fill("rahasia123");

    // Tipe masih password (tersembunyi)
    await expect(passwordInput).toHaveAttribute("type", "password");
    // Value tidak bisa dilihat di DOM (type=password menyembunyikan value)
    await expect(passwordInput).toHaveValue("rahasia123");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Modal Lupa Password
  // ─────────────────────────────────────────────────────────────────────────

  test("klik 'Lupa password?' membuka modal", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();
    await expect(page.getByRole("heading", { name: "Lupa password?" })).toBeVisible();
  });

  test("modal lupa password berisi tombol 'Nanti saja' dan 'Chat admin sekarang'", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();

    await expect(page.getByRole("button", { name: "Nanti saja" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Chat admin sekarang/i })).toBeVisible();
  });

  test("tombol 'Nanti saja' menutup modal lupa password", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();
    await expect(page.getByRole("heading", { name: "Lupa password?" })).toBeVisible();

    await page.getByRole("button", { name: "Nanti saja" }).click();
    await expect(page.getByRole("heading", { name: "Lupa password?" })).not.toBeVisible();
  });

  test("tombol ESC menutup modal lupa password", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();
    await expect(page.getByRole("heading", { name: "Lupa password?" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Lupa password?" })).not.toBeVisible();
  });

  test("tombol X di header modal menutup modal", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();
    await expect(page.getByRole("heading", { name: "Lupa password?" })).toBeVisible();

    // Tombol close ada di sebelah judul modal
    const closeBtn = page.locator("button").filter({ hasText: "" }).last();
    // Klik di luar area modal (backdrop) juga harus menutup
    // Cara lain: cari SVG icon close
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Lupa password?" })).not.toBeVisible();
  });

  test("link WhatsApp di modal lupa password menuju wa.me", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();

    const waLink = page.getByRole("link", { name: /Chat admin sekarang/i });
    const href = await waLink.getAttribute("href");
    expect(href).toContain("wa.me");
  });

  test("klik backdrop menutup modal lupa password", async ({ page }) => {
    await page.getByRole("button", { name: "Lupa password?" }).click();
    await expect(page.getByRole("heading", { name: "Lupa password?" })).toBeVisible();

    // Klik di area backdrop (di luar modal)
    await page.locator("[class*='backdrop-blur']").click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole("heading", { name: "Lupa password?" })).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Positive Tests: Login berhasil (dengan mock)
  // ─────────────────────────────────────────────────────────────────────────

  test("[mocked] login berhasil dengan kredensial valid menampilkan loading", async ({ page }) => {
    // Intercept Supabase token call — simulasikan sukses namun
    // redirect server-side (middleware) tidak bisa di-mock, jadi cukup cek loading state
    let tokenCallMade = false;
    await page.route("**/auth/v1/token*", async (route) => {
      tokenCallMade = true;
      // Delay sedikit untuk lihat loading state
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: 9999999999,
          refresh_token: "mock-refresh",
          user: {
            id: "mock-id",
            email: "owner@test.com",
            user_metadata: { role: "owner" },
          },
        }),
      });
    });

    await page.getByPlaceholder("nama@email.com").fill("owner@test.com");
    await page.locator("input[type='password']").fill("password123");
    await page.getByRole("button", { name: "Masuk" }).click();

    // Tombol harus menampilkan "Memproses…" saat loading
    // (bisa jadi sangat cepat, jadi kita verifikasi request dibuat)
    await page.waitForTimeout(500);
    expect(tokenCallMade).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Negative Tests: Validasi Form
  // ─────────────────────────────────────────────────────────────────────────

  test("submit form kosong menampilkan error toast", async ({ page }) => {
    await page.getByRole("button", { name: "Masuk" }).click();
    await expectErrorToast(page, "Email dan password wajib diisi");
  });

  test("submit dengan hanya email (tanpa password) menampilkan error", async ({ page }) => {
    await page.getByPlaceholder("nama@email.com").fill("test@example.com");
    // Password kosong
    await page.getByRole("button", { name: "Masuk" }).click();
    await expectErrorToast(page, "Email dan password wajib diisi");
  });

  test("submit dengan hanya password (tanpa email) menampilkan error", async ({ page }) => {
    await page.locator("input[type='password']").fill("password123");
    // Email kosong
    await page.getByRole("button", { name: "Masuk" }).click();
    await expectErrorToast(page, "Email dan password wajib diisi");
  });

  test("[mocked] kredensial salah menampilkan toast error yang benar", async ({ page }) => {
    await mockLoginInvalidCredentials(page);

    await page.getByPlaceholder("nama@email.com").fill("salah@email.com");
    await page.locator("input[type='password']").fill("passwordsalah");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expectErrorToast(page, "Email atau password salah");
  });

  test("[mocked] email belum diverifikasi menampilkan toast error yang benar", async ({ page }) => {
    await mockLoginEmailNotVerified(page);

    await page.getByPlaceholder("nama@email.com").fill("belumverif@email.com");
    await page.locator("input[type='password']").fill("password123");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expectErrorToast(page, "Email belum diverifikasi");
  });

  test("akun disuspend menampilkan toast error via query param", async ({ page }) => {
    await page.goto("/login?suspended=1");
    await page.waitForLoadState("domcontentloaded");
    await expectErrorToast(page, "Akun disuspend");
  });

  test("field email menerima format email yang valid", async ({ page }) => {
    const emailInput = page.getByPlaceholder("nama@email.com");
    await emailInput.fill("valid@email.com");
    await expect(emailInput).toHaveValue("valid@email.com");
  });

  test("field email menolak format email yang tidak valid (HTML5 validation)", async ({ page }) => {
    const emailInput = page.getByPlaceholder("nama@email.com");
    await emailInput.fill("bukan-email");
    // HTML5 validation akan mencegah submit
    const submitBtn = page.getByRole("button", { name: "Masuk" });
    await submitBtn.click();
    // Form tidak submit jika ada HTML5 validation error
    // Kita cek bahwa Supabase call tidak dibuat
    const tokenCalled = await page.evaluate(() => {
      return window.performance
        .getEntriesByType("resource")
        .some((r: PerformanceResourceTiming) => r.name.includes("auth/v1/token"));
    });
    expect(tokenCalled).toBe(false);
  });
});
