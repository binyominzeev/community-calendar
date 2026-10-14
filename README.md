# Community Calendar

A modern web application for managing recurring Jewish community events based on the Hebrew calendar.

## Features

- **People management** — maintain a permanent database of people with tags
- **Hebrew calendar events** — Yahrzeits, Birthdays, and custom event types
- **Automatic date conversion** — Hebrew ↔ Gregorian conversion for any selected Hebrew year
- **Calendar views** — Monthly and weekly views filterable by tag and event type
- **Spreadsheet-style import** — paste directly from Excel/Google Sheets
- **Export** — Google Calendar (.ics) and printable HTML
- **Yearly schedule generation** — automatically generate the full schedule for any Hebrew year
- **Extensible** — add new event types without database redesign

## Technology Stack

- **Next.js 14** (App Router) + TypeScript
- **SQLite** via Prisma ORM + `@prisma/adapter-better-sqlite3`
- **@hebcal/core** for Hebrew calendar calculations (including leap years, Adar I/II)
- **Tailwind CSS v4** for styling
- **NextAuth** for simple credentials-based authentication
- **Docker** support included

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Development Setup

```bash
# Install dependencies
npm install

# Set up database (applies migrations + seeds default data)
npm run db:setup

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login goes through Pocket ID (OIDC).

### Environment Variables

Create a `.env.local` file:

```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Pocket ID (register redirect URI: ${NEXTAUTH_URL}/api/auth/callback/pocket-id)
OIDC_ISSUER=https://auth.binjomin.hu
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=

# Google Calendar (redirect URI: ${NEXTAUTH_URL}/api/google/callback)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# 32 random bytes, base64: openssl rand -base64 32
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

### Google Client ID and Secret

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick an existing one).
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** (Google Auth platform): choose *External*, fill in the app name and emails, and add the scope `https://www.googleapis.com/auth/calendar`.
   - While the app is in *Testing* mode, add your Google accounts under *Test users*, and note that refresh tokens expire after 7 days. Click *Publish app* for permanent tokens (unverified apps show a warning screen, which is fine for personal use).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type *Web application*, and add this under *Authorized redirect URIs*:
   - `http://localhost:3000/api/google/callback` (development)
   - `https://your-domain/api/google/callback` (production, must match `NEXTAUTH_URL`)
5. Copy the generated **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Docker Deployment

```bash
docker compose up -d
```

The SQLite database is stored in `./prisma/dev.db` and is persisted via a Docker volume mount.

#### Rebuilding and disk space

Update the running app with:

```bash
docker compose up -d --build
```

Each rebuild leaves behind build cache (about 2 GB). It is safe to clear: it only costs a slower next build.

```bash
docker builder prune -f   # unused build cache only
docker image prune -f     # old untagged images from previous builds
```

These commands do not touch running containers, tagged images in use, volumes or `./prisma/dev.db`. Avoid `docker system prune --volumes`, which would delete the volumes of other projects.

## Data Model

### Person

- `displayName` (required)
- `hebrewName` (optional)
- `notes` (optional)
- `tags` — many-to-many, user-editable (e.g., NF, BJ, Gedolim)

### Event

- Belongs to one person
- `eventType` — Yahrzeit, Birthday, or any custom type
- `hebrewDay` + `hebrewMonth` — the primary recurring date stored in Hebrew calendar
- `remarks` (optional)

Events are resolved to Gregorian dates automatically for any selected Hebrew year. Adar II is handled correctly for leap years.

## Usage

### Adding People

Go to **People** → click **Add Person**. Fill in the name, optional Hebrew name, notes, and tags. Expand a person row to add events (Yahrzeits, Birthdays).

### Calendar View

Go to **Calendar**. Select the Hebrew year (auto-detected from today). Toggle between **Month** and **Week** views. Filter by tag or event type. Export to Google Calendar (.ics) or print.

### Import from Excel

Go to **Import**. Copy cells from Excel or Google Sheets and paste into the table. Columns map in order:

| Name | Hebrew Name | Notes | Tags | Event Type | Hebrew Date | Remarks |
|------|-------------|-------|------|------------|-------------|---------|

Hebrew date format: `7 Tishrei`, `15 Nisan`, `7 Adar II`, etc.

### Settings

Go to **Settings** to manage tags and event types, and to connect Google Calendar. The app keeps a local record of what has been sent to Google, so **Sync now** only sends new, changed and removed events. Use **Full resync** to re-send everything, e.g. after events were edited or deleted directly in Google.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:setup     # Apply migrations and seed default data
npm run db:seed      # Run seed only
npm run db:studio    # Open Prisma Studio (database GUI)
```

## Hebrew Calendar Notes

- Dates are stored as Hebrew day + month
- For events in **Adar** during a leap year, they are observed on **Adar I** (month 12) by default
- Events stored as **Adar II** (month 13) are observed on Adar (month 12) in non-leap years
- Supported months: Nisan, Iyyar, Sivan, Tamuz, Av, Elul, Tishrei, Cheshvan, Kislev, Tevet, Shvat, Adar, Adar II

## License

MIT
