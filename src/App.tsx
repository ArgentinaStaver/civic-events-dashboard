import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { CivicEventModel } from './data-models/CivicEvent/CivicEventModel'
import { useCivicEvents } from './hooks/useCivicEvents'
import { DataGrid } from './lib'
import type { DataGridColumn } from './lib'

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

const App = () => {
  const { events, loading, error } = useCivicEvents()

  return (
    <Box component="main" sx={{ p: 3, display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          CivicPulse
        </Typography>
        <Typography color="text.secondary">NYC Service Requests Explorer</Typography>
      </Box>

      <DataGrid
        rows={events}
        columns={columns}
        getRowId={getCivicEventId}
        loading={loading}
        error={error}
      />
    </Box>
  )
}

export default App
