/**
 * Role-based access control types and utilities.
 *
 * Roles are stored in Auth0 user metadata under a namespaced claim
 * and follow a strict hierarchy: admin > developer > viewer.
 */

export type UserRole = "admin" | "developer" | "viewer";

/** Numeric weight for each role -- higher means more privilege. */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  developer: 2,
  viewer: 1,
} as const;

/** Ordered list of roles from most to least privileged. */
export const ROLES_ORDERED: readonly UserRole[] = [
  "admin",
  "developer",
  "viewer",
] as const;

/**
 * Extract the primary role from an Auth0 session object.
 *
 * Auth0 custom claims are namespaced; we read the first entry from
 * `session.user["https://omakase.dev/roles"]`. If the claim is
 * missing or empty the caller receives the least-privileged role.
 */
export function getUserRole(session: {
  user: Record<string, unknown>;
}): UserRole {
  const roles = session.user["https://omakase.dev/roles"];

  if (Array.isArray(roles) && roles.length > 0) {
    const candidate = roles[0] as string;

    // Only return the value when it matches a known role.
    if (candidate in ROLE_HIERARCHY) {
      return candidate as UserRole;
    }
  }

  return "viewer";
}

/**
 * Return `true` when `userRole` meets or exceeds `requiredRole`
 * in the privilege hierarchy.
 */
export function hasRequiredRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
