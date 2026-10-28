import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import type { CivicEventModel } from './data-models/CivicEvent/CivicEventModel'
import { useCivicEvents } from './hooks/useCivicEvents'
import { DataGrid, EventForm, Timeline } from './lib'
import type { DataGridColumn, EventFormValues, TimelineItem } from './lib'

const columns: DataGridColumn<CivicEventModel>[] = [
  { id: 'id', label: 'Request ID', accessor: (row) => row.id },
  { id: 'title', label: 'Problem', accessor: (row) => row.title },
  { id: 'borough', label: 'Borough', accessor: (row) => row.borough },
  { id: 'agency', label: 'Agency', accessor: (row) => row.agency },
  { id: 'date', label: 'Created', accessor: (row) => row.date },
  { id: 'status', label: 'Status', accessor: (row) => row.status },
  { id: 'description', label: 'Problem Detail', accessor: (row) => row.description },
  { id: 'closedAt', label: 'Closed', accessor: (row) => row.closedAt, defaultVisible: false },
  { id: 'incidentZip', label: 'ZIP', accessor: (row) => row.incidentZip, defaultVisible: false },
  {
    id: 'openDataChannelType',
    label: 'Channel',
    accessor: (row) => row.openDataChannelType,
    defaultVisible: false,
  },
  { id: 'agencyName', label: 'Agency name', accessor: (row) => row.agencyName, defaultVisible: false },
  {
    id: 'resolutionDescription',
    label: 'Resolution',
    accessor: (row) => row.resolutionDescription,
    defaultVisible: false,
  },
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
    if (values.id) {
      updateEvent(values)
      setStatusMessage('Event saved.')
    } else {
      createEvent(values)
      setStatusMessage('Event added.')
    }
    closeForm()
  }

  return (
    <Box component="main" sx={{ p: 3, display: 'grid', gap: 2 }}>
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

      <Box role="status" aria-live="polite" sx={{ minHeight: 24, color: 'success.main' }}>
        {statusMessage}
      </Box>

      <Tabs
        value={view}
        onChange={(_, next: AppView) => setView(next)}
        aria-label="Service request views"
      >
        <Tab value="grid" label="Data grid" id="view-tab-grid" aria-controls="view-panel-grid" />
        <Tab
          value="timeline"
          label="Timeline"
          id="view-tab-timeline"
          aria-controls="view-panel-timeline"
        />
      </Tabs>

      <Box role="tabpanel" id={`view-panel-${view}`} aria-labelledby={`view-tab-${view}`}>
        {view === 'grid' ? (
          <DataGrid
            rows={events}
            columns={columns}
            getRowId={getCivicEventId}
            loading={loading}
            error={error}
            selectedRowId={editing?.id}
            onRowClick={openEdit}
          />
        ) : (
          <Timeline items={timelineItems} loading={loading} error={error} />
        )}
      </Box>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm" aria-labelledby="event-form-title">
        <DialogTitle id="event-form-title">{editing ? 'Edit event' : 'New event'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
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
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default App
