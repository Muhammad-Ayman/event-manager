/**
 * routes/organiser.js
 * Handles all organiser-facing routes: home, settings, event creation/editing,
 * publishing, and deletion.
 *
 * All routes are mounted under /organiser
 */

const express = require('express');
const router = express.Router();
const { settingsSchema, eventSchema } = require('../validators');

// ─────────────────────────────────────────────────────────────────────────────
// ORGANISER HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /organiser
 * Purpose: Display the organiser home page with lists of published and draft events.
 * Inputs:  None
 * Outputs: Renders views/organiser/home.ejs with site settings, published events,
 *          draft events, and per-event booking counts.
 */
router.get('/', (req, res) => {
    const db = req.db;

    // Fetch site settings (name and description)
    // Input:  none  |  Output: single settings row
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });

        // Fetch all published events with booked ticket totals
        // Input:  status = 'published'
        // Output: array of event rows with booked_full and booked_concession columns
        const eventQuery = `
            SELECT e.*,
                   COALESCE(SUM(b.full_price_tickets), 0)  AS booked_full,
                   COALESCE(SUM(b.concession_tickets), 0)  AS booked_concession
            FROM events e
            LEFT JOIN bookings b ON b.event_id = e.id
            WHERE e.status = ?
            GROUP BY e.id
            ORDER BY e.event_date ASC
        `;

        db.all(eventQuery, ['published'], (err, publishedEvents) => {
            if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });

            // Fetch all draft events with booked ticket totals
            // Input:  status = 'draft'
            // Output: array of event rows
            db.all(eventQuery, ['draft'], (err, draftEvents) => {
                if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });

                res.render('organiser/home', {
                    title: 'Organiser Home',
                    settings,
                    publishedEvents,
                    draftEvents
                });
            });
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SITE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /organiser/settings
 * Purpose: Display the site settings form pre-populated with current values.
 * Inputs:  None
 * Outputs: Renders views/organiser/settings.ejs with current settings data.
 */
router.get('/settings', (req, res) => {
    const db = req.db;

    // Fetch current site settings
    // Input:  id = 1  |  Output: single settings row
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });

        res.render('organiser/settings', {
            title: 'Site Settings',
            settings,
            errors: []
        });
    });
});

/**
 * POST /organiser/settings
 * Purpose: Update the site name and description, then redirect to organiser home.
 * Inputs:  req.body.name (string), req.body.description (string)
 * Outputs: Redirects to /organiser on success; re-renders form with errors on failure.
 */
router.post('/settings', (req, res) => {
    const db = req.db;
    const { name, description } = req.body;

    const { error } = settingsSchema.validate({ name, description }, { abortEarly: false });
    if (error) {
        const errors = error.details.map(e => e.message);
        return res.render('organiser/settings', {
            title: 'Site Settings',
            settings: { name, description },
            errors
        });
    }

    // Update settings in the database
    // Input:  name, description  |  Output: updated settings row
    db.run(
        'UPDATE settings SET name = ?, description = ? WHERE id = 1',
        [name.trim(), description.trim()],
        (err) => {
            if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser/settings' });
            res.redirect('/organiser');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE NEW DRAFT EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /organiser/events/new
 * Purpose: Insert a blank draft event then redirect to its edit page.
 * Inputs:  None (defaults used for all fields)
 * Outputs: Redirects to /organiser/events/:id/edit
 */
router.post('/events/new', (req, res) => {
    const db = req.db;
    const now = new Date().toISOString();

    // Insert a new blank draft event
    // Input:  defaults  |  Output: lastID of the new event row
    db.run(
        `INSERT INTO events (title, description, event_date, status,
                             full_price_tickets, full_price_cost,
                             concession_tickets, concession_cost,
                             created_at, last_modified)
         VALUES ('Untitled Event', '', '', 'draft', 0, 0.00, 0, 0.00, ?, ?)`,
        [now, now],
        function (err) {
            if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });
            res.redirect(`/organiser/events/${this.lastID}/edit`);
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /organiser/events/:id/edit
 * Purpose: Display the event edit form pre-populated with existing event data.
 * Inputs:  req.params.id (integer) – event ID
 * Outputs: Renders views/organiser/edit_event.ejs with event data.
 */
router.get('/events/:id/edit', (req, res) => {
    const db = req.db;
    const { id } = req.params;

    // Fetch the event by its primary key
    // Input:  id  |  Output: single event row or undefined
    db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });
        if (!event) return res.status(404).render('error', { title: '404 – Event Not Found', message: 'This event does not exist.', backUrl: '/organiser' });

        res.render('organiser/edit_event', {
            title: 'Edit Event',
            event,
            errors: []
        });
    });
});

/**
 * POST /organiser/events/:id/edit
 * Purpose: Validate and save changes to an existing event; update last_modified.
 * Inputs:  req.params.id (integer), req.body (title, description, event_date,
 *          full_price_tickets, full_price_cost, concession_tickets, concession_cost)
 * Outputs: Redirects to /organiser on success; re-renders form with errors on failure.
 */
router.post('/events/:id/edit', (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const {
        title, description, event_date,
        full_price_tickets, full_price_cost,
        concession_tickets, concession_cost
    } = req.body;

    const { error } = eventSchema.validate({
        title, description, event_date,
        full_price_tickets, full_price_cost,
        concession_tickets, concession_cost
    }, { abortEarly: false });

    if (error) {
        const errors = error.details.map(e => e.message);
        return res.render('organiser/edit_event', {
            title: 'Edit Event',
            event: { id, title, description, event_date, full_price_tickets, full_price_cost, concession_tickets, concession_cost },
            errors
        });
    }

    const now = new Date().toISOString();

    // Update the event row with new values and bump last_modified
    // Input:  all form fields + id  |  Output: updated event row
    db.run(
        `UPDATE events
         SET title = ?, description = ?, event_date = ?,
             full_price_tickets = ?, full_price_cost = ?,
             concession_tickets = ?, concession_cost = ?,
             last_modified = ?
         WHERE id = ?`,
        [
            title.trim(), description.trim(), event_date,
            parseInt(full_price_tickets), parseFloat(full_price_cost),
            parseInt(concession_tickets), parseFloat(concession_cost),
            now, id
        ],
        (err) => {
            if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: `/organiser/events/${id}/edit` });
            res.redirect('/organiser');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISH EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /organiser/events/:id/publish
 * Purpose: Change a draft event's status to 'published' and timestamp it.
 * Inputs:  req.params.id (integer) – event ID
 * Outputs: Redirects to /organiser
 */
router.post('/events/:id/publish', (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const now = new Date().toISOString();

    // Update status to published and set published_at timestamp
    // Input:  id  |  Output: updated event row
    db.run(
        `UPDATE events SET status = 'published', published_at = ?, last_modified = ? WHERE id = ?`,
        [now, now, id],
        (err) => {
            if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });
            res.redirect('/organiser');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /organiser/events/:id/delete
 * Purpose: Delete an event (and its bookings via CASCADE) from the database.
 * Inputs:  req.params.id (integer) – event ID
 * Outputs: Redirects to /organiser
 */
router.post('/events/:id/delete', (req, res) => {
    const db = req.db;
    const { id } = req.params;

    // Delete event by id; bookings are removed by ON DELETE CASCADE
    // Input:  id  |  Output: event row removed
    db.run('DELETE FROM events WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });
        res.redirect('/organiser');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// VIEW BOOKINGS (Extension)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /organiser/events/:id/bookings
 * Purpose: Display all bookings for a specific event (extension feature).
 * Inputs:  req.params.id (integer) – event ID
 * Outputs: Renders views/organiser/bookings.ejs with event and bookings data.
 */
router.get('/events/:id/bookings', (req, res) => {
    const db = req.db;
    const { id } = req.params;

    // Fetch event details
    // Input:  id  |  Output: single event row
    db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });
        if (!event) return res.status(404).render('error', { title: '404', message: 'Event not found.', backUrl: '/organiser' });

        // Fetch all bookings for this event, most recent first
        // Input:  event_id  |  Output: array of booking rows
        db.all(
            `SELECT * FROM bookings WHERE event_id = ? ORDER BY booked_at DESC`,
            [id],
            (err, bookings) => {
                if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/organiser' });

                // Calculate summary totals
                const totalFull = bookings.reduce((sum, b) => sum + b.full_price_tickets, 0);
                const totalConcession = bookings.reduce((sum, b) => sum + b.concession_tickets, 0);
                const totalRevenue = bookings.reduce((sum, b) =>
                    sum + (b.full_price_tickets * event.full_price_cost) + (b.concession_tickets * event.concession_cost), 0);

                res.render('organiser/bookings', {
                    title: `Bookings – ${event.title}`,
                    event,
                    bookings,
                    totalFull,
                    totalConcession,
                    totalRevenue
                });
            }
        );
    });
});

module.exports = router;
