import React from 'react';
import { ChatIcon, GoogleIcon } from './AutocompleteIcons';
import styles from './SearchAutocomplete.module.css';

export interface AutocompleteSuggestion {
  text: string;
  type: 'chat' | 'google-search' | 'google-result';
  isSelected?: boolean;
}

interface SearchAutocompleteProps {
  googleSuggestions: string[];
  query: string;
  isVisible: boolean;
  selectedIndex: number;
  onSuggestionClick: (suggestion: string, type: 'chat' | 'google-search' | 'google-result') => void;
  onSuggestionHover: (index: number) => void;
}

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
}, ref) => {
  if (!isVisible || !query.trim()) {
    return null;
  }

  // Detect question words to determine if this is likely a question
  const isQuestion = isQuestionQuery(query);
  
  // Build the full suggestion list based on whether it's a question
  const allSuggestions: AutocompleteSuggestion[] = [];
  
  if (isQuestion) {
    // For questions: Chat first, then Google Search
    allSuggestions.push({
      text: query,
      type: 'chat',
    });
    
    allSuggestions.push({
      text: query,
      type: 'google-search',
    });
  } else {
    // For non-questions: Google Search first, then Chat
    allSuggestions.push({
      text: query,
      type: 'google-search',
    });
    
    allSuggestions.push({
      text: query,
      type: 'chat',
    });
  }
  
  // Add Google autocomplete results
  googleSuggestions.forEach(suggestion => {
    allSuggestions.push({
      text: suggestion,
      type: 'google-result',
    });
  });

  if (allSuggestions.length === 0) {
    return null;
  }

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
      case 'google-search':
        return <GoogleIcon />;
      case 'chat':
      case 'google-result':
      default:
        return <ChatIcon className="opacity-50" />;
    }
  };

  const getSuggestionLabel = (suggestion: AutocompleteSuggestion, query: string) => {
    switch (suggestion.type) {
      case 'chat':
        return (
          <>
            <span>{highlightMatchedText(suggestion.text, query)}</span>
            <span className={styles.suggestionSuffix}> - Chat</span>
          </>
        );
      case 'google-search':
        return (
          <>
            <span>{highlightMatchedText(suggestion.text, query)}</span>
            <span className={styles.suggestionSuffix}> - Search with Google</span>
          </>
        );
      case 'google-result':
      default:
        return highlightMatchedText(suggestion.text, query);
    }
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