import { useEffect, useRef } from 'react';
import { useFetchSummaryMutation } from '@/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/app/withTypes';
import { Spinner } from '@/components/Spinner';
import { describeError, errorCode } from '@/lib/errors';
import { selectSummaryCandidateId, summaryClosed } from './workspaceSlice';

/** Native <dialog>: focus trapping, Esc to close and a backdrop for free. */
export function SummaryDialog({ searchId }: { searchId: string }) {
  const dispatch = useAppDispatch();
  const candidateId = useAppSelector(selectSummaryCandidateId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fetchSummary, { data, error, isLoading, reset }] = useFetchSummaryMutation();
  // StrictMode runs effects twice in dev; without this guard the second POST would
  // report "already unlocked" for a summary that was just paid for.
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (candidateId) {
      if (!dialog.open) dialog.showModal();
      if (requestedFor.current !== candidateId) {
        requestedFor.current = candidateId;
        reset();
        void fetchSummary({ searchId, candidateId });
      }
    } else {
      requestedFor.current = null;
      if (dialog.open) dialog.close();
    }
  }, [candidateId, searchId, fetchSummary, reset]);

  return (
    <dialog ref={dialogRef} className="dialog" onClose={() => dispatch(summaryClosed())} aria-labelledby="summary-title">
      <h2 id="summary-title">AI candidate summary</h2>
      {isLoading && <Spinner label="Writing summary" />}
      {error && (
        <p className="alert alert--error">
          {errorCode(error) === 'INSUFFICIENT_CREDITS' ? 'You are out of credits. Summaries you already unlocked stay free to view.' : describeError(error)}
        </p>
      )}
      {data && (
        <>
          <p className="summary">{data.summary}</p>
          <p className="hint">
            {data.charged ? `1 credit used · ${data.credits?.remaining ?? '?'} left` : 'Already unlocked: no credit used.'}
          </p>
        </>
      )}
      <form method="dialog" className="dialog__actions">
        <button className="button" type="submit">
          Close
        </button>
      </form>
    </dialog>
  );
}
