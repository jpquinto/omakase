/**
 * Feature-to-Linear status synchronisation.
 *
 * When an Omakase feature changes status, this module pushes the
 * corresponding state update back to the linked Linear issue via the
 * Linear GraphQL API.
 *
 * Status mapping:
 *   Omakase "in_progress" -> Linear "In Progress"
 *   Omakase "passing"     -> Linear "Done"
 *   Omakase "failing"     -> Linear "In Review" (needs attention)
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

type FeatureStatus = "pending" | "in_progress" | "review_ready" | "passing" | "failing";

interface SyncOptions {
  /** The Linear issue ID (UUID, not the human-readable identifier). */
  linearIssueId: string;
  /** The current Omakase feature status. */
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

const STATUS_TO_LINEAR_STATE: Record<
  FeatureStatus,
  { name: string; fallbackType: string }
> = {
  pending: { name: "Todo", fallbackType: "unstarted" },
  in_progress: { name: "In Progress", fallbackType: "started" },
  review_ready: { name: "In Review", fallbackType: "started" },
  passing: { name: "Done", fallbackType: "completed" },
  failing: { name: "In Review", fallbackType: "started" },
};

function resolveTargetState(
  states: WorkflowState[],
  featureStatus: FeatureStatus,
): WorkflowState | undefined {
  const target = STATUS_TO_LINEAR_STATE[featureStatus];

  const byName = states.find(
    (s) => s.name.toLowerCase() === target.name.toLowerCase(),
  );
  if (byName) return byName;

  return states.find((s) => s.type === target.fallbackType);
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

export async function syncFeatureStatusToLinear(
  options: SyncOptions,
): Promise<void> {
  const { linearIssueId, featureStatus, linearAccessToken } = options;

  const issueDetail = await linearGraphQL<IssueDetailResponse>(
    ISSUE_DETAIL_QUERY,
    { issueId: linearIssueId },
    linearAccessToken,
  );

  const teamId = issueDetail.issue.team.id;
  const currentStateName = issueDetail.issue.state.name;

  const teamStates = await linearGraphQL<TeamStatesResponse>(
    TEAM_STATES_QUERY,
    { teamId },
    linearAccessToken,
  );

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

  if (targetState.name === currentStateName) {
    console.log(
      `[Linear Status Sync] Issue ${issueDetail.issue.identifier} is ` +
        `already in "${currentStateName}" -- skipping update.`,
    );
    return;
  }

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
