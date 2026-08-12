# VoiceInsights Frontend

React (Vite) UI for the VoiceInsights API. Covers **Authentication**,
**Organizations**, **Teams**, **Organization Agents**, **Providers**, **Users**,
**Media**, **Analysis** and **Dashboard**.

The only backend endpoints without a UI are `/transcripts/`, which are redundant
— `GET /media/{id}/result` already returns the transcript with its segments.

## Setup

```bash
npm install
cp .env.example .env     # set VITE_API_BASE_URL if the API is not on :8000
npm run dev              # http://localhost:5173
```

The backend must be running and must allow this origin. Its `CORS_ORIGINS`
setting defaults to `http://localhost:5173,http://127.0.0.1:5173`.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with HMR on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` |

## What is wired up

### Authentication

- **Login** (`POST /auth/login`) — the endpoint uses `OAuth2PasswordRequestForm`,
  so the request is form-encoded and the email goes in the field named
  `username`, not `email`.
- **Change password** (`POST /auth/change-password`).
- Token and user are persisted in `localStorage`. There is no `/auth/me`
  endpoint, so the user object returned by login is what the app rehydrates
  from on reload.
- Any `401` clears the stored session and redirects to `/login`.

### Organizations

| Action | Endpoint | Allowed roles |
| --- | --- | --- |
| List all | `GET /organizations/` | `SUPER_ADMIN` |
| View one | `GET /organizations/{id}` | `SUPER_ADMIN`, `ORG_ADMIN` (own only) |
| Create | `POST /organizations/` | `SUPER_ADMIN` |
| Update | `PUT /organizations/{id}` | `SUPER_ADMIN`, `ORG_ADMIN` (own only) |
| Delete | `DELETE /organizations/{id}` | `SUPER_ADMIN` |

The page adapts to the role: a super admin gets the full table with create,
edit, delete and search; an org admin sees only their own organization with
edit. Delete asks for confirmation and then reports the cascade, since removing
an organization also removes its teams and users.

`is_active` is only sent on update — `OrganizationCreate` has no such field.

### Users

`GET /users/` returns whatever the caller's role is allowed to see — a super
admin gets everyone, an org admin their organization, a team lead their team,
an agent only themselves. The page renders that list as-is; no client-side
filtering is needed for scope.

Who can create whom (from `UserService.create_user`):

| Caller | May create |
| --- | --- |
| `SUPER_ADMIN` | `ORG_ADMIN` |
| `ORG_ADMIN` | `TEAM_LEAD`, `AGENT` |
| `TEAM_LEAD` | `AGENT` |
| `AGENT` | nobody |

The role dropdown offers only those options, and the organization/team fields
are prefilled and locked for non-super-admins, since the API rejects creating
outside your own scope. `organization_id` is required for every non-super-admin
user, and `team_id` additionally for `TEAM_LEAD` and `AGENT`.

On edit, email and role are fixed — `UserUpdate` has neither field. The password
input is only sent when something is typed, so saving other fields does not
overwrite the password.

### Media

| Action | Endpoint |
| --- | --- |
| Upload | `POST /media/upload` |
| List | `GET /media/` |
| Status | `GET /media/{id}` |
| Full result | `GET /media/{id}/result` |
| Audio | `GET /media/{id}/audio` |

Three things about this API shape the client:

1. **`calling_agent_id` and `provider` are query parameters**, not form fields.
   The multipart body carries only `files`. Sending them in the body returns a
   422.
2. **The audio route is authenticated**, so `<audio src="…">` would 401 — the
   browser does not attach the `Authorization` header to a bare media src. The
   player fetches the file as a blob through the axios client and plays an
   object URL, revoked on unmount.
3. **`transcript` and `analysis` are null while the job is PENDING or
   PROCESSING.** Both the list and the detail page poll every 5s, and only while
   something is actually in flight.

Upload is capped at 10 files per request and 25 MB per file, matching
`app/constants/upload.py`. The response reports per-file outcomes, so a rejected
file is named rather than folded into a generic success.

The detail page shows the audio player, call metrics, per-speaker talk stats,
the analysis scores, and the transcript. When segments carry timestamps, they
are click-to-seek and the active one is highlighted as the audio plays.

### Teams

| Action | Endpoint | Allowed roles |
| --- | --- | --- |
| List | `GET /teams/` | `SUPER_ADMIN`, `ORG_ADMIN`, `TEAM_LEAD` |
| Create / update / delete | `POST`/`PUT`/`DELETE /teams/…` | `SUPER_ADMIN`, `ORG_ADMIN` |

**`GET /teams/` is the one list endpoint that 403s for an `AGENT`** rather than
returning an empty list, so both the route and the nav entry are gated, and the
user form skips the fetch entirely for that role.

`organization_id` is absent from `TeamUpdate` — a team cannot change
organization, so the field is locked on edit. Team names must be unique within
an organization; a clash returns 400.

The team pickers in the user form are filtered to the selected organization, and
fall back to a plain number input if the team list could not be loaded.

### Organization agents & providers

An agent is one organization's configuration for one provider, stored in Mongo
with a unique index on `(organization_id, provider)`. **Uploads read the model,
language and API key from here**, so an organization with no agent for the
chosen provider gets a 400 on upload — which is why the page shows provider
coverage, not just a list.

| Action | Endpoint | Allowed roles |
| --- | --- | --- |
| List all | `GET /organization-agents/` | `SUPER_ADMIN` |
| List for an org | `GET /organization-agents/{org}` | `SUPER_ADMIN`, that org's `ORG_ADMIN` |
| Get one | `GET /organization-agents/{org}/{provider}` | same |
| Create | `POST /organization-agents/` | `SUPER_ADMIN` |
| Update | `PUT /organization-agents/{org}/{provider}` | `SUPER_ADMIN` |
| Delete | `DELETE /organization-agents/{org}/{provider}` | `SUPER_ADMIN` |

Reading is wider than writing, so an org admin sees the page read-only with a
note; the create/edit/delete controls are super-admin only.

Three API rules shape the form:

1. **`security_key` is write-only.** The response carries `has_security_key`, a
   boolean, and never the key itself. So the field starts empty on edit, shows
   whether one is configured, and is sent only when something is typed —
   otherwise saving a name change would wipe the stored key.
2. **`provider` is not updatable.** It is the routing key, so it is locked on
   edit; moving to another provider means creating a second agent. Update is
   keyed by `(org, provider)` rather than by id for the same reason.
3. **The model must belong to the provider**, validated in both the schema and
   the service. The model dropdown is driven by `GET /providers/` and resets
   whenever the provider changes, so an invalid pair cannot be submitted.

Creating a second agent for a provider an organization already has returns 400
("Update it instead") — the unique index enforces it.

### Analysis

`GET /analysis/` lists every analysis the caller can see. The response carries
only `media_id`, so the page fetches `/media/` alongside it to put a filename on
each row — both endpoints apply the same role scope, so the lists line up.

`POST /analysis/generate/{media_id}` re-runs the LLM over an existing
transcript. It is offered on this page per row, and on the call detail page when
a recording is transcribed but has no analysis. It fails with 400 if there is no
transcript, or if the organization has no agent config for the provider the
media was transcribed with.

Sentiment is normalized server-side to Positive / Neutral / Negative, but
anything unrecognized is kept verbatim, so the UI falls back to a neutral swatch
rather than dropping the value.

### Dashboard

There is no single "my dashboard" route — each role has its own, keyed by a
different id, so `defaultScopeFor()` picks the entitled one:

| Role | Route |
| --- | --- |
| `SUPER_ADMIN` | `/dashboard/super-admin` |
| `ORG_ADMIN` | `/dashboard/organization/{their org}` |
| `TEAM_LEAD` | `/dashboard/team/{their team}` |
| `AGENT` | `/dashboard/agent/{their id}` |

All four responses share the same metric block and differ only in their header
fields, so one page renders any of them. A scope picker allows drilling into any
organization (super admin) or any visible agent — both lists come from
already-scoped endpoints, so anything offered is something the API will allow.

An account with no organization or team gets an explanatory message instead of a
guaranteed 403.

#### Chart colours

Colours are chosen by the job the data does, not by taste, and are validated
rather than eyeballed. They live in `src/lib/vizColors.js`.

- **Sentiment is polarity**, so it uses a diverging pair — blue positive, red
  negative, neutral grey between. Those poles pass every check against the card
  surface (CVD ΔE 21.6, normal-vision ΔE 32.3, both ≥ 3:1 contrast).
- **Call status** uses the reserved status colours, and green "completed" beside
  red "failed" separates by only ΔE 4.1 under deuteranopia. That pair is
  therefore never rendered as adjacent segments of one bar — each status gets
  its own labelled row, so the name and count carry the meaning and colour is a
  redundant cue.
- **Scores** are one measure across four names, so they take a single hue with
  direct value labels and no legend.

## Structure

```
src/
  api/          axios client (auth header + 401 handling), endpoint wrappers
  context/      AuthContext: login, logout, role checks
  lib/          permissions (mirrors backend role rules), formatters, viz colours
  components/   Layout, ProtectedRoute, Modal, forms, UploadDialog, AudioPlayer
    charts/     BarRows, StackedBar
  pages/        Login, ChangePassword, Organizations, Teams,
                OrganizationAgents, Users, Media, MediaDetail, Analysis,
                Dashboard
```

## Known backend issue

`POST /analysis/generate/{media_id}` always **inserts** a new analysis row —
`analysis.media_id` has no unique constraint and the previous row is not
removed — while `get_call_result` reads it back with `scalar_one_or_none()`.
A second analysis for the same recording therefore makes
`GET /media/{id}/result` raise `MultipleResultsFound` and return 500 for good.

Because of that there is deliberately **no re-analyse action** in this UI.
"Generate analysis" is offered only where no analysis exists yet. Restore the
re-run controls once the backend either upserts or reads back the latest row.

## Notes

- Collection routes keep their trailing slash (`/organizations/`). Without it
  FastAPI issues a redirect, and the browser drops the `Authorization` header
  on the redirected request.
- `ProtectedRoute` mirrors the backend's `require_roles`. It is a UX layer
  only — the API remains the real authority.
