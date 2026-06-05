/** django-grid-view — built from frontend/src/grid-view/.ts */

"use strict";
(() => {
  // src/grid-view/dom-utils.ts
  function cssEscape(value) {
    if (typeof CSS !== "undefined" && CSS.escape) {
      return CSS.escape(value);
    }
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function getGlobal() {
    return window;
  }
  function tableGridId(table) {
    var _a, _b, _c, _d;
    return ((_d = (_c = (_b = (_a = table == null ? void 0 : table.closest) == null ? void 0 : _a.call(table, "[data-grid-id]")) == null ? void 0 : _b.dataset) == null ? void 0 : _c.gridId) == null ? void 0 : _d.trim()) || "";
  }
  function queryRecordCounters(table, fallbackRoot) {
    var _a;
    const gridId = tableGridId(table);
    if (gridId) {
      const esc = cssEscape(gridId);
      const scope = ((_a = table == null ? void 0 : table.closest) == null ? void 0 : _a.call(table, ".cm-page-table-layout, .cm-dashboard-page")) || fallbackRoot || document;
      const linked = Array.from(scope.querySelectorAll(`[data-cm-count-for="${esc}"]`));
      if (linked.length) return linked;
    }
    if (!(fallbackRoot == null ? void 0 : fallbackRoot.querySelectorAll)) return [];
    return Array.from(fallbackRoot.querySelectorAll("[data-cm-count]"));
  }

  // src/grid-view/registry.ts
  var _byGridId = /* @__PURE__ */ new Map();
  var _bootByGridId = /* @__PURE__ */ new Map();
  var byId = {
    register(gridId, handle) {
      if (gridId != null && gridId !== "") {
        _byGridId.set(String(gridId), handle);
      }
      return handle;
    },
    get(gridId) {
      var _a;
      if (gridId == null || gridId === "") return null;
      const id = String(gridId);
      if (_byGridId.has(id)) return (_a = _byGridId.get(id)) != null ? _a : null;
      const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const shell = document.querySelector(`[data-grid-id="${esc}"]`);
      if (shell == null ? void 0 : shell._colSettings) return shell._colSettings;
      return null;
    },
    registerBoot(gridId, fn) {
      if (gridId != null && gridId !== "" && typeof fn === "function") {
        _bootByGridId.set(String(gridId), fn);
      }
    },
    boot(gridId) {
      const fn = _bootByGridId.get(String(gridId));
      if (typeof fn === "function") fn();
    }
  };
  function invokeGridAction(gridId, method) {
    const handle = byId.get(gridId != null ? gridId : "");
    const fn = handle == null ? void 0 : handle[method];
    if (typeof fn === "function") {
      fn.call(handle);
    }
  }

  // src/grid-view/i18n.ts
  var catalog = {};
  function initI18n(next) {
    catalog = next || {};
  }
  function t(key, fallback) {
    if (catalog[key] && catalog[key] !== key) return catalog[key];
    if (fallback !== void 0) return fallback;
    return key;
  }
  var i18n = { initI18n, t };

  // src/grid-view/search/smart-query.ts
  var EXCLUDE_PREFIXES = ["-", "\u2212", "\u2013", "\u2014"];
  function isExcludePrefix(ch) {
    return EXCLUDE_PREFIXES.includes(ch);
  }
  function splitOrGroups(raw) {
    const groups = [];
    let buf = "";
    let inQuote = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (ch === '"') {
        inQuote = !inQuote;
        buf += ch;
      } else if (!inQuote && (ch === "/" || ch === "\\" || ch === ",")) {
        const chunk2 = buf.trim();
        if (chunk2) groups.push(chunk2);
        buf = "";
      } else {
        buf += ch;
      }
    }
    const chunk = buf.trim();
    if (chunk) groups.push(chunk);
    return groups;
  }
  function parseGroupAndTerms(group) {
    const terms = [];
    let i = 0;
    const n = group.length;
    while (i < n) {
      while (i < n && group[i] === " ") i += 1;
      if (i >= n) break;
      if (group[i] === "+") {
        i += 1;
        continue;
      }
      let exclude = false;
      if (isExcludePrefix(group[i])) {
        exclude = true;
        i += 1;
      }
      while (i < n && group[i] === " ") i += 1;
      if (i >= n) break;
      if (group[i] === '"') {
        i += 1;
        const start2 = i;
        while (i < n && group[i] !== '"') i += 1;
        const term = group.slice(start2, i);
        if (i < n) i += 1;
        if (term || exclude) terms.push({ term, exclude, quoted: true });
        continue;
      }
      const start = i;
      while (i < n) {
        if (group[i] === '"') break;
        if (group[i] === "+") {
          if (i > start) break;
          i += 1;
          continue;
        }
        if (group[i] === " ") {
          let j = i;
          while (j < n && group[j] === " ") j += 1;
          if (j < n && isExcludePrefix(group[j]) && i > start) break;
          i = j;
          continue;
        }
        i += 1;
      }
      const text = group.slice(start, i).trim();
      if (text) terms.push({ term: text, exclude, quoted: false });
    }
    return terms;
  }
  function tokenizeSmartQuery(text) {
    const raw = String(text != null ? text : "").trim();
    if (!raw) return [];
    return splitOrGroups(raw).map((g) => parseGroupAndTerms(g));
  }
  function parseSmartQuery(text) {
    const raw = String(text != null ? text : "").trim();
    if (!raw) return { terms: [], excludes: [], orGroups: [] };
    const groups = tokenizeSmartQuery(raw);
    const terms = [];
    const excludes = [];
    const orGroups = groups.map(
      (andTerms) => andTerms.map((item) => item.exclude ? `-${item.term}` : item.term).join("+")
    );
    groups.forEach((andTerms, gi) => {
      andTerms.forEach((item) => {
        if (!item.term) return;
        if (item.exclude) excludes.push({ term: item.term, group: gi });
        else terms.push({ term: item.term, group: gi });
      });
    });
    return { terms, excludes, orGroups };
  }

  // src/grid-view/search/column-scope.ts
  function normalizeColumnLabel(text) {
    return String(text != null ? text : "").toLowerCase().replace(/\s+/g, "");
  }
  function columnKeysForHint(hint, columns) {
    const needle = normalizeColumnLabel(hint);
    if (!needle) return [];
    const keys = [];
    for (const col of columns) {
      const label = normalizeColumnLabel(col.label);
      if (label.includes(needle) || label.startsWith(needle)) {
        keys.push(col.key);
      }
    }
    return keys;
  }
  function parseScopedTerm(term, columns) {
    const raw = String(term != null ? term : "").trim();
    if (!raw || raw.indexOf(":") < 0) return { scope: null, inner: raw };
    const idx = raw.indexOf(":");
    const hint = raw.slice(0, idx).trim();
    const inner = raw.slice(idx + 1).trim();
    if (!hint || !inner) return { scope: null, inner: raw };
    if (columnKeysForHint(hint, columns).length) return { scope: hint, inner };
    return { scope: null, inner: raw };
  }
  function cellsForScope(hint, cellsByKey, columns, allCells) {
    if (!hint) return [...allCells];
    const keys = columnKeysForHint(hint, columns);
    if (!keys.length) return [...allCells];
    const scoped = [];
    for (const key of keys) {
      const val = cellsByKey[key];
      if (val) scoped.push(val);
    }
    return scoped;
  }

  // src/grid-view/search/term-match.ts
  var NUMERIC_OPS = [">=", "<=", ">", "<", "="];
  var RANGE_SPLIT = "..";
  function parseNumberForColumnFilter(text) {
    const cleaned = String(text != null ? text : "").replace(/\u00a0/g, " ").replace(/[^\d.,-]/g, "").replace(",", ".");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  function extractNumericValues(text) {
    const hay = String(text != null ? text : "").replace(/\u00a0/g, " ");
    const values = [];
    const pattern = /[\d]+(?:[ \u00a0.,][\d]{3})*(?:[.,][\d]+)?|[\d]+(?:[.,][\d]+)?/g;
    let match;
    while ((match = pattern.exec(hay)) !== null) {
      const chunk = match[0].replace(/[ \u00a0]/g, "");
      const parsed = parseNumberForColumnFilter(chunk);
      if (parsed !== null) values.push(parsed);
    }
    if (!values.length) {
      const parsed = parseNumberForColumnFilter(hay);
      if (parsed !== null) values.push(parsed);
    }
    return values;
  }
  function numericExprMatchesValue(value, query) {
    const q = String(query != null ? query : "").trim();
    const bounds = parseRangeBounds(q);
    if (bounds !== null) return value >= bounds[0] && value <= bounds[1];
    for (const op of NUMERIC_OPS) {
      if (!q.startsWith(op)) continue;
      const right = parseNumberForColumnFilter(q.slice(op.length).trim());
      if (right === null) return false;
      if (op === ">") return value > right;
      if (op === ">=") return value >= right;
      if (op === "<") return value < right;
      if (op === "<=") return value <= right;
      return value === right;
    }
    return false;
  }
  function parseRangeBounds(term) {
    const t2 = String(term != null ? term : "").trim();
    if (t2.indexOf(RANGE_SPLIT) < 0) return null;
    const parts = t2.split(RANGE_SPLIT);
    if (parts.length !== 2) return null;
    const lo = parseNumberForColumnFilter(parts[0]);
    const hi = parseNumberForColumnFilter(parts[1]);
    if (lo === null || hi === null) return null;
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }
  function termIsExpression(term) {
    const t2 = String(term != null ? term : "").trim();
    if (!t2) return false;
    if (parseRangeBounds(t2) !== null) return true;
    for (const op of NUMERIC_OPS) {
      if (t2.startsWith(op)) return t2.slice(op.length).trim().length > 0;
    }
    return t2.indexOf("%") >= 0;
  }
  function hasSmartSyntax(raw) {
    const text = String(raw != null ? raw : "");
    if (text.indexOf('"') >= 0) return true;
    let inQuote = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (!inQuote) {
        if (ch === "/" || ch === "\\" || ch === "," || ch === "+") return true;
        if ((ch === "-" || ch === "\u2212" || ch === "\u2013" || ch === "\u2014") && (i === 0 || text[i - 1] === " " || text[i - 1] === "+")) {
          return true;
        }
      }
    }
    return false;
  }
  function matchColumnExpression(cellText, query) {
    const q = String(query != null ? query : "").trim();
    if (!q) return true;
    const hay = String(cellText != null ? cellText : "").trim();
    const hayFold = hay.toLowerCase();
    const bounds = parseRangeBounds(q);
    if (bounds !== null) {
      const numbers = extractNumericValues(hay);
      if (!numbers.length) return false;
      return numbers.some((val) => val >= bounds[0] && val <= bounds[1]);
    }
    for (const op of NUMERIC_OPS) {
      if (q.startsWith(op)) {
        if (parseNumberForColumnFilter(q.slice(op.length).trim()) === null) return false;
        const numbers = extractNumericValues(hay);
        if (!numbers.length) return false;
        return numbers.some((val) => numericExprMatchesValue(val, q));
      }
    }
    if (q.indexOf("%") >= 0) {
      const pattern = q.toLowerCase();
      if (pattern.charAt(0) === "%" && pattern.charAt(pattern.length - 1) === "%" && pattern.length >= 2) {
        const mid = pattern.slice(1, -1);
        return !!mid && hayFold.indexOf(mid) >= 0;
      }
      if (pattern.charAt(0) === "%") {
        const suffix = pattern.slice(1);
        return !!suffix && hayFold.endsWith(suffix);
      }
      if (pattern.charAt(pattern.length - 1) === "%") {
        const prefix = pattern.slice(0, -1);
        return !!prefix && hayFold.startsWith(prefix);
      }
    }
    return false;
  }
  function literalContains(haystack, term) {
    return haystack.toLowerCase().indexOf(term.toLowerCase()) >= 0;
  }
  function spaceInsensitiveContains(haystack, term) {
    const hayNs = haystack.toLowerCase().replace(/ /g, "");
    const termNs = term.toLowerCase().replace(/ /g, "");
    return !!termNs && hayNs.indexOf(termNs) >= 0;
  }
  function matchQueryTerm(haystack, term, options) {
    const t2 = String(term != null ? term : "").trim();
    if (!t2) return true;
    const hay = String(haystack != null ? haystack : "");
    const quoted = (options == null ? void 0 : options.quoted) === true;
    if (termIsExpression(t2)) return matchColumnExpression(hay, t2);
    if (quoted || t2.indexOf(" ") >= 0) return literalContains(hay, t2);
    return spaceInsensitiveContains(hay, t2);
  }

  // src/grid-view/search/contract.ts
  var SearchProfile = /* @__PURE__ */ ((SearchProfile5) => {
    SearchProfile5["Toolbar"] = "toolbar";
    SearchProfile5["Default"] = "default";
    SearchProfile5["Text"] = "text";
    SearchProfile5["Numeric"] = "numeric";
    SearchProfile5["Nosearch"] = "nosearch";
    return SearchProfile5;
  })(SearchProfile || {});
  var ALL_EXPR = /* @__PURE__ */ new Set([
    "or_sep" /* OrSep */,
    "and" /* And */,
    "exclude" /* Exclude */,
    "quoted" /* Quoted */,
    "plain_text" /* PlainText */,
    "phrase_text" /* PhraseText */,
    "numeric_cmp" /* NumericCmp */,
    "numeric_range" /* NumericRange */,
    "wildcard" /* Wildcard */
  ]);
  var TEXT_TOKENS = /* @__PURE__ */ new Set([
    "or_sep" /* OrSep */,
    "and" /* And */,
    "exclude" /* Exclude */,
    "quoted" /* Quoted */,
    "plain_text" /* PlainText */,
    "phrase_text" /* PhraseText */,
    "wildcard" /* Wildcard */
  ]);
  var NUMERIC_TOKENS = /* @__PURE__ */ new Set([
    "or_sep" /* OrSep */,
    "and" /* And */,
    "exclude" /* Exclude */,
    "numeric_cmp" /* NumericCmp */,
    "numeric_range" /* NumericRange */,
    "wildcard" /* Wildcard */
  ]);
  var TOOLBAR_TOKENS = /* @__PURE__ */ new Set([...ALL_EXPR, "column_scope" /* ColumnScope */]);
  var COLUMN_FILTER_ALIASES = {
    auto: "default",
    standard: "default",
    column_default: "default",
    column_expr: "default",
    column_text: "text",
    column_numeric: "numeric",
    column_nosearch: "nosearch",
    set: "list",
    expr: "default",
    search: "default",
    none: "nosearch"
  };
  var PROFILE_ENABLED = {
    ["toolbar" /* Toolbar */]: TOOLBAR_TOKENS,
    ["default" /* Default */]: ALL_EXPR,
    ["text" /* Text */]: TEXT_TOKENS,
    ["numeric" /* Numeric */]: NUMERIC_TOKENS,
    ["nosearch" /* Nosearch */]: /* @__PURE__ */ new Set()
  };
  var EXPR_OPS = [">=", "<=", ">", "<", "="];
  var TRAILING_MOD = /(?:[+,\/\\]|[\u2212\u2013\u2014-])$/;
  function isHTMLElement(value) {
    return value instanceof HTMLElement;
  }
  function defaultSearchProfile() {
    return "default" /* Default */;
  }
  function resolveColumnFilter(value) {
    const text = String(value != null ? value : "").trim().toLowerCase();
    if (!text) return "default";
    const mapped = COLUMN_FILTER_ALIASES[text];
    if (mapped) return mapped;
    if (text === "default" || text === "text" || text === "numeric" || text === "nosearch" || text === "list") {
      return text;
    }
    return "default";
  }
  function resolveSearchProfile(value) {
    const cf = resolveColumnFilter(value);
    if (cf === "list") return "default" /* Default */;
    if (cf === "nosearch") return "nosearch" /* Nosearch */;
    if (cf === "text") return "text" /* Text */;
    if (cf === "numeric") return "numeric" /* Numeric */;
    if (String(value != null ? value : "").trim().toLowerCase() === "toolbar") return "toolbar" /* Toolbar */;
    return "default" /* Default */;
  }
  function bindSearchProfileForToolbar() {
    return "toolbar" /* Toolbar */;
  }
  function tokenProfileForHeader(th) {
    if (!isHTMLElement(th)) return defaultSearchProfile();
    return resolveSearchProfile(th.dataset.cmColumnFilter || "default");
  }
  function bindSearchProfileForHeader(th) {
    return tokenProfileForHeader(th);
  }
  function classifyTermTokens(term, quoted = false) {
    const tokens = /* @__PURE__ */ new Set();
    if (quoted) {
      tokens.add("quoted" /* Quoted */);
      return tokens;
    }
    const t2 = String(term != null ? term : "").trim();
    if (!t2) return tokens;
    if (t2.indexOf(" ") >= 0) tokens.add("phrase_text" /* PhraseText */);
    if (parseRangeBounds(t2) !== null) tokens.add("numeric_range" /* NumericRange */);
    for (const op of EXPR_OPS) {
      if (t2.startsWith(op) && t2.slice(op.length).trim()) {
        tokens.add("numeric_cmp" /* NumericCmp */);
        break;
      }
    }
    if (t2.indexOf("%") >= 0) tokens.add("wildcard" /* Wildcard */);
    if (!tokens.size) tokens.add("plain_text" /* PlainText */);
    return tokens;
  }
  function classifyQueryTokens(query, options) {
    const raw = String(query != null ? query : "").trim();
    const tokens = /* @__PURE__ */ new Set();
    if (!raw) return tokens;
    if (hasSmartSyntax(raw)) {
      if (/[,/\\]/.test(raw)) tokens.add("or_sep" /* OrSep */);
      if (raw.indexOf("+") >= 0) tokens.add("and" /* And */);
    }
    const columns = options == null ? void 0 : options.columns;
    for (const andTerms of tokenizeSmartQuery(raw)) {
      for (const item of andTerms) {
        if (item.exclude) tokens.add("exclude" /* Exclude */);
        let term = item.term;
        if (columns == null ? void 0 : columns.length) {
          const scoped = parseScopedTerm(term, columns);
          if (scoped.scope) tokens.add("column_scope" /* ColumnScope */);
          term = scoped.inner;
        }
        for (const token of classifyTermTokens(term, item.quoted)) tokens.add(token);
      }
    }
    if (!tokens.size && raw) {
      for (const token of classifyTermTokens(raw)) tokens.add(token);
    }
    return tokens;
  }
  function guardQueryForProfile(query, profile, options) {
    if (profile === "nosearch" /* Nosearch */) {
      return !String(query != null ? query : "").trim();
    }
    const used = classifyQueryTokens(query, options);
    if (!used.size) return true;
    const allowed = PROFILE_ENABLED[profile];
    for (const token of used) {
      if (!allowed.has(token)) return false;
    }
    return true;
  }
  function termIsComplete(term) {
    const t2 = term.trim();
    if (!t2) return false;
    if (t2.includes("..")) return parseRangeBounds(t2) !== null;
    for (const op of EXPR_OPS) {
      if (t2.startsWith(op) && !t2.slice(op.length).trim()) return false;
    }
    return true;
  }
  function syntaxCommitReady(query) {
    const q = String(query != null ? query : "").trim();
    if (!q) return true;
    if (TRAILING_MOD.test(q)) return false;
    if (/^(>=|<=|>|<|=)\s*$/.test(q)) return false;
    if (/\.\.\s*$/.test(q) || /\.\.$/.test(q)) return false;
    if (/^[\d.,]+\.\.\s*$/.test(q)) return false;
    if (hasSmartSyntax(q)) {
      const groups = tokenizeSmartQuery(q);
      if (!groups.length) return false;
      for (const andTerms of groups) {
        if (!andTerms.length) return false;
        for (const item of andTerms) {
          if (!termIsComplete(item.term)) return false;
        }
      }
      return true;
    }
    if (termIsExpression(q)) {
      if (parseRangeBounds(q) !== null) return true;
      for (const op of EXPR_OPS) {
        if (q.startsWith(op)) return q.slice(op.length).trim().length > 0;
      }
    }
    return true;
  }
  function isCommitReadyForProfile(query, profile, options) {
    if (profile === "nosearch" /* Nosearch */) {
      return !String(query != null ? query : "").trim();
    }
    if (!syntaxCommitReady(query)) return false;
    return guardQueryForProfile(query, profile, options);
  }
  function columnFilterPlaceholderKey(profile) {
    if (profile === "numeric" /* Numeric */) return "column_filter.placeholder_numeric";
    if (profile === "text" /* Text */) return "column_filter.placeholder_text";
    return "column_filter.placeholder";
  }

  // src/grid-view/search/match.ts
  function termIsCellScoped(term) {
    const t2 = String(term != null ? term : "").trim();
    return termIsExpression(t2) || t2.indexOf("%") >= 0;
  }
  function numericExprMatchesValue2(value, query) {
    return matchColumnExpression(String(value), query);
  }
  function matchExprTermsOnSameCell(cell, terms) {
    if (!terms.length) return true;
    const numericTerms = terms.filter((t2) => termIsExpression(t2) && t2.indexOf("%") < 0);
    const otherTerms = terms.filter((t2) => numericTerms.indexOf(t2) < 0);
    for (const term of otherTerms) {
      if (!matchColumnExpression(cell, term)) return false;
    }
    if (!numericTerms.length) return true;
    const numbers = extractNumericValues(cell);
    if (!numbers.length) return false;
    return numbers.some(
      (value) => numericTerms.every((term) => numericExprMatchesValue2(value, term))
    );
  }
  function scopedCellsForTerm(term, haystack, cells, cellsByKey, columns, activeScope) {
    var _a, _b;
    if (!cellsByKey || !(columns == null ? void 0 : columns.length)) {
      return { inner: term, scopedCells: cells, activeScope: activeScope != null ? activeScope : null };
    }
    const { scope: hint, inner } = parseScopedTerm(term, columns);
    const scope = (_a = hint != null ? hint : activeScope) != null ? _a : null;
    const nextScope = (_b = hint != null ? hint : activeScope) != null ? _b : null;
    if (!scope) return { inner: term, scopedCells: cells, activeScope: nextScope };
    return {
      inner,
      scopedCells: cellsForScope(scope, cellsByKey, columns, cells),
      activeScope: nextScope
    };
  }
  function innerTermForMatch(term, columns) {
    if (!(columns == null ? void 0 : columns.length)) return term;
    return parseScopedTerm(term, columns).inner;
  }
  function matchSmartGroup(andTerms, haystack, cells, cellsByKey, columns) {
    const positives = andTerms.filter((item) => !item.exclude);
    const excludes = andTerms.filter((item) => item.exclude);
    let activeScope = null;
    for (const item of andTerms) {
      if (item.exclude) continue;
      const { scope } = parseScopedTerm(item.term, columns != null ? columns : []);
      if (scope) activeScope = scope;
    }
    for (const item of excludes) {
      const { inner, scopedCells } = scopedCellsForTerm(
        item.term,
        haystack,
        cells,
        cellsByKey,
        columns,
        activeScope
      );
      if (matchQueryTerm(scopedCells.join(" "), inner, { quoted: item.quoted })) return false;
    }
    if (!positives.length) return true;
    const textTerms = positives.filter(
      (item) => !termIsCellScoped(innerTermForMatch(item.term, columns))
    );
    const exprTerms = positives.filter(
      (item) => termIsCellScoped(innerTermForMatch(item.term, columns))
    );
    for (const item of textTerms) {
      const resolved = scopedCellsForTerm(
        item.term,
        haystack,
        cells,
        cellsByKey,
        columns,
        activeScope
      );
      activeScope = resolved.activeScope;
      if (!matchQueryTerm(resolved.scopedCells.join(" "), resolved.inner, { quoted: item.quoted })) {
        return false;
      }
    }
    if (!exprTerms.length) return true;
    const innerExprs = exprTerms.map((item) => innerTermForMatch(item.term, columns));
    const hasTermScope = exprTerms.some(
      (item) => !!parseScopedTerm(item.term, columns != null ? columns : []).scope
    );
    if (!hasTermScope && !activeScope && exprTerms.length > 1 && innerExprs.every((term) => termIsExpression(term) && term.indexOf("%") < 0)) {
      return cells.some((cell) => matchExprTermsOnSameCell(cell, innerExprs));
    }
    for (const item of exprTerms) {
      const resolved = scopedCellsForTerm(
        item.term,
        haystack,
        cells,
        cellsByKey,
        columns,
        activeScope
      );
      activeScope = resolved.activeScope;
      const matched = resolved.scopedCells.some(
        (cell) => matchQueryTerm(cell, resolved.inner, { quoted: item.quoted })
      );
      if (!matched) return false;
    }
    return true;
  }
  function matchSmartHaystackClient(haystack, query, options) {
    const raw = String(query != null ? query : "").trim();
    if (!raw) return true;
    const hay = String(haystack != null ? haystack : "");
    const cells = (options == null ? void 0 : options.cells) ? [...options.cells] : [hay];
    const groups = tokenizeSmartQuery(raw);
    if (!groups.length) return matchQueryTerm(hay, raw);
    for (const andTerms of groups) {
      if (!andTerms.length) continue;
      if (matchSmartGroup(andTerms, hay, cells, options == null ? void 0 : options.cellsByKey, options == null ? void 0 : options.columns)) {
        return true;
      }
    }
    return false;
  }
  function matchColumnFilter(cellText, query, options) {
    var _a;
    const q = String(query != null ? query : "").trim();
    if (!q) return true;
    const profile = (_a = options == null ? void 0 : options.profile) != null ? _a : defaultSearchProfile();
    if (!guardQueryForProfile(q, profile, {
      columns: options == null ? void 0 : options.columns
    })) {
      return false;
    }
    const hay = String(cellText != null ? cellText : "").trim();
    const cells = (options == null ? void 0 : options.cells) ? [...options.cells] : [hay];
    if (!hasSmartSyntax(q) && termIsExpression(q)) {
      return cells.some((cell) => matchColumnExpression(cell, q));
    }
    return matchSmartHaystackClient(hay, q, options);
  }

  // src/grid-view/search/query-commit.ts
  function isToolbarQueryCommitReady(query, options) {
    return isCommitReadyForProfile(query, bindSearchProfileForToolbar(), options);
  }

  // src/grid-view/search/filter-engine.ts
  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function isSetFilterModel(value) {
    if (!isRecord(value)) return false;
    if (value.mode === "empty" || value.mode === "non_empty") return true;
    return Array.isArray(value.values);
  }
  function isEmptyCellValue(val) {
    const tv = String(val === null || val === void 0 ? "" : val).trim();
    return tv === "" || tv === "-" || tv === "\u2014" || tv === "\u2013" || tv === "[]";
  }
  function normalizeFilterMatch(match) {
    return match === "any_token" ? "any_token" : "exact";
  }
  function cellTokensFromText(cellText, match) {
    const trimmed = String(cellText === null || cellText === void 0 ? "" : cellText).trim();
    if (isEmptyCellValue(trimmed)) return [];
    if (match === "any_token") {
      return trimmed.split(/\s+/).map((t2) => t2.trim()).filter((t2) => !isEmptyCellValue(t2));
    }
    return [trimmed];
  }
  function parseCellFilterTokens(td, match) {
    if (!td) return [];
    if (td.dataset.cmFilterEmpty === "1") return [];
    if (match === "any_token") {
      const raw = td.dataset.cmFilterTokens;
      if (raw !== void 0) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((t2) => String(t2 != null ? t2 : "").trim()).filter((t2) => !isEmptyCellValue(t2));
          }
        } catch (e) {
        }
      }
    }
    const text = (td.dataset.cmSortVal || td.dataset.cmExportRaw || td.textContent || "").trim();
    return cellTokensFromText(text, match);
  }
  function resolveSetFilterTokens(cellText, match, options) {
    if ((options == null ? void 0 : options.tokens) !== void 0) {
      return options.tokens.map((t2) => String(t2).trim()).filter((t2) => !isEmptyCellValue(t2));
    }
    return cellTokensFromText(cellText, match);
  }
  function matchSetFilter(cellText, model, options) {
    var _a;
    if (!model) return true;
    const match = normalizeFilterMatch((_a = options == null ? void 0 : options.match) != null ? _a : "match" in model ? model.match : void 0);
    const tokens = resolveSetFilterTokens(cellText, match, options);
    if ("mode" in model) {
      if (model.mode === "empty") return tokens.length === 0;
      if (model.mode === "non_empty") return tokens.length > 0;
    }
    const values = "values" in model ? model.values : void 0;
    if (Array.isArray(values)) {
      if (!values.length) return false;
      if (!tokens.length) return false;
      const selected = values.map((v) => String(v).trim()).filter((v) => !isEmptyCellValue(v));
      if (match === "any_token") {
        return selected.some((v) => tokens.includes(v));
      }
      return tokens.length === 1 && selected.includes(tokens[0]);
    }
    return true;
  }
  function parseColumnFilterEntry(raw) {
    if (raw === null || raw === void 0) return null;
    if (typeof raw === "string") {
      const text = raw.trim();
      if (!text) return null;
      if (text.startsWith("{")) {
        try {
          const parsed = JSON.parse(text);
          return parseColumnFilterEntry(parsed);
        } catch (e) {
        }
      }
      return text;
    }
    if (!isRecord(raw)) return null;
    const match = normalizeFilterMatch(raw.match);
    if (raw.mode === "empty" || raw.mode === "non_empty") {
      return { mode: raw.mode, match };
    }
    if (Array.isArray(raw.values)) {
      if (raw.values.length === 0) {
        return { values: [], match };
      }
      const values = raw.values.map((v) => String(v != null ? v : "").trim()).filter((v) => !isEmptyCellValue(v));
      if (!values.length) return null;
      return { values, match };
    }
    return null;
  }
  function serializeColumnFilterEntry(entry) {
    if (entry === null || entry === void 0) return "";
    if (typeof entry === "string") return entry.trim();
    return JSON.stringify(entry);
  }
  function matchColumnFilterEntry(cellText, entry, options) {
    if (typeof entry === "string") {
      return matchColumnFilter(cellText, entry, { profile: options == null ? void 0 : options.profile });
    }
    return matchSetFilter(cellText, entry, options);
  }
  function isExprFilterCommitReady(query, th) {
    return isCommitReadyForProfile(query, bindSearchProfileForHeader(th));
  }
  function matchToolbarQuery(haystack, query, options) {
    return matchColumnFilter(haystack, query, {
      ...options,
      profile: bindSearchProfileForToolbar()
    });
  }
  function matchAgGridQuickFilter(haystack, query) {
    if (matchToolbarQuery(haystack, query)) return true;
    const raw = String(query != null ? query : "").trim().toLowerCase();
    if (!raw.includes("-")) return false;
    const hay = String(haystack != null ? haystack : "").toLowerCase();
    return hay.replace(/ /g, "").includes(raw.replace(/-/g, ""));
  }

  // src/grid-view/search/column-filter-state.ts
  function asRoot(scope) {
    return scope && "querySelector" in scope ? scope : document;
  }
  function isHTMLElement2(value) {
    return value instanceof HTMLElement;
  }
  function isStringRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function collectColumnFiltersFromTable(table) {
    const filters = {};
    if (!table) return filters;
    table.querySelectorAll("th[data-cm-col-key]").forEach((el) => {
      const key = el.dataset.cmColKey;
      const val = (el.dataset.cmColFilterValue || "").trim();
      if (key && val) filters[key] = val;
    });
    return filters;
  }
  function collectColumnFiltersObject(scope, tableHint) {
    const root = asRoot(scope);
    const table = (tableHint instanceof HTMLElement && tableHint.matches("[data-cm-table][data-cm-col-filters]") ? tableHint : null) || root.querySelector("[data-cm-table][data-cm-col-filters]");
    return collectColumnFiltersFromTable(table);
  }
  function serializeColumnFilters(scope) {
    const filters = collectColumnFiltersObject(scope);
    const keys = Object.keys(filters);
    if (!keys.length) return "";
    const out = {};
    keys.forEach((key) => {
      const entry = parseColumnFilterEntry(filters[key]);
      if (entry) out[key] = entry;
    });
    return JSON.stringify(out);
  }
  function parseColumnFiltersFromUrl() {
    const raw = new URLSearchParams(window.location.search).get("col_q");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!isStringRecord(parsed)) return {};
      const out = {};
      Object.entries(parsed).forEach(([key, val]) => {
        const entry = parseColumnFilterEntry(val);
        if (entry) out[key] = serializeColumnFilterEntry(entry);
      });
      return out;
    } catch (e) {
      return {};
    }
  }
  function tableFilterShell(el) {
    var _a;
    if (!(el == null ? void 0 : el.closest)) return void 0;
    return el.closest(".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page") || ((_a = el.closest("[data-cm-table]")) == null ? void 0 : _a.closest(".cm-page-table-layout")) || void 0;
  }
  function syncColumnFilterChrome(table) {
    if (!table) return;
    table.querySelectorAll("th[data-cm-col-key]").forEach((el) => {
      const key = el.dataset.cmColKey;
      const active = !!(key && (el.dataset.cmColFilterValue || "").trim());
      const btn = el.querySelector("[data-cm-col-filter-trigger]");
      btn == null ? void 0 : btn.classList.toggle("is-active", active);
      const clearBtn = el.querySelector("[data-cm-col-filter-clear]");
      clearBtn == null ? void 0 : clearBtn.classList.toggle("is-visible", active);
    });
  }
  function headerFilterUi(th) {
    const cf = resolveColumnFilter(isHTMLElement2(th) ? th.dataset.cmColumnFilter : void 0);
    if (cf === "list") return "list";
    if (cf === "nosearch") return "none";
    return "search";
  }
  function headerFilterKind(th) {
    const ui = headerFilterUi(th);
    if (ui === "list") return "set";
    if (ui === "none") return "none";
    return "expr";
  }
  function headerFilterMatch(th) {
    return isHTMLElement2(th) && th.dataset.cmFilterMatch === "any_token" ? "any_token" : "exact";
  }

  // src/grid-view/search/row-haystack.ts
  function cellTextFromTd(td) {
    var _a, _b, _c;
    const raw = (_c = (_b = (_a = td.dataset.cmExportRaw) != null ? _a : td.dataset.cmSortVal) != null ? _b : td.textContent) != null ? _c : "";
    return String(raw).trim();
  }
  function collectRowCellsByKeyFromDom(row) {
    const cells = {};
    row.querySelectorAll("td[data-cm-col-key]").forEach((el) => {
      const key = el.dataset.cmColKey;
      if (!key || el.classList.contains("cm-col-hidden")) return;
      const text = cellTextFromTd(el);
      if (text) cells[key] = text;
    });
    return cells;
  }
  function collectRowCellValuesFromDom(row) {
    const byKey = collectRowCellsByKeyFromDom(row);
    const parts = Object.values(byKey);
    if (!parts.length) {
      row.querySelectorAll("td").forEach((td) => {
        var _a;
        const text = ((_a = td.textContent) != null ? _a : "").trim();
        if (text) parts.push(text);
      });
    }
    return parts;
  }
  function collectSearchColumnsFromTable(table) {
    const cols = [];
    const seen = /* @__PURE__ */ new Set();
    table.querySelectorAll("thead th[data-cm-col-key]").forEach((el) => {
      var _a, _b;
      const key = el.dataset.cmColKey;
      if (!key || el.classList.contains("cm-col-hidden") || seen.has(key)) return;
      seen.add(key);
      const labelEl = el.querySelector(".cm-th-label");
      const label = ((_b = (_a = labelEl == null ? void 0 : labelEl.textContent) != null ? _a : el.textContent) != null ? _b : "").trim();
      cols.push({ key, label });
    });
    return cols;
  }
  function buildRowHaystackFromDom(row) {
    return collectRowCellValuesFromDom(row).join(" ");
  }

  // src/grid-view/search/syntax-tips.ts
  var SEARCH_TIP_ROWS = {
    word: {
      modifierKey: "search.tip_mod_word",
      exampleKey: "search.tip_ex_word",
      meaningKey: "search.tip_mean_word"
    },
    and: { modifierKey: "+", exampleKey: "search.tip_ex_and", meaningKey: "search.tip_mean_and" },
    exclude: {
      modifierKey: "-",
      exampleKey: "search.tip_ex_exclude",
      meaningKey: "search.tip_mean_exclude"
    },
    or: { modifierKey: ",", exampleKey: "search.tip_ex_or", meaningKey: "search.tip_mean_or" },
    column_scope: {
      modifierKey: ":",
      exampleKey: "search.tip_ex_column_scope",
      meaningKey: "search.tip_mean_column_scope"
    },
    compare: {
      modifierKey: "> <",
      exampleKey: "search.tip_ex_compare",
      meaningKey: "search.tip_mean_compare"
    },
    range: { modifierKey: "..", exampleKey: "search.tip_ex_range", meaningKey: "search.tip_mean_range" },
    quote: {
      modifierKey: '"\u2026"',
      exampleKey: "search.tip_ex_quote",
      meaningKey: "search.tip_mean_quote"
    },
    phrase: {
      modifierKey: "search.tip_mod_phrase",
      exampleKey: "search.tip_ex_phrase",
      meaningKey: "search.tip_mean_phrase"
    },
    wildcard: {
      modifierKey: "%",
      exampleKey: "search.tip_ex_wildcard",
      meaningKey: "search.tip_mean_wildcard"
    }
  };
  var PROFILE_TIP_ROW_IDS = {
    ["toolbar" /* Toolbar */]: [
      "word",
      "and",
      "exclude",
      "or",
      "column_scope",
      "compare",
      "range",
      "quote",
      "phrase"
    ],
    ["default" /* Default */]: [
      "word",
      "and",
      "exclude",
      "or",
      "compare",
      "range",
      "quote",
      "phrase",
      "wildcard"
    ],
    ["text" /* Text */]: ["word", "and", "exclude", "or", "quote", "phrase", "wildcard"],
    ["numeric" /* Numeric */]: ["compare", "range", "and", "or", "wildcard"],
    ["nosearch" /* Nosearch */]: []
  };
  function tipRowIdsForProfile(profile) {
    var _a;
    return (_a = PROFILE_TIP_ROW_IDS[profile]) != null ? _a : PROFILE_TIP_ROW_IDS["default" /* Default */];
  }

  // src/grid-view/search-syntax-tip-html.ts
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function tipCellText(keyOrLiteral) {
    if (keyOrLiteral.startsWith("search.")) {
      return escapeHtml(i18n.t(keyOrLiteral, keyOrLiteral));
    }
    return escapeHtml(keyOrLiteral);
  }
  function buildSearchSyntaxTipHtml(profile) {
    const rowIds = tipRowIdsForProfile(profile);
    const headMod = escapeHtml(i18n.t("search.tip_col_modifier", "Modifier"));
    const headEx = escapeHtml(i18n.t("search.tip_col_example", "Example"));
    const headMean = escapeHtml(i18n.t("search.tip_col_meaning", "Meaning"));
    const body = rowIds.map((id) => {
      const row = SEARCH_TIP_ROWS[id];
      if (!row) return "";
      const mod = tipCellText(row.modifierKey);
      const ex = tipCellText(row.exampleKey);
      const mean = escapeHtml(i18n.t(row.meaningKey, row.meaningKey));
      return `<tr><td><code>${mod}</code></td><td><code>${ex}</code></td><td>${mean}</td></tr>`;
    }).join("");
    const footnote = escapeHtml(
      i18n.t("search.tip_quote_hint", "Wrap the expression in double quotes to disable modifiers")
    );
    const example = escapeHtml(
      i18n.t("search.tip_quote_example", '"search -1 +2", word2')
    );
    return `<div class="cm-search-syntax-tip"><table class="cm-search-syntax-table"><colgroup><col class="cm-search-syntax-col--mod"><col class="cm-search-syntax-col--ex"><col class="cm-search-syntax-col--mean"></colgroup><thead><tr><th scope="col">${headMod}</th><th scope="col">${headEx}</th><th scope="col">${headMean}</th></tr></thead><tbody>${body}</tbody></table><p class="cm-search-syntax-footnote">${footnote}</p><p class="cm-search-syntax-example"><code>${example}</code></p></div>`;
  }

  // src/grid-view/search-help-ui.ts
  var INFO_ICON = '<svg class="cm-search-help-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="8" r="1.35" fill="currentColor" stroke="none"/><path d="M12 11v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function bindSearchSyntaxHelp(btn) {
    if (btn.dataset.cmSearchHelpBound === "1") return;
    btn.dataset.cmSearchHelpBound = "1";
    btn.classList.add("cm-tip-host");
    btn.removeAttribute("title");
  }
  function refreshSearchSyntaxHelp(btn, profile) {
    let tip = btn.querySelector(".cm-ellipsis-tip--search-help");
    if (!(tip instanceof HTMLElement)) {
      tip = document.createElement("span");
      tip.className = "cm-ellipsis-tip cm-ellipsis-tip--search-help";
      tip.setAttribute("role", "tooltip");
      btn.appendChild(tip);
    }
    tip.innerHTML = buildSearchSyntaxTipHtml(profile);
    bindSearchSyntaxHelp(btn);
  }
  function appendSearchSyntaxHelp(container, profile = "default" /* Default */) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cm-search-help-btn cm-tip-host";
    btn.dataset.cmTipProfile = profile;
    btn.setAttribute(
      "aria-label",
      i18n.t("search.syntax_help", "Search syntax help")
    );
    btn.innerHTML = INFO_ICON;
    container.appendChild(btn);
    refreshSearchSyntaxHelp(btn, profile);
    return btn;
  }
  function initSearchSyntaxHelp(scope) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll(".cm-search-help-btn").forEach((node) => {
      var _a, _b;
      if (!(node instanceof HTMLElement)) return;
      const closestHost = node.closest("[data-cm-tip-profile]");
      const host = closestHost instanceof HTMLElement ? closestHost : null;
      const profile = resolveSearchProfile(
        (_b = (_a = host == null ? void 0 : host.dataset.cmTipProfile) != null ? _a : node.dataset.cmTipProfile) != null ? _b : "toolbar" /* Toolbar */
      );
      refreshSearchSyntaxHelp(node, profile);
    });
  }

  // src/grid-view/table-cell-ui.ts
  var BTN_TIP_SCOPE = ".cm-table, .cm-toolbar, .cm-toolbar-unified, .cm-toolbar-search, .cm-toolbar-search-actions, .cm-toolbar-search-saved-actions, [data-cm-toolbar-search-root], .cm-export-group, [data-cm-column-settings]";
  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }
  function isElementTruncated(el) {
    return el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
  }
  function measureTextWidth(el, text) {
    const style = getComputedStyle(el);
    const span = document.createElement("span");
    span.style.cssText = [
      "position:fixed",
      "visibility:hidden",
      "white-space:nowrap",
      "top:0",
      "left:0",
      `font:${style.font}`,
      `font-size:${style.fontSize}`,
      `font-weight:${style.fontWeight}`,
      `letter-spacing:${style.letterSpacing}`,
      `text-transform:${style.textTransform}`
    ].join(";");
    span.textContent = text;
    document.body.appendChild(span);
    const width = span.offsetWidth;
    span.remove();
    return width;
  }
  function isHeaderLabelTruncated(label, text) {
    if (isElementTruncated(label)) return true;
    if (label.clientWidth <= 0) return false;
    return measureTextWidth(label, text) > label.clientWidth + 1;
  }
  function headerInnerScrollWidth(th) {
    const inner = th.querySelector(".cm-th-inner");
    if (inner instanceof HTMLElement) return inner.scrollWidth;
    return th.scrollWidth;
  }
  function bindHeaderHoverExpand(table) {
    if (table.dataset.cmHeaderExpandBound) return;
    table.dataset.cmHeaderExpandBound = "1";
    table.querySelectorAll("thead th.cm-th-filterable[data-cm-col-key]").forEach(function(th) {
      if (!(th instanceof HTMLElement)) return;
      const label = th.querySelector(".cm-th-label");
      if (!(label instanceof HTMLElement)) return;
      if (!th.dataset.cmColKey) return;
      let restoreMinWidth = "";
      const expand = function() {
        window.requestAnimationFrame(function() {
          const need = headerInnerScrollWidth(th) + 4;
          const current = th.getBoundingClientRect().width;
          if (need <= current + 1) return;
          if (!restoreMinWidth) {
            restoreMinWidth = th.style.minWidth;
          }
          th.style.minWidth = `${Math.max(need, current)}px`;
          refreshHeaderLabels(table);
        });
      };
      const collapse = function(e) {
        if (!restoreMinWidth && !th.style.minWidth) return;
        const next = e.relatedTarget;
        if (next instanceof Node && th.contains(next)) return;
        th.style.minWidth = restoreMinWidth;
        restoreMinWidth = "";
        refreshHeaderLabels(table);
      };
      label.addEventListener("mouseenter", expand);
      label.addEventListener("mouseleave", collapse);
      th.addEventListener("mouseenter", expand);
      th.addEventListener("mouseleave", collapse);
    });
  }
  function cellFullText(td) {
    const raw = (td.dataset.cmExportRaw || "").trim();
    if (raw) return raw;
    const valueEl = td.querySelector("[data-cm-cell-value], .cm-cell");
    if (valueEl) return normalizeText(valueEl.textContent || "");
    const link = td.querySelector("a.cm-link");
    if (link) return normalizeText(link.textContent || "");
    return normalizeText(td.textContent || "");
  }
  function cellVisibleText(td) {
    const valueEl = td.querySelector("[data-cm-cell-value], .cm-cell");
    if (valueEl) return normalizeText(valueEl.textContent || "");
    const link = td.querySelector("a.cm-link");
    if (link) return normalizeText(link.textContent || "");
    return normalizeText(td.textContent || "");
  }
  function overflowTarget(td) {
    const inner = td.querySelector("[data-cm-cell-value], .cm-cell");
    if (inner instanceof HTMLElement) return inner;
    return td;
  }
  function isWrapColumn(td) {
    return td.hasAttribute("data-cm-wrap");
  }
  function isTruncatedCell(td) {
    if (isWrapColumn(td)) return false;
    const full = cellFullText(td);
    if (!full) return false;
    const visible = cellVisibleText(td);
    if (visible && full !== visible && full.length > visible.length) return true;
    if (visible.endsWith("\u2026") || visible.endsWith("...")) return true;
    const target = overflowTarget(td);
    if (target instanceof HTMLElement && isElementTruncated(target)) return true;
    return isElementTruncated(td);
  }
  function isInteractiveValueCell(td) {
    if (td.querySelector("a.cm-link[href]")) return true;
    if (td.querySelector("button:not([disabled])")) return true;
    if (td.querySelector("textarea")) return true;
    const select = td.querySelector("select");
    if (select instanceof HTMLSelectElement) {
      if (select.hasAttribute("data-cm-inline-edit")) {
        return td.closest("[data-cm-inline-edit-active]") !== null;
      }
      return true;
    }
    return false;
  }
  function copyText(text) {
    var _a;
    if (!text) return;
    if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
      void navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  }
  var COPY_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  function ensureValueWrap(td) {
    var _a;
    const existing = td.querySelector(":scope > .cm-cell-value-wrap");
    if (existing instanceof HTMLElement) return existing;
    const valueHost = td.querySelector(":scope > [data-cm-cell-value], :scope > .cm-cell");
    if (valueHost instanceof HTMLElement) {
      const wrap = document.createElement("span");
      wrap.className = "cm-cell-value-wrap";
      (_a = valueHost.parentNode) == null ? void 0 : _a.insertBefore(wrap, valueHost);
      wrap.appendChild(valueHost);
      return wrap;
    }
    if (td.querySelector("button, select, a.cm-link")) return null;
    return null;
  }
  function syncValueCellChrome(td, wrap) {
    const truncated = isTruncatedCell(td);
    wrap.classList.toggle("cm-cell-is-truncated", truncated);
    let tip = wrap.querySelector(".cm-ellipsis-tip");
    if (!truncated) {
      tip == null ? void 0 : tip.remove();
      return;
    }
    const full = cellFullText(td);
    if (!(tip instanceof HTMLElement)) {
      tip = document.createElement("span");
      tip.className = "cm-ellipsis-tip cm-ellipsis-tip--start";
      tip.setAttribute("role", "tooltip");
      wrap.appendChild(tip);
    }
    tip.textContent = full;
  }
  function enhanceValueCell(td) {
    if (isWrapColumn(td)) return;
    if (isInteractiveValueCell(td)) return;
    if (!td.querySelector(":scope > .cm-cell") && !td.querySelector(":scope > [data-cm-cell-value]")) return;
    const full = cellFullText(td);
    if (!full) return;
    const wrap = ensureValueWrap(td);
    if (!wrap) return;
    if (!td.dataset.cmValueHoverBound) {
      td.dataset.cmValueHoverBound = "1";
      td.classList.add("cm-cell-has-value-hover");
      const copyLabel = i18n.t("cell_link.copy", "Copy value");
      const actions = document.createElement("span");
      actions.className = "cm-cell-value-actions";
      actions.dataset.cmCellValueActions = "1";
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "cm-cell-link-action";
      copyBtn.title = copyLabel;
      copyBtn.setAttribute("aria-label", copyLabel);
      copyBtn.innerHTML = COPY_ICON;
      copyBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        copyText(cellFullText(td));
      });
      actions.appendChild(copyBtn);
      wrap.appendChild(actions);
    }
    syncValueCellChrome(td, wrap);
  }
  function enhanceLinkCell(td, link) {
    var _a;
    if (td.dataset.cmLinkActionsBound) return;
    const href = (link.getAttribute("href") || "").trim();
    if (!href || href === "#") return;
    td.dataset.cmLinkActionsBound = "1";
    td.classList.add("cm-cell-has-link");
    let wrap = link.parentElement;
    if (!(wrap instanceof HTMLElement) || !wrap.classList.contains("cm-cell-link-wrap")) {
      wrap = document.createElement("span");
      wrap.className = "cm-cell-link-wrap";
      (_a = link.parentNode) == null ? void 0 : _a.insertBefore(wrap, link);
      wrap.appendChild(link);
    }
    if (wrap.querySelector("[data-cm-cell-link-actions]")) return;
    const actions = document.createElement("span");
    actions.className = "cm-cell-link-actions";
    actions.dataset.cmCellLinkActions = "1";
    const copyLabel = i18n.t("cell_link.copy", "Copy value");
    const openLabel = i18n.t("cell_link.open", "Open in new window");
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cm-cell-link-action";
    copyBtn.dataset.cmCopyValue = "1";
    copyBtn.title = copyLabel;
    copyBtn.setAttribute("aria-label", copyLabel);
    copyBtn.innerHTML = COPY_ICON;
    const openBtn = document.createElement("a");
    openBtn.className = "cm-cell-link-action";
    openBtn.href = href;
    openBtn.target = "_blank";
    openBtn.rel = "noopener noreferrer";
    openBtn.title = openLabel;
    openBtn.setAttribute("aria-label", openLabel);
    openBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    copyBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const val = (td.dataset.cmExportRaw || link.textContent || "").trim() || (link.getAttribute("href") || "").trim();
      copyText(val);
    });
    openBtn.addEventListener("click", function(e) {
      e.stopPropagation();
    });
    actions.appendChild(copyBtn);
    actions.appendChild(openBtn);
    wrap.appendChild(actions);
  }
  function headerLabelText(label) {
    const stored = label.dataset.cmLabelText;
    if (stored) return normalizeText(stored);
    const text = normalizeText(label.textContent || "");
    if (text) label.dataset.cmLabelText = text;
    return text;
  }
  function refreshHeaderLabels(table) {
    table.querySelectorAll(".cm-th-label").forEach(function(label) {
      var _a, _b;
      if (!(label instanceof HTMLElement)) return;
      const text = headerLabelText(label);
      label.removeAttribute("title");
      if (!text) {
        label.classList.remove("cm-th-label--truncated");
        label.classList.remove("cm-tip-host");
        (_a = label.querySelector(".cm-ellipsis-tip")) == null ? void 0 : _a.remove();
        return;
      }
      if (isHeaderLabelTruncated(label, text)) {
        label.classList.add("cm-th-label--truncated");
        label.classList.add("cm-tip-host");
        let tip = label.querySelector(".cm-ellipsis-tip");
        if (!(tip instanceof HTMLElement)) {
          tip = document.createElement("span");
          tip.className = "cm-ellipsis-tip cm-ellipsis-tip--center";
          tip.setAttribute("role", "tooltip");
          label.appendChild(tip);
        }
        tip.textContent = text;
      } else {
        label.classList.remove("cm-th-label--truncated", "cm-tip-host");
        (_b = label.querySelector(".cm-ellipsis-tip")) == null ? void 0 : _b.remove();
      }
    });
  }
  function refreshTableCells(table) {
    table.querySelectorAll("tbody td[data-cm-col-key]").forEach(function(td) {
      if (!(td instanceof HTMLTableCellElement)) return;
      if (td.classList.contains("cm-col-hidden")) return;
      const link = td.querySelector("a.cm-link[href]");
      if (link instanceof HTMLAnchorElement) {
        enhanceLinkCell(td, link);
        return;
      }
      enhanceValueCell(td);
    });
  }
  function refreshTableCellOverflowActions(table) {
    if (table instanceof HTMLTableElement) {
      refreshTableCells(table);
      refreshHeaderLabels(table);
    }
  }
  function refreshTableCellTooltips(table) {
    refreshTableCellOverflowActions(table);
  }
  function refreshTableHeaderTooltips(table) {
    if (table instanceof HTMLTableElement) refreshHeaderLabels(table);
  }
  var LARGE_TABLE_ROW_THRESHOLD = 120;
  function refreshLinkCells(table) {
    table.querySelectorAll("tbody td[data-cm-col-key]").forEach(function(td) {
      if (!(td instanceof HTMLTableCellElement)) return;
      if (td.classList.contains("cm-col-hidden")) return;
      const link = td.querySelector("a.cm-link[href]");
      if (link instanceof HTMLAnchorElement) enhanceLinkCell(td, link);
    });
  }
  function observeTableCellUi(table) {
    if (table.dataset.cmCellUiObserved) return;
    table.dataset.cmCellUiObserved = "1";
    const rowCount = table.querySelectorAll("tbody tr.cm-row").length;
    const isLarge = rowCount > LARGE_TABLE_ROW_THRESHOLD;
    bindHeaderHoverExpand(table);
    const runInit = function() {
      if (isLarge) {
        refreshHeaderLabels(table);
        refreshLinkCells(table);
        return;
      }
      refreshTableCells(table);
      refreshHeaderLabels(table);
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(runInit, { timeout: 800 });
    } else {
      window.setTimeout(runInit, 0);
    }
    if (isLarge) return;
    let resizeTimer = 0;
    const onResize = function() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function() {
        refreshHeaderLabels(table);
        table.querySelectorAll("tbody td[data-cm-col-key]").forEach(function(td) {
          if (!(td instanceof HTMLTableCellElement)) return;
          const wrap = td.querySelector(":scope > .cm-cell-value-wrap");
          if (wrap instanceof HTMLElement && td.dataset.cmValueHoverBound) {
            syncValueCellChrome(td, wrap);
          }
        });
      }, 150);
    };
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(onResize);
      ro.observe(table);
    }
  }
  function initTableHeaderTooltips(scope) {
    var _a;
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll("[data-cm-table]").forEach(function(table) {
      if (table instanceof HTMLTableElement) observeTableCellUi(table);
    });
    (_a = document.getElementById("cm-cell-overflow-popover")) == null ? void 0 : _a.remove();
  }
  function tipSourceText(el) {
    const title = (el.getAttribute("title") || "").trim();
    if (title) return title;
    return (el.getAttribute("aria-label") || "").trim();
  }
  function tipPositionClass(el) {
    if (el.classList.contains("cm-search-help-btn")) {
      return "cm-ellipsis-tip cm-ellipsis-tip--start";
    }
    return "cm-ellipsis-tip cm-ellipsis-tip--center";
  }
  function bindButtonEllipsisTip(el) {
    if (el.dataset.cmBtnTipBound === "1") return;
    let tip = el.querySelector(":scope > .cm-ellipsis-tip");
    const preset = tip instanceof HTMLElement ? (tip.textContent || "").trim() : "";
    const text = preset || tipSourceText(el);
    if (!text) return;
    el.dataset.cmBtnTipBound = "1";
    if (!preset) el.dataset.cmBtnTipText = text;
    el.removeAttribute("title");
    el.classList.add("cm-tip-host");
    if (!(tip instanceof HTMLElement)) {
      tip = document.createElement("span");
      tip.className = tipPositionClass(el);
      tip.setAttribute("role", "tooltip");
      el.appendChild(tip);
      tip.textContent = text;
    }
  }
  function initButtonEllipsisTips(scope) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    const selector = [
      `${BTN_TIP_SCOPE} button[title]`,
      `${BTN_TIP_SCOPE} a[title]`,
      `${BTN_TIP_SCOPE} button[aria-label]`,
      `${BTN_TIP_SCOPE} a[aria-label]`
    ].join(", ");
    root.querySelectorAll(selector).forEach(function(node) {
      if (!(node instanceof HTMLElement)) return;
      if (node.closest(".cm-col-resize-handle")) return;
      if (node.classList.contains("cm-search-help-btn")) return;
      bindButtonEllipsisTip(node);
    });
  }
  function initTableCellUi(scope) {
    initTableHeaderTooltips(scope);
    initButtonEllipsisTips(scope);
    initSearchSyntaxHelp(scope);
  }

  // src/grid-view/simple-table-column-resize.ts
  var MIN_COL_WIDTH = 28;
  function leafHeaderCells(table) {
    const rows = table.querySelectorAll("thead tr");
    const row = rows.length ? rows[rows.length - 1] : null;
    if (!row) return [];
    return [...row.querySelectorAll("th[data-cm-col-key]")].filter(
      (th) => th instanceof HTMLElement
    );
  }
  function ensureColgroup(table) {
    if (table.querySelector("colgroup[data-cm-colgroup]")) return;
    const headers = leafHeaderCells(table);
    if (!headers.length) return;
    const cg = document.createElement("colgroup");
    cg.dataset.cmColgroup = "1";
    headers.forEach(function(th) {
      var _a, _b;
      const key = th.dataset.cmColKey;
      if (!key) return;
      const col = document.createElement("col");
      col.dataset.cmColKey = key;
      const width = th.style.width || ((_b = (_a = th.getAttribute("style")) == null ? void 0 : _a.match(/width:\s*([^;]+)/)) == null ? void 0 : _b[1]);
      if (width) col.style.width = width.trim();
      cg.appendChild(col);
    });
    table.insertBefore(cg, table.firstChild);
  }
  function colElementForKey(table, colKey) {
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const col = table.querySelector('colgroup col[data-cm-col-key="' + esc + '"]');
    return col instanceof HTMLTableColElement ? col : null;
  }
  function setColumnWidthPx(table, colKey, widthPx) {
    const w = Math.max(MIN_COL_WIDTH, Math.round(widthPx));
    const px = w + "px";
    table.classList.add("cm-table--has-col-widths");
    const col = colElementForKey(table, colKey);
    if (col) {
      col.style.width = px;
    }
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const th = table.querySelector('thead [data-cm-col-key="' + esc + '"]');
    if (th instanceof HTMLElement) {
      th.style.width = px;
      th.dataset.cmColWidth = String(w);
    }
  }
  function readColumnWidthPx(table, colKey) {
    const col = colElementForKey(table, colKey);
    const raw = (col == null ? void 0 : col.style.width) || "";
    const m = raw.match(/^(\d+(?:\.\d+)?)px$/);
    if (m) return parseFloat(m[1]);
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const th = table.querySelector('thead [data-cm-col-key="' + esc + '"]');
    if (th instanceof HTMLElement && th.dataset.cmColWidth) {
      const n = parseFloat(th.dataset.cmColWidth);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  function storageKeyForTable(table) {
    var _a;
    const closestShell = table.closest("[data-grid-id]");
    const shell = closestShell instanceof HTMLElement ? closestShell : null;
    const gridId = ((_a = shell == null ? void 0 : shell.dataset) == null ? void 0 : _a.gridId) || table.id || "table";
    return "cmColWidths_" + gridId;
  }
  function saveWidthsFallback(table) {
    const widths = {};
    leafHeaderCells(table).forEach(function(th) {
      const key = th.dataset.cmColKey;
      if (!key) return;
      const w = readColumnWidthPx(table, key);
      if (w !== null) widths[key] = w;
    });
    try {
      localStorage.setItem(storageKeyForTable(table), JSON.stringify(widths));
    } catch (e) {
    }
  }
  function persistColumnWidths(table) {
    saveWidthsFallback(table);
    const shell = table.closest('[data-cm-column-settings="1"]');
    const host = shell == null ? void 0 : shell._colSettings;
    if (host && typeof host.saveState === "function") {
      host.saveState();
    }
  }
  function bindResizeHandle(table, handle, colKey) {
    if (handle.dataset.cmColResizeBound) return;
    handle.dataset.cmColResizeBound = "1";
    handle.addEventListener("mousedown", function(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const thNode = table.querySelector('thead [data-cm-col-key="' + esc + '"]');
      if (!(thNode instanceof HTMLElement)) return;
      const headerTh = thNode;
      const startX = e.clientX;
      const startW = headerTh.getBoundingClientRect().width;
      document.body.classList.add("cm-col-resize-active");
      table.classList.add("cm-table--resizing");
      headerTh.classList.add("cm-col-resize-active");
      let moveRefreshTimer = 0;
      function onMove(ev) {
        setColumnWidthPx(table, colKey, startW + (ev.clientX - startX));
        window.clearTimeout(moveRefreshTimer);
        moveRefreshTimer = window.setTimeout(function() {
          refreshTableHeaderTooltips(table);
          refreshTableCellTooltips(table);
        }, 50);
      }
      function onUp() {
        document.body.classList.remove("cm-col-resize-active");
        table.classList.remove("cm-table--resizing");
        headerTh.classList.remove("cm-col-resize-active");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        persistColumnWidths(table);
        refreshTableHeaderTooltips(table);
        refreshTableCellTooltips(table);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }
  function bindTableColumnResize(table) {
    if (table.dataset.cmColResizeBound) return;
    table.dataset.cmColResizeBound = "1";
    ensureColgroup(table);
    leafHeaderCells(table).forEach(function(th) {
      const key = th.dataset.cmColKey;
      if (!key) return;
      if (!th.querySelector("[data-cm-col-resize]")) {
        const handle2 = document.createElement("span");
        handle2.className = "cm-col-resize-handle";
        handle2.dataset.cmColResize = "1";
        handle2.setAttribute("role", "separator");
        handle2.setAttribute("aria-orientation", "vertical");
        handle2.title = "";
        th.appendChild(handle2);
      }
      const handle = th.querySelector("[data-cm-col-resize]");
      if (handle instanceof HTMLElement) bindResizeHandle(table, handle, key);
    });
  }
  function initSimpleTableColumnResize(scope) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll('[data-cm-column-settings="1"] [data-cm-table]').forEach(function(table) {
      if (table instanceof HTMLTableElement) bindTableColumnResize(table);
    });
  }

  // src/grid-view/resolve-chart.ts
  var PALETTE = ["#22c55e", "#f59e0b", "#ef4444"];
  function parseNumber(value) {
    if (value === null || value === void 0 || value === "") return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function paletteColor(index) {
    var _a;
    return (_a = PALETTE[index % PALETTE.length]) != null ? _a : PALETTE[0];
  }
  function aggregateGrouped(rows, groupBy, valueKey, aggregate) {
    var _a, _b;
    const buckets = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const label = String((_a = row[groupBy]) != null ? _a : "");
      const parsed = parseNumber(row[valueKey]);
      if (parsed === null) continue;
      const bucket = (_b = buckets.get(label)) != null ? _b : [];
      bucket.push(parsed);
      buckets.set(label, bucket);
    }
    const result = [];
    for (const [label, values] of buckets.entries()) {
      let value = 0;
      if (aggregate === "count") value = values.length;
      else if (aggregate === "avg") value = values.reduce((a, b) => a + b, 0) / values.length;
      else if (aggregate === "min") value = Math.min(...values);
      else if (aggregate === "max") value = Math.max(...values);
      else value = values.reduce((a, b) => a + b, 0);
      result.push({ label, value });
    }
    return result;
  }
  function resolvePieOrDonut(spec, rows) {
    var _a, _b, _c, _d;
    const labelKey = (_a = spec.label_key) != null ? _a : "label";
    const valueKey = (_b = spec.value_key) != null ? _b : "value";
    const slices = [];
    let sliceIndex = 0;
    for (const row of rows) {
      const parsed = parseNumber(row[valueKey]);
      const value = parsed === null ? 0 : parsed;
      if (value <= 0) continue;
      const rawColor = row.color;
      const color = typeof rawColor === "string" && rawColor ? rawColor : paletteColor(sliceIndex);
      slices.push({ label: String((_c = row[labelKey]) != null ? _c : ""), value, color });
      sliceIndex += 1;
    }
    return {
      chartType: spec.chart_type,
      categories: [],
      series: [],
      slices,
      overlay: (_d = spec.overlay) != null ? _d : null
    };
  }
  function resolveSeriesChart(spec, rows) {
    var _a, _b, _c;
    const categoryKey = (_a = spec.x_key) != null ? _a : "label";
    const categories = rows.map((row) => {
      var _a2;
      return String((_a2 = row[categoryKey]) != null ? _a2 : "");
    });
    const series = ((_b = spec.series) != null ? _b : []).map((seriesSpec) => {
      var _a2, _b2;
      const values = rows.map((row) => {
        if (spec.tooltip_kind === "packages" && seriesSpec.key === "included" && row._loss_mode) {
          return 0;
        }
        const parsed = parseNumber(row[seriesSpec.key]);
        return parsed === null ? 0 : parsed;
      });
      return {
        name: (_a2 = seriesSpec.label) != null ? _a2 : seriesSpec.key,
        values,
        color: (_b2 = seriesSpec.color) != null ? _b2 : null
      };
    });
    return {
      chartType: spec.chart_type,
      categories,
      series,
      slices: [],
      overlay: (_c = spec.overlay) != null ? _c : null
    };
  }
  function resolveGroupedChart(spec, rows) {
    var _a, _b, _c, _d;
    const groupBy = (_a = spec.group_by) != null ? _a : "label";
    const valueKey = (_b = spec.value_key) != null ? _b : "value";
    const aggregate = (_c = spec.aggregate) != null ? _c : "sum";
    const aggregated = aggregateGrouped(rows, groupBy, valueKey, aggregate);
    return {
      chartType: spec.chart_type,
      categories: aggregated.map((row) => row.label),
      series: [
        {
          name: valueKey,
          values: aggregated.map((row) => row.value),
          color: null
        }
      ],
      slices: [],
      overlay: (_d = spec.overlay) != null ? _d : null
    };
  }
  function resolveSimpleValueChart(spec, rows) {
    var _a, _b, _c;
    const categoryKey = (_a = spec.x_key) != null ? _a : "label";
    const valueKey = (_b = spec.value_key) != null ? _b : "value";
    const categories = rows.map((row) => {
      var _a2;
      return String((_a2 = row[categoryKey]) != null ? _a2 : "");
    });
    const values = rows.map((row) => {
      const parsed = parseNumber(row[valueKey]);
      return parsed === null ? 0 : parsed;
    });
    return {
      chartType: spec.chart_type,
      categories,
      series: [{ name: valueKey, values, color: null }],
      slices: [],
      overlay: (_c = spec.overlay) != null ? _c : null
    };
  }
  function resolveChartData(spec, rows) {
    var _a;
    if (spec.chart_type === "pie" || spec.chart_type === "donut") {
      return resolvePieOrDonut(spec, rows);
    }
    if ((_a = spec.series) == null ? void 0 : _a.length) {
      return resolveSeriesChart(spec, rows);
    }
    if (spec.group_by) {
      return resolveGroupedChart(spec, rows);
    }
    return resolveSimpleValueChart(spec, rows);
  }
  function resolveChartDataFromRuntime(config, rows) {
    var _a, _b, _c, _d, _e, _f;
    const bind = (_a = config.bind) != null ? _a : {};
    const spec = {
      id: (_b = config.id) != null ? _b : "chart",
      chart_type: (_c = config.chartType) != null ? _c : "bar",
      x_key: (_d = bind.xKey) != null ? _d : void 0,
      label_key: bind.labelKey,
      value_key: bind.valueKey,
      group_by: bind.groupBy,
      aggregate: bind.aggregate,
      stacked: bind.stacked,
      tooltip_kind: bind.tooltipKind,
      overlay: config.overlay,
      series: ((_e = bind.series) != null ? _e : []).map((seriesDef) => {
        var _a2;
        return {
          key: (_a2 = seriesDef.key) != null ? _a2 : "",
          label: seriesDef.label,
          color: seriesDef.color,
          series_type: seriesDef.seriesType
        };
      })
    };
    const dataRows = (_f = bind.rows) != null ? _f : rows;
    return resolveChartData(spec, dataRows);
  }

  // src/grid-view/charts.ts
  function chartRowsHaveData(rows) {
    if (!Array.isArray(rows) || !rows.length) return false;
    return rows.some(function(row) {
      if (!row || typeof row !== "object") return false;
      return Object.keys(row).some(function(key) {
        if (key === "name" || key === "label" || key === "color") return false;
        var n = num(row[key]);
        return n !== null && n !== 0;
      });
    });
  }
  function setChartEmptyState(wrap, isEmpty) {
    var _a, _b;
    if (!wrap) return;
    var plates = wrap.querySelectorAll("[data-cm-chart-empty]");
    var roots = wrap.querySelectorAll("[data-cm-chart-root]");
    if (!plates.length && ((_a = wrap.matches) == null ? void 0 : _a.call(wrap, "[data-cm-chart-empty]"))) {
      plates = [wrap];
    }
    if (!roots.length && ((_b = wrap.matches) == null ? void 0 : _b.call(wrap, "[data-cm-chart-root]"))) {
      roots = [wrap];
    }
    plates.forEach((plate) => {
      if (!plate.textContent.trim()) {
        plate.textContent = i18n.t("chart.empty", "Data not loaded");
      }
      plate.classList.toggle("is-hidden", !isEmpty);
      plate.hidden = !isEmpty;
      plate.style.display = isEmpty ? "" : "none";
    });
    roots.forEach((root) => {
      root.classList.toggle("is-hidden", isEmpty);
      root.hidden = isEmpty;
      root.style.visibility = isEmpty ? "hidden" : "";
    });
    if (isEmpty) {
      const firstRoot = roots[0];
      var inst = wrap._cmChartInstance || firstRoot && firstRoot._cmChartInstance;
      if (inst) {
        try {
          inst.dispose();
        } catch (e) {
        }
      }
      wrap._cmChartInstance = null;
      roots.forEach((root) => {
        root._cmChartInstance = null;
      });
      delete wrap.dataset.cmChartReady;
    }
  }
  function num(value) {
    if (value === null || value === void 0 || value === "") return null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function uiLocale() {
    if (typeof document === "undefined" || !document.documentElement) return void 0;
    return document.documentElement.lang || void 0;
  }
  function packagesTooltip(params, dataRows) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const pkg = dataRows[(_b = (_a = params[0]) == null ? void 0 : _a.dataIndex) != null ? _b : -1];
    if (!pkg || !params[0]) return (_d = (_c = params[0]) == null ? void 0 : _c.name) != null ? _d : "";
    const included = i18n.t("chart.packages.included", "Included");
    const rejected = i18n.t("chart.packages.rejected", "Rejected");
    const tariff = i18n.t("chart.packages.tariff", "Tariff");
    const lossLabel = i18n.t("chart.packages.loss", "Loss");
    let tip = "<b>" + params[0].name + "</b><br/>" + included + ': <span style="color:#4ade80;font-weight:700;">' + ((_e = pkg.included) != null ? _e : 0) + "</span><br/>" + rejected + ': <span style="color:#f87171;font-weight:700;">' + ((_f = pkg.rejected) != null ? _f : 0) + "</span><br/>" + tariff + ": " + ((_h = (_g = pkg.tariff_fmt) != null ? _g : pkg.tariff) != null ? _h : 0);
    const loss = num(pkg.rejected_tariff);
    if (loss !== null && loss > 0) {
      tip += "<br/>" + lossLabel + ': <span style="color:#f87171;font-weight:700;">\u2212' + ((_i = pkg.rejected_tariff_fmt) != null ? _i : pkg.rejected_tariff) + "</span>";
    }
    return tip;
  }
  function buildPieOption(config, resolved, bind, chartType) {
    var _a;
    const data = resolved.slices.map((slice) => {
      const item = {
        name: slice.label,
        value: slice.value
      };
      if (slice.color) item.itemStyle = { color: slice.color };
      return item;
    });
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    if (bind.pieVariant === "center-total") {
      return {
        backgroundColor: "transparent",
        title: {
          text: String(total),
          subtext: "Total",
          left: "center",
          top: "center",
          textStyle: { color: "#e2e8f0", fontSize: 22, fontWeight: "bold" },
          subtextStyle: { color: "#64748b", fontSize: 10, fontWeight: "bold" }
        },
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(30,41,59,.95)",
          borderColor: "rgba(51,65,85,.6)",
          textStyle: { color: "#e2e8f0", fontSize: 11 },
          confine: true,
          formatter: (params) => `${params.name}: ${params.value} (${params.percent.toFixed(1)}%)`
        },
        series: [
          {
            type: "pie",
            radius: ["45%", "75%"],
            center: ["50%", "50%"],
            data,
            label: {
              show: true,
              position: "inner",
              formatter: "{c}",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: "bold"
            },
            emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
            animationType: "scale",
            animationEasing: "elasticOut"
          }
        ]
      };
    }
    const overlay = (_a = resolved.overlay) != null ? _a : config.overlay;
    const pieSeries = {
      type: "pie",
      radius: chartType === "donut" ? ["55%", "80%"] : "70%",
      center: ["50%", "45%"],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: "#1e293b", borderWidth: 2 },
      labelLine: { show: false },
      data
    };
    if (overlay) {
      const tone = overlay.tone === "green" ? "#10b981" : overlay.tone === "red" ? "#ef4444" : "#94a3b8";
      pieSeries.label = {
        show: true,
        position: "center",
        formatter: () => `${overlay.title}

${overlay.value}`,
        fontSize: 14,
        fontWeight: "bold",
        lineHeight: 18,
        color: tone
      };
    }
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: "{b}: <b>{c}</b> ({d}%)",
        backgroundColor: "rgba(30, 41, 59, 0.9)",
        borderColor: "#475569",
        textStyle: { color: "#f8fafc" }
      },
      legend: { bottom: "0%", left: "center", textStyle: { color: "#94a3b8", fontSize: 11 } },
      series: [pieSeries]
    };
  }
  function axisValueFormatter(format, symbol) {
    const fmt = format != null ? format : "number";
    const localized = (value) => value.toLocaleString("uk-UA");
    if (fmt === "percent") {
      return (value) => `${localized(value)}%`;
    }
    if (fmt === "symbol") {
      const tail = symbol != null ? symbol : "";
      return (value) => `${localized(value)}${tail}`;
    }
    return localized;
  }
  function buildBarOptionFromResolved(resolved, bind, chartType, isDark, dataRows) {
    var _a;
    const seriesDefs = (_a = bind.series) != null ? _a : [];
    const defaultType = chartType === "line" ? "line" : "bar";
    const horizontal = bind.orientation === "horizontal";
    const stacked = bind.stacked === true;
    const categories = resolved.categories;
    const valueAxisLabel = {
      formatter: axisValueFormatter(bind.yAxisFormat, bind.yAxisSymbol),
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 10
    };
    const series = resolved.series.map((point, idx) => {
      var _a2, _b, _c;
      const seriesDef = (_a2 = seriesDefs[idx]) != null ? _a2 : {};
      const type = (_b = seriesDef.seriesType) != null ? _b : defaultType;
      const color = (_c = point.color) != null ? _c : seriesDef.color;
      const payload = {
        name: point.name,
        type,
        data: point.values
      };
      if (stacked) payload.stack = "total";
      if (type === "bar") {
        const radius = horizontal ? [0, 3, 3, 0] : [2, 2, 0, 0];
        if (stacked && idx === resolved.series.length - 1) {
          payload.itemStyle = { color, borderRadius: radius };
        } else {
          payload.itemStyle = { color, borderRadius: stacked ? 0 : radius };
        }
      } else {
        payload.symbol = "circle";
        payload.symbolSize = 6;
        payload.lineStyle = { width: 2, color: color != null ? color : "#3b82f6" };
        payload.itemStyle = { color: color != null ? color : "#3b82f6" };
      }
      return payload;
    });
    const tooltip = { trigger: "axis", axisPointer: { type: "shadow" } };
    if (bind.tooltipKind === "packages") {
      tooltip.formatter = (params) => packagesTooltip(params, dataRows);
    }
    if (horizontal) {
      return {
        backgroundColor: "transparent",
        tooltip,
        legend: { top: 0, textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 } },
        grid: { left: 10, right: 30, top: 30, bottom: 5, containLabel: true },
        xAxis: {
          type: "value",
          axisLabel: valueAxisLabel,
          splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
        },
        yAxis: {
          type: "category",
          data: categories,
          axisLabel: {
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: 10,
            width: 200,
            overflow: "truncate",
            ellipsis: "\u2026"
          },
          axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } }
        },
        series
      };
    }
    return {
      backgroundColor: "transparent",
      tooltip,
      legend: { top: 8, textStyle: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 } },
      grid: { left: "2%", right: "2%", top: 36, bottom: "15%", containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          rotate: 30,
          fontSize: 10,
          color: isDark ? "#94a3b8" : "#64748b",
          interval: 0,
          width: 90,
          overflow: "truncate"
        },
        axisLine: { lineStyle: { color: isDark ? "#334155" : "#cbd5e1" } }
      },
      yAxis: {
        type: "value",
        axisLabel: valueAxisLabel,
        splitLine: { lineStyle: { color: isDark ? "#1e293b" : "#e2e8f0" } }
      },
      series
    };
  }
  function buildEchartsOption(config, rows) {
    var _a, _b, _c;
    const bind = (_a = config.bind) != null ? _a : {};
    const chartType = config.chartType;
    const theme = (_b = config.echartsTheme) != null ? _b : "dark";
    const isDark = theme === "dark";
    const dataRows = (_c = bind.rows) != null ? _c : rows;
    const resolved = resolveChartDataFromRuntime(config, dataRows);
    if (chartType === "pie" || chartType === "donut") {
      return buildPieOption(config, resolved, bind, chartType);
    }
    return buildBarOptionFromResolved(resolved, bind, chartType, isDark, dataRows);
  }
  function initChart(root, config, rows) {
    var _a;
    if (!root) return null;
    var wrap = root.closest("[data-cm-chart-config], .cm-chart-wrap") || root.parentElement;
    var rowList = Array.isArray(rows) ? rows : [];
    if (!chartRowsHaveData(rowList)) {
      setChartEmptyState(wrap, true);
      return null;
    }
    setChartEmptyState(wrap, false);
    if (typeof window.echarts === "undefined") return null;
    const chartRoot = root;
    if (chartRoot._cmChartInstance) {
      try {
        chartRoot._cmChartInstance.dispose();
      } catch (e) {
      }
      chartRoot._cmChartInstance = null;
    }
    const chart = window.echarts.init(root, (_a = config.echartsTheme) != null ? _a : "dark");
    chart.setOption(buildEchartsOption(config, rowList), true);
    chartRoot._cmChartInstance = chart;
    if (wrap) wrap._cmChartInstance = chart;
    return chart;
  }
  function refreshChartWrap(wrap, config, rows) {
    var _a;
    if (!wrap) return null;
    const chartRoot = (_a = wrap.querySelector("[data-cm-chart-root]")) != null ? _a : wrap;
    const rowList = Array.isArray(rows) ? rows : [];
    wrap.dataset.cmChartRows = JSON.stringify(rowList);
    if (!chartRowsHaveData(rowList)) {
      setChartEmptyState(wrap, true);
      return null;
    }
    const runtimeConfig = Object.assign({}, config, {
      bind: Object.assign({}, config.bind || {}, { rows: rowList })
    });
    const instance = initChart(chartRoot, runtimeConfig, rowList);
    if (!instance) return null;
    wrap.dataset.cmChartReady = "1";
    wrap._cmChartInstance = instance;
    return instance;
  }
  function initAllCharts(scope) {
    const root = scope != null ? scope : document;
    root.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
      var _a, _b, _c, _d;
      if (node.dataset.cmChartInteractive) return;
      if (node.dataset.cmChartReady && node._cmChartInstance) {
        (_a = node._cmChartInstance) == null ? void 0 : _a.resize();
        return;
      }
      if (node.dataset.cmChartReady) return;
      const config = JSON.parse((_b = node.dataset.cmChartConfig) != null ? _b : "{}");
      if (config.dataSource === "grid_filtered") return;
      const rows = JSON.parse((_c = node.dataset.cmChartRows) != null ? _c : "[]");
      const chartRoot = (_d = node.querySelector("[data-cm-chart-root]")) != null ? _d : node;
      const instance = initChart(chartRoot, config, rows);
      if (!instance) return;
      node.dataset.cmChartReady = "1";
      node._cmChartInstance = instance;
      if (!window.__cmChartResizeAttached) {
        window.__cmChartResizeAttached = true;
        window.addEventListener("resize", () => {
          document.querySelectorAll("[data-cm-chart-ready='1']").forEach((el) => {
            var _a2;
            (_a2 = el._cmChartInstance) == null ? void 0 : _a2.resize();
          });
        });
      }
    });
  }
  var Charts = {
    buildEchartsOption,
    initChart,
    refreshChartWrap,
    initAllCharts,
    resolveChartData: resolveChartDataFromRuntime
  };

  // src/grid-view/simple-table.ts
  function simpleTableWrapper(table) {
    return table.closest(".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page") || table.parentElement;
  }
  function ensureSimpleTableForTable(tableEl) {
    if (!tableEl) return null;
    var table = tableEl.matches && tableEl.matches("[data-cm-table]") ? tableEl : tableEl.querySelector && tableEl.querySelector("[data-cm-table]");
    if (!table) return null;
    if (table._cmSimpleTable) return table._cmSimpleTable;
    var wrapper = simpleTableWrapper(table);
    if (!wrapper) return null;
    table._cmSimpleTable = new SimpleTable(wrapper, table);
    return table._cmSimpleTable;
  }
  function resolveDataTable(el) {
    if (!el) return null;
    if (el.matches && el.matches("[data-cm-table][data-cm-col-filters]")) return el;
    var nested = el.querySelector && el.querySelector("[data-cm-table][data-cm-col-filters]");
    return nested || null;
  }
  function applyTableFilters(tableEl) {
    var table = resolveDataTable(tableEl);
    if (!table) return;
    var simple = ensureSimpleTableForTable(table);
    if (simple) {
      simple.applyAllFilters();
      return;
    }
    var wrapper = simpleTableWrapper(table);
    if (!wrapper) return;
    new SimpleTable(wrapper, table).applyAllFilters();
  }
  function applyFiltersInScope(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function(table) {
      var _a;
      (_a = ensureSimpleTableForTable(table)) == null ? void 0 : _a.applyAllFilters();
    });
  }
  var SimpleTable = class {
    constructor(wrapper, tableEl) {
      this.sortKey = null;
      this.sortDir = null;
      this.w = wrapper;
      const table = tableEl || wrapper.querySelector("[data-cm-table]");
      if (!table) throw new Error("SimpleTable: missing [data-cm-table]");
      this.table = table;
      const tbody = table.querySelector("tbody");
      if (!tbody) throw new Error("SimpleTable: missing tbody");
      this.tbody = tbody;
      [...this.tbody.querySelectorAll("tr")].forEach(
        (row, index) => {
          row.dataset.cmIdx = String(index);
        }
      );
      this.bind();
    }
    _hasSectionGroups() {
      return this.tbody.querySelector(".cm-row-section") !== null;
    }
    _rowGroups() {
      var groups = [];
      var current = null;
      [...this.tbody.children].forEach(function(tr) {
        if (tr.classList.contains("cm-row-section")) {
          current = { section: tr, rows: [] };
          groups.push(current);
          return;
        }
        if (tr.classList.contains("cm-row")) {
          if (!current) {
            current = { section: null, rows: [] };
            groups.push(current);
          }
          current.rows.push(tr);
        }
      });
      return groups;
    }
    _compareRows(a, b, idx) {
      var _a, _b, _c, _d, _e, _f;
      const num2 = (value) => {
        const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
        return Number.isNaN(parsed) ? null : parsed;
      };
      const cellA = a.querySelector('td[data-cm-col="' + idx + '"]') || a.children[idx];
      const cellB = b.querySelector('td[data-cm-col="' + idx + '"]') || b.children[idx];
      const va = (_c = (_b = cellA == null ? void 0 : cellA.dataset.cmSortVal) != null ? _b : (_a = cellA == null ? void 0 : cellA.textContent) == null ? void 0 : _a.trim()) != null ? _c : "";
      const vb = (_f = (_e = cellB == null ? void 0 : cellB.dataset.cmSortVal) != null ? _e : (_d = cellB == null ? void 0 : cellB.textContent) == null ? void 0 : _d.trim()) != null ? _f : "";
      const na = num2(va);
      const nb = num2(vb);
      if (na !== null && nb !== null) return na - nb;
      return String(va).localeCompare(String(vb), void 0, { numeric: true });
    }
    _appendRowGroups(groups) {
      groups.forEach(function(group) {
        if (group.section) this.tbody.appendChild(group.section);
        group.rows.forEach(function(row) {
          this.tbody.appendChild(row);
        }, this);
      }, this);
    }
    bind() {
      this.w.querySelectorAll("[data-cm-sort]").forEach((th) => {
        if (th.dataset.cmBound) return;
        th.dataset.cmBound = "1";
        th.addEventListener("click", (e) => {
          if (e.target.closest(
            "[data-cm-col-filter-trigger], [data-cm-col-filter-clear], [data-cm-col-resize], .cm-th-header-tools, [data-cm-th-tools]"
          )) {
            return;
          }
          if (!th.dataset.cmSort) return;
          this._sort(th);
        });
      });
      const inp = this.w.querySelector("[data-cm-search]");
      if (inp && !inp.dataset.cmBound) {
        inp.dataset.cmBound = "1";
        inp.addEventListener("input", () => {
          this.applyAllFilters();
        });
      }
      this.tbody.querySelectorAll("[data-cm-row-url]").forEach((row) => {
        if (row.dataset.cmBound) return;
        row.dataset.cmBound = "1";
        row.style.cursor = "pointer";
        row.addEventListener("click", (event) => {
          const target = event.target;
          if (target.closest("a,button")) return;
          const url = row.dataset.cmRowUrl;
          if (url) window.location.href = url;
        });
      });
    }
    _colIndex(th) {
      const idx = th.dataset.cmCol;
      if (idx !== void 0 && idx !== "") {
        return parseInt(idx, 10);
      }
      return th.parentElement ? [...th.parentElement.children].indexOf(th) : 0;
    }
    _sort(th) {
      const key = th.dataset.cmSort || "";
      this.sortDir = this.sortKey === key ? this.sortDir === "asc" ? "desc" : this.sortDir === "desc" ? null : "asc" : "asc";
      this.sortKey = this.sortDir ? key : null;
      const idx = this._colIndex(th);
      if (this._hasSectionGroups()) {
        if (!this.sortDir) {
          [...this.tbody.querySelectorAll("tr")].sort(
            (a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx)
          ).forEach((row) => this.tbody.appendChild(row));
        } else {
          const groups = this._rowGroups();
          const dir = this.sortDir;
          groups.forEach(function(group) {
            group.rows.sort(function(a, b) {
              const cmp = this._compareRows(a, b, idx);
              return dir === "asc" ? cmp : -cmp;
            }.bind(this));
          }, this);
          this._appendRowGroups(groups);
        }
      } else {
        const rows = [...this.tbody.querySelectorAll(".cm-row")];
        if (!this.sortDir) {
          rows.sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx));
        } else {
          const dir = this.sortDir;
          rows.sort((a, b) => {
            const cmp = this._compareRows(a, b, idx);
            return dir === "asc" ? cmp : -cmp;
          });
        }
        rows.forEach((row) => this.tbody.appendChild(row));
      }
      this.w.querySelectorAll("[data-cm-sort]").forEach((headerTh) => {
        headerTh.classList.toggle("cm-th-sorted", this.sortDir !== null && headerTh.dataset.cmSort === this.sortKey);
      });
      this.w.querySelectorAll(".cm-sort-arrow").forEach((arrow2) => {
        arrow2.textContent = "\u21C9";
      });
      const arrow = th.querySelector(".cm-sort-arrow");
      if (arrow) {
        arrow.textContent = this.sortDir === "asc" ? "\u25B2" : this.sortDir === "desc" ? "\u25BC" : "\u21C9";
      }
    }
    _queryUsesNumericCellText(query) {
      const q = String(query || "").trim();
      if (!q) return false;
      if (termIsExpression(q)) return true;
      for (const group of tokenizeSmartQuery(q)) {
        for (const item of group) {
          if (termIsExpression(item.term)) return true;
        }
      }
      return false;
    }
    _resolveToolbarQuery(toolbarSearch, localSearch) {
      const raw = (toolbarSearch && toolbarSearch.value || localSearch && localSearch.value || "").trim();
      const input = toolbarSearch || localSearch;
      const searchColumns = collectSearchColumnsFromTable(this.table);
      if (input instanceof HTMLInputElement) {
        if (isToolbarQueryCommitReady(raw, { columns: searchColumns })) {
          if (raw) input.dataset.cmSearchCommitted = raw;
          else delete input.dataset.cmSearchCommitted;
          return raw;
        }
        return (input.dataset.cmSearchCommitted || "").trim();
      }
      return (raw || new URLSearchParams(window.location.search).get("q") || "").trim();
    }
    _cellTextForFilter(row, colKey, query) {
      var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      var cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
      if (!cell) return "";
      if (this._queryUsesNumericCellText(query)) {
        return (cell.dataset.cmExportRaw || cell.dataset.cmSortVal || cell.textContent || "").trim();
      }
      return (cell.dataset.cmSortVal || cell.textContent || cell.dataset.cmExportRaw || "").trim();
    }
    _syncTableEmptyState(shownRows, filtered) {
      var emptyRow = this.tbody.querySelector("tr[data-cm-table-empty]");
      if (!emptyRow) return;
      var hasDataRows = this.tbody.querySelectorAll(".cm-row").length > 0;
      if (!hasDataRows) {
        emptyRow.hidden = true;
        return;
      }
      emptyRow.hidden = !(filtered && shownRows === 0);
    }
    _syncSectionTotals(active) {
      this.tbody.querySelectorAll(".cm-row-section").forEach((sectionRow) => {
        const visibleRows = [];
        let next = sectionRow.nextElementSibling;
        while (next && !next.classList.contains("cm-row-section")) {
          if (next.classList.contains("cm-row") && !next.hidden) visibleRows.push(next);
          next = next.nextElementSibling;
        }
        sectionRow.querySelectorAll("td[data-cm-section-aggregate]").forEach((el) => {
          const key = el.dataset.cmColKey;
          if (!key) return;
          if (!el.dataset.cmSectionHtml) {
            el.dataset.cmSectionHtml = el.innerHTML;
          }
          if (!active) {
            el.innerHTML = el.dataset.cmSectionHtml;
            return;
          }
          let sum = 0;
          let hasNum = false;
          const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          visibleRows.forEach((row) => {
            var _a, _b;
            const bodyCell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
            const raw = (_b = (_a = bodyCell == null ? void 0 : bodyCell.dataset.cmExportRaw) != null ? _a : bodyCell == null ? void 0 : bodyCell.dataset.cmSortVal) != null ? _b : "";
            const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(parsed)) {
              sum += parsed;
              hasNum = true;
            }
          });
          if (!hasNum) {
            el.innerHTML = '<span class="cm-muted">\u2014</span>';
            return;
          }
          const base = el.dataset.cmExportRaw || "";
          if (base.includes("\u20B4") || el.dataset.cmSectionHtml.includes("\u20B4")) {
            el.textContent = sum.toLocaleString(void 0, { maximumFractionDigits: 2 }) + " \u20B4";
          } else {
            el.textContent = String(Math.round(sum) === sum ? sum : sum);
          }
        });
      });
    }
    _syncSectionVisibility(colKeys, globalActive) {
      var filtering = colKeys.length > 0 || globalActive;
      this.tbody.querySelectorAll(".cm-row-section").forEach(function(sectionRow) {
        var next = sectionRow.nextElementSibling;
        var anyVisible = false;
        while (next && !next.classList.contains("cm-row-section")) {
          if (next.classList.contains("cm-row") && !next.hidden) anyVisible = true;
          next = next.nextElementSibling;
        }
        sectionRow.hidden = filtering && !anyVisible;
      });
    }
    applyAllFilters() {
      var _a;
      const layout = this.w;
      const table = this.table;
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      this.tbody = tbody;
      const toolbarSearch = layout.querySelector("[data-cm-toolbar-search]") || ((_a = layout.closest(".cm-page-table-layout, .cm-dashboard-page")) == null ? void 0 : _a.querySelector("[data-cm-toolbar-search]"));
      const localSearch = layout.querySelector("[data-cm-search]");
      const globalQ = this._resolveToolbarQuery(toolbarSearch, localSearch);
      const globalActive = !!globalQ;
      const colFilters = collectColumnFiltersFromTable(this.table);
      const colKeys = Object.keys(colFilters);
      const hasColFilters = colKeys.length > 0;
      const searchColumns = collectSearchColumnsFromTable(this.table);
      let shown = 0;
      this.tbody.querySelectorAll(".cm-row").forEach((row) => {
        let match = true;
        if (hasColFilters) {
          match = colKeys.every((key) => {
            const entry = parseColumnFilterEntry(colFilters[key]);
            if (!entry) return true;
            var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
            const td = row.querySelector('td[data-cm-col-key="' + esc + '"]');
            const colMatch = headerFilterMatch(th);
            const profile = tokenProfileForHeader(th);
            const tokens = parseCellFilterTokens(td, colMatch);
            const cellText = this._cellTextForFilter(
              row,
              key,
              typeof entry === "string" ? entry : ""
            );
            return matchColumnFilterEntry(cellText, entry, {
              tokens,
              match: colMatch,
              profile
            });
          });
        }
        if (match && globalActive) {
          const cellsByKey = collectRowCellsByKeyFromDom(row);
          const rowCells = Object.values(cellsByKey);
          match = matchToolbarQuery(buildRowHaystackFromDom(row), globalQ, {
            cells: rowCells.length ? rowCells : collectRowCellValuesFromDom(row),
            cellsByKey,
            columns: searchColumns
          });
        }
        if (match) {
          row.hidden = false;
          row.removeAttribute("hidden");
        } else {
          row.hidden = true;
        }
        if (match) shown++;
      });
      const filtered = globalActive || hasColFilters;
      this._syncSectionVisibility(colKeys, globalActive);
      this._syncSectionTotals(filtered);
      this._syncTableEmptyState(shown, filtered);
      this._syncRecordCounters(shown);
      this._syncTableFooter(filtered);
      if (table) syncColumnFilterChrome(table);
      this._syncGridViewCharts();
    }
    _syncRecordCounters(shownRows) {
      queryRecordCounters(this.table, this.w).forEach((counter) => {
        const field = counter.dataset.cmCountField;
        if (field) {
          let sum = 0;
          this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((row) => {
            var _a, _b, _c;
            const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(field) : field.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
            const raw = (_c = (_b = (_a = cell == null ? void 0 : cell.dataset.cmExportRaw) != null ? _a : cell == null ? void 0 : cell.dataset.cmSortVal) != null ? _b : cell == null ? void 0 : cell.textContent) != null ? _c : "";
            const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(parsed)) sum += parsed;
          });
          counter.textContent = String(Math.round(sum) === sum ? sum : sum);
          return;
        }
        counter.textContent = String(shownRows);
      });
    }
    _syncTableFooter(active) {
      const tfoot = this.table.querySelector("tfoot");
      if (!tfoot) return;
      if (this._hasSectionGroups()) {
        const visibleSections = this.tbody.querySelectorAll(".cm-row-section:not([hidden])").length;
        tfoot.hidden = active && visibleSections <= 1;
        if (tfoot.hidden) return;
      }
      tfoot.hidden = false;
      tfoot.querySelectorAll("td[data-cm-footer-aggregate][data-cm-col-key]").forEach((cell) => {
        const key = cell.dataset.cmColKey;
        if (!key) return;
        if (!cell.dataset.cmFooterHtml) {
          cell.dataset.cmFooterHtml = cell.innerHTML;
        }
        if (!active) {
          cell.innerHTML = cell.dataset.cmFooterHtml;
          return;
        }
        let sum = 0;
        let hasNum = false;
        this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((row) => {
          var _a, _b;
          const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          const bodyCell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
          const raw = (_b = (_a = bodyCell == null ? void 0 : bodyCell.dataset.cmExportRaw) != null ? _a : bodyCell == null ? void 0 : bodyCell.dataset.cmSortVal) != null ? _b : "";
          const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
          if (!Number.isNaN(parsed)) {
            sum += parsed;
            hasNum = true;
          }
        });
        if (!hasNum) {
          cell.textContent = "\u2014";
          return;
        }
        const base = cell.dataset.cmExportRaw || "";
        if (base.includes("\u20B4") || String(cell.textContent || "").includes("\u20B4")) {
          cell.textContent = sum.toLocaleString(void 0, { maximumFractionDigits: 2 }) + " \u20B4";
        } else {
          cell.textContent = String(Math.round(sum) === sum ? sum : sum);
        }
      });
    }
    _syncGridViewCharts() {
      if (typeof Charts === "undefined") return;
      if (!this.tbody.querySelector(".cm-row[data-cm-chart-row]")) return;
      const rows = [];
      this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach(function(tr) {
        const raw = tr.dataset.cmChartRow;
        if (!raw) return;
        try {
          rows.push(JSON.parse(raw));
        } catch (e) {
        }
      });
      const chartNodes = this.w.querySelectorAll("[data-cm-chart-config]");
      if (!chartNodes.length) return;
      chartNodes.forEach(function(node) {
        if (node.dataset.cmChartInteractive) return;
        let config = {};
        try {
          config = JSON.parse(node.dataset.cmChartConfig || "{}");
        } catch (e) {
          return;
        }
        if (config.dataSource === "grid_filtered") return;
        Charts.refreshChartWrap(node, config, rows);
      });
    }
    _search(text) {
      this.applyAllFilters();
    }
  };
  function initAllSimpleTables(root) {
    const scope = root && "querySelectorAll" in root ? root : document;
    initColumnFilters(scope);
    scope.querySelectorAll('[data-cm-column-settings="1"]').forEach(function(shell) {
      initSimpleTableColumnSettings(shell);
    });
    initSimpleTableColumnResize(scope);
    initTableCellUi(scope);
    applyFiltersInScope(scope);
  }
  function attachSimpleTableGlobals() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initAllSimpleTables(document));
    } else {
      initAllSimpleTables(document);
    }
    document.addEventListener("htmx:afterSwap", (event) => {
      var _a;
      bootGridViewScope(((_a = event.detail) == null ? void 0 : _a.target) || event.target);
    });
  }

  // src/grid-view/set-filter-panel.ts
  function formatValueCount(template, count) {
    return template.replace("%(count)s", String(count));
  }
  function requiredElement(root, selector, constructorFn) {
    const element = root.querySelector(selector);
    if (element instanceof constructorFn) return element;
    throw new Error("SetFilterPanel: missing " + selector);
  }
  function isPresetMode(value) {
    return value === "all" || value === "empty" || value === "non_empty";
  }
  var SetFilterPanel = class {
    constructor(options) {
      this.selectedValues = /* @__PURE__ */ new Set();
      this.allValues = [];
      this.hasEmptyCells = false;
      this.emptyCount = 0;
      this.filterMode = "all";
      this.searchDrivenFilter = false;
      this.searchDebounceTimer = null;
      this.fieldId = options.fieldId;
      this.onChange = options.onChange || (() => {
      });
      this.loadValues = options.loadValues || (() => ({ values: [], hasEmpty: false, emptyCount: 0 }));
      const L = options.labels || {};
      this.labels = {
        listSearchPlaceholder: L.listSearchPlaceholder || i18n.t("filter.list_search", "\u041F\u043E\u0448\u0443\u043A\u2026"),
        valueCountLabel: L.valueCountLabel || i18n.t("filter.value_count", "%(count)s values"),
        selectAll: L.selectAll || i18n.t("filter.select_all", "All"),
        onlyEmpty: L.onlyEmpty || i18n.t("filter.only_empty", "Empty"),
        nonEmpty: L.nonEmpty || i18n.t("filter.non_empty", "Non-empty"),
        loadingValues: L.loadingValues || i18n.t("filter.loading_values", "Loading values\u2026"),
        noMatches: L.noMatches || i18n.t("filter.no_matches", "No matches"),
        emptyModeHint: L.emptyModeHint || i18n.t("filter.empty_mode_hint", "Showing rows with empty cells")
      };
      this.gui = document.createElement("div");
      this.gui.className = "cm-set-filter-panel";
      this.gui.innerHTML = '<div class="cm-set-filter-modes">' + this._modeCheckbox("all", this.labels.selectAll, true) + this._modeCheckbox("empty", this.labels.onlyEmpty, false) + this._modeCheckbox("non_empty", this.labels.nonEmpty, false) + '</div><div class="cm-set-filter-search-row"><input type="search" class="cm-col-filter-input cm-set-filter-list-search" autocomplete="off"><span class="cm-set-filter-value-count"></span></div><div class="cm-set-filter-list"></div>';
      this.listSearchInput = requiredElement(
        this.gui,
        ".cm-set-filter-list-search",
        HTMLInputElement
      );
      this.valueCountEl = requiredElement(this.gui, ".cm-set-filter-value-count", HTMLElement);
      this.listContainer = requiredElement(this.gui, ".cm-set-filter-list", HTMLElement);
      this.modeCheckboxes = Array.from(
        this.gui.querySelectorAll('input[type="checkbox"][data-cm-filter-mode]')
      );
      this.listSearchInput.placeholder = this.labels.listSearchPlaceholder;
      this.listSearchInput.addEventListener("input", () => {
        this.scheduleSearchFilterApply();
        this.updateValueCount();
        this.renderList();
      });
      this.listSearchInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          this.listSearchInput.value = "";
          this.applyListSearchToFilter();
          this.updateValueCount();
          this.renderList();
          this.onChange();
        }
      });
      this.gui.addEventListener("mousedown", (e) => e.stopPropagation());
      this.gui.addEventListener("click", (e) => e.stopPropagation());
      this.modeCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const target = e.target;
          if (!(target instanceof HTMLInputElement) || !isPresetMode(target.value)) return;
          const mode = target.value;
          if (target.checked) {
            this.searchDrivenFilter = false;
            this.modeCheckboxes.forEach((cb) => {
              if (cb !== target) cb.checked = false;
            });
            this.setFilterMode(mode);
            this.updateValueCount();
            this.renderList();
            this.onChange();
            return;
          }
          this.clearPresetModes();
          this.searchDrivenFilter = false;
          if (mode === "all") {
            this.filterMode = "custom";
            this.selectedValues.clear();
          } else {
            this.filterMode = "custom";
          }
          this.updateValueCount();
          this.renderList();
          this.onChange();
        });
      });
    }
    _modeCheckbox(value, label, checked) {
      return '<label class="cm-set-filter-mode"><input type="checkbox" data-cm-filter-mode="1" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
    }
    getGui() {
      return this.gui;
    }
    clearPresetModes() {
      this.modeCheckboxes.forEach((cb) => {
        cb.checked = false;
      });
    }
    setFilterMode(mode) {
      this.filterMode = mode;
      if (mode === "all" || mode === "non_empty") {
        this.selectAllNonEmptyValues();
      } else if (mode === "empty") {
        this.selectedValues.clear();
      }
      this.syncPresetModesFromState();
    }
    selectAllNonEmptyValues() {
      this.selectedValues.clear();
      this.allValues.forEach((v) => this.selectedValues.add(v));
    }
    syncPresetModesFromState() {
      this.modeCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.filterMode !== "custom" && checkbox.value === this.filterMode;
      });
    }
    ingestScan(raw) {
      if (Array.isArray(raw)) {
        const emptyInValues = raw.filter(isEmptyCellValue).length;
        this.ingestRawValues(raw, emptyInValues > 0, emptyInValues);
        return;
      }
      this.ingestRawValues(raw.values, raw.hasEmpty, raw.emptyCount);
    }
    ingestRawValues(rawValues, hasEmpty, emptyCount = 0) {
      this.hasEmptyCells = hasEmpty || rawValues.some(isEmptyCellValue);
      this.emptyCount = emptyCount || (this.hasEmptyCells ? 1 : 0);
      this.allValues = Array.from(
        new Set(
          rawValues.map((v) => String(v != null ? v : "").trim()).filter((v) => !isEmptyCellValue(v))
        )
      ).sort();
      this.updateValueCount();
    }
    updateValueCount() {
      const term = this.listSearchInput.value.trim();
      let count;
      if (this.filterMode === "empty") {
        count = this.emptyCount;
      } else if (this.filterMode === "non_empty") {
        count = this.allValues.length;
      } else if (term) {
        count = this.visibleValues().length;
      } else {
        count = this.allValues.length;
      }
      this.valueCountEl.textContent = String(count);
      this.valueCountEl.setAttribute(
        "aria-label",
        formatValueCount(this.labels.valueCountLabel, count)
      );
    }
    scheduleSearchFilterApply() {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.searchDebounceTimer = null;
        this.applyListSearchToFilter();
        this.onChange();
      }, 200);
    }
    applyListSearchToFilter() {
      const term = this.listSearchInput.value.toLowerCase().trim();
      if (!term) {
        if (this.searchDrivenFilter) {
          this.searchDrivenFilter = false;
          this.filterMode = "all";
          this.selectAllNonEmptyValues();
          this.syncPresetModesFromState();
        }
        return;
      }
      this.searchDrivenFilter = true;
      this.clearPresetModes();
      this.filterMode = "custom";
      this.selectedValues.clear();
      this.visibleValues().forEach((v) => this.selectedValues.add(v));
    }
    visibleValues() {
      const searchTerm = this.listSearchInput.value.toLowerCase().trim();
      return this.allValues.filter((v) => v.toLowerCase().includes(searchTerm));
    }
    async refreshValues() {
      this.listContainer.innerHTML = '<div class="cm-set-filter-message">' + this.labels.loadingValues + "</div>";
      const raw = await this.loadValues();
      this.ingestScan(raw);
      if (this.filterMode === "all" && this.selectedValues.size === 0) {
        this.selectAllNonEmptyValues();
      }
      this.renderList();
    }
    renderList() {
      this.listContainer.innerHTML = "";
      this.updateValueCount();
      if (this.filterMode === "empty") {
        this.listContainer.innerHTML = '<div class="cm-set-filter-message">' + this.labels.emptyModeHint + "</div>";
        return;
      }
      const filteredValues = this.visibleValues();
      filteredValues.sort((a, b) => {
        const aChecked = this.isValueChecked(a);
        const bChecked = this.isValueChecked(b);
        if (aChecked && !bChecked) return -1;
        if (!aChecked && bChecked) return 1;
        return a.localeCompare(b);
      });
      if (!filteredValues.length) {
        this.listContainer.innerHTML = '<div class="cm-set-filter-message">' + this.noMatchesLabel() + "</div>";
        return;
      }
      let hasChecked = false;
      let hasUnchecked = false;
      filteredValues.forEach((val) => {
        const isChecked = this.isValueChecked(val);
        if (isChecked) hasChecked = true;
        if (!isChecked && hasChecked && !hasUnchecked) {
          const separator = document.createElement("div");
          separator.className = "cm-set-filter-separator";
          this.listContainer.appendChild(separator);
          hasUnchecked = true;
        }
        const safeIdSuffix = btoa(encodeURIComponent(val)).replace(/[^a-zA-Z0-9]/g, "");
        const id = "filter-" + this.fieldId + "-" + safeIdSuffix;
        const item = document.createElement("label");
        item.className = "cm-set-filter-item";
        item.htmlFor = id;
        item.innerHTML = '<input type="checkbox" id="' + id + '"' + (isChecked ? " checked" : "") + '><span class="cm-set-filter-item-label">' + val + "</span>";
        const checkbox = requiredElement(item, "input", HTMLInputElement);
        checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const target = e.target;
          if (!(target instanceof HTMLInputElement)) return;
          this.clearPresetModes();
          this.searchDrivenFilter = false;
          this.filterMode = "custom";
          if (target.checked) this.selectedValues.add(val);
          else this.selectedValues.delete(val);
          this.onChange();
          this.renderList();
        });
        this.listContainer.appendChild(item);
      });
      this.syncPresetModesFromState();
    }
    isValueChecked(val) {
      if (this.filterMode === "non_empty") return true;
      if (this.filterMode === "empty") return false;
      return this.selectedValues.has(val);
    }
    noMatchesLabel() {
      return this.labels.noMatches;
    }
    isFilterActive() {
      if (this.filterMode === "empty" || this.filterMode === "non_empty") return true;
      if (this.filterMode === "custom") {
        if (this.selectedValues.size === 0) return true;
        return this.selectedValues.size !== this.allValues.length;
      }
      return false;
    }
    getModel(match = "exact") {
      if (!this.isFilterActive()) return null;
      if (this.filterMode === "empty") return { mode: "empty", match };
      if (this.filterMode === "non_empty") return { mode: "non_empty", match };
      if (this.selectedValues.size === 0) return { values: [], match };
      return { values: Array.from(this.selectedValues), match };
    }
    setModel(model) {
      if (!model) {
        this.filterMode = "all";
        this.selectAllNonEmptyValues();
      } else if ("mode" in model && model.mode === "empty") {
        this.filterMode = "empty";
        this.selectedValues.clear();
      } else if ("mode" in model && model.mode === "non_empty") {
        this.filterMode = "non_empty";
        this.selectAllNonEmptyValues();
      } else if ("values" in model && Array.isArray(model.values)) {
        this.filterMode = "custom";
        this.selectedValues.clear();
        model.values.forEach((v) => {
          if (!isEmptyCellValue(v)) this.selectedValues.add(String(v).trim());
        });
      }
      this.syncPresetModesFromState();
      this.renderList();
    }
  };

  // src/grid-view/search/column-filter-dictionary.ts
  function scanTableColumnValues(table, colKey, match) {
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const values = /* @__PURE__ */ new Set();
    let hasEmpty = false;
    let emptyCount = 0;
    table.querySelectorAll('td[data-cm-col-key="' + esc + '"]').forEach((el) => {
      if (el.dataset.cmFilterEmpty === "1") {
        hasEmpty = true;
        emptyCount += 1;
        return;
      }
      if (match === "any_token") {
        const raw = el.dataset.cmFilterTokens;
        if (raw !== void 0) {
          try {
            const tokens = JSON.parse(raw);
            if (Array.isArray(tokens)) {
              if (!tokens.length) {
                hasEmpty = true;
                emptyCount += 1;
                return;
              }
              let cellEmpty = true;
              tokens.forEach((t2) => {
                const text2 = String(t2 != null ? t2 : "").trim();
                if (isEmptyCellValue(text2)) return;
                cellEmpty = false;
                values.add(text2);
              });
              if (cellEmpty) {
                hasEmpty = true;
                emptyCount += 1;
              }
              return;
            }
          } catch (e) {
          }
        }
      }
      const sortVal = (el.dataset.cmSortVal || "").trim();
      const exportRaw = (el.dataset.cmExportRaw || "").trim();
      const text = (sortVal || exportRaw || el.textContent || "").trim();
      if (isEmptyCellValue(text)) {
        hasEmpty = true;
        emptyCount += 1;
      } else values.add(text);
    });
    return {
      values: Array.from(values).filter((v) => !isEmptyCellValue(v)).sort((a, b) => a.localeCompare(b)),
      hasEmpty,
      emptyCount
    };
  }

  // src/grid-view/column-filters.ts
  var activeSetPanel = null;
  var exprFilterTimer = null;
  function exprRowForPortal(portal) {
    if (!portal) return null;
    const row = portal.querySelector(".cm-col-filter-expr-row");
    return row instanceof HTMLElement ? row : null;
  }
  function setExprRowVisible(portal, visible) {
    const row = exprRowForPortal(portal);
    if (!row) return;
    row.hidden = !visible;
    const inp = row.querySelector("[data-cm-col-filter-input]");
    if (inp instanceof HTMLElement) inp.hidden = !visible;
  }
  function gridIdForTable(table) {
    if (!table) return "";
    var shell = table.closest("[data-grid-id]");
    if (shell instanceof HTMLElement && shell.dataset.gridId) return shell.dataset.gridId;
    if (table.id && table.id.indexOf("cm-table-inner-") === 0) {
      return table.id.slice("cm-table-inner-".length);
    }
    return "";
  }
  function tableForPortal(portal) {
    var _a;
    if (!portal) return null;
    var gridId = portal instanceof HTMLElement ? portal.dataset.cmColFilterTable : "";
    if (gridId) {
      var shellTable = (_a = document.getElementById("cm-table-" + gridId)) == null ? void 0 : _a.querySelector("[data-cm-table]");
      if (shellTable instanceof HTMLTableElement) return shellTable;
      var inner = document.getElementById("cm-table-inner-" + gridId);
      if (inner instanceof HTMLTableElement && inner.matches("[data-cm-table]")) return inner;
    }
    var prev = portal.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains("cm-table-viewport")) {
      var nested = prev.querySelector("[data-cm-table]");
      if (nested instanceof HTMLTableElement) return nested;
    }
    if (prev instanceof HTMLTableElement && prev.matches("[data-cm-table]")) return prev;
    return null;
  }
  function columnFilterPortalForTable(table) {
    if (!table) return null;
    var viewport = table.closest(".cm-table-viewport");
    var next = viewport ? viewport.nextElementSibling : table.nextElementSibling;
    if (next instanceof HTMLElement && next.matches("[data-cm-col-filter-portal]")) {
      return next;
    }
    var portal = document.createElement("div");
    portal.className = "cm-col-filter-portal is-hidden";
    portal.dataset.cmColFilterPortal = "1";
    portal.dataset.cmColFilterTable = gridIdForTable(table);
    portal.setAttribute("aria-hidden", "true");
    var setHost = document.createElement("div");
    setHost.className = "cm-col-filter-set-host";
    setHost.dataset.cmColFilterSetHost = "1";
    setHost.hidden = true;
    portal.appendChild(setHost);
    var exprRow = document.createElement("div");
    exprRow.className = "cm-col-filter-expr-row";
    var inp = document.createElement("input");
    inp.type = "search";
    inp.className = "cm-col-filter-input";
    inp.dataset.cmColFilterInput = "1";
    inp.autocomplete = "off";
    inp.placeholder = i18n.t("column_filter.placeholder", "Search: >10, %name%");
    exprRow.appendChild(inp);
    appendSearchSyntaxHelp(exprRow, SearchProfile.ColumnDefault);
    portal.appendChild(exprRow);
    if (viewport) {
      viewport.insertAdjacentElement("afterend", portal);
    } else {
      table.insertAdjacentElement("afterend", portal);
    }
    return portal;
  }
  function openPortal() {
    var portal = document.querySelector("[data-cm-col-filter-portal]:not(.is-hidden)");
    return portal instanceof HTMLElement ? portal : null;
  }
  function updateTableFilterUrl(anchorEl) {
    var _a, _b, _c, _d;
    var shell = tableFilterShell(anchorEl);
    var page = shell == null ? void 0 : shell.closest(".cm-page-table-layout, .cm-dashboard-page");
    var filterBar = page == null ? void 0 : page.querySelector("[data-cm-filter-bar]");
    var url = window.location.href;
    if (filterBar) {
      var state = selectedFilterValues(filterBar);
      var toolbarSearch = (page == null ? void 0 : page.querySelector("[data-cm-toolbar-search]")) || document.getElementById(
        "cm-toolbar-search-" + (((_a = shell == null ? void 0 : shell.dataset) == null ? void 0 : _a.gridId) || ((_b = page == null ? void 0 : page.dataset) == null ? void 0 : _b.gridId) || "")
      );
      if (toolbarSearch instanceof HTMLInputElement) {
        var qName = toolbarSearch.name || "q";
        var qVal = (toolbarSearch.value || "").trim();
        if (qVal) state[qName] = qVal;
        else state[qName] = "";
      }
      url = buildFilterUrl(window.location.href, state);
    }
    url = withActiveTableColumns(url, anchorEl || shell || document);
    window.history.replaceState({}, "", url);
    var gridId = shell && shell.dataset && shell.dataset.gridId;
    if (gridId && ((_d = (_c = getGlobal().GridView) == null ? void 0 : _c.AgGrid) == null ? void 0 : _d.syncExportLinks)) {
      getGlobal().GridView.AgGrid.syncExportLinks(gridId);
    }
  }
  function closeColumnFilterPortals() {
    var openPortals = document.querySelectorAll("[data-cm-col-filter-portal]:not(.is-hidden)");
    openPortals.forEach(function(portal) {
      flushExprFilterPortal(portal);
    });
    activeSetPanel = null;
    document.querySelectorAll("[data-cm-col-filter-portal]").forEach(function(portal) {
      portal.classList.add("is-hidden");
      portal.classList.remove("is-set");
      portal.setAttribute("aria-hidden", "true");
      var setHost = portal.querySelector("[data-cm-col-filter-set-host]");
      if (setHost) {
        setHost.innerHTML = "";
        setHost.hidden = true;
      }
      setExprRowVisible(portal, true);
    });
    document.querySelectorAll("[data-cm-col-filter-trigger].is-open").forEach(function(btn) {
      btn.classList.remove("is-open");
    });
  }
  function positionColumnFilterPortal(portal, anchorBtn, kind) {
    var th = anchorBtn.closest("th");
    var anchorRect = anchorBtn.getBoundingClientRect();
    var thRect = th instanceof HTMLElement ? th.getBoundingClientRect() : anchorRect;
    var width = kind === "set" ? 300 : Math.max(196, Math.min(thRect.width, 260));
    var left = thRect.left + (thRect.width - width) / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    portal.classList.toggle("is-set", kind === "set");
    portal.style.top = Math.round(anchorRect.bottom + 6) + "px";
    portal.style.left = Math.round(left) + "px";
    portal.style.width = width + "px";
  }
  function handleColumnFilterScroll(event) {
    var portal = openPortal();
    if (!portal) return;
    if (event.target instanceof Node && portal.contains(event.target)) return;
    var openBtn = document.querySelector("[data-cm-col-filter-trigger].is-open");
    if (openBtn instanceof HTMLElement) {
      var th = openBtn.closest("th");
      var kind = th ? headerFilterKind(th) : "expr";
      positionColumnFilterPortal(portal, openBtn, kind);
      return;
    }
    closeColumnFilterPortals();
  }
  function commitColumnFilterValue(table, colKey, value) {
    if (!table || !colKey) return;
    var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    var th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
    if (!(th instanceof HTMLElement)) return;
    var val = String(value || "").trim();
    if (val) th.dataset.cmColFilterValue = val;
    else delete th.dataset.cmColFilterValue;
  }
  function applyColumnFilterState(table, anchorEl) {
    syncColumnFilterChrome(table);
    applyTableFilters(table);
    updateTableFilterUrl(anchorEl || table);
  }
  function navigateWithTableFilters(anchorEl) {
    var shell = tableFilterShell(anchorEl);
    var table = shell && shell.querySelector("[data-cm-table][data-cm-col-filters]");
    if (table) {
      applyColumnFilterState(table, anchorEl);
      return;
    }
    updateTableFilterUrl(anchorEl);
  }
  function activeFilterColKey(portalInput) {
    var openBtn = document.querySelector("[data-cm-col-filter-trigger].is-open");
    var th = openBtn && openBtn.closest("th");
    if (th instanceof HTMLElement && th.dataset.cmColKey) return th.dataset.cmColKey;
    if (portalInput && portalInput.dataset.cmColKey) return portalInput.dataset.cmColKey;
    return "";
  }
  function applyExprFilterFromPortal(portal, portalInput) {
    var table = tableForPortal(portal);
    if (!table) return;
    var colKey = activeFilterColKey(portalInput) || portalInput.dataset.cmColKey || "";
    if (!colKey) return;
    commitColumnFilterValue(table, colKey, portalInput.value);
    applyColumnFilterState(table, portalInput);
  }
  function scheduleExprFilterApply(portal, portalInput) {
    if (exprFilterTimer) clearTimeout(exprFilterTimer);
    exprFilterTimer = setTimeout(function() {
      exprFilterTimer = null;
      tryApplyExprFilterFromPortal(portal, portalInput);
    }, 150);
  }
  function tryApplyExprFilterFromPortal(portal, portalInput) {
    var _a;
    var openTh = (_a = document.querySelector("[data-cm-col-filter-trigger].is-open")) == null ? void 0 : _a.closest("th");
    if (!isExprFilterCommitReady(portalInput.value, openTh)) return;
    applyExprFilterFromPortal(portal, portalInput);
  }
  function flushExprFilterPortal(portal) {
    var _a;
    var portalInput = portal && portal.querySelector("[data-cm-col-filter-input]");
    if (!(portalInput instanceof HTMLInputElement) || portalInput.hidden) return;
    var openTh = (_a = document.querySelector("[data-cm-col-filter-trigger].is-open")) == null ? void 0 : _a.closest("th");
    if (headerFilterKind(openTh) === "set") return;
    if (!tableForPortal(portal)) return;
    if (exprFilterTimer) {
      clearTimeout(exprFilterTimer);
      exprFilterTimer = null;
    }
    tryApplyExprFilterFromPortal(portal, portalInput);
  }
  function openExprFilter(portal, portalInput, th, table, btn) {
    var setHost = portal.querySelector("[data-cm-col-filter-set-host]");
    if (setHost) {
      setHost.innerHTML = "";
      setHost.hidden = true;
    }
    setExprRowVisible(portal, true);
    const profile = bindSearchProfileForHeader(th);
    portalInput.value = th.dataset.cmColFilterValue || "";
    portalInput.dataset.cmColKey = th.dataset.cmColKey || "";
    portalInput.placeholder = i18n.t(
      columnFilterPlaceholderKey(profile),
      i18n.t("column_filter.placeholder", "Search: >10, %name%")
    );
    const helpBtn = portal.querySelector(".cm-search-help-btn");
    if (helpBtn instanceof HTMLElement) refreshSearchSyntaxHelp(helpBtn, profile);
    positionColumnFilterPortal(portal, btn, "expr");
    portal.classList.remove("is-hidden");
    portal.setAttribute("aria-hidden", "false");
    btn.classList.add("is-open");
    setTimeout(function() {
      portalInput.focus();
      portalInput.select();
    }, 0);
  }
  function openSetFilter(portal, portalInput, th, table, shell, btn) {
    var colKey = th.dataset.cmColKey || "";
    var match = headerFilterMatch(th);
    var setHost = portal.querySelector("[data-cm-col-filter-set-host]");
    if (!(setHost instanceof HTMLElement)) return;
    setExprRowVisible(portal, false);
    setHost.hidden = false;
    setHost.innerHTML = "";
    var panel = new SetFilterPanel({
      fieldId: colKey,
      onChange: function() {
        var model = panel.getModel(match);
        commitColumnFilterValue(table, colKey, model ? serializeColumnFilterEntry(model) : "");
        applyColumnFilterState(table, setHost);
      },
      loadValues: function() {
        return scanTableColumnValues(table, colKey, match);
      }
    });
    activeSetPanel = panel;
    setHost.appendChild(panel.getGui());
    var existing = parseColumnFilterEntry(th.dataset.cmColFilterValue || "");
    if (isSetFilterModel(existing)) {
      panel.setModel(existing);
    }
    positionColumnFilterPortal(portal, btn, "set");
    portal.classList.remove("is-hidden");
    portal.setAttribute("aria-hidden", "false");
    btn.classList.add("is-open");
    void panel.refreshValues();
  }
  function shouldDismissColumnFilter(target) {
    if (!openPortal()) return false;
    if (!(target instanceof Node)) return true;
    var portal = openPortal();
    if (portal && portal.contains(target)) return false;
    if (target instanceof Element && target.closest("[data-cm-col-filter-trigger], [data-cm-col-filter-clear]")) {
      return false;
    }
    return true;
  }
  function bindGlobalColumnFilterHandlers() {
    if (getGlobal()._cmColFilterInputBound) return;
    getGlobal()._cmColFilterInputBound = true;
    document.addEventListener("input", function(e) {
      var _a;
      var target = e.target;
      if (!(target instanceof HTMLInputElement) || !target.matches("[data-cm-col-filter-input]")) return;
      var portal = target.closest("[data-cm-col-filter-portal]");
      if (!portal || portal.classList.contains("is-hidden") || target.hidden) return;
      var openTh = (_a = document.querySelector("[data-cm-col-filter-trigger].is-open")) == null ? void 0 : _a.closest("th");
      if (headerFilterKind(openTh) === "set") return;
      scheduleExprFilterApply(portal, target);
    });
    document.addEventListener("keydown", function(e) {
      var target = e.target;
      if (!(target instanceof HTMLInputElement) || !target.matches("[data-cm-col-filter-input]")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeColumnFilterPortals();
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (exprFilterTimer) {
        clearTimeout(exprFilterTimer);
        exprFilterTimer = null;
      }
      var portal = target.closest("[data-cm-col-filter-portal]");
      tryApplyExprFilterFromPortal(portal, target);
      closeColumnFilterPortals();
    });
  }
  function bindGlobalDismissHandlers() {
    if (getGlobal()._cmColFilterDismissBound) return;
    getGlobal()._cmColFilterDismissBound = true;
    document.addEventListener(
      "mousedown",
      function(e) {
        if (!shouldDismissColumnFilter(e.target)) return;
        closeColumnFilterPortals();
      },
      true
    );
    window.addEventListener("resize", closeColumnFilterPortals);
    window.addEventListener("scroll", handleColumnFilterScroll, true);
  }
  function initColumnFilters(scope) {
    bindGlobalColumnFilterHandlers();
    bindGlobalDismissHandlers();
    var root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function(table) {
      var _a, _b;
      if (!table.matches || !table.matches("[data-cm-table][data-cm-col-filters]")) return;
      if (table.dataset.cmColFiltersBound) return;
      table.dataset.cmColFiltersBound = "1";
      ensureSimpleTableForTable(table);
      var shell = tableFilterShell(table) || table;
      var gridId = gridIdForTable(table);
      var portal = columnFilterPortalForTable(table);
      if (portal && gridId && !portal.dataset.cmColFilterTable) {
        portal.dataset.cmColFilterTable = gridId;
      }
      var portalInput = portal == null ? void 0 : portal.querySelector("[data-cm-col-filter-input]");
      if (!portalInput || portalInput.tagName !== "INPUT") return;
      var urlFilters = parseColumnFiltersFromUrl();
      table.querySelectorAll("th[data-cm-col-key]").forEach(function(th) {
        if (!(th instanceof HTMLElement)) return;
        var key = th.dataset.cmColKey;
        if (key && urlFilters[key]) th.dataset.cmColFilterValue = urlFilters[key];
      });
      syncColumnFilterChrome(table);
      table.querySelectorAll("[data-cm-col-filter-clear]").forEach(function(btn) {
        if (btn.dataset.cmColFilterClearBound) return;
        btn.dataset.cmColFilterClearBound = "1";
        btn.addEventListener("click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          var th = btn.closest("th");
          var colKey = th instanceof HTMLElement ? th.dataset.cmColKey : "";
          if (!colKey) return;
          closeColumnFilterPortals();
          commitColumnFilterValue(table, colKey, "");
          applyColumnFilterState(table, btn);
        });
      });
      table.querySelectorAll("[data-cm-col-filter-trigger]").forEach(function(btn) {
        if (btn.dataset.cmColFilterTriggerBound) return;
        btn.dataset.cmColFilterTriggerBound = "1";
        btn.addEventListener("click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (!portal) return;
          var th = btn.closest("th");
          if (!(th instanceof HTMLElement)) return;
          var colKey = th.dataset.cmColKey;
          if (!colKey) return;
          var reopen = btn.classList.contains("is-open");
          closeColumnFilterPortals();
          if (reopen) return;
          if (headerFilterKind(th) === "set") {
            openSetFilter(portal, portalInput, th, table, shell, btn);
          } else {
            openExprFilter(portal, portalInput, th, table, btn);
          }
        });
      });
      if (Object.keys(urlFilters).length) {
        applyTableFilters(table);
      }
      var shellGridId = shell instanceof HTMLElement ? shell.dataset.gridId : "";
      if (shellGridId && ((_b = (_a = getGlobal().GridView) == null ? void 0 : _a.AgGrid) == null ? void 0 : _b.syncExportLinks)) {
        getGlobal().GridView.AgGrid.syncExportLinks(shellGridId);
      }
    });
  }

  // src/grid-view/kpi.ts
  function formatKpiValue(value, fmt) {
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    fmt = fmt || "number";
    if (fmt === "currency") {
      return n.toLocaleString(uiLocale(), { maximumFractionDigits: 0 });
    }
    if (fmt === "percent") {
      return n.toFixed(1) + "%";
    }
    if (fmt === "number") {
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        return Math.round(n).toLocaleString(uiLocale());
      }
      return n.toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }
  function aggregateKpi(spec, rows) {
    var agg = spec.aggregate || "count";
    var key = spec.columnKey || spec.column_key;
    if (agg === "count") return rows.length;
    var nums = [];
    rows.forEach(function(row) {
      var parsed = num(row[key]);
      if (parsed !== null) nums.push(parsed);
    });
    if (agg === "sum") return nums.reduce(function(a, b) {
      return a + b;
    }, 0);
    if (agg === "avg") return nums.length ? nums.reduce(function(a, b) {
      return a + b;
    }, 0) / nums.length : 0;
    if (agg === "min") return nums.length ? Math.min.apply(null, nums) : 0;
    if (agg === "max") return nums.length ? Math.max.apply(null, nums) : 0;
    return 0;
  }
  function resolveKpis(specs, rows) {
    return (specs || []).map(function(spec) {
      var raw = aggregateKpi(spec, rows);
      return {
        label: spec.label || "",
        valueFmt: formatKpiValue(raw, spec.format),
        rawValue: raw,
        tone: spec.tone || "default",
        icon: spec.icon || null
      };
    });
  }
  function kpiCardHtml(kpi) {
    var icon = kpi.icon || "\u{1F4CA}";
    var label = kpi.label || "";
    var value = kpi.valueFmt || kpi.value_fmt || "";
    return '<span class="cm-kpi-icon" aria-hidden="true">' + icon + '</span><div class="cm-kpi-body"><span class="cm-kpi-label">' + label + '</span><span class="cm-kpi-value">' + value + "</span></div>";
  }
  function initKpiStrip(root, kpis, columns) {
    if (!root || !(kpis == null ? void 0 : kpis.length)) return;
    root.innerHTML = "";
    root.className = `cm-kpi-grid cm-kpi-cols-${columns || 4}`;
    kpis.forEach((kpi) => {
      const card = document.createElement("div");
      card.className = `cm-kpi-card cm-kpi-tone-${kpi.tone || "default"}`;
      card.innerHTML = kpiCardHtml(kpi);
      root.appendChild(card);
    });
  }
  function initAllKpi(scope) {
    const root = scope || document;
    root.querySelectorAll("[data-cm-kpi-config]").forEach((node) => {
      if (node.dataset.cmKpiReady) return;
      const kpis = JSON.parse(node.dataset.cmKpiConfig || "[]");
      const columns = parseInt(node.dataset.cmKpiColumns || "4", 10);
      initKpiStrip(node, kpis, columns);
      node.dataset.cmKpiReady = "1";
    });
  }
  var Kpi = { initKpiStrip, initAllKpi, kpiCardHtml };

  // src/grid-view/filter-bar.ts
  var MS_VALUE_CHECKBOX = 'input[type="checkbox"]:checked:not([data-ui-only])';
  var MS_COUNTABLE = 'input[type="checkbox"]:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])';
  function setMultiselectTriggerLabel(root, text) {
    const trigger = root.querySelector(".cm-multiselect-trigger");
    if (!trigger) return;
    const label = trigger.querySelector(".cm-multiselect-trigger__label");
    if (label) label.textContent = text;
    else trigger.textContent = text;
  }
  function selectedFilterValues(root) {
    const state = {};
    root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const vals = [...ms.querySelectorAll(MS_VALUE_CHECKBOX)].map((cb) => cb.value);
      if (ms.dataset.cmSingleselect === "1") {
        state[param] = vals[0] || "";
      } else {
        state[param] = vals;
      }
    });
    root.querySelectorAll("[data-cm-period-multiselect]").forEach((ms) => {
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const vals = getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.selectedValues === "function" ? getGlobal().CMPeriodFilter.selectedValues(ms) : [];
      if (ms.dataset.cmSingleselect === "1") {
        state[param] = vals[0] || "";
      } else {
        state[param] = vals;
      }
    });
    root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
      const param = sel.name || sel.dataset.filterId;
      if (param) state[param] = sel.value;
    });
    const search = root.querySelector("[data-cm-search]");
    if (search && search.name) state[search.name] = search.value;
    return state;
  }
  function _updateMultiSelectLabel(ms) {
    const placeholder = ms.dataset.placeholder || i18n.t("multiselect.select", "Select");
    const allLabel = ms.dataset.allLabel || placeholder;
    const total = ms.querySelectorAll(MS_COUNTABLE).length;
    const periodAll = ms.querySelector("[data-period-all]");
    if (periodAll == null ? void 0 : periodAll.checked) {
      setMultiselectTriggerLabel(ms, allLabel);
      return;
    }
    const countableChecked = ms.querySelectorAll(
      'input[type="checkbox"]:checked:not([data-period-all]):not([data-select-all]):not([data-ui-only]):not([data-exclusive-solo])'
    ).length;
    if (!countableChecked) {
      setMultiselectTriggerLabel(ms, allLabel);
      return;
    }
    if (total > 0 && countableChecked === total) {
      setMultiselectTriggerLabel(ms, allLabel);
      return;
    }
    const valueChecked = [...ms.querySelectorAll(MS_VALUE_CHECKBOX)];
    if (valueChecked.length === 1) {
      setMultiselectTriggerLabel(ms, valueChecked[0].dataset.label || valueChecked[0].value);
      return;
    }
    setMultiselectTriggerLabel(
      ms,
      valueChecked.length + " " + i18n.t("multiselect.selected_count", "selected")
    );
  }
  function applyFilterValues(root, state) {
    if (!root || !state) return;
    Object.entries(state).forEach(([param, val]) => {
      if (val == null || val === "") return;
      const values = Array.isArray(val) ? val.map(String) : String(val).split(",").map((v) => v.trim()).filter(Boolean);
      root.querySelectorAll("[data-cm-multiselect]").forEach((ms) => {
        const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
        if (msParam !== param) return;
        ms.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          if (cb.dataset.uiOnly === "1") return;
          cb.checked = values.includes(cb.value);
        });
        if (typeof ms._cmUpdateLabel === "function") ms._cmUpdateLabel();
        else _updateMultiSelectLabel(ms);
      });
      root.querySelectorAll("[data-cm-period-multiselect]").forEach((ms) => {
        const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
        if (msParam !== param) return;
        if (getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.applyValues === "function") {
          getGlobal().CMPeriodFilter.applyValues(ms, values);
        }
      });
      root.querySelectorAll("select[data-filter-id]").forEach((sel) => {
        const selParam = sel.name || sel.dataset.filterId;
        if (selParam !== param) return;
        sel.value = Array.isArray(val) ? String(val[0] || "") : String(val);
      });
    });
  }
  function buildFilterUrl(baseUrl, state) {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(state).forEach(([key, val]) => {
      if (val === "" || val == null) {
        url.searchParams.delete(key);
        return;
      }
      if (Array.isArray(val)) url.searchParams.set(key, val.join(","));
      else url.searchParams.set(key, String(val));
    });
    return url.pathname + url.search;
  }
  function activeExportColIds(gridId) {
    if (!gridId) return "";
    const handle = getGlobal().GridView && getGlobal().GridView.byId && getGlobal().GridView.byId.get ? getGlobal().GridView.byId.get(gridId) : null;
    if (handle && handle.adapter && typeof handle.adapter.getDisplayedColumnIds === "function") {
      return handle.adapter.getDisplayedColumnIds().join(",");
    }
    try {
      const raw = localStorage.getItem("cmColState_" + gridId);
      if (!raw) return "";
      const state = JSON.parse(raw);
      if (!Array.isArray(state)) return "";
      return state.filter((col) => col && !col.hide).map((col) => col.colId).filter(Boolean).join(",");
    } catch (e) {
      return "";
    }
  }
  function withActiveTableColumns(urlString, scopeEl) {
    var _a, _b, _c, _d, _e;
    const url = new URL(urlString, window.location.origin);
    const anchor = scopeEl && scopeEl.closest ? scopeEl.closest("[data-cm-toolbar-search-root], .cm-dashboard-page, .cm-page-table-layout") : null;
    const gridId = ((_b = (_a = anchor == null ? void 0 : anchor.querySelector) == null ? void 0 : _a.call(anchor, "[data-cm-toolbar-search-root][data-cm-table-grid-id]")) == null ? void 0 : _b.dataset.cmTableGridId) || ((_e = (_d = (_c = anchor == null ? void 0 : anchor.querySelector) == null ? void 0 : _c.call(anchor, "[data-cm-table-shell][data-grid-id]")) == null ? void 0 : _d.dataset) == null ? void 0 : _e.gridId) || "";
    const cols = activeExportColIds(gridId);
    if (cols) url.searchParams.set("export_cols", cols);
    else url.searchParams.delete("export_cols");
    const colQ = serializeColumnFilters(anchor || document);
    if (colQ) url.searchParams.set("col_q", colQ);
    else url.searchParams.delete("col_q");
    return url.pathname + url.search;
  }
  function initMultiSelectWidget(root) {
    if (root.dataset.cmMsBound) return;
    root.dataset.cmMsBound = "1";
    const panel = root.querySelector(".cm-multiselect-panel");
    const trigger = root.querySelector(".cm-multiselect-trigger");
    const flushPendingAutoApply = () => {
      if (root._cmPendingAutoApply) {
        root._cmPendingAutoApply = false;
        root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
      }
    };
    root._cmFlushPendingAutoApply = flushPendingAutoApply;
    const regularCheckboxes = () => Array.from(root.querySelectorAll(MS_COUNTABLE));
    const selectAllCheckbox = () => root.querySelector('input[type="checkbox"][data-select-all]');
    const soloCheckboxes = () => Array.from(root.querySelectorAll("[data-select-all], [data-exclusive-solo]"));
    const syncSelectAllState = () => {
      const allCb = selectAllCheckbox();
      if (!allCb) return;
      const anyRegular = regularCheckboxes().some((box) => box.checked);
      const anySolo = soloCheckboxes().some((box) => box.checked && box !== allCb);
      allCb.checked = !anyRegular && !anySolo;
    };
    const updateLabel = () => {
      _updateMultiSelectLabel(root);
    };
    trigger == null ? void 0 : trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel == null ? void 0 : panel.classList.contains("is-open");
      const open = !isOpen;
      if (isOpen) flushPendingAutoApply();
      document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
      if (open) panel == null ? void 0 : panel.classList.add("is-open");
    });
    panel == null ? void 0 : panel.addEventListener("click", (e) => e.stopPropagation());
    const applyBtn = panel == null ? void 0 : panel.querySelector("[data-cm-multiselect-apply]");
    if (applyBtn && !applyBtn.dataset.cmBound) {
      applyBtn.dataset.cmBound = "1";
      applyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
        panel == null ? void 0 : panel.classList.remove("is-open");
      });
    }
    root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        var _a;
        if (root.dataset.cmSingleselect === "1" && cb.checked && cb.dataset.selectAll !== "1") {
          root.querySelectorAll('input[type="checkbox"]').forEach((other) => {
            if (other !== cb) other.checked = false;
          });
          if (panel == null ? void 0 : panel.classList.contains("is-open")) {
            panel.classList.remove("is-open");
          }
        }
        if ((cb.dataset.selectAll === "1" || cb.dataset.exclusiveSolo === "1") && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]').forEach((o) => {
            if (o !== cb) o.checked = false;
          });
        } else if (root.dataset.exclusiveAll === "1" && cb.dataset.periodAll === "1" && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]:not([data-period-all])').forEach((o) => {
            o.checked = false;
          });
        } else if (cb.dataset.periodAll !== "1" && cb.checked) {
          const allCb = root.querySelector("[data-period-all]");
          if (allCb) allCb.checked = false;
        }
        if (cb.dataset.selectAll !== "1" && cb.dataset.exclusiveSolo !== "1" && cb.dataset.periodAll !== "1" && cb.checked) {
          soloCheckboxes().forEach((o) => {
            o.checked = false;
          });
        }
        if (cb.dataset.selectAll !== "1") syncSelectAllState();
        updateLabel();
        if (((_a = root.closest("[data-cm-filter-bar]")) == null ? void 0 : _a.dataset.autoApply) === "1") {
          root._cmPendingAutoApply = true;
        }
      });
    });
    syncSelectAllState();
    updateLabel();
    root._cmUpdateLabel = updateLabel;
    if (!window.__cmMultiSelectCloseBound) {
      window.__cmMultiSelectCloseBound = true;
      document.addEventListener("click", () => {
        document.querySelectorAll("[data-cm-multiselect]").forEach((widget) => {
          if (typeof widget._cmFlushPendingAutoApply === "function") widget._cmFlushPendingAutoApply();
        });
        document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
      });
    }
  }
  function bindFilterBar(bar, opts) {
    opts = opts || {};
    bar.querySelectorAll("[data-cm-multiselect]").forEach(initMultiSelectWidget);
    if (getGlobal().CMPeriodFilter && typeof getGlobal().CMPeriodFilter.bind === "function") {
      getGlobal().CMPeriodFilter.bind(bar);
    }
    const onChange = () => {
      const state = selectedFilterValues(bar);
      document.dispatchEvent(new CustomEvent("cm-filter-change", { detail: { state, bar } }));
      if (typeof opts.onChange === "function") opts.onChange(state);
      else if (opts.navigate !== false) {
        window.location.href = withActiveTableColumns(buildFilterUrl(window.location.href, state), bar);
      }
    };
    bar.addEventListener("cm-filter-change", onChange);
    bar.querySelectorAll("select[data-filter-scope='server']").forEach((sel) => {
      sel.addEventListener("change", onChange);
    });
    const search = bar.querySelector("[data-cm-search]");
    if (search) {
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && search.dataset.searchScope === "server") onChange();
      });
    }
    return { getState: () => selectedFilterValues(bar), buildUrl: buildFilterUrl };
  }
  function getCsrfToken() {
    if (!document.cookie) return "";
    const parts = document.cookie.split(";");
    for (let i = 0; i < parts.length; i++) {
      const c = parts[i].trim();
      if (c.indexOf("csrftoken=") === 0) {
        return decodeURIComponent(c.substring("csrftoken=".length));
      }
    }
    return "";
  }
  function setSavedSearchPanelOpen(dropdown, open) {
    if (!dropdown) return;
    var scopeId = dropdown.dataset.cmSavedDropdownFor || "";
    var loadBtn = scopeId ? document.getElementById("cm-saved-searches-btn-" + scopeId) : null;
    if (open) {
      dropdown.classList.remove("is-hidden", "hidden");
      dropdown.classList.add("is-open");
      if (loadBtn) loadBtn.setAttribute("aria-expanded", "true");
    } else {
      dropdown.classList.add("is-hidden");
      dropdown.classList.remove("is-open");
      if (loadBtn) loadBtn.setAttribute("aria-expanded", "false");
    }
  }
  var ToolbarSearch = {
    ctx: function(scopeId, wrap) {
      if (!wrap || !wrap.matches || !wrap.matches("[data-cm-toolbar-search-root]")) {
        if (!scopeId) return null;
        var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(scopeId) : scopeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        wrap = document.querySelector(
          '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
        );
      }
      if (!wrap) return null;
      var scope = wrap.dataset.cmSearchScopeId || scopeId || "";
      var prefId = wrap.dataset.cmPrefGridId || scope;
      var backend = wrap.dataset.cmSearchBackend || "";
      var input = backend === "ag_grid" ? document.getElementById("ag-quick-filter-" + scope) : document.getElementById("cm-toolbar-search-" + scope);
      return {
        root: wrap,
        scopeId: scope,
        prefId,
        backend,
        input,
        dropdown: document.getElementById("cm-saved-searches-dropdown-" + scope),
        container: document.getElementById("cm-saved-searches-container-" + scope)
      };
    },
    load: function(ctx) {
      if (!ctx) return [];
      var raw = ctx.root.dataset.cmSavedSearches;
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            var fromAttr = parsed.filter(function(s) {
              return typeof s === "string" && s;
            });
            if (fromAttr.length) return fromAttr;
          }
        } catch (e) {
        }
      }
      try {
        var ls = localStorage.getItem("cmSavedSearches_" + ctx.prefId);
        if (ls) {
          var fromLs = JSON.parse(ls);
          if (Array.isArray(fromLs)) {
            return fromLs.filter(function(s) {
              return typeof s === "string" && s;
            });
          }
        }
      } catch (e) {
      }
      return [];
    },
    persist: function(ctx, items) {
      if (!ctx) return;
      ctx.root.dataset.cmSavedSearches = JSON.stringify(items);
      try {
        localStorage.setItem("cmSavedSearches_" + ctx.prefId, JSON.stringify(items));
      } catch (e) {
      }
      var host = byId.get(ctx.scopeId);
      if (host) host.savedQuickSearches = items;
      var url = getGlobal().GridView && getGlobal().GridView.preferencesUrl || "";
      if (!url) return;
      fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken()
        },
        body: JSON.stringify({ grid_id: ctx.prefId, searches: items })
      }).catch(function() {
      });
    },
    apply: function(ctx, text, onPick) {
      if (!ctx || !ctx.input) return;
      ctx.input.value = text;
      syncToolbarSearchChrome(ctx.input);
      if (ctx.backend === "ag_grid") {
        var host = byId.get(ctx.scopeId);
        if (host) {
          if (host.gridApi) host.gridApi.setFilterModel(null);
          if (typeof host.onQuickFilterChanged === "function") host.onQuickFilterChanged();
        }
      } else if (typeof onPick === "function") {
        onPick(text);
      }
      setSavedSearchPanelOpen(ctx.dropdown, false);
    },
    render: function(ctx, items, onPick) {
      if (!ctx || !ctx.container) return;
      ctx.container.innerHTML = "";
      if (!items.length) {
        setSavedSearchPanelOpen(ctx.dropdown, false);
        if (ctx.input) syncToolbarSearchChrome(ctx.input);
        return;
      }
      var self = ToolbarSearch;
      items.forEach(function(text) {
        var item = document.createElement("div");
        item.className = "cm-toolbar-search-saved-item";
        var label = document.createElement("span");
        label.textContent = text;
        item.appendChild(label);
        item.addEventListener("mousedown", function(e) {
          e.preventDefault();
          self.apply(ctx, text, onPick);
        });
        var del = document.createElement("button");
        del.type = "button";
        del.className = "cm-toolbar-search-btn";
        del.innerHTML = "&times;";
        del.addEventListener("mousedown", function(e) {
          e.stopPropagation();
          e.preventDefault();
          var next = items.filter(function(s) {
            return s !== text;
          });
          self.persist(ctx, next);
          self.render(ctx, next, onPick);
        });
        item.appendChild(del);
        ctx.container.appendChild(item);
      });
      if (ctx.input) syncToolbarSearchChrome(ctx.input);
    },
    save: function(scopeId) {
      var ctx = ToolbarSearch.ctx(scopeId);
      if (!ctx || !ctx.input) return;
      var val = ctx.input.value.trim();
      if (!val) return;
      var items = ToolbarSearch.load(ctx);
      if (items.indexOf(val) >= 0) return;
      items.push(val);
      ToolbarSearch.persist(ctx, items);
      var onPick = ctx.backend === "server" && ctx.input ? serverToolbarSearchApplyClient(ctx.input) : null;
      ToolbarSearch.render(ctx, items, onPick);
    },
    toggle: function(scopeId) {
      var ctx = ToolbarSearch.ctx(scopeId);
      if (!ctx || !ctx.dropdown) return;
      var opening = ctx.dropdown.classList.contains("is-hidden");
      if (opening) {
        var onPick = ctx.backend === "server" && ctx.input ? serverToolbarSearchApplyClient(ctx.input) : null;
        ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), onPick);
      }
      setSavedSearchPanelOpen(ctx.dropdown, opening);
    },
    mount: function(scopeId, initialItems) {
      var ctx = ToolbarSearch.ctx(scopeId);
      if (!ctx) return;
      if (initialItems && initialItems.length) {
        ctx.root.dataset.cmSavedSearches = JSON.stringify(initialItems);
      }
      ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), null);
    },
    bindDismiss: function() {
      if (getGlobal()._cmSavedSearchDismissBound) return;
      getGlobal()._cmSavedSearchDismissBound = true;
      document.addEventListener("click", function(e) {
        document.querySelectorAll('[id^="cm-saved-searches-dropdown-"]').forEach(function(dd) {
          if (dd.classList.contains("is-hidden")) return;
          var scopeFor = dd.dataset.cmSavedDropdownFor || "";
          var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(scopeFor) : scopeFor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          if (!scopeFor) return;
          var root = document.querySelector(
            '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
          );
          if (root && !root.contains(e.target)) setSavedSearchPanelOpen(dd, false);
        });
      });
    }
  };
  ToolbarSearch.bindDismiss();
  function syncToolbarSearchChrome(input) {
    const wrap = input == null ? void 0 : input.closest("[data-cm-toolbar-search-root]");
    if (!wrap || !input) return;
    const ctx = ToolbarSearch.ctx(wrap.dataset.cmSearchScopeId || "", wrap);
    const val = (input.value || "").trim();
    const clearBtn = wrap.querySelector(".cm-toolbar-search-clear");
    clearBtn == null ? void 0 : clearBtn.classList.toggle("is-visible", val.length > 0);
    const saveBtn = wrap.querySelector(
      '.cm-toolbar-search-action--save, [data-cm-grid-action="saveSearch"]'
    );
    const saved = ctx ? ToolbarSearch.load(ctx) : [];
    saveBtn == null ? void 0 : saveBtn.classList.toggle("is-active", !!(val && saved.includes(val)));
  }
  function serverToolbarSearchNavigate(searchInput) {
    var _a;
    const scopeId = ((_a = searchInput.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
    const shell = searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || document;
    const filterBar = shell.querySelector("[data-cm-filter-bar]");
    const searchName = searchInput.name || "q";
    const hiddenSearch = filterBar == null ? void 0 : filterBar.querySelector('input[data-cm-search][name="' + searchName + '"]');
    return function navigate() {
      const value = searchInput.value || "";
      if (hiddenSearch instanceof HTMLInputElement) hiddenSearch.value = value;
      if (!filterBar) return;
      const state = selectedFilterValues(filterBar);
      const q = value.trim();
      if (q) state[searchName] = q;
      else state[searchName] = "";
      window.location.href = withActiveTableColumns(
        buildFilterUrl(window.location.href, state),
        searchInput
      );
    };
  }
  function serverToolbarSearchApplyClient(searchInput) {
    var _a;
    const scopeId = ((_a = searchInput.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
    const shell = searchInput.closest(".cm-dashboard-page, .cm-page-table-layout, .cm-simple-wrapper, .cm-table-shell") || document;
    const filterBar = shell.querySelector("[data-cm-filter-bar]");
    const searchName = searchInput.name || "q";
    const hiddenSearch = filterBar == null ? void 0 : filterBar.querySelector('input[data-cm-search][name="' + searchName + '"]');
    return function applyClient() {
      syncToolbarSearchChrome(searchInput);
      if (hiddenSearch instanceof HTMLInputElement) {
        hiddenSearch.value = searchInput.value || "";
      }
      const layout = searchInput.closest(".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell") || searchInput.closest(".cm-dashboard-page");
      applyFiltersInScope(layout || document);
    };
  }
  function initToolbarSearch(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-cm-search-backend="server"][data-cm-toolbar-search]').forEach((searchInput) => {
      if (searchInput.dataset.cmToolbarSearchBound) return;
      searchInput.dataset.cmToolbarSearchBound = "1";
      const wrap = searchInput.closest("[data-cm-toolbar-search-root]");
      const scopeId = (wrap == null ? void 0 : wrap.dataset.cmSearchScopeId) || "";
      const clearBtn = wrap == null ? void 0 : wrap.querySelector(".cm-toolbar-search-clear");
      function syncStateUi() {
        const value = searchInput.value || "";
        if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
      }
      const navigate = serverToolbarSearchNavigate(searchInput);
      const applyClient = serverToolbarSearchApplyClient(searchInput);
      const ctx = ToolbarSearch.ctx(scopeId, wrap);
      if (ctx) ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), applyClient);
      searchInput.addEventListener("input", () => {
        syncStateUi();
        applyClient();
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        navigate();
      });
      clearBtn == null ? void 0 : clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        searchInput.value = "";
        syncStateUi();
        applyClient();
        navigate();
      });
      syncStateUi();
      syncToolbarSearchChrome(searchInput);
    });
    root.querySelectorAll('[data-cm-search-backend="ag_grid"][data-cm-toolbar-search]').forEach((searchInput) => {
      if (searchInput.dataset.cmToolbarSearchChromeBound) return;
      searchInput.dataset.cmToolbarSearchChromeBound = "1";
      syncToolbarSearchChrome(searchInput);
      searchInput.addEventListener("input", () => syncToolbarSearchChrome(searchInput));
    });
  }
  function initFilterBars(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-filter-bar]").forEach((bar) => {
      if (!bar.dataset.cmFbBound) {
        bar.dataset.cmFbBound = "1";
        bindFilterBar(bar);
      }
    });
    initToolbarSearch(root);
  }
  function bootGridViewScope(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    if (!root.querySelector) return;
    const hasWidgets = root.querySelector("[data-cm-table]") || root.querySelector("[data-cm-filter-bar]") || root.querySelector("[data-cm-chart-config]") || root.querySelector("[data-cm-kpi-root]") || root.querySelector("[data-cm-tab-group]");
    if (!hasWidgets) return;
    initAllSimpleTables(root);
    initFilterBars(root);
    initButtonEllipsisTips(root);
    initTabGroups(root);
    Kpi.initAllKpi(root);
    Charts.initAllCharts(root);
  }
  function initTabGroups(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-cm-tab-group]").forEach((group) => {
      if (group.dataset.cmTabBound) return;
      group.dataset.cmTabBound = "1";
      group.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cm-tab-target]");
        if (!btn || !group.contains(btn)) return;
        const targetId = btn.getAttribute("data-cm-tab-target");
        if (!targetId) return;
        group.querySelectorAll("[data-cm-tab-target]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const container = group.parentElement;
        if (!container) return;
        container.querySelectorAll(".cm-card-tab-pane").forEach((pane) => {
          pane.classList.toggle("hidden", pane.id !== targetId);
        });
      });
    });
  }
  document.addEventListener("click", () => {
    document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
  });
  var FilterBar = {
    bindFilterBar,
    initFilterBars,
    initToolbarSearch,
    initColumnFilters,
    navigateWithTableFilters,
    parseSmartQuery,
    buildFilterUrl,
    withActiveTableColumns,
    selectedFilterValues,
    applyFilterValues,
    syncToolbarSearchChrome,
    collectColumnFilters: collectColumnFiltersObject,
    serializeColumnFilters,
    matchColumnFilter
  };

  // src/grid-view/actions.ts
  function handleToolbarSavedSearchClick(e) {
    var _a, _b;
    var gridBtn = e.target.closest(
      '[data-cm-grid-action="saveSearch"], [data-cm-grid-action="toggleSavedSearches"], [data-cm-grid-action="clearSearch"], [data-cm-toolbar-search-clear][data-cm-grid-action="clearSearch"]'
    );
    if (!gridBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var scopeId = gridBtn.getAttribute("data-cm-grid-id") || gridBtn.getAttribute("data-cm-search-scope-id") || ((_a = gridBtn.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
    if (!scopeId) return;
    var action = gridBtn.getAttribute("data-cm-grid-action");
    if (action === "saveSearch") ToolbarSearch.save(scopeId);
    else if (action === "toggleSavedSearches") ToolbarSearch.toggle(scopeId);
    else if (action === "clearSearch") {
      var clearInput = (_b = gridBtn.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _b.querySelector("[data-cm-toolbar-search]");
      if (clearInput) {
        clearInput.value = "";
        syncToolbarSearchChrome(clearInput);
      }
      invokeGridAction(scopeId, "clearSearch");
    }
  }
  function bindDelegatedGridActions() {
    if (getGlobal()._cmGridActionsBound) return;
    getGlobal()._cmGridActionsBound = true;
    document.addEventListener("click", handleToolbarSavedSearchClick, true);
    document.addEventListener("click", function(e) {
      var colBtn = e.target.closest("[data-cm-col-action]");
      if (colBtn) {
        var colAction = colBtn.getAttribute("data-cm-col-action");
        var colGridId = colBtn.getAttribute("data-cm-grid-id");
        if (colAction === "toggle") invokeGridAction(colGridId, "toggleColSelector");
        else if (colAction === "reset") invokeGridAction(colGridId, "resetColumnsToDefault");
        else if (colAction === "savePreset") invokeGridAction(colGridId, "saveCurrentPreset");
        return;
      }
    });
    document.addEventListener("input", function(e) {
      var inp = e.target.closest("[data-cm-grid-search]");
      if (!inp) return;
      if (inp.getAttribute("data-cm-grid-search-apply") === "enter") return;
      invokeGridAction(inp.getAttribute("data-cm-grid-id"), "onQuickFilterChanged");
    });
    document.addEventListener("keydown", function(e) {
      if (e.key !== "Enter") return;
      var inp = e.target.closest(
        '[data-cm-grid-search][data-cm-grid-search-apply="enter"]'
      );
      if (!inp) return;
      e.preventDefault();
      invokeGridAction(inp.getAttribute("data-cm-grid-id"), "reloadData");
    });
  }
  function initSimpleTableColumnSettings(wrapper) {
    var fn = getGlobal().GridView && getGlobal().GridView.initSimpleTableColumnSettings;
    if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
      return fn(wrapper);
    }
    return null;
  }

  // src/grid-view/grid-adapter.ts
  function staticRowsAdapter(rows) {
    var snapshot = rows || [];
    return {
      getRows: function() {
        return snapshot;
      },
      onChange: function() {
        return function() {
        };
      }
    };
  }
  function createAgGridAdapter(gridApi) {
    if (!gridApi) return staticRowsAdapter([]);
    return {
      getRows: function() {
        var out = [];
        gridApi.forEachNodeAfterFilterAndSort(function(node) {
          if (node && node.data) out.push(node.data);
        });
        return out;
      },
      onChange: function(cb) {
        var events = ["filterChanged", "sortChanged", "modelUpdated"];
        events.forEach(function(ev) {
          gridApi.addEventListener(ev, cb);
        });
        return function() {
          events.forEach(function(ev) {
            gridApi.removeEventListener(ev, cb);
          });
        };
      }
    };
  }
  function initGridKpiStrip(kpiRoot, specs, adapter, columns) {
    if (!kpiRoot || !specs || !specs.length || !adapter) return null;
    function refresh() {
      Kpi.initKpiStrip(kpiRoot, resolveKpis(specs, adapter.getRows()), columns);
    }
    refresh();
    return adapter.onChange(refresh);
  }
  function bindGridKpis(opts) {
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    if (!adapter) return null;
    var unsubs = [];
    scope.querySelectorAll("[data-cm-grid-kpi]").forEach(function(wrap) {
      if (wrap.dataset.cmGridKpiReady) return;
      var specs;
      try {
        specs = JSON.parse(wrap.dataset.cmGridKpiSpecs || "[]");
      } catch (e) {
        specs = [];
      }
      var columns = parseInt(wrap.dataset.cmKpiColumns || "4", 10);
      var kpiRoot = wrap.querySelector("[data-cm-kpi-root]") || wrap;
      var unsub = initGridKpiStrip(kpiRoot, specs, adapter, columns);
      if (typeof unsub === "function") unsubs.push(unsub);
      wrap.dataset.cmGridKpiReady = "1";
    });
    return function disconnect() {
      unsubs.forEach(function(u) {
        u();
      });
    };
  }
  function bindGridFilteredCharts(scope, adapter) {
    if (!adapter) return null;
    var root = scope && scope.querySelectorAll ? scope : document;
    var unsubs = [];
    root.querySelectorAll("[data-cm-chart-config]").forEach(function(node) {
      if (node.dataset.cmChartInteractive) return;
      var config;
      try {
        config = JSON.parse(node.dataset.cmChartConfig || "{}");
      } catch (e) {
        return;
      }
      if (config.dataSource !== "grid_filtered") return;
      function refresh() {
        Charts.refreshChartWrap(node, config, adapter.getRows());
      }
      refresh();
      var unsub = adapter.onChange(refresh);
      if (typeof unsub === "function") unsubs.push(unsub);
      node.dataset.cmChartReady = "1";
    });
    return function disconnect() {
      unsubs.forEach(function(u) {
        u();
      });
    };
  }
  var GridAdapter = {
    staticRowsAdapter,
    createAgGridAdapter,
    resolveKpis,
    bindGridKpis,
    bindGridFilteredCharts
  };

  // src/grid-view/init.ts
  function init(opts) {
    var _a, _b;
    opts = opts || {};
    var scope = opts.root || document;
    var adapter = opts.gridAdapter;
    var disconnectFns = [];
    if (opts.artifact) {
      const artifact = opts.artifact;
      if ((_a = artifact.kpis) == null ? void 0 : _a.length) {
        const kpiRoot = scope.querySelector("[data-cm-kpi-root]");
        if (kpiRoot) {
          Kpi.initKpiStrip(kpiRoot, artifact.kpis, (_b = artifact.layout) == null ? void 0 : _b.kpiColumns);
        }
      }
      (artifact.charts || []).forEach((chartCfg) => {
        const el = scope.querySelector(`[data-cm-chart-id="${chartCfg.id}"]`);
        if (el) {
          Charts.initChart(
            el.querySelector("[data-cm-chart-root]") || el,
            chartCfg,
            artifact.rows || []
          );
        }
      });
    }
    if (adapter) {
      var dKpi = bindGridKpis({ root: scope, gridAdapter: adapter });
      if (dKpi) disconnectFns.push(dKpi);
      var dCharts = bindGridFilteredCharts(scope, adapter);
      if (dCharts) disconnectFns.push(dCharts);
    }
    Kpi.initAllKpi(scope);
    Charts.initAllCharts(scope);
    initAllSimpleTables(scope);
    initFilterBars(scope);
    initButtonEllipsisTips(scope);
    initTabGroups(scope);
    if (typeof opts.onCellEdit === "function") {
      scope.querySelectorAll("[data-cm-editable]").forEach((cell) => {
        if (cell.dataset.cmEditBound) return;
        cell.dataset.cmEditBound = "1";
        cell.addEventListener("blur", () => {
          var _a2, _b2;
          const row = cell.closest(".cm-row");
          opts.onCellEdit({
            gridId: (_a2 = row == null ? void 0 : row.closest("[data-grid-id]")) == null ? void 0 : _a2.dataset.gridId,
            rowId: row == null ? void 0 : row.dataset.cmRowId,
            columnKey: cell.dataset.cmColumnKey,
            oldValue: cell.dataset.cmOldValue,
            newValue: (_b2 = cell.textContent) == null ? void 0 : _b2.trim(),
            row: {}
          });
        });
      });
    }
    if (disconnectFns.length) {
      return function disconnect() {
        disconnectFns.forEach(function(fn) {
          fn();
        });
      };
    }
  }

  // src/grid-view/ag-grid.ts
  function getQuickSearchText(gridIdOrHandle) {
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var id = handle && handle.gridId || (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
    if (handle && handle._searchText) return handle._searchText;
    var input = id ? document.getElementById("ag-quick-filter-" + id) : null;
    if (input && input.value) return input.value.trim();
    if (id) {
      var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      var toolbarRoot = document.querySelector(
        '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
      );
      var toolbarSearch = toolbarRoot && toolbarRoot.querySelector("[data-cm-toolbar-search]");
      if (toolbarSearch && toolbarSearch.value) return toolbarSearch.value.trim();
      var wrapper = document.querySelector('[data-grid-id="' + esc + '"]');
      var localSearch = wrapper && wrapper.querySelector("[data-cm-search]");
      if (localSearch && localSearch.value) return localSearch.value.trim();
    }
    return (new URLSearchParams(window.location.search).get("q") || "").trim();
  }
  function absorbUrlSearchQuery(handle, options) {
    options = options || {};
    var paramName = options.urlSearchParam || "q";
    var urlQ = new URLSearchParams(window.location.search).get(paramName);
    if (!urlQ || handle._urlQAbsorbed) return "";
    handle._searchText = urlQ;
    handle._urlQAbsorbed = true;
    setTimeout(function() {
      var searchInput = document.getElementById("ag-quick-filter-" + handle.gridId);
      if (searchInput) searchInput.value = urlQ;
    }, 50);
    return urlQ;
  }
  function buildInfiniteQueryParams(blockParams, gridIdOrHandle, options) {
    options = options || {};
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var extra = options.getExtraParams && options.getExtraParams() || {};
    var qf = getQuickSearchText(handle);
    if (options.absorbUrlSearch !== false) {
      var absorbed = absorbUrlSearchQuery(handle, options);
      if (absorbed) qf = absorbed;
    }
    var params = new URLSearchParams();
    Object.keys(extra).forEach(function(key) {
      var val = extra[key];
      if (val != null && val !== "") params.set(key, String(val));
    });
    if (blockParams) {
      params.set("startRow", String(blockParams.startRow));
      params.set("endRow", String(blockParams.endRow));
      var filterModel = blockParams.filterModel || {};
      if (Object.keys(filterModel).length) {
        params.set("filters", JSON.stringify(filterModel));
      }
      if (blockParams.sortModel && blockParams.sortModel.length) {
        params.set("sort", JSON.stringify(blockParams.sortModel));
      }
    }
    if (qf) params.set("q", qf);
    if (handle && handle.gridApi && options.includeVisibleCols !== false) {
      var visibleCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
        return col.getColId();
      }).join(",");
      if (visibleCols) params.set("cols", visibleCols);
    }
    return params;
  }
  function createInfiniteDatasource(options) {
    var url = options.url;
    var gridId = options.gridId;
    return {
      getRows: function(blockParams) {
        var handle = gridId ? byId.get(gridId) : null;
        if (!handle) {
          blockParams.failCallback();
          return;
        }
        var params = buildInfiniteQueryParams(blockParams, handle, options);
        handle.showLoading();
        fetch(url + "?" + params.toString()).then(function(response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then(function(data) {
          if (handle.gridApi) handle.hideOverlay();
          blockParams.successCallback(data.data, data.lastRow);
          if (typeof options.onLastRow === "function") {
            options.onLastRow(data.lastRow);
          }
        }).catch(function(error) {
          console.error("[GridView.AgGrid] infinite fetch failed:", error);
          if (handle.gridApi) handle.hideOverlay();
          blockParams.failCallback();
        });
      }
    };
  }
  function syncExportLinks(gridIdOrHandle, options) {
    options = options || {};
    var gridId = typeof gridIdOrHandle === "string" ? gridIdOrHandle : gridIdOrHandle && gridIdOrHandle.gridId;
    if (!gridId) return;
    var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(gridId) : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + esc + '"]').forEach(function(linkEl) {
      var extraFn = linkEl.getAttribute("data-cm-export-extra-fn");
      var linkOpts = Object.assign({}, options);
      if (extraFn && typeof getGlobal()[extraFn] === "function" && !linkOpts.getExtraParams) {
        linkOpts.getExtraParams = getGlobal()[extraFn];
      }
      syncExportHref(linkEl, gridId, linkOpts);
    });
  }
  function syncExportHref(linkEl, gridIdOrHandle, options) {
    if (!linkEl || !linkEl.href) return;
    options = options || {};
    var target = new URL(linkEl.href, window.location.origin);
    var extra = options.getExtraParams && options.getExtraParams() || {};
    Object.keys(extra).forEach(function(key) {
      var val = extra[key];
      if (val != null && val !== "") target.searchParams.set(key, String(val));
      else target.searchParams.delete(key);
    });
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var qf = getQuickSearchText(handle || gridIdOrHandle);
    if (qf) target.searchParams.set("q", qf);
    else target.searchParams.delete("q");
    var gridId = handle && handle.gridId || (typeof gridIdOrHandle === "string" ? gridIdOrHandle : "");
    var colScope = linkEl;
    if (gridId) {
      var escGrid = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(gridId) : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      colScope = document.querySelector('[data-grid-id="' + escGrid + '"]') || linkEl.closest(".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell") || document;
    }
    var colQ = serializeColumnFilters(colScope);
    if (colQ) target.searchParams.set("col_q", colQ);
    else target.searchParams.delete("col_q");
    if (handle && handle.gridApi) {
      var filterModel = handle.gridApi.getFilterModel() || {};
      if (Object.keys(filterModel).length) {
        target.searchParams.set("filters", JSON.stringify(filterModel));
      } else {
        target.searchParams.delete("filters");
      }
      var sortState = handle.gridApi.getColumnState().filter(function(col) {
        return col.sort;
      });
      if (sortState.length) {
        target.searchParams.set(
          "sort",
          JSON.stringify(
            sortState.map(function(col) {
              return { colId: col.colId, sort: col.sort };
            })
          )
        );
      } else {
        target.searchParams.delete("sort");
      }
      if (options.exportColumns !== false) {
        var visibleCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
          return col.getColId();
        }).join(",");
        if (visibleCols) target.searchParams.set("export_cols", visibleCols);
        else target.searchParams.delete("export_cols");
      } else {
        target.searchParams.delete("export_cols");
      }
      if (options.includeVisibleCols) {
        var gridCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
          return col.getColId();
        }).join(",");
        if (gridCols) target.searchParams.set("cols", gridCols);
        else target.searchParams.delete("cols");
      } else {
        target.searchParams.delete("cols");
      }
    } else if (handle && handle.adapter && typeof handle.adapter.getDisplayedColumnIds === "function") {
      var domCols = handle.adapter.getDisplayedColumnIds().join(",");
      if (domCols) target.searchParams.set("export_cols", domCols);
      else target.searchParams.delete("export_cols");
    }
    linkEl.href = target.toString();
  }
  var AgGrid = {
    getQuickSearchText,
    buildInfiniteQueryParams,
    createInfiniteDatasource,
    syncExportHref,
    syncExportLinks
  };

  // src/grid-view/create-grid-view.ts
  function createGridView() {
    var _a;
    const g = getGlobal();
    const inheritedPreferencesUrl = ((_a = g.GridView) == null ? void 0 : _a.preferencesUrl) || "";
    return {
      preferencesUrl: inheritedPreferencesUrl,
      init,
      byId,
      SimpleTable: { initAll: initAllSimpleTables },
      initSimpleTableColumnSettings,
      Charts,
      Kpi,
      GridAdapter,
      i18n,
      initChart: Charts.initChart,
      refreshChartWrap: Charts.refreshChartWrap,
      initAllCharts: Charts.initAllCharts,
      initAllKpi: Kpi.initAllKpi,
      buildEchartsOption: Charts.buildEchartsOption,
      staticRowsAdapter,
      createAgGridAdapter,
      resolveKpis,
      bindGridKpis,
      bindGridFilteredCharts,
      FilterBar,
      initToolbarSearch,
      ToolbarSearch,
      AgGrid,
      bootScope: bootGridViewScope,
      parseSmartQuery,
      matchColumnFilter,
      matchToolbarQuery,
      matchAgGridQuickFilter,
      buildFilterUrl,
      initButtonEllipsisTips
    };
  }
  function bootstrapGridView() {
    const g = getGlobal();
    const GridView = createGridView();
    if (g.GridViewI18n) {
      i18n.initI18n(g.GridViewI18n);
    }
    attachSimpleTableGlobals();
    bindDelegatedGridActions();
    g.GridView = GridView;
    if (typeof document !== "undefined") {
      document.addEventListener("DOMContentLoaded", () => {
        bootGridViewScope(document);
      });
    }
    return GridView;
  }

  // src/grid-view-entry.ts
  bootstrapGridView();
})();
