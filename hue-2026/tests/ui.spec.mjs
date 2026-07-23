import { test, expect } from "playwright/test";

test("desktop/mobile page shell has no browser errors", async ({ page }) => {
  test.skip(!process.env.HUE_E2E_BASE_URL, "Set HUE_E2E_BASE_URL to an already-running static server.");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#authLoginOpen")).toBeVisible();
  await expect(page.locator("#chatToggle")).toBeVisible();
  expect(await page.evaluate(() => typeof window.supabase?.createClient)).toBe("function");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#navToggle").click();
  await expect(page.locator("#navLinks")).toBeVisible();
  expect(errors).toEqual([]);
});
