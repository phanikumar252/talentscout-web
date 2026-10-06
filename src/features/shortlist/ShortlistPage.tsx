import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useGetProjectQuery, useGetShortlistQuery, useRemoveFromShortlistMutation } from '@/api/apiSlice';
import { routes } from '@/app/router';
import { useAppSelector } from '@/app/withTypes';
import { Spinner } from '@/components/Spinner';
import { selectToken } from '@/features/session/sessionSlice';
import { describeError } from '@/lib/errors';
import { formatRelative } from '@/lib/format';
import { apiFetch } from '@/lib/httpClient';

export default function ShortlistPage() {
  const { projectId = '' } = useParams();
  const token = useAppSelector(selectToken);
  const { data: project } = useGetProjectQuery(projectId);
  const { data: entries, isLoading, error } = useGetShortlistQuery(projectId);
  const [removeFromShortlist] = useRemoveFromShortlistMutation();
  const [exportError, setExportError] = useState<string | null>(null);

  // Fetch + blob instead of a plain <a href>: the request needs the Authorization header.
  const handleExport = async () => {
    setExportError(null);
    try {
      const response = await apiFetch(`/projects/${projectId}/shortlist/export.csv`, { token, headers: { Accept: 'text/csv' } });
      const fileName = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'shortlist.csv';
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(describeError(err));
    }
  };

  return (
    <div className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={routes.projects}>Projects</Link> / <Link to={routes.project(projectId)}>{project?.name ?? 'Project'}</Link> / <span>Shortlist</span>
      </nav>
      <header className="page__header">
        <div>
          <h1>Shortlist</h1>
          <p className="muted">{entries?.length ?? 0} candidates saved for this project.</p>
        </div>
        <button className="button button--primary" type="button" onClick={handleExport} disabled={!entries?.length}>
          Export CSV
        </button>
      </header>
      {exportError && <p className="alert alert--error">{exportError}</p>}
      {isLoading && <Spinner label="Loading shortlist" />}
      {error && <p className="alert alert--error">{describeError(error)}</p>}
      {entries?.length === 0 && <p className="empty muted">Nothing shortlisted yet. Use “Shortlist” on a search result.</p>}

      {!!entries?.length && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Location</th>
                <th scope="col">Experience</th>
                <th scope="col">Skills</th>
                <th scope="col">Added</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(({ candidate, addedAt, searchId }) => (
                <tr key={candidate.id}>
                  <td>
                    <strong>{candidate.fullName}</strong>
                    {candidate.openToWork && <span className="tag tag--green">Open</span>}
                  </td>
                  <td>{candidate.headline}</td>
                  <td>
                    {candidate.city}, {candidate.country}
                  </td>
                  <td>{candidate.yearsExperience} yrs</td>
                  <td className="small">{candidate.skills.join(', ')}</td>
                  <td className="small muted">{formatRelative(addedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => removeFromShortlist({ projectId, candidateId: candidate.id, ...(searchId && { searchId }) })}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
