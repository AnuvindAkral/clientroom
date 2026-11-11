# Operations

How Clientroom is deployed, backed up, restored and diagnosed. Written so someone who did
not build it can run it.

Current deployment: Railway project `clientroom`, service `clientroom`, volume
`clientroom-volume` mounted at `/data`, public origin
`https://clientroom-production.up.railway.app`.

## Environment

| Variable | Required | Value in production |
| --- | --- | --- |
| `DATABASE_PATH` | yes | `/data/clientroom.db` |
| `SESSION_SECRET` | yes | 32 or more random bytes, `openssl rand -base64 48` |
| `APP_ORIGIN` | yes | `https://<service>.up.railway.app`, no trailing slash |
| `NODE_ENV` | yes | `production` |
| `PORT` | no | Railway injects it; the app reads `PORT` and falls back to 3000 |
| `SEED_DEMO` | no | `1` only on the evaluator deployment |
| `SEED_EMAIL` | no | defaults to `demo@clientroom.app` |
| `SEED_PASSWORD` | no | 8 or more characters, set by hand, never committed |

`SESSION_SECRET` does three jobs: it signs the session cookie, it derives the key that
encrypts stored share tokens, and it salts nothing else. Changing it signs everyone out
and makes existing share links unreadable, so rotate it only when you accept both.

Nothing else is a secret. The database file is not encrypted at rest, which is why the
volume is the security boundary: it is not public and it is only reachable from the
service.

## Deploy

1. Railway project, one service from this repository. The `Dockerfile` is used because
   `railway.json` names it.
2. Add a volume to the service and mount it at `/data`. Railway mounts volumes at runtime
   only, so the path appears when the container starts, not during build.
3. Set the variables above. `APP_ORIGIN` must be the public origin, otherwise cookies are
   marked insecure and share links point at localhost.
4. Deploy. The container runs `node dist/index.js`, which migrates and then serves the API,
   the built single-page app and the share page on one port.
5. Check `/healthz`: it returns 200 with the database status and the schema version. A
   503 there means the file is missing or unreadable, not that the process is dead.
6. Check `/mcp` with a `POST` and a bearer token. A `GET` returns 405 by design.

Redeploys take the old container down before the new one starts, so expect a few seconds
of unavailability. There is no rolling deploy, because there is only one instance.

## Why one instance

SQLite lives on a mounted volume, and a Railway volume attaches to exactly one service
with one replica. Two replicas would write to two different files, and the app would show
different data depending on which replica answered. Scaling out means moving to a
networked database first, which is a deliberate product decision recorded in
[docs/03-architecture.md](03-architecture.md), not an oversight.

## Backups

Railway's volume backups (manual snapshots and daily, weekly or monthly schedules) are a
Pro workspace feature. On this Hobby workspace both the manual and the scheduled call answer
`Manual backups and backup schedules are only available for Pro workspaces`, so there is no
platform snapshot today. The working arrangement is a file-level copy pulled off the volume
with the Railway CLI, and it has been rehearsed on this deployment.

### Pull a copy

Volume file access goes over SSH, so one unencrypted key has to be registered with Railway.
Agents cannot type a passphrase, which is why the key is generated without one and used for
nothing else:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/clientroom_backup -N '' -C 'railway volume backup (clientroom)'
railway ssh keys add --key ~/.ssh/clientroom_backup
```

Then one command takes the copy and checks it:

```bash
tools/backup.sh ~/Documents/volopay-assignment/backups/$(date +%Y%m%d-%H%M%S)
```

The script finds the volume, downloads `clientroom.db` with its `-wal` and `-shm`, and runs
`pragma integrity_check` plus the row counts for all four tables on a scratch copy. The
database runs in WAL mode, so the main file alone can be missing the most recent writes.
The write-ahead log is part of the backup and has to travel with it.

Run it before anything risky and on whatever schedule can be kept. A copy that lives only
on one laptop is not a backup against losing the laptop, so move each one somewhere else.

### Restore rehearsal, done

Performed on 11 November 2026 against the live volume, with the image built from the commit
that was deployed:

```bash
tools/backup.sh /tmp/backup-verify
sqlite3 /tmp/backup-verify/clientroom.db 'pragma integrity_check;'
# ok, users 11, projects 10, items 17, share_links 4

docker run -d --name clientroom-restore -p 4399:3000 \
  -v /tmp/backup-verify:/data -e DATABASE_PATH=/data/clientroom.db \
  -e NODE_ENV=production -e APP_ORIGIN=http://localhost:4399 \
  -e SESSION_SECRET=restore-rehearsal-secret-not-production clientroom:restore-check
```

`/healthz` answered `{"status":"ok","database":"ok"}`, the demo account signed in against
the copy, the project list came back, and the project opened with all four deliverables and
their statuses intact (`done`, `blocked`, `in_progress`, `not_started`). A client link could
not be replayed from the copy because only a hash of the token is stored, which is the
correct behaviour and worth knowing before promising a client a link survives a restore:
the project content survives, the old link does not have to.

### Restore for real

1. Stop the service so nothing writes during the copy.
2. Upload the database and its log:
   `railway volume files --volume <id> upload <copy>/clientroom.db /data/clientroom.db`, and
   the `-wal` file alongside it. Delete a stale `-shm` if the copy has none.
3. Start the service, open `/healthz`, sign in, open a project.
4. If the data is wrong, put the previous copy back. Keep the failed one until you know why.

### The better version

Upgrading the workspace to Pro makes this a platform job instead of a human habit. Enable a
daily schedule, take one manual backup, restore it into a scratch service once, and the
criterion stops depending on anyone remembering. Nothing in the application changes. Until
then the file-level copy above is the arrangement, and its rehearsal is recorded in
[docs/07-test-report.md](07-test-report.md).


## Logs and what they must never contain

The app logs one line per request: timestamp, level, request id, method, path, status,
duration. It logs boot events, seed outcomes and errors with a stack.

It must never log a session cookie, an MCP bearer token, a share token or a password. The
error handler strips request bodies from its output. If a token ever appears in a log
line, treat it as leaked, regenerate it, and fix the line that printed it.

## Health and diagnosis

| Symptom | First check |
| --- | --- |
| `/healthz` 503 | Volume mounted at `/data`, `DATABASE_PATH` matches, container can write |
| Sign in succeeds then bounces to `/login` | `APP_ORIGIN` differs from the browser origin, so the cookie is not sent |
| Client link opens as `http://localhost` | `APP_ORIGIN` still points at localhost |
| MCP returns 401 with a token that worked before | Credential was regenerated or revoked; issue a new one |
| Share link returns 410 | Link was revoked, by the owner or by creating a new one |
| 500 after a deploy | Schema version in `/healthz` against the migration list in `src/db/schema.ts` |

## Secrets rotation

`SESSION_SECRET`: set the new value, redeploy. Everyone signs in again, existing share
links stop working, and the owner creates a new link per project. Do this if the value was
exposed.

MCP credentials are per user and self-service: Settings, Connect Claude, Regenerate. The
old token fails on the next request.

## Local production run

Useful for checking the built artefact without Railway:

```bash
npm run build
DATABASE_PATH=./.local/clientroom.db \
SESSION_SECRET=local-test-secret-0123456789-abcdefghijklmnop \
APP_ORIGIN=http://localhost:3000 \
NODE_ENV=production \
PORT=3000 \
node dist/index.js
```
