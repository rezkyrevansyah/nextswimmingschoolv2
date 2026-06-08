/**
 * tests/mocks/supabase-routes.ts
 *
 * Helper untuk intercept Supabase API calls di browser via page.route().
 * Hanya bekerja untuk client-side requests (bukan middleware server-side).
 */

import type { Page, Route } from "@playwright/test";
import { MOCK_BRANCHES } from "../utils/helpers";

// ── Auth Mock ─────────────────────────────────────────────────────────────────

/**
 * Mock Supabase login berhasil untuk role tertentu.
 * Intercept POST auth/v1/token (dipanggil oleh supabase.auth.signInWithPassword).
 */
export async function mockLoginSuccess(
  page: Page,
  opts: { role: string; email?: string; userId?: string }
): Promise<void> {
  const { role, email = `${opts.role}@test.com`, userId = `test-user-${opts.role}` } = opts;

  await page.route("**/auth/v1/token*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: `mock-access-token-${role}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 9999999999,
        refresh_token: `mock-refresh-${role}`,
        user: {
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: { role },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        session: { access_token: `mock-access-token-${role}` },
      }),
    });
  });
}

/**
 * Mock Supabase login gagal — invalid credentials.
 */
export async function mockLoginInvalidCredentials(page: Page): Promise<void> {
  await page.route("**/auth/v1/token*", async (route: Route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      }),
    });
  });
}

/**
 * Mock Supabase login gagal — email belum diverifikasi.
 */
export async function mockLoginEmailNotVerified(page: Page): Promise<void> {
  await page.route("**/auth/v1/token*", async (route: Route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Email not confirmed",
      }),
    });
  });
}

// ── Data Mock ─────────────────────────────────────────────────────────────────

/**
 * Mock list cabang dari Supabase REST API.
 */
export async function mockBranchesList(page: Page, branches = MOCK_BRANCHES): Promise<void> {
  await page.route("**/rest/v1/branches*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(branches),
    });
  });
}

/**
 * Mock insert registrasi berhasil.
 */
export async function mockRegistrationSuccess(page: Page): Promise<void> {
  await page.route("**/rest/v1/registrations*", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock insert registrasi gagal.
 */
export async function mockRegistrationError(
  page: Page,
  errorMessage = "duplicate key value violates unique constraint"
): Promise<void> {
  await page.route("**/rest/v1/registrations*", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          code: "23505",
          details: null,
          hint: null,
          message: errorMessage,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock semua request Supabase REST API dengan response kosong (untuk isolasi UI).
 */
export async function mockAllSupabaseRest(
  page: Page,
  customHandlers: Record<string, object | null> = {}
): Promise<void> {
  await page.route("**/rest/v1/**", async (route: Route) => {
    const url = route.request().url();

    for (const [pattern, response] of Object.entries(customHandlers)) {
      if (url.includes(pattern)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response ?? []),
        });
        return;
      }
    }

    // Default: return empty array
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}
