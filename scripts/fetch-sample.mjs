/**
 * Download a local NYC 311 snapshot for the demo.
 * Usage: npm run data:sample
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TOTAL = 100_000
const PAGE_SIZE = 50_000

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/data/civic-events.json')

const fields = [
  'unique_key',
  'created_date',
  'closed_date',
  'complaint_type',
  'descriptor',
  'status',
  'borough',
  'agency',
  'incident_zip',
  'open_data_channel_type',
  'agency_name',
  'resolution_description',
]

const headers = { Accept: 'application/json' }
if (process.env.SOCRATA_APP_TOKEN) {
  headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN
}

const rows = []

for (let offset = 0; offset < TOTAL; offset += PAGE_SIZE) {
  const limit = Math.min(PAGE_SIZE, TOTAL - offset)
  const url = new URL('https://data.cityofnewyork.us/resource/erm2-nwe9.json')
  url.searchParams.set('$select', fields.join(','))
  url.searchParams.set('$order', 'created_date DESC, unique_key DESC')
  url.searchParams.set('$limit', String(limit))
  url.searchParams.set('$offset', String(offset))

  console.log(`Fetching rows ${offset + 1}–${offset + limit}…`)
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Socrata request failed at offset ${offset}: ${res.status} ${await res.text()}`)
  }

  const page = await res.json()
  if (!Array.isArray(page) || page.length < limit) {
    throw new Error(
      `Short page at offset ${offset}: expected ${limit}, got ${Array.isArray(page) ? page.length : 0}`,
    )
  }

  rows.push(...page)
}

await mkdir(dirname(outPath), { recursive: true })
await writeFile(outPath, JSON.stringify(rows))
console.log(`Wrote ${rows.length} rows → ${outPath}`)
