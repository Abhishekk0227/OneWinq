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
  sm: 'h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 text-xs',
  md: 'h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 text-sm',
  lg: 'h-14 w-14 min-h-14 min-w-14 max-h-14 max-w-14 text-base',
  xl: 'h-20 w-20 min-h-20 min-w-20 max-h-20 max-w-20 text-xl font-bold',
  '2xl': 'h-28 w-28 min-h-28 min-w-28 max-h-28 max-w-28 text-3xl font-extrabold',
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
  style,
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
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-medium overflow-hidden border border-border/80 shadow-sm select-none aspect-square isolate',
        sizeClasses[size],
        className
      )}
      style={{
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        ...style,
      }}
      {...props}
    >
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full max-h-full max-w-full object-cover rounded-full aspect-square block shrink-0 pointer-events-none"
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
