import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import type { EventFormProps } from './types'

const pad = (value: number) => String(value).padStart(2, '0')

const toDateTimeLocal = (value: string) => {
  if (!value.trim()) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

const toStoredDate = (value: string) => (value.length === 16 ? `${value}:00` : value)

interface FieldErrors {
  title?: string
  date?: string
}

const EventForm = ({ initialValues, onSubmit, onCancel }: EventFormProps) => {
  const isEdit = Boolean(initialValues?.id)
  const titleRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [date, setDate] = useState(() => toDateTimeLocal(initialValues?.date ?? new Date().toISOString()))
  const [dateTouched, setDateTouched] = useState(isEdit)
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState('')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    const trimmedTitle = title.trim()
    const chosenDate = !isEdit && !dateTouched ? toDateTimeLocal(new Date().toISOString()) : date

    if (!trimmedTitle) nextErrors.title = 'Title is required.'
    if (!chosenDate.trim()) nextErrors.date = 'Date is required.'
    else if (chosenDate !== toDateTimeLocal(chosenDate)) nextErrors.date = 'Enter a valid date.'

    setErrors(nextErrors)
    setSuccess('')

    if (nextErrors.title) {
      titleRef.current?.focus()
      return
    }
    if (nextErrors.date) {
      dateRef.current?.focus()
      return
    }

    onSubmit({
      ...(initialValues?.id ? { id: initialValues.id } : {}),
      title: trimmedTitle,
      date: toStoredDate(chosenDate),
      description: description.trim(),
    })
    setSuccess(isEdit ? 'Event saved.' : 'Event added.')
    if (!isEdit) {
      setTitle('')
      setDate(toDateTimeLocal(new Date().toISOString()))
      setDateTouched(false)
      setDescription('')
    }
  }

  return (
    <Box component="form" onSubmit={onFormSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
      <TextField
        id="event-title"
        name="title"
        label="Title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setErrors((current) => ({ ...current, title: undefined }))
          setSuccess('')
        }}
        required
        error={Boolean(errors.title)}
        helperText={errors.title}
        inputRef={titleRef}
        autoFocus
        fullWidth
      />
      <TextField
        id="event-date"
        name="date"
        label="Date"
        type="datetime-local"
        value={date}
        onChange={(event) => {
          setDate(event.target.value)
          setDateTouched(true)
          setErrors((current) => ({ ...current, date: undefined }))
          setSuccess('')
        }}
        required
        error={Boolean(errors.date)}
        helperText={errors.date ?? (isEdit ? undefined : 'Leave unchanged to use the save time.')}
        inputRef={dateRef}
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        id="event-description"
        name="description"
        label="Description"
        value={description}
        onChange={(event) => {
          setDescription(event.target.value)
          setSuccess('')
        }}
        multiline
        minRows={3}
        fullWidth
      />
      <Box role="status" aria-live="polite" sx={{ minHeight: 24, color: 'success.main' }}>
        {success}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="contained">
          Save
        </Button>
      </Box>
    </Box>
  )
}

export default EventForm
