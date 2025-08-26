import React from 'react'
import { CloseIcon, PlusIcon } from '~/components/icons'
import { cn } from '~/lib/utils'
import type { TabStripProps } from '~/types/browser'
import { SmartWindowPopover } from './SmartWindowPopover'
import { ToolbarActions } from './ToolbarIcons'

const TAB_WIDTH = {
  REGULAR: `w-[224px]`,
  SPLIT: `w-[127.5px]`,
  PINNED: `w-9`
} as const;

export function TabStrip({ 
  tabs, 
  onTabClick, 
  onTabClose,
  onNewTab,
  onTabReorder,
  smartWindowMode = false,
  isFirefoxViewActive = false,
  onSmartWindowToggle
}: TabStripProps) {
  const [draggedTab, setDraggedTab] = React.useState<string | null>(null)
  const [dropTargetTab, setDropTargetTab] = React.useState<{ id: string; before: boolean } | null>(null)
  const [isOverflowing, setIsOverflowing] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Hide new tab button when in Smart Window mode AND Firefox View is active
  const shouldHideNewTabButton = smartWindowMode && isFirefoxViewActive
  
  // Check for overflow on mount and when tabs change
  React.useEffect(() => {
    const checkOverflow = () => {
      if (scrollContainerRef.current) {
        const hasOverflow = scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth
        setIsOverflowing(hasOverflow)
      }
    }
    
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [tabs.length])
  return (
    <div className="h-11 flex items-center px-0 min-w-0">
      <div ref={scrollContainerRef} className="flex-1 flex items-center gap-1 px-2 py-2 min-w-0 overflow-x-auto scrollbar-none max-w-full">
        {/* Firefox View and other pinned tabs */}
        {tabs.filter(tab => tab.isPinned).map((tab) => {
          return (
            <div className={cn(
              "flex items-center gap-1 pr-1 h-full",
              smartWindowMode 
                ? "border-r border-white/30" 
                : "border-r border-[#cfcfd8]"
            )} key={tab.id}>
              <div
                className={cn(
                  "firefox-tab firefox-tab--pinned",
                  "relative flex items-center gap-2 h-9 px-0 py-[5px] rounded cursor-pointer group",
                  `${TAB_WIDTH.PINNED} justify-center`,
                  tab.isActive 
                      ? "firefox-tab--active bg-white/80 shadow-[0px_0px_1px_0px_rgba(0,0,0,0.15),0px_1px_2px_0px_rgba(0,0,0,0.2)]"
                      : "hover:bg-[rgba(21,20,26,0.05)]"
                )}
                data-tab-id={tab.id}
                data-tab-active={tab.isActive}
                role="tab"
                aria-selected={tab.isActive}
                onClick={() => onTabClick?.(tab.id)}
              >
                {tab.isActive && (
                  <div className="absolute inset-0 rounded border-t-2 border-[#0062fa] pointer-events-none" />
                )}
                
                <div className="shrink-0 w-4 h-4">
                  {tab.favicon || <div className="w-4 h-4 bg-gray-300 rounded-sm" />}
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Regular tabs */}
        {tabs.filter(tab => !tab.isPinned).map((tab, index, filteredTabs) => {
          const isSplitTab = tab.id.includes('airbnb') && tabs.filter(t => t.id.includes('airbnb')).length > 1
          
          const nextTab = filteredTabs[index + 1]
          const showSeparator = isSplitTab && nextTab && nextTab.id.includes('airbnb')
          
          return (
            <React.Fragment key={tab.id}>
              <div
                className={cn(
                  "firefox-tab",
                  "relative flex items-center gap-2 h-9 px-2 py-[5px] rounded cursor-pointer group",
                  isSplitTab ? TAB_WIDTH.SPLIT : TAB_WIDTH.REGULAR,
                  tab.isActive 
                    ? smartWindowMode
                      ? "firefox-tab--active bg-white/50 backdrop-blur-md shadow-[0px_0px_1px_0px_rgba(255,255,255,0.3),0px_1px_2px_0px_rgba(255,255,255,0.2)]"
                      : "firefox-tab--active bg-white shadow-[0px_0px_1px_0px_rgba(0,0,0,0.15),0px_1px_2px_0px_rgba(0,0,0,0.2)]"
                    : smartWindowMode
                      ? "shadow-[0_2px_8px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] bg-white/20 hover:bg-white/30"
                      : "hover:bg-[rgba(21,20,26,0.05)]",
                  draggedTab === tab.id && "opacity-50",
                  dropTargetTab?.id === tab.id && dropTargetTab.before && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500 before:rounded-l",
                  dropTargetTab?.id === tab.id && !dropTargetTab.before && "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-1 after:bg-blue-500 after:rounded-r"
                )}
                data-tab-id={tab.id}
                data-tab-active={tab.isActive}
                role="tab"
                aria-selected={tab.isActive}
                onClick={() => onTabClick?.(tab.id)}
                draggable={!tab.isPinned}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setDraggedTab(tab.id)
                }}
                onDragEnd={() => {
                  setDraggedTab(null)
                  setDropTargetTab(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  
                  if (draggedTab && draggedTab !== tab.id) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const midpoint = rect.left + rect.width / 2
                    const before = e.clientX < midpoint
                    
                    setDropTargetTab({ id: tab.id, before })
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTargetTab(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  
                  if (draggedTab && dropTargetTab && draggedTab !== dropTargetTab.id) {
                    onTabReorder?.(draggedTab, dropTargetTab.id, dropTargetTab.before)
                  }
                  
                  setDraggedTab(null)
                  setDropTargetTab(null)
                }}
              >
              {tab.isActive && (
                <div className="absolute inset-0 rounded border-t-2 border-[#0062fa] pointer-events-none" />
              )}
              
              <div className="shrink-0 w-4 h-4">
                {tab.favicon || <div className="w-4 h-4 bg-gray-300 rounded-sm" />}
              </div>
              
              <span className={cn(
                "flex-1 text-[13px] text-[#15141a] truncate font-sans font-normal tab-title",
                !tab.isActive && "opacity-90"
              )} data-tab-active={tab.isActive ? "true" : "false"}>
                {tab.title}
              </span>
              
              {!tab.isPinned && (
                <button
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(0,0,0,0.08)]"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabClose?.(tab.id)
                  }}
                >
                  <CloseIcon />
                </button>
              )}
              </div>
              {showSeparator && (
                <div className="w-px h-[26px] bg-gray-300/50" />
              )}
            </React.Fragment>
          )
        })}
        
        {!isOverflowing && !shouldHideNewTabButton && (
          <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] shrink-0"
            onClick={() => onNewTab?.()}
          >
            <PlusIcon />
          </button>
        )}
      </div>
      
      {isOverflowing && !shouldHideNewTabButton && !smartWindowMode && (
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)] shrink-0"
          onClick={() => onNewTab?.()}
        >
          <PlusIcon />
        </button>
      )}
      
      {smartWindowMode && (
        <ToolbarActions onNewTab={onNewTab} smartWindowMode={smartWindowMode} />
      )}
      
      {onSmartWindowToggle && (
        <SmartWindowPopover 
          smartWindowMode={smartWindowMode}
          onSmartWindowToggle={onSmartWindowToggle}
        />
      )}
    </div>
  )
}

