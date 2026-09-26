const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const MONTH_OPTIONS = [
  { value: 1, label: 'January (01)' },
  { value: 2, label: 'February (02)' },
  { value: 3, label: 'March (03)' },
  { value: 4, label: 'April (04)' },
  { value: 5, label: 'May (05)' },
  { value: 6, label: 'June (06)' },
  { value: 7, label: 'July (07)' },
  { value: 8, label: 'August (08)' },
  { value: 9, label: 'September (09)' },
  { value: 10, label: 'October (10)' },
  { value: 11, label: 'November (11)' },
  { value: 12, label: 'December (12)' },
]

export function getYearOptions(rangeYears = 60, futureYears = 6) {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear + futureYears; y >= currentYear - rangeYears; y--) {
    years.push(y)
  }
  return years
}

export function formatMonthYear(
  month?: number | null,
  year?: number | null,
  fallbackDate?: string | Date | null
): string {
  if (year) {
    if (month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`
    }
    return `${year}`
  }
  if (fallbackDate) {
    const d = new Date(fallbackDate)
    if (!isNaN(d.getTime())) {
      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
    }
  }
  return ''
}

export function formatDateRange(
  startMonth?: number | null,
  startYear?: number | null,
  endMonth?: number | null,
  endYear?: number | null,
  current?: boolean,
  fallbackStart?: string | Date | null,
  fallbackEnd?: string | Date | null
): string {
  const start = formatMonthYear(startMonth, startYear, fallbackStart)

  if (current) {
    return start ? `${start} – Present` : 'Present'
  }

  const end = formatMonthYear(endMonth, endYear, fallbackEnd)

  if (start && end) {
    return `${start} – ${end}`
  }
  if (start) {
    return start
  }
  if (end) {
    return end
  }
  return ''
}
