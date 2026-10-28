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
console.log(`Wrote ${rows.length} recent rows`)

const EXTRA_DAYS = 90
const PER_DAY = 120
const oldestRecentDay = rows.reduce((oldest, row) => {
  const day = String(row.created_date).slice(0, 10)
  return day < oldest ? day : oldest
}, '9999-99-99')

const shiftDay = (day, amount) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

const seen = new Set(rows.map((row) => row.unique_key))
let added = 0

for (let offset = EXTRA_DAYS; offset >= 1; offset -= 1) {
  const day = shiftDay(oldestRecentDay, -offset)
  const next = shiftDay(day, 1)
  const url = new URL('https://data.cityofnewyork.us/resource/erm2-nwe9.json')
  url.searchParams.set('$select', fields.join(','))
  url.searchParams.set('$order', 'created_date DESC, unique_key DESC')
  url.searchParams.set('$limit', String(PER_DAY))
  url.searchParams.set(
    '$where',
    `created_date >= '${day}T00:00:00' AND created_date < '${next}T00:00:00'`,
  )

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Socrata request failed for ${day}: ${res.status} ${await res.text()}`)
  }

  const page = await res.json()
  if (!Array.isArray(page)) {
    throw new Error(`Unexpected response for ${day}`)
  }

  for (const row of page) {
    if (seen.has(row.unique_key)) continue
    seen.add(row.unique_key)
    rows.push(row)
    added += 1
  }
  console.log(`${day}: ${page.length} rows`)
}

rows.sort(
  (a, b) =>
    String(b.created_date).localeCompare(String(a.created_date)) ||
    String(b.unique_key).localeCompare(String(a.unique_key)),
)
await writeFile(outPath, JSON.stringify(rows))
console.log(`Added ${added} older rows. Wrote ${rows.length} rows → ${outPath}`)
