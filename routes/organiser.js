/**
 * routes/organiser.js
 * Route handlers for the organiser-facing pages.
 * Mounted under /organiser in index.js.
 *
 * NB: it's better NOT to use arrow functions for callbacks with the SQLite library
 */

const express    = require('express');
const router     = express.Router();
const { validateSettings, validateEvent } = require('./validation');

// ─────────────────────────────────────────────────────────────────────────────
// ORGANISER HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Display the organiser home page with published and draft event lists.
 * @route GET /organiser
 * @input none
 * @output Renders views/organiser/home.ejs with settings, publishedEvents, draftEvents
 */
router.get('/', function (req, res, next) {

    // Query: fetch site settings (always id = 1)
    // Input: none  |  Output: single settings row
    global.db.get('SELECT * FROM settings WHERE id = 1', function (err, settings) {
        if (err) return next(err);

        // Query: fetch published events with total booked tickets per event
        // Input: status = 'published'  |  Output: array of event rows + booked totals
        const eventQuery = `
            SELECT e.*,
                   COALESCE(SUM(b.full_price_tickets), 0) AS booked_full,
                   COALESCE(SUM(b.concession_tickets),  0) AS booked_concession
            FROM events e
            LEFT JOIN bookings b ON b.event_id = e.id
            WHERE e.status = ?
            GROUP BY e.id
            ORDER BY e.event_date ASC
        `;

        global.db.all(eventQuery, ['published'], function (err, publishedEvents) {
            if (err) return next(err);

            // Query: fetch draft events with totals
            // Input: status = 'draft'  |  Output: array of draft event rows
            global.db.all(eventQuery, ['draft'], function (err, draftEvents) {
                if (err) return next(err);

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
 * @desc  Show the site settings form pre-populated with current values.
 * @route GET /organiser/settings
 * @input none
 * @output Renders views/organiser/settings.ejs
 */
router.get('/settings', function (req, res, next) {

    // Query: fetch current site settings
    // Input: id = 1  |  Output: single settings row
    global.db.get('SELECT * FROM settings WHERE id = 1', function (err, settings) {
        if (err) return next(err);

        res.render('organiser/settings', {
            title: 'Site Settings',
            settings,
            errors: []
        });
    });
});

/**
 * @desc  Save updated site name and description; redirect to organiser home.
 * @route POST /organiser/settings
 * @input req.body: { name, description }
 * @output Redirect /organiser on success; re-render form with errors on failure
 */
router.post('/settings', function (req, res, next) {

    // Validate using Joi
    const { error, value } = validateSettings(req.body);

    if (error) {
        const errors = error.details.map(d => d.message);
        return res.render('organiser/settings', {
            title: 'Site Settings',
            settings: req.body,
            errors
        });
    }

    // Query: update site settings
    // Input: name, description  |  Output: updated row (no return value)
    global.db.run(
        'UPDATE settings SET name = ?, description = ? WHERE id = 1',
        [value.name, value.description],
        function (err) {
            if (err) return next(err);
            res.redirect('/organiser');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE NEW DRAFT EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Insert a blank draft event then redirect to its edit page.
 * @route POST /organiser/events/new
 * @input none
 * @output Redirect to /organiser/events/:id/edit
 */
router.post('/events/new', function (req, res, next) {
    const now = new Date().toISOString();

    // Query: insert a blank draft event with default values
    // Input: timestamps  |  Output: this.lastID of the new row
    global.db.run(
        `INSERT INTO events
            (title, description, event_date, status,
             full_price_tickets, full_price_cost,
             concession_tickets, concession_cost,
             created_at, last_modified)
         VALUES ('Untitled Event', '', '', 'draft', 0, 0.00, 0, 0.00, ?, ?)`,
        [now, now],
        function (err) {
            if (err) return next(err);
            res.redirect('/organiser/events/' + this.lastID + '/edit');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Show the event edit form pre-populated with existing data.
 * @route GET /organiser/events/:id/edit
 * @input req.params.id – event primary key
 * @output Renders views/organiser/edit_event.ejs
 */
router.get('/events/:id/edit', function (req, res, next) {

    // Query: fetch event by primary key
    // Input: id  |  Output: single event row or undefined
    global.db.get('SELECT * FROM events WHERE id = ?', [req.params.id], function (err, event) {
        if (err) return next(err);
        if (!event) return res.status(404).render('error', {
            title: '404 – Event Not Found',
            message: 'This event does not exist.',
            backUrl: '/organiser'
        });

        res.render('organiser/edit_event', { title: 'Edit Event', event, errors: [] });
    });
});

/**
 * @desc  Validate and save changes to an event; update last_modified timestamp.
 * @route POST /organiser/events/:id/edit
 * @input req.params.id, req.body: { title, description, event_date,
 *        full_price_tickets, full_price_cost, concession_tickets, concession_cost }
 * @output Redirect /organiser on success; re-render form with errors on failure
 */
router.post('/events/:id/edit', function (req, res, next) {
    const id = req.params.id;

    // Validate using Joi
    const { error, value } = validateEvent(req.body);

    if (error) {
        const errors = error.details.map(d => d.message);
        return res.render('organiser/edit_event', {
            title: 'Edit Event',
            event: Object.assign({ id }, req.body),
            errors
        });
    }

    const now = new Date().toISOString();

    // Query: update event with validated values and bump last_modified
    // Input: all form fields + id  |  Output: updated row (no return value)
    global.db.run(
        `UPDATE events
         SET title = ?, description = ?, event_date = ?,
             full_price_tickets = ?, full_price_cost = ?,
             concession_tickets = ?, concession_cost = ?,
             last_modified = ?
         WHERE id = ?`,
        [
            value.title,
            value.description || '',
            value.event_date,
            value.full_price_tickets,
            value.full_price_cost,
            value.concession_tickets,
            value.concession_cost,
            now,
            id
        ],
        function (err) {
            if (err) return next(err);
            res.redirect('/organiser');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISH EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Set a draft event's status to published and timestamp it.
 * @route POST /organiser/events/:id/publish
 * @input req.params.id – event primary key
 * @output Redirect /organiser
 */
router.post('/events/:id/publish', function (req, res, next) {
    const now = new Date().toISOString();

    // Query: set status = published and record published_at timestamp
    // Input: id  |  Output: updated row (no return value)
    global.db.run(
        `UPDATE events SET status = 'published', published_at = ?, last_modified = ? WHERE id = ?`,
        [now, now, req.params.id],
        function (err) {
            if (err) return next(err);
            res.redirect('/organiser');
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE EVENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Delete an event and all its bookings (via ON DELETE CASCADE).
 * @route POST /organiser/events/:id/delete
 * @input req.params.id – event primary key
 * @output Redirect /organiser
 */
router.post('/events/:id/delete', function (req, res, next) {

    // Query: delete event row; bookings cascade automatically
    // Input: id  |  Output: row removed
    global.db.run('DELETE FROM events WHERE id = ?', [req.params.id], function (err) {
        if (err) return next(err);
        res.redirect('/organiser');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS DASHBOARD  (Extension)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Show all bookings for a specific event with revenue and capacity stats.
 * @route GET /organiser/events/:id/bookings
 * @input req.params.id – event primary key
 * @output Renders views/organiser/bookings.ejs
 */
router.get('/events/:id/bookings', function (req, res, next) {
    const id = req.params.id;

    // Query: fetch the event
    // Input: id  |  Output: single event row
    global.db.get('SELECT * FROM events WHERE id = ?', [id], function (err, event) {
        if (err) return next(err);
        if (!event) return res.status(404).render('error', {
            title: '404',
            message: 'Event not found.',
            backUrl: '/organiser'
        });

        // Query: fetch all bookings for this event, most recent first
        // Input: event_id  |  Output: array of booking rows
        global.db.all(
            'SELECT * FROM bookings WHERE event_id = ? ORDER BY booked_at DESC',
            [id],
            function (err, bookings) {
                if (err) return next(err);

                // Compute summary totals in JavaScript
                const totalFull       = bookings.reduce((s, b) => s + b.full_price_tickets, 0);
                const totalConcession = bookings.reduce((s, b) => s + b.concession_tickets,  0);
                const totalRevenue    = bookings.reduce((s, b) =>
                    s + (b.full_price_tickets * event.full_price_cost)
                      + (b.concession_tickets  * event.concession_cost), 0);

                res.render('organiser/bookings', {
                    title: 'Bookings – ' + event.title,
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
