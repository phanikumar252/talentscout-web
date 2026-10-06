import { api } from '@/api/apiSlice';
import { createAppAsyncThunk } from '@/app/withTypes';
import { signedOut } from '@/features/session/sessionSlice';
import { ApiError, apiFetch, isAbortError } from '@/lib/httpClient';
import { readNdjson } from '@/lib/streams';
import type { ChatMessage, ChatStreamEvent } from '@/types/api';
import { pageChanged, replyDelta, selectionCleared, stepReceived, turnFailed, turnFinished, turnStarted } from './workspaceSlice';

/**
 * Sends a chat message and consumes the NDJSON stream, translating each event
 * into Redux actions and RTK Query cache updates.
 *
 * Cancel with the promise returned by dispatch:  const p = dispatch(sendChatMessage(..)); p.abort();
 * The thunk's `signal` is passed to fetch, so aborting closes the HTTP stream and
 * the server stops working on it.
 */
export const sendChatMessage = createAppAsyncThunk(
  'workspace/sendChatMessage',
  async ({ searchId, text }: { searchId: string; text: string }, { dispatch, getState, signal, rejectWithValue }) => {
    dispatch(turnStarted(text));
    let userMessageId = `local-${Date.now()}`;

    try {
      const response = await apiFetch(`/searches/${searchId}/chat`, {
        method: 'POST',
        body: { text },
        token: getState().session.token,
        signal,
        timeoutMs: null,
        headers: { Accept: 'application/x-ndjson' },
      });
      if (!response.body) throw new Error('The server returned an empty stream');

      for await (const event of readNdjson<ChatStreamEvent>(response.body)) {
        switch (event.type) {
          case 'ack':
            userMessageId = event.messageId;
            break;
          case 'step':
            dispatch(stepReceived({ id: event.id, label: event.label }));
            break;
          case 'criteria':
            // Criteria panel and results update as soon as the assistant understands
            // the request, while the reply text is still streaming.
            dispatch(
              api.util.updateQueryData('getSearch', searchId, (draft) => {
                draft.criteria = event.criteria;
              }),
            );
            dispatch(pageChanged(1));
            dispatch(selectionCleared());
            dispatch(api.util.invalidateTags([{ type: 'Candidates', id: searchId }]));
            break;
          case 'delta':
            dispatch(replyDelta(event.text));
            break;
          case 'done': {
            const reply = getState().workspace.liveTurn?.reply ?? '';
            const now = new Date().toISOString();
            const turn: ChatMessage[] = [
              { id: userMessageId, searchId, role: 'user', content: text, meta: null, createdAt: now },
              { id: event.messageId, searchId, role: 'assistant', content: reply, meta: { total: event.total }, createdAt: now },
            ];
            // Append the finished turn to the cached transcript instead of refetching it,
            // so the conversation doesn't flicker when the live turn is cleared.
            dispatch(
              api.util.updateQueryData('getSearch', searchId, (draft) => {
                draft.messages.push(...turn);
              }),
            );
            dispatch(api.util.invalidateTags([{ type: 'Project', id: 'LIST' }]));
            dispatch(turnFinished());
            return { total: event.total };
          }
          case 'error':
            throw new Error(event.message);
        }
      }
      throw new Error('The response ended unexpectedly');
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        // User cancelled or navigated away: drop the live turn, resync from the server.
        dispatch(turnFinished());
        dispatch(api.util.invalidateTags([{ type: 'Search', id: searchId }]));
        return rejectWithValue('cancelled');
      }
      if (error instanceof ApiError && error.status === 401) dispatch(signedOut());
      const message = error instanceof Error ? error.message : 'The assistant failed to respond';
      dispatch(turnFailed(message));
      return rejectWithValue(message);
    }
  },
  {
    // Ignore a second send while one is still streaming.
    condition: (_arg, { getState }) => getState().workspace.liveTurn?.status !== 'streaming',
  },
);
