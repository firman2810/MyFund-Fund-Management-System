import React from 'react';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = () => {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 select-none">
      {/* Ink indeterminate bar on a hairline track; no wording */}
      <div role="status" aria-label="Loading" className="w-48 h-1 bg-border overflow-hidden">
        <div className="h-full w-1/3 bg-ink animate-indeterminate" />
      </div>
    </div>
  );
};
