
// database.js

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "cineverse.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Check whether a column exists.
function hasColumn(tableName, columnName) {
    const columns = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all();

    return columns.some((column) => column.name === columnName);
}

// Add a missing column without removing existing data.
function addColumnIfMissing(tableName, columnName, definition) {
    if (!hasColumn(tableName, columnName)) {
        db.exec(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
        );

        console.log(
            `Added missing column: ${tableName}.${columnName}`
        );
    }
}

// Create database tables.
db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        genre TEXT NOT NULL DEFAULT '',
        rating REAL NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT 'English'
    );

    CREATE TABLE IF NOT EXISTS theatres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS showtimes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        theatre_id INTEGER NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 180,
        FOREIGN KEY (movie_id) REFERENCES movies(id),
        FOREIGN KEY (theatre_id) REFERENCES theatres(id),
        UNIQUE (movie_id, theatre_id, show_date, show_time)
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_reference TEXT UNIQUE,
        showtime_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL DEFAULT '',
        customer_email TEXT NOT NULL DEFAULT '',
        total_amount REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
    );

    CREATE TABLE IF NOT EXISTS booking_seats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        showtime_id INTEGER NOT NULL,
        seat_number TEXT NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (showtime_id) REFERENCES showtimes(id),
        UNIQUE (showtime_id, seat_number)
    );
`);

// --------------------------------------------------
// DATABASE MIGRATIONS
// Update existing databases without deleting data.
// --------------------------------------------------

addColumnIfMissing(
    "movies",
    "language",
    "TEXT NOT NULL DEFAULT 'English'"
);

addColumnIfMissing(
    "theatres",
    "city",
    "TEXT NOT NULL DEFAULT ''"
);

addColumnIfMissing(
    "theatres",
    "location",
    "TEXT NOT NULL DEFAULT ''"
);

// FIX: Add price to older showtimes tables.
addColumnIfMissing(
    "showtimes",
    "price",
    "REAL NOT NULL DEFAULT 180"
);

addColumnIfMissing(
    "bookings",
    "booking_reference",
    "TEXT"
);

addColumnIfMissing(
    "bookings",
    "customer_name",
    "TEXT NOT NULL DEFAULT ''"
);

addColumnIfMissing(
    "bookings",
    "customer_email",
    "TEXT NOT NULL DEFAULT ''"
);

addColumnIfMissing(
    "bookings",
    "total_amount",
    "REAL NOT NULL DEFAULT 0"
);

addColumnIfMissing(
    "bookings",
    "created_at",
    "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
);

// --------------------------------------------------
// SEED MOVIES
// Insert movies only when they do not already exist.
// --------------------------------------------------

const seedMovies = [
    {
        title: "Interstellar",
        genre: "Sci-Fi • Adventure",
        rating: 8.7,
        description:
            "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.",
        image:
            "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        language: "English"
    },
    {
        title: "The Dark Knight",
        genre: "Action • Crime",
        rating: 9.0,
        description:
            "Batman faces the Joker, a criminal mastermind determined to plunge Gotham City into chaos.",
        image:
            "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        language: "English"
    },
    {
        title: "Inception",
        genre: "Sci-Fi • Thriller",
        rating: 8.8,
        description:
            "A skilled thief enters people's dreams to steal secrets and faces an extraordinary final mission.",
        image:
            "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
        language: "English"
    },
    {
        title: "The Grand Adventure",
        genre: "Adventure • Fantasy",
        rating: 8.2,
        description:
            "An original fantasy adventure about a journey into a mysterious world.",
        image:
            "https://placehold.co/500x750/151515/ffffff?text=The+Grand+Adventure",
        language: "English"
    }
];

const insertMovie = db.prepare(`
    INSERT OR IGNORE INTO movies (
        title,
        genre,
        rating,
        description,
        image,
        language
    )
    VALUES (
        @title,
        @genre,
        @rating,
        @description,
        @image,
        @language
    )
`);

for (const movie of seedMovies) {
    insertMovie.run(movie);
}

// --------------------------------------------------
// SEED THEATRES
// --------------------------------------------------

const seedTheatres = [
    {
        name: "CineVerse Grand Cinemas",
        city: "Chennai",
        location: "Chennai, Tamil Nadu"
    },
    {
        name: "Silver Screen Multiplex",
        city: "Coimbatore",
        location: "Coimbatore, Tamil Nadu"
    },
    {
        name: "Crystal Palace Cinemas",
        city: "Madurai",
        location: "Madurai, Tamil Nadu"
    }
];

const insertTheatre = db.prepare(`
    INSERT INTO theatres (name, city, location)
    SELECT @name, @city, @location
    WHERE NOT EXISTS (
        SELECT 1
        FROM theatres
        WHERE name = @name AND city = @city
    )
`);

for (const theatre of seedTheatres) {
    insertTheatre.run(theatre);
}

// --------------------------------------------------
// LOCAL DATE HELPER
// Avoid UTC date shifts.
// --------------------------------------------------

function getLocalDateString(daysFromToday) {
    const date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + daysFromToday);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// --------------------------------------------------
// SEED SHOWTIMES FOR THE NEXT 14 DAYS
// --------------------------------------------------

const movies = db.prepare("SELECT id FROM movies").all();
const theatres = db.prepare("SELECT id FROM theatres").all();

const showtimeSlots = [
    { time: "10:00", price: 180 },
    { time: "14:00", price: 220 },
    { time: "18:30", price: 250 }
];

const insertShowtime = db.prepare(`
    INSERT OR IGNORE INTO showtimes (
        movie_id,
        theatre_id,
        show_date,
        show_time,
        price
    )
    VALUES (?, ?, ?, ?, ?)
`);

const seedShowtimes = db.transaction(() => {
    for (let day = 1; day <= 14; day++) {
        const showDate = getLocalDateString(day);

        for (const movie of movies) {
            for (const theatre of theatres) {
                for (const slot of showtimeSlots) {
                    insertShowtime.run(
                        movie.id,
                        theatre.id,
                        showDate,
                        slot.time,
                        slot.price
                    );
                }
            }
        }
    }
});

seedShowtimes();

// --------------------------------------------------
// DATABASE INDEXES
// --------------------------------------------------

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_showtimes_movie_date
    ON showtimes (movie_id, show_date);

    CREATE INDEX IF NOT EXISTS idx_showtimes_theatre
    ON showtimes (theatre_id);

    CREATE INDEX IF NOT EXISTS idx_booking_seats_showtime
    ON booking_seats (showtime_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference
    ON bookings (booking_reference)
    WHERE booking_reference IS NOT NULL;
`);

// --------------------------------------------------
// DATABASE STATUS
// --------------------------------------------------

console.log("CineVerse database connected.");

console.log(
    "Movies:",
    db.prepare("SELECT COUNT(*) AS count FROM movies").get().count
);

console.log(
    "Theatres:",
    db.prepare("SELECT COUNT(*) AS count FROM theatres").get().count
);

console.log(
    "Showtimes:",
    db.prepare("SELECT COUNT(*) AS count FROM showtimes").get().count
);

// Export database connection.
module.exports = db;
