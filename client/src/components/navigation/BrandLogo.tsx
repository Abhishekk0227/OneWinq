import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'

export function BrandLogo({
  className,
  showTagline = false,
  collapsed = false,
}: {
  className?: string
  showTagline?: boolean
  collapsed?: boolean
}) {
  if (collapsed) {
    return (
      <Link
        to="/"
        className={cn(
          'inline-flex items-center justify-center font-black tracking-tight text-primary text-lg select-none hover:opacity-90 transition-opacity',
          className
        )}
        title="onewinq"
      >
        <span>1w</span>
      </Link>
    )
  }

  return (
    <Link
      to="/"
      className={cn(
        'inline-flex flex-col group select-none hover:opacity-95 transition-opacity',
        className
      )}
    >
      <span className="text-2xl font-black tracking-tight text-foreground lowercase flex items-center leading-none">
        one<span className="text-primary">winq</span>
      </span>
      {showTagline && (
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-1">
          Digital Identity
        </span>
      )}
    </Link>
  )
}
