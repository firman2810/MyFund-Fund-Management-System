export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MYR', 'RM');
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function truncateHash(hash: string, start = 8, end = 8): string {
  if (!hash || hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

// Compact millions for charts and captions: 9650000 -> "9.65M" (callers add "RM " or "Σ ").
export function formatMillions(amount: number): string {
  return `${+(amount / 1e6).toFixed(2)}M`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Compact mono date: "02 MAR 09:40".
export function formatDateShort(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Chart label: "TX-DST-2026-006" -> "DST-006".
export function shortTxId(id: string): string {
  return id.replace(/^TX-/, '').replace(/-\d{4}-/, '-');
}

// Agency code from "National Disaster Management Agency (NADMA)" -> "NADMA".
export function agencyCode(agency: string): string {
  return agency.match(/\(([^)]+)\)\s*$/)?.[1] ?? agency.split(' ')[0];
}
