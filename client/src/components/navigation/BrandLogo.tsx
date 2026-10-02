import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'

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
        <span className="h-9 w-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary font-black flex items-center justify-center text-sm tracking-tighter border border-primary/20">
          1w
        </span>
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
          <>
            {variant === 'white' ? (
              <img
                src="/logo-white.png"
                alt="OneWinq"
                onError={() => setImageError(true)}
                className={cn('h-7 sm:h-8 w-auto object-contain select-none', imgClassName)}
              />
            ) : variant === 'dark' ? (
              <img
                src="/logo.png"
                alt="OneWinq"
                onError={() => setImageError(true)}
                className={cn('h-7 sm:h-8 w-auto object-contain select-none', imgClassName)}
              />
            ) : (
              <>
                {/* Light mode: crisp dark lettering + purple dot */}
                <img
                  src="/logo.png"
                  alt="OneWinq"
                  onError={() => setImageError(true)}
                  className={cn(
                    'h-7 sm:h-8 w-auto object-contain select-none block dark:hidden',
                    imgClassName
                  )}
                />
                {/* Dark mode: crisp white lettering + purple dot */}
                <img
                  src="/logo-white.png"
                  alt="OneWinq"
                  onError={() => setImageError(true)}
                  className={cn(
                    'h-7 sm:h-8 w-auto object-contain select-none hidden dark:block',
                    imgClassName
                  )}
                />
              </>
            )}
          </>
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

