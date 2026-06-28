/**
 * routes/attendee.js
 * Route handlers for the attendee-facing pages.
 * Mounted under /attendee in index.js.
 *
 * NB: it's better NOT to use arrow functions for callbacks with the SQLite library
 */

const express  = require('express');
const router   = express.Router();
const { validateBooking } = require('./validation');

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDEE HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Show all published events ordered by date, with site name and description.
 * @route GET /attendee
 * @input none
 * @output Renders views/attendee/home.ejs with settings and events array
 */
router.get('/', function (req, res, next) {

    // Query: fetch site settings for display
    // Input: id = 1  |  Output: single settings row
    global.db.get('SELECT * FROM settings WHERE id = 1', function (err, settings) {
        if (err) return next(err);

        // Query: fetch all published events, soonest first
        // Input: status = 'published'  |  Output: array of event rows
        global.db.all(
            "SELECT * FROM events WHERE status = 'published' ORDER BY event_date ASC",
            function (err, events) {
                if (err) return next(err);

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
 * @desc  Show a single published event with ticket availability and booking form.
 * @route GET /attendee/events/:id
 * @input req.params.id – event primary key
 * @output Renders views/attendee/event.ejs with event and available ticket counts
 */
router.get('/events/:id', function (req, res, next) {

    // Query: fetch the event by id (must be published)
    // Input: id  |  Output: single event row or undefined
    global.db.get(
        "SELECT * FROM events WHERE id = ? AND status = 'published'",
        [req.params.id],
        function (err, event) {
            if (err) return next(err);
            if (!event) return res.status(404).render('error', {
                title: '404 – Event Not Found',
                message: 'This event is not available.',
                backUrl: '/attendee'
            });

            // Query: sum tickets already booked for this event
            // Input: event_id  |  Output: booked_full, booked_concession totals
            global.db.get(
                `SELECT COALESCE(SUM(full_price_tickets), 0) AS booked_full,
                        COALESCE(SUM(concession_tickets),  0) AS booked_concession
                 FROM bookings WHERE event_id = ?`,
                [req.params.id],
                function (err, booked) {
                    if (err) return next(err);

                    const availableFull       = event.full_price_tickets - booked.booked_full;
                    const availableConcession = event.concession_tickets  - booked.booked_concession;

                    res.render('attendee/event', {
                        title: event.title,
                        event,
                        availableFull,
                        availableConcession,
                        errors: []
                    });
                }
            );
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOK TICKETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Validate and create a new booking for the given event.
 * @route POST /attendee/events/:id/book
 * @input req.params.id, req.body: { attendee_name, full_price_qty, concession_qty }
 * @output Redirect to confirmation page on success; re-render with errors on failure
 */
router.post('/events/:id/book', function (req, res, next) {
    const id = req.params.id;

    // Validate booking form with Joi
    const { error, value } = validateBooking(req.body);

    // Re-usable helper: re-render the event page with errors
    function renderWithErrors(event, booked, errors) {
        const availableFull       = event.full_price_tickets - booked.booked_full;
        const availableConcession = event.concession_tickets  - booked.booked_concession;
        res.render('attendee/event', {
            title: event.title,
            event,
            availableFull,
            availableConcession,
            errors
        });
    }

    // Query: fetch the event and current booking totals to validate availability
    // Input: id  |  Output: event row + booked totals
    global.db.get(
        "SELECT * FROM events WHERE id = ? AND status = 'published'",
        [id],
        function (err, event) {
            if (err) return next(err);
            if (!event) return res.status(404).render('error', {
                title: '404', message: 'Event not found.', backUrl: '/attendee'
            });

            global.db.get(
                `SELECT COALESCE(SUM(full_price_tickets), 0) AS booked_full,
                        COALESCE(SUM(concession_tickets),  0) AS booked_concession
                 FROM bookings WHERE event_id = ?`,
                [id],
                function (err, booked) {
                    if (err) return next(err);

                    // Collect all validation errors
                    const errors = [];

                    // Joi field errors
                    if (error) {
                        error.details.forEach(d => errors.push(d.message));
                    }

                    const fullQty = value ? value.full_price_qty : 0;
                    const concQty = value ? value.concession_qty  : 0;

                    // Business logic validation (availability)
                    if (!error) {
                        if (fullQty === 0 && concQty === 0) {
                            errors.push('Please select at least one ticket.');
                        }
                        const availFull = event.full_price_tickets - booked.booked_full;
                        const availConc = event.concession_tickets  - booked.booked_concession;

                        if (fullQty > availFull) {
                            errors.push('Only ' + availFull + ' full-price ticket(s) remaining.');
                        }
                        if (concQty > availConc) {
                            errors.push('Only ' + availConc + ' concession ticket(s) remaining.');
                        }
                    }

                    if (errors.length > 0) {
                        return renderWithErrors(event, booked, errors);
                    }

                    const now = new Date().toISOString();

                    // Query: insert the booking record
                    // Input: event_id, attendee_name, full/concession qty, timestamp
                    // Output: this.lastID of the new booking row
                    global.db.run(
                        `INSERT INTO bookings
                            (event_id, attendee_name, full_price_tickets, concession_tickets, booked_at)
                         VALUES (?, ?, ?, ?, ?)`,
                        [id, value.attendee_name, fullQty, concQty, now],
                        function (err) {
                            if (err) return next(err);
                            res.redirect('/attendee/events/' + id + '/confirmation/' + this.lastID);
                        }
                    );
                }
            );
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING CONFIRMATION  (Extension)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc  Show a booking confirmation page with reference number and cost breakdown.
 * @route GET /attendee/events/:id/confirmation/:bookingId
 * @input req.params.id, req.params.bookingId
 * @output Renders views/attendee/confirmation.ejs
 */
router.get('/events/:id/confirmation/:bookingId', function (req, res, next) {

    // Query: fetch booking joined with event details in one query
    // Input: bookingId, event_id  |  Output: booking row with event fields
    global.db.get(
        `SELECT b.*, e.title AS event_title, e.event_date,
                e.full_price_cost, e.concession_cost
         FROM bookings b
         JOIN events e ON e.id = b.event_id
         WHERE b.id = ? AND b.event_id = ?`,
        [req.params.bookingId, req.params.id],
        function (err, booking) {
            if (err) return next(err);
            if (!booking) return res.status(404).render('error', {
                title: '404', message: 'Booking not found.', backUrl: '/attendee'
            });

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
