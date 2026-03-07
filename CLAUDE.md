# REVIV — CLAUDE.md

This file defines the architecture, conventions, and implementation standards for building REVIV. Follow everything here precisely and consistently across all files.

---

## Project Overview

REVIV is a full-stack web application for community-driven environmental cleanup. The core user loop is:
**Discover a litter problem on the globe → Submit a report → Create or join a cleanup event → Confirm resolution.**

The app must feel polished, fast, and intuitive. The 3D globe is the hero feature — it must be smooth, responsive, and visually compelling.

---

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: JavaScript (JSX) — no TypeScript for POC speed
- **Routing**: React Router v6
- **Server state / data fetching**: TanStack Query (React Query v5)
- **Client state**: Zustand
- **Styling**: Tailwind CSS v3
- **3D Globe**: `react-globe.gl` (wrapper around Globe.gl / Three.js)
- **Forms**: React Hook Form + Zod for validation
- **HTTP client**: Axios with a configured instance
- **Date handling**: date-fns
- **Notifications (in-app)**: Custom context + toast UI (react-hot-toast)
- **File uploads**: Native fetch with FormData

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ASGI server**: Uvicorn
- **ODM**: Beanie (async MongoDB ODM built on Motor + Pydantic v2)
- **Validation**: Pydantic v2 (comes with FastAPI/Beanie)
- **Auth**: JWT via `python-jose[cryptography]`; passwords via `passlib[bcrypt]`
- **File storage**: Local filesystem for POC (structured for S3 swap later)
- **Background tasks**: FastAPI BackgroundTasks for notifications
- **CORS**: FastAPI CORSMiddleware
- **Environment config**: `pydantic-settings` with `.env` file

### Database
- **Database**: MongoDB (Atlas for hosted, local for dev)
- **Geospatial**: GeoJSON Point format for all location data; 2dsphere indexes on all geo fields
- **Images**: Stored as file paths referencing uploaded files; served via FastAPI static files

---

## Repository Structure

```
reviv/
├── CLAUDE.md
├── README.md
├── .env.example
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/               # Axios instance + per-resource API functions
│       │   ├── client.js      # Configured Axios instance (base URL, interceptors)
│       │   ├── auth.js
│       │   ├── reports.js
│       │   ├── events.js
│       │   └── users.js
│       ├── components/        # Shared reusable UI components
│       │   ├── Globe/
│       │   │   ├── GlobeView.jsx       # Main globe component
│       │   │   ├── ReportMarker.jsx    # Marker layer for reports
│       │   │   ├── EventMarker.jsx     # Marker layer for events
│       │   │   └── DetailPanel.jsx     # Slide-in panel on marker click
│       │   ├── Auth/
│       │   │   ├── LoginForm.jsx
│       │   │   └── RegisterForm.jsx
│       │   ├── Events/
│       │   │   ├── EventCard.jsx
│       │   │   ├── EventForm.jsx
│       │   │   └── EventList.jsx
│       │   ├── Reports/
│       │   │   ├── ReportForm.jsx
│       │   │   └── ReportCard.jsx
│       │   └── UI/            # Generic UI primitives (Button, Modal, Badge, Spinner)
│       ├── pages/
│       │   ├── HomePage.jsx        # Globe view (main landing after login)
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── EventDetailPage.jsx
│       │   └── NotificationsPage.jsx
│       ├── stores/
│       │   ├── authStore.js        # Zustand: current user, token, login/logout
│       │   └── globeStore.js       # Zustand: globe viewport state, selected marker
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useGeoLocation.js   # Browser geolocation API
│       │   └── useNotifications.js
│       └── utils/
│           ├── geo.js              # Coordinate helpers, distance calculations
│           └── formatters.js       # Date, duration, severity label formatting
│
└── backend/
    ├── main.py                # App entry point, lifespan, router includes
    ├── requirements.txt
    ├── .env
    └── app/
        ├── core/
        │   ├── config.py          # pydantic-settings Settings class
        │   ├── security.py        # JWT encode/decode, password hashing
        │   └── dependencies.py    # FastAPI Depends: get_current_user, etc.
        ├── db/
        │   └── database.py        # Beanie init, Motor client
        ├── models/                # Beanie Document models (MongoDB collections)
        │   ├── user.py
        │   ├── report.py
        │   ├── event.py
        │   └── notification.py
        ├── schemas/               # Pydantic request/response schemas (not DB models)
        │   ├── auth.py
        │   ├── user.py
        │   ├── report.py
        │   └── event.py
        ├── api/
        │   └── routes/
        │       ├── auth.py        # /api/auth/*
        │       ├── users.py       # /api/users/*
        │       ├── reports.py     # /api/reports/*
        │       ├── events.py      # /api/events/*
        │       └── notifications.py  # /api/notifications/*
        ├── services/              # Business logic layer (not FastAPI-specific)
        │   ├── auth_service.py
        │   ├── report_service.py
        │   ├── event_service.py
        │   └── notification_service.py
        └── uploads/               # Served as static files at /uploads/*
```

---

## Data Models

All location fields use **GeoJSON Point** format:
```json
{ "type": "Point", "coordinates": [longitude, latitude] }
```
MongoDB 2dsphere indexes are required on every location field.

### User
```
id, email, hashed_password, display_name, avatar_url,
location: GeoJSON Point,          # home city center point
created_at, is_verified,
stats: {
  events_attended, events_organized,
  total_volunteer_hours, reports_submitted, reports_resolved
}
```

### Report
```
id, submitted_by (User ref),
location: GeoJSON Point,
location_label,                   # reverse-geocoded or user-supplied label
severity: "low" | "medium" | "high",
category: "roadside" | "park" | "waterway" | "construction" | "illegal_dump",
description,
photo_urls: [],
upvotes: [User ids],
status: "active" | "resolved",
linked_event_id (Event ref, optional),
created_at, resolved_at
```

### Event
```
id, organizer_id (User ref),
name, description, what_to_bring,
location: GeoJSON Point,
location_label,
linked_report_id (Report ref, optional),
date_time, duration_minutes,
max_volunteers (optional),
attendee_ids: [],
waitlist_ids: [],
status: "open" | "full" | "in_progress" | "completed" | "resolved",
post_cleanup_photos: [],
resolution_confirmations: [User ids],   # attendees who confirmed clean
created_at, completed_at
```

### Notification
```
id, user_id (User ref),
type: "event_reminder" | "new_nearby_event" | "event_updated" |
      "report_linked" | "post_event_confirm",
message, is_read,
related_event_id (optional), related_report_id (optional),
created_at
```

---

## API Design

**Base URL**: `/api`

All routes follow REST conventions. All responses are JSON. Auth-protected routes require `Authorization: Bearer <token>` header.

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Users
```
GET    /api/users/:id
PATCH  /api/users/:id                  # update profile (auth required, own user only)
GET    /api/users/:id/events
GET    /api/users/:id/reports
```

### Reports
```
GET    /api/reports                    # query params: lat, lng, radius_km, severity, status
POST   /api/reports                    # auth required; multipart/form-data for photos
GET    /api/reports/:id
PATCH  /api/reports/:id/upvote         # auth required
PATCH  /api/reports/:id/resolve        # auth required (linked event organizer only)
```

### Events
```
GET    /api/events                     # query params: lat, lng, radius_km, date_from, date_to, status
POST   /api/events                     # auth required
GET    /api/events/:id
PATCH  /api/events/:id                 # auth required (organizer only)
POST   /api/events/:id/join            # auth required
POST   /api/events/:id/leave           # auth required
POST   /api/events/:id/complete        # auth required (organizer only)
POST   /api/events/:id/confirm         # auth required (attendees confirm area clean)
```

### Notifications
```
GET    /api/notifications              # auth required; returns current user's notifications
PATCH  /api/notifications/:id/read    # mark as read
PATCH  /api/notifications/read-all
```

---

## Key Implementation Rules

### Geospatial
- Store ALL locations as GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }`. Note: GeoJSON is **[longitude, latitude]** order, not lat/lng. Never mix this up.
- Apply `2dsphere` index on every location field in every model that has one.
- Use MongoDB `$near` operator for proximity queries. Always include a `$maxDistance` in meters.
- The reports and events list endpoints MUST support `lat`, `lng`, and `radius_km` query params for geospatial filtering.

### Authentication & Security
- JWT tokens: 30-minute access token, no refresh token for POC.
- Store token in `localStorage` on the frontend (acceptable for POC).
- Hash passwords with bcrypt (12 rounds).
- Never return `hashed_password` in any response schema.
- All user-modifying endpoints must verify the authenticated user matches the resource owner.
- Validate and sanitize all user-supplied text fields. Never interpolate them into queries.
- File uploads: validate MIME type server-side (allow only `image/jpeg`, `image/png`, `image/webp`). Limit to 5MB per file.

### Globe (Frontend)
- Use `react-globe.gl`. The globe is the homepage — it mounts immediately after login.
- On mount, center the globe on the authenticated user's saved location. If no location saved, use browser Geolocation API, then fall back to a world view.
- Fetch reports and events within a bounding box or radius derived from the current globe viewport.
- Re-fetch markers when the user zooms in significantly or pans to a new area (debounce by 500ms to avoid hammering the API).
- Use two separate marker layers: one for reports (circles, color by severity), one for events (distinct icon/shape).
- At zoom levels showing a wide area, cluster nearby markers into a count bubble. Use `react-globe.gl`'s custom HTML element markers for this.
- Clicking a marker opens the `DetailPanel` component as a slide-in overlay — do not navigate away from the globe.

### State Management
- **Zustand `authStore`**: `user`, `token`, `isAuthenticated`, `login(token, user)`, `logout()`
- **Zustand `globeStore`**: `selectedMarker`, `panelOpen`, `viewportCenter`, `zoomLevel`
- **TanStack Query**: all server data (reports, events, notifications, profile). Do not duplicate server state into Zustand.
- Invalidate relevant queries after mutations (e.g., after joining an event, invalidate the event detail query and the user profile query).

### API Client (Frontend)
- Single Axios instance in `src/api/client.js` with `baseURL` from `import.meta.env.VITE_API_URL`.
- Request interceptor: attach `Authorization: Bearer <token>` from Zustand authStore if present.
- Response interceptor: on 401, call `authStore.logout()` and redirect to `/login`.
- All API functions live in resource files (`auth.js`, `reports.js`, etc.) and are plain async functions — not hooks. Hooks live in `/hooks` and use TanStack Query wrapping the API functions.

### FastAPI Conventions
- One router per resource in `app/api/routes/`. Include all routers in `main.py`.
- Business logic lives in `app/services/`, not in route handlers. Route handlers do: parse input → call service → return response.
- Use Beanie Documents as DB models. Use separate Pydantic schemas for API request/response — never expose the Document directly as a response.
- Use `Annotated` + `Depends` for all dependency injection.
- Return consistent error responses: `{ "detail": "message" }` using FastAPI's `HTTPException`.
- Use `BackgroundTasks` to send notifications after mutations (joining an event, resolving a report, etc.) so the user-facing response is not blocked.

### File Uploads
- Endpoint receives `multipart/form-data`.
- Save files to `backend/app/uploads/<resource_type>/<uuid>.<ext>`.
- Store only the relative path in MongoDB (`/uploads/reports/abc123.jpg`).
- Serve the uploads directory as a FastAPI `StaticFiles` mount at `/uploads`.
- For POC: no CDN, no S3. The service layer should be written so storage backend can be swapped (abstract a `save_file(file) -> str` function in a `storage.py` utility).

### Notifications
- Triggered server-side as background tasks on key events:
  - User joins an event → notify organizer
  - Event is updated/cancelled → notify all attendees
  - New event created near a user → notify users within 25km (batch, run as background task)
  - Event date arrives → "reminder" notification (POC: created at event creation time, no cron)
  - Event marked complete → notify all attendees to confirm
- Frontend polls `/api/notifications` every 60 seconds while the user is active (no WebSockets for POC).
- Unread count shown in nav; notifications page shows full list.

---

## Coding Standards

### General
- Write clean, readable code. Prioritize clarity over cleverness.
- No commented-out code in committed files.
- No `console.log` left in production paths (use only during debugging, remove before committing).
- Keep functions small and single-purpose.
- Do not over-engineer. Build exactly what is needed for the POC feature scope.

### Python (Backend)
- Follow PEP 8. Use snake_case for variables/functions, PascalCase for classes.
- All route handler functions must be `async def`.
- All Beanie/Motor database calls must be awaited.
- Use Python type hints on all function signatures.
- Group imports: stdlib → third-party → local.

### JavaScript (Frontend)
- Use functional components and hooks only — no class components.
- Use camelCase for variables/functions, PascalCase for components.
- One component per file. Component filename matches component name.
- Prefer named exports over default exports for non-page components.
- Pages use default exports.
- Use `const` by default. Only use `let` when reassignment is truly needed.

### Tailwind CSS
- Use Tailwind utility classes directly in JSX. Do not write custom CSS unless unavoidable.
- Use a consistent color scheme: define REVIV brand colors in `tailwind.config.js` (earth greens, deep blues, clean whites).
- The app must be fully responsive: mobile-first design. The globe must work on touch screens.

---

## Environment Variables

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000/api
```

### Backend (`backend/.env`)
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=reviv
SECRET_KEY=<strong-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=app/uploads
CORS_ORIGINS=["http://localhost:5173"]
```

---

## Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

FastAPI auto-docs available at `http://localhost:8000/docs`.

---

## Feature Priority Order (Build in this sequence)

1. **Project scaffolding** — repo structure, Vite + React setup, FastAPI app skeleton, MongoDB connection via Beanie
2. **Auth** — register, login, JWT, protected routes, `authStore`
3. **Globe view** — `react-globe.gl` mounted on home page, centered on user location, empty markers layer
4. **Reports** — submit a report (form + photo upload), fetch reports by location, render on globe
5. **Location Detail Panel** — click a marker, see report details slide in
6. **Events** — create event (optionally linked to report), fetch events by location, render on globe, event detail page
7. **Join / Leave Events** — join/leave flow, attendee list, volunteer cap + waitlist
8. **Event Lifecycle** — organizer marks complete, attendees confirm, report marked resolved, marker updated
9. **Notifications** — background tasks trigger notifications, frontend polling, unread badge, notifications page
10. **Impact Dashboard** — profile page with stats, community stats page
11. **Bonus: Upvoting reports** — upvote button on report detail, surfaced in sort order

---

## Things to Never Do

- Never store plaintext passwords.
- Never return the `hashed_password` field in any API response.
- Never trust client-supplied user IDs for ownership checks — always derive from the JWT.
- Never use synchronous MongoDB calls in FastAPI routes (always async via Motor/Beanie).
- Never hardcode secrets or API keys in source code.
- Never skip GeoJSON coordinate order — it is always `[longitude, latitude]`.
- Never let globe re-fetch on every render — debounce viewport-driven fetches.
- Never put business logic in route handlers — it belongs in the service layer.
