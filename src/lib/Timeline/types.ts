export interface TimelineItem {
  id: string
  title: string
  date: string
  description?: string
  location?: string
}

export interface TimelineProps {
  items: TimelineItem[]
  loading?: boolean
  error?: string | null
}
