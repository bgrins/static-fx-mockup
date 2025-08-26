import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react'
import { cn } from '~/lib/utils'
import type { AddressBarProps as BaseAddressBarProps } from '~/types/browser'

interface AddressBarProps extends BaseAddressBarProps {
  showSecurity?: boolean | undefined
}

export interface AddressBarHandle {
  focus: () => void
}

export const AddressBar = forwardRef<AddressBarHandle, AddressBarProps>(function AddressBar({ 
  url = '', 
  onNavigate,
  showSecurity = true,
  className
}, ref) {
  const [value, setValue] = useState(url === 'about:blank' ? '' : url)
  const [isFocused, setIsFocused] = useState(url === 'about:blank')
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Expose focus method through ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsFocused(true)
      setValue(url === 'about:blank' ? '' : url)
      // Focus the input after state update
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }), [url])
  
  // Update value when URL prop changes
  React.useEffect(() => {
    setValue(url === 'about:blank' ? '' : url)
  }, [url])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if the input looks like a URL
    const isURL = (input: string): boolean => {
      // Check for protocol
      if (input.startsWith('http://') || input.startsWith('https://')) {
        return true
      }
      
      // Check for common TLDs or domain patterns
      const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]+)?(\/.*)?$/
      if (domainPattern.test(input)) {
        return true
      }
      
      // Check for localhost or IP addresses
      if (input.startsWith('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(input)) {
        return true
      }
      
      // Check for about: pages
      if (input.startsWith('about:')) {
        return true
      }
      
      return false
    }
    
    let navigateUrl = value
    
    if (!isURL(value) && value.trim() !== '') {
      // If not a URL, search on DuckDuckGo
      navigateUrl = `https://duckduckgo.com/?q=${encodeURIComponent(value)}`
    } else if (isURL(value) && !value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('about:')) {
      // Add https:// if missing
      navigateUrl = `https://${value}`
    }
    
    onNavigate?.(navigateUrl)
  }
  
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname
    } catch {
      return url
    }
  }
  
  const getPath = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.pathname + urlObj.search
    } catch {
      return ''
    }
  }
  
  const domain = getDomain(url)
  const path = getPath(url)
  
  return (
    <form 
      onSubmit={handleSubmit}
      className={cn(
        "bg-[rgba(21,20,26,0.07)] rounded h-8 flex items-center px-0.5 transition-all",
        isFocused && "ring-2 ring-[#0062fa] bg-white",
        className
      )}
    >
      {showSecurity && (
        <div className="flex items-center px-1">
          <button 
            type="button"
            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
          >
            <ShieldIcon />
          </button>
          <button 
            type="button"
            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
          >
            <LockIcon />
          </button>
          <button 
            type="button"
            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
          >
            <PermissionsIcon />
          </button>
        </div>
      )}
      
      {isFocused ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setIsFocused(false)}
          className="firefox-address-bar__input flex-1 bg-transparent outline-none text-[15px] font-sans px-2 text-[#15141a]"
          placeholder="Search or enter address"
          data-testid="address-bar-input"
          autoFocus
        />
      ) : (
        <div
          className="flex-1 px-2 text-[15px] font-sans cursor-text flex items-center min-w-0"
          onClick={() => {
            setIsFocused(true)
            setValue(url === 'about:blank' ? '' : url)
          }}
        >
          {url && url !== 'about:blank' ? (
            <div className="flex items-center min-w-0">
              <span className="text-gray-900 flex-shrink-0 url-domain">{domain}</span>
              <span className="text-gray-500 truncate url-path">{path}</span>
            </div>
          ) : (
            <span className="text-gray-400">Search or enter address</span>
          )}
        </div>
      )}
      
      <div className="flex items-center px-1">
        <button 
          type="button"
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-[rgba(21,20,26,0.07)]"
        >
          <StarIcon />
        </button>
      </div>
    </form>
  )
})

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M7.79301 16C7.36301 16 6.93301 15.89 6.55301 15.68C4.91301 14.75 3.40301 13.32 2.29301 11.65C1.72301 10.79 1.32301 9.74 1.10301 8.54L0.543009 5.52C0.343009 4.45 0.85301 3.39 1.81301 2.87L6.54301 0.3C7.28301 -0.1 8.17301 -0.1 8.91301 0.3L13.763 2.91C14.723 3.43 15.233 4.5 15.033 5.57L14.483 8.54C14.263 9.74 13.863 10.78 13.293 11.64C12.193 13.31 10.683 14.75 9.03301 15.68C8.65301 15.9 8.22301 16 7.79301 16ZM7.73301 1.5C7.57301 1.5 7.40301 1.54 7.25301 1.62L2.53301 4.18C2.15301 4.39 1.94301 4.81 2.02301 5.24L2.58301 8.26C2.77301 9.26 3.09301 10.13 3.55301 10.82C4.52301 12.3 5.85301 13.56 7.29301 14.37C7.60301 14.55 7.99301 14.54 8.29301 14.37C9.73301 13.56 11.063 12.29 12.043 10.81C12.503 10.12 12.823 9.26 13.013 8.26L13.563 5.28C13.643 4.85 13.443 4.42 13.053 4.22L8.20301 1.62C8.05301 1.54 7.89301 1.5 7.73301 1.5Z" fill="#5B5B66"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12 7V4C12 1.794 10.206 0 8 0C5.794 0 4 1.794 4 4V7C3.46957 7 2.96086 7.21071 2.58579 7.58579C2.21071 7.96086 2 8.46957 2 9V14C2 14.5304 2.21071 15.0391 2.58579 15.4142C2.96086 15.7893 3.46957 16 4 16H12C12.5304 16 13.0391 15.7893 13.4142 15.4142C13.7893 15.0391 14 14.5304 14 14V9C14 8.46957 13.7893 7.96086 13.4142 7.58579C13.0391 7.21071 12.5304 7 12 7V7ZM5.25 4C5.25 2.483 6.483 1.25 8 1.25C9.517 1.25 10.75 2.483 10.75 4V7H5.25V4ZM12.75 14.15L12.15 14.75H3.85L3.25 14.15V8.85L3.85 8.25H12.15L12.75 8.85V14.15V14.15Z" fill="#5B5B66"/>
    </svg>
  )
}

function PermissionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M13.75 3.5C13.75 2.811 13.189 2.25 12.5 2.25C11.811 2.25 11.25 2.811 11.25 3.5C11.25 4.189 11.811 4.75 12.5 4.75C13.189 4.75 13.75 4.189 13.75 3.5ZM10.7322 1.73223C11.2011 1.26339 11.837 1 12.5 1C13.163 1 13.7989 1.26339 14.2678 1.73223C14.7366 2.20107 15 2.83696 15 3.5C15 4.16304 14.7366 4.79893 14.2678 5.26777C13.7989 5.73661 13.163 6 12.5 6C11.837 6 11.2011 5.73661 10.7322 5.26777C10.2634 4.79893 10 4.16304 10 3.5C10 2.83696 10.2634 2.20107 10.7322 1.73223ZM9.04097 3.06378V3.06378V3.06379C9.02049 3.20741 9 3.35105 9 3.5C9.00119 3.75233 9.02969 4.0038 9.085 4.25H1.625C1.45924 4.25 1.30027 4.18415 1.18306 4.06694C1.06585 3.94973 1 3.79076 1 3.625C1 3.45924 1.06585 3.30027 1.18306 3.18306C1.30027 3.06585 1.45924 3 1.625 3H9.05L9.04097 3.06378ZM3.5 7.25C4.189 7.25 4.75 7.811 4.75 8.5C4.75 9.189 4.189 9.75 3.5 9.75C2.811 9.75 2.25 9.189 2.25 8.5C2.25 7.811 2.811 7.25 3.5 7.25ZM3.5 6C2.83696 6 2.20107 6.26339 1.73223 6.73223C1.26339 7.20107 1 7.83696 1 8.5C1 9.16304 1.26339 9.79893 1.73223 10.2678C2.20107 10.7366 2.83696 11 3.5 11C4.16304 11 4.79893 10.7366 5.26777 10.2678C5.73661 9.79893 6 9.16304 6 8.5C6 7.83696 5.73661 7.20107 5.26777 6.73223C4.79893 6.26339 4.16304 6 3.5 6ZM6.94999 8H14.375C14.5408 8 14.6997 8.06585 14.8169 8.18306C14.9341 8.30027 15 8.45924 15 8.625C15 8.79076 14.9341 8.94973 14.8169 9.06694C14.6997 9.18415 14.5408 9.25 14.375 9.25H6.91499C6.96799 9.008 6.99999 8.758 6.99999 8.5C6.99999 8.35104 6.97951 8.2074 6.95902 8.06378C6.95599 8.04252 6.95296 8.02127 6.94999 8Z" fill="#5B5B66"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4.48722 15.499C4.15122 15.499 3.81622 15.395 3.53022 15.186C3.26553 14.9952 3.06463 14.7289 2.95382 14.422C2.84302 14.1151 2.82747 13.7819 2.90922 13.466L3.76922 10.091L1.08922 7.865C0.837588 7.6577 0.654449 7.37923 0.563801 7.06606C0.473153 6.7529 0.479224 6.41966 0.581218 6.11C0.68104 5.79939 0.872269 5.52612 1.1299 5.32594C1.38753 5.12576 1.69957 5.00798 2.02522 4.988L5.50022 4.763L6.78822 1.526C7.03722 0.903 7.63122 0.5 8.30222 0.5C8.97322 0.5 9.56722 0.903 9.81622 1.526L11.1042 4.763L14.5792 4.988C14.9049 5.00784 15.217 5.12557 15.4747 5.32577C15.7323 5.52597 15.9235 5.79931 16.0232 6.11C16.1253 6.42005 16.1313 6.7537 16.0404 7.06722C15.9496 7.38074 15.7662 7.65951 15.5142 7.867L12.8342 10.092L13.6942 13.467C13.776 13.7829 13.7604 14.1161 13.6496 14.423C13.5388 14.7299 13.3379 14.9962 13.0732 15.187C12.81 15.3801 12.4946 15.489 12.1684 15.4996C11.8421 15.5101 11.5203 15.4217 11.2452 15.246L8.30222 13.385L5.35822 15.246C5.09767 15.411 4.79564 15.4988 4.48722 15.499V15.499ZM8.30222 1.75C8.22592 1.74804 8.15093 1.77004 8.08779 1.81291C8.02465 1.85578 7.97654 1.91736 7.95022 1.989L6.51622 5.592L5.97522 5.985L2.10522 6.236C2.029 6.23906 1.95564 6.26587 1.8954 6.31266C1.83516 6.35946 1.79104 6.42391 1.76922 6.497C1.74405 6.56877 1.74199 6.64662 1.76333 6.71962C1.78468 6.79262 1.82835 6.8571 1.88822 6.904L4.87222 9.383L5.07822 10.018L4.12022 13.776C4.09961 13.8493 4.10252 13.9273 4.12853 13.9988C4.15454 14.0704 4.20235 14.132 4.26522 14.175C4.32822 14.222 4.49522 14.314 4.69122 14.189L7.96922 12.118H8.63722L11.9152 14.189C11.9787 14.2316 12.054 14.2532 12.1305 14.2506C12.2069 14.2481 12.2806 14.2217 12.3412 14.175C12.4036 14.1314 12.4509 14.0695 12.4765 13.9978C12.5021 13.9261 12.5048 13.8483 12.4842 13.775L11.5262 10.017L11.7322 9.382L14.7162 6.904C14.7763 6.85703 14.8201 6.79238 14.8414 6.71917C14.8628 6.64596 14.8606 6.5679 14.8352 6.496C14.8133 6.42298 14.7691 6.35862 14.7089 6.31184C14.6487 6.26507 14.5754 6.23821 14.4992 6.235L10.6302 5.984L10.0892 5.591L8.65422 1.988C8.62748 1.91672 8.57923 1.85552 8.51616 1.81288C8.4531 1.77023 8.37833 1.74826 8.30222 1.75V1.75Z" fill="#5B5B66"/>
    </svg>
  )
}