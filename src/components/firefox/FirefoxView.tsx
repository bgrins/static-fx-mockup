import React, { useEffect, useState, useCallback, useRef } from 'react';
import { OpenGraphPreview } from './OpenGraphPreview';
import { extractOpenGraphFromHTML } from '~/utils/opengraph';
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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

              <div id="logo-wrapper" className="mb-8 flex justify-center">
                <img
                  src={AiModeLogo}
                  alt="AI mode Logo"
                  className="h-10 w-auto"
                />
              </div>

              <div id="search-section" className={styles.searchSection}>

                <form id="search-form" onSubmit={handleSearchSubmit} className={styles.searchForm}>
                  <div id="search-input-wrapper" className={styles.search_bar}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search or enter address"
                      id="search-input"
                      className={styles.searchInput}
                    />
                    <div className={styles.search_controls}>
                      <button
                        className={styles.clear_button}

                      >
                        <i className="fa-solid fa-plus mr-2"></i> Add image, tabs or files
                      </button>

                      <div className="flex items-center gap-4">
                        <button
                          className={styles.clear_button}

                        >
                          <i className="fa-solid fa-microphone"></i>
                        </button>
                        <button
                          className={styles.primary_button}

                        >
                          <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      </div>
                    </div>

                    
                  </div>

                  {/* ACTION BUTTONS  */}
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

