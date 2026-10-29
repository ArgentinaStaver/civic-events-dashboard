import type { CivicEventModel } from '../data-models/CivicEvent/CivicEventModel'
import type { CivicEventResponseModel } from '../data-models/CivicEvent/CivicEventResponseModel'
import { mapCivicEventResponseToModel } from '../data-models/CivicEvent/mapCivicEventResponseToModel'

const DATA_URL = '/data/civic-events.json'

export const loadCivicEvents = async (): Promise<CivicEventModel[]> => {
  const res = await fetch(DATA_URL)
  if (!res.ok) {
    throw new Error(`Failed to load civic events (${res.status})`)
  }

  const rows = (await res.json()) as CivicEventResponseModel[]
  return rows.map(mapCivicEventResponseToModel)
}
