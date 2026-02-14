import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * POST /api/auth/sync
 *
 * Synchronises the authenticated Auth0 user with the application's
 * data store. Intended to be called after login (e.g. from a
 * client-side effect or Auth0 post-login action).
 *
 * The handler upserts a user record in Convex so that the rest of
 * the application can reference a local user entity rather than
 * reaching out to Auth0 on every request.
 */
export async function POST() {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { user } = session;

  // Build a normalised user payload from the Auth0 profile.
  const userData = {
    auth0Id: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    // Include custom claims if present.
    roles: (user["https://omakase.dev/roles"] as string[] | undefined) ?? [],
  };

  // TODO: Replace with an actual Convex mutation call once the
  // Convex schema and `users.upsert` mutation are defined.
  //
  // Example:
  //   import { fetchMutation } from "convex/nextjs";
  //   import { api } from "@convex/_generated/api";
  //   const result = await fetchMutation(api.users.upsert, userData);
  //
  // For now we return the extracted data so callers can verify the
  // sync payload is correct.

  return NextResponse.json({ user: userData });
}
