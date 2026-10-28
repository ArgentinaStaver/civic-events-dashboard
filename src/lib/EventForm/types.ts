export interface EventFormValues {
  id?: string
  title: string
  date: string
  description: string
}

export interface EventFormProps {
  initialValues?: Partial<EventFormValues>
  onSubmit: (values: EventFormValues) => void
  onCancel: () => void
}
