export interface CivicEventResponseModel {
  unique_key: string
  created_date: string
  closed_date?: string
  complaint_type?: string
  descriptor?: string
  status?: string
  borough?: string
  agency?: string
  incident_zip?: string
  open_data_channel_type?: string
  agency_name?: string
  resolution_description?: string
}
