/** Mirror of django_grid_view.types.kpi_bind (maintainer contract). */

export interface KpiSpecDict {
  id?: string;
  label?: string;
  field?: string;
  aggregate?: string;
  format?: string;
  tone?: string;
  icon?: string;
}

export interface ResolvedKpiDict {
  label?: string;
  valueFmt?: string;
  rawValue?: number;
  tone?: string;
  icon?: string;
}
