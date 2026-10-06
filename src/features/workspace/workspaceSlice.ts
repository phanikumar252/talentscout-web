import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/apiSlice';
import { signedOut } from '@/features/session/sessionSlice';
import type { EvaluationProgress, StepInfo } from '@/types/api';

/** The assistant turn currently streaming in (not persisted until `done`). */
export interface LiveTurn {
  userText: string;
  steps: StepInfo[];
  reply: string;
  status: 'streaming' | 'failed';
  error?: string;
}

export interface WorkspaceState {
  searchId: string | null;
  liveTurn: LiveTurn | null;
  /** Array, not Set: Redux state must stay serializable. */
  selectedIds: string[];
  page: number;
  pageSize: number;
  evaluationProgress: EvaluationProgress | null;
  summaryCandidateId: string | null;
}

const initialState: WorkspaceState = {
  searchId: null,
  liveTurn: null,
  selectedIds: [],
  page: 1,
  pageSize: 10,
  evaluationProgress: null,
  summaryCandidateId: null,
};

/**
 * Client-only state for the search workspace. Server data (messages, criteria,
 * candidates) lives in the RTK Query cache; this slice holds what the server
 * doesn't know: the in-flight stream, selection, paging and the open dialog.
 */
export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    workspaceOpened(state, action: PayloadAction<string>) {
      if (state.searchId === action.payload) return state;
      return { ...initialState, searchId: action.payload };
    },

    turnStarted(state, action: PayloadAction<string>) {
      state.liveTurn = { userText: action.payload, steps: [], reply: '', status: 'streaming' };
    },
    stepReceived(state, action: PayloadAction<StepInfo>) {
      state.liveTurn?.steps.push(action.payload); // Immer: "mutations" become immutable updates
    },
    replyDelta(state, action: PayloadAction<string>) {
      if (state.liveTurn) state.liveTurn.reply += action.payload;
    },
    turnFinished(state) {
      state.liveTurn = null;
    },
    turnFailed(state, action: PayloadAction<string>) {
      if (state.liveTurn) {
        state.liveTurn.status = 'failed';
        state.liveTurn.error = action.payload;
      }
    },

    selectionToggled(state, action: PayloadAction<string>) {
      const index = state.selectedIds.indexOf(action.payload);
      if (index === -1) state.selectedIds.push(action.payload);
      else state.selectedIds.splice(index, 1);
    },
    selectionSet(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
    },
    selectionCleared(state) {
      state.selectedIds = [];
    },
    pageChanged(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    evaluationProgressReceived(state, action: PayloadAction<EvaluationProgress>) {
      state.evaluationProgress = action.payload;
    },
    summaryOpened(state, action: PayloadAction<string>) {
      state.summaryCandidateId = action.payload;
    },
    summaryClosed(state) {
      state.summaryCandidateId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      // React to an RTK Query mutation from another slice: no extra dispatch needed.
      .addMatcher(api.endpoints.startEvaluations.matchFulfilled, (state, action) => {
        state.evaluationProgress = action.payload.progress;
        state.selectedIds = [];
      });
  },
  selectors: {
    selectLiveTurn: (state) => state.liveTurn,
    selectIsStreaming: (state) => state.liveTurn?.status === 'streaming',
    selectSelectedIds: (state) => state.selectedIds,
    selectPage: (state) => state.page,
    selectPageSize: (state) => state.pageSize,
    selectEvaluationProgress: (state) => state.evaluationProgress,
    selectSummaryCandidateId: (state) => state.summaryCandidateId,
  },
});

export const {
  workspaceOpened,
  turnStarted,
  stepReceived,
  replyDelta,
  turnFinished,
  turnFailed,
  selectionToggled,
  selectionSet,
  selectionCleared,
  pageChanged,
  evaluationProgressReceived,
  summaryOpened,
  summaryClosed,
} = workspaceSlice.actions;

export const {
  selectLiveTurn,
  selectIsStreaming,
  selectSelectedIds,
  selectPage,
  selectPageSize,
  selectEvaluationProgress,
  selectSummaryCandidateId,
} = workspaceSlice.selectors;
