import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useGetSearchQuery } from '@/api/apiSlice';
import { routes } from '@/app/router';
import { useAppDispatch } from '@/app/withTypes';
import { NotFoundPage } from '@/components/NotFoundPage';
import { Spinner } from '@/components/Spinner';
import { describeError } from '@/lib/errors';
import { ConversationPanel } from './ConversationPanel';
import { CriteriaPanel } from './CriteriaPanel';
import { ResultsPanel } from './ResultsPanel';
import { SummaryDialog } from './SummaryDialog';
import { useEvaluationFeed } from './useEvaluationFeed';
import { workspaceOpened } from './workspaceSlice';

export default function WorkspacePage() {
  const { projectId = '', searchId = '' } = useParams();
  const dispatch = useAppDispatch();
  const { data: search, isLoading, error } = useGetSearchQuery(searchId);

  // Reset selection/paging/live turn when switching to another search.
  useEffect(() => {
    dispatch(workspaceOpened(searchId));
  }, [dispatch, searchId]);

  useEvaluationFeed(searchId);

  if (isLoading) return <Spinner label="Loading search" />;
  if (error && 'status' in error && (error.status === 404 || error.status === 400)) return <NotFoundPage message="This search doesn't exist." />;
  if (error || !search) return <p className="alert alert--error">{describeError(error)}</p>;

  return (
    <div className="workspace">
      <nav className="breadcrumbs workspace__crumbs" aria-label="Breadcrumb">
        <Link to={routes.projects}>Projects</Link> / <Link to={routes.project(projectId)}>Project</Link> / <span>{search.title}</span>
        <Link className="button button--small workspace__shortlist" to={routes.shortlist(projectId)}>
          Shortlist
        </Link>
      </nav>
      <ConversationPanel searchId={searchId} messages={search.messages} />
      <section className="workspace__main">
        <CriteriaPanel searchId={searchId} criteria={search.criteria} />
        <ResultsPanel projectId={projectId} searchId={searchId} criteria={search.criteria} />
      </section>
      <SummaryDialog searchId={searchId} />
    </div>
  );
}
