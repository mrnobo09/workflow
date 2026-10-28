# Workflow

Workflow is a small multi-tenant app that turns a spoken maintenance note into jobs and notifies the people who should do the work.

A requester records audio in the browser. The API stores the audio, transcribes it while it is still being recorded, and asks an LLM to split the transcript into jobs (a leaking tap, a dead light, a roof leak). Each job is assigned to a worker in the same company whose trade matches, and the manager can see every job in that company.

This project is mainly practice. The product is a place to get hands-on with:

- the MongoDB outbox pattern
- Node.js streams and backpressure
- MongoDB change streams
- notifications delivered with server-sent events
- multitenancy

## What you can do

Signup creates a company and a manager. Only a manager can add people.

| Role | What they see |
| --- | --- |
| Requester (`user`) | Records notes and sees the jobs they created. |
| Worker | Sees jobs for their trade inside the company. Can start and complete jobs assigned to them. |
| Manager | Sees every job in the company, assigns workers, and creates requesters and workers. |

Companies are tenants. Every account, job, and notification belongs to one tenant. Queries are scoped by the tenant on the session, so one company never reads another company's jobs. A worker also never receives the raw transcript (`sourceText`).

Trades live in one list (`api/src/schemas/specialties.ts`): electrician, plumber, HVAC, carpenter, roofer, painter, locksmith, appliance technician, pest control, landscaper, cleaner, and general maintenance. The LLM prompt, the database enums, and the UI all read from that list. Work that does not fit a trade becomes general maintenance so a manager can reassign it.

## Architecture

```text
browser  --audio chunks (websocket)-->  API
                                      |-- MinIO   (stored recording)
                                      |-- Whisper (live transcript)
                                      |-- LLM     (jobs from the transcript)

job + outbox rows  --one Mongo transaction-->  MongoDB
                                                      |
                                         change stream (later status changes)
                                                      |
                                                      v
                                              outbox collection
                                                      |
                                         outbox relay (poll + watch)
                                                      |
                                                      v
                                              Redis stream
                                                      |
                                         notification service
                                           |-- save Notification
                                           |-- push over SSE
                                                      |
                                                      v
                                                   browser
```

MongoDB runs as a single-node replica set. Transactions and change streams both need that.

### Streams and backpressure

`api/src/services/audio/acceptUpload.ts` splits each audio chunk into two `PassThrough` streams: one for MinIO, one for Whisper. If either `write` says the buffer is full, the websocket is paused and resumed only after both streams have drained. Whisper is slower than the microphone, so the socket slows down instead of buffering the whole recording in memory.

`api/src/services/audio/liveTranscribe.ts` pauses its input while a Whisper request is in flight, then sends the audio gathered so far. A lone WebM fragment is not playable, so each request resends the cumulative buffer.

### Outbox

Creating a job and telling someone about it are not the same step. `commitJobs` writes the job and its outbox rows in one transaction. If the process dies after the commit, the notification is still in Mongo and can be delivered later.

The relay (`api/src/services/outbox/relay.ts`) watches new outbox rows and also sweeps pending rows every 15 seconds. It appends each row to a Redis stream and marks the row published. Delivery is at-least-once: a crash after Redis accepts the entry can publish it twice, and the notification service drops the duplicate with a unique `eventId`.

### Change streams

Job creation is written to the outbox inside the same transaction. Later changes (assigned, started, completed) are not. `api/src/services/jobs/statusWatcher.ts` watches the jobs collection, turns each change into outbox rows for the assignee, the requester, and the managers, and skips the person who made the change. A resume token in `StreamCheckpoint` lets the watcher continue after a restart.

### Notifications and server-sent events

The notification service reads the Redis stream with a consumer group, saves a `Notification`, acknowledges the stream entry, and pushes the event to whoever is connected. `GET /sse/notifications` is the browser's stream:

- a fresh connection gets unread notifications as a backlog
- a reconnect sends `Last-Event-ID` and receives only what it missed
- a heartbeat every 25 seconds keeps the connection open
- when the access token expires, the stream sends `session-expired`; the client refreshes the session and reconnects

The job list reloads when one of these events arrives, so a manager sees new work without refreshing the page.

### Multitenancy

A tenant is created with its manager in one transaction (`signupManager`). Team members are always created in the manager's tenant. List and update queries filter on `tenantId` from the session, never from the request body. Role checks (`user`, `worker`, `manager`) sit on top of that.

## Layout

```text
api/src
  routes/            HTTP and the audio websocket
  services/audio     upload, live transcription, extraction, commit
  services/jobs      status changes and the change-stream watcher
  services/outbox    relay into Redis
  services/notifications
  schemas/specialties.ts
ui/src               React app, one screen per role
docker-compose.yaml  MongoDB, Redis, MinIO, Whisper
```

The API is Express 5 and Mongoose. The UI is React, TypeScript, Vite, and Tailwind.

## Run locally

MongoDB uses `mongo/keyfile` to authenticate replica set members to each other. That file is a secret, so it is gitignored. Create one locally before the first start (MongoDB accepts 6 to 1024 characters, and the file must not be group-readable):

```bash
openssl rand -base64 756 > mongo/keyfile
chmod 400 mongo/keyfile
docker compose up -d
```

`mongo_data` is an external volume named `db_mongo_data`. Create it once before the first `up`:

```bash
docker volume create db_mongo_data
```

On a new data directory, start the replica set once. Until this runs there is no primary, no oplog, and transactions and change streams fail:

```bash
docker exec local-mongo mongosh -u admin -p password123 --authenticationDatabase admin --eval 'rs.initiate({_id:"rs0", members:[{_id:0, host:"127.0.0.1:27017"}]})'
```

`docker compose down -v` does not delete `db_mongo_data`, so accounts survive that command.

Copy the example env files and fill in the secrets:

```bash
cp api/.env.example api/.env
cp ui/.env.example ui/.env
```

`MONGO_URI` must include `replicaSet=rs0`. Set `JWT_SECRET`. The LLM defaults to a local Ollama server at `http://127.0.0.1:11434/v1` using `qwen3.5:2b`; start it with `ollama run qwen3.5:2b`. For OpenRouter, set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (or configure `LLM_API_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`). `LLM_API_FORMAT` accepts `openai` or `anthropic`, for OpenAI-compatible chat-completions or Claude/Anthropic Messages APIs. Leave `SMTP_HOST` empty to print new-account emails in the API log, or set the SMTP values to send them. Then:

```bash
cd api && npm install && npm run dev
cd ui && npm install && npm run dev
```
