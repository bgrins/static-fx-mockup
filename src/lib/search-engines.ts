export type SearchEngine = "google" | "duckduckgo" | "bing";

export interface SearchEngineConfig {
  id: SearchEngine;
  name: string;
  searchUrl: string;
  placeholder: string;
  icon?: string;
}

export const SEARCH_ENGINES: Record<SearchEngine, SearchEngineConfig> = {
  google: {
    id: "google",
    name: "Google",
    searchUrl: "https://www.google.com/search?q=",
    placeholder: "Search with Google or enter address",
  },
  duckduckgo: {
    id: "duckduckgo",
    name: "DuckDuckGo",
    searchUrl: "https://duckduckgo.com/?q=",
    placeholder: "Search with DuckDuckGo or enter address",
  },
  bing: {
    id: "bing",
    name: "Bing",
    searchUrl: "https://www.bing.com/search?q=",
    placeholder: "Search with Bing or enter address",
  },
};

export const DEFAULT_SEARCH_ENGINE: SearchEngine = "duckduckgo";

const STORAGE_KEY = "firefox-search-engine";

export function getSearchEngine(): SearchEngine {
  if (typeof window === "undefined") {
    return DEFAULT_SEARCH_ENGINE;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  console.log("[Search Engine] Retrieved from localStorage:", stored);
  if (stored && stored in SEARCH_ENGINES) {
    console.log("[Search Engine] Using stored engine:", stored);
    return stored as SearchEngine;
  }

  console.log("[Search Engine] Using default:", DEFAULT_SEARCH_ENGINE);
  return DEFAULT_SEARCH_ENGINE;
}

export function setSearchEngine(engine: SearchEngine): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, engine);
  }
}

export function getSearchUrl(query: string, engine?: SearchEngine): string {
  const searchEngine = engine || getSearchEngine();
  const config = SEARCH_ENGINES[searchEngine];
  const url = `${config.searchUrl}${encodeURIComponent(query)}`;
  console.log("[Search Engine] Creating search URL:", { query, engine: searchEngine, url });
  return url;
}

export function isURL(input: string): boolean {
  // Check for protocol
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return true;
  }

  // Check for common TLDs or domain patterns
  const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]+)?(\/.*)?$/;
  if (domainPattern.test(input)) {
    return true;
  }

  // Check for localhost or IP addresses
  if (input.startsWith("localhost") || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(input)) {
    return true;
  }

  // Check for about: pages
  if (input.startsWith("about:")) {
    return true;
  }

  return false;
}

export function processNavigationInput(value: string): string {
  console.log("[Search Engine] Processing navigation input:", value);
  if (!value.trim()) {
    return value;
  }

  if (isURL(value)) {
    console.log("[Search Engine] Input is a URL");
    // Add https:// if missing
    if (
      !value.startsWith("http://") &&
      !value.startsWith("https://") &&
      !value.startsWith("about:")
    ) {
      return `https://${value}`;
    }
    return value;
  }

  // Otherwise, it's a search query
  console.log("[Search Engine] Input is a search query, converting to search URL");
  return getSearchUrl(value);
}
