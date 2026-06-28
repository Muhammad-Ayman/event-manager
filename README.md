# Event Manager – CM2040 DNW Coursework

A deployable event manager built with Node.js, Express, EJS, and SQLite.

## Setup & Running

Requires Node.js ≥ 16.x and npm ≥ 8.x.

```bash
npm install
npm run build-db
npm run start
```

Then open **http://localhost:3000** in your browser.

## Pages

| URL | Description |
|-----|-------------|
| `http://localhost:3000/` | Main home page |
| `http://localhost:3000/organiser` | Organiser home page |
| `http://localhost:3000/organiser/settings` | Site settings |
| `http://localhost:3000/attendee` | Attendee home page |

## Additional Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `ejs` | ^3.1.10 | Server-side HTML templating |
| `express` | ^4.18.2 | Web server framework |
| `sqlite3` | ^5.1.7 | SQLite database driver |
| `date-fns` | ^3.6.0 | Date formatting utilities |

No bundler is used. All CSS is plain CSS served as a static file from `/public/css/style.css`.

## Extension

The extension adds:

1. **Booking confirmation page** – after an attendee books tickets, they are redirected to a confirmation page showing a booking reference, itemised ticket summary, and total cost.

2. **Bookings management view** – accessible via the "📋 Bookings" button on any published event in the organiser home page. Shows: a summary of total bookings, full-price and concession tickets sold, estimated revenue, visual capacity progress bars, and a detailed table of every individual booking with attendee name, ticket quantities, amount paid, and booking timestamp.

These features are server-side rendered using EJS and SQLite queries (JOIN across `events` and `bookings` tables), demonstrating three-tier architecture as taught in the course.
