import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/autocomplete").methods({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query) {
      return new Response(JSON.stringify({ error: "Query parameter 'q' is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Proxy the request to Google's autocomplete API
      const googleUrl = new URL("https://www.google.com/complete/search");
      googleUrl.searchParams.set("client", "firefox");
      googleUrl.searchParams.set("channel", "ftr");
      googleUrl.searchParams.set("q", query);

      const response = await fetch(googleUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
        },
      });

      if (!response.ok) {
        throw new Error(`Google API responded with status: ${response.status}`);
      }

      const text = await response.text();

      // Google returns JSONP-style response, parse the JSON array
      const jsonMatch = text.match(/^\[.*\]$/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from Google");
      }

      const data = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(data) || data.length < 2) {
        return new Response(JSON.stringify({ query, suggestions: [] }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      const [originalQuery, suggestions, , metadata] = data;

      const result = {
        query: originalQuery,
        suggestions: Array.isArray(suggestions) ? suggestions : [],
        metadata,
      };

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error) {
      console.error("Autocomplete proxy error:", error);

      return new Response(
        JSON.stringify({
          query,
          suggestions: [],
          error: "Failed to fetch autocomplete suggestions",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        },
      );
    }
  },

  OPTIONS: async () => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  },
});
