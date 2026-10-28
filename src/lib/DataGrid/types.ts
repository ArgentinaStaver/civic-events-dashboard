export interface DataGridColumn<T extends object> {
  id: string
  label: string
  defaultVisible?: boolean
  accessor: (row: T) => string | number | null | undefined
}

export interface DataGridProps<T extends object> {
  rows: T[]
  columns: DataGridColumn<T>[]
  loading?: boolean
  error?: string | null
  selectedRowId?: string
  pageSizeOptions?: number[]
  initialPageSize?: number
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
}
