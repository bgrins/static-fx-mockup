import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { SparklesIcon, WindowIcon, CheckIcon, SmartWindowIcon, FirefoxIcon } from '~/components/icons'
import { cn } from '~/lib/utils'

interface SmartWindowPopoverProps {
  smartWindowMode: boolean
  onSmartWindowToggle: () => void
}

export function SmartWindowPopover({ 
  smartWindowMode, 
  onSmartWindowToggle 
}: SmartWindowPopoverProps) {
  const [open, setOpen] = React.useState(false)

  const handleModeSelect = (mode: 'classic' | 'smart') => {
    if ((mode === 'classic' && smartWindowMode) || (mode === 'smart' && !smartWindowMode)) {
      onSmartWindowToggle()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center ml-2 mr-2",
            "hover:opacity-90 transition-opacity duration-200"
          )}
          title={smartWindowMode ? "Smart Window Mode" : "Classic Mode"}
          data-name="expand right"
        >
          {smartWindowMode ? <SmartWindowIcon /> : <FirefoxIcon />}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 bg-white/95 backdrop-blur-md border border-gray-200 shadow-lg"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col">
          <button
            onClick={() => handleModeSelect('classic')}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded text-sm",
              "hover:bg-gray-100/50 transition-colors",
              !smartWindowMode && "bg-blue-50"
            )}
          >
            <div className="flex items-center gap-2">
              <WindowIcon />
              <span className="font-medium">Classic</span>
            </div>
            {!smartWindowMode && <CheckIcon />}
          </button>
          <button
            onClick={() => handleModeSelect('smart')}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded text-sm",
              "hover:bg-gray-100/50 transition-colors",
              smartWindowMode && "bg-orange-50"
            )}
          >
            <div className="flex items-center gap-2">
              <SparklesIcon />
              <span className="font-medium">Smart</span>
            </div>
            {smartWindowMode && <CheckIcon />}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}