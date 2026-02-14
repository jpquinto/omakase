/**
 * Linear workspace browsing queries.
 *
 * Provides functions for listing teams, issues, and projects within a
 * Linear workspace. These are read-only operations used by the Omakase
 * dashboard to let users browse their Linear workspace and link issues
 * to Omakase features.
 *
 * All queries use cursor-based pagination following the Relay connection
 * specification that the Linear GraphQL API implements.
 */

import { linearGraphQL } from "./client";

// -----------------------------------------------------------------------
// GraphQL Queries
// -----------------------------------------------------------------------

/**
 * Query to list all teams accessible to the authenticated user.
 *
 * Returns a flat list of teams with their key metadata. Linear
 * organisations typically have a handful of teams so we fetch all
 * of them without pagination.
 */
const TEAMS_QUERY = `
  query Teams {
    teams {
      nodes {
        id
        name
        key
        description
      }
    }
  }
`;

/**
 * Query to fetch a single team by ID.
 */
const TEAM_QUERY = `
  query Team($teamId: String!) {
    team(id: $teamId) {
      id
      name
      key
    }
  }
`;

/**
 * Query to list issues with optional filtering and cursor-based pagination.
 *
 * The Linear `issues` root query accepts an `IssueFilter` input that
 * supports comparators for team, state, project, and many other fields.
 * Each comparator uses `{ id: { eq: "..." } }` syntax for exact ID
 * matching.
 *
 * When a `query` string is provided we pass it via the `filter.searchableContent`
 * comparator which performs a full-text search across title and description.
 */
const ISSUES_QUERY = `
  query Issues($filter: IssueFilter, $first: Int, $after: String) {
    issues(filter: $filter, first: $first, after: $after) {
      nodes {
        id
        identifier
        title
        description
        priority
        url
        state {
          id
          name
          type
        }
        labels {
          nodes {
            id
            name
          }
        }
        assignee {
          id
          name
        }
        project {
          id
          name
        }
        createdAt
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Query to list projects belonging to a specific team.
 *
 * Linear projects can span multiple teams, but we scope the query
 * to a single team so the results are contextually relevant.
 */
const PROJECTS_QUERY = `
  query TeamProjects($teamId: String!) {
    team(id: $teamId) {
      projects {
        nodes {
          id
          name
          description
          state
          url
        }
      }
    }
  }
`;

// -----------------------------------------------------------------------
// Public Types
// -----------------------------------------------------------------------

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  url: string;
  state: {
    id: string;
    name: string;
    type: string;
  };
  labels: {
    nodes: Array<{ id: string; name: string }>;
  };
  assignee: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  state: string;
  url: string;
}

export interface LinearPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

// -----------------------------------------------------------------------
// Internal Response Types
// -----------------------------------------------------------------------

interface TeamsResponse {
  teams: {
    nodes: LinearTeam[];
  };
}

interface TeamResponse {
  team: {
    id: string;
    name: string;
    key: string;
  };
}

interface IssuesResponse {
  issues: {
    nodes: LinearIssue[];
    pageInfo: LinearPageInfo;
  };
}

interface TeamProjectsResponse {
  team: {
    projects: {
      nodes: LinearProject[];
    };
  };
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * List all teams accessible to the authenticated user.
 *
 * @param accessToken - A valid Linear OAuth access token.
 * @returns An array of teams with id, name, key, and optional description.
 */
export async function listLinearTeams(
  accessToken: string,
): Promise<LinearTeam[]> {
  const data = await linearGraphQL<TeamsResponse>(
    TEAMS_QUERY,
    {},
    accessToken,
  );

  return data.teams.nodes;
}

/**
 * List issues with optional filtering and cursor-based pagination.
 *
 * Builds a Linear `IssueFilter` from the provided parameters. At a
 * minimum a `teamId` is required so results are scoped to a single
 * team. Additional filters (status, project, free-text search) are
 * layered on when provided.
 *
 * @param params.accessToken - A valid Linear OAuth access token.
 * @param params.teamId      - The team ID to scope issues to.
 * @param params.query        - Optional free-text search string.
 * @param params.statusId     - Optional workflow state ID to filter by.
 * @param params.projectId    - Optional project ID to filter by.
 * @param params.after        - Cursor for fetching the next page.
 * @param params.first        - Number of issues to return (default 50).
 * @returns An object containing the issues array and pagination info.
 */
export async function listLinearIssues(params: {
  accessToken: string;
  teamId: string;
  query?: string;
  statusId?: string;
  projectId?: string;
  after?: string;
  first?: number;
}): Promise<{ issues: LinearIssue[]; pageInfo: LinearPageInfo }> {
  const { accessToken, teamId, query, statusId, projectId, after, first = 50 } = params;

  // Build the IssueFilter object. The Linear API uses nested comparator
  // objects (e.g. `{ id: { eq: "..." } }`) for each filterable field.
  const filter: Record<string, unknown> = {
    team: { id: { eq: teamId } },
  };

  if (statusId) {
    filter.state = { id: { eq: statusId } };
  }

  if (projectId) {
    filter.project = { id: { eq: projectId } };
  }

  if (query) {
    filter.searchableContent = { contains: query };
  }

  const data = await linearGraphQL<IssuesResponse>(
    ISSUES_QUERY,
    { filter, first, after: after ?? null },
    accessToken,
  );

  return {
    issues: data.issues.nodes,
    pageInfo: data.issues.pageInfo,
  };
}

/**
 * List Linear projects belonging to a team.
 *
 * @param params.accessToken - A valid Linear OAuth access token.
 * @param params.teamId      - The team whose projects to list.
 * @returns An array of projects with id, name, description, state, and url.
 */
export async function listLinearProjects(params: {
  accessToken: string;
  teamId: string;
}): Promise<LinearProject[]> {
  const { accessToken, teamId } = params;

  const data = await linearGraphQL<TeamProjectsResponse>(
    PROJECTS_QUERY,
    { teamId },
    accessToken,
  );

  return data.team.projects.nodes;
}

/**
 * Fetch details for a single Linear team.
 *
 * @param params.accessToken - A valid Linear OAuth access token.
 * @param params.teamId      - The ID of the team to retrieve.
 * @returns The team's id, name, and key.
 */
export async function getLinearTeam(params: {
  accessToken: string;
  teamId: string;
}): Promise<LinearTeam> {
  const { accessToken, teamId } = params;

  const data = await linearGraphQL<TeamResponse>(
    TEAM_QUERY,
    { teamId },
    accessToken,
  );

  return data.team;
}
