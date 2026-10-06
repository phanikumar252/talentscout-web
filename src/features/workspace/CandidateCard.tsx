import { memo, useState } from 'react';
import { useAddToShortlistMutation, useRemoveFromShortlistMutation } from '@/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/app/withTypes';
import type { CandidateResult, SearchCriteria } from '@/types/api';
import { selectionToggled, summaryOpened } from './workspaceSlice';

interface Props {
  candidate: CandidateResult;
  criteria: SearchCriteria;
  projectId: string;
  searchId: string;
}

const scoreTone = (score: number) => (score >= 80 ? 'good' : score >= 60 ? 'ok' : 'low');

/** Memoised: a page re-renders on every streamed evaluation event, but only the changed card should. */
export const CandidateCard = memo(function CandidateCard({ candidate, criteria, projectId, searchId }: Props) {
  const dispatch = useAppDispatch();
  // Select a boolean for this card only, so other cards' selection changes don't re-render it.
  const isSelected = useAppSelector((state) => state.workspace.selectedIds.includes(candidate.id));
  const [addToShortlist] = useAddToShortlistMutation();
  const [removeFromShortlist] = useRemoveFromShortlistMutation();
  const [showChecks, setShowChecks] = useState(false);
  const { evaluation } = candidate;

  return (
    <article className={`candidate card ${isSelected ? 'candidate--selected' : ''}`} aria-labelledby={`cand-${candidate.id}`}>
      <input
        type="checkbox"
        className="candidate__select"
        aria-label={`Select ${candidate.fullName}`}
        checked={isSelected}
        onChange={() => dispatch(selectionToggled(candidate.id))}
      />

      <div className="candidate__body">
        <header className="candidate__header">
          <div>
            <h3 id={`cand-${candidate.id}`}>{candidate.fullName}</h3>
            <p className="muted">{candidate.headline}</p>
          </div>
          <span className={`score score--${scoreTone(candidate.match.score)}`} title="Match score for this search">
            {candidate.match.score}%
          </span>
        </header>

        <p className="candidate__facts">
          <span>
            {candidate.city}, {candidate.country}
            {candidate.remote && ' · remote ok'}
          </span>
          <span>{candidate.yearsExperience} yrs</span>
          <span className="capitalize">{candidate.seniority}</span>
          {candidate.openToWork && <span className="tag tag--green">Open to work</span>}
        </p>

        <ul className="skills" aria-label="Skills">
          {candidate.skills.map((skill) => (
            <li key={skill} className={criteria.skills.includes(skill) ? 'tag tag--match' : 'tag'}>
              {skill}
            </li>
          ))}
        </ul>

        {candidate.match.missing.length > 0 && <p className="small muted">Missing: {candidate.match.missing.join(' · ')}</p>}

        {evaluation && (
          <div className="evaluation">
            {evaluation.status === 'done' && evaluation.verdict ? (
              <button type="button" className={`verdict verdict--${evaluation.verdict}`} onClick={() => setShowChecks((v) => !v)} aria-expanded={showChecks}>
                AI evaluation: {evaluation.verdict} fit · {evaluation.score}%
              </button>
            ) : (
              <span className="verdict verdict--pending">{evaluation.status === 'failed' ? 'Evaluation failed' : `Evaluation ${evaluation.status}…`}</span>
            )}
            {showChecks && evaluation.status === 'done' && (
              <ul className="checks">
                {evaluation.checks.map((check) => (
                  <li key={check.requirement} className={`checks__item checks__item--${check.status}`}>
                    <strong>{check.requirement}</strong>: {check.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="candidate__actions">
        <button type="button" className="button button--small" onClick={() => dispatch(summaryOpened(candidate.id))}>
          {candidate.hasSummary ? 'View summary' : 'AI summary · 1 credit'}
        </button>
        {candidate.shortlisted ? (
          <button type="button" className="button button--small button--success" onClick={() => removeFromShortlist({ projectId, candidateId: candidate.id, searchId })}>
            ✓ Shortlisted
          </button>
        ) : (
          <button type="button" className="button button--small" onClick={() => addToShortlist({ projectId, searchId, candidateIds: [candidate.id] })}>
            Shortlist
          </button>
        )}
      </div>
    </article>
  );
});
