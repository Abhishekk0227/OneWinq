import * as React from 'react'

interface SwipeHintIndicatorProps {
  className?: string
}

/**
 * SwipeHintIndicator
 * Displays sleek, minimal transparent cascading chevrons (<<< on left, >>> on right)
 * that smoothly fade in and out at the screen edges to guide touch swiping between profile tabs.
 */
export function SwipeHintIndicator({ className = '' }: SwipeHintIndicatorProps) {
  return (
    <div
      data-no-swipe="true"
      className={`fixed inset-y-0 left-0 right-0 pointer-events-none z-[100] flex items-center justify-between px-2 sm:px-4 select-none transition-opacity duration-500 animate-in fade-in ${className}`}
      aria-hidden="true"
    >
      {/* Left Edge: Transparent fading in/out white chevron pointing left (<<<) */}
      <div className="flex items-center justify-center p-1 animate-swipe-hint-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
        <svg
          width="28"
          height="38"
          viewBox="0 0 28 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Lead chevron (furthest left) */}
          <polyline
            points="10,7 2,19 10,31"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Middle chevron */}
          <polyline
            points="18,7 10,19 18,31"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Trailing chevron (furthest right) */}
          <polyline
            points="26,7 18,19 26,31"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Right Edge: Transparent fading in/out white chevron pointing right (>>>) */}
      <div className="flex items-center justify-center p-1 animate-swipe-hint-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
        <svg
          width="28"
          height="38"
          viewBox="0 0 28 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Trailing chevron (furthest left) */}
          <polyline
            points="2,7 10,19 2,31"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Middle chevron */}
          <polyline
            points="10,7 18,19 10,31"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Lead chevron (furthest right) */}
          <polyline
            points="18,7 26,19 18,31"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
