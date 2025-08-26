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

  // Build the full suggestion list: Chat, Google Search, then Google results
  const allSuggestions: AutocompleteSuggestion[] = [];
  
  // First suggestion: Chat
  allSuggestions.push({
    text: query,
    type: 'chat',
  });
  
  // Second suggestion: Search with Google
  allSuggestions.push({
    text: query,
    type: 'google-search',
  });
  
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
          const isFirstGoogleResult = suggestion.type === 'google-result' && 
            allSuggestions.slice(0, index).filter(s => s.type === 'google-result').length === 0;
          
          return (
            <li
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              className={`${styles.suggestionItem} ${
                isSelected ? styles.suggestionItemSelected : ''
              } ${
                isFirstGoogleResult ? styles.suggestionItemHighlighted : ''
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