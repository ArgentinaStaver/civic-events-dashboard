import type { RecordSource } from '../common/RecordSource'

export interface CivicEventModel {
  id: string
  title: string
  date: string
  description: string
  closedAt: string | null
  status: string
  borough: string
  agency: string
  incidentZip: string
  openDataChannelType: string
  agencyName: string
  resolutionDescription: string
  source: RecordSource
}
