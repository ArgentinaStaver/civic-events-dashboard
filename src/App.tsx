import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import type { CivicEventModel } from './data-models/CivicEvent/CivicEventModel'
import { useCivicEvents } from './hooks/useCivicEvents'

const PREVIEW_COLUMNS = [
  { key: 'id', label: 'id' },
  { key: 'date', label: 'date' },
  { key: 'title', label: 'title' },
  { key: 'description', label: 'description' },
  { key: 'borough', label: 'borough' },
  { key: 'agency', label: 'agency' },
  { key: 'status', label: 'status' },
] as const

const App = () => {
  const { events, timelineEvents, loading, error } = useCivicEvents()
  const [selected, setSelected] = useState<CivicEventModel | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const visibleEvents = events.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Box component="main" sx={{ p: 3, display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          CivicPulse
        </Typography>
        <Typography color="text.secondary">
          NYC Service Requests Explorer — CivicEventModel preview
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading && !error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography>Loading local sample…</Typography>
        </Box>
      )}

      {!loading && !error && (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${events.length.toLocaleString()} grid rows`} color="primary" size="small" />
            <Chip
              label={`${timelineEvents.length.toLocaleString()} timeline events`}
              size="small"
              variant="outlined"
            />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {PREVIEW_COLUMNS.map((col) => (
                    <TableCell key={col.key}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleEvents.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    selected={selected?.id === row.id}
                    onClick={() => setSelected(row)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {PREVIEW_COLUMNS.map((col) => (
                      <TableCell key={col.key}>{row[col.key] || '—'}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={events.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value))
                setPage(0)
              }}
            />
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              CivicEventModel
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                overflow: 'auto',
                bgcolor: 'grey.100',
                borderRadius: 1,
                fontSize: 13,
              }}
            >
              {JSON.stringify(selected, null, 2)}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  )
}

export default App
