# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product concept

Gotham Project is a personal life-management system. The user is Bruce Wayne, their life is Gotham, and the app is **Alfred**. Alfred is the whole system, not a feature inside it: every reminder, alert, empty state and toast speaks in his voice, which is formal, loyal, caring and occasionally firm.

- Completing a mission: "Well done, sir. Gotham is a little safer tonight."
- Avoiding a task: "I've prepared everything you need. The rest is up to you."
- Breaking a streak: "A setback, not a defeat. Shall we begin again?"
- Closing a project: "Case closed. Batman would be proud."

Use the Batman names in UI copy, routes, models and endpoints:

| Generic | Gotham |
|---|---|
| Dashboard | HQ |
| Tasks | Missions |
| Projects | Cases |
| Habits | Arsenal |
| Journal | Intel |
| Finance | Resources |
| Calendar | Operations |
| Analytics | Overview |
| Achievements | Trophies |

## Architecture

pnpm + Turborepo monorepo:

- `apps/api`: Laravel, a pure REST API under `/api/v1`, authenticated with Sanctum personal access tokens (bearer). Runs on port 8000 in Docker only; Turbo and pnpm don't manage it. PHP dependencies are managed by Composer.
- `apps/web`: Next.js 16 App Router + TypeScript on port 3000. This is the product.
- `apps/docs`: Next.js scaffold on port 3001.
- `packages/ui` (`@gotham/ui`): shared shadcn components, `cn()`, and the Gotham Tailwind theme.
- `packages/eslint-config`, `packages/typescript-config`: shared configs.
- `docker-compose.yml`: runs `api`, `web`, `postgres` (16, db `gotham`, user `alfred`) and `redis` for local development. Laravel uses Redis for cache, queue and sessions.

Docker details that aren't obvious from one file:
- The API container runs as your host UID/GID (passed by the Makefile as `HOST_UID`/`HOST_GID`), so files it writes to the bind mount stay editable on the host. Its entrypoint runs `composer install`, creates `.env` from `.env.example` and generates `APP_KEY` when they are missing.
- The web container mounts the whole repo, because web imports workspace packages. Its `node_modules` folders live in named volumes, separate from any host install. `make dev` pre-creates those mount points on the host so Docker doesn't create them as root.
- Inside Docker, `localhost` is the container itself. Server-side Next code must call the API at `API_INTERNAL_URL` (`http://api:8000` in compose). Browser code uses `NEXT_PUBLIC_API_URL` (`http://localhost:8000`).

Web stack: TanStack Query for server state, Zustand for client state only, React Hook Form + Zod for forms, Recharts for charts, Framer Motion for animation, Lucide for icons.

Auth flow: the web app stores the Sanctum token in an httpOnly cookie and sends it as a bearer token, so server components can call the API directly.

## Commands

```sh
make dev        # docker compose up: api :8000, web :3000, postgres :5432, redis :6379
make down
make fresh      # down -v + rebuild; wipes the database
make api        # bash inside the api container
make migrate
make seed

# Laravel commands run inside the container
docker compose exec api php artisan test
docker compose exec api php artisan test --filter=MissionTest   # single test class or method
docker compose exec api ./vendor/bin/pint                        # fix PHP formatting

# JS tooling, on the host
pnpm install
pnpm turbo dev --filter=docs         # scope any task to one workspace
pnpm lint                            # eslint --max-warnings 0, so warnings fail
pnpm check-types                     # apps run `next typegen && tsc --noEmit`
pnpm format                          # prettier on ts/tsx/md
```

Environment templates are `apps/api/.env.example` (the entrypoint copies it to `.env`) and `apps/web/.env.example` (copy it to `.env.local`).

The web app has no test framework yet.

## Feature slices

Each feature is built as a vertical slice:

- **API:** migration, model, factory, form requests, API resource, policy, controller, `Route::apiResource`, and a feature test.
- **Web:** TanStack Query hooks, pages under the `app/(gotham)/` route group, and React Hook Form + Zod forms.

API conventions:
- Every response uses the envelope `{success, message, data, errors}`. Controllers return `$this->success()` / `$this->error()` from `App\Http\Concerns\ApiResponse` (used by the base `Controller`). Exceptions on `api/*` routes are rendered in the same envelope in `bootstrap/app.php`, including validation (422), auth (401) and 404 errors.
- Routes in `routes/api.php` get the `/api/v1` prefix from `apiPrefix` in `bootstrap/app.php`.
- Model names that differ from their table: `CaseFile` → `cases` (`case` is reserved in PHP), `Arsenal` → `arsenal`, `Intel` → `intel`, `SystemIntelligence` → `system_intelligence`. `UserAchievement` is the `user_achievements` pivot.
- Models use `#[Fillable]`/`#[Table]` attributes and classic `scopeX()` methods. Don't use `#[Scope]`: several scopes share a column name (`active`, `completed`), and Laravel can then mistake the method for a relationship.
- Enum columns are plain strings. The allowed values are in the migrations.
- Trophy definitions live in `AchievementsSeeder`. It matches rows on `key`, so it is safe to re-run.

Missions belong to Cases. HQ and Overview aggregate the other features. Streaks and trophies are computed on the API side, and trophies are awarded by queued jobs.

## Alfred's copy

All user-facing Alfred messages live in one module (`apps/web/lib/alfred.ts`), keyed by event, with several variants per event. Components look up messages there instead of hardcoding strings.

## Design system

- Dark only. Tokens are defined in `packages/ui/src/styles/theme.css`:

  | Role | Color |
  |---|---|
  | Background | `#0A0A0A` |
  | Surfaces (card, popover) | `#1A1A1D` |
  | Borders | `#2D2D30` |
  | Accent (`--primary`) | gold `#D4AF37` |

- Use gold sparingly: primary buttons, active states and key numbers.
- Priority colors:

  | Priority | Color |
  |---|---|
  | Critical | `#DC2626` |
  | High | `#F97316` |
  | Medium | `#3B82F6` |
  | Low | `#6B7280` |

- Fonts: Inter for body text, JetBrains Mono for numbers and data.
- Layout: cards with a simple sidebar. Important cards get subtle corner-bracket details. Design desktop first, but keep it mobile friendly.
- Motion: purposeful transitions of 200–300ms only. No constant animations, terminal effects or other gimmicks.

## Shared UI package

- `@gotham/ui` ships raw TS/TSX with no build step. Apps list it in `transpilePackages`, and its `exports` map exposes:
  - `@gotham/ui/components/ui/<name>`
  - `@gotham/ui/lib/utils`
  - `@gotham/ui/theme.css`
- Tailwind v4 is configured in CSS only (no `tailwind.config`). Each app's `globals.css` imports `tailwindcss` and `@gotham/ui/theme.css`, and adds `@source "../../../packages/ui/src"` so classes used inside the package are generated.
- shadcn uses the base-nova style on `@base-ui/react`, not Radix. Run the shadcn CLI from `packages/ui`. The apps' `components.json` files also alias into the shared package.
- Inside `packages/ui`, import through the `@gotham/ui/*` alias, not relative paths.
