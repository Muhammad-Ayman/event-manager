/**
 * build_db.js
 * Reads db_schema.sql and creates the SQLite database.
 * Run with: npm run build-db
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');
const SCHEMA_PATH = path.join(__dirname, 'db_schema.sql');

// Remove existing database file if present
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Removed existing database.');
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Read and execute the schema SQL
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Error building database:', err.message);
        process.exit(1);
    }
    console.log('Database built successfully from db_schema.sql');
    db.close();
});
