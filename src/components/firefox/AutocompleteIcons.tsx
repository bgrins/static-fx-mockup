import React from 'react';

export const ChatIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="currentColor" 
      className={className}
    >
      <path d="M3 8c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5c-.6 0-1.2-.1-1.7-.3L3 14v-3.3C2.4 9.9 2 9 2 8h1z"/>
    </svg>
  );
};

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-4 h-4 ${className}`}>
      <img 
        src="http://localhost:3845/assets/8724e5fd6bfbfd720929f08c3e3cf4db08f8aa4f.png" 
        alt="Google" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};