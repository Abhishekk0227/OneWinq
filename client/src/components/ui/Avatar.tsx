import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  status?: 'online' | 'offline' | 'busy'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl font-bold',
  '2xl': 'h-28 w-28 text-3xl font-extrabold',
}

const statusSizes = {
  sm: 'h-2 w-2 ring-1',
  md: 'h-2.5 w-2.5 ring-2',
  lg: 'h-3.5 w-3.5 ring-2',
  xl: 'h-4 w-4 ring-2',
  '2xl': 'h-5 w-5 ring-4',
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  status,
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(!src)

  React.useEffect(() => {
    setHasError(!src)
  }, [src])

  const initials = React.useMemo(() => {
    if (fallback) {return fallback.slice(0, 2).toUpperCase()}
    if (alt && alt !== 'Avatar') {
      const parts = alt.trim().split(' ')
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return alt.slice(0, 2).toUpperCase()
    }
    return '1W'
  }, [fallback, alt])

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-medium overflow-hidden border border-border/80 shadow-sm select-none',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="flex items-center justify-center tracking-tight">{initials}</span>
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-background',
            statusSizes[size],
            status === 'online' && 'bg-success',
            status === 'busy' && 'bg-warning',
            status === 'offline' && 'bg-muted-foreground'
          )}
        />
      )}
    </div>
  )
}
