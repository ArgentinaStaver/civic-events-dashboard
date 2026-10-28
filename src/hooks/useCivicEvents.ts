import { useEffect, useMemo, useState } from 'react'
import type { CivicEventModel } from '../data-models/CivicEvent/CivicEventModel'
import type { CivicEventRequestModel } from '../data-models/CivicEvent/CivicEventRequestModel'
import { loadCivicEvents } from '../services/civicEventsService'

const TIMELINE_EVENT_LIMIT = 10_000

const text = (value: string | undefined): string => value?.trim() ?? ''

const selectTimelineEvents = (events: CivicEventModel[]): CivicEventModel[] => {
  const local = events.filter((event) => event.source === 'local')
  const imported = events.filter((event) => event.source !== 'local')
  const byDay = new Map<string, CivicEventModel[]>()

  for (const event of imported) {
    const day = event.date.slice(0, 10)
    const group = byDay.get(day)
    if (group) group.push(event)
    else byDay.set(day, [event])
  }

  for (const group of byDay.values()) {
    group.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }

  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a))
  const quotas = new Map<string, number>()
  let remaining = TIMELINE_EVENT_LIMIT
  let pending = days.filter((day) => (byDay.get(day)?.length ?? 0) > 0)

  while (remaining > 0 && pending.length > 0) {
    const share = Math.max(1, Math.floor(remaining / pending.length))
    const nextPending: string[] = []

    for (const day of pending) {
      if (remaining === 0) break
      const available = (byDay.get(day)?.length ?? 0) - (quotas.get(day) ?? 0)
      if (available <= 0) continue
      const take = Math.min(share, available, remaining)
      quotas.set(day, (quotas.get(day) ?? 0) + take)
      remaining -= take
      if (available > take) nextPending.push(day)
    }

    pending = nextPending
  }

  const sampled = days.flatMap((day) => (byDay.get(day) ?? []).slice(0, quotas.get(day) ?? 0))
  return [...local, ...sampled]
}

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
          setEvents((current) => {
            const local = current.filter((event) => event.source === 'local')
            return [...local, ...data]
          })
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
      selectTimelineEvents(events).sort(
        (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
      ),
    [events],
  )

  return { events, timelineEvents, loading, error, createEvent, updateEvent }
}
