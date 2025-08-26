import { createFileRoute } from "@tanstack/react-router";
import { BrowserShell } from "~/components/firefox/BrowserShell";
import { SmartToolbar } from "~/components/firefox/SmartToolbar";
import { Toolbar } from "~/components/firefox/Toolbar";
import { FirefoxViewIcon, SparklyFirefoxViewIcon } from "~/components/firefox/Favicons";
import { NewTabPage } from "~/components/firefox/NewTabPage";
import { Sidebar } from "~/components/firefox/Sidebar";
import { MegaChat } from "~/components/assistant-ui/mega-chat";
import { SettingsModal } from "~/components/firefox/SettingsModal";
import { FirefoxView } from "~/components/firefox/FirefoxView";
import { urlToProxy } from "~/utils/proxy";
import { useBrowserScale } from "~/hooks/useBrowserScale";
import { useBrowserCore } from "~/hooks/useBrowserCore";
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";
import { useProfile } from "~/hooks/useProfile";
import React from "react";
import type { AddressBarHandle } from "~/components/firefox/AddressBar";
import type { FirefoxViewHandle } from "~/components/firefox/FirefoxView";
import type { ShortcutHandlers } from "~/types/browser";
import { ABOUT_PAGES, TabType } from "~/constants/browser";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { isLocalPath } from "~/constants/urlShortcuts";

export const Route = createFileRoute("/")({
  component: Browser,
});

function Browser(): React.ReactElement {
  const addressBarRef = React.useRef<AddressBarHandle>(null);
  const firefoxViewRef = React.useRef<FirefoxViewHandle>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false); // For Smart Window mode narrow/expanded
  const [isClient, setIsClient] = React.useState(false);

  // Use profile context for browser state management
  const { browserState, updateBrowserState } = useProfile();
  const smartWindowMode = browserState.windowType === "smart";

  // Use shared browser core functionality
  const {
    tabs,
    activeTab,
    activeTabId,
    updateTab,
    switchTab,
    handleNavigate,
    handleBack,
    handleForward,
    handleRefresh,
    canGoBack,
    canGoForward,
    handleTabClose: coreHandleTabClose,
    handleNewTab: coreHandleNewTab,
    handleTabReorder,
    iframeRefs,
    requestPageInfo,
    requestPageContent,
  } = useBrowserCore({ smartWindowMode });

  // Set isClient to true after mount
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Update Firefox View tab icon when Smart Window mode changes
  React.useEffect(() => {
    updateTab("firefox-view", {
      favicon: smartWindowMode ? <SparklyFirefoxViewIcon /> : <FirefoxViewIcon />,
    });
  }, [smartWindowMode, updateTab]);

  // When smart mode is restored, switch to Firefox View if on blank page
  React.useEffect(() => {
    if (smartWindowMode && activeTab?.url === ABOUT_PAGES.BLANK) {
      switchTab("firefox-view");
    }
  }, [smartWindowMode, activeTab?.url, switchTab]);

  React.useEffect(() => {
    if (smartWindowMode && activeTab?.url) {
      setSidebarExpanded(true);
    }
  }, [activeTab?.url]);

  // Request page content when sidebar is opened or tab changes
  React.useEffect(() => {
    if (sidebarOpen && activeTab) {
      const shouldRequestContent =
        (activeTab.type === TabType.PROXY && activeTab.url !== ABOUT_PAGES.BLANK) ||
        (activeTab.type === TabType.STUB && isLocalPath(activeTab.url || ""));

      if (shouldRequestContent) {
        requestPageInfo();
        requestPageContent();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, activeTabId, activeTab?.type, activeTab?.url]);

  // Debug logging for current URL
  React.useEffect(() => {
    if (activeTab) {
      console.log("[Browser] Active tab changed:", {
        id: activeTab.id,
        url: activeTab.url,
        displayUrl: activeTab.displayUrl,
        title: activeTab.title,
        currentUrl: activeTab?.displayUrl ?? activeTab?.url ?? "",
      });
    }
  }, [activeTab]);

  const handleTabClose = React.useCallback(
    (id: string) => {
      const newActiveTabId = coreHandleTabClose(id);

      // Focus the address bar if we created a new tab
      if (newActiveTabId && tabs.length === 1) {
        setTimeout(() => {
          addressBarRef.current?.focus();
        }, 0);
      }
    },
    [coreHandleTabClose, tabs.length],
  );

  const handleNewTab = (url?: string) => {
    const newTabId = coreHandleNewTab(url);

    // Focus the address bar for the new tab only if no URL provided and not in smart window mode
    if (!url && !smartWindowMode && newTabId) {
      setTimeout(() => {
        addressBarRef.current?.focus();
      }, 0);
    }
  };

  const handleSmartWindowToggle = () => {
    const newSmartWindowMode = !smartWindowMode;
    updateBrowserState({ windowType: newSmartWindowMode ? "smart" : "classic" });

    // When entering Smart Window mode
    if (newSmartWindowMode) {
      // If sidebar was open in classic mode, keep it expanded in smart mode
      if (sidebarOpen) {
        setSidebarExpanded(true);
      }
      // If the current tab is a new tab (about:blank), switch to Firefox View
      if (activeTab?.url === ABOUT_PAGES.BLANK) {
        switchTab("firefox-view");
      }
      // If on a normal tab, keep it selected (do nothing)
    } else {
      // When exiting Smart Window mode
      // If sidebar was expanded in smart mode, keep it open in classic mode
      if (sidebarExpanded) {
        setSidebarOpen(true);
      }
      // If currently on Firefox View, create a new tab and switch to it
      if (activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW) {
        handleNewTab();
      }
    }
  };

  // When smart mode is restored at startup, prune New Tabs
  React.useEffect(() => {
    if (smartWindowMode) {
      // Find all New Tab tabs (about:blank) that are not the Firefox View tab
      const newTabs = tabs.filter(
        (tab) => tab.url === ABOUT_PAGES.BLANK && tab.id !== "firefox-view",
      );

      // Close all New Tab tabs
      newTabs.forEach((tab) => {
        handleTabClose(tab.id);
      });
    }
  }, [smartWindowMode, tabs, handleTabClose]);

  // Calculate scale for mobile
  const { containerStyle, browserStyle } = useBrowserScale();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Setup keyboard shortcuts with proper typing
  const shortcutHandlers: ShortcutHandlers = {
    // Navigation
    back: handleBack,
    forward: handleForward,
    home: () => {
      handleNavigate(ABOUT_PAGES.BLANK);
      toast("Home");
    },
    reload: handleRefresh,
    stop: () => toast("Stop"),

    // Tabs
    newTab: () => {
      // In Smart Window mode, focus Firefox View search instead of creating new tab
      if (smartWindowMode) {
        switchTab("firefox-view");
        // Find the search input and focus it
        const searchInput = document.querySelector(
          'input[placeholder="Search or enter address"]',
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      } else {
        handleNewTab();
      }
    },
    closeTab: () => activeTabId && handleTabClose(activeTabId),
    nextTab: () => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (currentIndex >= 0 && currentIndex < tabs.length - 1) {
        switchTab(tabs[currentIndex + 1]!.id);
      }
    },
    previousTab: () => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (currentIndex > 0) {
        switchTab(tabs[currentIndex - 1]!.id);
      }
    },
    moveTabLeft: () => toast("Move Tab Left"),
    moveTabRight: () => toast("Move Tab Right"),
    moveTabStart: () => toast("Move Tab to Start"),
    moveTabEnd: () => toast("Move Tab to End"),
    pinTab: () => toast("Pin Tab"),
    duplicateTab: () => toast("Duplicate Tab"),

    // Tab selection by number
    selectTab1: () => tabs[0] && switchTab(tabs[0].id),
    selectTab2: () => tabs[1] && switchTab(tabs[1].id),
    selectTab3: () => tabs[2] && switchTab(tabs[2].id),
    selectTab4: () => tabs[3] && switchTab(tabs[3].id),
    selectTab5: () => tabs[4] && switchTab(tabs[4].id),
    selectTab6: () => tabs[5] && switchTab(tabs[5].id),
    selectTab7: () => tabs[6] && switchTab(tabs[6].id),
    selectTab8: () => tabs[7] && switchTab(tabs[7].id),
    selectLastTab: () => tabs.length > 0 && switchTab(tabs[tabs.length - 1]!.id),

    // Find
    find: () => toast("Find in Page"),
    findNext: () => toast("Find Next"),
    findPrevious: () => toast("Find Previous"),

    // Bookmarks
    bookmarkPage: () => toast("Bookmark Page"),
    showBookmarksSidebar: () => toast("Show Bookmarks Sidebar"),

    // History
    showHistorySidebar: () => toast("Show History Sidebar"),

    // UI
    focusAddressBar: () => {
      // In Smart Window mode on Firefox View, focus the search box instead
      if (smartWindowMode && activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW) {
        firefoxViewRef.current?.focusSearch();
      } else {
        addressBarRef.current?.focus();
      }
    },
    toggleSidebar: () => {
      if (smartWindowMode) {
        setSidebarExpanded(!sidebarExpanded);
      } else {
        setSidebarOpen(!sidebarOpen);
      }
    },
    toggleSettings: () => setShowHelp((prev) => !prev),
    pageInfo: () => {
      if (smartWindowMode) {
        setSidebarExpanded((prev) => !prev);
      } else {
        setSidebarOpen((prev) => !prev);
      }
      // If expanding/opening sidebar, we'll need to trigger the Page Info section
      // This will be handled by the Sidebar component's effect
    },

    // Zoom
    zoomIn: () => toast("Zoom In"),
    zoomOut: () => toast("Zoom Out"),
    resetZoom: () => toast("Reset Zoom"),
  };

  const { showHelp, setShowHelp } = useKeyboardShortcuts(shortcutHandlers);

  return (
    <div className="h-[calc(100vh-60px)] bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-5 flex items-start justify-center overflow-hidden">
      <div className="relative" style={containerStyle}>
        <div ref={containerRef} className="flex flex-col absolute" style={browserStyle}>
          {isClient ? (
            <BrowserShell
              ref={addressBarRef}
              tabs={tabs}
              activeTabId={activeTabId}
              currentUrl={activeTab?.displayUrl ?? activeTab?.url ?? ""}
              onTabClick={(tabId) => {
                switchTab(tabId);

                // Focus address bar if clicking on a new tab (about:blank)
                const clickedTab = tabs.find((tab) => tab.id === tabId);
                if (clickedTab?.url === ABOUT_PAGES.BLANK) {
                  setTimeout(() => {
                    addressBarRef.current?.focus();
                  }, 0);
                }
              }}
              onTabClose={handleTabClose}
              onNewTab={handleNewTab}
              onTabReorder={handleTabReorder}
              onNavigate={handleNavigate}
              onBack={handleBack}
              onForward={handleForward}
              onRefresh={handleRefresh}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onSidebarToggle={() => {
                if (smartWindowMode) {
                  setSidebarExpanded(!sidebarExpanded);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              hideToolbar={smartWindowMode && activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW}
              smartWindowMode={smartWindowMode}
              isFirefoxViewActive={activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW}
              onSmartWindowToggle={handleSmartWindowToggle}
              className={cn("flex-1 min-h-0", smartWindowMode && "smart-window-mode")}
            >
              <div className="flex w-full h-full overflow-hidden">
                <div
                  className={cn(
                    "flex-shrink-0 transition-all duration-200 ease-in-out",
                    // In Smart Window mode, hide sidebar when on Firefox View; otherwise show sidebar. In classic mode, use sidebarOpen
                    sidebarExpanded && smartWindowMode
                      ? activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW
                        ? "w-0 overflow-hidden"
                        : "w-[352px] p-1 pr-0"
                      : sidebarOpen
                        ? "w-auto"
                        : "w-0 overflow-hidden",
                  )}
                >
                  {smartWindowMode && activeTab?.url !== ABOUT_PAGES.FIREFOX_VIEW ? (
                    <div className="flex flex-col h-full rounded-xl border border-white/30 shadow-[0px_4px_14px_0px_rgba(0,0,0,0.1)] overflow-hidden">
                      {/* Smart Mode Toolbar - positioned above sidebar */}
                      <SmartToolbar
                        onRefresh={handleRefresh}
                        onClose={() => {
                          setSidebarExpanded(false);
                        }}
                        pageTitle={activeTab?.title}
                        className="shrink-0"
                      />
                      <MegaChat
                        accessKey={
                          typeof window !== "undefined"
                            ? localStorage.getItem("infer-access-key") || ""
                            : ""
                        }
                        onNavigateUrl={(url) => {
                          console.log("[Browser] Navigating to URL from chat:", url);
                          console.log("[Browser] Current active tab:", activeTab?.url);
                          console.log("[Browser] Smart window mode:", smartWindowMode);

                          try {
                            // In Smart Window mode, always create a new tab for URLs
                            if (smartWindowMode) {
                              console.log(
                                "[Browser] Creating new tab for URL in Smart Window mode",
                              );
                              handleNewTab(url);
                            } else {
                              // In classic mode, navigate current tab if it's about:blank, otherwise create new tab
                              if (activeTab?.url === ABOUT_PAGES.BLANK) {
                                console.log("[Browser] Navigating current blank tab");
                                handleNavigate(url);
                              } else {
                                console.log("[Browser] Creating new tab for URL in classic mode");
                                handleNewTab(url);
                              }
                            }
                            console.log("[Browser] Navigation completed");
                            // Expand sidebar to show the page
                            setSidebarExpanded(true);
                          } catch (error) {
                            console.error("[Browser] Navigation error:", error);
                          }
                        }}
                      />
                    </div>
                  ) : !smartWindowMode ? (
                    <div className="flex-1 min-h-0 h-full">
                      <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        accessKey={
                          typeof window !== "undefined"
                            ? localStorage.getItem("infer-access-key") || undefined
                            : undefined
                        }
                        onSidebarToggle={() => {
                          if (smartWindowMode) {
                            setSidebarExpanded(!sidebarExpanded);
                          } else {
                            setSidebarOpen(!sidebarOpen);
                          }
                        }}
                        smartWindowMode={smartWindowMode}
                        isExpanded={sidebarExpanded}
                        isFirefoxViewActive={activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW}
                        onNavigateUrl={(url) => {
                          console.log("[Browser] Navigating to URL from sidebar chat:", url);
                          console.log("[Browser] Current active tab:", activeTab?.url);

                          try {
                            // In classic mode, navigate current tab if it's about:blank, otherwise create new tab
                            if (activeTab?.url === ABOUT_PAGES.BLANK) {
                              console.log("[Browser] Navigating current blank tab");
                              handleNavigate(url);
                            } else {
                              console.log("[Browser] Creating new tab for URL");
                              handleNewTab(url);
                            }
                            console.log("[Browser] Sidebar navigation completed");
                          } catch (error) {
                            console.error("[Browser] Sidebar navigation error:", error);
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "flex flex-1 min-w-0 h-full relative transition-all duration-200 ease-in-out",
                    smartWindowMode && activeTab?.url !== ABOUT_PAGES.FIREFOX_VIEW
                      ? "flex-col pl-1 pt-1"
                      : "overflow-hidden",
                    sidebarOpen && !smartWindowMode && "rounded-tl-lg",
                  )}
                >
                  {/* Render toolbar in smart window mode when not on Firefox View */}
                  {smartWindowMode && activeTab?.url !== ABOUT_PAGES.FIREFOX_VIEW && (
                    <div className="browser-chrome shrink-0">
                      <Toolbar
                        ref={addressBarRef}
                        url={activeTab?.displayUrl ?? activeTab?.url ?? ""}
                        onNavigate={handleNavigate}
                        onNewTab={handleNewTab}
                        onBack={handleBack}
                        onForward={handleForward}
                        onRefresh={handleRefresh}
                        canGoBack={canGoBack}
                        canGoForward={canGoForward}
                        smartMode={smartWindowMode}
                      />
                    </div>
                  )}
                  <div className={"flex-1 relative"}>
                    {/* Render all proxy iframes but only show the active one */}
                    {tabs.map((tab) => {
                      if (tab.type === TabType.PROXY) {
                        return (
                          <iframe
                            key={tab.id}
                            ref={(el) => {
                              if (el) {
                                iframeRefs.current[tab.id] = el;
                              }
                            }}
                            src={urlToProxy(tab.url)}
                            className={cn(
                              "w-full h-full bg-white outline-none",
                              smartWindowMode && activeTab?.url !== ABOUT_PAGES.FIREFOX_VIEW
                                ? "shadow-lg border-l border-black/5"
                                : "absolute inset-0",
                              tab.id === activeTabId && tab.url !== ABOUT_PAGES.BLANK
                                ? "block"
                                : "hidden",
                            )}
                            title={tab.title}
                          />
                        );
                      }
                      // Handle local files (STUB type with local path)
                      if (tab.type === TabType.STUB && isLocalPath(tab.url)) {
                        return (
                          <iframe
                            key={tab.id}
                            ref={(el) => {
                              if (el) {
                                if (iframeRefs.current[tab.id]) {
                                  return;
                                }
                                iframeRefs.current[tab.id] = el;

                                // Inject proxy-tunnel.js - handle both already loaded and loading cases
                                const injectScript = () => {
                                  console.log(
                                    "[LOCAL] Attempting to inject script for:",
                                    tab.url,
                                    "smartWindowMode:",
                                    smartWindowMode,
                                  );
                                  const iframeDoc = el.contentDocument;
                                  const iframeWin = el.contentWindow;

                                  if (iframeDoc && iframeWin) {
                                    console.log(
                                      "[LOCAL] Document ready state:",
                                      iframeDoc.readyState,
                                      "title:",
                                      iframeDoc.title,
                                    );

                                    // Set configuration on the iframe's window
                                    (iframeWin as any).PROXY_TUNNEL_CONFIG = {
                                      PROXY_DOMAIN: import.meta.env.VITE_PROXY_DOMAIN,
                                      ALLOWED_ORIGINS: ["*"],
                                    };

                                    // Create and inject the script tag
                                    const script = iframeDoc.createElement("script");
                                    script.src = "/proxy-tunnel.js";
                                    script.async = true;

                                    script.onload = () => {
                                      console.log(
                                        "[LOCAL] Proxy tunnel script loaded for tab:",
                                        tab.id,
                                      );
                                      console.log(
                                        "[LOCAL] Script loaded, iframe title:",
                                        iframeDoc.title,
                                      );
                                    };
                                    script.onerror = (e) => {
                                      console.error("[LOCAL] Proxy tunnel script error:", e);
                                    };

                                    if (iframeDoc.body) {
                                      iframeDoc.body.appendChild(script);
                                      console.log("[LOCAL] Script tag appended to body");
                                    }
                                    return true;
                                  } else {
                                    console.error(
                                      "[LOCAL] Could not access iframe document/window",
                                    );
                                    return false;
                                  }
                                };

                                // Try to inject immediately if already loaded
                                const tryImmediate = () => {
                                  try {
                                    if (
                                      el.contentDocument &&
                                      (el.contentDocument.readyState === "complete" ||
                                        el.contentDocument.readyState === "interactive")
                                    ) {
                                      console.log(
                                        "[LOCAL] Iframe already loaded, injecting immediately",
                                      );
                                      return injectScript();
                                    }
                                  } catch (e) {
                                    console.log("[LOCAL] Not ready for immediate injection:", e);
                                  }
                                  return false;
                                };

                                // Try immediate injection first, fallback to load event
                                if (!tryImmediate()) {
                                  console.log("[LOCAL] Waiting for load event");
                                  el.addEventListener("load", injectScript, { once: true });
                                }
                              }
                            }}
                            src={tab.url} // Serve local file directly
                            className={cn(
                              "w-full h-full bg-white outline-none",
                              smartWindowMode && activeTab?.url !== ABOUT_PAGES.FIREFOX_VIEW
                                ? "shadow-lg border-l border-black/5"
                                : "absolute inset-0",
                              tab.id === activeTabId ? "block" : "hidden",
                            )}
                            title={tab.title}
                          />
                        );
                      }
                      return null;
                    })}

                    {/* Show special pages for active tab */}
                    {activeTab?.url === ABOUT_PAGES.BLANK && !smartWindowMode && (
                      <NewTabPage onNavigate={handleNavigate} />
                    )}
                    {activeTab?.url === ABOUT_PAGES.BLANK && smartWindowMode && (
                      <div className="flex items-center justify-center h-full bg-[#f9f9fb]">
                        <div className="max-w-6xl mx-auto w-full p-8">
                          <div className="text-center mb-8">
                            <h1 className="text-3xl font-light text-gray-700 mb-4">
                              Smart Window Mode
                            </h1>
                            <p className="text-gray-500 mb-6">
                              AI-powered browsing experience with enhanced features
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                              <h3 className="text-lg font-medium text-gray-800 mb-2">
                                Smart Search
                              </h3>
                              <p className="text-gray-600 text-sm">
                                Enhanced search with AI-powered suggestions and context
                              </p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                              <h3 className="text-lg font-medium text-gray-800 mb-2">
                                Page Analysis
                              </h3>
                              <p className="text-gray-600 text-sm">
                                Automatic page summaries and key information extraction
                              </p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                              <h3 className="text-lg font-medium text-gray-800 mb-2">
                                Smart Bookmarks
                              </h3>
                              <p className="text-gray-600 text-sm">
                                AI-organized bookmarks with automatic categorization
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab?.url === ABOUT_PAGES.FIREFOX_VIEW && (
                      <FirefoxView
                        ref={firefoxViewRef}
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabClick={(tabId) => {
                          switchTab(tabId);
                        }}
                        onTabClose={handleTabClose}
                        onNavigate={handleNavigate}
                        onNewTab={handleNewTab}
                        iframeRefs={iframeRefs}
                        smartWindowMode={smartWindowMode}
                      />
                    )}
                  </div>
                </div>
              </div>
            </BrowserShell>
          ) : null}
        </div>
      </div>
      <SettingsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
