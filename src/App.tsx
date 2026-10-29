import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import type { CivicEventModel } from './data-models/CivicEvent/CivicEventModel'
import { useCivicEvents } from './hooks/useCivicEvents'
import { DataGrid, EventForm, Timeline } from './lib'
import { formatTimestamp } from './services/utils'
import type { DataGridColumn, DataGridRowHighlight, EventFormValues, TimelineItem } from './lib'

const columns: DataGridColumn<CivicEventModel>[] = [
  { id: 'id', label: 'Request ID', accessor: (row) => row.id },
  { id: 'title', label: 'Problem', accessor: (row) => row.title },
  { id: 'borough', label: 'Borough', accessor: (row) => row.borough },
  { id: 'agency', label: 'Agency', accessor: (row) => row.agency },
  { id: 'date', label: 'Created', accessor: (row) => row.date, format: formatTimestamp },
  { id: 'status', label: 'Status', accessor: (row) => row.status },
  { id: 'description', label: 'Problem Detail', accessor: (row) => row.description },
  { id: 'closedAt', label: 'Closed', accessor: (row) => row.closedAt, format: formatTimestamp, defaultVisible: false },
  {
    id: 'openDataChannelType',
    label: 'Channel',
    accessor: (row) => row.openDataChannelType,
    defaultVisible: false,
  },
  { id: 'agencyName', label: 'Agency name', accessor: (row) => row.agencyName, defaultVisible: false },
  { id: 'source', label: 'Source', accessor: (row) => row.source, defaultVisible: false },
]

const getCivicEventId = (row: CivicEventModel) => row.id

type AppView = 'grid' | 'timeline'

const toTimelineItem = (event: CivicEventModel): TimelineItem => {
  const location = [event.borough, event.incidentZip].filter(Boolean).join(' · ')

  return {
    id: event.id,
    title: event.title,
    date: event.date,
    description: event.description || undefined,
    location: location || undefined,
  }
}

const App = () => {
  const [view, setView] = useState<AppView>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CivicEventModel | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [rowHighlight, setRowHighlight] = useState<DataGridRowHighlight | null>(null)
  const { events, timelineEvents, loading, error, createEvent, updateEvent } = useCivicEvents()
  const timelineItems = useMemo(() => timelineEvents.map(toTimelineItem), [timelineEvents])

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (event: CivicEventModel) => {
    setEditing(event)
    setFormOpen(true)
  }

  const saveEvent = (values: EventFormValues) => {
    const saved = values.id ? updateEvent(values) : createEvent(values)
    setRowHighlight({ id: saved.id, token: Date.now() })
    setStatusMessage(values.id ? 'Event updated!' : 'Event added!')
    closeForm()
  }

  useEffect(() => {
    if (!rowHighlight) return
    const timeout = window.setTimeout(() => setRowHighlight(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [rowHighlight])

  return (
    <Box
      component="main"
      sx={{
        boxSizing: 'border-box',
        height: '100vh',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            CivicPulse
          </Typography>
          <Typography color="text.secondary">NYC Service Requests Explorer</Typography>
        </Box>
        <Button variant="contained" onClick={openCreate}>
          New event
        </Button>
      </Box>

      <Tabs
        value={view}
        onChange={(_, next: AppView) => setView(next)}
        variant="fullWidth"
        aria-label="Service request views"
      >
        <Tab value="grid" label="Data grid" id="view-tab-grid" aria-controls="view-panel-grid" />
        <Tab value="timeline" label="Timeline" id="view-tab-timeline" aria-controls="view-panel-timeline" />
      </Tabs>

      <Box
        role="tabpanel"
        id={`view-panel-${view}`}
        aria-labelledby={`view-tab-${view}`}
        sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {view === 'grid' ? (
          <DataGrid
            rows={events}
            columns={columns}
            getRowId={getCivicEventId}
            loading={loading}
            error={error}
            selectedRowId={editing?.id}
            rowHighlight={rowHighlight}
            onRowClick={openEdit}
          />
        ) : (
          <Timeline items={timelineItems} loading={loading} error={error} />
        )}
      </Box>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm" aria-labelledby="event-form-title">
        <DialogTitle id="event-form-title">{editing ? 'Edit event' : 'New event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1.5 }}>
            <EventForm
              key={editing?.id ?? 'create'}
              initialValues={
                editing
                  ? {
                      id: editing.id,
                      title: editing.title,
                      date: editing.date,
                      description: editing.description,
                    }
                  : undefined
              }
              onSubmit={saveEvent}
              onCancel={closeForm}
            />
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(statusMessage)}
        autoHideDuration={4000}
        onClose={() => setStatusMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          {statusMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default App
