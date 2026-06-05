/** Build search syntax help tooltip HTML for a profile. */

import { i18n } from "./i18n";
import type { SearchProfile } from "./search/contract";
import { SEARCH_TIP_ROWS, tipRowIdsForProfile } from "./search/syntax-tips";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tipCellText(keyOrLiteral: string): string {
  if (keyOrLiteral.startsWith("search.")) {
    return escapeHtml(i18n.t(keyOrLiteral, keyOrLiteral));
  }
  return escapeHtml(keyOrLiteral);
}

export function buildSearchSyntaxTipHtml(profile: SearchProfile): string {
  const rowIds = tipRowIdsForProfile(profile);
  const headMod = escapeHtml(i18n.t("search.tip_col_modifier", "Modifier"));
  const headEx = escapeHtml(i18n.t("search.tip_col_example", "Example"));
  const headMean = escapeHtml(i18n.t("search.tip_col_meaning", "Meaning"));

  const body = rowIds
    .map((id) => {
      const row = SEARCH_TIP_ROWS[id];
      if (!row) return "";
      const mod = tipCellText(row.modifierKey);
      const ex = tipCellText(row.exampleKey);
      const mean = escapeHtml(i18n.t(row.meaningKey, row.meaningKey));
      return `<tr><td><code>${mod}</code></td><td><code>${ex}</code></td><td>${mean}</td></tr>`;
    })
    .join("");

  const footnote = escapeHtml(
    i18n.t("search.tip_quote_hint", "Wrap the expression in double quotes to disable modifiers")
  );
  const example = escapeHtml(
    i18n.t("search.tip_quote_example", '"search -1 +2", word2')
  );

  return (
    `<div class="cm-search-syntax-tip"><table class="cm-search-syntax-table">` +
    `<colgroup><col class="cm-search-syntax-col--mod"><col class="cm-search-syntax-col--ex"><col class="cm-search-syntax-col--mean"></colgroup>` +
    `<thead><tr><th scope="col">${headMod}</th><th scope="col">${headEx}</th>` +
    `<th scope="col">${headMean}</th></tr></thead><tbody>${body}</tbody></table>` +
    `<p class="cm-search-syntax-footnote">${footnote}</p>` +
    `<p class="cm-search-syntax-example"><code>${example}</code></p></div>`
  );
}
