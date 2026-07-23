import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /ui\.spec\.mjs/,
  timeout: 30_000,
  use: { baseURL: process.env.HUE_E2E_BASE_URL || "http://127.0.0.1:8000" }
});
