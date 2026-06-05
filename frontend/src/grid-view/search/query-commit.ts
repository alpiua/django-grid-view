/** When a filter query is complete enough to apply (profile-aware guards). */

import type { ColumnSearchMeta } from "./column-scope";
import {
  SearchProfile,
  bindSearchProfileForToolbar,
  defaultSearchProfile,
  isCommitReadyForProfile,
} from "./contract";

export {
  SearchProfile,
  bindSearchProfileForHeader,
  bindSearchProfileForToolbar,
  classifyQueryTokens,
  guardQueryForProfile,
  isCommitReadyForProfile,
} from "./contract";

export function isFilterQueryCommitReadyForProfile(
  query: unknown,
  profile: SearchProfile,
  options?: { columns?: readonly ColumnSearchMeta[] }
): boolean {
  return isCommitReadyForProfile(query, profile, options);
}

export function isFilterQueryCommitReady(query: unknown): boolean {
  return isCommitReadyForProfile(query, defaultSearchProfile());
}

export function isToolbarQueryCommitReady(
  query: unknown,
  options?: { columns?: readonly ColumnSearchMeta[] }
): boolean {
  return isCommitReadyForProfile(query, bindSearchProfileForToolbar(), options);
}
