import { useEffect, useMemo, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { TimelineItem, TimelineProps } from './types'

interface TimelineGroupRow {
  type: 'group'
  id: string
  dayKey: string
  label: string
  count: number
  expanded: boolean
}

interface TimelineItemRow {
  type: 'item'
  id: string
  dayKey: string
  dayLabel: string
  item: TimelineItem
}

type TimelineRow = TimelineGroupRow | TimelineItemRow

const byDateDesc = (left: TimelineItem, right: TimelineItem) =>
  right.date.localeCompare(left.date) || right.id.localeCompare(left.id)

const dayKeyOf = (date: string) => date.slice(0, 10)

const formatDay = (dayKey: string) => {
  const date = new Date(`${dayKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dayKey
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatTime = (date: string) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const buildRows = (items: TimelineItem[], collapsedDays: ReadonlySet<string>): TimelineRow[] => {
  const groups = new Map<string, TimelineItem[]>()

  for (const item of items) {
    const dayKey = dayKeyOf(item.date)
    const group = groups.get(dayKey)
    if (group) group.push(item)
    else groups.set(dayKey, [item])
  }

  const rows: TimelineRow[] = []
  for (const [dayKey, groupItems] of groups) {
    const label = formatDay(dayKey)
    const expanded = !collapsedDays.has(dayKey)
    rows.push({
      type: 'group',
      id: `day-${dayKey}`,
      dayKey,
      label,
      count: groupItems.length,
      expanded,
    })
    if (!expanded) continue
    for (const item of groupItems) {
      rows.push({ type: 'item', id: item.id, dayKey, dayLabel: label, item })
    }
  }

  return rows
}

const describeMove = (rows: TimelineRow[], from: number, to: number) => {
  const row = rows[to]
  if (!row) return ''
  if (row.type === 'group') {
    const state = row.expanded ? 'expanded' : 'collapsed'
    return `${row.label}, ${state}, ${row.count} events`
  }

  const previous = rows[from]
  const enteredGroup = !previous || previous.dayKey !== row.dayKey
  const detail = [row.item.title, formatTime(row.item.date), row.item.location]
    .filter(Boolean)
    .join(', ')
  return enteredGroup ? `${row.dayLabel}. ${detail}` : detail
}

const railSx = {
  position: 'relative',
  width: 16,
  flexShrink: 0,
  alignSelf: 'stretch',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '2px',
    bgcolor: 'divider',
    transform: 'translateX(-50%)',
  },
} as const

const Timeline = ({ items, loading = false, error = null }: TimelineProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(0)
  const pendingFocus = useRef(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [focusRequest, setFocusRequest] = useState(0)
  const [collapsedDays, setCollapsedDays] = useState<ReadonlySet<string>>(() => new Set())

  const sortedItems = useMemo(() => [...items].sort(byDateDesc), [items])
  const rows = useMemo(() => buildRows(sortedItems, collapsedDays), [sortedItems, collapsedDays])
  const groupIndexes = useMemo(
    () => rows.flatMap((row, index) => (row.type === 'group' ? [index] : [])),
    [rows],
  )
  const activeIndex = Math.max(
    0,
    rows.findIndex((row) => row.id === activeId),
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    overscan: 10,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.type === 'group' ? 36 : 58),
    getItemKey: (index) => rows[index]?.id ?? index,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const activeRowMounted = virtualItems.some((item) => item.index === activeIndex)

  const focusIndex = (index: number, message?: string) => {
    const row = rows[index]
    if (!row) return
    const next = Math.max(0, Math.min(index, rows.length - 1))
    setAnnouncement(message ?? describeMove(rows, activeIndexRef.current, next))
    activeIndexRef.current = next
    pendingFocus.current = true
    setActiveId(row.id)
  }

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    if (!pendingFocus.current) return
    virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    const node = parentRef.current?.querySelector<HTMLElement>(
      `[data-timeline-index="${activeIndex}"]`,
    )
    if (!node) return
    node.focus({ preventScroll: true })
    pendingFocus.current = false
  }, [activeIndex, virtualItems, virtualizer, focusRequest])

  const onListFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || rows.length === 0) return
    setAnnouncement(describeMove(rows, activeIndex, activeIndex))
    pendingFocus.current = true
    setFocusRequest((count) => count + 1)
  }

  const moveGroup = (direction: 1 | -1) => {
    let position = 0
    for (let index = 0; index < groupIndexes.length; index += 1) {
      if (groupIndexes[index] <= activeIndexRef.current) position = index
    }
    const next = groupIndexes[position + direction]
    if (next !== undefined) focusIndex(next)
  }

  const toggleGroup = (row: TimelineGroupRow) => {
    const willCollapse = row.expanded
    setCollapsedDays((current) => {
      const next = new Set(current)
      if (next.has(row.dayKey)) next.delete(row.dayKey)
      else next.add(row.dayKey)
      return next
    })
    setAnnouncement(`${row.label}, ${willCollapse ? 'collapsed' : 'expanded'}, ${row.count} events`)
    activeIndexRef.current = rows.findIndex((candidate) => candidate.id === row.id)
    pendingFocus.current = true
    setActiveId(row.id)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (rows.length === 0) return
    const current = rows[activeIndexRef.current]

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusIndex(activeIndexRef.current + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusIndex(activeIndexRef.current - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveGroup(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveGroup(-1)
    } else if ((event.key === 'Enter' || event.key === ' ') && current?.type === 'group') {
      event.preventDefault()
      toggleGroup(current)
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={parentRef}
        role="list"
        aria-label="Timeline, grouped by day. Left and right move between days. Enter collapses the focused day."
        tabIndex={!loading && !error && rows.length > 0 && !activeRowMounted ? 0 : undefined}
        onFocus={onListFocus}
        onKeyDown={onKeyDown}
        sx={{
          height: 560,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          },
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }} role="status">
            <CircularProgress size={20} aria-hidden="true" />
            <Typography>Loading events…</Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && rows.length === 0 && (
          <Typography sx={{ p: 2 }} color="text.secondary">
            No events to display.
          </Typography>
        )}

        {!loading && !error && rows.length > 0 && (
          <Box sx={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isActive = virtualRow.index === activeIndex

              return (
                <Box
                  key={row.id}
                  data-index={virtualRow.index}
                  data-timeline-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  role="listitem"
                  tabIndex={isActive ? 0 : -1}
                  aria-current={isActive ? 'true' : undefined}
                  aria-expanded={row.type === 'group' ? row.expanded : undefined}
                  aria-label={
                    row.type === 'group'
                      ? `${row.label}, ${row.expanded ? 'expanded' : 'collapsed'}, ${row.count} events`
                      : [row.item.title, formatTime(row.item.date), row.item.location]
                          .filter(Boolean)
                          .join(', ')
                  }
                  onClick={() => {
                    focusIndex(virtualRow.index)
                    if (row.type === 'group') toggleGroup(row)
                  }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    transform: `translateY(${virtualRow.start}px)`,
                    cursor: 'pointer',
                    bgcolor: row.type === 'group' ? 'grey.100' : isActive ? 'action.hover' : 'transparent',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                >
                  {row.type === 'group' ? (
                    <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: 36 }}>
                      <Box sx={{ width: 72, flexShrink: 0 }} />
                      <Box sx={railSx}>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: 9,
                            height: 9,
                            borderRadius: '2px',
                            bgcolor: 'primary.main',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1,
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          flex: 1,
                          minWidth: 0,
                          pr: 1.5,
                        }}
                      >
                        {row.expanded ? (
                          <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        ) : (
                          <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        )}
                        <Typography variant="subtitle2" component="h3" noWrap>
                          {row.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 'auto', flexShrink: 0 }}
                        >
                          {row.count}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'stretch', py: 0.75 }}>
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{
                          width: 72,
                          flexShrink: 0,
                          pt: 0.25,
                          pr: 1,
                          textAlign: 'right',
                          color: 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatTime(row.item.date)}
                      </Typography>
                      <Box sx={railSx}>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: '50%',
                            top: 6,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'background.paper',
                            border: '2px solid',
                            borderColor: 'primary.main',
                            transform: 'translateX(-50%)',
                            zIndex: 1,
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, pr: 1.5 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {row.item.title}
                        </Typography>
                        {row.item.description && (
                          <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ m: 0 }}>
                            {row.item.description}
                          </Typography>
                        )}
                        {row.item.location && (
                          <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ m: 0 }}>
                            {row.item.location}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        )}
      </Box>

      <Box
        aria-live="polite"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </Box>
    </Box>
  )
}

export default Timeline
