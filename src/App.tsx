import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import type { CivicEventModel } from './data-models/CivicEvent/CivicEventModel'
import { useCivicEvents } from './hooks/useCivicEvents'
import { DataGrid, Timeline } from './lib'
import type { DataGridColumn, TimelineItem } from './lib'

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
  const { events, timelineEvents, loading, error } = useCivicEvents()
  const timelineItems = useMemo(() => timelineEvents.map(toTimelineItem), [timelineEvents])

  return (
    <Box component="main" sx={{ p: 3, display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          CivicPulse
        </Typography>
        <Typography color="text.secondary">NYC Service Requests Explorer</Typography>
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
          />
        ) : (
          <Timeline items={timelineItems} loading={loading} error={error} />
        )}
      </Box>
    </Box>
  )
}

export default App
