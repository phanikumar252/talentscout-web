# TalentScout Web

React + TypeScript frontend for **TalentScout**, a conversational candidate-sourcing tool. Recruiters chat with an
assistant ("senior React dev in Austin, 5+ years, not from Google"). The criteria panel and ranked results update
while the reply is still streaming. Recruiters can then run AI evaluations whose progress arrives live, buy
candidate summaries with credits, shortlist candidates and export CSV.

React 19 · TypeScript (strict) · Vite · **Redux Toolkit + RTK Query** · React Router 7 · Vitest

> Backend: [`talentscout-api`](../talentscout-api) (Node.js + Express + MongoDB).

## Quick start

```bash
# terminal 1 (API)
cd ../talentscout-api && npm install && npm run dev

# terminal 2 (web)
npm install
npm run dev            # http://localhost:5173 (demo login is pre-filled)
```

| Script | |
|---|---|
| `npm run dev` | Vite dev server; `/api` is proxied to `localhost:4000` |
| `npm run build` | type-check (`tsc -b`) + production build with route-level code splitting |
| `npm run typecheck` | type-check only |
| `npm test` | Vitest unit tests (stream parsers, formatters) |

## Structure

```
src/
├── main.tsx                     <Provider store> + <RouterProvider>
├── app/
│   ├── store.ts                 configureStore: slices + RTK Query + listener middleware, session persistence
│   ├── withTypes.ts             typed useAppDispatch / useAppSelector / createAppAsyncThunk
│   └── router.tsx               routes (lazy-loaded pages), RequireAuth guard, typed route builders
├── api/apiSlice.ts              RTK Query: every endpoint, cache tags, optimistic updates
├── features/
│   ├── session/                 sessionSlice (token + user), LoginPage, RequireAuth
│   ├── projects/                ProjectsPage, ProjectPage
│   ├── workspace/               the main screen
│   │   ├── workspaceSlice.ts        live stream turn, selection, paging, dialog state
│   │   ├── chatThunks.ts            createAsyncThunk that consumes the NDJSON stream
│   │   ├── useEvaluationFeed.ts     SSE subscription → cache patches
│   │   └── ConversationPanel · CriteriaPanel · ResultsPanel · CandidateCard · SummaryDialog
│   └── shortlist/               ShortlistPage (CSV export)
├── components/                  AppShell, TagInput, Pager, Spinner, NotFoundPage
├── lib/                         httpClient (ApiError, timeouts), streams (NDJSON + SSE parsers), format, errors
├── types/api.ts                 API contract types, incl. discriminated unions for stream events
└── styles/global.css            design tokens (CSS variables), light + dark
```

## State management

| Kind of state | Where | Why |
|---|---|---|
| Server data (projects, searches, candidates, shortlist, me) | **RTK Query** cache | caching, dedupe, loading/error flags, tag-based invalidation |
| Auth session | `sessionSlice` | persisted to localStorage via `store.subscribe` (only when the slice changes) |
| In-flight chat turn, selection, page, evaluation progress, open dialog | `workspaceSlice` | client-only state the server doesn't know |
| Side effects of actions | **listener middleware** | on sign-in/out → `api.util.resetApiState()` so no data leaks between users |

Patterns worth pointing at:

- **Optimistic updates.** Criteria edits, shortlist toggles and "queued" evaluation badges patch the cache in
  `onQueryStarted` and `undo()` if the request fails.
- **`patchCandidates` thunk.** One SSE event updates the same candidate in *every* cached results page
  (`api.util.selectCachedArgsForQuery` → `updateQueryData`), without refetching.
- **Cross-slice reactions without extra dispatches.** `workspaceSlice` uses
  `addMatcher(api.endpoints.startEvaluations.matchFulfilled, …)` to store progress and clear the selection.
- **Typed thunks.** `createAsyncThunk.withTypes<{ state; dispatch; rejectValue }>()`. `condition` blocks a second
  send while a reply is streaming, and the promise's `.abort()` cancels the HTTP stream.
- **Serializable state.** Selection is a `string[]`, not a `Set`, so DevTools and time-travel work.
- **Render performance.** `CandidateCard` is `memo`ised and selects only its own `isSelected` boolean, so a
  streamed event re-renders one card, not the whole list.

## Streaming

**Chat (`POST /chat`, NDJSON).**
- `chatThunks.ts` reads `response.body` through `readNdjson()`. That parser buffers partial lines across chunks and cancels the reader if the consumer stops early.
- Each event is a member of the `ChatStreamEvent` discriminated union and is handled in a `switch` that TypeScript checks for exhaustiveness:
  - `step` → progress list.
  - `criteria` → patch `getSearch` cache + refetch results.
  - `delta` → append to the live reply.
  - `done` → append the finished turn to the cached transcript (no refetch, no flicker).
- Leaving the page or pressing **Stop** aborts the stream.

**Evaluations (SSE).**
- `useEvaluationFeed` opens the stream with `fetch` rather than `EventSource`, because `EventSource` can't send the `Authorization` header.
- `readSse()` parses the event stream. The hook reconnects with exponential backoff, and stops retrying on 401/403/404.

## Other details

- **One HTTP layer.** `fetchBaseQuery` + a wrapper normalise every error to `{ status, code, message }` and sign out
  centrally on 401. `lib/httpClient.ts` covers streams and file downloads with the same error type and an
  `AbortSignal.any([caller, timeout])`.
- **Type-safe criteria editing.** `update<K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K])`.
- **Accessibility.**
  - The native `<dialog>` handles focus trapping and Esc.
  - `role="log"` with `aria-live` announces streamed replies.
  - Tag inputs use a labelled native `<datalist>`, and there are visible focus rings.
- **Route-level code splitting** with `React.lazy`. The workspace chunk is ~6 kB gzipped.
- **Dark mode** via `prefers-color-scheme` and CSS variables.
