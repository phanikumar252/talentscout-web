import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs } from '@reduxjs/toolkit/query/react';
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import { API_BASE_URL } from '@/lib/httpClient';
import { signedOut, type SessionState } from '@/features/session/sessionSlice';
import type {
  ApiErrorBody,
  CandidateResult,
  LoginResponse,
  Page,
  Project,
  ProjectDetail,
  ProjectSummary,
  Search,
  SearchCriteria,
  SearchDetail,
  ShortlistItem,
  StartEvaluationResponse,
  SummaryResponse,
  User,
  Vocabulary,
} from '@/types/api';

/** The one error shape every endpoint rejects with. */
export interface ApiQueryError {
  status: number | string;
  code: string;
  message: string;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 20_000,
  prepareHeaders: (headers, { getState }) => {
    // Typed locally to avoid a circular import with the store module.
    const token = (getState() as { session: SessionState }).session.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/** Normalises errors to ApiQueryError and signs out centrally on 401. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (!result.error) return { data: result.data, meta: result.meta };

  const { status } = result.error;
  const hadSession = Boolean((api.getState() as { session: SessionState }).session.token);
  if (status === 401 && hadSession) api.dispatch(signedOut());

  const body = 'data' in result.error ? (result.error.data as ApiErrorBody | undefined) : undefined;
  const fallback = 'error' in result.error ? result.error.error : 'Request failed';
  return {
    error: { status, code: body?.error?.code ?? String(status), message: body?.error?.message ?? fallback },
    meta: result.meta,
  };
};

type CandidatePageArgs = { searchId: string; page: number; pageSize: number };

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Project', 'Search', 'Candidates', 'Shortlist'],
  endpoints: (build) => ({
    // ---------- auth & meta ----------
    login: build.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    getMe: build.query<User, void>({ query: () => '/auth/me', providesTags: ['Me'] }),
    getVocabulary: build.query<Vocabulary, void>({ query: () => '/meta/vocabulary', keepUnusedDataFor: 3600 }),

    // ---------- projects ----------
    getProjects: build.query<ProjectSummary[], void>({
      query: () => '/projects',
      providesTags: (projects) => [{ type: 'Project', id: 'LIST' }, ...(projects ?? []).map((p) => ({ type: 'Project' as const, id: p.id }))],
    }),
    getProject: build.query<ProjectDetail, string>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
    }),
    createProject: build.mutation<Project, { name: string; description?: string }>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
    deleteProject: build.mutation<void, string>({
      query: (projectId) => ({ url: `/projects/${projectId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, projectId) => [{ type: 'Project', id: 'LIST' }, { type: 'Project', id: projectId }],
    }),

    // ---------- searches ----------
    createSearch: build.mutation<Search, { projectId: string; title?: string }>({
      query: ({ projectId, title }) => ({ url: `/projects/${projectId}/searches`, method: 'POST', body: title ? { title } : {} }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: projectId }, { type: 'Project', id: 'LIST' }],
    }),
    deleteSearch: build.mutation<void, { projectId: string; searchId: string }>({
      query: ({ searchId }) => ({ url: `/searches/${searchId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Project', id: projectId }, { type: 'Project', id: 'LIST' }],
    }),
    getSearch: build.query<SearchDetail, string>({
      query: (searchId) => `/searches/${searchId}`,
      providesTags: (_result, _error, searchId) => [{ type: 'Search', id: searchId }],
    }),
    updateCriteria: build.mutation<Search, { searchId: string; criteria: SearchCriteria }>({
      query: ({ searchId, criteria }) => ({ url: `/searches/${searchId}`, method: 'PATCH', body: { criteria } }),
      // Optimistic: the pills update instantly and roll back if the server rejects.
      async onQueryStarted({ searchId, criteria }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData('getSearch', searchId, (draft) => {
            draft.criteria = criteria;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, { searchId }) => [{ type: 'Candidates', id: searchId }],
    }),

    // ---------- candidates ----------
    getCandidates: build.query<Page<CandidateResult>, CandidatePageArgs>({
      query: ({ searchId, page, pageSize }) => ({ url: `/searches/${searchId}/candidates`, params: { page, pageSize } }),
      providesTags: (_result, _error, { searchId }) => [{ type: 'Candidates', id: searchId }],
    }),
    // A mutation, not a query: the POST can spend a credit.
    fetchSummary: build.mutation<SummaryResponse, { searchId: string; candidateId: string }>({
      query: ({ searchId, candidateId }) => ({ url: `/searches/${searchId}/candidates/${candidateId}/summary`, method: 'POST' }),
      async onQueryStarted({ searchId, candidateId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(patchCandidates(searchId, [candidateId], (item) => void (item.hasSummary = true)));
          if (data.charged) dispatch(api.util.invalidateTags(['Me']));
        } catch {
          // The dialog shows the error from the mutation result.
        }
      },
    }),

    // ---------- evaluations ----------
    startEvaluations: build.mutation<StartEvaluationResponse, { searchId: string; candidateIds: string[] }>({
      query: ({ searchId, candidateIds }) => ({ url: `/searches/${searchId}/evaluations`, method: 'POST', body: { candidateIds } }),
      async onQueryStarted({ searchId, candidateIds }, { dispatch, queryFulfilled }) {
        const patches = dispatch(
          patchCandidates(searchId, candidateIds, (item) => {
            item.evaluation = { status: 'queued', score: null, verdict: null, checks: [], updatedAt: new Date().toISOString() };
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),

    // ---------- shortlist ----------
    getShortlist: build.query<ShortlistItem[], string>({
      query: (projectId) => `/projects/${projectId}/shortlist`,
      providesTags: (_result, _error, projectId) => [{ type: 'Shortlist', id: projectId }],
    }),
    addToShortlist: build.mutation<{ added: number; alreadyShortlisted: number }, { projectId: string; searchId?: string; candidateIds: string[] }>({
      query: ({ projectId, searchId, candidateIds }) => ({
        url: `/projects/${projectId}/shortlist`,
        method: 'POST',
        body: { candidateIds, ...(searchId && { searchId }) },
      }),
      async onQueryStarted({ searchId, candidateIds }, { dispatch, queryFulfilled }) {
        if (!searchId) return;
        const patches = dispatch(patchCandidates(searchId, candidateIds, (item) => void (item.shortlisted = true)));
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Shortlist', id: projectId }, { type: 'Project', id: 'LIST' }],
    }),
    removeFromShortlist: build.mutation<{ removed: boolean }, { projectId: string; candidateId: string; searchId?: string }>({
      query: ({ projectId, candidateId }) => ({ url: `/projects/${projectId}/shortlist/${candidateId}`, method: 'DELETE' }),
      async onQueryStarted({ projectId, candidateId, searchId }, { dispatch, queryFulfilled }) {
        const patches = [
          dispatch(api.util.updateQueryData('getShortlist', projectId, (draft) => draft.filter((entry) => entry.candidate.id !== candidateId))),
          ...(searchId ? dispatch(patchCandidates(searchId, [candidateId], (item) => void (item.shortlisted = false))) : []),
        ];
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
  }),
});

type ApiState = { [api.reducerPath]: ReturnType<typeof api.reducer> };
type PatchResult = ReturnType<ReturnType<typeof api.util.updateQueryData>>;

/**
 * Thunk: applies `recipe` (an Immer draft mutation) to the given candidates in
 * EVERY cached results page of a search, whatever page/pageSize was cached.
 * Returns the patches so callers can undo them.
 */
export function patchCandidates(
  searchId: string,
  candidateIds: string[],
  recipe: (item: CandidateResult) => void,
): ThunkAction<PatchResult[], ApiState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    const ids = new Set(candidateIds);
    return api.util
      .selectCachedArgsForQuery(getState(), 'getCandidates')
      .filter((args) => args.searchId === searchId)
      .map((args) =>
        dispatch(
          api.util.updateQueryData('getCandidates', args, (draft) => {
            draft.items.filter((item) => ids.has(item.id)).forEach(recipe);
          }),
        ),
      );
  };
}

export const {
  useLoginMutation,
  useGetMeQuery,
  useGetVocabularyQuery,
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useCreateSearchMutation,
  useDeleteSearchMutation,
  useGetSearchQuery,
  useUpdateCriteriaMutation,
  useGetCandidatesQuery,
  useFetchSummaryMutation,
  useStartEvaluationsMutation,
  useGetShortlistQuery,
  useAddToShortlistMutation,
  useRemoveFromShortlistMutation,
} = api;
