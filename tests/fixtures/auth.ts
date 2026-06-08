/**
 * tests/fixtures/auth.ts
 *
 * Playwright fixture extension yang menambahkan `skipIfNoAuth`.
 * Dipakai di panel tests untuk skip jika storageState kosong (tidak ada kredensial test).
 */

import { test as base, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

type Role = "owner" | "admin" | "coach" | "member" | "school";

function authFileHasSession(role: Role): boolean {
  const file = path.join(__dirname, `../.auth/${role}.json`);
  if (!fs.existsSync(file)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return Array.isArray(data.cookies) && data.cookies.length > 0;
  } catch {
    return false;
  }
}

// Extend base test dengan fixture skipIfNoAuth
const test = base.extend<{ skipIfNoAuth: (role: Role) => void }>({
  skipIfNoAuth: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const skip = (role: Role) => {
        if (!authFileHasSession(role)) {
          base.skip(
            true,
            `Panel "${role}" dilewati — set TEST_${role.toUpperCase()}_EMAIL & TEST_${role.toUpperCase()}_PASSWORD di .env.test lalu jalankan global-setup`
          );
        }
      };
      await use(skip);
    },
    { auto: false },
  ],
});

export { test, expect };
