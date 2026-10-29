const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export const isTimestamp = (value: string) => value.length >= 10 && value[4] === '-' && value[7] === '-'

export const compareText = (left: string, right: string) => textCollator.compare(left, right)

export const formatTimestamp = (value: string | number | null | undefined) => {
  if (value == null || value === '') return ''
  const text = String(value)
  const month = MONTHS[Number(text.slice(5, 7)) - 1]
  if (!isTimestamp(text) || !month) return text

  const date = `${month} ${Number(text.slice(8, 10))}, ${text.slice(0, 4)}`
  const hourText = text.slice(11, 13)
  const minute = text.slice(14, 16)
  if ((text[10] !== 'T' && text[10] !== ' ') || hourText.length < 2 || minute.length < 2) return date

  const hour24 = Number(hourText)
  const hour12 = hour24 % 12 || 12
  return `${date}, ${hour12}:${minute} ${hour24 >= 12 ? 'PM' : 'AM'}`
}
