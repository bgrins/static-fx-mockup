import { createFileRoute } from "@tanstack/react-router";
import { Browser } from "~/components/firefox/Browser";
import { ABOUT_PAGES, TabType, type Tab } from "~/constants/browser";
import { SparklyFirefoxViewIcon, DynamicFavicon } from "~/components/firefox/Favicons";
import React from "react";

export const Route = createFileRoute("/autumn-search")({
  component: AutumnSearch,
});

function AutumnSearch(): React.ReactElement {
  // DuckDuckGo search URL for "why do leaves change color in autumn"
  const searchQuery = "why do leaves change color in autumn";
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;

  const initialTabs: Tab[] = [
    {
      id: "firefox-view",
      title: "Firefox View",
      url: ABOUT_PAGES.FIREFOX_VIEW,
      favicon: <SparklyFirefoxViewIcon />,
      isPinned: true,
      isActive: false,
      history: [ABOUT_PAGES.FIREFOX_VIEW],
      historyIndex: 0,
      type: TabType.STUB,
    },
    {
      id: "tab-1",
      title: `${searchQuery} - DuckDuckGo`,
      url: searchUrl,
      favicon: <DynamicFavicon url="https://duckduckgo.com" />,
      isActive: true,
      history: [searchUrl],
      historyIndex: 0,
      type: TabType.PROXY,
    },
  ];

  return (
    <Browser
      initialTabs={initialTabs}
      initialActiveTabId="tab-1"
      windowType="smart"
      sidebarExpanded={true}
    />
  );
}
