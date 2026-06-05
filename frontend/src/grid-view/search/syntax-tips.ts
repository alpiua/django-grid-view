/** Search syntax help rows — mirror of django_grid_view.search.syntax_tips */

import { SearchProfile } from "./contract";

export interface SearchTipRowDef {
  modifierKey: string;
  exampleKey: string;
  meaningKey: string;
}

export const SEARCH_TIP_ROWS: Record<string, SearchTipRowDef> = {
  word: {
    modifierKey: "search.tip_mod_word",
    exampleKey: "search.tip_ex_word",
    meaningKey: "search.tip_mean_word",
  },
  and: { modifierKey: "+", exampleKey: "search.tip_ex_and", meaningKey: "search.tip_mean_and" },
  exclude: {
    modifierKey: "-",
    exampleKey: "search.tip_ex_exclude",
    meaningKey: "search.tip_mean_exclude",
  },
  or: { modifierKey: ",", exampleKey: "search.tip_ex_or", meaningKey: "search.tip_mean_or" },
  column_scope: {
    modifierKey: ":",
    exampleKey: "search.tip_ex_column_scope",
    meaningKey: "search.tip_mean_column_scope",
  },
  compare: {
    modifierKey: "> <",
    exampleKey: "search.tip_ex_compare",
    meaningKey: "search.tip_mean_compare",
  },
  range: { modifierKey: "..", exampleKey: "search.tip_ex_range", meaningKey: "search.tip_mean_range" },
  quote: {
    modifierKey: '"…"',
    exampleKey: "search.tip_ex_quote",
    meaningKey: "search.tip_mean_quote",
  },
  phrase: {
    modifierKey: "search.tip_mod_phrase",
    exampleKey: "search.tip_ex_phrase",
    meaningKey: "search.tip_mean_phrase",
  },
  wildcard: {
    modifierKey: "%",
    exampleKey: "search.tip_ex_wildcard",
    meaningKey: "search.tip_mean_wildcard",
  },
};

export const PROFILE_TIP_ROW_IDS: Record<SearchProfile, readonly string[]> = {
  [SearchProfile.Toolbar]: [
    "word",
    "and",
    "exclude",
    "or",
    "column_scope",
    "compare",
    "range",
    "quote",
    "phrase",
  ],
  [SearchProfile.Default]: [
    "word",
    "and",
    "exclude",
    "or",
    "compare",
    "range",
    "quote",
    "phrase",
    "wildcard",
  ],
  [SearchProfile.Text]: ["word", "and", "exclude", "or", "quote", "phrase", "wildcard"],
  [SearchProfile.Numeric]: ["compare", "range", "and", "or", "wildcard"],
  [SearchProfile.Nosearch]: [],
};

export function tipRowIdsForProfile(profile: SearchProfile): readonly string[] {
  return PROFILE_TIP_ROW_IDS[profile] ?? PROFILE_TIP_ROW_IDS[SearchProfile.Default];
}
