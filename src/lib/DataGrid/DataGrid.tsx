import { useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { DataGridProps } from './types'

const FILTER_DELAY_MS = 200

type TableRow = Record<string, any>

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

interface FilterableColumn {
  setFilterValue: (value: string | undefined) => void
}

const ColumnFilter = ({ column, label }: { column: FilterableColumn; label: string }) => {
  const [value, setValue] = useState('')
  const setFilterValue = useRef(column.setFilterValue)

  useEffect(() => {
    setFilterValue.current = column.setFilterValue
  }, [column])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = value.trim()
      setFilterValue.current(next ? next : undefined)
    }, FILTER_DELAY_MS)

    return () => window.clearTimeout(timeout)
  }, [value])

  return (
    <TextField
      value={value}
      size="small"
      placeholder="Filter"
      aria-label={`Filter ${label}`}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setValue(event.target.value)}
      fullWidth
      sx={{ mt: 1 }}
    />
  )
}

const DataGrid = <T extends object>({
  rows,
  columns: columnDefs,
  getRowId,
  loading = false,
  error = null,
  onRowClick,
  selectedRowId,
  pageSizeOptions = [25, 50, 100],
  initialPageSize = 25,
}: DataGridProps<T>) => {
  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, TableRow>()

    return helper.columns(
      columnDefs.map((column) =>
        helper.accessor(
          (row) => {
            const value = column.accessor(row as T)
            return value == null ? '' : String(value)
          },
          {
            id: column.id,
            header: column.label,
            filterFn: 'includesString',
            sortFn: 'alphanumeric',
            cell: (info) => info.getValue() || '—',
          },
        ),
      ),
    )
  }, [columnDefs])

  const initialState = useMemo(
    () => ({
      pagination: { pageIndex: 0, pageSize: initialPageSize },
      columnVisibility: Object.fromEntries(
        columnDefs
          .filter((column) => column.defaultVisible === false)
          .map((column) => [column.id, false]),
      ),
    }),
    [columnDefs, initialPageSize],
  )

  const labels = useMemo(
    () => Object.fromEntries(columnDefs.map((column) => [column.id, column.label])),
    [columnDefs],
  )

  const table = useTable({
    features,
    columns: tableColumns,
    data: rows as TableRow[],
    getRowId: (row) => getRowId(row as T),
    initialState,
  })

  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1)
  const filteredCount = table.getRowCount()
  const pageRows = table.getRowModel().rows

  const emptyMessage =
    rows.length === 0 ? 'No records to display.' : 'No records match the current filters.'

  return (
    <Paper variant="outlined">
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="subtitle2" component="h2" gutterBottom>
          Columns
        </Typography>
        <FormGroup row>
          {table.getAllLeafColumns().map((column) => (
            <FormControlLabel
              key={column.id}
              label={labels[column.id] ?? column.id}
              control={
                <Checkbox
                  size="small"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  slotProps={{
                    input: { 'aria-label': `Show ${labels[column.id] ?? column.id}` },
                  }}
                />
              }
            />
          ))}
        </FormGroup>
      </Box>

      <TableContainer>
        <Table size="small" stickyHeader aria-label="Data grid">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const label = labels[header.column.id] ?? header.column.id

                  return (
                    <TableCell
                      key={header.id}
                      sortDirection={sorted === false ? false : sorted}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                      sx={{ verticalAlign: 'top', minWidth: 160 }}
                    >
                      <TableSortLabel
                        active={sorted !== false}
                        direction={sorted === 'desc' ? 'desc' : 'asc'}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                      </TableSortLabel>
                      <ColumnFilter column={header.column} label={label} />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }} role="status">
                    <CircularProgress size={20} aria-hidden="true" />
                    <Typography>Loading records…</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <Alert severity="error" sx={{ my: 1 }}>
                    {error}
                  </Alert>
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <Typography sx={{ py: 2 }} color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !error &&
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover={Boolean(onRowClick)}
                  selected={row.id === selectedRowId}
                  onClick={onRowClick ? () => onRowClick(row.original as T) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredCount}
        page={table.state.pagination.pageIndex}
        rowsPerPage={table.state.pagination.pageSize}
        rowsPerPageOptions={pageSizeOptions}
        onPageChange={(_, page) => table.setPageIndex(page)}
        onRowsPerPageChange={(event) => table.setPageSize(Number(event.target.value))}
      />
    </Paper>
  )
}

export default DataGrid
