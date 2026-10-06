import { useAddToShortlistMutation, useGetCandidatesQuery, useStartEvaluationsMutation } from '@/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/app/withTypes';
import { Pager } from '@/components/Pager';
import { Spinner } from '@/components/Spinner';
import { describeError } from '@/lib/errors';
import type { SearchCriteria } from '@/types/api';
import { CandidateCard } from './CandidateCard';
import {
  pageChanged,
  selectEvaluationProgress,
  selectPage,
  selectPageSize,
  selectSelectedIds,
  selectionCleared,
  selectionSet,
} from './workspaceSlice';

const MAX_EVALUATE = 25;

interface Props {
  projectId: string;
  searchId: string;
  criteria: SearchCriteria;
}

export function ResultsPanel({ projectId, searchId, criteria }: Props) {
  const dispatch = useAppDispatch();
  const page = useAppSelector(selectPage);
  const pageSize = useAppSelector(selectPageSize);
  const selectedIds = useAppSelector(selectSelectedIds);
  const progress = useAppSelector(selectEvaluationProgress);

  const { data, isLoading, isFetching, error } = useGetCandidatesQuery({ searchId, page, pageSize });
  const [startEvaluations, evaluation] = useStartEvaluationsMutation();
  const [addToShortlist, shortlisting] = useAddToShortlistMutation();

  const pageIds = data?.items.map((item) => item.id) ?? [];
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const evaluateSelected = () => startEvaluations({ searchId, candidateIds: selectedIds.slice(0, MAX_EVALUATE) });
  const shortlistSelected = async () => {
    await addToShortlist({ projectId, searchId, candidateIds: selectedIds });
    dispatch(selectionCleared());
  };

  return (
    <section className="results" aria-label="Candidates" aria-busy={isFetching}>
      <div className="results__toolbar">
        <div>
          <strong>{data?.total ?? 0}</strong> <span className="muted">matching profiles</span>
          {isFetching && !isLoading && <span className="muted small"> · updating…</span>}
        </div>

        {progress && progress.pending > 0 && (
          <div className="progress" role="status">
            <span className="progress__label">
              Evaluating… {progress.done} done, {progress.pending} left
            </span>
            <progress max={progress.done + progress.pending} value={progress.done} />
          </div>
        )}

        <div className="toolbar">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              disabled={pageIds.length === 0}
              onChange={(e) =>
                dispatch(
                  selectionSet(e.target.checked ? [...new Set([...selectedIds, ...pageIds])] : selectedIds.filter((id) => !pageIds.includes(id))),
                )
              }
            />
            Select page
          </label>
          <button type="button" className="button" disabled={!selectedIds.length || evaluation.isLoading} onClick={evaluateSelected}>
            AI evaluate {selectedIds.length ? `(${Math.min(selectedIds.length, MAX_EVALUATE)})` : ''}
          </button>
          <button type="button" className="button button--primary" disabled={!selectedIds.length || shortlisting.isLoading} onClick={shortlistSelected}>
            Shortlist {selectedIds.length ? `(${selectedIds.length})` : ''}
          </button>
        </div>
      </div>

      {(evaluation.error || shortlisting.error) && <p className="alert alert--error">{describeError(evaluation.error ?? shortlisting.error)}</p>}
      {selectedIds.length > MAX_EVALUATE && <p className="hint">AI evaluation runs on up to {MAX_EVALUATE} candidates at a time.</p>}

      {isLoading && <Spinner label="Finding candidates" />}
      {error && <p className="alert alert--error">{describeError(error)}</p>}
      {data && data.total === 0 && (
        <div className="empty muted">
          {criteria.titles.length || criteria.skills.length || criteria.locations.length
            ? 'No one matches all of that. Try removing a skill or adding "Remote".'
            : 'Results appear here once you describe the role in the chat.'}
        </div>
      )}

      <ul className="results__list">
        {data?.items.map((candidate) => (
          <li key={candidate.id}>
            <CandidateCard candidate={candidate} criteria={criteria} projectId={projectId} searchId={searchId} />
          </li>
        ))}
      </ul>

      {data && <Pager page={page} pageSize={pageSize} total={data.total} onChange={(next) => dispatch(pageChanged(next))} />}
    </section>
  );
}
