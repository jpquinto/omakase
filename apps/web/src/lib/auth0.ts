import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Auth0 v4 expects AUTH0_DOMAIN (bare domain) and APP_BASE_URL.
// The project uses v3 env var names (AUTH0_ISSUER_BASE_URL, AUTH0_BASE_URL),
// so we map them here for backwards compatibility.
const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL ?? "";
const domain =
  process.env.AUTH0_DOMAIN ??
  issuerUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const auth0 = new Auth0Client({
  domain,
  appBaseUrl: process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL,
  authorizationParameters: {
    scope: "openid profile email",
  },
});
