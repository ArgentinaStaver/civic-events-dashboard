export interface DataGridColumn<T extends object> {
  id: string
  label: string
  defaultVisible?: boolean
  accessor: (row: T) => string | number | null | undefined
  format?: (value: string | number | null | undefined) => string
}

export interface DataGridRowHighlight {
  id: string
  token: number
}

export interface DataGridProps<T extends object> {
  rows: T[]
  columns: DataGridColumn<T>[]
  loading?: boolean
  error?: string | null
  selectedRowId?: string
  pageSizeOptions?: number[]
  initialPageSize?: number
  rowHighlight?: DataGridRowHighlight | null
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
}
