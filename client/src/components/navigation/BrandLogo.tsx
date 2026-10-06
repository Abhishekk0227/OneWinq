import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'
import { useTheme } from '@/app/providers/ThemeProvider'

export interface BrandLogoProps {
  className?: string
  imgClassName?: string
  showTagline?: boolean
  collapsed?: boolean
  to?: string
  /**
   * 'auto': Uses logo.png in light mode and logo-white.png in dark mode
   * 'white': Forces logo-white.png (ideal for dark headers, hero sections, admin sidebar)
   * 'dark': Forces logo.png (dark text on light backgrounds)
   */
  variant?: 'auto' | 'white' | 'dark'
}

export function BrandLogo({
  className,
  imgClassName,
  showTagline = false,
  collapsed = false,
  to = '/',
  variant = 'auto',
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false)
  
  let resolvedTheme: 'light' | 'dark' = 'light'
  try {
    const themeContext = useTheme()
    resolvedTheme = themeContext.resolvedTheme
  } catch {
    // If rendered outside ThemeProvider (e.g. standalone test or error boundary)
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      resolvedTheme = 'dark'
    }
  }

  const effectiveVariant = variant === 'auto' ? (resolvedTheme === 'dark' ? 'white' : 'dark') : variant

  if (collapsed) {
    return (
      <Link
        to={to}
        className={cn(
          'inline-flex items-center justify-center font-black tracking-tight select-none hover:opacity-90 transition-opacity',
          className
        )}
        title="OneWinq"
      >
        <img
          src="/favicon.png"
          alt="OneWinq"
          className="h-8 w-8 rounded-xl object-contain shadow-xs"
        />
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex flex-col group select-none hover:opacity-95 transition-opacity shrink-0',
        className
      )}
    >
      <div className="flex items-center">
        {!imageError ? (
          effectiveVariant === 'white' ? (
            <img
              src="/logo-white.png"
              alt="OneWinq"
              onError={() => setImageError(true)}
              className={cn('h-7 sm:h-8 w-auto object-contain select-none', imgClassName)}
            />
          ) : (
            <img
              src="/logo.png"
              alt="OneWinq"
              onError={() => setImageError(true)}
              className={cn('h-7 sm:h-8 w-auto object-contain select-none', imgClassName)}
            />
          )
        ) : (
          <span className="text-2xl font-black tracking-tight text-foreground lowercase flex items-center leading-none">
            one<span className="text-primary">winq</span>
          </span>
        )}
      </div>
      {showTagline && (
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-1">
          Digital Identity
        </span>
      )}
    </Link>
  )
}

