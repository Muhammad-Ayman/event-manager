/**
 * index.js
 * Main application entry point for the Event Manager.
 * Sets up Express, body-parser, EJS, SQLite and mounts all route handlers.
 *
 * Run with: npm run start  (after npm run build-db)
 */

// Set up express, bodyparser and EJS
const express    = require('express');
const app        = express();
const port       = 3000;
var bodyParser   = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');                         // use EJS for rendering
app.use(express.static(__dirname + '/public'));         // serve static files

// Set up SQLite
// Items in the global namespace are accessible throughout the node application
let sqlite3;
try { sqlite3 = require('sqlite3').verbose(); } catch(e) { sqlite3 = require('./sqlite3-shim').verbose(); }
global.db = new sqlite3.Database('./database.db', function (err) {
    if (err) {
        console.error(err);
        process.exit(1); // bail out — we can't connect to the DB
    } else {
        console.log('Database connected');
        global.db.run('PRAGMA foreign_keys=ON'); // enforce foreign key constraints
    }
});

// Handle requests to the home page
app.get('/', (req, res) => {
    res.render('index', { title: 'Event Manager' });
});

// Mount all organiser route handlers under /organiser
const organiserRoutes = require('./routes/organiser');
app.use('/organiser', organiserRoutes);

// Mount all attendee route handlers under /attendee
const attendeeRoutes = require('./routes/attendee');
app.use('/attendee', attendeeRoutes);

// Global error handler — catches errors passed via next(err)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Server Error',
        message: err.message || 'Something went wrong.',
        backUrl: '/'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 – Page Not Found',
        message: 'The page you are looking for does not exist.',
        backUrl: '/'
    });
});

// Start the web application listening for HTTP requests
app.listen(port, () => {
    console.log(`Event Manager listening on port ${port}`);
    console.log(`Open: http://localhost:${port}`);
});
