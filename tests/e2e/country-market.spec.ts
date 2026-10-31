import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("German market displays correct operator and blocks UK-only registration", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("craftvaro-country", "DE");
    localStorage.setItem("craftvaro-lang", "en");
  });

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "German registration is not yet open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "German registration not available" })).toBeDisabled();

  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "German marketplace search" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Describe exactly who you need" })).toHaveCount(0);

  await page.goto("/privacy");
  await expect(page.getByText(/iTechLounge GmbH/).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("market choice survives reload and does not change interface language", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("craftvaro-country", "GB");
    localStorage.setItem("craftvaro-lang", "de");
  });

  await page.goto("/marketplace");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.getByRole("button", { name: "Open menu" }).click();
  const market = page.locator("nav").getByRole("combobox", { name: "Land des Marktplatzes" });
  await expect(market).toHaveValue("GB");
  await market.selectOption("DE");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Handwerkersuche in Deutschland" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("nav").getByRole("combobox", { name: "Land des Marktplatzes" })).toHaveValue("DE");
});

test("explicit country deep link overrides the stored choice on a shared domain", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("craftvaro-country", "GB");
    localStorage.setItem("craftvaro-lang", "en");
  });
  await page.goto("/marketplace?country=DE");
  await expect(page.getByRole("heading", { name: "German marketplace search" })).toBeVisible();
  await expect(page.locator("nav img[alt='Craftvaro']")).toHaveAttribute("src", /craftvaro-logo-de/);
});
