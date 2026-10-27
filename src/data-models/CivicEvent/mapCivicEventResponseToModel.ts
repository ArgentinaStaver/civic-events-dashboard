import type { CivicEventModel } from './CivicEventModel'
import type { CivicEventResponseModel } from './CivicEventResponseModel'

const text = (value: string | undefined): string => value?.trim() ?? ''

export const mapCivicEventResponseToModel = (
  response: CivicEventResponseModel,
): CivicEventModel => {
  return {
    id: response.unique_key,
    title: text(response.complaint_type) || 'Untitled request',
    date: response.created_date,
    description: text(response.descriptor),
    closedAt: response.closed_date ?? null,
    status: text(response.status),
    borough: text(response.borough),
    agency: text(response.agency),
    incidentZip: text(response.incident_zip),
    openDataChannelType: text(response.open_data_channel_type),
    agencyName: text(response.agency_name),
    resolutionDescription: text(response.resolution_description),
    source: 'imported',
  }
}
