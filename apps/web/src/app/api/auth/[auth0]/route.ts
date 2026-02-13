import { handleAuth } from "@auth0/nextjs-auth0";

/**
 * Dynamic catch-all route handler for Auth0 authentication endpoints.
 *
 * This handles /api/auth/login, /api/auth/logout, /api/auth/callback,
 * and /api/auth/me automatically via the Auth0 SDK.
 */
export const GET = handleAuth();
