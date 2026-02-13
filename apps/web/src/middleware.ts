import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Middleware that delegates authentication handling to the Auth0 SDK
 * and protects all routes under the (app) route group.
 *
 * Public routes (landing page, marketing, etc.) are served without
 * authentication. The /auth/* paths are handled by the Auth0 SDK
 * middleware for login, logout, and callback flows.
 */
export async function middleware(request: NextRequest) {
  // Let the Auth0 SDK handle its own authentication routes first.
  const authResponse = await auth0.middleware(request);

  // Auth0 internal routes (/auth/login, /auth/callback, etc.) are
  // handled entirely by the SDK -- return immediately.
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authResponse;
  }

  // Protect all routes under the (app) route group.
  // The URL matcher below ensures only /(app)/* paths reach this block,
  // but we add an explicit check for defence-in-depth.
  const isAppRoute =
    request.nextUrl.pathname.startsWith("/projects") ||
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (isAppRoute) {
    const session = await auth0.getSession(request);

    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return authResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
