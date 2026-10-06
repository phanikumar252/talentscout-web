import { describe, expect, it } from 'vitest';
import { formatRelative, formatYears, summarizeCriteria } from './format';
import type { SearchCriteria } from '@/types/api';

const criteria: SearchCriteria = {
  titles: ['Frontend Engineer'],
  skills: ['React', 'TypeScript', 'CSS', 'GraphQL', 'Redux'],
  locations: ['Austin', 'Remote'],
  seniority: ['senior'],
  minYears: 5,
  maxYears: null,
  includeCompanies: [],
  excludeCompanies: [],
  openToWorkOnly: false,
};

describe('format helpers', () => {
  it('summarises criteria compactly', () => {
    expect(summarizeCriteria(criteria)).toBe('senior Frontend Engineer · React, TypeScript, CSS, GraphQL +1 · Austin / Remote · 5+ yrs');
  });

  it('formats experience ranges', () => {
    expect(formatYears(2, 5)).toBe('2–5 yrs');
    expect(formatYears(null, 3)).toBe('≤ 3 yrs');
    expect(formatYears(null, null)).toBe('');
  });

  it('formats relative times', () => {
    const now = Date.parse('2026-10-06T12:00:00Z');
    expect(formatRelative('2026-10-06T11:58:00Z', now)).toBe('2 minutes ago');
    expect(formatRelative('2026-10-06T11:59:50Z', now)).toBe('just now');
  });
});
