import React, { useEffect, useState, useCallback, useRef } from 'react';
import { OpenGraphPreview } from './OpenGraphPreview';
import { SearchAutocomplete, isQuestionQuery, type AutocompleteSuggestion } from './SearchAutocomplete';
import { SearchIcon } from './AutocompleteIcons';
import { extractOpenGraphFromHTML } from '~/utils/opengraph';
import { GoogleAutocompleteService } from '~/services/googleAutocomplete';
import { PROXY_MESSAGE_TYPES } from '~/constants/browser';
import type { Tab } from '~/types/browser';
import type { OpenGraphData } from '~/utils/opengraph';
// import { useProfile } from '~/hooks/useProfile'; // Temporarily commented out - will be re-enabled when shortcuts section is added back
import { cn } from '~/lib/utils';
import styles from './FirefoxView.module.css';
import { CloseIcon } from '~/components/icons';
import AiModeLogo from '../../assets/ai-mode-logo.png';

interface FirefoxViewProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNavigate?: (url: string) => void;
  onNewTab?: (url?: string) => void;
  iframeRefs: React.MutableRefObject<{ [key: string]: HTMLIFrameElement | null }>;
  smartWindowMode?: boolean;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

interface ChatState {
  isActive: boolean;
  messages: ChatMessage[];
}

export interface FirefoxViewHandle {
  focusSearch: () => void;
}

interface TabOpenGraphData {
  [tabId: string]: {
    data: OpenGraphData | null;
    loading: boolean;
    error: string | null;
  };
}


export const FirefoxView = React.forwardRef<FirefoxViewHandle, FirefoxViewProps>(({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab,
  iframeRefs,
  smartWindowMode = false
}, ref) => {
  const [tabOpenGraphData, setTabOpenGraphData] = useState<TabOpenGraphData>({});
  const [chatState, setChatState] = useState<ChatState>({
    isActive: false,
    messages: []
  });
  // const { selectedProfile } = useProfile();
  // const shortcuts = selectedProfile?.shortcuts || []; // Temporarily commented out - will be re-enabled when shortcuts section is added back

  // Navigation is now handled centrally in handleNavigate - no special logic needed here

  // Filter out system tabs and get only browsable tabs
  const browsableTabs = tabs.filter(tab =>
    !tab.url.startsWith('about:') &&
    tab.url !== 'about:blank' &&
    tab.id !== activeTabId // Don't show the currently active Firefox View tab
  );

  // Store command IDs to map responses back to tabs
  const [commandToTabMap, setCommandToTabMap] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedQuery, setDisplayedQuery] = useState('');
  const [googleSuggestions, setGoogleSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [previousQueryWasQuestion, setPreviousQueryWasQuestion] = useState<boolean | null>(null);
  const [currentSuggestions, setCurrentSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Expose imperative handle for focusing search
  React.useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (smartWindowMode && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }));

  // Extract OpenGraph data for tabs using proxy tunnel
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === PROXY_MESSAGE_TYPES.RESPONSE &&
        event.data?.command === 'getOuterHTML') {
        const { result, id } = event.data;
        const tabId = commandToTabMap[id];

        if (result && tabId) {
          try {
            const ogData = extractOpenGraphFromHTML(result, tabs.find(t => t.id === tabId)?.url);
            setTabOpenGraphData(prev => ({
              ...prev,
              [tabId]: {
                data: ogData,
                loading: false,
                error: null
              }
            }));
          } catch (error) {
            setTabOpenGraphData(prev => ({
              ...prev,
              [tabId]: {
                data: null,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to extract OpenGraph data'
              }
            }));
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tabs, commandToTabMap]);

  // Send command to specific iframe
  const sendCommandToTab = useCallback((tabId: string, command: string, args: any[] = []) => {
    const iframe = iframeRefs.current[tabId];
    if (!iframe?.contentWindow) {
      console.log(`[FIREFOX VIEW] Cannot send ${command} command to tab ${tabId} - no iframe contentWindow`);
      return;
    }

    const commandId = `cmd-${command}-${tabId}-${Date.now()}`;
    console.log(`[FIREFOX VIEW] Sending ${command} command to tab ${tabId}:`, commandId);

    const message = {
      type: PROXY_MESSAGE_TYPES.COMMAND,
      id: commandId,
      command,
      args,
    };

    console.log(`[FIREFOX VIEW] Posting message to tab iframe:`, message);
    iframe.contentWindow.postMessage(message, "*");
    return commandId;
  }, [iframeRefs]);

  // Request outer HTML for each browsable tab
  useEffect(() => {
    browsableTabs.forEach(tab => {
      // Only fetch if we don't have data yet and tab is not currently active
      if (!tabOpenGraphData[tab.id] && tab.id !== activeTabId) {
        setTabOpenGraphData(prev => ({
          ...prev,
          [tab.id]: {
            data: null,
            loading: true,
            error: null
          }
        }));

        // Request the outer HTML from the tab's iframe
        const commandId = sendCommandToTab(tab.id, 'getOuterHTML');
        if (commandId) {
          setCommandToTabMap(prev => ({
            ...prev,
            [commandId]: tab.id
          }));
        }
      }
    });
  }, [browsableTabs, sendCommandToTab, tabOpenGraphData, activeTabId]);

  // Auto-focus search bar when entering Smart Window mode
  useEffect(() => {
    if (smartWindowMode && searchInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [smartWindowMode]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideInput = searchInputRef.current && searchInputRef.current.contains(target);
      const clickedInsideAutocomplete = autocompleteRef.current && autocompleteRef.current.contains(target);
      
      if (!clickedInsideInput && !clickedInsideAutocomplete) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync displayedQuery with searchQuery when suggestions are hidden
  useEffect(() => {
    if (!showSuggestions || selectedSuggestionIndex === -1) {
      setDisplayedQuery(searchQuery);
    }
  }, [searchQuery, showSuggestions, selectedSuggestionIndex]);

  // Debounced function to fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGoogleSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setPreviousQueryWasQuestion(null);
      return;
    }

    try {
      const result = await GoogleAutocompleteService.getSuggestions(query);
      setGoogleSuggestions(result.suggestions);
      // Always show suggestions when there's a query (even if no Google results)
      setShowSuggestions(true);
      
      // Check if the question status has changed
      const isQuestion = isQuestionQuery(query);
      if (previousQueryWasQuestion !== isQuestion) {
        // Question status changed, reset to first option (which is now the preferred one)
        setSelectedSuggestionIndex(0);
        setPreviousQueryWasQuestion(isQuestion);
      } else if (selectedSuggestionIndex === -1) {
        // No selection yet, set default to first option
        setSelectedSuggestionIndex(0);
      }
      // Otherwise keep existing selection
    } catch (error) {
      console.error('Failed to fetch autocomplete suggestions:', error);
      setGoogleSuggestions([]);
      // Still show Chat and Google search options even if API fails
      setShowSuggestions(true);
      
      // Check if the question status has changed
      const isQuestion = isQuestionQuery(query);
      if (previousQueryWasQuestion !== isQuestion || selectedSuggestionIndex === -1) {
        // Question status changed or no selection yet, set to first option
        setSelectedSuggestionIndex(0);
        setPreviousQueryWasQuestion(isQuestion);
      }
    }
  }, [previousQueryWasQuestion, selectedSuggestionIndex]);

  // Handle search input change with debouncing
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setDisplayedQuery(value);
    setSelectedSuggestionIndex(-1); // Reset selection when user types

    // Don't show autocomplete in chat mode
    if (chatState.isActive) {
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle keyboard navigation in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (chatState.isActive || !showSuggestions || !searchQuery.trim()) {
      return;
    }

    // Use the actual suggestions count from SearchAutocomplete
    const totalSuggestions = currentSuggestions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => {
          const newIndex = prev < totalSuggestions - 1 ? prev + 1 : 0;
          // Update displayed query based on new selection
          const selectedSuggestion = getSuggestionByIndex(newIndex);
          if (selectedSuggestion) {
            setDisplayedQuery(selectedSuggestion.text);
          }
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : totalSuggestions - 1;
          // Update displayed query based on new selection
          const selectedSuggestion = getSuggestionByIndex(newIndex);
          if (selectedSuggestion) {
            setDisplayedQuery(selectedSuggestion.text);
          }
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          // Get the selected suggestion
          const selectedSuggestion = getSuggestionByIndex(selectedSuggestionIndex);
          if (selectedSuggestion) {
            handleSuggestionSelect(selectedSuggestion.text, selectedSuggestion.type);
          }
        } else {
          handleSearchSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        setDisplayedQuery(searchQuery); // Reset to original query
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string, type: 'chat' | 'search' | 'navigation') => {
    if (type === 'chat') {
      // Enter chat mode - stay on the same page
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        text: suggestion,
        isUser: true,
        timestamp: Date.now()
      };
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: `I'm not able to provide real time summarizations about ${suggestion}, but can open a web page and summarize that.`,
        isUser: false,
        timestamp: Date.now() + 1
      };
      
      setChatState({
        isActive: true,
        messages: [userMessage, aiMessage]
      });
      
      setSearchQuery('');
      setDisplayedQuery('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }
    
    // Handle other suggestion types normally
    setSearchQuery(suggestion);
    setDisplayedQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    let navigateUrl: string;
    
    switch (type) {
      case 'navigation':
        // For navigation suggestions, go directly to the website
        navigateUrl = suggestion.startsWith('http') ? suggestion : `https://${suggestion}`;
        break;
      case 'search':
      default:
        // Check if it looks like a URL
        const isURL = suggestion.includes('.') || suggestion.startsWith('http');
        navigateUrl = isURL
          ? (suggestion.startsWith('http') ? suggestion : `https://${suggestion}`)
          : `https://duckduckgo.com?q=${encodeURIComponent(suggestion)}`;
        break;
    }

    onNewTab?.(navigateUrl);
    setSearchQuery('');
    setDisplayedQuery('');
  };

  // Handle mouse hover over suggestions
  const handleSuggestionHover = (index: number) => {
    setSelectedSuggestionIndex(index);
    
    // Update displayed query based on the hovered suggestion
    const selectedSuggestion = getSuggestionByIndex(index);
    if (selectedSuggestion) {
      setDisplayedQuery(selectedSuggestion.text);
    }
  };

  // Get suggestion info by index - now simply uses the actual suggestions array
  const getSuggestionByIndex = (index: number): AutocompleteSuggestion | null => {
    if (index < 0 || index >= currentSuggestions.length) return null;
    return currentSuggestions[index] || null;
  };

  // Get the current suggestion type for UI updates
  const getCurrentSuggestionType = (): 'chat' | 'search' | 'url' | null => {
    if (!searchQuery.trim()) return null;
    
    // If suggestions are shown and something is selected
    if (showSuggestions && selectedSuggestionIndex >= 0) {
      const selectedSuggestion = getSuggestionByIndex(selectedSuggestionIndex);
      
      if (selectedSuggestion) {
        // Navigation suggestions should show as 'url'
        if (selectedSuggestion.type === 'navigation') {
          return 'url';
        }
        // Check if the suggestion text is a URL
        const isURL = selectedSuggestion.text.includes('.') || selectedSuggestion.text.startsWith('http');
        return isURL ? 'url' : selectedSuggestion.type;
      }
    }
    
    // Check if current search query is a URL
    const isURL = searchQuery.includes('.') || searchQuery.startsWith('http');
    if (isURL) return 'url';
    
    // Default behavior when no suggestions or nothing selected
    const isQuestion = isQuestionQuery(searchQuery);
    return isQuestion ? 'chat' : 'search';
  };

  // Handle search form submission - Firefox View should NEVER navigate itself
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      
    if (displayedQuery && displayedQuery.trim()) {
      if (chatState.isActive) {
        // In chat mode, add user message and AI response
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          text: displayedQuery,
          isUser: true,
          timestamp: Date.now()
        };
        
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          text: "I'm not able to provide real time summarizations about today's news, but can open a web page and summarize that.",
          isUser: false,
          timestamp: Date.now() + 1
        };
        
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, userMessage, aiMessage]
        }));
        
        setSearchQuery('');
        setDisplayedQuery('');
        return;
      }
      
      // Default search behavior - search with Google
      const isURL = displayedQuery.includes('.') || displayedQuery.startsWith('http');
      const navigateUrl = isURL
        ? (displayedQuery.startsWith('http') ? displayedQuery : `https://${displayedQuery}`)
        : `https://www.google.com/search?q=${encodeURIComponent(displayedQuery)}`;

      // Firefox View always creates new tabs with the URL directly
      onNewTab?.(navigateUrl);
      setSearchQuery('');
      setDisplayedQuery('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };
  
  // Handle chat suggestion buttons (Search today's news, etc.)
  const handleChatSuggestionClick = (suggestionType: 'search' | 'sites', query: string) => {
    let navigateUrl: string;
    if (suggestionType === 'search') {
      navigateUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    } else {
      // Open top news sites - could be a specific news aggregator
      navigateUrl = `https://duckduckgo.com/?q=${encodeURIComponent('top news sites')}`;
    }
    onNewTab?.(navigateUrl);
  };


  // CRITICAL: Universal navigation handler - Firefox View should NEVER navigate itself
  // const handleSafeNavigation = (url: string) => {
  //   // Firefox View always creates new tabs with the URL directly
  //   onNewTab?.(url);
  // }; // Temporarily commented out - will be re-enabled when shortcuts section is added back

  // Handle tab click - GUARANTEE that in Smart Window mode this NEVER navigates Firefox View
  const handleTabClick = (tabId: string) => {
    // CRITICAL: In Smart Window mode, we MUST ensure Firefox View tab never gets navigated
    // This function should ONLY switch between existing tabs, never cause navigation
    if (smartWindowMode) {
      // SAFETY CHECK: Ensure we're not trying to navigate the active Firefox View tab
      if (tabId === activeTabId) {
        console.warn('[FIREFOX VIEW] Preventing self-navigation in Smart Window mode');
        return;
      }
      // Only switch to existing tabs - no navigation allowed
      onTabClick(tabId);
    } else {
      // In classic mode, normal tab switching
      onTabClick(tabId);
    }
  };


  return (
    <div id="firefox-view-container" className={styles.firefoxViewContainer}>
      <div id="firefox-view-content" className={smartWindowMode ? styles.firefoxViewContentFull : styles.firefoxViewContent}>
        <div id="main-content-wrapper" className={styles.mainContentWrapper}>

          {/* Centered Search Bar (only in Smart Window mode) */}
          {smartWindowMode && (
            <>

              {!chatState.isActive && (
              <div id="logo-wrapper" className="mb-8 flex justify-center">
                <img
                  src={AiModeLogo}
                  alt="AI mode Logo"
                  className="h-10 w-auto"
                />
              </div>
              )}

              <div id="search-section" className={styles.searchSection}>
                {/* Chat Messages Area */}
                {chatState.isActive && (
                  <div className="mb-8 flex flex-col gap-6 max-w-[794px] mx-auto">
                    {chatState.messages.map((message) => (
                      <div key={message.id} className="flex flex-col gap-2.5">
                        {message.isUser ? (
                          /* User Message */
                          <div className="flex justify-end">
                            <div className="bg-[rgba(255,255,255,0.75)] border border-[rgba(189,137,213,0.3)] rounded-[12px] px-3 py-[14.516px] shadow-[0px_0.25px_0.75px_0px_rgba(0,0,0,0.05),0px_2px_6px_0px_rgba(0,0,0,0.1)] max-w-md">
                              <p className="text-[15px] text-[#15141a] font-['SF_Pro:Regular',_sans-serif]">{message.text}</p>
                            </div>
                          </div>
                        ) : (
                          /* AI Message */
                          <div className="flex gap-3 items-start">
                            {/* AI Avatar Line */}
                            <div className="w-[148px] h-px bg-gradient-to-r from-transparent to-gray-300 mt-3" />
                            <div className="flex flex-col gap-6 py-2 max-w-[431px]">
                              <div className="flex flex-col gap-4">
                                <p className="text-[17px] text-[#15141a] font-['SF_Pro:Regular',_sans-serif] leading-[20px]">
                                  {message.text}
                                </p>
                              </div>
                              {/* Chat Suggestion Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleChatSuggestionClick('search', chatState.messages[0]?.text || 'today\'s news')}
                                  className="bg-[rgba(191,143,204,0.2)] border border-[rgba(125,32,124,0.15)] rounded-[58px] px-[17px] py-[14.516px] h-12 flex items-center gap-2 shadow-[0px_0.25px_0.75px_0px_rgba(0,0,0,0.05),0px_2px_6px_0px_rgba(0,0,0,0.1)] mix-blend-multiply hover:bg-[rgba(191,143,204,0.3)] transition-colors"
                                >
                                  <SearchIcon className="w-4 h-4" />
                                  <span className="text-[13px] text-[#15141a] font-['SF_Pro:Regular',_sans-serif]">Search with DuckDuckGo</span>
                                </button>
                                <button
                                  onClick={() => handleChatSuggestionClick('sites', 'top news sites')}
                                  className="bg-[rgba(191,143,204,0.2)] border border-[rgba(125,32,124,0.15)] rounded-[58px] px-[17px] py-[14.516px] h-12 flex items-center gap-2 shadow-[0px_0.25px_0.75px_0px_rgba(0,0,0,0.05),0px_2px_6px_0px_rgba(0,0,0,0.1)] mix-blend-multiply hover:bg-[rgba(191,143,204,0.3)] transition-colors"
                                >
                                  <div className="w-4 h-4">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                      <path d="M12,1H2A1,1 0 0,0 1,2V12A1,1 0 0,0 2,13H12A1,1 0 0,0 13,12V2A1,1 0 0,0 12,1M12,12H2V2H12V12M11,11H3V9H11V11M11,8H3V6H11V8M11,5H3V3H11V5Z" />
                                    </svg>
                                  </div>
                                  <span className="text-[13px] text-[#15141a] font-['SF_Pro:Regular',_sans-serif]">Open top news sites</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form id="search-form" onSubmit={handleSearchSubmit} className={styles.searchForm}>
                  <div id="search-input-wrapper" className={styles.search_bar} style={{ position: 'relative' }}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={displayedQuery}
                      onChange={handleSearchInputChange}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => {
                        if (searchQuery.trim() && !chatState.isActive) {
                          setShowSuggestions(true);
                        }
                      }}
                      placeholder={chatState.isActive ? "Ask more" : "Ask, search, or type a URL"}
                      id="search-input"
                      className={styles.searchInput}
                      autoComplete="off"
                    />

                    {/* Autocomplete suggestions within the same container - hide in chat mode */}
                    {!chatState.isActive && (
                      <SearchAutocomplete
                        ref={autocompleteRef}
                        googleSuggestions={googleSuggestions}
                        query={searchQuery}
                        isVisible={showSuggestions}
                        selectedIndex={selectedSuggestionIndex}
                        onSuggestionClick={handleSuggestionSelect}
                        onSuggestionHover={handleSuggestionHover}
                        onSuggestionsBuilt={setCurrentSuggestions}
                      />
                    )}

                    {/* Add subtle separator between suggestions and controls when suggestions are shown */}
                    {!chatState.isActive && showSuggestions && searchQuery.trim() && (
                      <div style={{ 
                        height: '1px', 
                        background: 'rgba(21, 20, 26, 0.1)', 
                        margin: '8px 10px' 
                      }} />
                    )}

                    <div className={styles.search_controls}>
                      <button
                        className={styles.clear_button}
                        type="button"
                      >
                        <i className="fa-solid fa-plus mr-2"></i> Add images, tabs, files
                      </button>

                      <div className="flex items-center gap-4">
                        <button
                          className={styles.clear_button}
                          type="button"
                        >
                          <i className="fa-solid fa-microphone"></i>
                        </button>
                        
                        {(() => {
                          const suggestionType = getCurrentSuggestionType();
                          
                          if (suggestionType === 'chat') {
                            return (
                              <button
                                className={styles.primary_button}
                                type="submit"
                              >
                                <span>Ask</span>
                                <i className="fa-solid fa-comment ml-2"></i>
                              </button>
                            );
                          } else if (suggestionType === 'search') {
                            return (
                              <button
                                className={styles.primary_button}
                                type="submit"
                              >
                                <span>Search</span>
                                <i className="fa-solid fa-magnifying-glass ml-2"></i>
                              </button>
                            );
                          } else if (suggestionType === 'url') {
                            return (
                              <button
                                className={styles.primary_button}
                                type="submit"
                              >
                                <span>Go</span>
                                <i className="fa-solid fa-arrow-right ml-2"></i>
                              </button>
                            );
                          } else {
                            return (
                              <button
                                className={styles.primary_button}
                                type="submit"
                              >
                                <i className="fa-solid fa-arrow-right"></i>
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS  */
                  !chatState.isActive && (
                    <div className={styles.action_buttons}>
                      <button className={styles.primary_button}>
                        <i className="fa-solid fa-file-lines"></i>
                        <span>Summarize</span>
                      </button>
                      <button className={styles.primary_button}>
                        <i className="fa-solid fa-image"></i>
                        <span>Generate Image</span>
                      </button>
                      <button className={styles.primary_button}>
                        <i className="fa-solid fa-code"></i>
                        <span>Write Code</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}


          {!smartWindowMode && (
            <>
              {/* Header for Classic Mode */}
              <div id="classic-mode-header" className={styles.classicModeHeader}>
                <div id="header-content" className={styles.headerContent}>
                  <div className={styles.headerText}>
                    <h1 className={styles.headerTitle}>Firefox View</h1>
                    <p className={styles.headerDescription}>
                      {browsableTabs.length === 0
                        ? 'No other tabs open'
                        : `${browsableTabs.length} tab${browsableTabs.length === 1 ? '' : 's'} open`}
                    </p>
                  </div>
                </div>
              </div>

              {browsableTabs.length === 0 ? (
                /* Empty State - only show in classic mode */
                <div id="empty-state" className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                      <path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,17H7V15H17V17M17,13H7V11H17V13M17,9H7V7H17V9Z" />
                    </svg>
                  </div>
                  <h3 className={styles.emptyStateTitle}>No other tabs to show</h3>
                  <p className={styles.emptyStateDescription}>
                    Open some web pages to see link previews and manage your browsing session.
                  </p>
                </div>
              ) : browsableTabs.length > 0 ? (
                /* Tab Grid */
                <div id="tabs-grid" className={styles.tabsGrid}>
                  {browsableTabs.map(tab => {
                    const ogData = tabOpenGraphData[tab.id];

                    return (
                      <div key={tab.id} id={`tab-card-${tab.id}`} className={styles.tabCard}>
                        {/* Tab Header */}
                        <div id={`tab-header-${tab.id}`} className={styles.tabHeader}>
                          <div id={`tab-info-${tab.id}`} className={styles.tabInfo}>
                            <div id={`tab-details-${tab.id}`} className={styles.tabDetails}>
                              {/* Favicon */}
                              <div id={`tab-favicon-${tab.id}`} className={styles.tabFavicon}>
                                {tab.favicon || (
                                  <div className={styles.tabFaviconPlaceholder} />
                                )}
                              </div>

                              {/* Title */}
                              <div id={`tab-title-${tab.id}`} className={styles.tabTitleWrapper}>
                                <h3 className={styles.tabTitle}>
                                  {tab.title || 'Loading...'}
                                </h3>
                                <p className={styles.tabUrl}>
                                  {tab.url}
                                </p>
                              </div>
                            </div>

                            {/* Close Button */}
                            <button
                              id={`tab-close-${tab.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                              }}
                              className={styles.tabCloseButton}
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        </div>

                        {/* OpenGraph Preview - only show in classic mode */}
                        {!smartWindowMode && (
                          <div
                            id={`tab-preview-${tab.id}`}
                            className={styles.tabPreview}
                            onClick={() => handleTabClick(tab.id)}
                          >
                            {ogData?.loading ? (
                              <div id={`tab-loading-${tab.id}`} className={styles.tabLoading}>
                                <div className={cn(styles.loadingAnimatePulse, styles.loadingContent)}>
                                  <div className={cn(styles.loadingBar, styles.loadingBarLarge)} />
                                  <div className={cn(styles.loadingBar, styles.loadingBarMedium)} />
                                  <div className={cn(styles.loadingBar, styles.loadingBarSmall)} />
                                </div>
                              </div>
                            ) : ogData?.error ? (
                              <div id={`tab-error-${tab.id}`} className={styles.tabError}>
                                <div className={styles.previewIcon}>
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1,1 0 0,1 11,16A1,1 0 0,1 12,15A1,1 0 0,1 13,16A1,1 0 0,1 12,17M12,14A1,1 0 0,1 11,13V7A1,1 0 0,1 12,6A1,1 0 0,1 13,7V13A1,1 0 0,1 12,14Z" />
                                  </svg>
                                </div>
                                <p className={styles.previewText}>Preview unavailable</p>
                              </div>
                            ) : ogData?.data && Object.keys(ogData.data).length > 0 ? (
                              <div id={`tab-opengraph-${tab.id}`} className={styles.tabOpenGraph}>
                                <OpenGraphPreview
                                  data={ogData.data}
                                  loading={false}
                                  className="shadow-none border-0 bg-transparent p-0"
                                />
                              </div>
                            ) : (
                              <div id={`tab-no-preview-${tab.id}`} className={styles.tabNoPreview}>
                                <div className={styles.previewIcon}>
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                                    <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                                  </svg>
                                </div>
                                <p className={styles.previewText}>No preview available</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div id={`tab-actions-${tab.id}`} className={styles.tabActions}>
                          <button
                            id={`switch-tab-${tab.id}`}
                            onClick={() => handleTabClick(tab.id)}
                            className={styles.switchTabButton}
                          >
                            Switch to Tab
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}



              {/* Footer */}
              {browsableTabs.length > 0 && (
                <div id="footer-section" className={styles.footerSection}>
                  <p className={styles.footerText}>
                    Click on any tab preview to switch to it, or use the close button to close tabs.
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
});

FirefoxView.displayName = 'FirefoxView';

