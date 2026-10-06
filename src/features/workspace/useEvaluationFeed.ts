import { useEffect } from 'react';
import { patchCandidates } from '@/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/app/withTypes';
import { selectToken } from '@/features/session/sessionSlice';
import { ApiError, apiFetch } from '@/lib/httpClient';
import { readSse } from '@/lib/streams';
import type { EvaluationStreamEvent } from '@/types/api';
import { evaluationProgressReceived } from './workspaceSlice';

const MAX_BACKOFF_MS = 15_000;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

/**
 * Subscribes to the search's evaluation event stream (SSE) for as long as the
 * workspace is open. Each event patches the cached result pages in place, so
 * the list updates without refetching.
 *
 * fetch-based rather than EventSource: EventSource cannot send an
 * Authorization header. Reconnects with exponential backoff.
 */
export function useEvaluationFeed(searchId: string) {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      let attempt = 0;
      while (!signal.aborted) {
        try {
          const response = await apiFetch(`/searches/${searchId}/evaluations/stream`, {
            token,
            signal,
            timeoutMs: null,
            headers: { Accept: 'text/event-stream' },
          });
          attempt = 0;
          if (!response.body) throw new Error('Empty event stream');

          for await (const message of readSse(response.body)) {
            const event = { event: message.event, data: JSON.parse(message.data) } as EvaluationStreamEvent;
            if (event.event === 'snapshot') {
              dispatch(evaluationProgressReceived(event.data.progress));
            } else if (event.event === 'evaluation') {
              const { candidateId, evaluation, progress } = event.data;
              dispatch(evaluationProgressReceived(progress));
              dispatch(patchCandidates(searchId, [candidateId], (item) => void (item.evaluation = evaluation)));
            }
          }
        } catch (error) {
          if (signal.aborted) return;
          // Auth/not-found won't fix themselves by retrying.
          if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return;
        }
        await wait(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt++), signal);
      }
    };

    void run();
    return () => controller.abort();
  }, [dispatch, searchId, token]);
}
