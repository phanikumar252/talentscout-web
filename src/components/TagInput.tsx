import { useId, useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  /** Accept values that aren't in `options` (e.g. company names). */
  allowCustom?: boolean;
  tone?: 'default' | 'danger';
}

/** Chip list with an autocomplete input (native <datalist>, so it stays accessible). */
export function TagInput({ label, values, options, onChange, allowCustom = false, tone = 'default' }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const inputId = useId();

  const commit = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const match = options.find((option) => option.toLowerCase() === text.toLowerCase());
    const value = match ?? (allowCustom ? text : undefined);
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="tag-input">
      <label className="tag-input__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="tag-input__box">
        {values.map((value) => (
          <span key={value} className={`chip ${tone === 'danger' ? 'chip--danger' : ''}`}>
            {value}
            <button type="button" className="chip__remove" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((v) => v !== value))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          list={listId}
          value={draft}
          placeholder={values.length ? '' : 'Add…'}
          onChange={(event) => {
            const next = event.target.value;
            // Picking from the datalist fires a change with the full option text.
            if (options.includes(next)) commit(next);
            else setDraft(next);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => allowCustom && commit(draft)}
        />
        <datalist id={listId}>
          {options
            .filter((option) => !values.includes(option))
            .map((option) => (
              <option key={option} value={option} />
            ))}
        </datalist>
      </div>
    </div>
  );
}
