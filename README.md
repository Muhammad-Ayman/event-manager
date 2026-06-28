## Event Manager ##
### CM2040 Database Networks and the Web ###

#### Setup Instructions ####

1. Install dependencies:
```
npm install
```

2. Build the database (Mac/Linux):
```
npm run build-db
```
   Or on Windows:
```
npm run build-db-win
```

3. Start the server:
```
npm run start
```

4. Open your browser at: http://localhost:3000

#### Additional Libraries ####

- **joi** `^17.13.1` — Server-side form validation with detailed error messages. Used in `routes/validation.js` to validate all form submissions (settings, event creation/editing, ticket booking).
- **Tailwind CSS** `v3 via CDN` — Utility-first CSS framework loaded from `https://cdn.tailwindcss.com`. No build step is required; classes are applied directly in EJS templates. No bundler is used.
- **body-parser** `^1.20.2` — Parses URL-encoded form bodies (included in the original template).

#### Notes ####

- SQLite requires the `sqlite3` command-line tool to be installed for `npm run build-db`.
- Tailwind is loaded via CDN so no compilation or build script is needed beyond `npm install` and `npm run build-db`.
