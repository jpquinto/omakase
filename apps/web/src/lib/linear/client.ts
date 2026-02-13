/**
 * Linear GraphQL API client utility.
 *
 * Provides a thin wrapper around the Linear GraphQL endpoint so that
 * callers do not need to worry about headers, serialisation, or basic
 * error handling.
 *
 * Usage:
 *   const data = await linearGraphQL(query, { id: "abc" }, accessToken);
 */

const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";

/** Shape returned by the Linear GraphQL API. */
interface LinearGraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
}

/**
 * Execute a GraphQL query or mutation against the Linear API.
 *
 * @param query        - The GraphQL query/mutation string.
 * @param variables    - Variables to substitute into the query.
 * @param accessToken  - A valid Linear OAuth access token.
 * @returns The `data` portion of the GraphQL response.
 * @throws On network errors, HTTP errors, or GraphQL-level errors.
 */
export async function linearGraphQL<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const response = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Linear GraphQL request failed (${response.status}): ${body}`,
    );
  }

  const result: LinearGraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((e) => e.message).join("; ");
    throw new Error(`Linear GraphQL errors: ${messages}`);
  }

  if (!result.data) {
    throw new Error("Linear GraphQL response contained no data.");
  }

  return result.data;
}
