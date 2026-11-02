// server.js

const express = require("express");
const path = require("path");
const fs = require("fs");

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files from public/ if that folder exists.
// Otherwise, serve frontend files from the project root.
const publicFolder = path.join(__dirname, "public");

if (fs.existsSync(publicFolder)) {
    app.use(express.static(publicFolder));
} else {
    // Prevent the SQLite database and server source from
    // being exposed as static files.
    app.use(express.static(__dirname, {
        index: false,
        dotfiles: "deny"
    }));
}

// --------------------------------------------------
// HOME PAGE
// --------------------------------------------------

app.get("/", (req, res) => {
    const publicIndex = path.join(__dirname, "public", "index.html");
    const rootIndex = path.join(__dirname, "index.html");

    if (fs.existsSync(publicIndex)) {
        return res.sendFile(publicIndex);
    }

    if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
    }

    res.status(404).send(
        "CineVerse frontend not found. Check your index.html location."
    );
});

// --------------------------------------------------
// API STATUS
// --------------------------------------------------

app.get("/api/status", (req, res) => {
    try {
        const movieCount = db
            .prepare("SELECT COUNT(*) AS count FROM movies")
            .get().count;

        const theatreCount = db
            .prepare("SELECT COUNT(*) AS count FROM theatres")
            .get().count;

        const showtimeCount = db
            .prepare("SELECT COUNT(*) AS count FROM showtimes")
            .get().count;

        res.json({
            success: true,
            message: "CineVerse API is running.",
            database: "connected",
            movies: movieCount,
            theatres: theatreCount,
            showtimes: showtimeCount
        });
    } catch (error) {
        console.error("Status API error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to read database status."
        });
    }
});

// --------------------------------------------------
// GET ALL MOVIES
// --------------------------------------------------

app.get("/api/movies", (req, res) => {
    try {
        const movies = db.prepare(`
            SELECT
                id,
                title,
                genre,
                rating,
                description,
                image,
                language
            FROM movies
            ORDER BY id ASC
        `).all();

        console.log(`Movies API: returned ${movies.length} movies`);

        res.json(movies);
    } catch (error) {
        console.error("GET /api/movies failed:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load movies."
        });
    }
});

// --------------------------------------------------
// GET ONE MOVIE
// --------------------------------------------------

app.get("/api/movies/:id", (req, res) => {
    try {
        const movieId = Number(req.params.id);

        if (!Number.isInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                error: "Invalid movie ID."
            });
        }

        const movie = db.prepare(`
            SELECT
                id,
                title,
                genre,
                rating,
                description,
                image,
                language
            FROM movies
            WHERE id = ?
        `).get(movieId);

        if (!movie) {
            return res.status(404).json({
                error: "Movie not found."
            });
        }

        res.json(movie);
    } catch (error) {
        console.error("GET movie failed:", error);

        res.status(500).json({
            error: "Unable to load movie details."
        });
    }
});

// --------------------------------------------------
// GET SHOWTIMES FOR A MOVIE
// --------------------------------------------------

app.get("/api/movies/:id/showtimes", (req, res) => {
    try {
        const movieId = Number(req.params.id);

        if (!Number.isInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                error: "Invalid movie ID."
            });
        }

        const movie = db.prepare(
            "SELECT id FROM movies WHERE id = ?"
        ).get(movieId);

        if (!movie) {
            return res.status(404).json({
                error: "Movie not found."
            });
        }

        const showtimes = db.prepare(`
            SELECT
                s.id,
                s.movie_id,
                s.theatre_id,
                s.show_date,
                s.show_time,
                s.price,
                t.name AS theatre_name,
                t.city,
                t.location
            FROM showtimes s
            JOIN theatres t ON t.id = s.theatre_id
            WHERE s.movie_id = ?
              AND s.show_date >= date('now', 'localtime')
            ORDER BY
                s.show_date ASC,
                s.show_time ASC,
                t.name ASC
        `).all(movieId);

        res.json(showtimes);
    } catch (error) {
        console.error("GET showtimes failed:", error);

        res.status(500).json({
            error: "Unable to load showtimes."
        });
    }
});

// --------------------------------------------------
// GET SEATS FOR A SHOWTIME
// --------------------------------------------------

app.get("/api/showtimes/:id/seats", (req, res) => {
    try {
        const showtimeId = Number(req.params.id);

        if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
            return res.status(400).json({
                error: "Invalid showtime ID."
            });
        }

        const showtime = db.prepare(`
            SELECT id
            FROM showtimes
            WHERE id = ?
        `).get(showtimeId);

        if (!showtime) {
            return res.status(404).json({
                error: "Showtime not found."
            });
        }

        // Your existing database uses seat_label, not seat_number.
        const occupiedRows = db.prepare(`
            SELECT seat_label
            FROM booking_seats
            WHERE showtime_id = ?
        `).all(showtimeId);

        const occupiedSeats = occupiedRows.map(
            row => row.seat_label
        );

        res.json({
            showtime_id: showtimeId,
            occupiedSeats
        });

    } catch (error) {
        console.error("GET seats failed:", error);

        res.status(500).json({
            error: "Unable to load seats.",
            details: error.message
        });
    }
});

// --------------------------------------------------
// DEBUG ROUTES
// --------------------------------------------------

app.get("/api/debug-routes", (req, res) => {
    res.json({
        routes: [
            "GET /api/status",
            "GET /api/movies",
            "GET /api/movies/:id",
            "GET /api/movies/:id/showtimes",
            "GET /api/showtimes/:id/seats"
        ]
    });
});

// --------------------------------------------------
// HANDLE UNKNOWN API ROUTES
// --------------------------------------------------

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API route not found.",
        path: req.originalUrl
    });
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        error: "An unexpected server error occurred."
    });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
    console.log("----------------------------------");
    console.log("CineVerse is running on port", PORT);
    console.log("API status: /api/status");
    console.log("Movies: /api/movies");
    console.log("Showtimes: /api/movies/:id/showtimes");
    console.log("Seats: /api/showtimes/:id/seats");
    console.log("----------------------------------");
});