import { Link, NavLink, Outlet } from 'react-router';
import { useGetMeQuery } from '@/api/apiSlice';
import { useAppDispatch } from '@/app/withTypes';
import { signedOut } from '@/features/session/sessionSlice';

export function AppShell() {
  const dispatch = useAppDispatch();
  // Credits change when summaries are bought; the 'Me' tag is invalidated then.
  const { data: me } = useGetMeQuery();

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/projects" className="brand">
          <span className="brand__mark" aria-hidden="true">◎</span> TalentScout
        </Link>
        <nav className="topbar__nav" aria-label="Main">
          <NavLink to="/projects">Projects</NavLink>
        </nav>
        <div className="topbar__right">
          {me && (
            <span className="pill" title={`${me.credits.used} of ${me.credits.total} credits used`}>
              {me.credits.remaining} credits
            </span>
          )}
          <span className="topbar__user">{me?.fullName}</span>
          <button className="button button--ghost" type="button" onClick={() => dispatch(signedOut())}>
            Sign out
          </button>
        </div>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
