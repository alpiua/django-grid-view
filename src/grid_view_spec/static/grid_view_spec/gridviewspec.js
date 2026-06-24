/** grid-view-spec — built from frontend/src/spec-boot.ts */

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
    var _a, _b;
    const shell = (_a = table == null ? void 0 : table.closest) == null ? void 0 : _a.call(table, "[data-grid-id]");
    return shell instanceof HTMLElement ? ((_b = shell.dataset.gridId) == null ? void 0 : _b.trim()) || "" : "";
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
    if (!handle || typeof handle !== "object") return;
    const fn = Reflect.get(handle, method);
    if (typeof fn === "function") {
      fn.call(handle);
    }
  }

  // src/grid-view/registry-api.ts
  var _renderers = /* @__PURE__ */ new Map();
  var _commits = /* @__PURE__ */ new Map();
  var _actions = /* @__PURE__ */ new Map();
  function registerRenderer(name, fn) {
    if (!name || typeof fn !== "function") return;
    _renderers.set(name, fn);
  }
  function registerCommit(name, fn) {
    if (!name || typeof fn !== "function") return;
    _commits.set(name, fn);
  }
  function registerAction(name, fn) {
    if (!name || typeof fn !== "function") return;
    _actions.set(name, fn);
  }
  function invokeAction(name, ctx) {
    const fn = _actions.get(name);
    if (typeof fn === "function") fn(ctx);
  }
  async function invokeCommit(name, ctx) {
    const fn = _commits.get(name);
    if (typeof fn !== "function") return false;
    const result = await fn(ctx);
    return result !== false;
  }
  function getRegisteredRenderer(name) {
    return _renderers.get(name);
  }

  // src/grid-view/dom-guards.ts
  function asHTMLElement(el) {
    return el instanceof HTMLElement ? el : null;
  }
  function asHtmlInput(el) {
    return el instanceof HTMLInputElement ? el : null;
  }
  function eventTargetElement(target) {
    if (target instanceof HTMLElement) return target;
    let el = target instanceof Element ? target : null;
    while (el && !(el instanceof HTMLElement)) {
      el = el.parentElement;
    }
    return el instanceof HTMLElement ? el : null;
  }
  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
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
    if (t2.length > 1 && t2.charAt(0) === "^") return true;
    if (t2.length > 1 && t2.charAt(t2.length - 1) === "$") return true;
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
    if (q.length > 1 && q.charAt(0) === "^") {
      const prefix = q.slice(1).trim().toLowerCase();
      return !!prefix && hayFold.startsWith(prefix);
    }
    if (q.length > 1 && q.charAt(q.length - 1) === "$") {
      const suffix = q.slice(0, -1).trim().toLowerCase();
      return !!suffix && hayFold.endsWith(suffix);
    }
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
    if (!quoted && t2.length > 1 && t2.charAt(0) === "!") {
      return !matchQueryTerm(hay, t2.slice(1).trim(), options);
    }
    if (termIsExpression(t2)) return matchColumnExpression(hay, t2);
    if (quoted || t2.indexOf(" ") >= 0) return literalContains(hay, t2);
    return spaceInsensitiveContains(hay, t2);
  }

  // src/grid-view/search/contract.ts
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
    if (t2.length > 1 && t2.charAt(0) === "^" || t2.length > 1 && t2.charAt(t2.length - 1) === "$" || t2.length > 1 && t2.charAt(0) === "!") {
      tokens.add("wildcard" /* Wildcard */);
    }
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
  function isRecord2(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function isSetFilterModel(value) {
    if (!isRecord2(value)) return false;
    if (value.mode === "empty" || value.mode === "non_empty") return true;
    return Array.isArray(value.values);
  }
  function isEmptyCellValue(val) {
    const tv = String(val === null || val === void 0 ? "" : val).trim();
    return tv === "" || tv === "-" || tv === "\u2014" || tv === "\u2013" || tv === "[]";
  }
  function isNumericZeroCell(val) {
    return parseNumberForColumnFilter(val) === 0;
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
      const isEmpty = tokens.length === 0 || (options == null ? void 0 : options.numeric) === true && isNumericZeroCell(cellText);
      if (model.mode === "empty") return isEmpty;
      if (model.mode === "non_empty") return !isEmpty;
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
    if (!isRecord2(raw)) return null;
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
    return matchSetFilter(cellText, entry, {
      tokens: options == null ? void 0 : options.tokens,
      match: options == null ? void 0 : options.match,
      numeric: (options == null ? void 0 : options.profile) === "numeric" /* Numeric */
    });
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
        if (table.classList.contains("cm-table--resizing")) return;
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
    return Array.from(row.querySelectorAll("th[data-cm-col-key]")).filter(
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
  function visibleLeafHeaderCells(table) {
    return leafHeaderCells(table).filter(function(th) {
      return !th.classList.contains("cm-col-hidden");
    });
  }
  function leafHeaderCell(table, colKey) {
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(colKey) : colKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const rows = table.querySelectorAll("thead tr");
    const leaf = rows.length ? rows[rows.length - 1] : null;
    if (!leaf) return null;
    const th = leaf.querySelector('th[data-cm-col-key="' + esc + '"]');
    return th instanceof HTMLElement ? th : null;
  }
  function isColumnHidden(table, colKey) {
    var _a;
    const th = leafHeaderCell(table, colKey);
    return (_a = th == null ? void 0 : th.classList.contains("cm-col-hidden")) != null ? _a : false;
  }
  function applyHiddenColumnWidth(table, colKey) {
    const col = colElementForKey(table, colKey);
    if (col) {
      col.style.width = "0";
      col.style.minWidth = "0";
      col.style.maxWidth = "0";
      col.dataset.cmColZero = "1";
    }
    const th = leafHeaderCell(table, colKey);
    if (th) {
      th.style.width = "0";
      th.style.minWidth = "0";
      th.dataset.cmColWidth = "0";
    }
  }
  function applyColumnWidth(table, colKey, widthPx) {
    if (isColumnHidden(table, colKey)) {
      applyHiddenColumnWidth(table, colKey);
      return 0;
    }
    const w = Math.max(MIN_COL_WIDTH, Math.round(widthPx));
    const px = w + "px";
    const col = colElementForKey(table, colKey);
    if (col) {
      col.style.width = px;
      col.style.minWidth = "";
      delete col.dataset.cmColZero;
    }
    const th = leafHeaderCell(table, colKey);
    if (th) {
      th.style.width = px;
      th.style.minWidth = "";
      th.dataset.cmColWidth = String(w);
    }
    return w;
  }
  function syncHiddenColumnWidths(table) {
    leafHeaderCells(table).forEach(function(th) {
      const key = th.dataset.cmColKey;
      if (!key) return;
      if (th.classList.contains("cm-col-hidden")) {
        applyHiddenColumnWidth(table, key);
      } else {
        const col = colElementForKey(table, key);
        if (col) delete col.dataset.cmColZero;
      }
    });
  }
  function sumVisibleColumnWidths(table) {
    let sum = 0;
    visibleLeafHeaderCells(table).forEach(function(th) {
      const key = th.dataset.cmColKey;
      if (!key) return;
      const w = readColumnWidthPx(table, key);
      if (w !== null) sum += w;
    });
    return sum;
  }
  function syncTableWidthFromColumns(table) {
    if (!table.classList.contains("cm-table--has-col-widths")) {
      table.style.width = "";
      return;
    }
    const sum = sumVisibleColumnWidths(table);
    if (sum > 0) {
      table.style.width = sum + "px";
    }
  }
  function rebalanceTableColumnLayout(table) {
    if (!table.classList.contains("cm-table--has-col-widths")) return;
    syncHiddenColumnWidths(table);
    syncTableWidthFromColumns(table);
  }
  function neighborHeaderIndex(headers, index) {
    for (let i = index + 1; i < headers.length; i++) {
      if (!headers[i].classList.contains("cm-col-hidden")) return i;
    }
    for (let i = index - 1; i >= 0; i--) {
      if (!headers[i].classList.contains("cm-col-hidden")) return i;
    }
    return -1;
  }
  function seedFixedColumnWidths(table) {
    if (table.classList.contains("cm-table--has-col-widths")) return;
    ensureColgroup(table);
    const measured = [];
    visibleLeafHeaderCells(table).forEach(function(th) {
      const key = th.dataset.cmColKey;
      if (!key) return;
      measured.push({
        key,
        w: Math.max(MIN_COL_WIDTH, Math.round(th.getBoundingClientRect().width))
      });
    });
    syncHiddenColumnWidths(table);
    measured.forEach(function(item) {
      applyColumnWidth(table, item.key, item.w);
    });
    table.classList.add("cm-table--has-col-widths");
    syncHiddenColumnWidths(table);
    syncTableWidthFromColumns(table);
  }
  function resizeColumnWithNeighbor(table, colKey, widthPx) {
    seedFixedColumnWidths(table);
    const headers = visibleLeafHeaderCells(table);
    const index = headers.findIndex(function(th) {
      return th.dataset.cmColKey === colKey;
    });
    if (index < 0) return;
    const prevW = readColumnWidthPx(table, colKey);
    if (prevW === null) return;
    const nextW = Math.max(MIN_COL_WIDTH, Math.round(widthPx));
    const delta = nextW - prevW;
    if (delta === 0) return;
    applyColumnWidth(table, colKey, nextW);
    const neighborIndex = neighborHeaderIndex(headers, index);
    if (neighborIndex < 0) return;
    const neighborKey = headers[neighborIndex].dataset.cmColKey;
    if (!neighborKey) return;
    const neighborW = readColumnWidthPx(table, neighborKey);
    if (neighborW === null) return;
    applyColumnWidth(table, neighborKey, neighborW - delta);
    syncHiddenColumnWidths(table);
    syncTableWidthFromColumns(table);
  }
  function readColumnWidthPx(table, colKey) {
    if (isColumnHidden(table, colKey)) return 0;
    const col = colElementForKey(table, colKey);
    const raw = (col == null ? void 0 : col.style.width) || "";
    const m = raw.match(/^(\d+(?:\.\d+)?)px$/);
    if (m) return parseFloat(m[1]);
    const th = leafHeaderCell(table, colKey);
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
      if (!key || th.classList.contains("cm-col-hidden")) return;
      const w = readColumnWidthPx(table, key);
      if (w !== null && w > 0) widths[key] = w;
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
      var _a;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const headerTh = leafHeaderCell(table, colKey);
      if (!headerTh || headerTh.classList.contains("cm-col-hidden")) return;
      const activeHeaderTh = headerTh;
      seedFixedColumnWidths(table);
      const startX = e.clientX;
      const startW = (_a = readColumnWidthPx(table, colKey)) != null ? _a : activeHeaderTh.getBoundingClientRect().width;
      document.body.classList.add("cm-col-resize-active");
      table.classList.add("cm-table--resizing");
      activeHeaderTh.classList.add("cm-col-resize-active");
      let moveRefreshTimer = 0;
      function onMove(ev) {
        resizeColumnWithNeighbor(table, colKey, startW + (ev.clientX - startX));
        window.clearTimeout(moveRefreshTimer);
        moveRefreshTimer = window.setTimeout(function() {
          refreshTableHeaderTooltips(table);
          refreshTableCellTooltips(table);
        }, 50);
      }
      function onUp() {
        document.body.classList.remove("cm-col-resize-active");
        table.classList.remove("cm-table--resizing");
        activeHeaderTh.classList.remove("cm-col-resize-active");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        rebalanceTableColumnLayout(table);
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
    syncHiddenColumnWidths(table);
    leafHeaderCells(table).forEach(function(th) {
      const key = th.dataset.cmColKey;
      if (!key || th.classList.contains("cm-col-hidden")) return;
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
    if (typeof window !== "undefined") {
      window.GridViewColumnLayout = {
        rebalance: rebalanceTableColumnLayout
      };
    }
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll('[data-cm-column-settings="1"] [data-cm-table]').forEach(function(table) {
      if (!(table instanceof HTMLTableElement)) return;
      bindTableColumnResize(table);
      maybeSeedColumnWidths(table);
    });
  }
  function maybeSeedColumnWidths(table) {
    if (table.classList.contains("cm-table--has-col-widths")) return;
    if (!table.offsetWidth) return;
    if (!table.querySelector("tbody tr")) return;
    seedFixedColumnWidths(table);
  }

  // src/grid-view/charts-bridge.ts
  var chartsApi = null;
  function resolveApi() {
    var _a;
    if (chartsApi) return chartsApi;
    const registered = (_a = window.GridView) == null ? void 0 : _a.Charts;
    return registered && registered !== ChartsBridge ? registered : null;
  }
  var ChartsBridge = {
    initChart(root, config, rows) {
      var _a, _b;
      return (_b = (_a = resolveApi()) == null ? void 0 : _a.initChart(root, config, rows)) != null ? _b : null;
    },
    refreshChartWrap(wrap, config, rows) {
      var _a;
      (_a = resolveApi()) == null ? void 0 : _a.refreshChartWrap(wrap, config, rows);
    },
    initAllCharts(scope) {
      var _a;
      (_a = resolveApi()) == null ? void 0 : _a.initAllCharts(scope);
    },
    buildEchartsOption(config, rows) {
      const api = resolveApi();
      return api ? api.buildEchartsOption(config, rows) : null;
    }
  };

  // src/grid-view/simple-table.ts
  function isRowDict(value) {
    if (!isRecord(value)) return false;
    return Object.values(value).every(
      (v) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    );
  }
  function isChartRuntimeDict(value) {
    return isRecord(value);
  }
  function asHtmlTable(el) {
    return el instanceof HTMLTableElement ? el : null;
  }
  function simpleTableWrapper(table) {
    const wrapper = table.closest(
      ".cm-simple-wrapper, .cm-table-shell, .cm-page-table-layout, .cm-dashboard-page"
    ) || table.parentElement;
    return asHTMLElement(wrapper);
  }
  function ensureSimpleTableForTable(tableEl) {
    if (!tableEl) return null;
    const table = tableEl.matches("[data-cm-table]") ? asHtmlTable(tableEl) : asHtmlTable(tableEl.querySelector("[data-cm-table]"));
    if (!table) return null;
    if (table._cmSimpleTable instanceof SimpleTable) return table._cmSimpleTable;
    const wrapper = simpleTableWrapper(table);
    if (!wrapper) return null;
    const instance = new SimpleTable(wrapper, table);
    table._cmSimpleTable = instance;
    return instance;
  }
  function resolveDataTable(el) {
    if (!el) return null;
    if (el.matches("[data-cm-table][data-cm-col-filters]"))
      return asHtmlTable(el);
    return asHtmlTable(el.querySelector("[data-cm-table][data-cm-col-filters]"));
  }
  function clearSimpleTableFiltersForGrid(gridId) {
    if (!gridId) return false;
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(gridId) : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const shell = document.getElementById("cm-table-" + gridId);
    let table = resolveDataTable(shell);
    if (!table)
      table = resolveDataTable(
        document.querySelector('[data-grid-id="' + esc + '"]')
      );
    if (!table) return false;
    const simple = ensureSimpleTableForTable(table);
    if (!simple) return false;
    simple.clearAllFilters();
    return true;
  }
  function applyTableFilters(tableEl) {
    const table = resolveDataTable(tableEl);
    if (!table) return;
    const simple = ensureSimpleTableForTable(table);
    if (simple) {
      simple.applyAllFilters();
      return;
    }
    const wrapper = simpleTableWrapper(table);
    if (!wrapper) return;
    new SimpleTable(wrapper, table).applyAllFilters();
  }
  function applyFiltersInScope(scope) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach((tableEl) => {
      var _a;
      const table = asHtmlTable(tableEl);
      if (table) (_a = ensureSimpleTableForTable(table)) == null ? void 0 : _a.applyAllFilters();
    });
  }
  var SimpleTable = class {
    constructor(wrapper, tableEl) {
      this.sortKey = null;
      this.sortDir = null;
      this.w = wrapper;
      const table = tableEl || asHtmlTable(wrapper.querySelector("[data-cm-table]"));
      if (!table) throw new Error("SimpleTable: missing [data-cm-table]");
      this.table = table;
      const tbody = table.querySelector("tbody");
      if (!(tbody instanceof HTMLTableSectionElement))
        throw new Error("SimpleTable: missing tbody");
      this.tbody = tbody;
      Array.from(this.tbody.querySelectorAll("tr")).forEach((row, index) => {
        row.dataset.cmIdx = String(index);
      });
      this.bind();
    }
    _hasSectionGroups() {
      return this.tbody.querySelector(".cm-row-section") !== null;
    }
    _rowGroups() {
      const groups = [];
      let current = null;
      Array.from(this.tbody.children).forEach((child) => {
        if (!(child instanceof HTMLTableRowElement)) return;
        const tr = child;
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
      const cellAEl = asHTMLElement(cellA);
      const cellBEl = asHTMLElement(cellB);
      const va = (_c = (_b = cellAEl == null ? void 0 : cellAEl.dataset.cmSortVal) != null ? _b : (_a = cellAEl == null ? void 0 : cellAEl.textContent) == null ? void 0 : _a.trim()) != null ? _c : "";
      const vb = (_f = (_e = cellBEl == null ? void 0 : cellBEl.dataset.cmSortVal) != null ? _e : (_d = cellBEl == null ? void 0 : cellBEl.textContent) == null ? void 0 : _d.trim()) != null ? _f : "";
      const na = num2(va);
      const nb = num2(vb);
      if (na !== null && nb !== null) return na - nb;
      return String(va).localeCompare(String(vb), void 0, { numeric: true });
    }
    _appendRowGroups(groups) {
      groups.forEach((group) => {
        if (group.section) this.tbody.appendChild(group.section);
        group.rows.forEach((row) => {
          this.tbody.appendChild(row);
        });
      });
    }
    bind() {
      this.w.querySelectorAll("[data-cm-sort]").forEach((thEl) => {
        const th = asHTMLElement(thEl);
        if (!th) return;
        if (th.dataset.cmBound) return;
        th.dataset.cmBound = "1";
        th.addEventListener("click", (e) => {
          const target = eventTargetElement(e.target);
          if (target == null ? void 0 : target.closest(
            "[data-cm-col-filter-trigger], [data-cm-col-filter-clear], [data-cm-col-resize], .cm-th-header-tools, [data-cm-th-tools]"
          )) {
            return;
          }
          if (!th.dataset.cmSort) return;
          this._sort(th);
        });
      });
      const inp = asHTMLElement(this.w.querySelector("[data-cm-search]"));
      if (inp && !inp.dataset.cmBound) {
        inp.dataset.cmBound = "1";
        inp.addEventListener("input", () => {
          this.applyAllFilters();
        });
      }
      this.tbody.querySelectorAll("[data-cm-row-url]").forEach((rowEl) => {
        const row = asHTMLElement(rowEl);
        if (!row) return;
        if (row.dataset.cmRowUrlBound) return;
        row.dataset.cmRowUrlBound = "1";
        row.style.cursor = "pointer";
        row.addEventListener("click", (event) => {
          const target = eventTargetElement(event.target);
          if (target == null ? void 0 : target.closest("a,button,[data-cm-cell-action],[data-cm-cell-edit]"))
            return;
          const url = row.dataset.cmRowUrl;
          if (url) window.location.href = url;
        });
      });
      this.tbody.querySelectorAll("[data-cm-row-action]").forEach((rowEl) => {
        const row = asHTMLElement(rowEl);
        if (!row) return;
        if (row.dataset.cmRowActionBound) return;
        row.dataset.cmRowActionBound = "1";
        row.style.cursor = "pointer";
        row.addEventListener("click", (event) => {
          const target = eventTargetElement(event.target);
          if (target == null ? void 0 : target.closest("a,button,[data-cm-cell-action],[data-cm-cell-edit]"))
            return;
          const action = row.dataset.cmRowAction;
          if (!action) return;
          invokeAction(action, {
            rowId: row.dataset.cmRowId,
            gridId: this.w.getAttribute("data-grid-id") || void 0,
            event
          });
        });
      });
    }
    _colIndex(th) {
      const idx = th.dataset.cmCol;
      if (idx !== void 0 && idx !== "") {
        return parseInt(idx, 10);
      }
      return th.parentElement ? Array.from(th.parentElement.children).indexOf(th) : 0;
    }
    _sort(th) {
      const key = th.dataset.cmSort || "";
      this.sortDir = this.sortKey === key ? this.sortDir === "asc" ? "desc" : this.sortDir === "desc" ? null : "asc" : "asc";
      this.sortKey = this.sortDir ? key : null;
      const idx = this._colIndex(th);
      if (this._hasSectionGroups()) {
        if (!this.sortDir) {
          Array.from(this.tbody.querySelectorAll("tr")).sort((a, b) => Number(a.dataset.cmIdx) - Number(b.dataset.cmIdx)).forEach((row) => this.tbody.appendChild(row));
        } else {
          const groups = this._rowGroups();
          const dir = this.sortDir;
          groups.forEach((group) => {
            group.rows.sort((a, b) => {
              const cmp = this._compareRows(a, b, idx);
              return dir === "asc" ? cmp : -cmp;
            });
          });
          this._appendRowGroups(groups);
        }
      } else {
        const rows = Array.from(
          this.tbody.querySelectorAll(".cm-row")
        );
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
      this.w.querySelectorAll("[data-cm-sort]").forEach((headerEl) => {
        const headerTh = asHTMLElement(headerEl);
        if (!headerTh) return;
        const isSorted = this.sortDir !== null && headerTh.dataset.cmSort === this.sortKey;
        headerTh.classList.toggle("cm-th-sorted", isSorted);
        headerTh.classList.toggle(
          "cm-th-sort-asc",
          isSorted && this.sortDir === "asc"
        );
        headerTh.classList.toggle(
          "cm-th-sort-desc",
          isSorted && this.sortDir === "desc"
        );
      });
    }
    clearAllFilters() {
      var _a, _b;
      const toolbarSearch = (_a = this.w.closest(".cm-dashboard-page, .cm-grid-view-spec")) == null ? void 0 : _a.querySelector("[data-cm-toolbar-search]");
      if (toolbarSearch instanceof HTMLInputElement) {
        toolbarSearch.value = "";
        delete toolbarSearch.dataset.cmSearchCommitted;
        toolbarSearch.dispatchEvent(new Event("input", { bubbles: true }));
      }
      this.w.querySelectorAll("th[data-cm-col-key]").forEach((th) => {
        delete th.dataset.cmColFilterValue;
      });
      this.w.querySelectorAll(".cm-col-filter-btn").forEach((btn) => {
        btn.classList.remove("is-active", "is-open");
      });
      this.w.querySelectorAll(".cm-col-filter-clear").forEach((btn) => {
        btn.classList.remove("is-visible");
      });
      const url = new URL(window.location.href);
      ["q", "filters", "col_q"].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({}, "", url);
      const gridId = this.w.dataset.gridId || ((_b = this.table.closest("[data-grid-id]")) == null ? void 0 : _b.dataset.gridId) || "";
      if (gridId) {
        localStorage.removeItem("cmColState_" + gridId);
        localStorage.removeItem("cmTableState_" + gridId);
      }
      this.applyAllFilters();
      document.dispatchEvent(
        new CustomEvent("cm-grid-state-change", { detail: { gridId } })
      );
    }
    _gridId() {
      var _a;
      return this.w.dataset.gridId || ((_a = this.table.closest("[data-grid-id]")) == null ? void 0 : _a.dataset.gridId) || "";
    }
    hasActiveFilters() {
      var _a;
      const toolbarSearch = (_a = this.w.closest(".cm-dashboard-page, .cm-grid-view-spec")) == null ? void 0 : _a.querySelector("[data-cm-toolbar-search]");
      if (toolbarSearch instanceof HTMLInputElement) {
        if ((toolbarSearch.value || "").trim()) return true;
        if ((toolbarSearch.dataset.cmSearchCommitted || "").trim()) return true;
      }
      if (Object.keys(collectColumnFiltersFromTable(this.table)).length)
        return true;
      const params = new URLSearchParams(window.location.search);
      if (params.has("q") || params.has("col_q")) return true;
      return false;
    }
    syncFilterChrome() {
      syncColumnFilterChrome(this.table);
      const active = this.hasActiveFilters();
      const gridId = this._gridId();
      const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(gridId) : gridId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const buttons = gridId ? document.querySelectorAll(
        '[data-cm-grid-action="clearAllFilters"][data-cm-grid-id="' + esc + '"]'
      ) : document.querySelectorAll(
        '[data-cm-grid-action="clearAllFilters"]'
      );
      buttons.forEach((btn) => btn.classList.toggle("is-hidden", !active));
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
      const toolbarInput = toolbarSearch instanceof HTMLInputElement ? toolbarSearch : null;
      const localInput = localSearch instanceof HTMLInputElement ? localSearch : null;
      const raw = (toolbarInput && toolbarInput.value || localInput && localInput.value || "").trim();
      const input = toolbarInput || localInput;
      const searchColumns = collectSearchColumnsFromTable(this.table);
      if (input) {
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
      const cellEl = asHTMLElement(cell);
      if (!cellEl) return "";
      if (this._queryUsesNumericCellText(query)) {
        return (cellEl.dataset.cmExportRaw || cellEl.dataset.cmSortVal || cellEl.textContent || "").trim();
      }
      return (cellEl.dataset.cmSortVal || cellEl.textContent || cellEl.dataset.cmExportRaw || "").trim();
    }
    _syncTableEmptyState(shownRows, filtered) {
      const emptyRow = asHTMLElement(
        this.tbody.querySelector("tr[data-cm-table-empty]")
      );
      if (!emptyRow) return;
      const hasDataRows = this.tbody.querySelectorAll(".cm-row").length > 0;
      if (!hasDataRows) {
        emptyRow.hidden = true;
        return;
      }
      emptyRow.hidden = !(filtered && shownRows === 0);
    }
    _syncSectionTotals(active) {
      this.tbody.querySelectorAll(".cm-row-section").forEach((sectionEl) => {
        const sectionRow = asHTMLElement(sectionEl);
        if (!sectionRow) return;
        const visibleRows = [];
        let next = sectionRow.nextElementSibling;
        while (next && !next.classList.contains("cm-row-section")) {
          const rowEl = asHTMLElement(next);
          if ((rowEl == null ? void 0 : rowEl.classList.contains("cm-row")) && !rowEl.hidden)
            visibleRows.push(rowEl);
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
            const bodyCell = row.querySelector(
              'td[data-cm-col-key="' + esc + '"]'
            );
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
      const filtering = colKeys.length > 0 || globalActive;
      const hideSole = !!this.table.dataset.cmHideSoleSection;
      const sections = [];
      this.tbody.querySelectorAll(".cm-row-section").forEach((sectionEl) => {
        const sectionRow = asHTMLElement(sectionEl);
        if (!sectionRow) return;
        let next = sectionRow.nextElementSibling;
        let anyVisible = false;
        while (next && !next.classList.contains("cm-row-section")) {
          const rowEl = asHTMLElement(next);
          if ((rowEl == null ? void 0 : rowEl.classList.contains("cm-row")) && !rowEl.hidden)
            anyVisible = true;
          next = next.nextElementSibling;
        }
        sections.push({ el: sectionRow, hasVisible: anyVisible });
      });
      const visibleSectionCount = sections.filter((s) => s.hasVisible).length;
      for (const { el, hasVisible } of sections) {
        if (!filtering) {
          el.hidden = false;
        } else if (!hasVisible) {
          el.hidden = true;
        } else if (hideSole && visibleSectionCount === 1) {
          el.hidden = true;
        } else {
          el.hidden = false;
        }
      }
    }
    applyAllFilters() {
      var _a, _b;
      const layout = this.w;
      const table = this.table;
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      this.tbody = tbody;
      const toolbarSearch = layout.querySelector("[data-cm-toolbar-search]") || ((_a = layout.closest(".cm-page-table-layout, .cm-dashboard-page")) == null ? void 0 : _a.querySelector("[data-cm-toolbar-search]")) || null;
      const localSearch = layout.querySelector("[data-cm-search]");
      const shell = this.table.closest(".cm-table-shell");
      const hasServerPagination = !!(shell == null ? void 0 : shell.querySelector(
        "[data-cm-table-pagination]"
      ));
      const toolbarSearchEl = asHTMLElement(toolbarSearch);
      const serverToolbarSearch = hasServerPagination && ((_b = toolbarSearchEl == null ? void 0 : toolbarSearchEl.dataset) == null ? void 0 : _b.cmSearchBackend) === "server";
      const globalQ = serverToolbarSearch ? "" : this._resolveToolbarQuery(toolbarSearch, localSearch);
      const globalActive = !!globalQ;
      const colFilters = collectColumnFiltersFromTable(this.table);
      const colKeys = Object.keys(colFilters);
      const hasColFilters = colKeys.length > 0;
      const searchColumns = collectSearchColumnsFromTable(this.table);
      let shown = 0;
      this.tbody.querySelectorAll(".cm-row").forEach((rowEl) => {
        if (!(rowEl instanceof HTMLTableRowElement)) return;
        const row = rowEl;
        let match = true;
        if (hasColFilters) {
          match = colKeys.every((key) => {
            const entry = parseColumnFilterEntry(colFilters[key]);
            if (!entry) return true;
            var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const th = table.querySelector('th[data-cm-col-key="' + esc + '"]');
            const td = row.querySelector(
              'td[data-cm-col-key="' + esc + '"]'
            );
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
      this.syncFilterChrome();
      this._syncGridViewCharts();
    }
    _syncRecordCounters(shownRows) {
      queryRecordCounters(this.table, this.w).forEach((counterEl) => {
        const counter = asHTMLElement(counterEl);
        if (!counter) return;
        const totalAttr = counter.dataset.cmCountTotal;
        if (totalAttr) {
          counter.textContent = String(shownRows) + "/" + totalAttr;
          return;
        }
        const field = counter.dataset.cmCountField;
        if (field) {
          let sum = 0;
          this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((rowEl) => {
            var _a, _b, _c;
            const row = asHTMLElement(rowEl);
            if (!row) return;
            const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(field) : field.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const cell = row.querySelector('td[data-cm-col-key="' + esc + '"]');
            const cellEl = asHTMLElement(cell);
            const raw = (_c = (_b = (_a = cellEl == null ? void 0 : cellEl.dataset.cmExportRaw) != null ? _a : cellEl == null ? void 0 : cellEl.dataset.cmSortVal) != null ? _b : cellEl == null ? void 0 : cellEl.textContent) != null ? _c : "";
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
      if (!(tfoot instanceof HTMLElement)) return;
      if (this._hasSectionGroups()) {
        const visibleSections = this.tbody.querySelectorAll(
          ".cm-row-section:not([hidden])"
        ).length;
        tfoot.hidden = active && visibleSections <= 1;
        if (tfoot.hidden) return;
      }
      tfoot.hidden = false;
      tfoot.querySelectorAll("td[data-cm-footer-aggregate][data-cm-col-key]").forEach((cellEl) => {
        const cell = asHTMLElement(cellEl);
        if (!cell) return;
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
        this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((rowEl) => {
          var _a, _b;
          const row = asHTMLElement(rowEl);
          if (!row) return;
          const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          const bodyCell = row.querySelector(
            'td[data-cm-col-key="' + esc + '"]'
          );
          const bodyCellEl = asHTMLElement(bodyCell);
          const raw = (_b = (_a = bodyCellEl == null ? void 0 : bodyCellEl.dataset.cmExportRaw) != null ? _a : bodyCellEl == null ? void 0 : bodyCellEl.dataset.cmSortVal) != null ? _b : "";
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
      var _a;
      if (!this.tbody.querySelector(".cm-row[data-cm-chart-row]")) return;
      const rows = [];
      this.tbody.querySelectorAll(".cm-row:not([hidden])").forEach((trEl) => {
        const tr = asHTMLElement(trEl);
        if (!tr) return;
        const raw = tr.dataset.cmChartRow;
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (isRowDict(parsed)) rows.push(parsed);
        } catch (e) {
        }
      });
      const scope = (_a = this.w.closest("[data-cm-grid-view-spec]")) != null ? _a : this.w;
      scope.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
        const el = asHTMLElement(node);
        if (!el || el.dataset.cmChartInteractive) return;
        let config;
        try {
          const parsed = JSON.parse(el.dataset.cmChartConfig || "{}");
          if (!isChartRuntimeDict(parsed)) return;
          config = parsed;
        } catch (e) {
          return;
        }
        if (config.dataSource === "grid_filtered") return;
        ChartsBridge.refreshChartWrap(node, config, rows);
      });
    }
    _search(_text) {
      this.applyAllFilters();
    }
  };
  function initAllSimpleTables(root) {
    const scope = root && "querySelectorAll" in root ? root : document;
    const safe = (name, fn) => {
      try {
        fn();
      } catch (err) {
        console.error("[GridView] simple-table init failed: " + name, err);
      }
    };
    safe("initColumnFilters", () => initColumnFilters(scope));
    scope.querySelectorAll('[data-cm-column-settings="1"]').forEach(function(shell) {
      safe(
        "initSimpleTableColumnSettings",
        () => initSimpleTableColumnSettings(shell)
      );
    });
    safe("initSimpleTableColumnResize", () => initSimpleTableColumnResize(scope));
    safe("initTableCellUi", () => initTableCellUi(scope));
    safe("applyFiltersInScope", () => applyFiltersInScope(scope));
  }
  function attachSimpleTableGlobals() {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => initAllSimpleTables(document)
      );
    } else {
      initAllSimpleTables(document);
    }
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
      this.valueCounts = /* @__PURE__ */ new Map();
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
      this.ingestRawValues(raw.values, raw.hasEmpty, raw.emptyCount, raw.counts);
    }
    ingestRawValues(rawValues, hasEmpty, emptyCount = 0, counts) {
      this.valueCounts.clear();
      if (counts) {
        for (const key in counts) this.valueCounts.set(String(key).trim(), counts[key]);
      }
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
        const count = this.valueCounts.get(val);
        const countHtml = count === void 0 ? "" : '<span class="cm-set-filter-item-count">' + String(count) + "</span>";
        item.innerHTML = '<input type="checkbox" id="' + id + '"' + (isChecked ? " checked" : "") + '><span class="cm-set-filter-item-label">' + val + "</span>" + countHtml;
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
      this.searchDrivenFilter = false;
      this.listSearchInput.value = "";
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

  // src/grid-view/expr-filter-panel.ts
  function requiredInput(root, selector) {
    const el = root.querySelector(selector);
    if (el instanceof HTMLInputElement) return el;
    throw new Error("ExprFilterPanel: missing " + selector);
  }
  var ExprFilterPanel = class {
    constructor(options) {
      this.mode = "all";
      this.query = "";
      this.debounceTimer = null;
      var _a, _b;
      this.fieldId = options.fieldId;
      this.profile = (_a = options.profile) != null ? _a : "default" /* Default */;
      this.match = (_b = options.match) != null ? _b : "exact";
      this.onChange = options.onChange || (() => {
      });
      this.gui = document.createElement("div");
      this.gui.className = "cm-set-filter-panel cm-expr-filter-panel";
      this.gui.innerHTML = '<div class="cm-set-filter-modes">' + this._modeCheckbox("all", i18n.t("filter.select_all", "All"), true) + this._modeCheckbox("empty", i18n.t("filter.only_empty", "Empty"), false) + this._modeCheckbox("non_empty", i18n.t("filter.non_empty", "Non-empty"), false) + '</div><div class="cm-set-filter-search-row"><input type="search" class="cm-col-filter-input cm-expr-filter-input" autocomplete="off"></div>';
      this.exprInput = requiredInput(this.gui, ".cm-expr-filter-input");
      this.exprInput.placeholder = i18n.t(
        columnFilterPlaceholderKey(this.profile),
        i18n.t("column_filter.placeholder", "Search: >10, %name%")
      );
      this.modeCheckboxes = Array.from(
        this.gui.querySelectorAll('input[type="checkbox"][data-cm-filter-mode]')
      );
      this.gui.addEventListener("mousedown", (e) => e.stopPropagation());
      this.gui.addEventListener("click", (e) => e.stopPropagation());
      this.exprInput.addEventListener("input", () => {
        this.query = this.exprInput.value;
        if (this.query.trim()) {
          this.mode = "expr";
          this._clearModeCheckboxes();
        } else {
          this.mode = "all";
          this._syncAllChecked();
        }
        this._scheduleApply();
      });
      this.exprInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          this._cancelTimer();
          this.query = this.exprInput.value;
          if (this.query.trim()) {
            this.mode = "expr";
            this._clearModeCheckboxes();
          }
          this.onChange();
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.exprInput.value = "";
          this.query = "";
          this.mode = "all";
          this._cancelTimer();
          this.onChange();
        }
      });
      this.modeCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("mousedown", (e) => e.stopPropagation());
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const target = e.target;
          if (!(target instanceof HTMLInputElement)) return;
          this._cancelTimer();
          this.query = "";
          this.exprInput.value = "";
          if (target.checked && (target.value === "empty" || target.value === "non_empty")) {
            this.mode = target.value;
            this.modeCheckboxes.forEach((cb) => {
              cb.checked = cb === target;
            });
          } else {
            this.mode = "all";
            this._syncAllChecked();
          }
          this.onChange();
        });
      });
    }
    _modeCheckbox(value, label, checked) {
      return '<label class="cm-set-filter-mode"><input type="checkbox" data-cm-filter-mode="1" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
    }
    _clearModeCheckboxes() {
      this.modeCheckboxes.forEach((cb) => {
        cb.checked = false;
      });
    }
    /** Reflect "no filter" state — only the «Усі» checkbox is ticked. */
    _syncAllChecked() {
      this.modeCheckboxes.forEach((cb) => {
        cb.checked = cb.value === "all";
      });
    }
    _cancelTimer() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
    _scheduleApply() {
      this._cancelTimer();
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.onChange();
      }, 200);
    }
    getGui() {
      return this.gui;
    }
    getModel() {
      if (this.mode === "empty") return { mode: "empty", match: this.match };
      if (this.mode === "non_empty") return { mode: "non_empty", match: this.match };
      const q = this.query.trim();
      return q ? q : null;
    }
    setModel(entry) {
      this._clearModeCheckboxes();
      if (!entry) {
        this.mode = "all";
        this.query = "";
        this.exprInput.value = "";
        this._syncAllChecked();
      } else if (typeof entry === "string") {
        this.mode = "expr";
        this.query = entry;
        this.exprInput.value = entry;
      } else if ("mode" in entry && (entry.mode === "empty" || entry.mode === "non_empty")) {
        const modeValue = entry.mode;
        this.mode = modeValue;
        this.query = "";
        this.exprInput.value = "";
        const cb = this.modeCheckboxes.find((c) => c.value === modeValue);
        if (cb) cb.checked = true;
      }
    }
    isFilterActive() {
      if (this.mode === "empty" || this.mode === "non_empty") return true;
      return !!this.query.trim();
    }
    focus() {
      window.setTimeout(() => {
        this.exprInput.focus();
        this.exprInput.select();
      }, 0);
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
  var activeExprPanel = null;
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
    appendSearchSyntaxHelp(exprRow, "default" /* Default */);
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var shell = asHTMLElement((_a = tableFilterShell(anchorEl)) != null ? _a : null);
    var page = shell == null ? void 0 : shell.closest(".cm-page-table-layout, .cm-dashboard-page");
    var filterBar = page == null ? void 0 : page.querySelector("[data-cm-filter-bar]");
    var url = filterNavigateHref();
    if (filterBar) {
      var state = selectedFilterValues(filterBar);
      var toolbarSearch = (page == null ? void 0 : page.querySelector("[data-cm-toolbar-search]")) || document.getElementById(
        "cm-toolbar-search-" + (((_b = shell == null ? void 0 : shell.dataset) == null ? void 0 : _b.gridId) || ((_d = (_c = asHTMLElement(page)) == null ? void 0 : _c.dataset) == null ? void 0 : _d.gridId) || "")
      );
      if (toolbarSearch instanceof HTMLInputElement) {
        var qName = toolbarSearch.name || "q";
        var qVal = (toolbarSearch.value || "").trim();
        if (qVal) state[qName] = qVal;
        else state[qName] = "";
      }
      url = buildFilterUrl(window.location.href, state);
    }
    url = withActiveTableColumns(url, anchorEl || shell || void 0);
    window.history.replaceState({}, "", url);
    var gridId = (_e = shell == null ? void 0 : shell.dataset) == null ? void 0 : _e.gridId;
    (_h = (_g = (_f = getGlobal().GridView) == null ? void 0 : _f.AgGrid) == null ? void 0 : _g.syncExportLinks) == null ? void 0 : _h.call(_g, gridId || "");
  }
  function closeColumnFilterPortals() {
    var openPortals = document.querySelectorAll("[data-cm-col-filter-portal]:not(.is-hidden)");
    openPortals.forEach(function(portalEl) {
      flushExprFilterPortal(portalEl);
    });
    activeSetPanel = null;
    activeExprPanel = null;
    document.querySelectorAll("[data-cm-col-filter-portal]").forEach(function(portalEl) {
      const portal = asHTMLElement(portalEl);
      if (!portal) return;
      portal.classList.add("is-hidden");
      portal.classList.remove("is-set");
      portal.setAttribute("aria-hidden", "true");
      var setHost = asHTMLElement(portal.querySelector("[data-cm-col-filter-set-host]"));
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
    var left = anchorRect.left + anchorRect.width / 2 - width / 2;
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
      if (kind === "none") {
        closeColumnFilterPortals();
        return;
      }
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
    document.dispatchEvent(new CustomEvent("cm-grid-state-change", { detail: { source: "column-filter" } }));
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
  function openExprFilter(portal, th, table, btn) {
    const colKey = th.dataset.cmColKey || "";
    const match = headerFilterMatch(th);
    const profile = bindSearchProfileForHeader(th);
    const setHost = asHTMLElement(portal.querySelector("[data-cm-col-filter-set-host]"));
    if (!setHost) return;
    setExprRowVisible(portal, false);
    setHost.hidden = false;
    setHost.innerHTML = "";
    const panel = new ExprFilterPanel({
      fieldId: colKey,
      profile,
      match,
      onChange: function() {
        const model = panel.getModel();
        commitColumnFilterValue(table, colKey, model ? serializeColumnFilterEntry(model) : "");
        applyColumnFilterState(table, setHost);
      }
    });
    activeExprPanel = panel;
    setHost.appendChild(panel.getGui());
    const existing = parseColumnFilterEntry(th.dataset.cmColFilterValue || "");
    if (existing) panel.setModel(existing);
    positionColumnFilterPortal(portal, btn, "set");
    portal.classList.remove("is-hidden");
    portal.setAttribute("aria-hidden", "false");
    btn.classList.add("is-open");
    panel.focus();
  }
  function openSetFilter(portal, portalInput, th, table, _shell, btn) {
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
    root.querySelectorAll("[data-cm-table][data-cm-col-filters]").forEach(function(tableEl) {
      var _a, _b, _c, _d;
      if (!(tableEl instanceof HTMLTableElement)) return;
      if (!tableEl.matches("[data-cm-table][data-cm-col-filters]")) return;
      const table = tableEl;
      if (table.dataset.cmColFiltersBound) return;
      table.dataset.cmColFiltersBound = "1";
      ensureSimpleTableForTable(table);
      var shell = tableFilterShell(table) || table;
      var gridId = gridIdForTable(table);
      var portal = columnFilterPortalForTable(table);
      if (portal && gridId && !portal.dataset.cmColFilterTable) {
        portal.dataset.cmColFilterTable = gridId;
      }
      var portalInput = asHtmlInput(portal == null ? void 0 : portal.querySelector("[data-cm-col-filter-input]"));
      if (!portal || !portalInput) return;
      const boundPortalInput = portalInput;
      var urlFilters = parseColumnFiltersFromUrl();
      table.querySelectorAll("th[data-cm-col-key]").forEach(function(thEl) {
        if (!(thEl instanceof HTMLElement)) return;
        var key = thEl.dataset.cmColKey;
        const filterVal = key ? urlFilters[key] : void 0;
        if (key && filterVal) {
          thEl.dataset.cmColFilterValue = Array.isArray(filterVal) ? filterVal.join(",") : filterVal;
        }
      });
      syncColumnFilterChrome(table);
      table.querySelectorAll("[data-cm-col-filter-clear]").forEach(function(btnEl) {
        const btn = asHTMLElement(btnEl);
        if (!btn) return;
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
      table.querySelectorAll("[data-cm-col-filter-trigger]").forEach(function(btnEl) {
        const btn = asHTMLElement(btnEl);
        if (!btn) return;
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
            openSetFilter(portal, boundPortalInput, th, table, shell, btn);
          } else {
            openExprFilter(portal, th, table, btn);
          }
        });
      });
      if (Object.keys(urlFilters).length) {
        applyTableFilters(table);
      }
      var shellGridId = ((_a = asHTMLElement(shell)) == null ? void 0 : _a.dataset.gridId) || "";
      (_d = (_c = (_b = getGlobal().GridView) == null ? void 0 : _b.AgGrid) == null ? void 0 : _c.syncExportLinks) == null ? void 0 : _d.call(_c, shellGridId);
    });
  }

  // src/grid-view/toolbar-search-input.ts
  function cssEscapeId(id) {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function resolveToolbarSearchInput(gridId) {
    if (!gridId) return null;
    const legacy = document.getElementById("ag-quick-filter-" + gridId);
    if (legacy instanceof HTMLInputElement) return legacy;
    const esc = cssEscapeId(gridId);
    const toolbarRoot = document.querySelector(
      '[data-cm-toolbar-search-root][data-cm-table-grid-id="' + esc + '"]'
    );
    const toolbarSearch = toolbarRoot == null ? void 0 : toolbarRoot.querySelector("[data-cm-toolbar-search]");
    if (toolbarSearch) return toolbarSearch;
    const wrapper = document.querySelector('[data-grid-id="' + esc + '"]');
    const localSearch = wrapper == null ? void 0 : wrapper.querySelector("[data-cm-search]");
    return localSearch != null ? localSearch : null;
  }
  function resolveToolbarSearchInputForCtx(root, scope) {
    const tableGridId2 = root.dataset.cmTableGridId || scope;
    const bound = resolveToolbarSearchInput(tableGridId2);
    if (bound) return bound;
    const local = document.getElementById("cm-toolbar-search-" + scope);
    if (local instanceof HTMLInputElement) return local;
    const fromRoot = root.querySelector("[data-cm-toolbar-search]");
    return fromRoot != null ? fromRoot : null;
  }

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
    root.querySelectorAll("[data-cm-multiselect]").forEach((msEl) => {
      const ms = asHTMLElement(msEl);
      if (!ms) return;
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const vals = Array.from(ms.querySelectorAll(MS_VALUE_CHECKBOX)).map((cb) => cb.value);
      if (ms.dataset.cmSingleselect === "1") {
        state[param] = vals[0] || "";
      } else {
        state[param] = vals;
      }
    });
    root.querySelectorAll("[data-cm-period-multiselect]").forEach((msEl) => {
      const ms = asHTMLElement(msEl);
      if (!ms) return;
      const param = ms.dataset.filterParam || ms.dataset.filterId || "period";
      const periodFilter = getGlobal().CMPeriodFilter;
      const vals = periodFilter && typeof periodFilter.selectedValues === "function" ? periodFilter.selectedValues(ms) : [];
      if (ms.dataset.cmSingleselect === "1") {
        state[param] = vals[0] || "";
      } else {
        state[param] = vals;
      }
    });
    root.querySelectorAll("select[data-filter-id]").forEach((selEl) => {
      if (!(selEl instanceof HTMLSelectElement)) return;
      const param = selEl.name || selEl.dataset.filterId;
      if (param) state[param] = selEl.value;
    });
    const search = asHtmlInput(root.querySelector("[data-cm-search]"));
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
    const valueChecked = Array.from(ms.querySelectorAll(MS_VALUE_CHECKBOX));
    if (valueChecked.length === 1) {
      setMultiselectTriggerLabel(ms, valueChecked[0].dataset.label || valueChecked[0].value);
      return;
    }
    setMultiselectTriggerLabel(
      ms,
      valueChecked.map((cb) => cb.dataset.label || cb.value).join(", ")
    );
  }
  function applyFilterValues(root, state) {
    if (!root || !state) return;
    Object.entries(state).forEach(([param, val]) => {
      if (val == null || val === "") return;
      const values = Array.isArray(val) ? val.map(String) : String(val).split(",").map((v) => v.trim()).filter(Boolean);
      root.querySelectorAll("[data-cm-multiselect]").forEach((msEl) => {
        const ms = asHTMLElement(msEl);
        if (!ms) return;
        const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
        if (msParam !== param) return;
        ms.querySelectorAll('input[type="checkbox"]').forEach((cbEl) => {
          if (!(cbEl instanceof HTMLInputElement)) return;
          if (cbEl.dataset.uiOnly === "1") return;
          cbEl.checked = values.includes(cbEl.value);
        });
        if (typeof ms._cmUpdateLabel === "function") ms._cmUpdateLabel();
        else _updateMultiSelectLabel(ms);
      });
      root.querySelectorAll("[data-cm-period-multiselect]").forEach((msEl) => {
        const ms = asHTMLElement(msEl);
        if (!ms) return;
        const msParam = ms.dataset.filterParam || ms.dataset.filterId || "period";
        if (msParam !== param) return;
        const periodFilter = getGlobal().CMPeriodFilter;
        if (periodFilter && typeof periodFilter.applyValues === "function") {
          periodFilter.applyValues(ms, values);
        }
      });
      root.querySelectorAll("select[data-filter-id]").forEach((selEl) => {
        if (!(selEl instanceof HTMLSelectElement)) return;
        const selParam = selEl.name || selEl.dataset.filterId;
        if (selParam !== param) return;
        selEl.value = Array.isArray(val) ? String(val[0] || "") : String(val);
      });
    });
  }
  function filterNavigateHref() {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/fragment\/?$/, "/");
    return url.href;
  }
  function resolveToolbarGridId(anchor) {
    var _a, _b, _c;
    const anchorEl = asHTMLElement(anchor);
    const root = asHTMLElement(anchorEl == null ? void 0 : anchorEl.closest("[data-cm-toolbar-search-root]")) || asHTMLElement((_a = anchorEl == null ? void 0 : anchorEl.closest(".cm-toolbar-unified")) == null ? void 0 : _a.querySelector("[data-cm-toolbar-search-root]"));
    return ((_b = root == null ? void 0 : root.dataset) == null ? void 0 : _b.cmTableGridId) || ((_c = root == null ? void 0 : root.dataset) == null ? void 0 : _c.cmPrefGridId) || "";
  }
  function tableFragmentConfig(gridId, bar) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!gridId) return null;
    const barEl = bar instanceof HTMLElement ? bar : (_a = bar == null ? void 0 : bar.closest) == null ? void 0 : _a.call(bar, "[data-cm-filter-bar]");
    const b = barEl;
    const shell = document.getElementById("cm-table-" + gridId);
    const endpoint = ((_b = b == null ? void 0 : b.dataset) == null ? void 0 : _b.cmFragmentEndpoint) || ((_c = shell == null ? void 0 : shell.dataset) == null ? void 0 : _c.cmFragmentEndpoint) || "";
    if (!endpoint) return null;
    return {
      endpoint,
      target: ((_d = b == null ? void 0 : b.dataset) == null ? void 0 : _d.cmFragmentTarget) || ((_e = shell == null ? void 0 : shell.dataset) == null ? void 0 : _e.cmFragmentTarget) || "#block-" + gridId,
      swap: ((_f = b == null ? void 0 : b.dataset) == null ? void 0 : _f.cmFragmentSwap) || ((_g = shell == null ? void 0 : shell.dataset) == null ? void 0 : _g.cmFragmentSwap) || "outerHTML",
      gridId
    };
  }
  function buildFragmentRequestUrl(fragmentEndpoint, pagePathAndQuery) {
    const page = new URL(pagePathAndQuery, window.location.origin);
    const frag = new URL(fragmentEndpoint, window.location.origin);
    frag.search = page.search;
    return frag.pathname + frag.search;
  }
  function specWantsFacets(ref) {
    var _a;
    const el = asHTMLElement(ref);
    if (!el) return false;
    if ((_a = el.matches) == null ? void 0 : _a.call(el, "[data-cm-filter-bar][data-cm-facets]")) return true;
    const spec = el.closest("[data-cm-grid-view-spec]");
    if (spec == null ? void 0 : spec.querySelector("[data-cm-filter-bar][data-cm-facets]")) return true;
    return !!el.closest("[data-cm-filter-bar][data-cm-facets]");
  }
  function syncToolbarCounterFromTable(gridId) {
    var _a;
    if (!gridId) return;
    const block = document.getElementById("block-" + gridId);
    const counter = asHTMLElement(document.querySelector('[data-cm-count-for="' + gridId + '"]'));
    if (!block || !counter) return;
    const footer = asHTMLElement(block.querySelector("[data-cm-pagination-total]"));
    const total = ((_a = footer == null ? void 0 : footer.dataset) == null ? void 0 : _a.cmPaginationTotal) || counter.dataset.cmCountTotal || "";
    const shown = block.querySelectorAll("tbody .cm-row:not([hidden])").length;
    if (total) {
      counter.textContent = String(shown) + "/" + total;
      counter.dataset.cmCountTotal = total;
    } else {
      counter.textContent = String(shown);
    }
  }
  function navigateFilterState(state, anchorEl, bar) {
    const pageUrl = withActiveTableColumns(
      buildFilterUrl(filterNavigateHref(), state),
      anchorEl || bar
    );
    const gridId = resolveToolbarGridId(anchorEl || bar);
    const frag = tableFragmentConfig(gridId, bar);
    const wantsFacets = specWantsFacets(anchorEl || bar);
    const htmx = getGlobal().htmx;
    if (htmx && typeof htmx.ajax === "function") {
      if (frag && !wantsFacets) {
        htmx.ajax("GET", buildFragmentRequestUrl(frag.endpoint, pageUrl), {
          target: frag.target,
          swap: frag.swap
        });
        window.history.pushState({}, "", pageUrl);
        window.setTimeout(() => syncToolbarCounterFromTable(frag.gridId), 0);
        return true;
      }
      const ref = anchorEl || bar;
      const specRoot = ref instanceof Element ? ref.closest("[data-cm-grid-view-spec]") : null;
      if (specRoot == null ? void 0 : specRoot.id) {
        const wrapId = "cm-spec-wrap-" + specRoot.dataset.specId;
        htmx.ajax("GET", pageUrl, {
          target: "#" + wrapId,
          swap: "innerHTML",
          select: "#" + specRoot.id
        });
        window.history.pushState({}, "", pageUrl);
        return true;
      }
    }
    window.location.href = pageUrl;
    return false;
  }
  function toolbarSearchUsesFragmentNavigation(searchInput) {
    if (specWantsFacets(searchInput)) return true;
    return !!tableFragmentConfig(resolveToolbarGridId(searchInput));
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
    const gridView2 = getGlobal().GridView;
    const handle = (gridView2 == null ? void 0 : gridView2.byId) && typeof gridView2.byId.get === "function" ? gridView2.byId.get(gridId) : null;
    if (handle && isRecord(handle) && isRecord(handle.adapter)) {
      const getDisplayed = handle.adapter.getDisplayedColumnIds;
      if (typeof getDisplayed === "function") {
        const ids = getDisplayed.call(handle.adapter);
        if (Array.isArray(ids)) return ids.map(String).join(",");
      }
    }
    try {
      const raw = localStorage.getItem("cmColState_" + gridId);
      if (!raw) return "";
      const state = JSON.parse(raw);
      if (!Array.isArray(state)) return "";
      return state.filter((col) => isRecord(col) && !col.hide).map((col) => String(col.colId || "")).filter(Boolean).join(",");
    } catch (e) {
      return "";
    }
  }
  function withActiveTableColumns(urlString, scopeEl) {
    const url = new URL(urlString, window.location.origin);
    const anchor = scopeEl && scopeEl.closest ? scopeEl.closest("[data-cm-toolbar-search-root], .cm-dashboard-page, .cm-page-table-layout") : null;
    const toolbarRoot = asHTMLElement(
      anchor == null ? void 0 : anchor.querySelector("[data-cm-toolbar-search-root][data-cm-table-grid-id]")
    );
    const tableShell = asHTMLElement(anchor == null ? void 0 : anchor.querySelector("[data-cm-table-shell][data-grid-id]"));
    const gridId = (toolbarRoot == null ? void 0 : toolbarRoot.dataset.cmTableGridId) || (tableShell == null ? void 0 : tableShell.dataset.gridId) || "";
    const cols = activeExportColIds(gridId);
    if (cols) url.searchParams.set("export_cols", cols);
    else url.searchParams.delete("export_cols");
    const colQ = serializeColumnFilters(anchor || document);
    if (colQ) url.searchParams.set("col_q", colQ);
    else url.searchParams.delete("col_q");
    return url.pathname + url.search;
  }
  function initMultiSelectWidget(rootEl) {
    const root = asHTMLElement(rootEl);
    if (!root) return;
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
    const applyBtn = asHTMLElement(panel == null ? void 0 : panel.querySelector("[data-cm-multiselect-apply]"));
    if (applyBtn && !applyBtn.dataset.cmBound) {
      applyBtn.dataset.cmBound = "1";
      applyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        root.dispatchEvent(new CustomEvent("cm-filter-change", { bubbles: true }));
        panel == null ? void 0 : panel.classList.remove("is-open");
      });
    }
    root.querySelectorAll('input[type="checkbox"]').forEach((cbEl) => {
      if (!(cbEl instanceof HTMLInputElement)) return;
      const cb = cbEl;
      cb.addEventListener("change", () => {
        var _a;
        if (root.dataset.cmSingleselect === "1" && cb.checked && cb.dataset.selectAll !== "1") {
          root.querySelectorAll('input[type="checkbox"]').forEach((otherEl) => {
            if (otherEl instanceof HTMLInputElement && otherEl !== cb) otherEl.checked = false;
          });
          if (panel == null ? void 0 : panel.classList.contains("is-open")) {
            panel.classList.remove("is-open");
          }
        }
        if ((cb.dataset.selectAll === "1" || cb.dataset.exclusiveSolo === "1") && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]').forEach((oEl) => {
            if (oEl instanceof HTMLInputElement && oEl !== cb) oEl.checked = false;
          });
        } else if (root.dataset.exclusiveAll === "1" && cb.dataset.periodAll === "1" && cb.checked) {
          root.querySelectorAll('input[type="checkbox"]:not([data-period-all])').forEach((oEl) => {
            if (oEl instanceof HTMLInputElement) oEl.checked = false;
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
        if (((_a = asHTMLElement(root.closest("[data-cm-filter-bar]"))) == null ? void 0 : _a.dataset.autoApply) === "1") {
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
        document.querySelectorAll("[data-cm-multiselect]").forEach((widgetEl) => {
          const widget = asHTMLElement(widgetEl);
          if (widget && typeof widget._cmFlushPendingAutoApply === "function") {
            widget._cmFlushPendingAutoApply();
          }
        });
        document.querySelectorAll(".cm-multiselect-panel.is-open").forEach((p) => p.classList.remove("is-open"));
      });
    }
  }
  function bindFilterBar(barEl, opts) {
    const bar = asHTMLElement(barEl);
    if (!bar) return { getState: () => ({}), buildUrl: buildFilterUrl };
    const options = opts || {};
    const navigateOnChange = options.navigate !== false && bar.dataset.navigateOnChange !== "0";
    bar.querySelectorAll("[data-cm-multiselect]").forEach(initMultiSelectWidget);
    const periodFilter = getGlobal().CMPeriodFilter;
    if (periodFilter && typeof periodFilter.bind === "function") {
      periodFilter.bind(bar);
    }
    const onChange = () => {
      const state = selectedFilterValues(bar);
      state.page = "1";
      if (typeof options.onChange !== "function" && !navigateOnChange) {
        const nextUrl = withActiveTableColumns(buildFilterUrl(filterNavigateHref(), state), bar);
        window.history.replaceState({}, "", nextUrl);
      }
      document.dispatchEvent(new CustomEvent("cm-filter-change", { detail: { state, bar } }));
      if (typeof options.onChange === "function") options.onChange(state);
      else if (navigateOnChange) {
        navigateFilterState(state, bar, bar);
      }
    };
    bar.addEventListener("cm-filter-change", onChange);
    bar.querySelectorAll("select[data-filter-scope='server']").forEach((selEl) => {
      if (selEl instanceof HTMLSelectElement) selEl.addEventListener("change", onChange);
    });
    const search = asHtmlInput(bar.querySelector("[data-cm-search]"));
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
      let root = asHTMLElement(wrap != null ? wrap : null);
      if (!root || !root.matches("[data-cm-toolbar-search-root]")) {
        if (!scopeId) return null;
        var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(scopeId) : scopeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        root = asHTMLElement(
          document.querySelector(
            '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
          )
        );
      }
      if (!root) return null;
      var scope = root.dataset.cmSearchScopeId || scopeId || "";
      var prefId = root.dataset.cmTableGridId || root.dataset.cmPrefGridId || scope;
      var backend = root.dataset.cmSearchBackend || "";
      const input = resolveToolbarSearchInputForCtx(root, scope);
      return {
        root,
        scopeId: scope,
        prefId,
        backend,
        input,
        dropdown: asHTMLElement(document.getElementById("cm-saved-searches-dropdown-" + scope)),
        container: asHTMLElement(document.getElementById("cm-saved-searches-container-" + scope))
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
        var host = byId.get(ctx.prefId);
        if (host) {
          if (host.gridApi && typeof host.gridApi.setFilterModel === "function") {
            host.gridApi.setFilterModel(null);
          }
          if (typeof host.onQuickFilterChanged === "function") {
            host.onQuickFilterChanged();
          }
        }
      } else if (typeof onPick === "function") {
        onPick(text);
      }
      setSavedSearchPanelOpen(ctx.dropdown, false);
    },
    render: function(ctx, items, onPick) {
      if (!ctx || !ctx.container) return;
      const container = ctx.container;
      container.innerHTML = "";
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
          self.apply(ctx, text, onPick != null ? onPick : void 0);
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
        container.appendChild(item);
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
        document.querySelectorAll('[id^="cm-saved-searches-dropdown-"]').forEach(function(ddEl) {
          const dd = asHTMLElement(ddEl);
          if (!dd || dd.classList.contains("is-hidden")) return;
          var scopeFor = dd.dataset.cmSavedDropdownFor || "";
          var esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(scopeFor) : scopeFor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          if (!scopeFor) return;
          var root = document.querySelector(
            '[data-cm-toolbar-search-root][data-cm-search-scope-id="' + esc + '"]'
          );
          const target = e.target;
          if (root instanceof HTMLElement && target instanceof Node && !root.contains(target)) {
            setSavedSearchPanelOpen(dd, false);
          }
        });
      });
    }
  };
  ToolbarSearch.bindDismiss();
  function syncToolbarSearchChrome(input) {
    const wrap = asHTMLElement(input == null ? void 0 : input.closest("[data-cm-toolbar-search-root]"));
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
    const scopeId = ((_a = asHTMLElement(searchInput.closest("[data-cm-toolbar-search-root]"))) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
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
      state.page = "1";
      navigateFilterState(state, searchInput, filterBar);
    };
  }
  function serverToolbarSearchApplyClient(searchInput) {
    var _a;
    const scopeId = ((_a = asHTMLElement(searchInput.closest("[data-cm-toolbar-search-root]"))) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
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
  var _fragmentCounterBound = false;
  function bindFragmentCounterSync() {
    if (_fragmentCounterBound || typeof document.body === "undefined") return;
    _fragmentCounterBound = true;
    document.body.addEventListener("htmx:afterSwap", (event) => {
      var _a;
      const target = (_a = event.detail) == null ? void 0 : _a.target;
      const id = (target == null ? void 0 : target.id) || "";
      if (!id.startsWith("block-")) return;
      syncToolbarCounterFromTable(id.slice("block-".length));
    });
  }
  function initToolbarSearch(scope) {
    bindFragmentCounterSync();
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll('[data-cm-search-backend="server"][data-cm-toolbar-search]').forEach((searchEl) => {
      const searchInput = asHtmlInput(searchEl);
      if (!searchInput) return;
      if (searchInput.dataset.cmToolbarSearchBound) return;
      searchInput.dataset.cmToolbarSearchBound = "1";
      const input = searchInput;
      const wrap = asHTMLElement(input.closest("[data-cm-toolbar-search-root]"));
      const scopeId = (wrap == null ? void 0 : wrap.dataset.cmSearchScopeId) || "";
      const clearBtn = wrap == null ? void 0 : wrap.querySelector(".cm-toolbar-search-clear");
      function syncStateUi() {
        const value = input.value || "";
        if (clearBtn) clearBtn.classList.toggle("is-visible", value.trim().length > 0);
      }
      const navigate = serverToolbarSearchNavigate(input);
      const applyClient = serverToolbarSearchApplyClient(input);
      const fragmentSearch = toolbarSearchUsesFragmentNavigation(input);
      const ctx = ToolbarSearch.ctx(scopeId, wrap);
      if (ctx) ToolbarSearch.render(ctx, ToolbarSearch.load(ctx), fragmentSearch ? navigate : applyClient);
      let searchNavigateTimer = 0;
      input.addEventListener("input", () => {
        syncStateUi();
        if (fragmentSearch) {
          window.clearTimeout(searchNavigateTimer);
          searchNavigateTimer = window.setTimeout(navigate, 400);
          return;
        }
        applyClient();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        navigate();
      });
      clearBtn == null ? void 0 : clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        input.value = "";
        syncStateUi();
        if (fragmentSearch) {
          navigate();
        } else {
          applyClient();
        }
      });
      syncStateUi();
      syncToolbarSearchChrome(input);
    });
    root.querySelectorAll('[data-cm-search-backend="ag_grid"][data-cm-toolbar-search]').forEach((searchEl) => {
      const searchInput = asHtmlInput(searchEl);
      if (!searchInput) return;
      if (searchInput.dataset.cmToolbarSearchBound) return;
      searchInput.dataset.cmToolbarSearchBound = "1";
      const input = searchInput;
      const wrap = asHTMLElement(input.closest("[data-cm-toolbar-search-root]"));
      const tableGridId2 = (wrap == null ? void 0 : wrap.dataset.cmTableGridId) || (wrap == null ? void 0 : wrap.dataset.cmSearchScopeId) || "";
      const clearBtn = wrap == null ? void 0 : wrap.querySelector(".cm-toolbar-search-clear");
      let searchReloadTimer = 0;
      function reloadGridSearch() {
        if (!tableGridId2) return;
        invokeGridAction(tableGridId2, "onQuickFilterChanged");
      }
      input.addEventListener("input", () => {
        syncToolbarSearchChrome(input);
        window.clearTimeout(searchReloadTimer);
        searchReloadTimer = window.setTimeout(reloadGridSearch, 300);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        window.clearTimeout(searchReloadTimer);
        invokeGridAction(tableGridId2, "reloadData");
      });
      clearBtn == null ? void 0 : clearBtn.addEventListener("click", (event) => {
        event.preventDefault();
        input.value = "";
        syncToolbarSearchChrome(input);
        invokeGridAction(tableGridId2, "clearSearch");
      });
      syncToolbarSearchChrome(input);
    });
  }
  function initFilterBars(scope) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll("[data-cm-filter-bar]").forEach((barEl) => {
      const bar = asHTMLElement(barEl);
      if (!bar) return;
      if (!bar.dataset.cmFbBound) {
        bar.dataset.cmFbBound = "1";
        bindFilterBar(bar, { navigate: bar.dataset.navigateOnChange !== "0" });
      }
    });
    initToolbarSearch(root);
  }
  function initTabGroups(scope) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    root.querySelectorAll("[data-cm-tab-group]").forEach((groupEl) => {
      const group = asHTMLElement(groupEl);
      if (!group) return;
      if (group.dataset.cmTabBound) return;
      group.dataset.cmTabBound = "1";
      group.addEventListener("click", (e) => {
        var _a;
        const btn = (_a = e.target) == null ? void 0 : _a.closest("[data-cm-tab-target]");
        if (!btn || !group.contains(btn)) return;
        const targetId = btn.getAttribute("data-cm-tab-target");
        if (!targetId) return;
        group.querySelectorAll("[data-cm-tab-target]").forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
          b.setAttribute("tabindex", "-1");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        btn.removeAttribute("tabindex");
        const specRoot = group.closest("[data-cm-grid-view-spec]") || group.closest(".cm-dashboard-page") || group.parentElement;
        if (!specRoot) return;
        const isPageTabs = group.hasAttribute("data-cm-tabs-block");
        const paneHost = isPageTabs ? group.closest(".cm-area") : group.closest(".cm-area[data-cm-tab-pane]") || group.closest(".cm-area");
        if (!paneHost) return;
        const panes = paneHost.querySelectorAll(
          ":scope > .cm-area[data-cm-tab-pane], :scope > .cm-block[data-cm-tab-pane]"
        );
        let shownPane = null;
        panes.forEach((pane) => {
          const paneId = pane.getAttribute("data-cm-tab-pane") || pane.id.replace(/^tab-pane-/, "") || pane.id.replace(/^tab-/, "");
          const visible = paneId === targetId;
          pane.classList.toggle("hidden", !visible);
          if (visible) shownPane = pane;
        });
        const urlParam = group.getAttribute("data-cm-tab-url-param");
        const tabSlug = btn.getAttribute("data-cm-tab-id");
        if (urlParam && tabSlug) {
          const url = new URL(window.location.href);
          url.searchParams.set(urlParam, tabSlug);
          window.history.replaceState({}, "", url.toString());
        }
        const gv2 = window.GridView;
        if (shownPane && (gv2 == null ? void 0 : gv2.bootScope)) {
          gv2.bootScope(shownPane);
        }
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
  function cssAttr(value) {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function syncClearAllButtons() {
    const url = new URL(window.location.href);
    const urlActive = url.searchParams.has("q") || url.searchParams.has("filters") || url.searchParams.has("col_q");
    document.querySelectorAll('[data-cm-grid-action="clearAllFilters"]').forEach((btn) => {
      var _a, _b, _c, _d, _e;
      const gridId = btn.getAttribute("data-cm-grid-id") || "";
      const handle = (_b = (_a = window.GridView) == null ? void 0 : _a.byId) == null ? void 0 : _b.get(gridId);
      if (handle && typeof handle.hasActiveFilters === "function") {
        btn.classList.toggle("is-hidden", !handle.hasActiveFilters());
        return;
      }
      const toolbar = btn.closest(".cm-toolbar-unified");
      const searchInput = toolbar == null ? void 0 : toolbar.querySelector("[data-cm-toolbar-search]");
      const searchActive = !!(searchInput == null ? void 0 : searchInput.value.trim());
      const table = gridId ? document.querySelector('[data-grid-id="' + cssAttr(gridId) + '"]') : null;
      const simpleActive = !!(table == null ? void 0 : table.querySelector(".cm-col-filter-btn.is-active"));
      const model = (_e = (_d = (_c = handle == null ? void 0 : handle.gridApi) == null ? void 0 : _c.getFilterModel) == null ? void 0 : _d.call(_c)) != null ? _e : {};
      const agActive = Object.keys(model).length > 0;
      btn.classList.toggle("is-hidden", !(urlActive || searchActive || simpleActive || agActive));
    });
  }
  function handleToolbarSavedSearchClick(e) {
    var _a, _b;
    const target = eventTargetElement(e.target);
    if (!target) return;
    const gridBtn = target.closest(
      '[data-cm-grid-action="saveSearch"], [data-cm-grid-action="toggleSavedSearches"], [data-cm-grid-action="clearSearch"], [data-cm-grid-action="clearAllFilters"], [data-cm-grid-action="reloadData"], [data-cm-toolbar-search-clear][data-cm-grid-action="clearSearch"]'
    );
    if (!gridBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const scopeId = gridBtn.getAttribute("data-cm-grid-id") || gridBtn.getAttribute("data-cm-search-scope-id") || ((_a = asHTMLElement(gridBtn.closest("[data-cm-toolbar-search-root]"))) == null ? void 0 : _a.dataset.cmSearchScopeId) || "";
    if (!scopeId) return;
    const action = gridBtn.getAttribute("data-cm-grid-action");
    if (action === "saveSearch") ToolbarSearch.save(scopeId);
    else if (action === "toggleSavedSearches") ToolbarSearch.toggle(scopeId);
    else if (action === "clearAllFilters") {
      const clearGridId = gridBtn.getAttribute("data-cm-grid-id") || scopeId;
      invokeGridAction(clearGridId, "clearAllFilters");
      clearSimpleTableFiltersForGrid(clearGridId);
      window.setTimeout(syncClearAllButtons, 0);
    } else if (action === "reloadData") {
      invokeGridAction(gridBtn.getAttribute("data-cm-grid-id") || scopeId, "reloadData");
    } else if (action === "clearSearch") {
      const clearInput = asHtmlInput(
        (_b = gridBtn.closest("[data-cm-toolbar-search-root]")) == null ? void 0 : _b.querySelector("[data-cm-toolbar-search]")
      );
      if (clearInput) {
        clearInput.value = "";
        syncToolbarSearchChrome(clearInput);
      }
      const root = asHTMLElement(gridBtn.closest("[data-cm-toolbar-search-root]"));
      const tableId = (root == null ? void 0 : root.dataset.cmTableGridId) || (root == null ? void 0 : root.dataset.cmPrefGridId) || scopeId;
      invokeGridAction(tableId, "clearSearch");
      window.setTimeout(syncClearAllButtons, 0);
    }
  }
  function bindDelegatedGridActions() {
    if (getGlobal()._cmGridActionsBound) return;
    getGlobal()._cmGridActionsBound = true;
    document.addEventListener("click", handleToolbarSavedSearchClick, true);
    document.addEventListener("input", () => window.setTimeout(syncClearAllButtons, 0), true);
    document.addEventListener("cm-filter-change", () => window.setTimeout(syncClearAllButtons, 0));
    document.addEventListener("cm-grid-state-change", () => window.setTimeout(syncClearAllButtons, 0));
    window.setTimeout(syncClearAllButtons, 0);
    document.addEventListener("click", (e) => {
      var _a;
      const target = eventTargetElement(e.target);
      if (!target) return;
      const cellBtn = target.closest("[data-cm-cell-action]");
      if (cellBtn) {
        e.preventDefault();
        e.stopPropagation();
        const cellAction = cellBtn.getAttribute("data-cm-cell-action");
        if (cellAction) {
          invokeAction(cellAction, {
            rowId: cellBtn.getAttribute("data-cm-row-id") || void 0,
            gridId: ((_a = cellBtn.closest("[data-grid-id]")) == null ? void 0 : _a.getAttribute("data-grid-id")) || void 0,
            event: e
          });
        }
        return;
      }
      const colBtn = target.closest("[data-cm-col-action]");
      if (colBtn) {
        const colAction = colBtn.getAttribute("data-cm-col-action");
        const colGridId = colBtn.getAttribute("data-cm-grid-id");
        if (colAction === "toggle") invokeGridAction(colGridId, "toggleColSelector");
        else if (colAction === "reset") invokeGridAction(colGridId, "resetColumnsToDefault");
        else if (colAction === "savePreset") invokeGridAction(colGridId, "saveCurrentPreset");
        return;
      }
    });
    document.addEventListener("input", (e) => {
      var _a, _b;
      const inp = asHtmlInput((_b = (_a = eventTargetElement(e.target)) == null ? void 0 : _a.closest("[data-cm-grid-search]")) != null ? _b : null);
      if (!inp) return;
      if (inp.getAttribute("data-cm-grid-search-apply") === "enter") return;
      invokeGridAction(inp.getAttribute("data-cm-grid-id"), "onQuickFilterChanged");
    });
    document.addEventListener("keydown", (e) => {
      var _a, _b;
      if (e.key !== "Enter") return;
      const inp = asHtmlInput(
        (_b = (_a = eventTargetElement(e.target)) == null ? void 0 : _a.closest(
          '[data-cm-grid-search][data-cm-grid-search-apply="enter"]'
        )) != null ? _b : null
      );
      if (!inp) return;
      e.preventDefault();
      invokeGridAction(inp.getAttribute("data-cm-grid-id"), "reloadData");
    });
  }
  function initSimpleTableColumnSettings(wrapper) {
    var _a;
    const fn = (_a = getGlobal().GridView) == null ? void 0 : _a.initSimpleTableColumnSettings;
    if (typeof fn === "function" && fn !== initSimpleTableColumnSettings) {
      return fn(wrapper);
    }
    return null;
  }

  // src/grid-view/format.ts
  function num(value) {
    if (value === null || value === void 0 || value === "") return null;
    const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function uiLocale() {
    if (typeof document === "undefined" || !document.documentElement) return void 0;
    return document.documentElement.lang || void 0;
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
      return n.toLocaleString(uiLocale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return String(value);
  }
  function aggregateKpi(spec, rows) {
    var _a, _b;
    const agg = spec.aggregate || "count";
    if (agg === "count") return rows.length;
    const key = (_b = (_a = spec.columnKey) != null ? _a : spec.column_key) != null ? _b : spec.field;
    if (!key) return 0;
    const nums = [];
    rows.forEach((row) => {
      const parsed = num(row[key]);
      if (parsed !== null) nums.push(parsed);
    });
    if (agg === "sum")
      return nums.reduce(function(a, b) {
        return a + b;
      }, 0);
    if (agg === "avg")
      return nums.length ? nums.reduce(function(a, b) {
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
        icon: spec.icon || void 0
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
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.cmKpiReady) return;
      const kpis = JSON.parse(
        node.dataset.cmKpiConfig || "[]"
      );
      const columns = parseInt(node.dataset.cmKpiColumns || "4", 10);
      initKpiStrip(node, kpis, columns);
      node.dataset.cmKpiReady = "1";
    });
  }
  var Kpi = { initKpiStrip, initAllKpi, kpiCardHtml };

  // src/grid-view/grid-adapter.ts
  function staticRowsAdapter(rows) {
    const snapshot = rows != null ? rows : [];
    return {
      getRows: () => snapshot,
      onChange: () => () => {
      }
    };
  }
  function createAgGridAdapter(gridApi) {
    if (!gridApi) return staticRowsAdapter([]);
    return {
      getRows: () => {
        var _a;
        const out = [];
        (_a = gridApi.forEachNodeAfterFilterAndSort) == null ? void 0 : _a.call(gridApi, (node) => {
          if (node == null ? void 0 : node.data) out.push(node.data);
        });
        return out;
      },
      onChange: (cb) => {
        const events = ["filterChanged", "sortChanged", "modelUpdated"];
        events.forEach((ev) => {
          var _a;
          (_a = gridApi.addEventListener) == null ? void 0 : _a.call(gridApi, ev, cb);
        });
        return () => {
          events.forEach((ev) => {
            var _a;
            (_a = gridApi.removeEventListener) == null ? void 0 : _a.call(gridApi, ev, cb);
          });
        };
      }
    };
  }
  function initGridKpiStrip(kpiRoot, specs, adapter, columns) {
    if (!kpiRoot || !specs.length || !adapter) return null;
    const refresh = () => {
      Kpi.initKpiStrip(kpiRoot, resolveKpis(specs, adapter.getRows()), columns);
    };
    refresh();
    return adapter.onChange(refresh);
  }
  function bindGridKpis(opts = {}) {
    var _a;
    const scope = (_a = opts.root) != null ? _a : document;
    const adapter = opts.gridAdapter;
    if (!adapter) return null;
    const unsubs = [];
    scope.querySelectorAll("[data-cm-grid-kpi]").forEach((wrap) => {
      if (!(wrap instanceof HTMLElement)) return;
      if (wrap.dataset.cmGridKpiReady) return;
      let specs = [];
      try {
        specs = JSON.parse(wrap.dataset.cmGridKpiSpecs || "[]");
      } catch (_e) {
        specs = [];
      }
      const columns = parseInt(wrap.dataset.cmKpiColumns || "4", 10);
      const kpiRoot = wrap.querySelector("[data-cm-kpi-root]") || wrap;
      const unsub = initGridKpiStrip(kpiRoot, specs, adapter, columns);
      if (typeof unsub === "function") unsubs.push(unsub);
      wrap.dataset.cmGridKpiReady = "1";
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }
  function bindGridFilteredCharts(scope, adapter) {
    const unsubs = [];
    scope.querySelectorAll("[data-cm-chart-config]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.cmChartInteractive) return;
      let config;
      try {
        config = JSON.parse(node.dataset.cmChartConfig || "{}");
      } catch (_e) {
        return;
      }
      if (config.dataSource !== "grid_filtered") return;
      const refresh = () => {
        ChartsBridge.refreshChartWrap(node, config, adapter.getRows());
      };
      refresh();
      const unsub = adapter.onChange(refresh);
      if (typeof unsub === "function") unsubs.push(unsub);
      node.dataset.cmChartReady = "1";
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }
  var GridAdapter = {
    staticRowsAdapter,
    createAgGridAdapter,
    resolveKpis,
    bindGridKpis,
    bindGridFilteredCharts
  };

  // src/grid-view/table-edit.ts
  function csrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
  function interpolateEndpoint(template, rowId) {
    return template.replace(/\{id\}/g, rowId);
  }
  async function postCommitEndpoint(endpoint, rowId, field, newValue) {
    const url = interpolateEndpoint(endpoint, rowId);
    const body = {};
    if (field.includes("department")) {
      body.department_id = newValue ? Number(newValue) : null;
    } else {
      body[field] = newValue;
    }
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) return false;
    try {
      const data = await res.json();
      return !data || data.status !== "error";
    } catch (e) {
      return res.ok;
    }
  }
  function updateSelectView(cell, select, saved) {
    var _a, _b;
    const view = cell.querySelector(".cm-dept-view, .cm-cell-edit-view");
    if (!view) return;
    const emptyLabel = cell.getAttribute("data-cm-empty-label") || "\u2014";
    if (!select.value) {
      view.textContent = emptyLabel;
      return;
    }
    const savedName = saved && typeof saved.department_name === "string" ? saved.department_name : "";
    const optionText = ((_b = (_a = select.options[select.selectedIndex]) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || "";
    view.textContent = savedName || optionText;
  }
  function flashCell(cell) {
    cell.classList.add("cm-dept-cell--saved", "cm-cell-edit--saved");
    setTimeout(() => {
      cell.classList.remove("cm-dept-cell--saved", "cm-cell-edit--saved");
    }, 1500);
  }
  async function saveSelect(shell, config, select) {
    const rowId = select.getAttribute("data-cm-row-id") || "";
    const cell = select.closest("[data-cm-cell-edit]");
    const field = (cell == null ? void 0 : cell.getAttribute("data-cm-field")) || "";
    const prev = select.dataset.cmEditPrev || "";
    const value = select.value;
    if (value === prev) return true;
    select.disabled = true;
    let ok = false;
    try {
      if (config.commitCallback) {
        ok = await invokeCommit(config.commitCallback, {
          rowId,
          gridId: shell.getAttribute("data-grid-id") || void 0,
          columnId: field,
          field,
          oldValue: prev,
          newValue: value
        });
      } else if (config.commitEndpoint) {
        ok = await postCommitEndpoint(config.commitEndpoint, rowId, field, value);
      }
      if (!ok) {
        select.value = prev;
        window.alert("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u043C\u0456\u043D\u0438");
        return false;
      }
      select.dataset.cmEditPrev = value;
      if (cell) {
        updateSelectView(cell, select);
        flashCell(cell);
      }
      return true;
    } catch (e) {
      select.value = prev;
      window.alert("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043C\u0435\u0440\u0435\u0436\u0456");
      return false;
    } finally {
      select.disabled = false;
    }
  }
  function findEditToolsSlot(shell, columnId) {
    const th = shell.querySelector(`th[data-cm-col-key="${columnId}"]`);
    return th ? th.querySelector("[data-cm-th-tools]") : null;
  }
  function ensureHeaderControls(shell, config) {
    var _a;
    if (!config.confirm || config.mode !== "row") return;
    const firstCol = (_a = config.columns) == null ? void 0 : _a[0];
    if (!firstCol) return;
    const slot = findEditToolsSlot(shell, firstCol.id);
    if (!slot || slot.querySelector(".cm-table-edit-tools")) return;
    slot.removeAttribute("aria-hidden");
    const tools = document.createElement("span");
    tools.className = "cm-table-edit-tools cm-dept-header-tools";
    tools.innerHTML = '<button type="button" class="cm-table-edit-toggle cm-dept-edit-toggle" title="\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438" aria-label="\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438"><svg class="cm-dept-pencil-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button><button type="button" class="cm-table-edit-done cm-dept-edit-done" hidden title="\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438" aria-label="\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438"><svg class="cm-dept-done-icon" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/><path d="M8 12.5 10.5 15 16 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    slot.appendChild(tools);
    const gv2 = getGlobal().GridView;
    if (gv2 && typeof gv2.initButtonEllipsisTips === "function") {
      gv2.initButtonEllipsisTips(tools);
    }
    const toggle = tools.querySelector(".cm-table-edit-toggle");
    const done = tools.querySelector(".cm-table-edit-done");
    const layout = shell.closest(".cm-page-table-layout, .cm-dashboard-page") || shell;
    toggle == null ? void 0 : toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      layout.classList.add("cm-table--row-edit", "cm-doctor-page--dept-edit");
      shell.setAttribute("data-cm-inline-edit-active", "");
      if (toggle) toggle.hidden = true;
      if (done) done.hidden = false;
    });
    done == null ? void 0 : done.addEventListener("click", (e) => {
      e.stopPropagation();
      const selects = shell.querySelectorAll(
        "[data-cm-inline-edit]"
      );
      const pending = [];
      selects.forEach((select) => {
        if (select.value !== (select.dataset.cmEditPrev || "")) {
          pending.push(saveSelect(shell, config, select));
        }
      });
      const finish = () => {
        layout.classList.remove("cm-table--row-edit", "cm-doctor-page--dept-edit");
        shell.removeAttribute("data-cm-inline-edit-active");
        if (done) done.hidden = true;
        if (toggle) toggle.hidden = false;
      };
      if (!pending.length) {
        finish();
        return;
      }
      if (done) done.disabled = true;
      Promise.all(pending).finally(() => {
        if (done) done.disabled = false;
        finish();
      });
    });
  }
  function bindSelectCells(shell, config) {
    shell.querySelectorAll("[data-cm-inline-edit]").forEach((select) => {
      if (!select.dataset.cmEditPrev) {
        select.dataset.cmEditPrev = select.value;
      }
    });
    if (shell.dataset.cmTableEditChangeBound) return;
    shell.dataset.cmTableEditChangeBound = "1";
    shell.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.matches("[data-cm-inline-edit]")) return;
      if (!config.confirm) {
        void saveSelect(shell, config, target);
      }
    });
  }
  function initTableEdit(scope = document) {
    scope.querySelectorAll("[data-cm-table-edit]").forEach((shell) => {
      var _a;
      if (shell.dataset.cmTableEditBound) return;
      let config;
      try {
        config = JSON.parse(shell.getAttribute("data-cm-table-edit") || "{}");
      } catch (e) {
        return;
      }
      if (!((_a = config.columns) == null ? void 0 : _a.length)) return;
      shell.dataset.cmTableEditBound = "1";
      bindSelectCells(shell, config);
      ensureHeaderControls(shell, config);
    });
  }

  // src/grid-view/init.ts
  function init(opts) {
    var _a, _b, _c, _d;
    const options = opts != null ? opts : {};
    const scope = (_a = options.root) != null ? _a : document;
    const adapter = options.gridAdapter;
    const disconnectFns = [];
    if (options.artifact) {
      const artifact = options.artifact;
      if ((_b = artifact.kpis) == null ? void 0 : _b.length) {
        const kpiRoot = scope.querySelector("[data-cm-kpi-root]");
        if (kpiRoot) {
          Kpi.initKpiStrip(kpiRoot, artifact.kpis, (_c = artifact.layout) == null ? void 0 : _c.kpiColumns);
        }
      }
      ((_d = artifact.charts) != null ? _d : []).forEach((chartCfg) => {
        var _a2, _b2;
        const el = scope.querySelector(`[data-cm-chart-id="${chartCfg.id}"]`);
        if (el) {
          const chartRoot = (_a2 = el.querySelector("[data-cm-chart-root]")) != null ? _a2 : el;
          ChartsBridge.initChart(chartRoot, chartCfg, (_b2 = artifact.rows) != null ? _b2 : []);
        }
      });
    }
    if (adapter) {
      const dKpi = bindGridKpis({ root: scope, gridAdapter: adapter });
      if (dKpi) disconnectFns.push(dKpi);
      const dCharts = bindGridFilteredCharts(scope, adapter);
      if (dCharts) disconnectFns.push(dCharts);
    }
    Kpi.initAllKpi(scope);
    ChartsBridge.initAllCharts(scope);
    initAllSimpleTables(scope);
    initTableEdit(scope);
    initFilterBars(scope);
    initButtonEllipsisTips(scope);
    initTabGroups(scope);
    const onCellEdit = options.onCellEdit;
    if (typeof onCellEdit === "function") {
      scope.querySelectorAll("[data-cm-editable]").forEach((cellEl) => {
        const cell = asHTMLElement(cellEl);
        if (!cell || cell.dataset.cmEditBound) return;
        cell.dataset.cmEditBound = "1";
        cell.addEventListener("blur", () => {
          var _a2, _b2, _c2, _d2;
          const row = cell.closest(".cm-row");
          const rowEl = asHTMLElement(row);
          onCellEdit({
            gridId: (_b2 = (_a2 = rowEl == null ? void 0 : rowEl.closest("[data-grid-id]")) == null ? void 0 : _a2.getAttribute("data-grid-id")) != null ? _b2 : void 0,
            rowId: (_c2 = rowEl == null ? void 0 : rowEl.dataset.cmRowId) != null ? _c2 : void 0,
            columnKey: cell.dataset.cmColumnKey,
            oldValue: cell.dataset.cmOldValue,
            newValue: (_d2 = cell.textContent) == null ? void 0 : _d2.trim(),
            row: {}
          });
        });
      });
    }
    if (disconnectFns.length) {
      return () => {
        disconnectFns.forEach((fn) => fn());
      };
    }
    return void 0;
  }

  // src/grid-view/ag-grid.ts
  function isExtraParamsProvider(fn) {
    return typeof fn === "function";
  }
  function isAgGridSortState(col) {
    return typeof col === "object" && col !== null && Boolean(Reflect.get(col, "sort"));
  }
  function isColumnStateGetter(fn) {
    return typeof fn === "function";
  }
  function getQuickSearchText(gridIdOrHandle) {
    var _a, _b;
    const handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle != null ? gridIdOrHandle : null;
    const id = (_a = handle == null ? void 0 : handle.gridId) != null ? _a : typeof gridIdOrHandle === "string" ? gridIdOrHandle : "";
    const input = id ? resolveToolbarSearchInput(id) : null;
    if (input == null ? void 0 : input.value) return input.value.trim();
    if (handle == null ? void 0 : handle._searchText) return handle._searchText;
    return ((_b = new URLSearchParams(window.location.search).get("q")) != null ? _b : "").trim();
  }
  function absorbUrlSearchQuery(handle, options = {}) {
    var _a;
    const paramName = (_a = options.urlSearchParam) != null ? _a : "q";
    const urlQ = new URLSearchParams(window.location.search).get(paramName);
    if (!urlQ || handle._urlQAbsorbed) return "";
    handle._searchText = urlQ;
    handle._urlQAbsorbed = true;
    window.setTimeout(() => {
      var _a2;
      const searchInput = resolveToolbarSearchInput((_a2 = handle.gridId) != null ? _a2 : "");
      if (searchInput) searchInput.value = urlQ;
    }, 50);
    return urlQ;
  }
  function buildInfiniteQueryParams(blockParams, gridIdOrHandle, options) {
    options = options || {};
    var handle = typeof gridIdOrHandle === "string" ? byId.get(gridIdOrHandle) : gridIdOrHandle;
    var extra = options.getExtraParams && options.getExtraParams() || {};
    var qf = getQuickSearchText(handle);
    if (options.absorbUrlSearch !== false && handle) {
      var absorbed = absorbUrlSearchQuery(handle, options);
      if (absorbed) qf = absorbed;
    }
    var params = new URLSearchParams();
    Object.keys(extra).forEach(function(key) {
      var val = extra[key];
      if (val == null || val === "") return;
      if (Array.isArray(val)) {
        if (val.length) params.set(key, val.join(","));
        return;
      }
      params.set(key, String(val));
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
    if (handle && handle.gridApi && typeof handle.gridApi.getAllDisplayedColumns === "function" && options.includeVisibleCols !== false) {
      var visibleCols = handle.gridApi.getAllDisplayedColumns().map(function(col) {
        return col.getColId();
      }).join(",");
      if (visibleCols) params.set("cols", visibleCols);
    }
    return params;
  }
  function createInfiniteDatasource(options) {
    const url = options.url;
    const gridId = options.gridId;
    return {
      getRows: function(blockParams) {
        var _a;
        const handle = gridId ? byId.get(gridId) : null;
        if (!handle) {
          blockParams.failCallback();
          return;
        }
        const params = buildInfiniteQueryParams(blockParams, handle, options);
        (_a = handle.showLoading) == null ? void 0 : _a.call(handle);
        fetch(url + "?" + params.toString()).then(function(response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then(function(data) {
          var _a2, _b;
          (_a2 = handle.hideOverlay) == null ? void 0 : _a2.call(handle);
          blockParams.successCallback(data.data, data.lastRow);
          (_b = options.onLastRow) == null ? void 0 : _b.call(options, data.lastRow);
        }).catch(function(error) {
          var _a2;
          console.error("[GridView.AgGrid] infinite fetch failed:", error);
          (_a2 = handle.hideOverlay) == null ? void 0 : _a2.call(handle);
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
      if (extraFn) {
        var provider = Reflect.get(getGlobal(), extraFn);
        if (isExtraParamsProvider(provider) && !linkOpts.getExtraParams) {
          linkOpts.getExtraParams = provider;
        }
      }
      syncExportHref(linkEl, gridId, linkOpts);
    });
  }
  function syncExportHref(linkEl, gridIdOrHandle, options) {
    if (!(linkEl instanceof HTMLAnchorElement) || !linkEl.href) return;
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
      colScope = document.querySelector('[data-grid-id="' + escGrid + '"]') || linkEl.closest(
        ".cm-page-table-layout, .cm-dashboard-page, .cm-simple-wrapper, .cm-table-shell"
      ) || document;
    }
    var colQ = serializeColumnFilters(colScope);
    if (colQ) target.searchParams.set("col_q", colQ);
    else target.searchParams.delete("col_q");
    if (handle && handle.gridApi && typeof handle.gridApi.getFilterModel === "function" && typeof handle.gridApi.getColumnState === "function" && typeof handle.gridApi.getAllDisplayedColumns === "function") {
      var filterModel = handle.gridApi.getFilterModel() || {};
      if (Object.keys(filterModel).length) {
        target.searchParams.set("filters", JSON.stringify(filterModel));
      } else {
        target.searchParams.delete("filters");
      }
      var getColumnState = handle.gridApi.getColumnState;
      var sortState = isColumnStateGetter(getColumnState) ? getColumnState().filter(isAgGridSortState) : [];
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
    resolveToolbarSearchInput,
    getQuickSearchText,
    buildInfiniteQueryParams,
    createInfiniteDatasource,
    syncExportHref,
    syncExportLinks
  };

  // src/runtime/content-actions.ts
  function resolveContentBlock(targetId) {
    var _a;
    return (_a = document.getElementById(`block-${targetId}`)) != null ? _a : document.querySelector(`[data-block-id="${targetId}"]`);
  }
  function showContentBlock(targetId, autoHideMs) {
    const block = resolveContentBlock(targetId);
    if (!block) return;
    block.classList.remove("hidden");
    if (autoHideMs && autoHideMs > 0) {
      window.setTimeout(() => block.classList.add("hidden"), autoHideMs);
    }
  }
  function applyDismissStorage(scope) {
    scope.querySelectorAll("[data-cm-content-dismissible]").forEach((el) => {
      var _a;
      const key = el.getAttribute("data-cm-dismiss-key");
      if (key && sessionStorage.getItem(key) === "1") {
        (_a = el.closest(".cm-block")) == null ? void 0 : _a.classList.add("hidden");
      }
    });
  }
  function initContentActions(scope) {
    applyDismissStorage(scope);
    scope.querySelectorAll("[data-cm-content-dismiss]").forEach((btn) => {
      if (btn.dataset.cmContentDismissInit) return;
      btn.dataset.cmContentDismissInit = "1";
      btn.addEventListener("click", () => {
        var _a;
        const host = btn.closest("[data-cm-content-dismissible]");
        const key = host == null ? void 0 : host.getAttribute("data-cm-dismiss-key");
        if (key) sessionStorage.setItem(key, "1");
        (_a = btn.closest(".cm-block")) == null ? void 0 : _a.classList.add("hidden");
      });
    });
    scope.querySelectorAll('[data-cm-action="show_content"]').forEach((btn) => {
      if (btn.dataset.cmShowContentInit) return;
      btn.dataset.cmShowContentInit = "1";
      btn.addEventListener("click", () => {
        var _a;
        const targetId = (_a = btn.getAttribute("data-cm-action-target")) != null ? _a : "";
        if (!targetId) return;
        const autoHideRaw = btn.getAttribute("data-cm-auto-hide-ms");
        const autoHideMs = autoHideRaw ? parseInt(autoHideRaw, 10) : void 0;
        showContentBlock(targetId, Number.isFinite(autoHideMs) ? autoHideMs : void 0);
      });
    });
  }

  // src/runtime/gallery.ts
  function initGalleryBlocks(_scope = document) {
  }

  // src/runtime/renderers/builtins.ts
  function escHtml(value) {
    if (value === void 0 || value === null || value === "") return "";
    const d = document.createElement("div");
    d.textContent = String(value);
    return d.innerHTML;
  }
  function moneyRenderer(params) {
    var _a, _b, _c, _d;
    const value = params.value;
    if (value === void 0 || value === null || value === "") return "";
    const field = ((_a = params.colDef) == null ? void 0 : _a.field) || "";
    const rowCurr = (_b = params.data) == null ? void 0 : _b[`${field}_currency`];
    const curr = typeof rowCurr === "string" && rowCurr || "UAH";
    const symbols = { USD: "$", EUR: "\u20AC", UAH: "\u20B4", PLN: "z\u0142", GBP: "\xA3" };
    const colors = { USD: "#10b981", EUR: "#3b82f6", UAH: "#eab308" };
    const sym = symbols[curr] || curr;
    const color = colors[curr] || "#9ca3af";
    const numValue = Number(value);
    const useDecimals = curr !== "UAH";
    const displayValue = useDecimals ? numValue.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(numValue).toLocaleString("uk-UA");
    const cssClass = String(((_d = (_c = params.colDef) == null ? void 0 : _c.cellRendererParams) == null ? void 0 : _d.css_class) || "");
    const inner = displayValue + ` <span style="color:${color};font-size:12px;margin-left:2px">${sym}</span>`;
    return cssClass ? `<span class="${escHtml(cssClass)}">${inner}</span>` : inner;
  }
  function linkRenderer(params) {
    var _a, _b, _c, _d, _e;
    const field = ((_a = params.colDef) == null ? void 0 : _a.field) || "";
    const extra = ((_b = params.colDef) == null ? void 0 : _b.cellRendererParams) || {};
    const url = (_c = params.data) == null ? void 0 : _c[`${field}__url`];
    const text = (_d = params.value) != null ? _d : "";
    const action = extra.action ? String(extra.action) : "";
    const recordKey = String(extra.record_key || "id");
    const rowId = (_e = params.data) == null ? void 0 : _e[recordKey];
    const rowAttr = rowId != null ? ` data-cm-row-id="${escHtml(rowId)}"` : "";
    if (typeof url === "string" && url) {
      const actionAttr = action ? ` data-cm-cell-action="${escHtml(action)}"` : "";
      return `<a href="${escHtml(url)}" class="cm-grid-link cm-link"${actionAttr}${rowAttr} style="font-weight:500;color:#818cf8">${escHtml(text)}</a>`;
    }
    if (action) {
      return `<span class="cm-grid-link cm-link" role="button" tabindex="0" data-cm-cell-action="${escHtml(action)}"${rowAttr} style="font-weight:500;cursor:pointer;color:#818cf8">${escHtml(text)}</span>`;
    }
    return escHtml(text);
  }
  function badgeRenderer(params) {
    var _a, _b;
    const value = params.value;
    if (value === void 0 || value === null || value === "") return "";
    const extra = ((_a = params.colDef) == null ? void 0 : _a.cellRendererParams) || {};
    const badges = extra.badges || {};
    const labels = extra.badge_labels || {};
    const labelField = extra.label_field ? String(extra.label_field) : "";
    const key = String(value);
    const cls = badges[key] || "badge-slate";
    let label = labels[key] || key;
    if (labelField && ((_b = params.data) == null ? void 0 : _b[labelField]) != null) {
      label = String(params.data[labelField]);
    }
    return `<span class="badge ${escHtml(cls)}">${escHtml(label)}</span>`;
  }
  function dateRenderer(params) {
    const value = params.value;
    if (!value) return "";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return escHtml(value);
    return escHtml(date.toLocaleDateString("uk-UA"));
  }
  function buttonRenderer(params) {
    var _a, _b, _c, _d;
    const extra = ((_a = params.colDef) == null ? void 0 : _a.cellRendererParams) || {};
    const action = String(extra.action || "");
    if (!action) return escHtml((_b = params.value) != null ? _b : "");
    const label = String(extra.label || "") || (extra.label_from_field && params.data ? String(params.data[String(extra.label_from_field)] || "") : "") || String((_c = params.value) != null ? _c : "");
    const btnClass = String(extra.button_class || "cm-record-detail-btn");
    const recordKey = String(extra.record_key || "id");
    const rowId = (_d = params.data) == null ? void 0 : _d[recordKey];
    return `<button type="button" class="${escHtml(btnClass)}" data-cm-cell-action="${escHtml(action)}" data-cm-row-id="${escHtml(rowId != null ? rowId : "")}">${escHtml(label)}</button>`;
  }
  var _registered = false;
  function initBuiltinRenderers() {
    if (_registered) return;
    _registered = true;
    registerRenderer("money", moneyRenderer);
    registerRenderer("link", linkRenderer);
    registerRenderer("badge", badgeRenderer);
    registerRenderer("date", dateRenderer);
    registerRenderer("button", buttonRenderer);
  }

  // src/runtime/renderers/image.ts
  function initImageRenderers(_scope = document) {
  }

  // src/runtime/asset-loader.ts
  function manifest() {
    var _a;
    const w = getGlobal();
    return (_a = w.__GridViewAssets) != null ? _a : {};
  }
  function loadStylesheet(href, lazy = true) {
    if (!href) return;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    if (lazy) {
      link.dataset.cmAgGridAsset = "1";
    }
    document.head.appendChild(link);
  }
  function unloadAgGridStyles() {
    document.querySelectorAll('link[data-cm-ag-grid-asset="1"], link[href*="ag-grid"]').forEach((node) => node.remove());
  }
  function loadScript(src, isReady) {
    if (!src) return Promise.resolve();
    if (isReady()) return Promise.resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      return new Promise((resolve) => {
        const poll = window.setInterval(() => {
          if (isReady()) {
            window.clearInterval(poll);
            resolve();
          }
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(poll);
          resolve();
        }, 15e3);
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => {
        const poll = window.setInterval(() => {
          if (isReady()) {
            window.clearInterval(poll);
            resolve();
          }
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(poll);
          resolve();
        }, 15e3);
      };
      script.onerror = () => reject(new Error(`[GridView] Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }
  var agGridLoadPromise = null;
  function ensureAgGridAssetsLoaded() {
    var _a;
    const gv2 = getGlobal().GridView;
    if ((_a = gv2 == null ? void 0 : gv2.AgGrid) == null ? void 0 : _a.Host) return Promise.resolve();
    if (agGridLoadPromise) return agGridLoadPromise;
    const cfg = manifest();
    agGridLoadPromise = (async () => {
      var _a2, _b, _c;
      ((_a2 = cfg.agGridCss) != null ? _a2 : []).forEach((href) => loadStylesheet(href));
      await loadScript((_b = cfg.agGridCdn) != null ? _b : "", () => typeof getGlobal().agGrid !== "undefined");
      await loadScript((_c = cfg.agGridPlugin) != null ? _c : "", () => {
        var _a3, _b2;
        return !!((_b2 = (_a3 = getGlobal().GridView) == null ? void 0 : _a3.AgGrid) == null ? void 0 : _b2.Host);
      });
    })().catch((error) => {
      agGridLoadPromise = null;
      throw error;
    });
    return agGridLoadPromise;
  }
  var chartsLoadPromise = null;
  function ensureChartsAssetsLoaded() {
    var _a;
    const g = getGlobal();
    if (((_a = g.GridView) == null ? void 0 : _a._chartsApiReady) && typeof g.echarts !== "undefined") return Promise.resolve();
    if (chartsLoadPromise) return chartsLoadPromise;
    const cfg = manifest();
    chartsLoadPromise = (async () => {
      var _a2, _b;
      await loadScript((_a2 = cfg.chartsCdn) != null ? _a2 : "", () => typeof getGlobal().echarts !== "undefined");
      await loadScript(
        (_b = cfg.chartsPlugin) != null ? _b : "",
        () => {
          var _a3;
          return !!((_a3 = getGlobal().GridView) == null ? void 0 : _a3._chartsApiReady);
        }
      );
    })().catch((error) => {
      chartsLoadPromise = null;
      throw error;
    });
    return chartsLoadPromise;
  }
  function installAssetLoader(gv2) {
    var _a;
    gv2.assets = (_a = gv2.assets) != null ? _a : {};
    gv2.assets.ensureAgGrid = ensureAgGridAssetsLoaded;
    gv2.assets.ensureCharts = ensureChartsAssetsLoaded;
  }

  // src/runtime/table-ag-grid.ts
  var specFilterListeners = /* @__PURE__ */ new Set();
  function resolvePresets(gridId, fromConfig) {
    if (fromConfig && typeof fromConfig === "object") return fromConfig;
    try {
      const stored = localStorage.getItem(`agGridPresets_${gridId}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
    }
    return {};
  }
  function resolveSearches(gridId, fromConfig) {
    if (Array.isArray(fromConfig)) return fromConfig;
    if (fromConfig) {
      try {
        const parsed = JSON.parse(String(fromConfig));
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
      }
    }
    try {
      const stored = localStorage.getItem(`cmSavedSearches_${gridId}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
    }
    return [];
  }
  function resolveAgColumnFilter(col) {
    if (col.agFilter === "none") return false;
    if (col.agFilter === "smart") return "customSetFilter";
    return "customExprFilter";
  }
  function exprColumnFilterKind(col) {
    return col.type === "number" || col.type === "currency" ? "numeric" : "text";
  }
  function resolveRendererId(col) {
    if (col.renderer) return col.renderer;
    if (col.type === "currency") return "money";
    return "";
  }
  function wrapRegisteredRenderer(rendererId) {
    return (params) => {
      const regFn = getRegisteredRenderer(rendererId);
      if (!regFn) return "";
      return regFn(params);
    };
  }
  function buildColumnDefsFromSpec(columns) {
    return columns.map((col) => {
      var _a;
      const field = col.field || col.id;
      const rendererId = resolveRendererId(col);
      const agFilter = resolveAgColumnFilter(col);
      const def = {
        field,
        colId: col.id,
        headerName: col.label,
        hide: (_a = col.hidden) != null ? _a : false,
        filter: agFilter,
        sortable: col.sortable !== false,
        resizable: true,
        enableCellTextSelection: true,
        tooltipField: field
      };
      if (agFilter === "customExprFilter") def.columnFilter = exprColumnFilterKind(col);
      if (col.pinned === "left" || col.pinned === "right") def.pinned = col.pinned;
      if (col.menuGroup) def.menuGroup = col.menuGroup;
      if (col.checkboxSelection) def.checkboxSelection = true;
      if (col.editable) def.editable = true;
      if (col.width) {
        const width = Number.parseInt(col.width, 10);
        if (!Number.isNaN(width)) def.width = width;
      }
      if (col.minWidth) {
        const minWidth = Number.parseInt(col.minWidth, 10);
        if (!Number.isNaN(minWidth)) def.minWidth = minWidth;
      } else if (!col.width && (col.id === "name" || col.id === "original_name")) {
        def.flex = 1;
        def.minWidth = 200;
      }
      if (rendererId) def.cellRenderer = wrapRegisteredRenderer(rendererId);
      if (col.extra && Object.keys(col.extra).length > 0) {
        def.cellRendererParams = col.extra;
        const cellClass = col.extra.cell_class;
        if (typeof cellClass === "string" && cellClass) def.cellClass = cellClass;
      }
      return def;
    });
  }
  function columnSourceReady(source, pageState) {
    const deps = source.dependsOn || [];
    if (!deps.length) return true;
    return deps.every((dep) => {
      const val = pageState[dep];
      if (val == null || val === "") return false;
      if (Array.isArray(val)) return val.length > 0 && !(val.length === 1 && val[0] === "");
      return true;
    });
  }
  async function fetchColumnSourceColumns(source, pageState) {
    if (!columnSourceReady(source, pageState)) return [];
    const url = new URL(source.endpoint, window.location.origin);
    (source.dependsOn || []).forEach((dep) => {
      const val = pageState[dep];
      if (Array.isArray(val)) url.searchParams.set(dep, val.join(","));
      else if (val != null && val !== "") url.searchParams.set(dep, String(val));
    });
    if (source.params) {
      Object.entries(source.params).forEach(([key, val]) => {
        if (val != null && val !== "") url.searchParams.set(key, String(val));
      });
    }
    const response = await fetch(url.toString(), { method: source.method || "GET" });
    if (!response.ok) throw new Error(`[GridView.AgGrid] column_source HTTP ${response.status}`);
    const data = await response.json();
    return data.columns || [];
  }
  function mergeColumnDefsAtAnchor(base, dynamic, anchor, merge) {
    const dynamicIds = new Set(dynamic.map((col) => String(col.colId || col.field)));
    let result = merge === "replace" ? base.filter((col) => !dynamicIds.has(String(col.colId || col.field))) : base.filter((col) => !dynamicIds.has(String(col.colId || col.field)));
    if (!anchor) return [...result, ...dynamic];
    const idx = result.findIndex((col) => String(col.colId || col.field) === anchor);
    if (idx < 0) return [...result, ...dynamic];
    return [...result.slice(0, idx + 1), ...dynamic, ...result.slice(idx + 1)];
  }
  function mergeSpecOnlyColumns(base, specColumns, anchor) {
    if (!(specColumns == null ? void 0 : specColumns.length)) return base;
    const existingIds = new Set(base.map((col) => String(col.colId || col.field)));
    const extra = specColumns.filter((col) => !existingIds.has(col.id));
    if (!extra.length) return base;
    return mergeColumnDefsAtAnchor(base, buildColumnDefsFromSpec(extra), anchor, "append");
  }
  async function resolveColumnDefs(config, getPageState) {
    var _a, _b;
    const g = getGlobal();
    let columnDefs = [];
    if (config.columnsVar) {
      const parts = config.columnsVar.split(".");
      let obj = g;
      for (const part of parts) {
        obj = obj == null ? void 0 : obj[part];
      }
      if (Array.isArray(obj)) columnDefs = obj;
    }
    if (!columnDefs.length && ((_a = config.columns) == null ? void 0 : _a.length)) {
      columnDefs = buildColumnDefsFromSpec(config.columns);
    }
    const pageState = getPageState();
    const anchor = ((_b = config.columnSource) == null ? void 0 : _b.anchor) || "";
    if (config.columnSource) {
      const dynamicCols = await fetchColumnSourceColumns(config.columnSource, pageState);
      columnDefs = mergeColumnDefsAtAnchor(
        columnDefs,
        buildColumnDefsFromSpec(dynamicCols),
        anchor,
        config.columnSource.merge || "append"
      );
    } else {
      columnDefs = mergeSpecOnlyColumns(columnDefs, config.columns, anchor);
    }
    return columnDefs;
  }
  function bootFromSpecConfig(config) {
    var _a;
    const gv2 = getGlobal().GridView;
    if (!gv2 || !config.gridId) return;
    const gridId = config.gridId;
    const containerId = config.containerId || `cm-ag-grid-container-${gridId}`;
    const groupsOrder = config.groupsOrder || [];
    const presets = resolvePresets(gridId, void 0);
    const searches = resolveSearches(gridId, void 0);
    const startUp = async () => {
      var _a2, _b, _c, _d, _e;
      await ensureAgGridAssetsLoaded();
      const g = getGlobal();
      const agModule = gv2.AgGrid;
      const HostCtor = agModule == null ? void 0 : agModule.Host;
      if (!HostCtor) {
        console.error("[GridView.AgGrid] Host plugin unavailable after asset load");
        return;
      }
      const registry = gv2.byId;
      if (!registry) return;
      function getPageState() {
        if (config.filtersSelector) {
          const root = document.querySelector(config.filtersSelector);
          const bar = (root == null ? void 0 : root.querySelector("[data-cm-filter-bar]")) || root;
          if (bar && gv2.FilterBar) {
            return gv2.FilterBar.selectedFilterValues(bar);
          }
        }
        const url = new URL(window.location.href);
        const state = {};
        (config.urlPageStateKeys || []).forEach((key) => {
          const val = url.searchParams.get(key);
          if (val) state[key] = val;
        });
        return state;
      }
      const columnDefs = await resolveColumnDefs(config, getPageState);
      const optionsObj = {
        columnDefs,
        rowModelType: config.datasourceUrl ? "infinite" : "clientSide",
        ...config.rowSelection ? { rowSelection: config.rowSelection } : {},
        // fitColumns: fill the grid width and shrink columns to fit (no horizontal
        // scroll) as columns are added or the viewport resizes.
        ...config.fitColumns ? {
          autoSizeStrategy: { type: "fitGridWidth" },
          onGridSizeChanged: (p) => {
            var _a3, _b2;
            return (_b2 = (_a3 = p.api) == null ? void 0 : _a3.sizeColumnsToFit) == null ? void 0 : _b2.call(_a3);
          }
        } : {},
        cacheBlockSize: (_a2 = config.cacheBlockSize) != null ? _a2 : 100,
        maxBlocksInCache: 10,
        rowBuffer: 20,
        suppressPropertyNamesCheck: true,
        enableCellTextSelection: true,
        tooltipShowDelay: 500,
        tooltipInteraction: true,
        animateRows: false,
        pagination: false,
        // Keep the column-menu (filter) button always visible, matching the
        // SimpleTable default where the filter control is not hover-only.
        suppressMenuHide: true,
        defaultColDef: {
          sortable: true,
          filter: true,
          resizable: true,
          floatingFilter: false,
          // Always render the unsorted (⇅) indicator, matching SimpleTable's
          // always-visible sort glyph next to the filter control.
          unSortIcon: true,
          tooltipValueGetter: (p) => p.value
        },
        localeText: g.AG_GRID_LOCALE_UK || {},
        getRowId: (params) => {
          var _a3;
          const data = (_a3 = params.data) != null ? _a3 : {};
          const id = data.id;
          if (id != null && id !== "") return String(id);
          return `cm-row-${Object.values(data).map(String).join("|")}`;
        },
        components: {
          customTooltip: agModule == null ? void 0 : agModule.Tooltip,
          customSetFilter: agModule == null ? void 0 : agModule.SmartFilter,
          customExprFilter: agModule == null ? void 0 : agModule.ExprFilter
        },
        context: {
          gridId,
          storageScope: config.storageScope || gridId,
          syncUrlState: (_b = config.syncUrlState) != null ? _b : true,
          urlPageStateKeys: config.urlPageStateKeys || [],
          getPageState,
          dictionaryUrl: config.dictionaryUrl || ""
        }
      };
      if (config.datasourceUrl && typeof (agModule == null ? void 0 : agModule.createInfiniteDatasource) === "function") {
        const createDs = agModule.createInfiniteDatasource;
        optionsObj.datasource = createDs({
          url: config.datasourceUrl,
          gridId,
          getExtraParams: getPageState,
          onLastRow: (count) => {
            if (config.rowCountSelector) {
              const el = document.querySelector(config.rowCountSelector);
              if (el) el.textContent = String(count >= 0 ? count : 0);
            }
            if (config.xlsxExportSelector && typeof (agModule == null ? void 0 : agModule.syncExportHref) === "function") {
              const exportEl = document.querySelector(config.xlsxExportSelector);
              if (exportEl) {
                agModule.syncExportHref(exportEl, gridId, { getExtraParams: getPageState, exportColumns: true });
              }
            }
          }
        });
      }
      let host = registry.get(gridId);
      if (!host) {
        host = new HostCtor(gridId, containerId, optionsObj, presets, searches, groupsOrder);
      } else {
        host.gridOptions = optionsObj;
        host.savedColPresets = presets || {};
        host.savedQuickSearches = searches || [];
        if (host.gridApi) {
          try {
            (_d = (_c = host.gridApi).destroy) == null ? void 0 : _d.call(_c);
          } catch (error) {
            console.warn(
              "[GridView.AgGrid] Clean destruction of old grid failed. Proceeding with DOM swap. Error:",
              error
            );
          }
          host.gridApi = null;
        }
      }
      if (!host.gridApi) {
        if (typeof getGlobal().agGrid !== "undefined") {
          (_e = host.initGrid) == null ? void 0 : _e.call(host);
        } else {
          const poll = window.setInterval(() => {
            var _a3;
            if (typeof getGlobal().agGrid !== "undefined") {
              window.clearInterval(poll);
              (_a3 = host == null ? void 0 : host.initGrid) == null ? void 0 : _a3.call(host);
            }
          }, 50);
          window.setTimeout(() => window.clearInterval(poll), 15e3);
        }
      }
      if (!specFilterListeners.has(gridId)) {
        specFilterListeners.add(gridId);
        document.addEventListener("cm-filter-change", (e) => {
          void (async () => {
            var _a3, _b2, _c2, _d2, _e2;
            const detail = e.detail;
            const bar = detail == null ? void 0 : detail.bar;
            if (!bar) return;
            if (config.filtersSelector && !bar.closest(config.filtersSelector)) return;
            const filterBar = bar.closest("[data-cm-filter-bar]");
            const navigates = ((_a3 = filterBar == null ? void 0 : filterBar.dataset) == null ? void 0 : _a3.navigateOnChange) !== "0";
            if (((_b2 = filterBar == null ? void 0 : filterBar.dataset) == null ? void 0 : _b2.autoApply) === "1" && navigates) return;
            const current = registry.get(gridId);
            if (!current) return;
            if (config.columnSource && current.gridApi) {
              try {
                const nextDefs = await resolveColumnDefs(config, getPageState);
                (_d2 = (_c2 = current.gridApi).setGridOption) == null ? void 0 : _d2.call(_c2, "columnDefs", nextDefs);
              } catch (error) {
                console.error("[GridView.AgGrid] column_source refresh failed:", error);
              }
            }
            (_e2 = current.reloadData) == null ? void 0 : _e2.call(current);
          })();
        });
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startUp);
    } else {
      startUp();
    }
    (_a = gv2.byId) == null ? void 0 : _a.registerBoot(gridId, startUp);
  }
  function queryRoot(root) {
    if (root && typeof root === "object" && "querySelectorAll" in root) {
      return root;
    }
    return document;
  }
  function bootAgGridSpecFromDocument(root = document) {
    const scope = queryRoot(root);
    scope.querySelectorAll("script.cm-ag-grid-spec-config").forEach((node) => {
      const el = node;
      if (el.dataset.cmAgBooted) return;
      el.dataset.cmAgBooted = "1";
      try {
        const config = JSON.parse(node.textContent || "{}");
        if (config.gridId) bootFromSpecConfig(config);
      } catch (error) {
        console.error("[GridView.AgGrid] Invalid spec config JSON:", error);
      }
    });
  }

  // src/runtime/boot.ts
  var LAZY_SEL = ".cm-lazy-placeholder[data-endpoint]";
  async function fetchAndReplace(placeholder, gv2) {
    var _a;
    if (placeholder.dataset.cmLazyLoading) return;
    placeholder.dataset.cmLazyLoading = "1";
    const endpoint = placeholder.dataset.endpoint;
    const method = ((_a = placeholder.dataset.method) != null ? _a : "get").toLowerCase();
    const timeoutMs = placeholder.dataset.timeout ? parseInt(placeholder.dataset.timeout, 10) : 3e4;
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
      const url = new URL(endpoint, window.location.href);
      const pageParams = new URLSearchParams(window.location.search);
      pageParams.forEach((value, key) => {
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      });
      const resp = await fetch(url.toString(), {
        method,
        signal: ctrl.signal,
        credentials: "same-origin"
      });
      window.clearTimeout(timer);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      placeholder.replaceWith(wrapper);
      bootScope(wrapper, gv2);
      wrapper.replaceWith(...Array.from(wrapper.childNodes));
    } catch (e) {
      placeholder.classList.add("cm-lazy-error");
      delete placeholder.dataset.cmLazyLoading;
      delete placeholder.dataset.cmLazyInit;
    }
  }
  function initLazyBlocks(scope, gv2) {
    scope.querySelectorAll(LAZY_SEL).forEach((el) => {
      var _a;
      if (el.dataset.cmLazyInit) return;
      el.dataset.cmLazyInit = "1";
      const trigger = (_a = el.dataset.trigger) != null ? _a : "visible";
      if (trigger === "load") {
        void fetchAndReplace(el, gv2);
      } else if (trigger === "visible") {
        const obs = new IntersectionObserver((entries, o) => {
          var _a2;
          if ((_a2 = entries[0]) == null ? void 0 : _a2.isIntersecting) {
            o.disconnect();
            void fetchAndReplace(el, gv2);
          }
        });
        obs.observe(el);
      }
    });
  }
  var CHART_BOOT_INTERVAL_MS = 50;
  var MAX_CHART_BOOT_ATTEMPTS = 200;
  function scopeElement(scope) {
    if (scope && "querySelectorAll" in scope) return scope;
    return document;
  }
  function hasWidgetMarkers(root) {
    return !!(root.querySelector("[data-cm-table]") || root.querySelector("[data-cm-filter-bar]") || root.querySelector("[data-cm-chart-config]") || root.querySelector("[data-cm-kpi-root]") || root.querySelector("[data-cm-tab-group]") || root.querySelector('[data-cm-action="show_content"]') || root.querySelector("[data-cm-content-dismissible]") || root.querySelector("[data-cm-grid-view-spec]") || root.querySelector("[data-cm-grid-artifact-boot]") || root.querySelector("script.cm-ag-grid-spec-config") || root.querySelector(LAZY_SEL));
  }
  function bootAgGridInScope(root, gridView2) {
    var _a;
    if (!root.querySelector("script.cm-ag-grid-spec-config")) return;
    const ensure = (_a = gridView2.assets) == null ? void 0 : _a.ensureAgGrid;
    if (ensure) {
      void ensure().then(() => bootAgGridSpecFromDocument(root));
      return;
    }
    bootAgGridSpecFromDocument(root);
  }
  function bootChartsWhenReady(scope, gv2) {
    if (!scope.querySelector("[data-cm-chart-config]")) return;
    let attempts = 0;
    const tryInit = () => {
      var _a, _b;
      const g = window;
      const chartsReady = typeof g.echarts !== "undefined" && !!((_a = g.GridView) == null ? void 0 : _a._chartsApiReady) || !scope.querySelector("[data-cm-chart-config]");
      if (gv2 && chartsReady) {
        gv2.initAllCharts(scope);
        return;
      }
      if (attempts === 0 && ((_b = gv2.assets) == null ? void 0 : _b.ensureCharts)) {
        void gv2.assets.ensureCharts().then(() => {
          attempts += 1;
          tryInit();
        });
        return;
      }
      attempts += 1;
      if (attempts >= MAX_CHART_BOOT_ATTEMPTS) return;
      window.setTimeout(tryInit, CHART_BOOT_INTERVAL_MS);
    };
    tryInit();
  }
  function bootSingleArtifactRoot(root, gv2) {
    if (root.dataset.cmGridViewSpecBooted) return;
    root.dataset.cmGridViewSpecBooted = "1";
    let attempts = 0;
    const tryInit = () => {
      const g = window;
      if (gv2 && (typeof g.echarts !== "undefined" || !root.querySelector("[data-cm-chart-config]"))) {
        gv2.init({ root });
        return;
      }
      attempts += 1;
      if (attempts >= MAX_CHART_BOOT_ATTEMPTS) return;
      window.setTimeout(tryInit, CHART_BOOT_INTERVAL_MS);
    };
    tryInit();
  }
  function bootArtifactRoots(scope, gv2) {
    scope.querySelectorAll("[data-cm-grid-artifact-boot]").forEach((root) => {
      bootSingleArtifactRoot(root, gv2);
    });
  }
  function bootSpecRoots(scope, gv2) {
    scope.querySelectorAll("[data-cm-grid-view-spec]").forEach((specRoot) => {
      const el = specRoot;
      if (el.dataset.cmGridViewSpecBooted) return;
      el.dataset.cmGridViewSpecBooted = "1";
      bootScope(el, gv2);
    });
  }
  function syncAgGridStyles() {
    if (!document.querySelector("script.cm-ag-grid-spec-config")) {
      unloadAgGridStyles();
    }
  }
  function bootScope(scope, gv2) {
    syncAgGridStyles();
    const gridView2 = gv2 != null ? gv2 : window.GridView;
    if (!gridView2) return;
    const root = scopeElement(scope);
    if (!("querySelector" in root)) return;
    if (!hasWidgetMarkers(root)) return;
    const safe = (name, fn) => {
      try {
        fn();
      } catch (err) {
        console.error("[GridView] boot step failed: " + name, err);
      }
    };
    safe("initLazyBlocks", () => initLazyBlocks(root, gridView2));
    safe("initAllSimpleTables", () => initAllSimpleTables(root));
    safe("initTableEdit", () => initTableEdit(root));
    safe("initFilterBars", () => initFilterBars(root));
    safe("initButtonEllipsisTips", () => initButtonEllipsisTips(root));
    safe("initTabGroups", () => initTabGroups(root));
    safe("initContentActions", () => initContentActions(root));
    safe("initGalleryBlocks", () => initGalleryBlocks(root));
    safe("initImageRenderers", () => initImageRenderers(root));
    safe("initAllKpi", () => gridView2.initAllKpi(root));
    safe("bootChartsWhenReady", () => bootChartsWhenReady(root, gridView2));
    safe("bootArtifactRoots", () => bootArtifactRoots(root, gridView2));
    safe("bootSpecRoots", () => bootSpecRoots(root, gridView2));
    safe("bootAgGridInScope", () => bootAgGridInScope(root, gridView2));
  }
  function boot(root, gv2) {
    const gridView2 = gv2 != null ? gv2 : window.GridView;
    if (!gridView2 || !root) {
      bootScope(document, gv2);
      return;
    }
    if (root === document || root instanceof Document) {
      bootScope(root, gridView2);
      return;
    }
    const el = root;
    if (el.matches("[data-cm-grid-artifact-boot]")) {
      const host = el;
      delete host.dataset.cmGridViewSpecBooted;
      bootSingleArtifactRoot(host, gridView2);
      return;
    }
    if (el.matches("[data-cm-grid-view-spec]")) {
      const host = el;
      delete host.dataset.cmGridViewSpecBooted;
      bootScope(host, gridView2);
      return;
    }
    bootScope(el, gridView2);
  }
  var _htmxBound = false;
  function installRuntimeBoot(gv2) {
    initBuiltinRenderers();
    if (_htmxBound || typeof document.body === "undefined") return;
    _htmxBound = true;
    document.body.addEventListener("htmx:afterSwap", (event) => {
      var _a;
      const detail = event.detail;
      const target = detail == null ? void 0 : detail.target;
      if (!target) return;
      if ((_a = target.matches) == null ? void 0 : _a.call(target, "[data-cm-grid-artifact-boot]")) {
        boot(target, gv2);
        return;
      }
      bootScope(target, gv2);
    });
    document.body.addEventListener("htmx:oobAfterSwap", (event) => {
      var _a, _b;
      const oobTarget = (_a = event.target) != null ? _a : null;
      const scope = (_b = oobTarget == null ? void 0 : oobTarget.parentElement) != null ? _b : oobTarget;
      if (scope) bootScope(scope, gv2);
    });
  }

  // src/grid-view/create-grid-view.ts
  function mergePluginExports(base, prior) {
    if (!prior) return base;
    return { ...base, ...prior };
  }
  function createGridView() {
    var _a;
    const g = getGlobal();
    const inheritedPreferencesUrl = ((_a = g.GridView) == null ? void 0 : _a.preferencesUrl) || "";
    return {
      preferencesUrl: inheritedPreferencesUrl,
      init,
      boot,
      byId,
      SimpleTable: { initAll: initAllSimpleTables },
      initSimpleTableColumnSettings,
      Charts: ChartsBridge,
      Kpi,
      GridAdapter,
      i18n,
      initChart: (root, config, rows) => root ? ChartsBridge.initChart(root, config, rows) : void 0,
      refreshChartWrap: ChartsBridge.refreshChartWrap,
      initAllCharts: ChartsBridge.initAllCharts,
      initAllKpi: Kpi.initAllKpi,
      buildEchartsOption: ChartsBridge.buildEchartsOption,
      staticRowsAdapter,
      createAgGridAdapter,
      resolveKpis,
      bindGridKpis,
      bindGridFilteredCharts,
      FilterBar,
      initToolbarSearch,
      ToolbarSearch,
      AgGrid,
      bootScope,
      parseSmartQuery,
      matchColumnFilter,
      matchToolbarQuery,
      matchAgGridQuickFilter,
      buildFilterUrl,
      initButtonEllipsisTips,
      initTableEdit,
      registerRenderer,
      registerCommit,
      registerAction,
      invokeCommit,
      invokeAction
    };
  }
  function bootstrapGridView() {
    var _a, _b;
    const g = getGlobal();
    const prior = (_a = g.GridView) != null ? _a : {};
    const GridView = createGridView();
    GridView.AgGrid = mergePluginExports(
      GridView.AgGrid,
      prior.AgGrid
    );
    GridView.Charts = mergePluginExports(
      GridView.Charts,
      prior.Charts
    );
    if (prior.assets && typeof prior.assets === "object") {
      GridView.assets = { ...prior.assets, ...(_b = GridView.assets) != null ? _b : {} };
    }
    for (const key of [
      "ColumnSettings",
      "createColumnSettings",
      "createDomTableColumnAdapter",
      "createAgGridColumnAdapter"
    ]) {
      const fn = prior[key];
      if (fn != null && GridView[key] == null) {
        GridView[key] = fn;
      }
    }
    const priorInit = prior.initSimpleTableColumnSettings;
    if (typeof priorInit === "function" && priorInit !== GridView.initSimpleTableColumnSettings) {
      GridView.initSimpleTableColumnSettings = priorInit;
    }
    if (g.GridViewI18n) {
      i18n.initI18n(g.GridViewI18n);
    }
    attachSimpleTableGlobals();
    bindDelegatedGridActions();
    getGlobal().GridView = GridView;
    return GridView;
  }

  // src/column-settings/ag-grid-adapter.ts
  function createAgGridColumnAdapter(gridApi, columnMeta) {
    const meta = columnMeta || {};
    return {
      hasGroupedHeaders() {
        return false;
      },
      getDescriptors() {
        if (!gridApi || !gridApi.getColumns) return [];
        return gridApi.getColumns().map((col) => {
          const colDef = col.getColDef();
          const colId = colDef.field || col.getColId();
          const saved = meta[colId] || {};
          return {
            colId,
            label: colDef.headerName || colId,
            defaultHide: colDef.hide === true,
            menuGroup: saved.menuGroup || colDef.menuGroup || colDef.contextGroup || "",
            exportable: colDef.suppressExport !== true,
            _col: col
          };
        });
      },
      isVisible(colId) {
        const col = gridApi.getColumn(colId);
        return col ? col.isVisible() : false;
      },
      setVisible(colId, visible) {
        gridApi.setColumnsVisible([colId], visible);
      },
      getPinned(colId) {
        const col = gridApi.getColumn(colId);
        return col ? col.getPinned() : null;
      },
      setPinned(colId, pinned) {
        gridApi.applyColumnState({ state: [{ colId, pinned, hide: false }] });
      },
      getColumnState() {
        return gridApi.getColumnState();
      },
      applyColumnState(state, applyOrder) {
        gridApi.applyColumnState({ state, applyOrder: !!applyOrder });
      },
      resetColumnState() {
        gridApi.resetColumnState();
      },
      getDisplayedColumnIds() {
        if (!gridApi.getAllDisplayedColumns) return [];
        return gridApi.getAllDisplayedColumns().map((col) => col.getColId());
      },
      getColumnsForUi() {
        if (!gridApi.getColumns) return [];
        return gridApi.getColumns();
      },
      uiItemFromDescriptor(desc) {
        return { col: desc._col, label: desc.label, colId: desc.colId };
      }
    };
  }

  // src/column-settings/dom-table-adapter.ts
  function createDomTableColumnAdapter(tableEl, columnsMeta) {
    const groupedMode = tableEl.hasAttribute("data-cm-grouped-headers");
    const metaById = {};
    const leafMetaByKey = {};
    (columnsMeta || []).forEach((meta) => {
      metaById[meta.colId] = meta;
      if (meta.isGroup && meta.columnKeys) {
        meta.columnKeys.forEach((key) => {
          const leaf = meta.leafMeta && meta.leafMeta[key] || {};
          leafMetaByKey[key] = {
            exportable: leaf.exportable !== false,
            hide: !!leaf.hide,
            groupId: meta.colId
          };
        });
      } else if (!meta.isGroup) {
        leafMetaByKey[meta.colId] = {
          exportable: meta.exportable !== false,
          hide: !!meta.hide,
          groupId: null
        };
      }
    });
    function leafHeaderRow() {
      const rows = tableEl.querySelectorAll("thead tr");
      return rows.length ? rows[rows.length - 1] : null;
    }
    function headerRow1() {
      const rows = tableEl.querySelectorAll("thead tr");
      return rows.length ? rows[0] : null;
    }
    function cellsForKey(colId) {
      return tableEl.querySelectorAll('[data-cm-col-key="' + colId + '"]');
    }
    function findGroupIdForLeafKey(key) {
      const leaf = leafMetaByKey[key];
      return leaf && leaf.groupId ? leaf.groupId : null;
    }
    function expandKeys(unitId) {
      const meta = metaById[unitId];
      if (meta && meta.isGroup && meta.columnKeys) return meta.columnKeys.slice();
      return [unitId];
    }
    function isLeafHidden(colId) {
      const leaf = tableEl.querySelector('thead tr:last-child [data-cm-col-key="' + colId + '"]') || tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      return !leaf || leaf.classList.contains("cm-col-hidden");
    }
    function isUnitVisible(unitId) {
      return expandKeys(unitId).some((key) => !isLeafHidden(key));
    }
    function readPin(colId) {
      const cell = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      if (!cell) return null;
      if (cell.classList.contains("cm-col-pin-left")) return "left";
      if (cell.classList.contains("cm-col-pin-right")) return "right";
      return null;
    }
    function applyPin(colId, pinned) {
      cellsForKey(colId).forEach((el) => {
        el.classList.remove("cm-col-pin-left", "cm-col-pin-right");
        if (pinned === "left") el.classList.add("cm-col-pin-left");
        if (pinned === "right") el.classList.add("cm-col-pin-right");
      });
    }
    function syncGroupHeaders() {
      if (!groupedMode) return;
      const row1 = headerRow1();
      if (!row1) return;
      row1.querySelectorAll("[data-cm-col-group-id]").forEach((groupTh) => {
        const unitId = groupTh.getAttribute("data-cm-col-group-id");
        if (!unitId) return;
        const keys = expandKeys(unitId);
        const visibleCount = keys.filter((k) => !isLeafHidden(k)).length;
        if (visibleCount === 0) {
          groupTh.classList.add("cm-col-hidden");
          if (groupTh instanceof HTMLTableCellElement) {
            groupTh.colSpan = 1;
          }
        } else {
          groupTh.classList.remove("cm-col-hidden");
          if (groupTh instanceof HTMLTableCellElement) {
            groupTh.colSpan = visibleCount;
          }
        }
      });
      row1.querySelectorAll("[data-cm-col-key]").forEach((th) => {
        const key = th.getAttribute("data-cm-col-key");
        if (!key) return;
        th.classList.toggle("cm-col-hidden", isLeafHidden(key));
      });
    }
    function setUnitVisible(unitId, visible) {
      expandKeys(unitId).forEach((key) => {
        cellsForKey(key).forEach((el) => {
          el.classList.toggle("cm-col-hidden", !visible);
        });
      });
      if (groupedMode) {
        const meta = metaById[unitId];
        if (meta && meta.isGroup) {
          const groupTh = tableEl.querySelector('[data-cm-col-group-id="' + unitId + '"]');
          if (groupTh) groupTh.classList.toggle("cm-col-hidden", !visible);
        }
        syncGroupHeaders();
      }
      rebalanceTableLayout();
    }
    function readUnitOrderFromDom() {
      if (!groupedMode) {
        const row = leafHeaderRow();
        if (!row) return (columnsMeta || []).map((m) => m.colId);
        return Array.from(row.querySelectorAll("[data-cm-col-key]")).map((th) => th.getAttribute("data-cm-col-key")).filter((key) => key !== null);
      }
      const row2 = leafHeaderRow();
      if (!row2) return (columnsMeta || []).map((m) => m.colId);
      const order = [];
      const ths = Array.from(row2.querySelectorAll("[data-cm-col-key]"));
      for (let i = 0; i < ths.length; i++) {
        const key = ths[i].getAttribute("data-cm-col-key");
        const groupId = key ? findGroupIdForLeafKey(key) : null;
        if (groupId) {
          if (order.indexOf(groupId) === -1) order.push(groupId);
          i += expandKeys(groupId).length - 1;
        } else if (key && order.indexOf(key) === -1) {
          order.push(key);
        }
      }
      return order;
    }
    function readWidth(colId) {
      const col = tableEl.querySelector('colgroup col[data-cm-col-key="' + colId + '"]');
      if (col instanceof HTMLElement && col.style && col.style.width) return col.style.width;
      const th = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      if (th instanceof HTMLElement) {
        if (th.dataset && th.dataset.cmColWidth) return th.dataset.cmColWidth + "px";
        if (th.style && th.style.width) return th.style.width;
      }
      return null;
    }
    function rebalanceTableLayout() {
      if (window.GridViewColumnLayout && tableEl instanceof HTMLTableElement) {
        window.GridViewColumnLayout.rebalance(tableEl);
      }
    }
    function applyWidth(colId, width) {
      if (!width) return;
      if (isLeafHidden(colId)) return;
      const px = typeof width === "number" ? width + "px" : String(width);
      tableEl.classList.add("cm-table--has-col-widths");
      const col = tableEl.querySelector('colgroup col[data-cm-col-key="' + colId + '"]');
      if (col instanceof HTMLElement) {
        col.style.width = px;
        col.style.minWidth = "";
        delete col.dataset.cmColZero;
      }
      const th = tableEl.querySelector('thead [data-cm-col-key="' + colId + '"]');
      if (th instanceof HTMLElement) {
        th.style.width = px;
        th.style.minWidth = "";
        const num2 = parseFloat(String(px).replace(/px$/i, ""));
        if (!isNaN(num2)) th.dataset.cmColWidth = String(num2);
      }
      rebalanceTableLayout();
    }
    function clearWidths() {
      tableEl.classList.remove("cm-table--has-col-widths");
      if (tableEl instanceof HTMLElement) {
        tableEl.style.width = "";
      }
      tableEl.querySelectorAll("colgroup col[data-cm-col-key]").forEach((col) => {
        if (col instanceof HTMLElement) {
          col.style.width = "";
          col.style.minWidth = "";
        }
      });
      tableEl.querySelectorAll("thead th[data-cm-col-key]").forEach((th) => {
        if (th instanceof HTMLElement) {
          th.style.width = "";
          th.style.minWidth = "";
          delete th.dataset.cmColWidth;
        }
      });
    }
    function syncColgroupOrder(state) {
      const cg = tableEl.querySelector("colgroup[data-cm-colgroup]");
      if (!cg) return;
      if (!groupedMode) {
        state.forEach((item) => {
          if (!item || !item.colId) return;
          const col = cg.querySelector('[data-cm-col-key="' + item.colId + '"]');
          if (col) cg.appendChild(col);
        });
        return;
      }
      state.forEach((item) => {
        if (!item || !item.colId) return;
        expandKeys(item.colId).forEach((key) => {
          const col = cg.querySelector('[data-cm-col-key="' + key + '"]');
          if (col) cg.appendChild(col);
        });
      });
    }
    function reorderUnits(state) {
      if (!groupedMode) {
        const row = leafHeaderRow();
        if (!row) return;
        const byId2 = {};
        Array.from(row.querySelectorAll("[data-cm-col-key]")).forEach((th) => {
          const id = th.getAttribute("data-cm-col-key");
          if (id) byId2[id] = th;
        });
        state.forEach((item) => {
          if (item && item.colId && byId2[item.colId]) row.appendChild(byId2[item.colId]);
        });
        tableEl.querySelectorAll("tbody tr.cm-row").forEach((tr) => {
          const tds = {};
          tr.querySelectorAll("[data-cm-col-key]").forEach((td) => {
            const id = td.getAttribute("data-cm-col-key");
            if (id) tds[id] = td;
          });
          state.forEach((item) => {
            if (item && item.colId && tds[item.colId]) tr.appendChild(tds[item.colId]);
          });
        });
        syncColgroupOrder(state);
        return;
      }
      const row1 = headerRow1();
      const row2 = leafHeaderRow();
      if (!row1 || !row2) return;
      const row1El = row1;
      const row2El = row2;
      function appendUnit(unitId) {
        const meta = metaById[unitId];
        if (meta && meta.isGroup && meta.columnKeys) {
          const groupTh = row1El.querySelector('[data-cm-col-group-id="' + unitId + '"]');
          if (groupTh) row1El.appendChild(groupTh);
          meta.columnKeys.forEach((key) => {
            const th = row2El.querySelector('[data-cm-col-key="' + key + '"]');
            if (th) row2El.appendChild(th);
          });
          return;
        }
        const th1 = row1El.querySelector('[data-cm-col-key="' + unitId + '"]');
        if (th1) row1El.appendChild(th1);
        const th2 = row2El.querySelector('[data-cm-col-key="' + unitId + '"]');
        if (th2) row2El.appendChild(th2);
      }
      state.forEach((item) => {
        if (item && item.colId) appendUnit(item.colId);
      });
      tableEl.querySelectorAll("tbody tr.cm-row").forEach((tr) => {
        state.forEach((item) => {
          if (!item || !item.colId) return;
          expandKeys(item.colId).forEach((key) => {
            const td = tr.querySelector('[data-cm-col-key="' + key + '"]');
            if (td) tr.appendChild(td);
          });
        });
      });
      syncColgroupOrder(state);
    }
    const adapter = {
      hasGroupedHeaders() {
        return groupedMode;
      },
      getDescriptors() {
        return (columnsMeta || []).map((meta) => ({
          colId: meta.colId,
          label: meta.label || meta.colId,
          defaultHide: !!meta.hide,
          menuGroup: meta.menuGroup || "",
          exportable: meta.exportable !== false,
          isGroup: !!meta.isGroup,
          columnKeys: meta.columnKeys || null
        }));
      },
      getLeafLabel(leafKey) {
        const th = tableEl.querySelector(
          'thead [data-cm-col-key="' + leafKey + '"] .cm-th-label'
        );
        if (th && th.textContent) return th.textContent.trim();
        const leaf = leafMetaByKey[leafKey];
        if (leaf && leaf.label) return leaf.label;
        return leafKey;
      },
      isVisible(colId) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) {
          return isUnitVisible(colId);
        }
        return !isLeafHidden(colId);
      },
      setVisible(colId, visible) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) {
          setUnitVisible(colId, visible);
          return;
        }
        setUnitVisible(colId, visible);
        if (!groupedMode) syncGroupHeaders();
      },
      getPinned(colId) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) return null;
        return readPin(colId);
      },
      setPinned(colId, pinned) {
        if (groupedMode && metaById[colId] && metaById[colId].isGroup) return;
        applyPin(colId, pinned);
      },
      getColumnState() {
        return readUnitOrderFromDom().map((unitId) => {
          const meta = metaById[unitId];
          const width = meta && meta.isGroup ? null : readWidth(unitId);
          return {
            colId: unitId,
            hide: !isUnitVisible(unitId),
            pinned: groupedMode ? null : readPin(unitId),
            width: width || null
          };
        });
      },
      applyColumnState(state, applyOrder) {
        if (!Array.isArray(state)) return;
        state.forEach((item) => {
          if (!item || !item.colId) return;
          setUnitVisible(item.colId, !item.hide);
          if (!groupedMode) applyPin(item.colId, item.pinned || null);
          if (item.width && !(metaById[item.colId] && metaById[item.colId].isGroup)) {
            applyWidth(item.colId, item.width);
          }
        });
        if (applyOrder) reorderUnits(state);
        syncGroupHeaders();
        rebalanceTableLayout();
      },
      resetColumnState() {
        clearWidths();
        const defaultState = (columnsMeta || []).map((meta) => ({
          colId: meta.colId,
          hide: !!meta.hide,
          pinned: null,
          width: null
        }));
        adapter.applyColumnState(defaultState, true);
      },
      clearWidths,
      getDisplayedColumnIds() {
        const out = [];
        readUnitOrderFromDom().forEach((unitId) => {
          if (!isUnitVisible(unitId)) return;
          expandKeys(unitId).forEach((key) => {
            const leaf = leafMetaByKey[key];
            if (leaf && leaf.exportable === false) return;
            out.push(key);
          });
        });
        return out;
      },
      syncGroupHeaders
    };
    return adapter;
  }

  // src/column-settings/helpers.ts
  function colT(key, fallback) {
    const catalog2 = window.GridViewI18n;
    if (catalog2 && catalog2[key]) {
      const val = catalog2[key];
      if (val && val !== key) return val;
    }
    return fallback;
  }
  function portColSelectorPanel(panel) {
    if (panel.dataset.cmColSelectorPortaled === "1") return panel;
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
    panel.dataset.cmColSelectorPortaled = "1";
    return panel;
  }
  function getColSelectorPanel(gridId) {
    const panel = document.getElementById("col-selector-panel-" + gridId);
    return panel ? portColSelectorPanel(panel) : null;
  }
  function colPanelIsHidden(panel) {
    return panel.classList.contains("is-hidden") || panel.classList.contains("hidden");
  }
  function setColPanelHidden(panel, hidden) {
    panel.classList.toggle("is-hidden", hidden);
    panel.classList.toggle("hidden", hidden);
  }
  function getCookie(name) {
    if (!document.cookie) return null;
    const parts = document.cookie.split(";");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part.indexOf(name + "=") === 0) {
        return decodeURIComponent(part.substring(name.length + 1));
      }
    }
    return null;
  }

  // src/column-settings/host.ts
  var ColumnSettingsHost = class {
    constructor(gridId, adapter, options) {
      const opts = options || {};
      this.gridId = gridId;
      this.adapter = adapter;
      this.groupsOrder = opts.groupsOrder || [];
      this.savedColPresets = opts.initialPresets || {};
      this.preferencesUrl = opts.preferencesUrl || "";
      this.storageScope = opts.storageScope || "";
      this.onStateChange = opts.onStateChange || null;
      this.colOrderSortable = null;
      this._bindModalDismiss();
      this._applyInitialState(opts.initialState);
      this.renderSavedPresets();
      this.syncExportLinks();
    }
    _storageKey() {
      if (this.storageScope) return "cmColState_" + this.gridId + "__" + this.storageScope;
      return "cmColState_" + this.gridId;
    }
    _bindModalDismiss() {
      if (window._cmColSettingsEscBound) return;
      window._cmColSettingsEscBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        document.querySelectorAll('[id^="col-selector-panel-"]').forEach((panel) => {
          if (panel instanceof HTMLElement && !colPanelIsHidden(panel)) {
            setColPanelHidden(panel, true);
          }
        });
      });
      document.addEventListener("click", (e) => {
        const target = e.target;
        document.querySelectorAll('[id^="col-selector-panel-"]').forEach((panel) => {
          if (!(panel instanceof HTMLElement) || colPanelIsHidden(panel)) return;
          if (target === panel || target instanceof Element && target.classList.contains("cm-col-selector-backdrop")) {
            setColPanelHidden(panel, true);
          }
        });
      });
    }
    _applyInitialState(initialState) {
      let state = initialState;
      if (!state) {
        try {
          const raw = localStorage.getItem(this._storageKey());
          if (raw) state = JSON.parse(raw);
        } catch (e) {
        }
      }
      if (state && Array.isArray(state)) {
        if (typeof this.adapter.clearWidths === "function") {
          this.adapter.clearWidths();
        }
        const layoutState = state.map((item) => {
          if (!item || !item.colId) return item;
          return {
            colId: item.colId,
            hide: !!item.hide,
            pinned: item.pinned || null,
            width: null
          };
        });
        this.adapter.applyColumnState(layoutState, true);
      } else {
        this.adapter.resetColumnState();
      }
    }
    getColumnState() {
      return this.adapter.getColumnState();
    }
    saveState() {
      const state = this.getColumnState();
      try {
        localStorage.setItem(this._storageKey(), JSON.stringify(state));
      } catch (e) {
      }
      this.syncExportLinks();
      if (typeof this.onStateChange === "function") this.onStateChange(state);
    }
    toggleColSelector() {
      const panel = getColSelectorPanel(this.gridId);
      if (!panel) return;
      const isHidden = colPanelIsHidden(panel);
      setColPanelHidden(panel, !isHidden);
      if (isHidden) this.buildColCheckboxes();
    }
    resetColumnsToDefault() {
      this.adapter.resetColumnState();
      this.buildColCheckboxes();
      this.saveState();
    }
    buildColCheckboxes() {
      const container = document.getElementById("col-checkboxes-" + this.gridId);
      if (!container) return;
      container.innerHTML = "";
      const descriptors = this.adapter.getDescriptors();
      const groups = {};
      const mainLabel = colT("column_settings.main_group", "Main");
      descriptors.forEach((desc) => {
        const groupName = desc.isGroup ? desc.label : desc.menuGroup || mainLabel;
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(desc);
      });
      Object.keys(groups).forEach((g) => {
        groups[g].sort((a, b) => String(a.label).localeCompare(String(b.label)));
      });
      const sectionNames = [];
      if (groups[mainLabel] && groups[mainLabel].length) sectionNames.push(mainLabel);
      this.groupsOrder.forEach((g) => {
        if (groups[g] && groups[g].length && sectionNames.indexOf(g) === -1) sectionNames.push(g);
      });
      Object.keys(groups).forEach((g) => {
        if (sectionNames.indexOf(g) === -1 && groups[g].length) sectionNames.push(g);
      });
      const appendLeafChip = (itemsCont, leafKey, groupDesc) => {
        const visible = this.adapter.isVisible(leafKey);
        const chip = document.createElement("div");
        chip.className = "cm-col-settings-chip " + (visible ? "is-on" : "is-off");
        const textWrap = document.createElement("div");
        textWrap.className = "cm-col-settings-chip-label";
        textWrap.textContent = typeof this.adapter.getLeafLabel === "function" ? this.adapter.getLeafLabel(leafKey) : leafKey;
        textWrap.onclick = (e) => {
          e.stopPropagation();
          this.adapter.setVisible(leafKey, !visible);
          this.buildColCheckboxes();
          this.saveState();
        };
        chip.appendChild(textWrap);
        if (!groupDesc || !groupDesc.isGroup) {
          const pins = document.createElement("div");
          const pinnedState = this.adapter.getPinned(leafKey);
          pins.className = "cm-col-settings-chip-pins" + (visible ? "" : " is-dimmed");
          ["left", "right"].forEach((dir) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = dir === "left" ? "L" : "R";
            btn.className = "cm-col-settings-pin-btn";
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const next = pinnedState === dir ? null : dir;
              this.adapter.setPinned(leafKey, next);
              this.buildColCheckboxes();
              this.saveState();
            };
            pins.appendChild(btn);
          });
          chip.appendChild(pins);
        }
        itemsCont.appendChild(chip);
      };
      sectionNames.forEach((groupName) => {
        const groupCols = groups[groupName];
        if (!groupCols.length) return;
        const groupColDiv = document.createElement("div");
        groupColDiv.className = "cm-col-settings-group";
        const groupHeader = document.createElement("div");
        groupHeader.className = "cm-col-settings-group-header";
        const titleSpan = document.createElement("div");
        titleSpan.className = "cm-col-settings-group-title";
        titleSpan.textContent = groupName;
        const rightControls = document.createElement("div");
        rightControls.className = "cm-col-settings-group-actions";
        const lbl = document.createElement("span");
        lbl.textContent = colT("column_settings.select", "Select:") + " ";
        rightControls.appendChild(lbl);
        ["All", "None", "Standard"].forEach((kind) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cm-col-settings-action-link";
          btn.textContent = colT("column_settings." + kind.toLowerCase(), kind);
          btn.onclick = (e) => {
            e.preventDefault();
            groupCols.forEach((desc) => {
              if (desc.isGroup && desc.columnKeys) {
                desc.columnKeys.forEach((leafKey) => {
                  if (kind === "All") this.adapter.setVisible(leafKey, true);
                  else if (kind === "None") this.adapter.setVisible(leafKey, false);
                  else {
                    const leafDesc = descriptors.find((d) => !d.isGroup && d.colId === leafKey);
                    this.adapter.setVisible(leafKey, !(leafDesc && leafDesc.defaultHide));
                  }
                });
                return;
              }
              if (kind === "All") this.adapter.setVisible(desc.colId, true);
              else if (kind === "None") this.adapter.setVisible(desc.colId, false);
              else this.adapter.setVisible(desc.colId, !desc.defaultHide);
            });
            this.buildColCheckboxes();
            this.saveState();
          };
          rightControls.appendChild(btn);
        });
        groupHeader.appendChild(titleSpan);
        groupHeader.appendChild(rightControls);
        groupColDiv.appendChild(groupHeader);
        const itemsCont = document.createElement("div");
        itemsCont.className = "cm-col-settings-items";
        groupCols.forEach((desc) => {
          if (desc.isGroup && desc.columnKeys && desc.columnKeys.length) {
            desc.columnKeys.forEach((leafKey) => {
              appendLeafChip(itemsCont, leafKey, desc);
            });
            return;
          }
          appendLeafChip(itemsCont, desc.colId, desc);
        });
        groupColDiv.appendChild(itemsCont);
        container.appendChild(groupColDiv);
      });
      this.buildColOrderList();
    }
    buildColOrderList() {
      const listContainer = document.getElementById("col-order-list-" + this.gridId);
      if (!listContainer) return;
      listContainer.innerHTML = "";
      const descriptors = this.adapter.getDescriptors();
      const visible = this.getColumnState().filter((item) => !item.hide);
      const mainItems = [];
      const groupItems = [];
      visible.forEach((item) => {
        const desc = descriptors.find((d) => d.colId === item.colId);
        if (desc && desc.isGroup) groupItems.push(item);
        else mainItems.push(item);
      });
      groupItems.sort((a, b) => {
        const descA = descriptors.find((d) => d.colId === a.colId);
        const descB = descriptors.find((d) => d.colId === b.colId);
        let idxA = descA ? this.groupsOrder.indexOf(descA.label) : -1;
        let idxB = descB ? this.groupsOrder.indexOf(descB.label) : -1;
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
      });
      mainItems.concat(groupItems).forEach((item) => {
        const desc = descriptors.find((d) => d.colId === item.colId);
        const label = desc ? desc.label : item.colId;
        const pill = document.createElement("div");
        pill.className = "cm-col-order-pill" + (item.pinned ? " is-pinned" : "");
        pill.dataset.colid = item.colId;
        pill.textContent = label;
        listContainer.appendChild(pill);
      });
      if (this.colOrderSortable) this.colOrderSortable.destroy();
      const SortableCtor = window.Sortable;
      if (typeof SortableCtor !== "undefined") {
        const host = this;
        this.colOrderSortable = new SortableCtor(listContainer, {
          animation: 150,
          onEnd() {
            const newState = [];
            for (let i = 0; i < listContainer.children.length; i++) {
              const child = listContainer.children[i];
              if (!(child instanceof HTMLElement)) continue;
              const colId = child.dataset.colid;
              if (!colId) continue;
              const prev = host.getColumnState().find((c) => c.colId === colId) || { colId, hide: false, pinned: null };
              newState.push({
                colId,
                hide: !!prev.hide,
                pinned: prev.pinned || null
              });
            }
            host.getColumnState().filter((c) => c.hide).forEach((c) => {
              newState.push(c);
            });
            host.adapter.applyColumnState(newState, true);
            host.saveState();
          }
        });
      }
    }
    renderSavedPresets() {
      const container = document.getElementById("presets-container-" + this.gridId);
      if (!container) return;
      container.innerHTML = "";
      Object.keys(this.savedColPresets).forEach((name) => {
        const chip = document.createElement("div");
        chip.className = "cm-col-preset-chip";
        chip.onclick = () => {
          const input = document.getElementById("preset-name-" + this.gridId);
          if (input instanceof HTMLInputElement) input.value = name;
        };
        const text = document.createElement("span");
        text.className = "cm-col-preset-chip-label";
        text.textContent = name;
        const applyBtn = document.createElement("button");
        applyBtn.type = "button";
        applyBtn.className = "cm-col-preset-apply-btn";
        applyBtn.textContent = colT("column_settings.apply", "Apply");
        applyBtn.onclick = (e) => {
          e.stopPropagation();
          this.adapter.applyColumnState(this.savedColPresets[name], true);
          this.buildColCheckboxes();
          this.saveState();
        };
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "cm-col-preset-delete-btn";
        delBtn.innerHTML = "&times;";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          delete this.savedColPresets[name];
          this.saveColPresetsToServer();
          this.renderSavedPresets();
        };
        chip.appendChild(text);
        chip.appendChild(applyBtn);
        chip.appendChild(delBtn);
        container.appendChild(chip);
      });
    }
    saveCurrentPreset() {
      const nameInput = document.getElementById("preset-name-" + this.gridId);
      const name = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
      if (!name) return;
      this.savedColPresets[name] = this.getColumnState();
      if (nameInput instanceof HTMLInputElement) nameInput.value = "";
      this.renderSavedPresets();
      this.saveColPresetsToServer();
    }
    saveColPresetsToServer() {
      try {
        localStorage.setItem(
          "agGridPresets_" + this.gridId,
          JSON.stringify(this.savedColPresets)
        );
      } catch (e) {
      }
      if (!this.preferencesUrl) return;
      fetch(this.preferencesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || ""
        },
        body: JSON.stringify({ grid_id: this.gridId, colPresets: this.savedColPresets })
      }).catch((err) => {
        console.error("column presets save failed", err);
      });
    }
    syncExportLinks() {
      var _a, _b;
      const syncFn = (_b = (_a = window.GridView) == null ? void 0 : _a.AgGrid) == null ? void 0 : _b.syncExportHref;
      const gridId = this.gridId;
      const adapter = this.adapter;
      document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + gridId + '"]').forEach((link) => {
        if (!(link instanceof HTMLAnchorElement) || !link.href) return;
        if (syncFn) {
          syncFn(link, gridId);
          return;
        }
        const ids = adapter.getDisplayedColumnIds().join(",");
        const url = new URL(link.href, window.location.origin);
        if (ids) url.searchParams.set("export_cols", ids);
        else url.searchParams.delete("export_cols");
        link.href = url.toString();
      });
    }
  };

  // src/column-settings/install.ts
  function isColumnMetaInput(value) {
    return typeof value === "object" && value !== null && "colId" in value && typeof value.colId === "string";
  }
  function parseColumnsMeta(raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isColumnMetaInput);
    } catch (e) {
      return [];
    }
  }
  function parseStringArray(raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => typeof item === "string");
    } catch (e) {
      return [];
    }
  }
  function isColumnStateItem(value) {
    return typeof value === "object" && value !== null && "colId" in value && typeof value.colId === "string";
  }
  function parsePresets(raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const out = {};
      for (const [name, state] of Object.entries(parsed)) {
        if (Array.isArray(state) && state.every(isColumnStateItem)) {
          out[name] = state;
        }
      }
      return out;
    } catch (e) {
      return {};
    }
  }
  function createColumnSettings(gridId, adapter, options) {
    return new ColumnSettingsHost(gridId, adapter, options);
  }
  function initSimpleTableColumnSettings2(wrapper) {
    var _a, _b;
    if (!(wrapper instanceof HTMLElement)) return null;
    const shell = wrapper;
    if (shell.dataset.cmColSettingsBound) return (_a = shell._colSettings) != null ? _a : null;
    if (shell.dataset.cmColumnSettings !== "1") return null;
    const table = shell.querySelector("[data-cm-table]");
    if (!table) return null;
    let columnsMeta = [];
    let groupsOrder = [];
    let presets = {};
    columnsMeta = parseColumnsMeta(shell.dataset.cmColumns || "[]");
    groupsOrder = parseStringArray(shell.dataset.cmGroupsOrder || "[]");
    presets = parsePresets(shell.dataset.cmPresets || "{}");
    const adapter = createDomTableColumnAdapter(table, columnsMeta);
    const host = new ColumnSettingsHost(shell.dataset.gridId || "table", adapter, {
      groupsOrder,
      initialPresets: presets,
      preferencesUrl: shell.dataset.cmPreferencesUrl || ""
    });
    shell.dataset.cmColSettingsBound = "1";
    shell._colSettings = host;
    getColSelectorPanel(host.gridId);
    if ((_b = window.GridView) == null ? void 0 : _b.byId) {
      window.GridView.byId.register(host.gridId, host);
    }
    if (typeof adapter.syncGroupHeaders === "function") adapter.syncGroupHeaders();
    document.querySelectorAll('[data-cm-export-sync][data-cm-grid-id="' + host.gridId + '"]').forEach((link) => {
      if (link instanceof HTMLElement && !link.dataset.cmExportClickBound) {
        link.dataset.cmExportClickBound = "1";
        link.addEventListener("click", () => {
          host.syncExportLinks();
        });
      }
    });
    return host;
  }
  function installColumnSettings(gv2) {
    gv2.ColumnSettings = ColumnSettingsHost;
    gv2.createColumnSettings = createColumnSettings;
    gv2.createDomTableColumnAdapter = createDomTableColumnAdapter;
    gv2.createAgGridColumnAdapter = createAgGridColumnAdapter;
    gv2.initSimpleTableColumnSettings = initSimpleTableColumnSettings2;
    document.querySelectorAll('[data-cm-column-settings="1"]').forEach((shell) => {
      if (shell instanceof HTMLElement && !shell.dataset.cmColSettingsBound) {
        initSimpleTableColumnSettings2(shell);
      }
    });
  }

  // src/column-settings.ts
  var gv = window.GridView = window.GridView || {};
  installColumnSettings(gv);

  // src/spec-boot.ts
  var gridView = bootstrapGridView();
  installAssetLoader(gridView);
  installRuntimeBoot(gridView);
})();
