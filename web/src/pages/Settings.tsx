import { useState } from 'react';
import { api, ApiError } from '../api';
import { formatLong } from '../format';
import { useSession } from '../session';
import { Banner, Button, useCopy, useToast } from '../ui';
import type { CredentialReveal } from '../types';

const TEST_PROMPT =
  'Using Clientroom, create a project called "Acme brand refresh" and add three deliverables: Logo, Brand guide, Social kit.';

export function SettingsPage() {
  const { session, refresh } = useSession();
  const { show } = useToast();
  const copy = useCopy();

  const [revealed, setRevealed] = useState<CredentialReveal | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<null | 'rotate' | 'revoke'>(null);
  const [error, setError] = useState('');

  const mcp = session?.user.mcp ?? null;
  const mcpUrl = session?.mcpUrl ?? `${window.location.origin}/mcp`;

  async function create() {
    setBusy(true);
    setError('');
    try {
      const result = await api.createCredential();
      setRevealed(result.credential);
      setNotice(result.notice);
      await refresh();
      show('Credential created');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the credential.');
    } finally {
      setBusy(false);
    }
  }

  async function rotate() {
    setBusy(true);
    setError('');
    try {
      const result = await api.regenerateCredential();
      setRevealed(result.credential);
      setNotice(result.notice);
      setConfirming(null);
      await refresh();
      show('New token issued');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not regenerate the token.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError('');
    try {
      await api.revokeCredential();
      setRevealed(null);
      setNotice('');
      setConfirming(null);
      await refresh();
      show('Credential revoked');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the credential.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Settings</span>
          <h1>Connect Claude</h1>
        </div>
      </div>

      <p className="sub" style={{ marginTop: 16 }}>
        Claude can create and update projects and deliverables through this workspace. It uses a
        token that belongs to your account only. The app itself never calls a model.
      </p>

      {error ? <Banner message={error} /> : null}

      <ol className="steps">
        <li>
          <h2>Create a credential</h2>
          {revealed ? (
            <div className="token-reveal">
              <p className="warn">This is the only time the token is shown.</p>
              <div className="copy-row">
                <input
                  className="input"
                  readOnly
                  value={revealed.token}
                  aria-label="MCP token"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button size="small" onClick={() => void copy(revealed.token, 'Token copied')}>
                  Copy
                </Button>
              </div>
              <p className="panel-note">{notice}</p>
            </div>
          ) : mcp ? (
            <>
              <p>This workspace already has a credential. Only the first few characters are shown.</p>
              <div className="credential-line">
                <span>{mcp.prefix}…</span>
                <span>· created {mcp.createdAt ? formatLong(mcp.createdAt) : 'recently'}</span>
              </div>
              <div className="panel-actions">
                {confirming === 'rotate' ? (
                  <>
                    <span style={{ alignSelf: 'center', fontSize: 13.5 }}>
                      The old token stops working immediately.
                    </span>
                    <Button size="small" variant="danger" disabled={busy} onClick={() => void rotate()}>
                      Issue new token
                    </Button>
                    <Button size="small" variant="ghost" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </>
                ) : confirming === 'revoke' ? (
                  <>
                    <span style={{ alignSelf: 'center', fontSize: 13.5 }}>
                      Claude will lose access until you create a new credential.
                    </span>
                    <Button size="small" variant="danger" disabled={busy} onClick={() => void revoke()}>
                      Revoke
                    </Button>
                    <Button size="small" variant="ghost" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="small" variant="secondary" onClick={() => setConfirming('rotate')}>
                      Regenerate
                    </Button>
                    <Button size="small" variant="danger" onClick={() => setConfirming('revoke')}>
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p>Generate a token for this account. It is shown once, then stored as a hash.</p>
              <Button onClick={() => void create()} disabled={busy}>
                {busy ? 'Creating…' : 'Create credential'}
              </Button>
            </>
          )}
        </li>

        <li>
          <h2>Add the connector in Claude</h2>
          <p>
            In Claude, open Settings, then Connectors, and add a custom connector with this address.
            Send the token as a bearer header.
          </p>
          <div className="code">{`URL:    ${mcpUrl}
Header: Authorization: Bearer <your token>`}</div>
          <div className="panel-actions">
            <Button size="small" variant="secondary" onClick={() => void copy(mcpUrl, 'MCP URL copied')}>
              Copy URL
            </Button>
          </div>
        </li>

        <li>
          <h2>Ask Claude to do something</h2>
          <p>Claude gets five tools: create a project, add a deliverable, update one, read one, list them.</p>
          <div className="code">{TEST_PROMPT}</div>
          <div className="panel-actions">
            <Button size="small" variant="secondary" onClick={() => void copy(TEST_PROMPT, 'Prompt copied')}>
              Copy prompt
            </Button>
          </div>
        </li>
      </ol>

      <p className="footnote">
        The token is per user and scoped to your projects. Revoking it does not delete any data.
      </p>
    </>
  );
}
