# AGENTS.md

Instructions for AI agents working on this repository.

## What this project is

RESTful API that loads the Golden Raspberry Awards "Worst Picture" CSV into an in-memory SQLite
database at startup and exposes the award intervals of each producer. Correctness and code quality
matter more than feature count.

## Commands

| Task        | Command                 |
| ----------- | ----------------------- |
| Install     | `npm ci`                |
| Run (watch) | `npm run dev`           |
| Build       | `npm run build`         |
| Tests       | `npm test`              |
| Coverage    | `npm run test:coverage` |
| Mutation    | `npm run test:mutation` |
| Smoke       | `npm run smoke`         |
| Node        | 22.9+ (`.nvmrc`)        |
| Lint        | `npm run lint`          |
| Types       | `npm run typecheck`     |

Before declaring any change done: `npm run lint && npm run typecheck && npm run test:coverage`.

## Conventions

- TypeScript ESM. Relative imports always end in `.js` (NodeNext resolution).
- Code, comments, identifiers and commit messages in English. README and `docs/` in Portuguese.
- No `any`, no non-null assertions in `src/`, no `console.*` (use the pino logger).
- Functions stay small and flat: ESLint enforces complexity 8, max depth 3, max 60 lines.
- Comments explain _why_, never _what_. Delete a comment instead of restating the code.
- Business rules live in pure functions (`src/producers`, `src/csv`); I/O stays in
  `src/database` and `src/ingestion`. Do not mix the two. `docs/architecture.md` has the layer
  diagram and the per-endpoint call flow; keep it in sync when a boundary moves.
- Errors reaching the client go through `HttpError`; anything else becomes a 500 and is logged with
  the request id taken from the `x-request-id` response header.
- `NODE_ENV` defaults to `production` on purpose: the pretty log transport is a dev dependency, so a
  production install must never take the branch that loads it. `npm run dev` sets `development`.
- Producer identity is decided by `normalizeProducerName` (`src/producers/producer-identity.ts`), not
  by SQL collation: SQLite's `COLLATE NOCASE` is ASCII-only. Stored `name` is the first spelling
  seen and is what the API returns; `normalized_name` only matches duplicates.
- The query schema is strict on purpose. An unknown query parameter is a 400, never a silent
  full-collection response.
- CSV columns are located by name, never by position. Only `year`, `producers` and `winner` are
  required: anything the business rules do not use is tolerated and reported through
  `ParsedCsv.warnings`, which the ingestion logs. Do not turn a warning into a thrown error unless a
  business rule depends on the field.

## Testing rules

- Integration tests (`tests/integration`) exercise the real Express app over the real SQLite
  database through Supertest. They are the source of truth for API behaviour.
- Unit tests (`tests/unit`) cover pure logic and edge cases that are awkward to reach over HTTP.
- Thresholds are enforced, not advisory: 90% coverage (vitest) and 90% mutation score (Stryker).
- `openapi.yaml` is the API contract and `tests/integration/openapi-contract.test.ts` enforces
  it. Changing a response shape means changing the spec in the same commit, or the suite fails.
- `npm run smoke` runs the compiled `dist/` over real HTTP. Run it after touching the build,
  the startup path or `CSV_PATH` resolution: those break only outside the test runner.
- Never lower a threshold or add a Stryker disable comment to make a run pass. Either kill the
  mutant with a meaningful assertion or delete the code the mutant proved to be dead.

## Boundaries

- Do not add a dependency without a concrete problem it solves in the current task.
- Do not introduce abstractions for hypothetical future needs.
- Do not run `git commit` or `git push` — report what changed and let the human decide.
- The dataset in `data/` is sample input only; the API must work with any CSV that has the same
  columns. Never hardcode anything specific to the sample data in `src/`.
