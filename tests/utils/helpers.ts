/**
 * tests/utils/helpers.ts
 *
 * Shared helper functions untuk Playwright tests.
 */

import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

// ── Toast ──────────────────────────────────────────────────────────────────────

/**
 * Tunggu dan verifikasi toast notification dengan teks tertentu.
 * Toast di app ini muncul di fixed top-3 right-3.
 */
export async function expectToast(
  page: Page,
  text: string,
  timeout = 5_000
): Promise<void> {
  // Toast container di app menggunakan fixed positioning top-3 right-3
  const toast = page.locator('[class*="fixed"][class*="top-3"][class*="right-3"]');
  await expect(toast).toContainText(text, { timeout });
}

/** Tunggu toast error */
export async function expectErrorToast(page: Page, text: string): Promise<void> {
  await expectToast(page, text);
}

/** Tunggu toast sukses */
export async function expectSuccessToast(page: Page, text: string): Promise<void> {
  await expectToast(page, text);
}

// ── Modal ──────────────────────────────────────────────────────────────────────

/**
 * Verifikasi modal terbuka dengan title tertentu.
 * Modal menggunakan <h3> untuk title-nya.
 */
export async function expectModalOpen(page: Page, title: string): Promise<void> {
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
}

/**
 * Tutup modal dengan klik tombol X di header.
 */
export async function closeModalWithX(page: Page): Promise<Locator> {
  // Cari tombol close yang ada di modal header (setelah judul modal)
  const closeBtn = page.locator('[class*="rounded-full"][class*="hover:bg-paper"]').first();
  await closeBtn.click();
  return closeBtn;
}

/**
 * Tutup modal dengan menekan tombol ESC.
 */
export async function closeModalWithEsc(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
}

// ── Navigation ─────────────────────────────────────────────────────────────────

/**
 * Klik tab navigasi di panel (berdasarkan label teks).
 */
export async function clickTab(page: Page, label: string): Promise<void> {
  // Cari nav item di sidebar atau topbar
  await page.getByRole("button", { name: label }).first().click();
}

/**
 * Tunggu halaman loading selesai (untuk panel yang fetch data dari Supabase).
 */
export async function waitForPanelLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

// ── Form ───────────────────────────────────────────────────────────────────────

/**
 * Isi form field berdasarkan placeholder.
 */
export async function fillByPlaceholder(
  page: Page,
  placeholder: string,
  value: string
): Promise<void> {
  await page.getByPlaceholder(placeholder).fill(value);
}

/**
 * Isi input dalam modal (jika ada beberapa input dengan placeholder sama,
 * gunakan container locator untuk scope ke modal).
 */
export async function fillInModal(
  modal: Locator,
  placeholder: string,
  value: string
): Promise<void> {
  await modal.getByPlaceholder(placeholder).fill(value);
}

// ── Supabase Mock Helpers ──────────────────────────────────────────────────────

/** Mock branch list dari Supabase REST API */
export const MOCK_BRANCHES = [
  { id: "branch-test-1", name: "Jakarta Pusat", city: "Jakarta" },
  { id: "branch-test-2", name: "Bekasi Barat", city: "Bekasi" },
];

/** Mock response sukses untuk insert/update */
export const MOCK_INSERT_OK = [];

/** Mock response error dari Supabase */
export function mockSupabaseError(message: string) {
  return {
    code: "23505",
    details: null,
    hint: null,
    message,
  };
}
