import React, { useEffect, useState } from 'react';
import { BTN_ROW } from './styles';

// Rows [start, end) of `page` for `total` items; the page is clamped into range, and nothing to show is still 1 page.
export function pageRange(total: number, size: number, page: number) {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  return { page: p, pages, start, end: Math.min(start + size, total) };
}

// Current page in state; back to page 1 whenever `resetKey` (the filters, joined into a string) changes.
// shortcut: client-side only. Every record is loaded at login; move to server paging once the ledger holds thousands.
export function usePage(total: number, size: number, resetKey = '') {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  return { ...pageRange(total, size, page), total, setPage };
}

const BTN_PAGE = `${BTN_ROW} disabled:text-muted disabled:cursor-not-allowed disabled:hover:border-border-control`;

// "Showing 11–20 of 64 · Previous · Page 2 of 7 · Next". Renders nothing when everything fits on one page; never printed.
export const Pagination: React.FC<{
  page: number;
  pages: number;
  start: number;
  end: number;
  total: number;
  setPage: (page: number) => void;
  label: string;
}> = ({ page, pages, start, end, total, setPage, label }) => {
  if (pages <= 1) return null;
  return (
    <nav aria-label={`${label} pages`} className="px-6 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 print:hidden">
      <span className="text-[13px] text-text-2">Showing {start + 1}–{end} of {total}</span>
      <span className="flex items-center gap-3">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className={BTN_PAGE}>Previous</button>
        <span className="text-[13px] text-text-2" aria-live="polite">Page {page} of {pages}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page === pages} className={BTN_PAGE}>Next</button>
      </span>
    </nav>
  );
};
