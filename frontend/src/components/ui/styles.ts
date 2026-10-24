// Shared class strings for DESIGN.md §5 buttons, links and cards.
const BTN = 'inline-flex items-center justify-center min-h-11 px-[18px] border-[1.5px] border-ink font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_PRIMARY = `${BTN} bg-ink text-white`;
export const BTN_SECONDARY = `${BTN} bg-surface text-ink hover:bg-page`;
export const BTN_ROW = 'min-h-9 px-3 bg-surface border border-border-control text-[13px] cursor-pointer hover:border-ink';
export const LINK = 'text-[13px] font-medium text-ink hover:text-remaining-text cursor-pointer';
export const CARD = 'bg-surface border border-border';
export const CARD_EDITORIAL = 'bg-surface border-t-4 border-ink';
export const H2 = 'm-0 font-display font-normal text-[26px] leading-[1.15]';
export const EYEBROW = 'font-mono text-[11px] text-muted tracking-[0.04em]';
export const LABEL = 'block font-mono text-[11px] text-muted mb-1.5';
export const INPUT = 'w-full min-h-11 px-3 bg-surface border border-border-control text-ink placeholder:text-muted disabled:bg-page';
// Notices: orange means "needs attention"; success is ink with a check, never green.
export const NOTICE_ERROR = 'p-3 border-[1.5px] border-remaining text-remaining-text text-[13px] flex items-start gap-2';
export const NOTICE_OK = 'p-4 bg-surface border-[1.5px] border-ink flex items-start justify-between gap-3';
export const THEAD_ROW = 'border-t-[1.5px] border-t-ink border-b border-b-border font-mono text-[11px] text-muted text-left';
export const TH = 'font-normal px-3 py-2.5';
export const SECTION_HEAD ='flex flex-wrap justify-between items-end gap-3 px-6 pt-5 pb-3.5';
