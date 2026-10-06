import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '@/app/withTypes';
import { selectIsSignedIn } from './sessionSlice';

/** Route guard: unauthenticated users go to /login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isSignedIn = useAppSelector(selectIsSignedIn);
  const location = useLocation();

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}
