import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * POST /api/auth/sync
 *
 * Synchronises the authenticated Auth0 user with the application's
 * data store. Intended to be called after login (e.g. from a
 * client-side effect or Auth0 post-login action).
 *
 * The handler upserts a user record via the orchestrator API so that
 * the rest of the application can reference a local user entity rather
 * than reaching out to Auth0 on every request.
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

  const userData = {
    auth0Id: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    // Include custom claims if present.
    roles: (user["https://omakase.dev/roles"] as string[] | undefined) ?? [],
  };

  // TODO: Call orchestrator API to upsert user once the endpoint is added.
  // For now, return the extracted data for verification.

  return NextResponse.json({ user: userData });
}
