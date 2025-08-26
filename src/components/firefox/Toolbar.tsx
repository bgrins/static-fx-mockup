import { forwardRef } from 'react'
import { cn } from '~/lib/utils'
import { AddressBar, AddressBarHandle } from './AddressBar'
import { 
  SidebarCollapsedIcon, 
  BackArrowIcon, 
  ForwardArrowIcon, 
  RefreshIcon,
  ToolbarActions 
} from './ToolbarIcons'
import type { ToolbarProps as BaseToolbarProps } from '~/types/browser'

interface ToolbarProps extends BaseToolbarProps {
  smartMode?: boolean
}

export const Toolbar = forwardRef<AddressBarHandle, ToolbarProps>(function Toolbar({
  url = '',
  onBack,
  onForward,
  onRefresh,
  onNavigate,
  onNewTab,
  canGoBack = false,
  canGoForward = false,
  className,
  onSidebarToggle,
  smartMode = false
}, ref) {
  console.log('[TOOLBAR] Props received:', { canGoBack, canGoForward, url });
  return (
    <div className={cn("h-10 flex items-center gap-1 px-2 py-1", smartMode && "bg-white rounded-tl-lg border-l border-t border-b border-black/5", className)}>
      {smartMode ? (
        /* Smart mode: Show URL bar and navigation controls WITHOUT toolbar actions */
        <>
          {/* Navigation controls with refresh button */}
          <div className="flex items-center gap-1">
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] disabled:opacity-50 nav-back"
              onClick={onBack}
              disabled={!canGoBack}
              aria-disabled={!canGoBack}
            >
              <BackArrowIcon />
            </button>
            
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] disabled:opacity-50 nav-forward"
              onClick={onForward}
              disabled={!canGoForward}
              aria-disabled={!canGoForward}
            >
              <ForwardArrowIcon />
            </button>
            
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
              onClick={onRefresh}
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          </div>

          {/* URL bar in smart mode */}
          <div className="flex-1 px-2">
            <AddressBar 
              ref={ref}
              url={url} 
              onNavigate={onNavigate}
            />
          </div>
          {/* NO ToolbarActions here - they're in the tab strip */}
        </>
      ) : (
        /* Classic mode: Show all controls as before */
        <>
          {/* Left actions */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
              onClick={onSidebarToggle}
              title="Sidebar"
            >
              <SidebarCollapsedIcon />
            </button>

            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] disabled:opacity-50 nav-back"
              onClick={onBack}
              disabled={!canGoBack}
              aria-disabled={!canGoBack}
            >
              <BackArrowIcon />
            </button>
            
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] disabled:opacity-50 nav-forward"
              onClick={onForward}
              disabled={!canGoForward}
              aria-disabled={!canGoForward}
            >
              <ForwardArrowIcon />
            </button>
            
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] nav-refresh"
              onClick={onRefresh}
            >
              <RefreshIcon />
            </button>
          </div>

          {/* Address bar */}
          <div className="flex-1 px-16">
            <AddressBar 
              ref={ref}
              url={url} 
              onNavigate={onNavigate}
            />
          </div>
          
          {/* Right actions */}
          <ToolbarActions onNewTab={onNewTab} smartWindowMode={smartMode} />
        </>
      )}
    </div>
  )
})

