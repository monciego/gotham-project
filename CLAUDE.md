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

Auth flow (the Sanctum token lives only in the httpOnly `gotham_token` cookie, so browser JS never sees it):
- `app/api/auth/{login,register,logout}` are Next route handlers. They call Laravel, then set or clear the cookie. Login and register return only the user to the browser.
- Browser code uses `api` from `lib/api.ts`, whose base URL is `/api/backend`. The catch-all route `app/api/backend/[...path]` adds the Bearer token from the cookie and forwards to Laravel's `/api/v1`. It clears the cookie on a 401 or after the account is deleted.
- Server components use `serverApi` / `getCurrentUser()` from `lib/server-api.ts`, which call Laravel directly. On a 401 they redirect to `/api/auth/session-expired`, which clears the cookie. Without that, `proxy.ts` would bounce `/login` straight back.
- `proxy.ts` (Next 16's name for `middleware.ts`) only checks that the cookie exists. Protected prefixes and the auth pages are listed in `lib/routes.ts`. HQ (`/hq`) is the home page after signing in.
- The Zustand store `stores/auth.ts` wraps these calls. Forms map Laravel's 422 `errors` onto their fields with `applyApiErrors()` from `lib/form-errors.ts`.

## Commands

```sh
make dev        # docker compose up: api :8000, web :3000, postgres :5432, redis :6379, scheduler
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

Web conventions:
- Routes use the Batman names (`/hq`, `/missions`, …), listed once in `lib/nav.ts` (sidebar and header titles) and `lib/routes.ts` (protection). `app/(gotham)/[section]/page.tsx` is a placeholder for any section without a real page; adding `app/(gotham)/<section>/page.tsx` replaces it.
- Query keys and hooks live in `lib/queries.ts` (HQ, user, alerts), `lib/mission-queries.ts` (missions), `lib/focus-queries.ts` (focus sessions), `lib/arsenal-queries.ts` (habits), `lib/intel-queries.ts` (journal) and `lib/resource-queries.ts` (finance; money and month helpers in `lib/money.ts`), `lib/operation-queries.ts` (calendar), `lib/case-queries.ts` (cases), `lib/overview-queries.ts` (analytics, insights, weekly reports) and `lib/trophy-queries.ts` (trophies, XP history) and `lib/alfred-queries.ts` (Alfred's messages and actions).
- Shared form pieces live in `components/forms` (`Field`, `NativeSelect`, `TagInput`, `SubmitButton`, `FormAlert`). The Intel form keeps a local draft every 30 seconds (`components/intel/use-draft.ts`).
- Mutations update the cache optimistically and roll back on error. `optimistic()` in `mission-queries.ts` snapshots every mission query for that.
- The focus screen is `/focus/[sessionId]` in the `(focus)` route group: full screen, with no sidebar, header or Alfred toasts. `QuickStartButton` starts a session and opens it. `stores/focus.ts` holds the running countdown and distraction count, persisted to localStorage.
- Alfred on every page (`(gotham)` layout):
  - `AlfredHost` renders his panel: a toast from `useAlfredStore().say()` (`stores/alfred.ts`) if there is one, otherwise the first critical message not yet acted on or dismissed. Reading a message doesn't clear it from the panel.
  - `AlfredAlerts` shows unread non-critical messages as cards above the page, at most 3.
  - The header's `NotificationBell` lists the last five; `/alfred` lists the latest 50.
  - Messages are server state in `lib/alfred-queries.ts`, polled every 5 minutes. `useAlfredAction()` runs a message's action on the API and follows the result: navigate, show a toast, or open the "I'm stuck" `HelpDialog`.
- Loading states are skeletons (`@gotham/ui/components/ui/skeleton`), not spinners. Spinners are only for buttons that submit.
- Animation uses `motion` (Framer Motion's current package; import from `motion/react`). `Providers` sets `reducedMotion="user"`.
- When adding shadcn components, check that the generated files import `cn` from `@gotham/ui/lib/utils`. The CLI has produced `from "cn"` here and installed an unrelated npm package called `cn`.

API conventions:
- Every response uses the envelope `{success, message, data, errors}`. Controllers return `$this->success()` / `$this->error()` from `App\Http\Concerns\ApiResponse` (used by the base `Controller`). Exceptions on `api/*` routes are rendered in the same envelope in `bootstrap/app.php`, including validation (422), auth (401) and 404 errors.
- Routes in `routes/api.php` get the `/api/v1` prefix from `apiPrefix` in `bootstrap/app.php`.
- Model names that differ from their table: `CaseFile` → `cases` (`case` is reserved in PHP), `Arsenal` → `arsenal`, `Intel` → `intel`, `SystemIntelligence` → `system_intelligence`. `UserAchievement` is the `user_achievements` pivot.
- Models use `#[Fillable]`/`#[Table]` attributes and classic `scopeX()` methods. Don't use `#[Scope]`: several scopes share a column name (`active`, `completed`), and Laravel can then mistake the method for a relationship.
- Enum columns are plain strings. The allowed values are in the migrations.
- Trophy definitions live in `AchievementsSeeder`. It matches rows on `key`, so it is safe to re-run. `icon` is a Lucide name mapped in `components/trophies/trophy-icons.ts`; add new names there.
- "Today" always means the user's day: use `$user->today()` (a `CarbonImmutable` at midnight in their timezone) and `whereDate()` on date columns. Plain `where('date', …)` breaks on SQLite, which the tests use.
- Arsenal (habits):
  - Habit schedules (`arsenal.frequency`) are documented on the `Arsenal` model.
  - `App\Services\ArsenalStreaks` is the single source for due days, streaks and today's list. `timeline()` gives each day's state (completed, skipped, missed, pending, off), and streaks, `ArsenalAnalytics` (heatmap and charts) and HQ all build on it.
  - Skips and days a habit isn't due never break a streak. In some modes a few misses in a row are forgiven: `config/gotham.php` (`arsenal.grace`, by mode).
  - Each check-in gives 10 XP, plus 20 when a measurable habit reaches its target, stored as `xp_awarded` on the log. Undoing the check-in takes it back.
  - `mode_specific` limits a habit to some modes.
- Alfred messages:
  - `actions` are `[{label, href?, action?, variant?}]`. A `href` is a link; an `action` runs through `POST /alfred/messages/{id}/action` (`AlfredController::run()`), which accepts only actions the message itself offers.
  - Standard messages come from `App\Services\AlfredService::sendMessage($user, $type, $data)`. Each type fixes its words, priority, mood and actions, and gets `type` and `subject_id` columns so detectors say it once a day per mission or habit (`sentToday()`).
  - Receipts (session_complete, case_closed, achievement_unlocked, level-ups, milestones, goals reached) are saved already read: the user just saw them on screen.
  - `AlfredRoundsJob` runs hourly by each user's local clock: procrastination from 08:00 to 21:59 (`no_start` after 10am unless in Rest mode, `task_avoidance` for missions postponed 3+ times), `streak_danger` at 20:00 (only for streaks that today's miss would actually end, grace counted), and burnout, energy patterns and insights at 23:00. Detection lives in `AlfredIntelligence`.
- XP:
  - Missions award 100/75/50/25 XP by priority (`Mission::XP`), once per mission (tracked in `xp_awarded`).
  - 1,000 XP per level. Every change goes through `App\Services\Xp::award($user, $amount, $reason, $label)`, which updates the user, writes `xp_events` (the XP history) and posts Alfred's level-up message. Don't call `User::gainXp()` directly.
  - Trophies: `App\Services\AchievementService::checkAndAward($user, $event)` after a qualifying action (`mission_complete`, `habit_complete`, `focus_complete`, `case_complete`, `milestone_complete`, `journal_save`, `resource_save`, `alfred_action`, `daily_login`). Each event checks only the criteria types it can move, plus levels. Criteria types are computed in `stat()`; `progress()` gives the trophy page's counts.
  - `App\Support\Rewards` collects what a request earned (XP, a level change, trophies); `AttachRewards` adds it to successful JSON responses as `rewards`. The web's `api` client hands it to `stores/rewards.ts`, and `RewardsHost` (in the `(gotham)` layout) shows the trophy and level-up modals or a "+XP" toast. The focus screen suppresses them (`SuppressRewards`). So features don't announce trophies or levels themselves.
  - `RecordDailyActivity` (on the authenticated route groups) notes each day the user opens the app (`user_activity_days`, for the login streak) and fires `daily_login`. Postponing a mission writes `mission_postponements`; acting on an Alfred message sets `acted_at` the first time.
- Focus sessions (`App\Services\FocusSessions`):
  - Only one runs per user; starting another abandons the previous one. A mission is optional.
  - The timer runs in the browser. `FocusSession::finish()` records whole minutes since the start, up to the planned length.
  - Completing awards 5 XP per full 25 minutes (`xp_awarded` on the session) and posts an Alfred message.
  - A mission's `actual_minutes` is the sum of its completed sessions.
  - Completing a mission completes its running session; abandoning a mission abandons it.
- Moving a mission's `due_date` later increments `times_postponed`; at 3, Alfred posts a "break it down" alert.
- Resources (finance), `App\Services\Finance`:
  - Amounts are USD.
  - Budgets are per category and month. A month without budgets of its own uses the latest earlier month's (`carried_over`) until some are saved for it.
  - Alfred posts one over-budget alert per category and month.
  - Recurring transactions are templates: `App\Services\RecurringResources` adds a copy (`recurring_source_id`) for each due date, counting from the template's date. `RecurringTransactionJob` runs it daily from the `scheduler` compose service (`php artisan schedule:work`). Saving a template also catches up right away.
  - Savings goals total the transactions linked to them (`savings_goal_id`, not mass-assignable). `SavingsGoal::recalculate()` keeps `current_amount` and `completed` in step.
- Operations (calendar), `App\Services\Operations`:
  - Times are stored in UTC. All-day events are dates with an exclusive end, in and out.
  - Recurring events (`recurring_rule` {freq, until}) are expanded into occurrences per request; editing or dragging one moves the whole series.
  - Habits with a `reminder_time` appear read-only.
  - A timed event linked to a mission sets the mission's `due_time` to its start.
  - Focus blocks (`kind = focus_block`, only made by `POST /operations/focus-block`) go at the `energy_pattern` peak from `system_intelligence` if there is one, else an hour after `work_start_time`, then to the next free 2 hours.
  - The web calendar (FullCalendar 6; v7 dropped the separate plugin packages) shows browser-local times and sends instants, so a browser in another timezone than the account still saves what it shows.
- Cases (projects), `App\Services\CaseProgress` and `CaseAnalytics`:
  - `auto` progress is the share of the case's non-abandoned missions that are completed; mission changes recalculate it through `CaseProgress::recalculate()`. `manual` cases are set with `PATCH /cases/{id}/progress`.
  - Each progress change saves that day's snapshot in `case_progress_logs` (the analytics `progress_history`).
  - Passing 25/50/75/100% posts an Alfred message once per mark per case (`progress_milestone`). Mission completion responses carry `case_milestone`, and the web shows `ProgressCelebration` (in the `(gotham)` layout, `stores/celebration.ts`).
  - `completed` is only reached through `POST /cases/{id}/complete`: +500 XP once (`xp_awarded`), Alfred's message, trophies. Setting another status reopens it.
  - On track / behind compares progress with a straight line from start to target, 10 points of grace.
  - `notes` is cleaned with `RichText::clean()`, like Intel.
- Overview (analytics):
  - `App\Support\Period` is a run of whole days in the user's timezone (week/month/quarter/year to today, or custom up to 366 days). `App\Services\DailyStats` gives per-day focus, missions, habits, Intel and XP for a period; `Overview`, `AlfredIntelligence` and `ReportService` all build on it.
  - XP earned is summed from each feature's `xp_awarded` plus trophy XP by `earned_at`; there is no XP ledger.
  - `AlfredIntelligence` reads the last 60 whole days, caches its insights for a day (`alfred-insights:{id}`), and replaces its patterns in `system_intelligence`, removing those that no longer hold. `energy_pattern.peak_hour` (from `energy_before` on focus sessions) is what focus blocks use.
  - Postponements aren't logged, so the postponement insight groups missions by their current due date.
  - Weekly reports run Monday to Sunday. `GenerateWeeklyReportsJob` runs hourly and saves each user's on Sunday at 11pm in their timezone (`weekly_reports`). `GET /overview/report` builds one live; a week still under way is compared with the same days of the week before.
- Dates: stored `date` columns are plain days, but `$user->today()` is midnight in the user's timezone. Compare them as `Y-m-d` strings or with `whereDate()`, never as Carbon instants. Also don't match date columns with `updateOrCreate`/`Rule::unique`: SQLite (the tests) stores them with a time.
- Intel (journal):
  - One entry per user per day; dates can't be in the future.
  - `content` is HTML from the web editor, cleaned by `App\Support\RichText::clean()` (basic tags, no attributes) before saving. The web renders it as-is, so never skip the cleaning.
  - `App\Services\IntelSentiment` scores the text by keywords. Saving an entry runs `AlfredIntelligence::detectBurnout()`: the last three entries all negative, or burnout words in the latest, sends `burnout_detected` (at most every 3 days, not in Rest mode).
  - Each new entry gives 5 XP (`xp_awarded`), taken back on delete. `GET /intel/prompt` gives a prompt for the day, and `GET /intel/insights` gives the numbers for the list page.
- `DemoSeeder` (run by `db:seed` in the local environment) gives `test@example.com` / `password` a full HQ. Re-running it resets that user's data.

Missions belong to Cases. HQ and Overview aggregate the other features. Streaks and trophies are computed on the API side, when the action happens.

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
