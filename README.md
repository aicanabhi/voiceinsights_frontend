# VoiceInsights Frontend

React (Vite) UI for the VoiceInsights API. Covers **Authentication** and
**Organizations**.

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

## Structure

```
src/
  api/          axios client (auth header + 401 handling), endpoint wrappers
  context/      AuthContext: login, logout, role checks
  components/   Layout, ProtectedRoute, Modal, OrganizationForm
  pages/        LoginPage, ChangePasswordPage, OrganizationsPage
```

## Notes

- Collection routes keep their trailing slash (`/organizations/`). Without it
  FastAPI issues a redirect, and the browser drops the `Authorization` header
  on the redirected request.
- `ProtectedRoute` mirrors the backend's `require_roles`. It is a UX layer
  only — the API remains the real authority.
