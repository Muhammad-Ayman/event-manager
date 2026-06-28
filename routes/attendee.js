/**
 * routes/attendee.js
 * Handles all attendee-facing routes: home page, event detail, and ticket booking.
 *
 * All routes are mounted under /attendee
 */

const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDEE HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendee
 * Purpose: Display all published events ordered by upcoming date, with site info.
 * Inputs:  None
 * Outputs: Renders views/attendee/home.ejs with settings and list of published events.
 */
router.get('/', (req, res) => {
    const db = req.db;

    // Fetch site settings for display
    // Input:  id = 1  |  Output: single settings row
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/' });

        // Fetch published events ordered by event_date ascending (soonest first)
        // Input:  status = 'published'  |  Output: array of event rows
        db.all(
            `SELECT * FROM events WHERE status = 'published' ORDER BY event_date ASC`,
            [],
            (err, events) => {
                if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/' });

                res.render('attendee/home', {
                    title: 'Attendee Home',
                    settings,
                    events
                });
            }
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDEE EVENT PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendee/events/:id
 * Purpose: Display a single published event with booking form.
 * Inputs:  req.params.id (integer) – event ID
 * Outputs: Renders views/attendee/event.ejs with event details and remaining ticket counts.
 */
router.get('/events/:id', (req, res) => {
    const db = req.db;
    const { id } = req.params;

    // Fetch the event by id, must be published
    // Input:  id  |  Output: single event row or undefined
    db.get(`SELECT * FROM events WHERE id = ? AND status = 'published'`, [id], (err, event) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/attendee' });
        if (!event) return res.status(404).render('error', { title: '404 – Event Not Found', message: 'This event is not available.', backUrl: '/attendee' });

        // Calculate how many tickets of each type have already been booked
        // Input:  event_id  |  Output: sums of booked tickets
        db.get(
            `SELECT COALESCE(SUM(full_price_tickets), 0)  AS booked_full,
                    COALESCE(SUM(concession_tickets), 0) AS booked_concession
             FROM bookings WHERE event_id = ?`,
            [id],
            (err, booked) => {
                if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/attendee' });

                const availableFull       = event.full_price_tickets - booked.booked_full;
                const availableConcession = event.concession_tickets  - booked.booked_concession;

                res.render('attendee/event', {
                    title: event.title,
                    event,
                    availableFull,
                    availableConcession,
                    errors: [],
                    success: null
                });
            }
        );
    });
});

/**
 * POST /attendee/events/:id/book
 * Purpose: Validate and create a new booking for the given event.
 * Inputs:  req.params.id (integer) – event ID
 *          req.body.attendee_name (string)
 *          req.body.full_price_qty (integer)
 *          req.body.concession_qty (integer)
 * Outputs: Redirects to /attendee/events/:id/confirmation on success;
 *          re-renders form with errors if validation fails.
 */
router.post('/events/:id/book', (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const { attendee_name, full_price_qty, concession_qty } = req.body;

    const fullQty = parseInt(full_price_qty) || 0;
    const concQty = parseInt(concession_qty) || 0;

    // Fetch event and current booking totals together
    // Input:  id  |  Output: event row + booked totals
    db.get(`SELECT * FROM events WHERE id = ? AND status = 'published'`, [id], (err, event) => {
        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/attendee' });
        if (!event) return res.status(404).render('error', { title: '404', message: 'Event not found.', backUrl: '/attendee' });

        db.get(
            `SELECT COALESCE(SUM(full_price_tickets), 0)  AS booked_full,
                    COALESCE(SUM(concession_tickets), 0) AS booked_concession
             FROM bookings WHERE event_id = ?`,
            [id],
            (err, booked) => {
                if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/attendee' });

                const availableFull       = event.full_price_tickets - booked.booked_full;
                const availableConcession = event.concession_tickets  - booked.booked_concession;

                // Validate booking inputs
                const errors = [];
                if (!attendee_name || attendee_name.trim() === '') errors.push('Please enter your name.');
                if (fullQty < 0 || concQty < 0)                    errors.push('Ticket quantities cannot be negative.');
                if (fullQty === 0 && concQty === 0)                 errors.push('Please select at least one ticket.');
                if (fullQty > availableFull)                        errors.push(`Only ${availableFull} full-price ticket(s) remaining.`);
                if (concQty > availableConcession)                  errors.push(`Only ${availableConcession} concession ticket(s) remaining.`);

                if (errors.length > 0) {
                    return res.render('attendee/event', {
                        title: event.title,
                        event,
                        availableFull,
                        availableConcession,
                        errors,
                        success: null
                    });
                }

                const now = new Date().toISOString();

                // Insert the booking record
                // Input:  event_id, attendee_name, full_price_tickets, concession_tickets
                // Output: new booking row
                db.run(
                    `INSERT INTO bookings (event_id, attendee_name, full_price_tickets, concession_tickets, booked_at)
                     VALUES (?, ?, ?, ?, ?)`,
                    [id, attendee_name.trim(), fullQty, concQty, now],
                    function (err) {
                        if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: `/attendee/events/${id}` });
                        res.redirect(`/attendee/events/${id}/confirmation/${this.lastID}`);
                    }
                );
            }
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING CONFIRMATION (Extension)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendee/events/:id/confirmation/:bookingId
 * Purpose: Show a booking confirmation page after successful booking.
 * Inputs:  req.params.id (integer) – event ID
 *          req.params.bookingId (integer) – booking ID
 * Outputs: Renders views/attendee/confirmation.ejs with booking and event details.
 */
router.get('/events/:id/confirmation/:bookingId', (req, res) => {
    const db = req.db;
    const { id, bookingId } = req.params;

    // Fetch booking and event together
    // Input:  bookingId, id  |  Output: booking row joined with event title/date
    db.get(
        `SELECT b.*, e.title AS event_title, e.event_date,
                e.full_price_cost, e.concession_cost
         FROM bookings b
         JOIN events e ON e.id = b.event_id
         WHERE b.id = ? AND b.event_id = ?`,
        [bookingId, id],
        (err, booking) => {
            if (err) return res.status(500).render('error', { title: 'Database Error', message: err.message, backUrl: '/attendee' });
            if (!booking) return res.status(404).render('error', { title: '404', message: 'Booking not found.', backUrl: '/attendee' });

            const total = (booking.full_price_tickets * booking.full_price_cost)
                        + (booking.concession_tickets  * booking.concession_cost);

            res.render('attendee/confirmation', {
                title: 'Booking Confirmed!',
                booking,
                total
            });
        }
    );
});

module.exports = router;
