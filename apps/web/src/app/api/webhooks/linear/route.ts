import { NextRequest, NextResponse } from "next/server";
import { handleIssueCreated, handleIssueUpdated } from "@/lib/linear/ticket-sync";
import { handleRelationCreated, handleRelationRemoved } from "@/lib/linear/dependency-sync";

/**
 * POST /api/webhooks/linear
 *
 * Receives webhook events from Linear and routes them to the appropriate
 * handler based on the event type.
 *
 * Security: Every request is verified against an HMAC-SHA256 signature
 * computed from the raw request body and the shared webhook secret. Requests
 * with invalid or missing signatures are rejected with a 401.
 *
 * Required environment variable:
 *   LINEAR_WEBHOOK_SECRET - The signing secret configured in Linear's
 *                           webhook settings.
 *
 * Supported event types:
 *   - Issue.create       - A new issue was created
 *   - Issue.update       - An existing issue was updated
 *   - Issue.remove       - An issue was deleted
 *   - IssueRelation.create - A relation between issues was created
 *   - IssueRelation.remove - A relation between issues was removed
 */

// -----------------------------------------------------------------------
// Webhook Payload Envelope
// -----------------------------------------------------------------------
interface LinearWebhookPayload {
  action: "create" | "update" | "remove";
  type: string;
  data: Record<string, unknown>;
  url?: string;
  createdAt: string;
  organizationId?: string;
}

// -----------------------------------------------------------------------
// Signature Verification
// -----------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 signature from Linear.
 *
 * Linear sends the signature in the `linear-signature` header. The
 * signature is a hex-encoded HMAC-SHA256 digest of the raw request body
 * using the webhook secret as the key.
 */
async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Use a constant-time comparison to prevent timing attacks.
  if (computedHex.length !== signature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < computedHex.length; i++) {
    mismatch |= computedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// -----------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[Linear Webhook] LINEAR_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  // Read the raw body for signature verification -- we must consume the
  // body exactly once before parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("linear-signature");

  const isValid = await verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    console.warn("[Linear Webhook] Invalid signature -- rejecting request.");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  // Parse the verified body.
  let payload: LinearWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LinearWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400 },
    );
  }

  const eventType = `${payload.type}.${payload.action}`;

  try {
    switch (eventType) {
      case "Issue.create":
        await handleIssueCreated(payload.data);
        break;

      case "Issue.update":
        await handleIssueUpdated(payload.data);
        break;

      case "Issue.remove":
        // Issue deletion: a future implementation may archive the
        // corresponding feature. For now we acknowledge the event.
        console.log("[Linear Webhook] Issue.remove received -- no-op for now.");
        break;

      case "IssueRelation.create":
        await handleRelationCreated(payload.data);
        break;

      case "IssueRelation.remove":
        await handleRelationRemoved(payload.data);
        break;

      default:
        // Unhandled event types are acknowledged silently so Linear does
        // not retry them.
        console.log(`[Linear Webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Linear Webhook] Error handling ${eventType}:`, message);
    // Return 200 even on handler errors to prevent Linear from retrying
    // indefinitely. The error is logged for investigation.
  }

  return NextResponse.json({ ok: true });
}
