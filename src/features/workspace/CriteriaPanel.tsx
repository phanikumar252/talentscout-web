import { useEffect, useState } from 'react';
import { useGetVocabularyQuery, useUpdateCriteriaMutation } from '@/api/apiSlice';
import { TagInput } from '@/components/TagInput';
import { describeError } from '@/lib/errors';
import type { SearchCriteria, Seniority } from '@/types/api';

interface Props {
  searchId: string;
  criteria: SearchCriteria;
}

const toYears = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 50 ? parsed : null;
};

/** Hand-editable view of the structured criteria. Stays in sync with chat edits. */
export function CriteriaPanel({ searchId, criteria }: Props) {
  const { data: vocabulary } = useGetVocabularyQuery();
  const [updateCriteria, { error }] = useUpdateCriteriaMutation();
  const [years, setYears] = useState({ min: '', max: '' });

  // Re-sync the number inputs when chat (or another tab) changes the criteria.
  useEffect(() => {
    setYears({ min: criteria.minYears?.toString() ?? '', max: criteria.maxYears?.toString() ?? '' });
  }, [criteria.minYears, criteria.maxYears]);

  /** Type-safe single-field update: the value type is derived from the key. */
  const update = <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => {
    void updateCriteria({ searchId, criteria: { ...criteria, [key]: value } });
  };

  const commitYears = () => {
    const minYears = toYears(years.min);
    const maxYears = toYears(years.max);
    if (minYears === criteria.minYears && maxYears === criteria.maxYears) return;
    if (minYears != null && maxYears != null && minYears > maxYears) return;
    void updateCriteria({ searchId, criteria: { ...criteria, minYears, maxYears } });
  };

  if (!vocabulary) return <section className="criteria card" aria-busy="true" />;

  return (
    <section className="criteria card" aria-label="Search criteria">
      <div className="criteria__grid">
        <TagInput label="Role" values={criteria.titles} options={vocabulary.titles} onChange={(v) => update('titles', v)} />
        <TagInput label="Skills" values={criteria.skills} options={vocabulary.skills} onChange={(v) => update('skills', v)} />
        <TagInput label="Location" values={criteria.locations} options={vocabulary.locations} onChange={(v) => update('locations', v)} />
        <TagInput
          label="Seniority"
          values={criteria.seniority}
          options={vocabulary.seniority}
          onChange={(v) => update('seniority', v.filter((s): s is Seniority => (vocabulary.seniority as string[]).includes(s)))}
        />
        <TagInput label="Has worked at" values={criteria.includeCompanies} options={vocabulary.companies} allowCustom onChange={(v) => update('includeCompanies', v)} />
        <TagInput
          label="Exclude current employer"
          values={criteria.excludeCompanies}
          options={vocabulary.companies}
          allowCustom
          tone="danger"
          onChange={(v) => update('excludeCompanies', v)}
        />
      </div>

      <div className="criteria__row">
        <fieldset className="years">
          <legend>Experience (years)</legend>
          <input
            aria-label="Minimum years"
            inputMode="numeric"
            placeholder="min"
            value={years.min}
            onChange={(e) => setYears((y) => ({ ...y, min: e.target.value }))}
            onBlur={commitYears}
            onKeyDown={(e) => e.key === 'Enter' && commitYears()}
          />
          <span aria-hidden="true">–</span>
          <input
            aria-label="Maximum years"
            inputMode="numeric"
            placeholder="max"
            value={years.max}
            onChange={(e) => setYears((y) => ({ ...y, max: e.target.value }))}
            onBlur={commitYears}
            onKeyDown={(e) => e.key === 'Enter' && commitYears()}
          />
        </fieldset>
        <label className="checkbox">
          <input type="checkbox" checked={criteria.openToWorkOnly} onChange={(e) => update('openToWorkOnly', e.target.checked)} />
          Only people open to work
        </label>
      </div>
      {error && <p className="alert alert--error">Could not save: {describeError(error)}</p>}
    </section>
  );
}
