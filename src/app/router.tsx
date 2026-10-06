import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/features/session/RequireAuth';
import { LoginPage } from '@/features/session/LoginPage';
import { NotFoundPage } from '@/components/NotFoundPage';
import { Spinner } from '@/components/Spinner';

// Route-level code splitting: the workspace is the heaviest screen.
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));
const ProjectPage = lazy(() => import('@/features/projects/ProjectPage'));
const WorkspacePage = lazy(() => import('@/features/workspace/WorkspacePage'));
const ShortlistPage = lazy(() => import('@/features/shortlist/ShortlistPage'));

const page = (element: ReactNode) => <Suspense fallback={<Spinner label="Loading page" />}>{element}</Suspense>;

export const routes = {
  login: '/login',
  projects: '/projects',
  project: (projectId: string) => `/projects/${projectId}`,
  search: (projectId: string, searchId: string) => `/projects/${projectId}/searches/${searchId}`,
  shortlist: (projectId: string) => `/projects/${projectId}/shortlist`,
};

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to={routes.projects} replace /> },
      { path: 'projects', element: page(<ProjectsPage />) },
      { path: 'projects/:projectId', element: page(<ProjectPage />) },
      { path: 'projects/:projectId/searches/:searchId', element: page(<WorkspacePage />) },
      { path: 'projects/:projectId/shortlist', element: page(<ShortlistPage />) },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
