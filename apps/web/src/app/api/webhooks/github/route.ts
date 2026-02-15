import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhooks/github
 *
 * Receives GitHub App webhook events for installation lifecycle changes.
 * Verifies the HMAC-SHA256 signature using GITHUB_APP_WEBHOOK_SECRET.
 *
 * Handled events:
 *   - installation.deleted — clears GitHub fields from all affected projects
 *   - installation_repositories.removed — clears repo fields if connected repo was removed
 */
export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "GitHub webhook secret not configured" },
      { status: 500 },
    );
  }

  // Verify signature
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const body = await request.text();
  const isValid = await verifySignature(secret, body, signature);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(body);

  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

  try {
    if (event === "installation" && payload.action === "deleted") {
      // App uninstalled — clear all GitHub fields from affected projects
      const installationId = payload.installation?.id;
      if (installationId) {
        await fetch(`${orchestratorUrl}/api/github/installations/${installationId}`, {
          method: "DELETE",
        });
      }
    } else if (event === "installation_repositories" && payload.action === "removed") {
      // Repos removed from installation — notify orchestrator
      const installationId = payload.installation?.id;
      const removedRepos = payload.repositories_removed ?? [];
      if (installationId && removedRepos.length > 0) {
        await fetch(`${orchestratorUrl}/api/github/installations/${installationId}/repos-removed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            removedRepos: removedRepos.map((r: { full_name: string }) => r.full_name),
          }),
        });
      }
    }
  } catch (err) {
    console.error("[github-webhook] Error processing event:", err);
  }

  return NextResponse.json({ received: true });
}

/**
 * Verify the HMAC-SHA256 signature from GitHub.
 */
async function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = `sha256=${Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
