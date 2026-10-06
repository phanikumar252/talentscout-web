import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/api';

export interface SessionState {
  token: string | null;
  user: User | null;
}

const initialState: SessionState = { token: null, user: null };

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    signedIn(_state, action: PayloadAction<{ token: string; user: User }>) {
      return action.payload;
    },
    signedOut() {
      return initialState;
    },
  },
  selectors: {
    selectToken: (state) => state.token,
    selectUser: (state) => state.user,
    selectIsSignedIn: (state) => state.token !== null,
  },
});

export const { signedIn, signedOut } = sessionSlice.actions;
export const { selectToken, selectUser, selectIsSignedIn } = sessionSlice.selectors;

const STORAGE_KEY = 'talentscout.session';

/**
 * Persisting by hand (instead of redux-persist) keeps it explicit: read once on
 * boot, write whenever the slice changes. Note the trade-off: an httpOnly cookie
 * is safer against XSS; a bearer token keeps the API stateless.
 */
export function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SessionState) : null;
    return parsed?.token ? parsed : initialState;
  } catch {
    return initialState;
  }
}

export function saveSession(session: SessionState): void {
  try {
    if (session.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, quota): the session just won't survive a reload.
  }
}
