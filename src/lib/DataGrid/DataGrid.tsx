import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
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
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { compareText, isTimestamp } from '../../services/utils'
import type { DataGridProps } from './types'

const FILTER_DELAY_MS = 200
const HIGHLIGHT_MS = 2200
const highlightedColumnBg = '#e5f4ea'
const highlightedColumnHoverBg = '#d5eadc'

type GridValue = string | number | null | undefined

type TableRow = Record<string, any>

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

const isEmptyValue = (value: GridValue) => value == null || value === ''

const compareGridValues = (left: GridValue, right: GridValue) => {
  const leftEmpty = isEmptyValue(left)
  const rightEmpty = isEmptyValue(right)
  if (leftEmpty || rightEmpty) return leftEmpty === rightEmpty ? 0 : leftEmpty ? 1 : -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'string' && typeof right === 'string' && isTimestamp(left) && isTimestamp(right)) {
    return left < right ? -1 : left > right ? 1 : 0
  }
  return compareText(String(left), String(right))
}

const textOf = (value: GridValue) => (value == null ? '' : String(value))

interface FilterableColumn {
  getFilterValue: () => unknown
  setFilterValue: (value: string | undefined) => void
}

const storedFilterText = (column: FilterableColumn) => {
  const stored = column.getFilterValue()
  return typeof stored === 'string' ? stored : ''
}

const ColumnFilter = ({ column, label }: { column: FilterableColumn; label: string }) => {
  const [value, setValue] = useState(() => storedFilterText(column))
  const columnRef = useRef(column)
  const skipNextWrite = useRef(true)

  useEffect(() => {
    columnRef.current = column
  }, [column])

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }

    const timeout = window.setTimeout(() => {
      const next = value.trim()
      if (next === storedFilterText(columnRef.current)) return
      columnRef.current.setFilterValue(next ? next : undefined)
    }, FILTER_DELAY_MS)

    return () => window.clearTimeout(timeout)
  }, [value])

  return (
    <TextField
      value={value}
      size="small"
      placeholder="Filter"
      slotProps={{ htmlInput: { 'aria-label': `Filter ${label}` } }}
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
  rowHighlight = null,
}: DataGridProps<T>) => {
  const formattedSearchText = useMemo(() => {
    const byColumn = new Map<string, string[]>()
    for (const column of columnDefs) {
      if (!column.format) continue
      const format = column.format
      byColumn.set(
        column.id,
        rows.map((row) => {
          const value = column.accessor(row)
          const raw = textOf(value).toLowerCase()
          const shown = format(value).toLowerCase()
          return raw === shown ? raw : `${raw}\n${shown}`
        }),
      )
    }
    return byColumn
  }, [rows, columnDefs])

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, TableRow>()

    return helper.columns(
      columnDefs.map((column) =>
        helper.accessor((row) => column.accessor(row as T), {
          id: column.id,
          header: column.label,
          filterFn: (row, columnId, filterValue) => {
            const query = String(filterValue ?? '').toLowerCase()
            const indexed = formattedSearchText.get(columnId)
            if (indexed) return indexed[row.index]?.includes(query) ?? false
            return textOf(row.getValue(columnId) as GridValue).toLowerCase().includes(query)
          },
          sortFn: (rowA, rowB, columnId) =>
            compareGridValues(rowA.getValue(columnId) as GridValue, rowB.getValue(columnId) as GridValue),
          cell: (info) => {
            const value = info.getValue() as GridValue
            if (isEmptyValue(value)) return '—'
            return column.format ? column.format(value) : value
          },
        }),
      ),
    )
  }, [columnDefs, formattedSearchText])

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
  const [highlightedColumnIds, setHighlightedColumnIds] = useState<ReadonlySet<string>>(() => new Set())
  const highlightTimers = useRef(new Map<string, number>())
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const pendingScrollRowId = useRef<string | null>(null)
  const highlightedRowId = rowHighlight?.id

  useEffect(() => {
    const timers = highlightTimers.current
    return () => {
      for (const timeout of timers.values()) window.clearTimeout(timeout)
    }
  }, [])

  const clearHighlight = (columnId: string) => {
    const timeout = highlightTimers.current.get(columnId)
    if (timeout) window.clearTimeout(timeout)
    highlightTimers.current.delete(columnId)
    setHighlightedColumnIds((current) => {
      if (!current.has(columnId)) return current
      const next = new Set(current)
      next.delete(columnId)
      return next
    })
  }

  const highlightColumn = (columnId: string, visible: boolean) => {
    clearHighlight(columnId)
    if (!visible) return

    setHighlightedColumnIds((current) => new Set(current).add(columnId))
    const timeout = window.setTimeout(() => clearHighlight(columnId), HIGHLIGHT_MS)
    highlightTimers.current.set(columnId, timeout)
    window.setTimeout(() => {
      tableContainerRef.current
        ?.querySelector<HTMLElement>(`[data-column-id="${CSS.escape(columnId)}"]`)
        ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    }, 0)
  }

  const highlightedCellSx = (columnId: string, rowId?: string) => ({
    transition: 'background-color 0.6s ease',
    ...(highlightedColumnIds.has(columnId) || (rowId != null && rowId === highlightedRowId)
      ? {
          bgcolor: highlightedColumnBg,
          '.MuiTableRow-root.MuiTableRow-hover:hover &': { bgcolor: highlightedColumnHoverBg },
          '.MuiTableRow-root.Mui-selected &': { bgcolor: highlightedColumnHoverBg },
        }
      : {}),
  })

  const table = useTable({
    features,
    columns: tableColumns,
    data: rows as TableRow[],
    getRowId: (row) => getRowId(row as T),
    initialState,
  })

  useEffect(() => {
    pendingScrollRowId.current = rowHighlight?.id ?? null
  }, [rowHighlight])

  useEffect(() => {
    const rowId = pendingScrollRowId.current
    if (!rowId) return

    const index = table.getSortedRowModel().rows.findIndex((row) => row.id === rowId)
    if (index < 0) return

    const { pageSize, pageIndex } = table.state.pagination
    const nextPage = Math.floor(index / pageSize)
    if (pageIndex !== nextPage) {
      table.setPageIndex(nextPage)
      return
    }

    const node = tableContainerRef.current?.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(rowId)}"]`,
    )
    if (!node) return
    pendingScrollRowId.current = null
    node.scrollIntoView({ block: 'nearest' })
  })

  const columnsMenuId = useId()
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<HTMLElement | null>(null)
  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1)
  const filteredCount = table.getRowCount()
  const pageRows = table.getRowModel().rows

  const emptyMessage =
    rows.length === 0 ? 'No records to display.' : 'No records match the current filters.'

  const openRow = onRowClick
    ? (row: T) => {
        onRowClick(row)
      }
    : undefined

  const onRowKeyDown = openRow
    ? (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        openRow(row)
      }
    : undefined

  return (
    <Paper
      variant="outlined"
      sx={{ minWidth: 0, minHeight: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ px: 2, pt: 2 }}>
        <Button
          size="small"
          startIcon={<ViewColumnIcon />}
          aria-haspopup="menu"
          aria-expanded={columnsMenuAnchor ? 'true' : undefined}
          aria-controls={columnsMenuAnchor ? columnsMenuId : undefined}
          onClick={(event: MouseEvent<HTMLButtonElement>) => setColumnsMenuAnchor(event.currentTarget)}
        >
          Columns
        </Button>
        <Menu
          id={columnsMenuId}
          anchorEl={columnsMenuAnchor}
          open={Boolean(columnsMenuAnchor)}
          onClose={() => setColumnsMenuAnchor(null)}
        >
          {table.getAllLeafColumns().map((column) => {
            const label = labels[column.id] ?? column.id
            const visible = column.getIsVisible()
            return (
              <MenuItem
                key={column.id}
                dense
                role="menuitemcheckbox"
                aria-checked={visible}
                onClick={() => {
                  const next = !visible
                  column.toggleVisibility(next)
                  highlightColumn(column.id, next)
                }}
              >
                <Checkbox
                  size="small"
                  checked={visible}
                  tabIndex={-1}
                  disableRipple
                  slotProps={{ input: { 'aria-hidden': true } }}
                />
                <ListItemText primary={label} />
              </MenuItem>
            )
          })}
        </Menu>
      </Box>

      <TableContainer ref={tableContainerRef} sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
                      data-column-id={header.column.id}
                      sortDirection={sorted === false ? false : sorted}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                      sx={{
                        verticalAlign: 'top',
                        minWidth: 160,
                        ...highlightedCellSx(header.column.id),
                      }}
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
                  hover={Boolean(openRow)}
                  data-row-id={row.id}
                  selected={row.id === selectedRowId}
                  tabIndex={openRow ? 0 : undefined}
                  onClick={openRow ? () => openRow(row.original as T) : undefined}
                  onKeyDown={onRowKeyDown ? (event) => onRowKeyDown(event, row.original as T) : undefined}
                  sx={{
                    cursor: openRow ? 'pointer' : 'default',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} sx={highlightedCellSx(cell.column.id, row.id)}>
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
