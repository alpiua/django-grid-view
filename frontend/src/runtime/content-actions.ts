/** Content dismiss + pseudo-toast (show_content) runtime for GridViewSpec. */

function resolveContentBlock(targetId: string): HTMLElement | null {
  return (
    document.getElementById(`block-${targetId}`) ??
    document.querySelector<HTMLElement>(`[data-block-id="${targetId}"]`)
  );
}

function showContentBlock(targetId: string, autoHideMs?: number): void {
  const block = resolveContentBlock(targetId);
  if (!block) return;
  block.classList.remove("hidden");
  if (autoHideMs && autoHideMs > 0) {
    window.setTimeout(() => block.classList.add("hidden"), autoHideMs);
  }
}

function applyDismissStorage(scope: ParentNode): void {
  scope.querySelectorAll<HTMLElement>("[data-cm-content-dismissible]").forEach((el) => {
    const key = el.getAttribute("data-cm-dismiss-key");
    if (key && sessionStorage.getItem(key) === "1") {
      el.closest(".cm-block")?.classList.add("hidden");
    }
  });
}

export function initContentActions(scope: ParentNode): void {
  applyDismissStorage(scope);

  scope.querySelectorAll<HTMLElement>("[data-cm-content-dismiss]").forEach((btn) => {
    if (btn.dataset.cmContentDismissInit) return;
    btn.dataset.cmContentDismissInit = "1";
    btn.addEventListener("click", () => {
      const host = btn.closest<HTMLElement>("[data-cm-content-dismissible]");
      const key = host?.getAttribute("data-cm-dismiss-key");
      if (key) sessionStorage.setItem(key, "1");
      btn.closest(".cm-block")?.classList.add("hidden");
    });
  });

  scope.querySelectorAll<HTMLElement>('[data-cm-action="show_content"]').forEach((btn) => {
    if (btn.dataset.cmShowContentInit) return;
    btn.dataset.cmShowContentInit = "1";
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-cm-action-target") ?? "";
      if (!targetId) return;
      const autoHideRaw = btn.getAttribute("data-cm-auto-hide-ms");
      const autoHideMs = autoHideRaw ? parseInt(autoHideRaw, 10) : undefined;
      showContentBlock(targetId, Number.isFinite(autoHideMs) ? autoHideMs : undefined);
    });
  });
}
