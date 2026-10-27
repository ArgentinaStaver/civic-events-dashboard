import { useEffect, useMemo, useState } from 'react'
import type { CivicEventModel } from '../data-models/CivicEvent/CivicEventModel'
import type { CivicEventRequestModel } from '../data-models/CivicEvent/CivicEventRequestModel'
import { loadCivicEvents } from '../services/civicEventsService'

const TIMELINE_EVENT_LIMIT = 10_000

const text = (value: string | undefined): string => value?.trim() ?? ''

const toLocalEvent = (request: CivicEventRequestModel): CivicEventModel => ({
  id: request.id ?? `local-${crypto.randomUUID()}`,
  title: request.title.trim() || 'Untitled request',
  date: request.date,
  description: text(request.description),
  closedAt: null,
  status: text(request.status),
  borough: text(request.borough),
  agency: text(request.agency),
  incidentZip: '',
  openDataChannelType: '',
  agencyName: '',
  resolutionDescription: '',
  source: 'local',
})

export const useCivicEvents = () => {
  const [events, setEvents] = useState<CivicEventModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await loadCivicEvents()
        if (!cancelled) {
          setEvents(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load civic events')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const createEvent = (request: CivicEventRequestModel): CivicEventModel => {
    const event = toLocalEvent(request)
    setEvents((current) => [event, ...current]);

    return event
  }

  const updateEvent = (request: CivicEventRequestModel): CivicEventModel => {
    if (!request.id) {
      throw new Error('Civic event id is required to update')
    }

    const id = request.id
    let updated: CivicEventModel | null = null

    setEvents((current) =>
      current.map((event) => {
        if (event.id !== id) {
          return event
        }

        updated = {
          ...event,
          title: request.title.trim() || event.title,
          date: request.date,
          description:
            request.description === undefined ? event.description : text(request.description),
          status: request.status === undefined ? event.status : text(request.status),
          borough: request.borough === undefined ? event.borough : text(request.borough),
          agency: request.agency === undefined ? event.agency : text(request.agency),
        }

        return updated
      }),
    )

    if (!updated) {
      throw new Error(`Civic event ${id} was not found`)
    }

    return updated
  }

  const timelineEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        .slice(0, TIMELINE_EVENT_LIMIT),
    [events],
  )

  return { events, timelineEvents, loading, error, createEvent, updateEvent }
}
