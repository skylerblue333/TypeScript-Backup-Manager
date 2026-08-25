# Sky Backup Plan Registry

Sky Backup Plan Registry is a small TypeScript/Express service for validating and registering **backup plans**. It deliberately separates planning metadata from backup execution.

## Status

**Engineering beta.** The service keeps at most 1,000 plans in process memory, supports a small explicit schedule vocabulary, and exposes liveness/readiness endpoints plus deterministic list/get APIs.

It does **not** copy files, dump databases, upload archives, execute restores, verify backup integrity, encrypt backup material, or provide durable scheduling.

## API

- `GET /healthz` — process liveness.
- `GET /readyz` — registry capacity and current plan count.
- `POST /api/v1/plans` — register `{ resource, destination, schedule }`.
- `GET /api/v1/plans` — list registered plans.
- `GET /api/v1/plans/:id` — fetch one plan.

Supported schedules are `on-demand`, `hourly`, `daily`, and `weekly`. A successful registration returns `status: "planned"`; it does not imply any data has been copied.

## Run locally

```bash
npm install
npm run build
npm test
npm audit --omit=dev --audit-level=high
npm start
```

The service listens on port `8080` when started directly.

## Container

```bash
docker build -t sky-backup-plan-registry .
docker run --rm -p 8080:8080 sky-backup-plan-registry
```

The runtime image executes as the unprivileged `node` user. CI verifies the non-root identity and performs a live `/healthz` smoke check.

## Architecture and boundaries

Plans live in an in-memory `Map`; restarting the process loses them. `resource` and `destination` are validated as bounded descriptive strings, not interpreted as credentials or automatically opened URIs. A future executor must provide its own authentication, authorization, secret handling, storage-provider adapters, encryption, retry/idempotency controls, integrity verification, restore testing, retention policy, observability, and durable scheduling.

## SKYCOIN4444 integration

This component can act as a narrow control-plane boundary where another service registers an intended backup before a separately secured worker performs the actual operation. Keeping those responsibilities separate avoids claiming backup durability where only planning metadata exists.

## License

See `LICENSE`.
