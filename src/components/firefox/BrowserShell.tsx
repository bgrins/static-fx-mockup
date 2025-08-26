import { forwardRef } from 'react'
import { cn } from '~/lib/utils'
import { TabStrip } from './TabStrip'
import { Toolbar } from './Toolbar'
import { type AddressBarHandle } from './AddressBar'
import { WindowControls } from './WindowControls'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '~/components/ui/context-menu'
import { PlusIcon } from '~/components/icons'
import type { BrowserShellProps as BaseBrowserShellProps } from '~/types/browser'

interface BrowserShellProps extends BaseBrowserShellProps {
  hideToolbar?: boolean
  smartWindowMode?: boolean
  isFirefoxViewActive?: boolean
  onSmartWindowToggle?: () => void
}

export const BrowserShell = forwardRef<AddressBarHandle, BrowserShellProps>(function BrowserShell({
  children,
  tabs = [],
  activeTabId,
  currentUrl = '',
  onTabClick,
  onTabClose,
  onNewTab,
  onTabReorder,
  onNavigate,
  onBack,
  onForward,
  onRefresh,
  canGoBack = false,
  canGoForward = false,
  className,
  onSidebarToggle,
  hideToolbar = false,
  smartWindowMode = false,
  isFirefoxViewActive = false,
  onSmartWindowToggle
}, ref) {
  return (
    <div className={cn(
      "firefox-ui rounded-lg shadow-2xl overflow-hidden flex flex-col",
      "border-2 border-gray-300",
      // Default background - Smart Window gradient handled via CSS
      "bg-[#f9f9fb]",
      smartWindowMode && "smart-window-mode",
      className
    )}>
      {/* Tab strip with window controls */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div id="firefox-tab-strip" className={cn(
            "flex items-center shrink-0 browser-chrome min-w-0",
            smartWindowMode
              ? "backdrop-blur-sm" 
              : "bg-[#f0f0f4]"
          )}>
            <WindowControls />
            <div className="flex-1 min-w-0 overflow-hidden">
              <TabStrip
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={onTabClick}
                onTabClose={onTabClose}
                onNewTab={onNewTab}
                onTabReorder={onTabReorder}
                smartWindowMode={smartWindowMode}
                isFirefoxViewActive={isFirefoxViewActive}
                onSmartWindowToggle={onSmartWindowToggle}
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onNewTab?.()}>
            <PlusIcon />
            <span className="ml-2">New Tab</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Toolbar - positioned differently based on mode */}
      {!hideToolbar && !smartWindowMode && (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div id="firefox-toolbar" className="browser-chrome">
              <Toolbar
                ref={ref}
                url={currentUrl}
                onNavigate={onNavigate}
                onNewTab={onNewTab}
                onBack={onBack}
                onForward={onForward}
                onRefresh={onRefresh}
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                className="shrink-0"
                onSidebarToggle={onSidebarToggle}
                smartMode={smartWindowMode}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onNewTab?.()}>
              <PlusIcon />
              <span className="ml-2">New Tab</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      
      {/* Content area */}
      <div id="firefox-content-area" className="flex-1 flex overflow-hidden min-h-0 browser-content">
        {children}
      </div>
    </div>
  )
})