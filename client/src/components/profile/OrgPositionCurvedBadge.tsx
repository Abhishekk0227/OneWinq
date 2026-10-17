import * as React from 'react'

interface OrgPositionCurvedBadgeProps {
  position: string
  color?: string | null
  className?: string
}

/**
 * Top-right corner organization position badge with an inverted scoop curve,
 * matching modern branded card aesthetics and custom organization colors.
 */
export function OrgPositionCurvedBadge({
  position,
  color,
  className = '',
}: OrgPositionCurvedBadgeProps) {
  if (!position) return null

  // Default deep indigo-violet if no custom color is specified
  const bg = color || '#241b74'

  return (
    <div
      className={`absolute top-0 right-0 z-20 flex items-stretch select-none pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] ${className}`}
    >
      {/* Left Smooth Inverted Curve Transition */}
      <svg
        viewBox="0 0 36 44"
        className="h-9 sm:h-11 w-auto block shrink-0"
        aria-hidden="true"
      >
        {/* Solid fill that joins seamlessly with the text container */}
        <path
          d="M 0 0 C 18 0, 22 18, 26 30 C 28 38, 32 44, 36 44 L 37 44 L 37 0 Z"
          fill={bg}
        />
        {/* Light frosted accent border along the curve */}
        <path
          d="M 0 0 C 18 0, 22 18, 26 30 C 28 38, 32 44, 36 44"
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Main Badge Content Box */}
      <div
        className="h-9 sm:h-11 flex items-center pr-4 pl-1 sm:pr-6 sm:pl-2 -ml-px border-b-[1.5px] border-white/45 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase"
        style={{ backgroundColor: bg }}
      >
        <span className="truncate max-w-[180px] sm:max-w-[280px] drop-shadow-sm">
          {position}
        </span>
      </div>
    </div>
  )
}
