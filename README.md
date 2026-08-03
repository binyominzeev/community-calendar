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

Open [http://localhost:3000](http://localhost:3000).

**Default admin credentials:** `admin@example.com` / `changeme`

### Environment Variables

Create a `.env.local` file:

```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

### Docker Deployment

```bash
# Build and start with Docker Compose
docker compose up -d

# Or with custom admin credentials
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=secure_password docker compose up -d
```

The SQLite database is stored in `./prisma/dev.db` and is persisted via a Docker volume mount.

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

Go to **Settings** to manage tags and event types.

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
