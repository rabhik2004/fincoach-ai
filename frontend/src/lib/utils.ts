import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f97316',
  'Transportation': '#3b82f6',
  'Housing & Utilities': '#8b5cf6',
  'Healthcare': '#ec4899',
  'Entertainment': '#f59e0b',
  'Shopping': '#06b6d4',
  'Education': '#10b981',
  'Travel': '#ef4444',
  'Personal Care': '#a78bfa',
  'Savings & Investment': '#22c55e',
  'Other': '#6b7280',
};

export const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Housing & Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',
  'Travel',
  'Personal Care',
  'Savings & Investment',
  'Other',
];

export const INVESTMENT_TYPES = [
  'Stock', 'Mutual Fund', 'ETF', 'Crypto', 'Gold', 'Bond', 'Real Estate', 'Other',
] as const;

export type InvestmentType = typeof INVESTMENT_TYPES[number];

export const SECTORS = [
  'Technology', 'Finance', 'Healthcare', 'Consumer Goods', 'Energy',
  'Utilities', 'Industrials', 'Materials', 'Real Estate', 'Communication',
  'Crypto', 'Commodities', 'Diversified', 'Other',
] as const;

export const INVESTMENT_GOALS = [
  'Retirement', 'Emergency Fund', 'Home Purchase', 'Education', 'Wealth Building', 'Other',
] as const;

export const ASSET_TYPE_COLORS: Record<string, string> = {
  'Stock':       '#3b82f6',
  'Mutual Fund': '#8b5cf6',
  'ETF':         '#06b6d4',
  'Crypto':      '#f59e0b',
  'Gold':        '#eab308',
  'Bond':        '#10b981',
  'Real Estate': '#f97316',
  'Other':       '#6b7280',
};

export const SECTOR_COLORS: Record<string, string> = {
  'Technology':     '#3b82f6',
  'Finance':        '#8b5cf6',
  'Healthcare':     '#ec4899',
  'Consumer Goods': '#f97316',
  'Energy':         '#ef4444',
  'Utilities':      '#06b6d4',
  'Industrials':    '#6366f1',
  'Materials':      '#84cc16',
  'Real Estate':    '#f59e0b',
  'Communication':  '#14b8a6',
  'Crypto':         '#eab308',
  'Commodities':    '#d97706',
  'Diversified':    '#10b981',
  'Other':          '#6b7280',
};

export function formatINR(amount: number | null | undefined): string {
  const safeAmount = Number(amount) || 0;

  if (Math.abs(safeAmount) >= 10000000)
    return `₹${(safeAmount / 10000000).toFixed(2)}Cr`;

  if (Math.abs(safeAmount) >= 100000)
    return `₹${(safeAmount / 100000).toFixed(2)}L`;

  if (Math.abs(safeAmount) >= 1000)
    return `₹${(safeAmount / 1000).toFixed(1)}K`;

  return `₹${safeAmount.toFixed(2)}`;
}

export function getErrorMessage(error: unknown): string {
  if (axios_isAxiosError(error)) {
    return error.response?.data?.error || error.message || 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

function axios_isAxiosError(error: unknown): error is { response?: { data?: { error?: string } }; message: string } {
  return typeof error === 'object' && error !== null && 'response' in error;
}
