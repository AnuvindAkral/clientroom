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
Pro workspace feature. On this Hobby workspace the API answers `Manual backups and backup
schedules are only available for Pro workspaces`, so there is no platform snapshot today.
Two options, in order of preference:

**1. Upgrade the workspace to Pro, then enable the schedule.** No application change. Set
the schedule to daily, take one manual backup, and restore it into a scratch service once
to prove it works. That is the only version of this that needs no human memory.

**2. File-level backup, on demand.** Works on Hobby. It needs an unencrypted SSH key
registered with Railway, because volume file access goes over SSH and the agent cannot
type a passphrase:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/clientroom_backup -N '' -C 'railway volume backup'
railway ssh keys add --key ~/.ssh/clientroom_backup

VOLUME=6e885ba4-9d8e-497d-871b-34ca491e267b
railway volume files --volume $VOLUME download /data/clientroom.db     backup/clientroom.db
railway volume files --volume $VOLUME download /data/clientroom.db-wal backup/clientroom.db-wal
railway volume files --volume $VOLUME download /data/clientroom.db-shm backup/clientroom.db-shm
```

Download all three files. The database runs in WAL mode, so the main file alone can be
missing the most recent writes; the write-ahead log is part of the backup. Verify the copy
before trusting it:

```bash
sqlite3 backup/clientroom.db 'pragma integrity_check; select count(*) from projects; select count(*) from items;'
```

Then boot the same image against the copy to prove the application reads it:
`docker run -p 4321:3000 -v "$PWD/backup:/data" -e DATABASE_PATH=/data/clientroom.db ...`
and open `/healthz` plus a sign in.

Restoring:

1. Stop the service so nothing writes during the copy.
2. `railway volume files --volume $VOLUME upload backup/clientroom.db /data/clientroom.db`
   and the `-wal` file with it. Delete the stale `-shm` if the copy has none.
3. Start the service, open `/healthz`, then sign in and read a project.
4. If the data is wrong, restore the previous copy.

Neither option has been rehearsed on this deployment yet. The traceability matrix records
that as open rather than done.

A backup on the same volume is not a backup against losing the volume. That is why the
schedule on Pro, or a copy pulled off the platform, is worth the money.

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
