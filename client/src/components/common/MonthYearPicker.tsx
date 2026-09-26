import * as React from 'react'
import { MONTH_OPTIONS, getYearOptions } from '@/utils/dateFormatter'
import { cn } from '@/lib/utils/cn'

interface MonthYearPickerProps {
  label?: string
  month?: number | null
  year?: number | null
  onChange: (month: number | null, year: number | null) => void
  disabled?: boolean
  className?: string
  futureYears?: number
  pastYears?: number
  monthPlaceholder?: string
  yearPlaceholder?: string
}

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  label,
  month,
  year,
  onChange,
  disabled = false,
  className,
  futureYears = 6,
  pastYears = 60,
  monthPlaceholder = 'Month',
  yearPlaceholder = 'Year',
}) => {
  const years = React.useMemo(() => getYearOptions(pastYears, futureYears), [pastYears, futureYears])

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : null
    onChange(val, year ?? null)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : null
    onChange(month ?? null, val)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <span className="block text-xs font-semibold text-foreground/80">
          {label}
        </span>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={month ?? ''}
          onChange={handleMonthChange}
          disabled={disabled}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <option value="">{monthPlaceholder}</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={year ?? ''}
          onChange={handleYearChange}
          disabled={disabled}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <option value="">{yearPlaceholder}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
