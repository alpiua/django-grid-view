import type {
  AgGridColumnAdapterApi,
  ColumnAdapter,
  ColumnDescriptor,
  ColumnMetaInput,
  ColumnStateItem,
} from "./types";

export function createAgGridColumnAdapter(
  gridApi: AgGridColumnAdapterApi,
  columnMeta: Record<string, Partial<ColumnMetaInput>> | null | undefined
): ColumnAdapter {
  const meta = columnMeta || {};
  return {
    hasGroupedHeaders() {
      return false;
    },
    getDescriptors(): ColumnDescriptor[] {
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
          _col: col,
        };
      });
    },
    isVisible(colId: string): boolean {
      const col = gridApi.getColumn(colId);
      return col ? col.isVisible() : false;
    },
    setVisible(colId: string, visible: boolean): void {
      gridApi.setColumnsVisible([colId], visible);
    },
    getPinned(colId: string): string | null {
      const col = gridApi.getColumn(colId);
      return col ? col.getPinned() : null;
    },
    setPinned(colId: string, pinned: string | null): void {
      gridApi.applyColumnState({ state: [{ colId, pinned, hide: false }] });
    },
    getColumnState(): ColumnStateItem[] {
      return gridApi.getColumnState();
    },
    applyColumnState(state: ColumnStateItem[], applyOrder?: boolean): void {
      gridApi.applyColumnState({ state, applyOrder: !!applyOrder });
    },
    resetColumnState(): void {
      gridApi.resetColumnState();
    },
    getDisplayedColumnIds(): string[] {
      if (!gridApi.getAllDisplayedColumns) return [];
      return gridApi.getAllDisplayedColumns().map((col) => col.getColId());
    },
    getColumnsForUi(): unknown[] {
      if (!gridApi.getColumns) return [];
      return gridApi.getColumns();
    },
    uiItemFromDescriptor(desc: ColumnDescriptor): { col: unknown; label: string; colId: string } {
      return { col: desc._col, label: desc.label, colId: desc.colId };
    },
  };
}
