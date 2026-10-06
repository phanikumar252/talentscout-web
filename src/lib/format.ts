import type { SearchCriteria } from '@/types/api';

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export function formatYears(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} yrs`;
  if (min != null) return `${min}+ yrs`;
  if (max != null) return `≤ ${max} yrs`;
  return '';
}

/** Compact one-line description, e.g. "Frontend Engineer · React, TypeScript · Austin · 5+ yrs". */
export function summarizeCriteria(criteria: SearchCriteria): string {
  return [
    [...criteria.seniority, ...criteria.titles].join(' '),
    criteria.skills.slice(0, 4).join(', ') + (criteria.skills.length > 4 ? ` +${criteria.skills.length - 4}` : ''),
    criteria.locations.join(' / '),
    formatYears(criteria.minYears, criteria.maxYears),
  ]
    .filter(Boolean)
    .join(' · ');
}
