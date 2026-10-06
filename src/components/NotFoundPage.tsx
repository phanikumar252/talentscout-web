import { Link } from 'react-router';

export function NotFoundPage({ message = 'This page does not exist.' }: { message?: string }) {
  return (
    <div className="empty">
      <h1>Not found</h1>
      <p className="muted">{message}</p>
      <Link className="button" to="/projects">
        Back to projects
      </Link>
    </div>
  );
}
