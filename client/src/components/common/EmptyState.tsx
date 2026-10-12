import React from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

export interface EmptyStateProps {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>
  title: string
  description?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const renderedIcon = React.isValidElement(icon)
    ? icon
    : typeof icon === 'function' || (icon && typeof icon === 'object' && ('render' in (icon as any) || '$$typeof' in (icon as any)))
    ? React.createElement(icon as React.ComponentType<any>, { className: 'h-7 w-7 text-primary' })
    : icon

  const textDesc = description || message

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border dark:border-white/10 bg-card/50 dark:bg-white/[0.02] p-12 text-center text-foreground dark:text-white',
        className
      )}
    >
      {renderedIcon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft dark:bg-white/5 text-primary shadow-soft">
          {renderedIcon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground dark:text-white">{title}</h3>
      {textDesc && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground dark:text-white/60">{textDesc}</p>
      )}
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
