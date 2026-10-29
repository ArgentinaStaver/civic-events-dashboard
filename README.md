# CivicPulse

NYC Service Requests Explorer. A single-page React and TypeScript demo for three reusable components: DataGrid, Timeline, and an add/edit event form.

The grid is loaded with a local snapshot of NYC 311 requests (about 110,000 rows). The timeline shows 10,000 of those events, grouped by day, plus any events created in the app.

The dataset is generated during setup and is not committed to the repository. No API token is required to run the demo.

## Run

```bash
npm install
cp .env.example .env
npm run data:sample
```

`npm run data:sample` runs with `node --env-file=.env`.  Copy `.env.example` first, even when no token is set. The script downloads the snapshot into `public/data/civic-events.json`. That file is gitignored because it is large. The app only reads this local file. It does not call the NYC API at runtime.

### Development

```bash
npm run dev
```

### Production Preview

```bash
npm run build
npm run preview
```

## Demo

- **Data grid** shows the full snapshot, one page at a time. Click a row to edit it.
- **Timeline** displays a subset of 10,000 events grouped by day, along with newly created events.
- **New event** opens the form. Saving adds the event to the grid and the timeline. A snackbar confirms the save.

## Components

The reusable components live in `src/lib`, use Material UI for styling, and are independent of NYC-specific data models. The app maps civic events into the component props.

**DataGrid** (`src/lib/DataGrid`) uses TanStack Table for client-side paging, sorting, filtering, and column visibility. Columns take an id, label, and accessor, and can start hidden. Loading, empty, and error states are built in. Only the current page is rendered.

**Timeline** (`src/lib/Timeline`) groups events by calendar day and virtualizes the list with TanStack Virtual. Arrow keys move between rows and days. Enter or Space expands or collapses the focused day. A live region announces the move. The component sorts its own items by date, so callers do not have to.

**EventForm** (`src/lib/EventForm`) is a controlled form. Title is required, the date must be valid, and submit focuses the first invalid field. It has its own success region. In this demo the dialog closes on save, so the visible confirmation is the snackbar in `App`.

## Data and state

State is managed through a custom React hook, `useCivicEvents`. There is no server and no global store. Changes are kept in memory and are reset when the page is reloaded. The hook loads the JSON snapshot once, keeps locally created events, and derives the timeline sample from that list.

## Performance

The DataGrid uses client-side pagination and renders only the current page. Sorting and filtering operate on the full dataset.

The Timeline uses TanStack Virtual to render only visible items while supporting keyboard navigation across the complete event list.

Both components are designed to remain usable with large datasets without requiring server-side processing.