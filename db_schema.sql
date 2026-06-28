-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Drop tables if they exist (for clean rebuild)
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS settings;

-- Site settings table: stores the organiser name and description (singleton row)
-- Input:  none  |  Output: single row always accessed via WHERE id = 1
CREATE TABLE IF NOT EXISTS settings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL DEFAULT 'My Event Manager',
    description TEXT    NOT NULL DEFAULT 'Welcome to our events!'
);

-- Events table: stores all events (draft and published)
-- status is constrained to 'draft' or 'published'
-- published_at is NULL until the organiser publishes the event
CREATE TABLE IF NOT EXISTS events (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT    NOT NULL DEFAULT 'Untitled Event',
    description         TEXT    NOT NULL DEFAULT '',
    event_date          TEXT    NOT NULL DEFAULT '',
    status              TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
    full_price_tickets  INTEGER NOT NULL DEFAULT 0,
    full_price_cost     REAL    NOT NULL DEFAULT 0.00,
    concession_tickets  INTEGER NOT NULL DEFAULT 0,
    concession_cost     REAL    NOT NULL DEFAULT 0.00,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    last_modified       TEXT    NOT NULL DEFAULT (datetime('now')),
    published_at        TEXT
);

-- Bookings table: records each attendee ticket purchase
-- ON DELETE CASCADE removes bookings automatically when their event is deleted
CREATE TABLE IF NOT EXISTS bookings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id            INTEGER NOT NULL,
    attendee_name       TEXT    NOT NULL,
    full_price_tickets  INTEGER NOT NULL DEFAULT 0,
    concession_tickets  INTEGER NOT NULL DEFAULT 0,
    booked_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Seed default settings
INSERT INTO settings (name, description)
VALUES ('My Event Manager', 'Welcome to our events!');

-- Seed sample events
INSERT INTO events (title, description, event_date, status, full_price_tickets, full_price_cost, concession_tickets, concession_cost, published_at)
VALUES
    ('Morning Yoga Session',  'A relaxing morning yoga session suitable for all levels. Bring your own mat!', '2026-08-15 09:00', 'published', 20, 12.00, 10, 8.00,  datetime('now')),
    ('Advanced Pilates',      'An intensive pilates class for experienced practitioners.',                     '2026-09-01 11:00', 'published', 15, 15.00, 5,  10.00, datetime('now')),
    ('Meditation Workshop',   'A two-hour guided meditation and mindfulness workshop.',                       '2026-09-20 14:00', 'draft',     25, 20.00, 10, 12.00, NULL);

COMMIT;
