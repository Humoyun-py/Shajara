# AVLOD — Family Heritage Platform

> _Ildizlarimiz. Tariximiz. Merosimiz._ — Our roots. Our story. Our legacy.

AVLOD is a full-stack genealogy platform: private family workspaces, an interactive multi-generation
tree, person profiles that handle incomplete historical records, a memories archive with object
storage, a family timeline, invitations and role-based access, plus a cinematic public landing page
driven by a clearly-labelled fictional demo family.

```
avlod/
├─ apps/
│  ├─ api/            Express 5 + Prisma + PostgreSQL (REST /api/v1, OpenAPI at /api/docs)
│  │  ├─ prisma/      schema.prisma, committed migrations, seed.ts (fictional demo family)
│  │  ├─ scripts/     embedded PostgreSQL helpers (no-Docker local DB + test DB)
│  │  ├─ src/         config · lib · middleware · modules/* · routes · app.ts · server.ts
│  │  └─ tests/       integration tests against real PostgreSQL
│  └─ web/            React 18 + Vite 6 + TypeScript + Tailwind, Framer Motion, GSAP, React Flow
│     └─ src/         components · features · pages · layouts · hooks · services · lib · styles
├─ packages/shared/   Zod schemas, enums, relationship rules, DTO types (used by API and web)
├─ docker-compose.yml PostgreSQL 16 + MinIO (S3-compatible) for local development
└─ .env.example       placeholders only
```

## Quick start

Requirements: Node.js ≥ 22 (developed on Node 24, npm 11).

```bash
npm install
```

npm 11 blocks dependency install scripts until approved. This repository's `package.json` already
approves only Prisma, esbuild and the embedded PostgreSQL binaries (`allowScripts`); nothing else runs.

### 1. Database

**Option A — Docker (recommended):**

```bash
cp .env.example .env
npm run db:up
```

**Option B — no Docker (embedded PostgreSQL):** runs a real PostgreSQL 18 from the
`@embedded-postgres/*` npm package, data in `~/.avlod/pg`, port 54329.

```bash
npm run db:embedded
```

Keep it running in its own terminal, and set in `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:54329/avlod?schema=public
```

On Windows, if the repository path contains non-ASCII characters, the script copies the PostgreSQL
binaries once to `~/.avlod/pgbin-<version>` (PostgreSQL's `initdb` cannot run from such paths in UTF-8).

### 2. Secrets

Put long random values in `.env` for `JWT_ACCESS_SECRET` and `MEDIA_URL_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Migrate, seed, run

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

- Web: http://localhost:5173 (proxies `/api` to the API, so cookies stay first-party)
- API: http://localhost:4000 — Swagger UI at http://localhost:4000/api/docs, JSON at `/api/openapi.json`

The seed creates **“Karimovlar oilasi (namuna)”** — 25 fictional people across five generations, three
branches, an adoption, partial/approximate dates, memories, albums and timeline events. Every record
is flagged `isDemo`, the UI labels it as fictional, and it is the only family exposed by the public
demo endpoints. Local demo login: `demo@avlod.local` with the password from `SEED_DEMO_PASSWORD`
(default in `apps/api/prisma/seed.ts`; local development only).

### Resetting the demo data

- `npm run db:seed` — replaces only the demo family (real families are untouched).
- `npm run db:reset` — drops **all** data in the configured database and re-applies migrations, then
  seeds. Development databases only.

## Scripts

| Command                                                  | What it does                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                                            | API (tsx watch) + web (Vite)                                  |
| `npm run build`                                          | API bundle (`apps/api/dist`) + web bundle (`apps/web/dist`)   |
| `npm run start`                                          | Run the built API                                             |
| `npm test`                                               | Shared unit tests, API integration tests, web component tests |
| `npm run typecheck` / `lint` / `format` / `format:check` | Quality gates                                                 |
| `npm run db:migrate`                                     | Create a new migration in development (`prisma migrate dev`)  |
| `npm run db:deploy`                                      | Apply committed migrations (safe for production)              |
| `npm run db:seed` / `db:reset`                           | Demo data                                                     |
| `npm run db:up` / `db:down`                              | Docker Compose PostgreSQL + MinIO                             |

## Deploying to Netlify and Render

The deployment configuration files are at the Git repository root: `netlify.toml` builds the web
app from `avlod/`, and `render.yaml` provisions the API and PostgreSQL database on Render's free
plans. This free setup is for a demo only, not for storing important family data:

- Render's free PostgreSQL database expires 30 days after creation. Upgrade it before expiry to
  retain access; expired databases are eventually deleted.
- The free API service has an ephemeral filesystem and sleeps when idle. Uploaded media can be
  lost on sleep, restart, or redeploy. Use an S3-compatible storage service and a paid Render plan
  for durable uploads.
- Free services may take about a minute to wake after inactivity.

Deploy in this order:

1. Push the repository to GitHub. In Render, create a **Blueprint** from the repository root and
   deploy `render.yaml`. Render generates the JWT and media-signing secrets, creates the database,
   and applies committed Prisma migrations when the API starts.
2. In Render, set the API service's `WEB_ORIGIN` to the exact HTTPS origin Netlify assigns to the
   site, with no trailing slash (for example, `https://your-site.netlify.app`).
3. In Netlify, import the same repository. It detects the root `netlify.toml`; leave
   `VITE_API_BASE_URL` unset so browser requests use the same-origin proxy in
   `avlod/apps/web/public/_redirects`.
4. Confirm the API's Render URL. If it is not `https://avlod-api.onrender.com`, update the first
   rule in `avlod/apps/web/public/_redirects` to the actual API URL, then redeploy the Netlify site.
5. Test `https://<your-api>.onrender.com/api/v1/health`, then test sign-up/sign-in and media upload
   through the Netlify site. Add custom domains in each provider as needed; update `WEB_ORIGIN` to
   the final Netlify domain and redeploy.

The same-origin proxy is intentional: it keeps the refresh cookie first-party while the API runs
on Render. Do not point `VITE_API_BASE_URL` directly at the Render hostname in production. Render
free services cannot send outbound SMTP on common ports; configure a supported email provider if
invitations and password-reset links must be delivered. Without SMTP, messages are only written to
the API log. The demo family is not seeded in production, and public demo endpoints are disabled by
default.

## Architecture notes

### Data model (`apps/api/prisma/schema.prisma`)

`User`, `RefreshSession`, `PasswordResetToken`, `Family`, `FamilyMembership`, `FamilyInvitation`,
`Person`, `ParentChildRelationship`, `Union`, `MediaAsset`, `PersonPhoto`, `Album`, `Memory`,
`MemoryPerson`, `TimelineEvent`, `AuditLog`.

- UUID keys, timestamps, indexes on every foreign key used for filtering.
- Relationships are explicit rows, never a nested JSON tree. Parent→child links are typed
  (biological, adoptive, step, foster, guardian, other) and carry a verification status
  (verified / unverified / disputed). Partnerships (`Union`) are stored once with
  `partnerAId < partnerBId` (CHECK constraint).
- **Cross-family links are impossible at the database level**: relationship rows reference
  `Person(id, familyId)` through composite foreign keys.
- CHECK constraints: no self-parenting, ordered partner pairs, partial-date consistency, a person
  marked living cannot have a death date.
- **Cycle prevention**: relationship writes take a per-family advisory lock
  (`pg_advisory_xact_lock`) and check with a recursive CTE that the new parent is not already a
  descendant; at most two biological parents; no partner-as-parent; no duplicates. Concurrent
  conflicting writes are serialised (covered by a test).
- **Deletion policy**: foreign keys are `Restrict`. Deleting a person with relationships returns
  `409 HAS_RELATIONSHIPS` unless `?detach=true`; then only that person's links are removed and the
  person is archived, in one audited transaction. Families are archived (soft delete), never
  cascaded. Deleting an album keeps its memories.
- Partial dates: year / month / day + `approximate` flag for birth, death, memories and events.
- Multi-generation traversal uses recursive CTEs (`tree`, `generation`, `stats`).

### Security

- Passwords: bcrypt (12 rounds). Login: per-IP rate limit + per-account lockout after 5 failures;
  identical error for unknown email and wrong password.
- Sessions: 15-minute HS256 access token held in memory by the web app; 30-day refresh token in an
  `HttpOnly; SameSite=Strict; Path=/api/v1/auth` cookie, stored hashed, rotated on each use with
  reuse detection (a replayed token revokes all sessions). Password change/reset invalidates
  outstanding access tokens and refresh sessions. Cookie endpoints reject foreign `Origin`s.
- Authorization: every family route passes `familyAccess(minRole)`; every query is scoped by the
  membership's `familyId`. Non-members get 404 so workspace ids cannot be probed. Roles:
  Owner > Admin > Editor > Viewer (only the owner creates admins or transfers ownership).
- Privacy: living (or possibly living) people show only birth year and no birthplace to viewers;
  anonymous demo visitors additionally lose biography, occupation and portrait; research notes
  are editor-only.
- Uploads: type detected from file content (magic bytes), not the client's claim; images ≤ 20 MB,
  video ≤ 200 MB; per-user upload rate limit. Only storage keys and metadata live in PostgreSQL.
  Media is served via short-lived signed URLs (S3 presigned, or HMAC-signed for the local driver).
- Helmet headers, CORS limited to `WEB_ORIGIN`, JSON body limit, centralised error handler that
  never returns stack traces, Zod validation of every body and query, Prisma parameterised queries.
- `AuditLog` records structural edits, role changes, deletions (with before-snapshots), lockouts and
  refresh-token reuse; admins can read it at `GET /families/:id/audit`.

### API

All routes under `/api/v1`. Success: `{ data, meta? }`; errors: `{ error: { code, message, details? } }`.
Areas: auth & sessions, users, families & members, invitations, people, relationships (parents,
unions), tree (full or windowed with `rootId/up/down`), search, statistics, memories, albums, media,
timeline, public demo, health. See `/api/docs`.

### Frontend

- Landing: SVG hero illustration (ancient _chinor_ at dusk) with GSAP depth parallax, Framer Motion
  staggered headline, ambient motes, scroll cue; animated demo-tree showcase (one lineage, five
  generations) with profile drawer; GSAP scroll-revealed story timeline; filterable memories
  gallery with lightbox; count-up statistics from the database; closing section and footer.
- Tree (`/family/:id/tree`): React Flow with automatic dagre layout. Each couple becomes a small
  union node from which shared children hang; adoptive/step links are dashed, unverified links are
  muted. Zoom, pan, fit view, minimap, controls, keyboard (Tab + Enter), name search (local +
  server-wide), branch focus (dims other branches), lazy subtree loading for large families
  (`↑ ↓` buttons on nodes with relatives outside the loaded window), URL-preserved selection, profile
  drawer with add-parent/partner/child, edit and confirmed delete.
- **Mobile tree model**: a “Fokus” view — one person centred, parents above, partners and siblings
  beside, children below; tapping moves the focus. Plus a generation-grouped list view.
- Profiles, people directory (search, branch filter, sort, pagination), memories (upload, albums,
  filters by year/type/person/album, edit, delete with permission), timeline (CRUD), family settings
  (rename, members & roles, ownership transfer, expiring invitations, archive), account settings
  (profile, password change, sign out everywhere), invitation accept/decline, privacy page, 404.
- Accessibility: semantic landmarks, skip links, labelled form controls with linked errors, focus
  trapping and focus return in dialogs, visible focus rings, `prefers-reduced-motion` honoured by
  Framer (`MotionConfig`), GSAP (skipped) and CSS.

## Storage configuration

- `STORAGE_DRIVER=local` (default): files under `LOCAL_STORAGE_DIR`, served only through
  `/api/v1/media/local/*` with an HMAC signature and expiry (`MEDIA_URL_SECRET`). Range requests
  supported (video seeking).
- `STORAGE_DRIVER=s3`: any S3-compatible service. Set `S3_ENDPOINT` (omit for AWS), `S3_REGION`,
  `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=true` for MinIO.
  `npm run db:up` starts MinIO and creates a private `avlod-media` bucket (console on :9001).
  Keep the bucket private — the API issues presigned GET URLs (1 hour).

## Email

Password reset and invitations use SMTP when `SMTP_HOST` is set. Without it, messages (including
links) are written to the API log, and the invitation link is also shown once to the inviting admin.

## Deployment

1. Provision PostgreSQL 14+ and an S3-compatible bucket.
2. Set production environment variables (`NODE_ENV=production`, strong secrets, `COOKIE_SECURE=true`,
   `WEB_ORIGIN=https://your-domain`, `STORAGE_DRIVER=s3`, SMTP).
3. API: `docker build -f apps/api/Dockerfile -t avlod-api .` (runs `prisma migrate deploy` on start),
   or `npm ci && npm run build && npm run db:deploy && npm start`.
4. Web: `npm run build -w @avlod/web` and serve `apps/web/dist` as static files with an SPA fallback
   to `index.html`. Serve web and API on the same site (e.g. reverse-proxy `/api` to the API) so the
   `SameSite=Strict` refresh cookie works. Set `PUBLIC_DEMO_ENABLED=false` if you do not seed demo data.
5. CI: `.github/workflows/ci.yml` runs lint, format check, typecheck, all tests (against a PostgreSQL
   service via `TEST_DATABASE_SERVER_URL`) and builds.

## Backup and restore

- Database: `pg_dump --format=custom --file=avlod-$(date +%F).dump "$DATABASE_URL"`; restore with
  `pg_restore --clean --no-owner --dbname "$DATABASE_URL" avlod-YYYY-MM-DD.dump`. Schedule daily
  dumps and keep point-in-time recovery enabled on managed PostgreSQL.
- Media: enable bucket versioning and replicate/sync the bucket (`mc mirror` / `aws s3 sync`).
  Back up database and bucket together — the database stores the object keys.
- Archived families and people remain in the database (`deletedAt`) and can be restored by an operator.

## Testing

| Suite                  | Scope                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` (13) | cycle detection, parent rules, generations/branches, partial dates, roles, schemas                                                                                                                                                                                                                                                                                      |
| `apps/api` (46)        | auth (lockout, rotation & reuse detection, CSRF origin, reset), **workspace isolation** (other family's records unreachable by id, cross-family linking/tagging rejected), role enforcement, invitations, relationship rules incl. concurrency, tree windows, stats, deletion policy & audit, uploads (signed URLs, spoofed file types), privacy redaction, public demo |
| `apps/web` (8)         | tree layout & lineage selection, confirm dialog a11y/focus, form field a11y, upload validation                                                                                                                                                                                                                                                                          |

API tests start their own PostgreSQL (`~/.avlod/test-pg`, port 54339) or use
`TEST_DATABASE_SERVER_URL`; each run creates a uniquely named database, applies migrations with
`migrate deploy`, and drops it afterwards.

## Implementation checklist

- [x] Phase 1 — monorepo, design tokens, app shell, landing page, reusable components
- [x] Phase 2 — PostgreSQL schema + migration, auth (access/refresh), workspaces & authorization
- [x] Phase 3 — people, typed relationships with validation, interactive tree (graph / focus / list)
- [x] Phase 4 — profiles, memories with media upload, albums, timeline
- [x] Phase 5 — invitations, roles & ownership transfer, search, statistics, settings
- [x] Phase 6 — tests, accessibility pass, code-splitting, docs, CI, Dockerfile

## Known limitations

- No email-address verification at sign-up; invitation acceptance relies on the emailed token plus a
  matching account email.
- No server-side image thumbnails/resizing or video transcoding (originals are served).
- Albums can be created and deleted via the API; the UI creates and filters albums but has no
  album-delete button yet.
- Large trees load in windows around a root person (recursive CTE); there is no infinite
  “merge-as-you-expand” canvas — expanding re-centres the window.
- UI is Uzbek-only (`User.locale` exists for future i18n).
- The API `Dockerfile` and Docker Compose setup were written but not executed in the development
  environment used here (Docker was unavailable); the embedded-PostgreSQL path was used and tested.
- Landing imagery is an SVG illustration; real photography can replace `HeroArt` without other changes.
