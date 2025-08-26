import React, { useEffect, useState, useRef } from 'react';
import type { Tab } from '~/types/browser';
import { useProfile } from '~/hooks/useProfile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

interface FirefoxViewProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onNavigate?: (url: string) => void;
  onNewTab?: (url?: string) => void;
  iframeRefs: React.MutableRefObject<{ [key: string]: HTMLIFrameElement | null }>;
  smartWindowMode?: boolean;
}

export interface FirefoxViewHandle {
  focusSearch: () => void;
}


export const FirefoxView = React.forwardRef<FirefoxViewHandle, FirefoxViewProps>(({ 
  tabs, 
  activeTabId, 
  onTabClick,
  onNewTab,
  iframeRefs,
  smartWindowMode = false
}, ref) => {
  const { selectedProfile } = useProfile();
  const shortcuts = selectedProfile?.shortcuts || [];

  // Navigation is now handled centrally in handleNavigate - no special logic needed here


  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Expose imperative handle for focusing search
  React.useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (smartWindowMode && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }));



  // Auto-focus search bar when entering Smart Window mode
  useEffect(() => {
    if (smartWindowMode && searchInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [smartWindowMode]);

  // Handle search form submission - Firefox View should NEVER navigate itself
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Check if it looks like a URL
      const isURL = searchQuery.includes('.') || searchQuery.startsWith('http');
      const navigateUrl = isURL 
        ? (searchQuery.startsWith('http') ? searchQuery : `https://${searchQuery}`)
        : `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
      
      // Firefox View always creates new tabs with the URL directly
      onNewTab?.(navigateUrl);
      setSearchQuery('');
    }
  };


  // CRITICAL: Universal navigation handler - Firefox View should NEVER navigate itself
  const handleSafeNavigation = (url: string) => {
    // Firefox View always creates new tabs with the URL directly
    onNewTab?.(url);
  };



  return (
    <div className="h-full relative bg-transparent">
      
      {/* Fixed toolbar header for Smart Window Mode */}
      {smartWindowMode && (
        <div className="sticky top-0 z-20 border-b border-white/20">
          <div className="h-10 flex items-center justify-end px-2 py-1">
            {/* Toolbar icons aligned to the right */}
            <div className="flex items-center gap-1">
              <EmbeddedToolbarIcon icon={<DownloadsIcon />} />
              <EmbeddedToolbarIcon icon={<AccountIcon />} />
              <EmbeddedToolbarIcon icon={<ExtensionsIcon />} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/50 transition-colors relative">
                    <AppMenuIcon />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => searchInputRef.current?.focus()}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2">Focus Search</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      <div className={`${smartWindowMode ? 'overflow-auto h-full' : 'overflow-auto'}`}>
        <div className="max-w-6xl mx-auto p-8">
          
          {/* Header for Classic Mode */}
          {!smartWindowMode && (
            <div className="mb-8 relative">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-3xl font-light text-gray-700 mb-2">Firefox View</h1>
                  <p className="text-gray-500">Your browsing shortcuts</p>
                </div>
              </div>
            </div>
          )}


          {/* Centered Search Bar (only in Smart Window mode) */}
          {smartWindowMode && (
            <div className="mb-8 flex justify-center">
              <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or enter address"
                  className="w-full px-6 py-4 text-lg rounded-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none shadow-sm bg-white"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  <button
                    type="submit"
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Search"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}




        {/* URL Shortcuts Section (only in classic mode) */}
        {!smartWindowMode && (
          <div className="mt-16">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => handleSafeNavigation(shortcut.url)}
                  className="group relative flex flex-col items-center justify-center p-4 h-28 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300 cursor-pointer"
                >
                  <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-xl overflow-hidden bg-gray-50 group-hover:bg-gray-100 transition-colors">
                    {shortcut.favicon ? (
                      <img 
                        src={shortcut.favicon} 
                        alt={shortcut.title}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`fallback-icon w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center text-blue-600 text-lg font-bold ${shortcut.favicon ? 'hidden' : 'flex'}`}>
                      {shortcut.title.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 font-medium truncate w-full text-center px-1 leading-tight">
                    {shortcut.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Additional vertical spacing for scrolling */}
        {smartWindowMode && (
          <div className="h-32" />
        )}
        </div>
      </div>
    </div>
  );
});

FirefoxView.displayName = 'FirefoxView';


function EmbeddedToolbarIcon({ icon, onClick }: { icon: React.ReactNode, onClick?: () => void }) {
  return (
    <button 
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/50 transition-colors relative"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}


function DownloadsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.06694 0.683058C8.18415 0.800269 8.25 0.95924 8.25 1.125V9.447L11.558 6.139C11.6764 6.02662 11.8339 5.96491 11.9971 5.96703C12.1603 5.96915 12.3163 6.03492 12.4317 6.15033C12.5471 6.26574 12.6129 6.42166 12.615 6.58486C12.6171 6.74806 12.5554 6.90564 12.443 7.024L7.966 11.5H7.285L2.807 7.024C2.69462 6.90564 2.63292 6.74806 2.63503 6.58486C2.63715 6.42166 2.70292 6.26574 2.81833 6.15033C2.93374 6.03492 3.08966 5.96915 3.25286 5.96703C3.41606 5.96491 3.57364 6.02662 3.692 6.139L7 9.448V1.125C7 0.95924 7.06585 0.800269 7.18306 0.683058C7.30027 0.565848 7.45924 0.5 7.625 0.5C7.79076 0.5 7.94973 0.565848 8.06694 0.683058ZM13.6642 14.9142C13.2891 15.2893 12.7804 15.5 12.25 15.5H3C2.46957 15.5 1.96086 15.2893 1.58579 14.9142C1.21071 14.5391 1 14.0304 1 13.5V12.125C1 11.9592 1.06585 11.8003 1.18306 11.6831C1.30027 11.5658 1.45924 11.5 1.625 11.5C1.79076 11.5 1.94973 11.5658 2.06694 11.6831C2.18415 11.8003 2.25 11.9592 2.25 12.125V13.65L2.85 14.25H12.4L13 13.65V12.125C13 11.9592 13.0658 11.8003 13.1831 11.6831C13.3003 11.5658 13.4592 11.5 13.625 11.5C13.7908 11.5 13.9497 11.5658 14.0669 11.6831C14.1842 11.8003 14.25 11.9592 14.25 12.125V13.5C14.25 14.0304 14.0393 14.5391 13.6642 14.9142Z" fill="#5B5B66"/>
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.25 8C14.25 4.554 11.446 1.75 8 1.75C4.554 1.75 1.75 4.554 1.75 8C1.75 11.446 4.554 14.25 8 14.25C11.446 14.25 14.25 11.446 14.25 8ZM2.6967 2.6967C4.10322 1.29018 6.01088 0.5 8 0.5C9.98912 0.5 11.8968 1.29018 13.3033 2.6967C14.7098 4.10322 15.5 6.01088 15.5 8C15.5 9.98912 14.7098 11.8968 13.3033 13.3033C11.8968 14.7098 9.98912 15.5 8 15.5C6.01088 15.5 4.10322 14.7098 2.6967 13.3033C1.29018 11.8968 0.5 9.98912 0.5 8C0.5 6.01088 1.29018 4.10322 2.6967 2.6967ZM8 3.5C7.33696 3.5 6.70107 3.76339 6.23223 4.23223C5.76339 4.70107 5.5 5.33696 5.5 6C5.5 6.66304 5.76339 7.29893 6.23223 7.76777C6.70107 8.23661 7.33696 8.5 8 8.5C8.66304 8.5 9.29893 8.23661 9.76777 7.76777C10.2366 7.29893 10.5 6.66304 10.5 6C10.5 5.33696 10.2366 4.70107 9.76777 4.23223C9.29893 3.76339 8.66304 3.5 8 3.5ZM7.99999 12.75C9.91199 12.75 11.571 11.712 12.489 10.181C12.3026 9.96789 12.073 9.79693 11.8154 9.6795C11.5578 9.56208 11.2781 9.50089 10.995 9.5H5.00499C4.40899 9.5 3.87899 9.767 3.51099 10.181C4.42899 11.712 6.08799 12.75 7.99999 12.75Z" fill="#5B5B66"/>
    </svg>
  );
}

function ExtensionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.25 2C6.55921 2 6 2.55921 6 3.25V4.75C6 5.16421 5.66421 5.5 5.25 5.5H2.5C2.22421 5.5 2 5.72421 2 6V7.5H3.25C4.76921 7.5 6 8.73079 6 10.25C6 11.7692 4.76921 13 3.25 13H2V14.5C2 14.7758 2.22421 15 2.5 15H12C12.2758 15 12.5 14.7758 12.5 14.5V6C12.5 5.72421 12.2758 5.5 12 5.5H9.25C8.83579 5.5 8.5 5.16421 8.5 4.75V3.25C8.5 2.55921 7.94079 2 7.25 2ZM4.5 3.25C4.5 1.73079 5.73079 0.5 7.25 0.5C8.76921 0.5 10 1.73079 10 3.25V4H12C13.1042 4 14 4.89579 14 6V14.5C14 15.6042 13.1042 16.5 12 16.5H2.5C1.39579 16.5 0.5 15.6042 0.5 14.5V12.25C0.5 11.8358 0.835786 11.5 1.25 11.5H3.25C3.94079 11.5 4.5 10.9408 4.5 10.25C4.5 9.55921 3.94079 9 3.25 9H1.25C0.835786 9 0.5 8.66421 0.5 8.25V6C0.5 4.89579 1.39579 4 2.5 4H4.5V3.25Z" fill="#5B5B66"/>
    </svg>
  );
}

function AppMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M13.375 3.25H2.625C2.45924 3.25 2.30027 3.18415 2.18306 3.06694C2.06585 2.94973 2 2.79076 2 2.625C2 2.45924 2.06585 2.30027 2.18306 2.18306C2.30027 2.06585 2.45924 2 2.625 2H13.375C13.5408 2 13.6997 2.06585 13.8169 2.18306C13.9342 2.30027 14 2.45924 14 2.625C14 2.79076 13.9342 2.94973 13.8169 3.06694C13.6997 3.18415 13.5408 3.25 13.375 3.25ZM13.375 8.25H2.625C2.45924 8.25 2.30027 8.18415 2.18306 8.06694C2.06585 7.94973 2 7.79076 2 7.625C2 7.45924 2.06585 7.30027 2.18306 7.18306C2.30027 7.06585 2.45924 7 2.625 7H13.375C13.5408 7 13.6997 7.06585 13.8169 7.18306C13.9342 7.30027 14 7.45924 14 7.625C14 7.79076 13.9342 7.94973 13.8169 8.06694C13.6997 8.18415 13.5408 8.25 13.375 8.25ZM2.625 13.25H13.375C13.5408 13.25 13.6997 13.1842 13.8169 13.0669C13.9342 12.9497 14 12.7908 14 12.625C14 12.4592 13.9342 12.3003 13.8169 12.1831C13.6997 12.0658 13.5408 12 13.375 12H2.625C2.45924 12 2.30027 12.0658 2.18306 12.1831C2.06585 12.3003 2 12.4592 2 12.625C2 12.7908 2.06585 12.9497 2.18306 13.0669C2.30027 13.1842 2.45924 13.25 2.625 13.25Z" fill="#5B5B66"/>
    </svg>
  );
}
