/**
 * routes/main.js
 * Handles the main home page route.
 *
 * Routes:
 *   GET /  - Main home page with links to organiser and attendee pages
 */

const express = require('express');
const router = express.Router();

/**
 * GET /
 * Purpose: Render the main landing page.
 * Inputs:  None
 * Outputs: Renders views/index.ejs
 */
router.get('/', (req, res) => {
    res.render('index', { title: 'Event Manager – Home' });
});

module.exports = router;
