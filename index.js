/**
 * index.js
 * Entry point for the Event Manager Express application.
 * Sets up middleware, database connection, and mounts route handlers.
 *
 * Run with: npm run start (after npm run build-db)
 */

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { format, parseISO } = require('date-fns');

const app = express();
const PORT = 3000;

// ─── Database Connection ──────────────────────────────────────────────────────
// Open (or create) the SQLite database file
const db = new sqlite3.Database(
    path.join(__dirname, 'db', 'database.db'),
    sqlite3.OPEN_READWRITE,
    (err) => {
        if (err) {
            console.error('Could not connect to database. Run "npm run build-db" first.');
            console.error(err.message);
            process.exit(1);
        }
        console.log('Connected to SQLite database.');
    }
);

// Enable foreign key support for cascade deletes
db.run('PRAGMA foreign_keys = ON');

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Template Helpers (date-fns) ──────────────────────────────────────────────
app.locals.formatDate = (dateStr, fmt = 'dd MMM yyyy') => {
    if (!dateStr) return '—';
    return format(parseISO(dateStr), fmt);
};
app.locals.dateFnsFormat = format;
app.locals.dateFnsParseISO = parseISO;

// ─── Middleware ───────────────────────────────────────────────────────────────
// Parse URL-encoded form bodies
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies
app.use(express.json());
// Serve static assets (CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));

// Make db accessible to all route handlers via req.db
app.use((req, res, next) => {
    req.db = db;
    next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const mainRoutes      = require('./routes/main');
const organiserRoutes = require('./routes/organiser');
const attendeeRoutes  = require('./routes/attendee');

app.use('/', mainRoutes);
app.use('/organiser', organiserRoutes);
app.use('/attendee', attendeeRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 – Page Not Found',
        message: 'The page you are looking for does not exist.',
        backUrl: '/'
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Event Manager running at http://localhost:${PORT}`);
});
