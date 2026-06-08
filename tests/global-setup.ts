/**
 * global-setup.ts
 *
 * Dijalankan sekali sebelum semua panel tests.
 * Login sebagai setiap role dan simpan storage state ke tests/.auth/
 *
 * Env vars yang dibutuhkan (opsional — tanpa ini, panel tests di-skip):
 *   TEST_OWNER_EMAIL / TEST_OWNER_PASSWORD
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 *   TEST_COACH_EMAIL / TEST_COACH_PASSWORD
 *   TEST_MEMBER_EMAIL / TEST_MEMBER_PASSWORD
 *   TEST_SCHOOL_EMAIL / TEST_SCHOOL_PASSWORD
 */

import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";
import { config as loadEnv } from "dotenv";

// Load .env.test dari root project (opsional — tidak error jika tidak ada)
loadEnv({ path: path.join(__dirname, "../.env.test"), override: false });

const AUTH_DIR = path.join(__dirname, ".auth");

const ROLES = [
  { key: "owner",  emailVar: "TEST_OWNER_EMAIL",  passVar: "TEST_OWNER_PASSWORD"  },
  { key: "admin",  emailVar: "TEST_ADMIN_EMAIL",   passVar: "TEST_ADMIN_PASSWORD"  },
  { key: "coach",  emailVar: "TEST_COACH_EMAIL",   passVar: "TEST_COACH_PASSWORD"  },
  { key: "member", emailVar: "TEST_MEMBER_EMAIL",  passVar: "TEST_MEMBER_PASSWORD" },
  { key: "school", emailVar: "TEST_SCHOOL_EMAIL",  passVar: "TEST_SCHOOL_PASSWORD" },
] as const;

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  // Buat direktori .auth jika belum ada
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const role of ROLES) {
    const email    = process.env[role.emailVar];
    const password = process.env[role.passVar];
    const outFile  = path.join(AUTH_DIR, `${role.key}.json`);

    if (!email || !password) {
      console.log(`  [setup] Lewati login ${role.key} — ${role.emailVar} tidak di-set`);
      // Tulis state kosong agar project tidak crash
      fs.writeFileSync(outFile, JSON.stringify({ cookies: [], origins: [] }));
      continue;
    }

    console.log(`  [setup] Login sebagai ${role.key} (${email})…`);

    const context = await browser.newContext();
    const page    = await context.newPage();

    try {
      await page.goto(`${baseURL}/login`);
      await page.waitForLoadState("networkidle");

      await page.getByPlaceholder("nama@email.com").fill(email);
      await page.locator("input[type=password]").fill(password);
      await page.getByRole("button", { name: "Masuk" }).click();

      // Tunggu redirect ke dashboard
      await page.waitForURL(`**/${role.key}`, { timeout: 20_000 });

      await context.storageState({ path: outFile });
      console.log(`  [setup] ✅ ${role.key} auth tersimpan → ${outFile}`);
    } catch (err) {
      console.error(`  [setup] ❌ Gagal login sebagai ${role.key}:`, err);
      fs.writeFileSync(outFile, JSON.stringify({ cookies: [], origins: [] }));
    } finally {
      await context.close();
    }
  }

  await browser.close();
}
