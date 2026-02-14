/**
 * Auth0 v4 handles authentication routes via middleware (src/middleware.ts),
 * not via API route handlers. The Auth0 SDK intercepts /auth/login,
 * /auth/callback, and /auth/logout automatically.
 *
 * This file is kept as a placeholder. The old handleAuth() API
 * from v3 no longer exists in @auth0/nextjs-auth0 v4.
 */
export function GET() {
  return new Response("Auth routes are handled by middleware", { status: 404 });
}
