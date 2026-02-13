/**
 * Feature-to-Linear status synchronisation.
 *
 * When an AutoForge feature changes status, this module pushes the
 * corresponding state update back to the linked Linear issue via the
 * Linear GraphQL API.
 *
 * Status mapping:
 *   AutoForge "in_progress" -> Linear "In Progress"
 *   AutoForge "passing"     -> Linear "Done"
 *   AutoForge "failing"     -> Linear "In Review" (needs attention)
 */

import { linearGraphQL } from "./client";

// -----------------------------------------------------------------------
// GraphQL Mutations
// -----------------------------------------------------------------------

/**
 * Mutation to update the workflow state of a Linear issue.
 *
 * `issueUpdate` accepts the issue ID and a partial input object. We
 * only set `stateId` to move the issue to the desired workflow state.
 */
export const ISSUE_UPDATE_STATE_MUTATION = `
  mutation IssueUpdateState($issueId: String!, $stateId: String!) {
    issueUpdate(id: $issueId, input: { stateId: $stateId }) {
      success
      issue {
        id
        identifier
        state {
          id
          name
          type
        }
      }
    }
  }
`;

/**
 * Query to list the workflow states of a Linear team.
 *
 * Used to resolve the state ID from a human-readable name like
 * "In Progress" or "Done".
 */
export const TEAM_STATES_QUERY = `
  query TeamStates($teamId: String!) {
    team(id: $teamId) {
      states {
        nodes {
          id
          name
          type
        }
      }
    }
  }
`;

/**
 * Query to fetch an issue along with its team ID so we can resolve the
 * team's workflow states.
 */
export const ISSUE_DETAIL_QUERY = `
  query IssueDetail($issueId: String!) {
    issue(id: $issueId) {
      id
      identifier
      team {
        id
      }
      state {
        id
        name
        type
      }
    }
  }
`;

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type FeatureStatus = "pending" | "in_progress" | "passing" | "failing";

interface SyncOptions {
  /** The Linear issue ID (UUID, not the human-readable identifier). */
  linearIssueId: string;
  /** The current AutoForge feature status. */
  featureStatus: FeatureStatus;
  /** A valid Linear OAuth access token. */
  linearAccessToken: string;
}

interface WorkflowState {
  id: string;
  name: string;
  type: string;
}

interface IssueDetailResponse {
  issue: {
    id: string;
    identifier: string;
    team: { id: string };
    state: WorkflowState;
  };
}

interface TeamStatesResponse {
  team: {
    states: {
      nodes: WorkflowState[];
    };
  };
}

interface IssueUpdateResponse {
  issueUpdate: {
    success: boolean;
    issue: {
      id: string;
      identifier: string;
      state: WorkflowState;
    };
  };
}

// -----------------------------------------------------------------------
// Status Mapping
// -----------------------------------------------------------------------

/**
 * Maps an AutoForge feature status to the target Linear workflow state
 * name. Linear's default workflow typically includes states named
 * "In Progress", "Done", and "In Review", but these can be customised
 * per team.
 *
 * The mapping uses Linear's state `type` as a fallback when the exact
 * name is not found, since types ("started", "completed", "unstarted")
 * are standard across all Linear teams.
 */
const STATUS_TO_LINEAR_STATE: Record<
  FeatureStatus,
  { name: string; fallbackType: string }
> = {
  pending: { name: "Todo", fallbackType: "unstarted" },
  in_progress: { name: "In Progress", fallbackType: "started" },
  passing: { name: "Done", fallbackType: "completed" },
  failing: { name: "In Review", fallbackType: "started" },
};

/**
 * Find the best matching workflow state for the given feature status.
 *
 * First tries an exact name match, then falls back to matching by
 * Linear's state type.
 */
function resolveTargetState(
  states: WorkflowState[],
  featureStatus: FeatureStatus,
): WorkflowState | undefined {
  const target = STATUS_TO_LINEAR_STATE[featureStatus];

  // Prefer exact name match (case-insensitive).
  const byName = states.find(
    (s) => s.name.toLowerCase() === target.name.toLowerCase(),
  );
  if (byName) return byName;

  // Fall back to matching by state type.
  return states.find((s) => s.type === target.fallbackType);
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * Synchronise an AutoForge feature status to the corresponding Linear
 * issue workflow state.
 *
 * 1. Fetches the issue to determine which team it belongs to.
 * 2. Fetches the team's workflow states.
 * 3. Resolves the target state from the feature status.
 * 4. Updates the issue state via the GraphQL mutation.
 *
 * If the issue is already in the target state this is a no-op.
 */
export async function syncFeatureStatusToLinear(
  options: SyncOptions,
): Promise<void> {
  const { linearIssueId, featureStatus, linearAccessToken } = options;

  // Step 1: Get the issue and its team.
  const issueDetail = await linearGraphQL<IssueDetailResponse>(
    ISSUE_DETAIL_QUERY,
    { issueId: linearIssueId },
    linearAccessToken,
  );

  const teamId = issueDetail.issue.team.id;
  const currentStateName = issueDetail.issue.state.name;

  // Step 2: Get the team's workflow states.
  const teamStates = await linearGraphQL<TeamStatesResponse>(
    TEAM_STATES_QUERY,
    { teamId },
    linearAccessToken,
  );

  // Step 3: Resolve the target state.
  const targetState = resolveTargetState(
    teamStates.team.states.nodes,
    featureStatus,
  );

  if (!targetState) {
    console.warn(
      `[Linear Status Sync] Could not resolve a Linear state for ` +
        `feature status "${featureStatus}" in team ${teamId}.`,
    );
    return;
  }

  // Skip the update if the issue is already in the target state.
  if (targetState.name === currentStateName) {
    console.log(
      `[Linear Status Sync] Issue ${issueDetail.issue.identifier} is ` +
        `already in "${currentStateName}" -- skipping update.`,
    );
    return;
  }

  // Step 4: Update the issue state.
  const result = await linearGraphQL<IssueUpdateResponse>(
    ISSUE_UPDATE_STATE_MUTATION,
    { issueId: linearIssueId, stateId: targetState.id },
    linearAccessToken,
  );

  if (result.issueUpdate.success) {
    console.log(
      `[Linear Status Sync] Updated ${result.issueUpdate.issue.identifier} ` +
        `from "${currentStateName}" to "${targetState.name}".`,
    );
  } else {
    console.warn(
      `[Linear Status Sync] issueUpdate returned success=false for ` +
        `issue ${linearIssueId}.`,
    );
  }
}
