/**
 * AUTO-GENERATED from schema/grid-view-spec.v2.json — DO NOT EDIT BY HAND.
 * Regenerate with: cd frontend && npm run gen:types
 * Drift is guarded by frontend gen:types:check + tests/test_ts_schema_parity.py.
 */

export type GridViewBlock =
  | GridViewHeader
  | GridViewToolbar
  | GridViewFilters
  | GridViewActions
  | GridViewTable
  | GridViewCharts
  | GridViewKpi
  | GridViewCards
  | GridViewCardGroups
  | GridViewGallery
  | GridViewImage
  | GridViewTabs
  | GridViewNav
  | GridViewContent
  | GridViewForm
  | GridViewOverlay
  | GridViewTemplate;
export type GridViewHeader = GridViewBlockBase & {
  type?: "header";
  presentation?: "plain" | "entity" | "split" | "compact" | "hero" | "section";
  nav?: string | null;
  entity?: null | {};
  content?: string | null;
  subtitle?: string;
  icon?: string;
  actions?: string | null;
};
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | {
      [k: string]: JsonValue;
    }
  | JsonValue[];
export type GridViewToolbar = GridViewBlockBase & {
  type?: "toolbar";
  presentation?: "default" | "compact" | "panel";
  search?: null | GridViewSearch;
  filters?: string | null;
  clear_all?: boolean;
  reload?: boolean;
  counters?: GridViewCounter[];
  actions?: string | null;
  target?: string | null;
};
export type GridViewFilters = GridViewBlockBase & {
  type?: "filters";
  presentation?: "toolbar" | "inline" | "panel" | "drawer";
  schema?: GridViewFilter[];
  state?: {};
  target?: string | null;
  auto_apply?: boolean;
  navigate_on_change?: boolean;
  facets?: boolean;
  fragment_endpoint?: string;
  fragment_target?: string;
  fragment_swap?: string;
};
export type GridViewActions = GridViewBlockBase & {
  type?: "actions";
  presentation?: "inline" | "menu" | "split" | "compact";
  items?: unknown[];
};
export type GridViewTable = GridViewBlockBase & {
  type?: "table";
  backend?: "simple" | "ag_grid";
  columns?: unknown[];
  column_source?: null | {};
  rows?: unknown[];
  datasource?: null | {};
  header?: {};
  search_mode?: "global" | "per_column" | "disabled";
  sort?: {};
  settings?: null | {};
  edit?: null | {};
  assets?: unknown[];
  row_action?: null | {};
  footer?: null | {};
  empty_message?: string;
  per_page?: number;
  pagination?: null | GridViewTablePagination;
  striped?: boolean;
};
export type GridViewCharts = GridViewBlockBase & {
  type?: "charts";
  charts: unknown[];
  presentation?: "grid" | "stack" | "tabs" | "single";
  filters?: string | null;
};
export type GridViewKpi = GridViewBlockBase & {
  type?: "kpi";
  items: unknown[];
  presentation?: "strip" | "cards" | "compact";
};
export type GridViewCards = GridViewBlockBase & {
  type?: "cards";
  cards: unknown[];
  presentation?: "list" | "grid" | "tiles" | "panel";
};
export type GridViewCardGroups = GridViewBlockBase & {
  type?: "card_groups";
  groups?: GridViewCardGroup[];
};
export type GridViewGallery = GridViewBlockBase & {
  type?: "gallery";
  presentation?: "grid" | "carousel" | "masonry" | "filmstrip";
};
export type GridViewImage = GridViewBlockBase & {
  type?: "image";
  image: {};
  fit?: "cover" | "contain" | "fill";
};
export type GridViewTabs = GridViewBlockBase & {
  type?: "tabs";
  tabs: unknown[];
  presentation?: "tabs" | "segmented" | "pills";
};
export type GridViewNav = GridViewBlockBase & {
  type?: "nav";
  items: unknown[];
  presentation?: "breadcrumbs" | "tabs" | "sidebar" | "menu" | "back";
};
export type GridViewContent = GridViewBlockBase & {
  type?: "content";
  role?: "text" | "info" | "formula" | "empty" | "warning" | "callout" | "banner";
  body?: string;
  tone?: "" | "default" | "info" | "success" | "warning" | "danger";
  dismissible?: boolean;
};
export type GridViewForm = GridViewBlockBase & {
  type?: "form";
  presentation?: "stack" | "inline" | "grid" | "panel";
  fields?: GridViewField[];
  fieldsets?: GridViewFieldset[];
  values?: {
    [k: string]: JsonValue;
  };
  errors?: {
    [k: string]: string[];
  };
  submit?: null | {};
  endpoint?: string;
  method?: "get" | "post";
};
export type GridViewOverlay = GridViewBlockBase & {
  type?: "overlay";
  presentation?: "modal" | "drawer" | "popover";
  spec?: GridViewSpecV2;
  content?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
};
export type GridViewTemplate = GridViewBlockBase & {
  type?: "template";
  mode?: "file" | "raw";
  template?: string;
  context?: {
    [k: string]: JsonValue;
  };
  html?: string;
  assets?: GridViewTemplateAsset[];
};

/**
 * Flat blocks/layout contract for grid-view-spec 2.x. Host supplies rows separately.
 */
export interface GridViewSpecV2 {
  id: string;
  title?: string;
  meta?: GridViewMeta;
  config?: GridViewConfig;
  blocks?: GridViewBlock[];
  layout?: GridViewLayout;
}
export interface GridViewMeta {
  title?: string;
  subtitle?: string;
  icon?: string;
  description?: string;
}
export interface GridViewConfig {
  htmx?: boolean;
  template?: string;
  assets?: GridViewTemplateAsset[];
  lazy?: GridViewLazyDefaults;
}
export interface GridViewTemplateAsset {
  id?: string;
  kind?: "script" | "style" | "module";
  src?: string;
  defer?: boolean;
  module?: boolean;
}
export interface GridViewLazyDefaults {
  enabled?: boolean;
  method?: "get" | "post";
  placeholder?: "skeleton" | "spinner" | "empty";
  mode?: "replace" | "merge" | "append";
  timeout_ms?: number;
}
export interface GridViewBlockBase {
  id: string;
  type: string;
  title?: string;
  extra?: {
    [k: string]: JsonValue;
  };
  style?: GridViewStyle;
  trusted_style?: null | GridViewTrustedStyle;
  lazy?: null | GridViewLazyBlock;
}
export interface GridViewStyle {
  width?: "" | "auto" | "full" | "content";
  min_width?: string;
  height?: string;
  min_height?: string;
  overflow?: "" | "visible" | "hidden" | "auto";
  padding?: "" | "none" | "xs" | "sm" | "md" | "lg";
  gap?: "" | "none" | "xs" | "sm" | "md" | "lg";
  tone?: "" | "default" | "muted" | "primary" | "success" | "warning" | "danger";
  surface?: "" | "none" | "plain" | "card" | "panel";
  sticky?: "" | "top" | "bottom";
}
export interface GridViewTrustedStyle {
  css_vars?: {
    [k: string]: string;
  };
}
export interface GridViewLazyBlock {
  endpoint: string;
  trigger?: "load" | "visible" | "manual";
  params?: {
    [k: string]: JsonValue;
  };
  method?: "get" | "post";
  placeholder?: "skeleton" | "spinner" | "empty";
  mode?: "replace" | "merge" | "append";
  timeout_ms?: number;
}
export interface GridViewSearch {
  param?: string;
  value?: string;
  placeholder?: string;
  backend?: "server" | "ag_grid" | "client";
  mode?: "simple" | "smart";
  bind?: string | null;
  saved?: boolean;
  compact?: boolean;
}
export interface GridViewCounter {
  id: string;
  label: string;
  value: string | number;
  tone?: "" | "muted" | "success" | "warning" | "danger";
  field?: string | null;
  total?: number | null;
  server_only?: boolean;
}
export interface GridViewFilter {
  id: string;
  label: string;
  param: string;
  type: "text" | "number" | "number_range" | "select" | "multiselect" | "set" | "date" | "date_range" | "boolean";
  scope?: "server" | "client";
  options?: GridViewFilterOption[];
  options_endpoint?: string;
  placeholder?: string;
  select_all?: boolean;
  select_all_label?: string;
  select_all_value?: string;
  all_exclusive?: boolean;
  presets?: {};
  default?: JsonValue;
}
export interface GridViewFilterOption {
  value: string;
  label: string;
  children?: GridViewFilterOption[];
  exclusive?: boolean;
  meta?: {};
  count?: number | null;
  disabled?: boolean;
}
export interface GridViewTablePagination {
  page?: number;
  page_size?: number;
  total?: number;
  mode?: "server" | "client" | "fragment";
  page_param?: string;
  page_size_param?: string;
  fragment_endpoint?: string;
  fragment_target?: string;
  fragment_swap?: string;
  page_endpoint?: string;
  page_size_options?: number[];
}
export interface GridViewCardGroup {
  id: string;
  title?: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  items?: string[];
  count?: string | number;
  empty_message?: string;
}
export interface GridViewField {
  name: string;
  label?: string;
  type?: "text" | "textarea" | "number" | "select" | "multiselect" | "date" | "date_range" | "boolean" | "file";
  options?: GridViewFilterOption[];
  required?: boolean;
  default?: JsonValue;
  placeholder?: string;
  help?: string;
  validators?: GridViewValidator[];
  visible_when?: null | GridViewFieldCondition;
  extra?: {
    [k: string]: JsonValue;
  };
}
export interface GridViewValidator {
  kind:
    | "required"
    | "email"
    | "url"
    | "number"
    | "integer"
    | "min"
    | "max"
    | "min_length"
    | "max_length"
    | "pattern"
    | "domain"
    | "custom";
  value?: string | number | null;
  message?: string;
  name?: string;
}
export interface GridViewFieldCondition {
  field: string;
  equals?: JsonValue;
}
export interface GridViewFieldset {
  id: string;
  label?: string;
  fields?: string[];
  columns?: number;
}
export interface GridViewLayout {
  root?: GridViewArea;
}
export interface GridViewArea {
  id: string;
  type?: "stack" | "grid" | "sidebar" | "split" | "tabs" | "modal" | "table-card";
  blocks?: string[];
  areas?: GridViewArea[];
  style?: GridViewStyle;
  extra?: {
    [k: string]: JsonValue;
  };
}
