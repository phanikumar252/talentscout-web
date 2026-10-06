import { Link, useNavigate, useParams } from 'react-router';
import { useCreateSearchMutation, useDeleteProjectMutation, useDeleteSearchMutation, useGetProjectQuery } from '@/api/apiSlice';
import { routes } from '@/app/router';
import { NotFoundPage } from '@/components/NotFoundPage';
import { Spinner } from '@/components/Spinner';
import { describeError } from '@/lib/errors';
import { formatRelative, summarizeCriteria } from '@/lib/format';

export default function ProjectPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useGetProjectQuery(projectId);
  const [createSearch, creation] = useCreateSearchMutation();
  const [deleteSearch] = useDeleteSearchMutation();
  const [deleteProject, deletion] = useDeleteProjectMutation();

  if (isLoading) return <Spinner label="Loading project" />;
  if (error && 'status' in error && error.status === 404) return <NotFoundPage message="This project doesn't exist or belongs to another organisation." />;
  if (error || !project) return <p className="alert alert--error">{describeError(error)}</p>;

  const handleNewSearch = async () => {
    const search = await createSearch({ projectId }).unwrap();
    navigate(routes.search(projectId, search.id));
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.name}" with all its searches and shortlist?`)) return;
    await deleteProject(projectId).unwrap();
    navigate(routes.projects, { replace: true });
  };

  return (
    <div className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={routes.projects}>Projects</Link> / <span>{project.name}</span>
      </nav>
      <header className="page__header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <div className="toolbar">
          <Link className="button" to={routes.shortlist(projectId)}>
            View shortlist
          </Link>
          <button className="button button--primary" type="button" onClick={handleNewSearch} disabled={creation.isLoading}>
            {creation.isLoading ? 'Creating…' : 'New search'}
          </button>
        </div>
      </header>

      {project.searches.length === 0 ? (
        <div className="empty">
          <p className="muted">No searches yet. Start one and describe the person you need in plain English.</p>
        </div>
      ) : (
        <ul className="list" aria-label="Searches">
          {project.searches.map((search) => (
            <li key={search.id} className="list__item">
              <Link to={routes.search(projectId, search.id)} className="list__main">
                <strong>{search.title}</strong>
                <span className="muted">{summarizeCriteria(search.criteria) || 'No criteria yet'}</span>
              </Link>
              <span className="muted small">{formatRelative(search.updatedAt)}</span>
              <button
                type="button"
                className="button button--ghost button--small"
                aria-label={`Delete ${search.title}`}
                onClick={() => window.confirm(`Delete "${search.title}"?`) && deleteSearch({ projectId, searchId: search.id })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="danger-zone">
        <button className="button button--danger" type="button" onClick={handleDeleteProject} disabled={deletion.isLoading}>
          Delete project
        </button>
      </footer>
    </div>
  );
}
