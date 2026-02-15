/**
 * github-app.ts -- GitHub App authentication and installation token management.
 *
 * Generates JWTs from the GitHub App's private key, creates short-lived
 * installation tokens via the GitHub API, and caches them in-memory with
 * automatic refresh when near expiry.
 *
 * Environment variables:
 *   GITHUB_APP_ID            - The GitHub App's numeric ID
 *   GITHUB_APP_PRIVATE_KEY   - PEM-encoded RSA private key
 *   GITHUB_APP_WEBHOOK_SECRET - Webhook HMAC secret for signature verification
 *   GITHUB_APP_SLUG          - The GitHub App slug (used for installation URLs)
 */

import { SignJWT, importPKCS8, importJWK } from "jose";
import { createPrivateKey } from "crypto";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export const GITHUB_APP_ID = process.env["GITHUB_APP_ID"] ?? "";
export const GITHUB_APP_PRIVATE_KEY = (process.env["GITHUB_APP_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n");
export const GITHUB_APP_WEBHOOK_SECRET = process.env["GITHUB_APP_WEBHOOK_SECRET"] ?? "";
export const GITHUB_APP_SLUG = process.env["GITHUB_APP_SLUG"] ?? "";

/**
 * Check whether the GitHub App is configured (all required env vars present).
 */
export function isGitHubAppConfigured(): boolean {
  return !!(GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY);
}

/**
 * Assert that the GitHub App is configured, throwing a descriptive error if not.
 */
export function requireGitHubApp(): void {
  if (!GITHUB_APP_ID) {
    throw new Error("GitHub App not configured: GITHUB_APP_ID is missing");
  }
  if (!GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App not configured: GITHUB_APP_PRIVATE_KEY is missing");
  }
}

// ---------------------------------------------------------------------------
// JWT generation
// ---------------------------------------------------------------------------

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Generate a JWT for authenticating as the GitHub App.
 * JWTs are valid for 10 minutes (GitHub maximum).
 */
async function generateAppJwt(): Promise<string> {
  requireGitHubApp();

  // GitHub App PEM files use PKCS#1 ("RSA PRIVATE KEY") format.
  // jose's importPKCS8 only accepts PKCS#8 ("PRIVATE KEY").
  // Use Node's createPrivateKey to normalize, then export as JWK for jose.
  const keyObject = createPrivateKey(GITHUB_APP_PRIVATE_KEY);
  const jwk = keyObject.export({ format: "jwk" });
  const privateKey = await importJWK(jwk, "RS256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(GITHUB_APP_ID)
    .setIssuedAt(now - 60) // 60 seconds in the past to account for clock drift
    .setExpirationTime(now + 600) // 10 minutes
    .sign(privateKey);
}

// ---------------------------------------------------------------------------
// Installation token cache
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/** In-memory token cache keyed by installation ID. */
const tokenCache = new Map<number, CachedToken>();

/** Minimum remaining TTL before a token is considered near-expiry (10 minutes). */
const MIN_TTL_MS = 10 * 60 * 1000;

/**
 * Get a GitHub App installation token for the given installation ID.
 *
 * Returns a cached token if still valid (>10 min remaining), otherwise
 * generates a fresh one via the GitHub API.
 *
 * @param installationId - The GitHub App installation ID.
 * @returns The installation access token string.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  // Check cache
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt - Date.now() > MIN_TTL_MS) {
    return cached.token;
  }

  // Generate a fresh token
  const appJwt = await generateAppJwt();

  const response = await fetch(
    `${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${appJwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Failed to create installation token for installation ${installationId}: ` +
        `${response.status} ${body}`,
    );
  }

  const data = (await response.json()) as { token: string; expires_at: string };

  const cachedEntry: CachedToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  };

  tokenCache.set(installationId, cachedEntry);

  return data.token;
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

/**
 * List repositories accessible to a GitHub App installation.
 *
 * @param installationId - The GitHub App installation ID.
 * @returns Array of { owner, name, fullName, defaultBranch, private } objects.
 */
export async function listInstallationRepos(installationId: number): Promise<
  Array<{
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    private: boolean;
  }>
> {
  const token = await getInstallationToken(installationId);

  const response = await fetch(
    `${GITHUB_API_BASE}/installation/repositories?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Failed to list repos for installation ${installationId}: ${response.status} ${body}`,
    );
  }

  const data = (await response.json()) as {
    repositories: Array<{
      owner: { login: string };
      name: string;
      full_name: string;
      default_branch: string;
      private: boolean;
    }>;
  };

  return data.repositories.map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
    private: repo.private,
  }));
}
