import React from "react";
import { useDebug } from "~/contexts/useDebug";
import { useProxyTunnel } from "~/hooks/useProxyTunnel";
import { useTabManager } from "~/hooks/useTabManager";
import { urlToProxy } from "~/utils/proxy";
import { ABOUT_PAGES, TabType, PROXY_MESSAGE_TYPES, type Tab } from "~/constants/browser";
import {
  parseNavigationUrl,
  shouldHandleNavigationLocally,
  canGoBack as checkCanGoBack,
  canGoForward as checkCanGoForward,
  getPreviousUrl,
  getNextUrl,
  getTabTypeForUrl,
} from "~/utils/navigation";
import { isLocalPath, getUrlForLocalPath } from "~/constants/urlShortcuts";
import { DynamicFavicon, FirefoxFavicon } from "~/components/firefox/Favicons";

interface UseBrowserCoreOptions {
  smartWindowMode?: boolean;
  initialTabs?: Tab[];
  initialActiveTabId?: string;
}

/**
 * Core browser functionality that handles navigation, tab management, and page updates.
 * This hook provides shared logic that can be used across different window types.
 */
export function useBrowserCore(options: UseBrowserCoreOptions = {}) {
  const { smartWindowMode = false, initialTabs } = options;
  const { setDebugInfo } = useDebug();
  const iframeRefs = React.useRef<{ [key: string]: HTMLIFrameElement | null }>({});
  const [pageContent, setPageContent] = React.useState<string>("");
  const [proxyNavigationState, setProxyNavigationState] = React.useState<{
    canGoBack: boolean;
    canGoForward: boolean;
  }>({ canGoBack: false, canGoForward: false });

  const {
    tabs,
    activeTab,
    activeTabId,
    updateTab,
    updateActiveTab,
    navigateActiveTab,
    closeTab,
    createTab,
    switchTab,
    reorderTabs,
  } = useTabManager({ smartWindowMode, initialTabs });

  // Handle navigation
  const handleNavigate = React.useCallback(
    (url: string, navigationType?: string) => {
      if (!url || !activeTab) return;

      console.log("[useBrowserCore] Navigating to:", url);
      console.log("[useBrowserCore] isLocalPath:", isLocalPath(url));

      try {
        if (isLocalPath(url)) {
          const realUrl = getUrlForLocalPath(url);
          console.log("[useBrowserCore] Local path detected, real URL:", realUrl);
          console.log("[useBrowserCore] Navigating with url:", url, "displayUrl:", realUrl || url);
          navigateActiveTab({
            url: url,
            navigationType,
            displayUrl: realUrl || url,
          });
        } else {
          const parsedUrl = parseNavigationUrl(url);
          console.log("[useBrowserCore] Parsed URL:", parsedUrl);
          navigateActiveTab({
            url: parsedUrl.fullUrl,
            navigationType,
            displayUrl: parsedUrl.displayUrl,
          });
        }
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    [activeTab, navigateActiveTab],
  );

  // Update debug info whenever active tab changes
  React.useEffect(() => {
    if (activeTab) {
      const proxyUrl =
        activeTab.type === TabType.PROXY && activeTab.url !== ABOUT_PAGES.BLANK
          ? urlToProxy(activeTab.url)
          : undefined;

      setDebugInfo({
        currentTab: {
          url: activeTab.url,
          proxyUrl,
          title: activeTab.title,
          type: activeTab.type,
        },
      });
    }
  }, [activeTab, setDebugInfo]);

  // Get current iframe ref
  const currentIframeRef = React.useMemo(() => {
    return {
      current: activeTab ? iframeRefs.current[activeTab.id] || null : null,
    };
  }, [activeTab]);

  // Use proxy tunnel hook for tab title updates and page content
  const { requestPageInfo, requestPageContent, sendCommand } = useProxyTunnel({
    onNavigate: handleNavigate,
    onPageInfo: (info) => {
      console.log("[useBrowserCore] Received page info:", info);
      updateActiveTab({
        title: info.title || activeTab?.title,
      });
    },
    onPageContent: setPageContent,
    onNavigationStateChange: setProxyNavigationState,
    activeTabUrl: activeTab?.url,
    iframeRef: currentIframeRef,
    enabled:
      (activeTab?.type === TabType.PROXY && activeTab?.url !== ABOUT_PAGES.BLANK) ||
      (activeTab?.type === TabType.STUB && isLocalPath(activeTab?.url || "")),
  });

  // Reset proxy navigation state when switching tabs
  React.useEffect(() => {
    if (activeTab?.type !== TabType.PROXY) {
      setProxyNavigationState({ canGoBack: false, canGoForward: false });
    }
  }, [activeTabId, activeTab?.type]);

  // Memoize navigation states
  const canGoBack = React.useMemo(() => {
    return checkCanGoBack(activeTab, proxyNavigationState.canGoBack);
  }, [activeTab, proxyNavigationState.canGoBack]);

  const canGoForward = React.useMemo(() => {
    return checkCanGoForward(activeTab);
  }, [activeTab]);

  const handleBack = React.useCallback(() => {
    if (!activeTab) return;

    const previous = getPreviousUrl(activeTab);
    if (!previous) return;

    console.log("[useBrowserCore] Previous URL:", previous.url);
    const parsedUrl = parseNavigationUrl(previous.url);
    const shouldHandleLocally = shouldHandleNavigationLocally(activeTab, previous.url);

    if (!shouldHandleLocally) {
      setTimeout(() => {
        sendCommand("goBack");
      }, 0);

      updateActiveTab({
        historyIndex: previous.index,
      });
    } else {
      let displayUrl = parsedUrl.displayUrl;
      if (isLocalPath(previous.url)) {
        const realUrl = getUrlForLocalPath(previous.url);
        displayUrl = realUrl || previous.url;
      }

      updateActiveTab({
        url: previous.url,
        displayUrl: displayUrl,
        historyIndex: previous.index,
        title: previous.url === ABOUT_PAGES.BLANK ? "New Tab" : `Loading...`,
        favicon:
          previous.url === ABOUT_PAGES.BLANK ? (
            <FirefoxFavicon />
          ) : (
            <DynamicFavicon url={displayUrl} />
          ),
        type: getTabTypeForUrl(previous.url),
      });
    }
  }, [activeTab, sendCommand, updateActiveTab]);

  const handleForward = React.useCallback(() => {
    if (!activeTab) return;

    const next = getNextUrl(activeTab);
    if (!next) return;

    const parsedUrl = parseNavigationUrl(next.url);
    const shouldHandleLocally = shouldHandleNavigationLocally(activeTab, next.url);

    if (!shouldHandleLocally && activeTab.url !== ABOUT_PAGES.BLANK) {
      sendCommand("goForward");

      updateActiveTab({
        historyIndex: next.index,
      });
    } else {
      let displayUrl = parsedUrl.displayUrl;
      if (isLocalPath(next.url)) {
        const realUrl = getUrlForLocalPath(next.url);
        displayUrl = realUrl || next.url;
      }

      updateActiveTab({
        url: next.url,
        displayUrl: displayUrl,
        historyIndex: next.index,
        title: next.url === ABOUT_PAGES.BLANK ? "New Tab" : `Loading...`,
        favicon:
          next.url === ABOUT_PAGES.BLANK ? <FirefoxFavicon /> : <DynamicFavicon url={displayUrl} />,
        type: getTabTypeForUrl(next.url),
      });
    }
  }, [activeTab, sendCommand, updateActiveTab]);

  const handleRefresh = React.useCallback(() => {
    if (!activeTab) return;

    if (activeTab.type === TabType.PROXY) {
      updateActiveTab({
        title: `Loading ${new URL(activeTab.url).hostname}...`,
      });

      sendCommand("reload");
    }
  }, [activeTab, updateActiveTab, sendCommand]);

  const handleTabClose = React.useCallback(
    (id: string) => {
      delete iframeRefs.current[id];
      return closeTab(id);
    },
    [closeTab],
  );

  const handleNewTab = React.useCallback(
    (url?: string) => {
      if (smartWindowMode && !url) {
        switchTab("firefox-view");
        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[placeholder="Search or enter address"]',
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 0);
        return;
      }

      return createTab(url);
    },
    [smartWindowMode, switchTab, createTab],
  );

  const handleTabReorder = React.useCallback(
    (draggedTabId: string, targetTabId: string, dropBefore: boolean) => {
      reorderTabs(draggedTabId, targetTabId, dropBefore);
    },
    [reorderTabs],
  );

  // Handle keyboard events forwarded from proxy iframes
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === PROXY_MESSAGE_TYPES.KEYBOARD) {
        const keyboardEvent = new KeyboardEvent("keydown", {
          key: event.data.key,
          code: event.data.code,
          altKey: event.data.altKey,
          ctrlKey: event.data.ctrlKey,
          shiftKey: event.data.shiftKey,
          metaKey: event.data.metaKey,
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(keyboardEvent);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return {
    // Tab management
    tabs,
    activeTab,
    activeTabId,
    updateTab,
    switchTab,

    // Navigation
    handleNavigate,
    handleBack,
    handleForward,
    handleRefresh,
    canGoBack,
    canGoForward,

    // Tab operations
    handleTabClose,
    handleNewTab,
    handleTabReorder,

    // Page content and state
    pageContent,
    iframeRefs,
    requestPageInfo,
    requestPageContent,
  };
}
