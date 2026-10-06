import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useLoginMutation } from '@/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/app/withTypes';
import { describeError } from '@/lib/errors';
import { selectIsSignedIn, signedIn } from './sessionSlice';

const DEMO = { email: 'demo@talentscout.dev', password: 'Demo@1234' };

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSignedIn = useAppSelector(selectIsSignedIn);
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState(DEMO.email);
  const [password, setPassword] = useState(DEMO.password);

  const from = (location.state as { from?: string } | null)?.from ?? '/projects';
  if (isSignedIn) return <Navigate to={from} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { token, user } = await login({ email, password }).unwrap();
      dispatch(signedIn({ token, user }));
      navigate(from, { replace: true });
    } catch {
      // Rendered from `error` below.
    }
  };

  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand brand--large">
          <span className="brand__mark" aria-hidden="true">◎</span> TalentScout
        </div>
        <p className="muted">Describe who you're looking for. Get ranked candidates.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && <p className="alert alert--error" role="alert">{describeError(error)}</p>}

        <button className="button button--primary button--block" type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="hint">Demo account is pre-filled ({DEMO.email} / {DEMO.password}).</p>
      </form>
    </main>
  );
}
