/**
 * Machine-to-machine (M2M) token acquisition for server-to-server
 * communication via Auth0 client_credentials grant.
 *
 * Required environment variables:
 *   AUTH0_M2M_CLIENT_ID      - Client ID of the M2M application in Auth0
 *   AUTH0_M2M_CLIENT_SECRET  - Client secret of the M2M application
 *   AUTH0_ISSUER_BASE_URL    - Auth0 tenant URL (e.g. https://tenant.us.auth0.com)
 *   AUTH0_AUDIENCE           - API audience identifier
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetch an access token using the OAuth 2.0 client_credentials grant.
 *
 * The token is *not* cached -- callers should implement their own
 * caching strategy (e.g. in-memory with TTL) to avoid unnecessary
 * round-trips to the Auth0 token endpoint.
 */
export async function getM2MToken(): Promise<string> {
  const clientId = process.env.AUTH0_M2M_CLIENT_ID;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  const issuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL;
  const audience = process.env.AUTH0_AUDIENCE;

  if (!clientId || !clientSecret || !issuerBaseUrl || !audience) {
    throw new Error(
      "Missing required M2M environment variables. " +
        "Ensure AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET, " +
        "AUTH0_ISSUER_BASE_URL, and AUTH0_AUDIENCE are set.",
    );
  }

  const response = await fetch(`${issuerBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to obtain M2M token (${response.status}): ${body}`,
    );
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}
