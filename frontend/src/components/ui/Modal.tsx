import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Square dialog: ink header strip, white body, optional footer row. onClose omitted = no close button (e.g. while submitting).
// Portalled to <body>: the page's fade-in transform would otherwise trap `position: fixed` inside the content area.
// Escape closes it (when closable); focus moves to the dialog on open and back to the previous element on close.
// While open, the app root (#root) is inert, so Tab can't leave the dialog and the page behind is hidden from screen readers.
export const Modal: React.FC<{
  titleId: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  footer?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
}> = ({ titleId, title, subtitle, onClose, footer, width = 'max-w-xl', children }) => {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose; // latest handler: onClose is undefined while submitting
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root?.removeAttribute('inert'); // before restoring focus: an inert element can't take it
      previous?.focus();
    };
  }, []);
  return createPortal(
  <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialog}
      tabIndex={-1}
      className={`outline-none bg-surface border-[1.5px] border-ink ${width} w-full text-ink animate-fade-in`}
    >
      <div className="bg-ink text-white pl-6 pr-2 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 id={titleId} className="m-0 font-display font-normal text-[22px] leading-[1.15]">{title}</h2>
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
};
