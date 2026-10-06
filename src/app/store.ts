import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '@/api/apiSlice';
import { loadSession, saveSession, sessionSlice, signedIn, signedOut } from '@/features/session/sessionSlice';
import { workspaceSlice } from '@/features/workspace/workspaceSlice';

const rootReducer = combineReducers({
  [sessionSlice.reducerPath]: sessionSlice.reducer,
  [workspaceSlice.reducerPath]: workspaceSlice.reducer,
  [api.reducerPath]: api.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Listener middleware handles side effects of actions, keeping reducers pure.
 * Sign-out (manual, or a 401 anywhere) drops every cached response, so the next
 * user never sees the previous user's data.
 */
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: signedOut,
  effect: (_action, { dispatch }) => {
    dispatch(api.util.resetApiState());
  },
});
listener.startListening({
  actionCreator: signedIn,
  effect: (_action, { dispatch }) => {
    dispatch(api.util.resetApiState());
  },
});

export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listener.middleware).concat(api.middleware),
  });

  // refetchOnFocus / refetchOnReconnect support for RTK Query
  setupListeners(store.dispatch);

  // Persist only the session slice, and only when it actually changes.
  let lastSession = store.getState().session;
  store.subscribe(() => {
    const session = store.getState().session;
    if (session !== lastSession) {
      lastSession = session;
      saveSession(session);
    }
  });

  return store;
}

export const store = makeStore({ session: loadSession() });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
