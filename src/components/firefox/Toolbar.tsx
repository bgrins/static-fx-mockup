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
  onNewTabBelow?: () => void
  onCompareTabs?: () => void
  onCloseBothTabs?: () => void
  showSplitView?: boolean
  smartMode?: boolean
  pageTitle?: string
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
  onNewTabBelow,
  onCompareTabs,
  onCloseBothTabs,
  showSplitView,
  onSidebarToggle,
  smartMode = false,
  pageTitle
}, ref) {
  console.log('[TOOLBAR] Props received:', { canGoBack, canGoForward, url });
  return (
    <div className={cn("h-10 flex items-center gap-1 px-2 py-1", className)}>
      {/* Left actions */}
      <div className="flex items-center gap-1">
        {!smartMode && (<button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
          onClick={onSidebarToggle}
          title="Sidebar"
        >
          <SidebarCollapsedIcon />
        </button>)}

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
        
        {!smartMode && (<button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] nav-refresh"
          onClick={onRefresh}
        >
          <RefreshIcon />
        </button>)}
      </div>

      {smartMode ? (
        /* Smart mode: Show page title and right refresh button */
        <>
          <div className="flex-1 px-2 min-w-0">
            <span className="text-sm text-[#15141A] truncate font-medium block">
              {pageTitle || 'New Tab'}
            </span>
          </div>

          {/* Right actions for smart mode */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
              onClick={onRefresh}
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          </div>
        </>
      ) : (
        /* Classic mode: Show address bar and right actions */
        <>
          {/* Address bar */}
          <div className="flex-1 px-16">
            <AddressBar 
              ref={ref}
              url={url} 
              onNavigate={onNavigate}
              onNewTabBelow={onNewTabBelow}
              onCompareTabs={onCompareTabs}
              onCloseBothTabs={onCloseBothTabs}
              showSplitView={showSplitView}
            />
          </div>
          
          {/* Right actions - hidden in smart mode as they move to tab strip */}
          {!smartMode && (
            <ToolbarActions onNewTab={onNewTab} smartWindowMode={smartMode} />
          )}
        </>
      )}
    </div>
  )
})

