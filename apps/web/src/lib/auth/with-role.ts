import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getUserRole, hasRequiredRole, type UserRole } from "./roles";

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse | Response>;

/**
 * Higher-order function that wraps a Next.js route handler with
 * role-based access control.
 *
 * Usage:
 * ```ts
 * export const GET = withRole("admin")(async (request) => {
 *   return NextResponse.json({ data: "admin-only" });
 * });
 * ```
 *
 * Returns 401 if no session exists, or 403 if the authenticated
 * user's role is insufficient.
 */
export function withRole(requiredRole: UserRole) {
  return (handler: RouteHandler): RouteHandler => {
    return async (
      request: NextRequest,
      context: RouteContext,
    ): Promise<NextResponse | Response> => {
      const session = await auth0.getSession(request);

      if (!session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      const userRole = getUserRole(session);

      if (!hasRequiredRole(userRole, requiredRole)) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            required: requiredRole,
            current: userRole,
          },
          { status: 403 },
        );
      }

      return handler(request, context);
    };
  };
}
