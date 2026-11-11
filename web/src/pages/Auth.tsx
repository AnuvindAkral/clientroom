import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api';
import { Link, useRouter } from '../router';
import { useSession } from '../session';
import { Button, Field, TextInput } from '../ui';

type Mode = 'login' | 'signup';

const COPY: Record<Mode, { title: string; lede: string; action: string; switch: string; switchTo: string; to: string }> = {
  login: {
    title: 'Sign in',
    lede: 'Pick up where the work stopped.',
    action: 'Sign in',
    switch: 'New here?',
    switchTo: 'Create an account',
    to: '/signup',
  },
  signup: {
    title: 'Create an account',
    lede: 'One workspace, one list per client.',
    action: 'Create account',
    switch: 'Already have an account?',
    switchTo: 'Sign in',
    to: '/login',
  },
};

export function AuthPage({ mode }: { mode: Mode }) {
  const { signIn, signUp } = useSession();
  const { navigate } = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFields({});
    setFormError('');
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password);
      navigate('/');
    } catch (error) {
      if (error instanceof ApiError) {
        setFields(error.fields);
        setFormError(Object.keys(error.fields).length > 0 ? '' : error.message);
      } else {
        setFormError('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-thesis">
        <span className="wordmark">Clientroom</span>
        <h1>Client delivery, in one room.</h1>
        <p>
          One list per client. One link to share. The client opens it and sees where the work
          stands, without an account or a permissions dialog.
        </p>
        <div className="auth-rule" />
        <p className="auth-note">
          Claude can work on the same projects through an MCP connection. The app itself runs
          no model.
        </p>
      </div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <h2>{copy.title}</h2>
        <p className="lede">{copy.lede}</p>

        {formError ? (
          <p className="error" role="alert" style={{ color: 'var(--danger)', fontSize: 13.5, marginTop: 0 }}>
            {formError}
          </p>
        ) : null}

        <Field label="Email" error={fields.email} htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            invalid={Boolean(fields.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field
          label="Password"
          error={fields.password}
          hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
          htmlFor="password"
        >
          <div style={{ position: 'relative' }}>
            <TextInput
              id="password"
              name="password"
              type={reveal ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              invalid={Boolean(fields.password)}
              onChange={(event) => setPassword(event.target.value)}
              style={{ paddingRight: 68 }}
            />
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setReveal((current) => !current)}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              aria-pressed={reveal}
              style={{ position: 'absolute', right: 2, top: 2, bottom: 2 }}
            >
              {reveal ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        <Button type="submit" disabled={busy} style={{ width: '100%', padding: '12px 14px' }}>
          {busy ? 'Working…' : copy.action}
        </Button>

        <p className="auth-switch">
          {copy.switch} <Link to={copy.to}>{copy.switchTo}</Link>
        </p>
      </form>
    </div>
  );
}
