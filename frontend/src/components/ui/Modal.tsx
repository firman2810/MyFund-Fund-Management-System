import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Square dialog: ink header strip, white body, optional footer row. onClose omitted = no close button (e.g. while submitting).
// Portalled to <body>: the page's fade-in transform would otherwise trap `position: fixed` inside the content area.
export const Modal: React.FC<{
  titleId: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  footer?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
}> = ({ titleId, title, subtitle, onClose, footer, width = 'max-w-xl', children }) => createPortal(
  <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 flex items-center justify-center p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`bg-surface border-[1.5px] border-ink ${width} w-full text-ink animate-fade-in`}
    >
      <div className="bg-ink text-white pl-6 pr-2 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 id={titleId} className="m-0 font-display font-normal text-[22px] leading-[1.15]">{title}</h3>
          {subtitle && <span className="font-mono text-[11px] text-bar-sub">{subtitle}</span>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-11 h-11 shrink-0 flex items-center justify-center text-bar-muted hover:text-white cursor-pointer focus-visible:outline-remaining"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        )}
      </div>
      {children}
      {footer && (
        <div className="px-6 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3">{footer}</div>
      )}
    </div>
  </div>,
  document.body
);
