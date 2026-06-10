/** Named registries for vNext GridViewSpec host extensions. */

export type GridActionContext = {
  rowId?: string;
  gridId?: string;
  params?: Record<string, unknown>;
  event?: Event;
};

export type GridCommitContext = {
  rowId?: string;
  gridId?: string;
  columnId?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
};

export type GridCommitHandler = (
  ctx: GridCommitContext
) => void | boolean | Promise<void | boolean>;

export type GridActionHandler = (ctx: GridActionContext) => void;

const _renderers = new Map<string, (ctx: Record<string, unknown>) => string | HTMLElement>();
const _commits = new Map<string, GridCommitHandler>();
const _actions = new Map<string, GridActionHandler>();

export function registerRenderer(
  name: string,
  fn: (ctx: Record<string, unknown>) => string | HTMLElement
): void {
  if (!name || typeof fn !== "function") return;
  _renderers.set(name, fn);
}

export function registerCommit(name: string, fn: GridCommitHandler): void {
  if (!name || typeof fn !== "function") return;
  _commits.set(name, fn);
}

export function registerAction(name: string, fn: GridActionHandler): void {
  if (!name || typeof fn !== "function") return;
  _actions.set(name, fn);
}

export function invokeAction(name: string, ctx: GridActionContext): void {
  const fn = _actions.get(name);
  if (typeof fn === "function") fn(ctx);
}

export async function invokeCommit(
  name: string,
  ctx: GridCommitContext
): Promise<boolean> {
  const fn = _commits.get(name);
  if (typeof fn !== "function") return false;
  const result = await fn(ctx);
  return result !== false;
}

export function getRegisteredRenderer(
  name: string
): ((ctx: Record<string, unknown>) => string | HTMLElement) | undefined {
  return _renderers.get(name);
}
