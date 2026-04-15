import { expect, test } from "@playwright/test";

const VALID_EMAIL = process.env.E2E_AUTH_EMAIL;
const VALID_PASSWORD = process.env.E2E_AUTH_PASSWORD;

function hasRealCredentials() {
  if (!VALID_EMAIL || !VALID_PASSWORD) return false;
  if (VALID_EMAIL === "qa-user@soler.com") return false;
  if (VALID_PASSWORD === "your-real-password") return false;
  return true;
}

const hasValidCredentials = hasRealCredentials();

async function fillLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar no Backoffice" }).click();
}

test.describe("Auth middleware + login flow", () => {
  test("redirects anonymous user from protected route to /login", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Soler Shop" })).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await fillLogin(page, "invalid@soler.com", "wrong-password");

    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.getByText("Falha no login")).toBeVisible();
    await expect(
      page
        .getByText(
        /E-mail ou senha inválidos\.|Não foi possível autenticar no momento\.|Falha de autenticação\./,
        )
        .first(),
    ).toBeVisible();
  });

  test("redirect parameter returns user to requested route after login", async ({ page }) => {
    test.skip(
      !hasValidCredentials,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real Supabase login tests.",
    );

    await page.goto("/expenses");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fexpenses$/);

    await fillLogin(page, VALID_EMAIL!, VALID_PASSWORD!);

    await expect(page).toHaveURL(/\/expenses$/);
    await expect(page.getByRole("heading", { name: "Despesas Globais" })).toBeVisible();
  });

  test("authenticated user cannot stay on /login", async ({ page }) => {
    test.skip(
      !hasValidCredentials,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real Supabase login tests.",
    );

    await page.goto("/login");
    await fillLogin(page, VALID_EMAIL!, VALID_PASSWORD!);
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);
  });

  test("logout terminates session and protects routes again", async ({ page }) => {
    test.skip(
      !hasValidCredentials,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real Supabase login tests.",
    );

    await page.goto("/login");
    await fillLogin(page, VALID_EMAIL!, VALID_PASSWORD!);
    await expect(page).toHaveURL(/\/$/);

    await page.getByTitle("Sair").click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  });
});
