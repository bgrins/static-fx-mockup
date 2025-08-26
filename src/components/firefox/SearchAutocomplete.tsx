import React from 'react';
import { ChatIcon, SearchIcon, NavigationIcon } from './AutocompleteIcons';
import styles from './SearchAutocomplete.module.css';

export interface AutocompleteSuggestion {
  text: string;
  type: 'chat' | 'search' | 'navigation';
  isSelected?: boolean;
}

interface SearchAutocompleteProps {
  googleSuggestions: string[];
  query: string;
  isVisible: boolean;
  selectedIndex: number;
  onSuggestionClick: (suggestion: string, type: 'chat' | 'search' | 'navigation') => void;
  onSuggestionHover: (index: number) => void;
  onSuggestionsBuilt?: (suggestions: AutocompleteSuggestion[]) => void;
}

// Top US websites for prefix matching navigation suggestions
const TOP_US_WEBSITES = [
  'airbnb.com', 'amazon.com', 'apple.com', 'bing.com', 'craigslist.org',
  'ebay.com', 'espn.com', 'etsy.com', 'facebook.com', 'github.com',
  'gmail.com', 'google.com', 'instagram.com', 'linkedin.com', 'microsoft.com',
  'netflix.com', 'pinterest.com', 'reddit.com', 'spotify.com', 'twitter.com',
  'wikipedia.org', 'yahoo.com', 'youtube.com', 'zoom.us', 'adobe.com',
  'airbnb.co', 'alibaba.com', 'americanexpress.com', 'att.com', 'bbc.com',
  'bestbuy.com', 'blogspot.com', 'booking.com', 'chase.com', 'cnn.com',
  'coinbase.com', 'costco.com', 'discord.com', 'dropbox.com', 'duckduckgo.com',
  'expedia.com', 'flickr.com', 'ford.com', 'fox.com', 'glassdoor.com',
  'godaddy.com', 'homedepot.com', 'hulu.com', 'ibm.com', 'ikea.com',
  'imdb.com', 'indeed.com', 'intel.com', 'kayak.com', 'lowes.com',
  'lyft.com', 'macys.com', 'mailchimp.com', 'mapquest.com', 'medium.com',
  'nbc.com', 'nike.com', 'nytimes.com', 'oracle.com', 'paypal.com',
  'quora.com', 'salesforce.com', 'shopify.com', 'slack.com', 'snapchat.com',
  'southwest.com', 'starbucks.com', 'target.com', 'tiktok.com', 'tumblr.com',
  'uber.com', 'ups.com', 'usps.com', 'verizon.com', 'walmart.com',
  'washingtonpost.com', 'wellsfargo.com', 'whatsapp.com', 'x.com', 'zillow.com'
];

// Helper function to find website matches for navigation suggestions
export const findWebsiteMatches = (query: string): string[] => {
  const lowerQuery = query.toLowerCase().trim();
  return TOP_US_WEBSITES
    .filter(site => site.toLowerCase().startsWith(lowerQuery))
    .slice(0, 3); // Limit to top 3 matches
};

// Helper function to detect if a query is likely a question
export const isQuestionQuery = (query: string): boolean => {
  const questionWords = ['who', 'what', 'when', 'where', 'why', 'how'];
  const queryLower = query.toLowerCase().trim();
  
  // Check for direct question word starts
  const startsWithQuestion = questionWords.some(word => 
    queryLower.startsWith(word + ' ') || queryLower === word
  );
  
  // Check for question patterns like "is", "are", "can", "does", "will", "should"
  const auxiliaryVerbs = ['is', 'are', 'can', 'does', 'do', 'did', 'will', 'would', 'should', 'could'];
  const startsWithAuxiliary = auxiliaryVerbs.some(verb =>
    queryLower.startsWith(verb + ' ')
  );
  
  // Check if it ends with a question mark
  const endsWithQuestionMark = queryLower.endsWith('?');
  
  return startsWithQuestion || startsWithAuxiliary || endsWithQuestionMark;
};

export const SearchAutocomplete = React.forwardRef<HTMLDivElement, SearchAutocompleteProps>(({
  googleSuggestions,
  query,
  isVisible,
  selectedIndex,
  onSuggestionClick,
  onSuggestionHover,
  onSuggestionsBuilt,
}, ref) => {
  if (!isVisible || !query.trim()) {
    return null;
  }

  // Detect question words to determine if this is likely a question
  const isQuestion = isQuestionQuery(query);
  
  // Check for website navigation matches
  const websiteMatches = findWebsiteMatches(query);
  
  // Build the full suggestion list based on priority order
  const allSuggestions: AutocompleteSuggestion[] = [];
  
  // Add website navigation suggestions first (highest priority)
  websiteMatches.forEach(website => {
    allSuggestions.push({
      text: website,
      type: 'navigation',
    });
  });
  
  if (isQuestion) {
    // For questions: Chat first, then Google Search
    allSuggestions.push({
      text: query,
      type: 'chat',
    });
    
    allSuggestions.push({
      text: query,
      type: 'search',
    });
  } else {
    // For non-questions: Google Search first, then Chat
    allSuggestions.push({
      text: query,
      type: 'search',
    });
    
    allSuggestions.push({
      text: query,
      type: 'chat',
    });
  }
  
  // Add Google autocomplete results - determine type based on each suggestion
  googleSuggestions.forEach(suggestion => {
    const suggestionIsQuestion = isQuestionQuery(suggestion);
    allSuggestions.push({
      text: suggestion,
      type: suggestionIsQuestion ? 'chat' : 'search',
    });
  });

  if (allSuggestions.length === 0) {
    return null;
  }

  // Notify parent of the built suggestions for keyboard navigation
  React.useEffect(() => {
    onSuggestionsBuilt?.(allSuggestions);
  }, [onSuggestionsBuilt, allSuggestions]);

  const highlightMatchedText = (text: string, query: string) => {
    if (!query || text === query) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);
    
    if (matchIndex === -1) return text;
    
    const beforeMatch = text.slice(0, matchIndex);
    const match = text.slice(matchIndex, matchIndex + query.length);
    const afterMatch = text.slice(matchIndex + query.length);
    
    return (
      <>
        {beforeMatch}
        <strong className={styles.matchHighlight}>{match}</strong>
        {afterMatch}
      </>
    );
  };

  const getSuggestionIcon = (type: AutocompleteSuggestion['type']) => {
    switch (type) {
      case 'search':
        return <SearchIcon />;
      case 'navigation':
        return <NavigationIcon />;
      case 'chat':
      default:
        return <ChatIcon className="opacity-50" />;
    }
  };

  const getSuggestionLabel = (suggestion: AutocompleteSuggestion, query: string) => {
    // Only show suffix for the original query (first two suggestions)
    const isOriginalQuery = suggestion.text === query;
    
    if (isOriginalQuery) {
      switch (suggestion.type) {
        case 'chat':
          return (
            <>
              <span>{highlightMatchedText(suggestion.text, query)}</span>
              <span className={styles.suggestionSuffix}> - Chat</span>
            </>
          );
        case 'search':
          return (
            <>
              <span>{highlightMatchedText(suggestion.text, query)}</span>
              <span className={styles.suggestionSuffix}> - Search with DuckDuckGo</span>
            </>
          );
      }
    }
    
    // For navigation suggestions, just show the website without suffix
    if (suggestion.type === 'navigation') {
      return highlightMatchedText(suggestion.text, query);
    }
    
    // For Google autocomplete results, just show the text without suffix
    return highlightMatchedText(suggestion.text, query);
  };

  return (
    <div ref={ref} className={styles.autocompleteContainer}>
      <ul className={styles.suggestionsList} role="listbox">
        {allSuggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex;
          
          return (
            <li
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              className={`${styles.suggestionItem} ${
                isSelected ? styles.suggestionItemSelected : ''
              }`}
              role="option"
              aria-selected={isSelected}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSuggestionClick(suggestion.text, suggestion.type);
              }}
              onMouseEnter={() => onSuggestionHover(index)}
            >
              <div className={styles.suggestionIcon}>
                {getSuggestionIcon(suggestion.type)}
              </div>
              <span className={styles.suggestionText}>
                {getSuggestionLabel(suggestion, query)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

SearchAutocomplete.displayName = 'SearchAutocomplete';
