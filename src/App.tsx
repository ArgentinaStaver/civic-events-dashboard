import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

function App() {
  return (
    <Box component="main" sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        CivicPulse
      </Typography>
      <Typography color="text.secondary">
        NYC Service Requests Explorer
      </Typography>
    </Box>
  )
}

export default App
