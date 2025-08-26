export interface GoogleAutocompleteSuggestion {
  query: string;
  suggestions: string[];
  metadata?: any;
}

export class GoogleAutocompleteService {
  private static readonly PROXY_URL = "/api/autocomplete";

  static async getSuggestions(query: string): Promise<GoogleAutocompleteSuggestion> {
    if (!query.trim()) {
      return { query: "", suggestions: [] };
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
      });

      const response = await fetch(`${this.PROXY_URL}?${params}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        query: data.query || query,
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        metadata: data.metadata,
      };
    } catch (error) {
      console.warn("Google autocomplete API error:", error);
      return { query, suggestions: [] };
    }
  }
}
