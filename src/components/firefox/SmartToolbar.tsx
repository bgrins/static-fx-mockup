import { forwardRef } from 'react'
import { cn } from '~/lib/utils'

interface SmartToolbarProps {
  onRefresh?: () => void
  onClose?: () => void
  pageTitle?: string
  className?: string
}

export const SmartToolbar = forwardRef<HTMLDivElement, SmartToolbarProps>(function SmartToolbar({
  onClose,
  className
}, ref) {
  return (
    <div ref={ref} className={cn("h-10 flex items-center gap-1 px-2 py-1 bg-white justify-between rounded-t-xl", className)}>
      {/* Left - Hamburger menu */}
      <div className="flex items-center gap-1">
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
          title="Application Menu"
        >
          <AppMenuIcon />
        </button>
      </div>

      {/* Center - Page title */}
      {/* <div className="flex-1 px-2 min-w-0">
        <span className="text-sm text-[#15141A] truncate font-medium block">
          {pageTitle || 'New Tab'}
        </span>
      </div> */}

      {/* Right - Close button */}
      <div className="flex items-center gap-1">
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
          onClick={onClose}
          title="Close sidebar"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
})

function AppMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M13.375 3.25H2.625C2.45924 3.25 2.30027 3.18415 2.18306 3.06694C2.06585 2.94973 2 2.79076 2 2.625C2 2.45924 2.06585 2.30027 2.18306 2.18306C2.30027 2.06585 2.45924 2 2.625 2H13.375C13.5408 2 13.6997 2.06585 13.8169 2.18306C13.9342 2.30027 14 2.45924 14 2.625C14 2.79076 13.9342 2.94973 13.8169 3.06694C13.6997 3.18415 13.5408 3.25 13.375 3.25ZM13.375 8.25H2.625C2.45924 8.25 2.30027 8.18415 2.18306 8.06694C2.06585 7.94973 2 7.79076 2 7.625C2 7.45924 2.06585 7.30027 2.18306 7.18306C2.30027 7.06585 2.45924 7 2.625 7H13.375C13.5408 7 13.6997 7.06585 13.8169 7.18306C13.9342 7.30027 14 7.45924 14 7.625C14 7.79076 13.9342 7.94973 13.8169 8.06694C13.6997 8.18415 13.5408 8.25 13.375 8.25ZM2.625 13.25H13.375C13.5408 13.25 13.6997 13.1842 13.8169 13.0669C13.9342 12.9497 14 12.7908 14 12.625C14 12.4592 13.9342 12.3003 13.8169 12.1831C13.6997 12.0658 13.5408 12 13.375 12H2.625C2.45924 12 2.30027 12.0658 2.18306 12.1831C2.06585 12.3003 2 12.4592 2 12.625C2 12.7908 2.06585 12.9497 2.18306 13.0669C2.30027 13.1842 2.45924 13.25 2.625 13.25Z" fill="#5B5B66"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.8536 4.35355C13.0488 4.15829 13.0488 3.84171 12.8536 3.64645C12.6583 3.45118 12.3417 3.45118 12.1464 3.64645L8 7.79289L3.85355 3.64645C3.65829 3.45118 3.34171 3.45118 3.14645 3.64645C2.95118 3.84171 2.95118 4.15829 3.14645 4.35355L7.29289 8L3.14645 12.1464C2.95118 12.3417 2.95118 12.6583 3.14645 12.8536C3.34171 13.0488 3.65829 13.0488 3.85355 12.8536L8 8.70711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.70711 8L12.8536 4.35355Z" fill="#5B5B66"/>
    </svg>
  )
}