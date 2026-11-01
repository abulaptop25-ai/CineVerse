const Database = require("better-sqlite3");
const path = require("path");

// Open or create the CineVerse database.
const databasePath = path.join(__dirname, "cineverse.db");
const db = new Database(databasePath);

// Enable foreign-key relationships.
db.pragma("foreign_keys = ON");

console.log("CineVerse database connected successfully!");

// Create the movies table.
db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        genre TEXT NOT NULL,
        rating REAL NOT NULL,
        description TEXT NOT NULL,
        image TEXT NOT NULL
    );
`);

console.log("Movies table is ready!");

// Add the language column to existing databases if needed.
const movieColumns = db.prepare("PRAGMA table_info(movies)").all();

if (!movieColumns.some(column => column.name === "language")) {
    db.exec(`
        ALTER TABLE movies
        ADD COLUMN language TEXT NOT NULL DEFAULT 'English'
    `);

    console.log("Movie language column added!");
} else {
    console.log("Movie language column already exists!");
}

// Create the theatres table.
db.exec(`
    CREATE TABLE IF NOT EXISTS theatres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL
    );
`);

console.log("Theatres table is ready!");

// Create the showtimes table.
db.exec(`
    CREATE TABLE IF NOT EXISTS showtimes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        theatre_id INTEGER NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        ticket_price REAL NOT NULL CHECK (ticket_price >= 0),

        FOREIGN KEY (movie_id)
            REFERENCES movies(id)
            ON DELETE RESTRICT,

        FOREIGN KEY (theatre_id)
            REFERENCES theatres(id)
            ON DELETE RESTRICT
    );
`);

console.log("Showtimes table is ready!");


// ========================================
// CREATE THE BOOKINGS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        booking_reference TEXT NOT NULL UNIQUE,

        showtime_id INTEGER NOT NULL,

        total_amount REAL NOT NULL
            CHECK (total_amount >= 0),

        status TEXT NOT NULL DEFAULT 'confirmed'
            CHECK (status IN ('confirmed', 'cancelled')),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (showtime_id)
            REFERENCES showtimes(id)
            ON DELETE RESTRICT
    );
`);

console.log("Bookings table is ready!");


// ========================================
// CREATE THE BOOKING SEATS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS booking_seats (
        showtime_id INTEGER NOT NULL,

        seat_label TEXT NOT NULL,

        booking_id INTEGER NOT NULL,

        ticket_price REAL NOT NULL
            CHECK (ticket_price >= 0),

        PRIMARY KEY (showtime_id, seat_label),

        FOREIGN KEY (showtime_id)
            REFERENCES showtimes(id)
            ON DELETE RESTRICT,

        FOREIGN KEY (booking_id)
            REFERENCES bookings(id)
            ON DELETE RESTRICT
    );
`);

console.log("Booking seats table is ready!");


// Export the database connection for server.js and other files.
module.exports = db;