import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCreateProjectMutation, useGetProjectsQuery } from '@/api/apiSlice';
import { routes } from '@/app/router';
import { Spinner } from '@/components/Spinner';
import { describeError } from '@/lib/errors';
import { formatRelative } from '@/lib/format';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useGetProjectsQuery();
  const [createProject, creation] = useCreateProjectMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const project = await createProject({ name: name.trim(), description: description.trim() }).unwrap();
      setName('');
      setDescription('');
      navigate(routes.project(project.id));
    } catch {
      // Shown below via creation.error
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Projects</h1>
          <p className="muted">One project per role you're hiring for. Each can hold several searches and a shared shortlist.</p>
        </div>
      </header>

      <form className="card form-row" onSubmit={handleCreate}>
        <label className="field field--grow">
          <span>Project name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Frontend – Austin" maxLength={120} required />
        </label>
        <label className="field field--grow">
          <span>Description (optional)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Team, hiring manager, notes" maxLength={2000} />
        </label>
        <button className="button button--primary" type="submit" disabled={creation.isLoading || !name.trim()}>
          {creation.isLoading ? 'Creating…' : 'Create project'}
        </button>
      </form>
      {creation.error && <p className="alert alert--error">{describeError(creation.error)}</p>}

      {isLoading && <Spinner label="Loading projects" />}
      {error && <p className="alert alert--error">{describeError(error)}</p>}
      {projects?.length === 0 && <p className="empty muted">No projects yet. Create one above to start sourcing.</p>}

      <ul className="grid" aria-label="Projects">
        {projects?.map((project) => (
          <li key={project.id}>
            <Link className="card card--link" to={routes.project(project.id)}>
              <h2 className="card__title">{project.name}</h2>
              {project.description && <p className="muted clamp-2">{project.description}</p>}
              <p className="card__meta">
                <span>{project.searchCount} searches</span>
                <span>{project.shortlistCount} shortlisted</span>
                <span>Updated {formatRelative(project.updatedAt)}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
