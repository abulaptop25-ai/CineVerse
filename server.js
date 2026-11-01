
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = 3000;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------
// 1. API STATUS
// --------------------------------------------------

app.get("/api/status", (req, res) => {
    res.json({
        message: "CineVerse API is running!",
        status: "OK"
    });
});

// --------------------------------------------------
// 2. GET ALL MOVIES
// --------------------------------------------------

app.get("/api/movies", (req, res) => {
    try {
        const movies = db.prepare(`
            SELECT *
            FROM movies
            ORDER BY id ASC
        `).all();

        res.json(movies);
    } catch (error) {
        console.error("Error fetching movies:", error.message);

        res.status(500).json({
            error: "Failed to fetch movies."
        });
    }
});

// --------------------------------------------------
// 3. GET ONE MOVIE
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
            SELECT *
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
        console.error("Error fetching movie:", error.message);

        res.status(500).json({
            error: "Failed to fetch movie."
        });
    }
});

// --------------------------------------------------
// 4. GET SHOWTIMES FOR A MOVIE
// --------------------------------------------------

app.get("/api/movies/:id/showtimes", (req, res) => {
    try {
        const movieId = Number(req.params.id);

        if (!Number.isInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                error: "Invalid movie ID."
            });
        }

        const movie = db.prepare(`
            SELECT id, title
            FROM movies
            WHERE id = ?
        `).get(movieId);

        if (!movie) {
            return res.status(404).json({
                error: "Movie not found."
            });
        }

        const showtimes = db.prepare(`
            SELECT
                s.id AS showtime_id,
                s.movie_id,
                s.theatre_id,
                s.show_date,
                s.show_time,
                s.ticket_price,
                m.title AS movie_title,
                m.language AS movie_language,
                t.name AS theatre_name,
                t.location AS theatre_city
            FROM showtimes s
            JOIN movies m ON m.id = s.movie_id
            JOIN theatres t ON t.id = s.theatre_id
            WHERE s.movie_id = ?
            ORDER BY s.show_date ASC, s.show_time ASC
        `).all(movieId);

        res.json(showtimes);
    } catch (error) {
        console.error("Error fetching showtimes:", error.message);

        res.status(500).json({
            error: "Failed to fetch showtimes."
        });
    }
});

// --------------------------------------------------
// HELPER: GET SHOWTIME DETAILS
// --------------------------------------------------

function getShowtime(showtimeId) {
    return db.prepare(`
        SELECT
            s.id AS showtime_id,
            s.movie_id,
            s.theatre_id,
            s.show_date,
            s.show_time,
            s.ticket_price,
            m.title AS movie_title,
            m.language AS movie_language,
            t.name AS theatre_name,
            t.location AS theatre_city
        FROM showtimes s
        JOIN movies m ON m.id = s.movie_id
        JOIN theatres t ON t.id = s.theatre_id
        WHERE s.id = ?
    `).get(showtimeId);
}

// --------------------------------------------------
// HELPER: VALIDATE SHOWTIME DATE AND TIME
// --------------------------------------------------

function isValidFutureShowtime(showtime) {
    if (!showtime) {
        return false;
    }

    // Expected database formats:
    // show_date: YYYY-MM-DD
    // show_time: HH:mm or HH:mm:ss

    const date = String(showtime.show_date);
    const time = String(showtime.show_time);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
        return false;
    }

    const normalizedTime =
        time.length === 5 ? `${time}:00` : time;

    const showDateTime = new Date(
        `${date}T${normalizedTime}+05:30`
    );

    return (
        !Number.isNaN(showDateTime.getTime()) &&
        showDateTime > new Date()
    );
}

// --------------------------------------------------
// 5. GET SEAT AVAILABILITY
// --------------------------------------------------

app.get("/api/showtimes/:id/seats", (req, res) => {
    try {
        const showtimeId = Number(req.params.id);

        if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
            return res.status(400).json({
                error: "Invalid showtime ID."
            });
        }

        const showtime = getShowtime(showtimeId);

        if (!showtime) {
            return res.status(404).json({
                error: "Showtime not found."
            });
        }

        const occupiedRows = db.prepare(`
            SELECT DISTINCT seat_label
            FROM booking_seats
            WHERE showtime_id = ?
        `).all(showtimeId);

        const occupiedSet = new Set(
            occupiedRows.map(row => row.seat_label)
        );

        const seats = [];

        // Six rows and ten seats per row: A1 to F10.
        for (let rowCode = 65; rowCode <= 70; rowCode++) {
            const row = String.fromCharCode(rowCode);

            for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
                const seatLabel = `${row}${seatNumber}`;

                seats.push({
                    seat_label: seatLabel,
                    row,
                    seat_number: seatNumber,
                    status: occupiedSet.has(seatLabel)
                        ? "occupied"
                        : "available"
                });
            }
        }

        res.json({
            showtime,
            total_seats: seats.length,
            occupied_count: occupiedSet.size,
            available_count: seats.length - occupiedSet.size,
            seats
        });
    } catch (error) {
        console.error("Error fetching seats:", error.message);

        res.status(500).json({
            error: "Failed to fetch seat availability."
        });
    }
});

// --------------------------------------------------
// 6. CREATE A BOOKING
// --------------------------------------------------

app.post("/api/bookings", (req, res) => {
    try {
        const showtimeId = Number(req.body.showtime_id);
        const requestedSeats = req.body.seats;

        if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
            return res.status(400).json({
                error: "A valid showtime_id is required."
            });
        }

        if (
            !Array.isArray(requestedSeats) ||
            requestedSeats.length === 0
        ) {
            return res.status(400).json({
                error: "Select at least one seat."
            });
        }

        // FIXED: Accept A1 through F10.
        const validSeatPattern = /^[A-F](10|[1-9])$/;

        for (const seat of requestedSeats) {
            if (
                typeof seat !== "string" ||
                !validSeatPattern.test(seat)
            ) {
                return res.status(400).json({
                    error: `Invalid seat label: ${seat}`
                });
            }
        }

        const uniqueSeats = [...new Set(requestedSeats)];

        if (uniqueSeats.length !== requestedSeats.length) {
            return res.status(400).json({
                error: "Duplicate seats are not allowed."
            });
        }

        // Keep booking requests reasonably sized.
        if (uniqueSeats.length > 10) {
            return res.status(400).json({
                error: "You can book a maximum of 10 seats at once."
            });
        }

        const showtime = getShowtime(showtimeId);

        if (!showtime) {
            return res.status(404).json({
                error: "Showtime not found."
            });
        }

        if (!isValidFutureShowtime(showtime)) {
            return res.status(400).json({
                error: "This showtime has already started or its date/time is invalid."
            });
        }

        const ticketPrice = Number(showtime.ticket_price);

        if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
            return res.status(500).json({
                error: "The ticket price configured for this showtime is invalid."
            });
        }

        // Check and insert seats within one database transaction.
        const createBooking = db.transaction(() => {
            const placeholders = uniqueSeats.map(() => "?").join(", ");

            const occupiedSeats = db.prepare(`
                SELECT seat_label
                FROM booking_seats
                WHERE showtime_id = ?
                  AND seat_label IN (${placeholders})
            `).all(showtimeId, ...uniqueSeats);

            if (occupiedSeats.length > 0) {
                const error = new Error(
                    "These seats are already booked: " +
                    occupiedSeats.map(seat => seat.seat_label).join(", ")
                );

                error.statusCode = 409;
                throw error;
            }

            const totalAmount = ticketPrice * uniqueSeats.length;

            const bookingReference =
                "CV" +
                crypto.randomBytes(5).toString("hex").toUpperCase();

            const bookingResult = db.prepare(`
                INSERT INTO bookings (
                    booking_reference,
                    showtime_id,
                    total_amount,
                    status
                )
                VALUES (?, ?, ?, ?)
            `).run(
                bookingReference,
                showtimeId,
                totalAmount,
                "confirmed"
            );

            const bookingId = Number(bookingResult.lastInsertRowid);

            const insertSeat = db.prepare(`
                INSERT INTO booking_seats (
                    showtime_id,
                    seat_label,
                    booking_id,
                    ticket_price
                )
                VALUES (?, ?, ?, ?)
            `);

            for (const seat of uniqueSeats) {
                insertSeat.run(
                    showtimeId,
                    seat,
                    bookingId,
                    ticketPrice
                );
            }

            return {
                booking_id: bookingId,
                booking_reference: bookingReference,
                showtime_id: showtimeId,
                movie_title: showtime.movie_title,
                movie_language: showtime.movie_language,
                theatre_name: showtime.theatre_name,
                theatre_city: showtime.theatre_city,
                show_date: showtime.show_date,
                show_time: showtime.show_time,
                seats: uniqueSeats,
                number_of_tickets: uniqueSeats.length,
                ticket_price: ticketPrice,
                total_amount: totalAmount,
                status: "confirmed"
            };
        });

        const booking = createBooking();

        res.status(201).json({
            message: "Booking confirmed successfully!",
            booking
        });
    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({
                error: error.message
            });
        }

        console.error("Error creating booking:", error.message);

        res.status(500).json({
            error: "Failed to create booking."
        });
    }
});

// --------------------------------------------------
// 7. GET ALL BOOKINGS
// --------------------------------------------------

app.get("/api/bookings", (req, res) => {
    try {
        const bookings = db.prepare(`
            SELECT
                b.id AS booking_id,
                b.booking_reference,
                b.total_amount,
                b.status,
                b.showtime_id,
                b.created_at,
                s.show_date,
                s.show_time,
                s.ticket_price,
                m.title AS movie_title,
                m.language AS movie_language,
                t.name AS theatre_name,
                t.location AS theatre_city,
                GROUP_CONCAT(bs.seat_label, ', ') AS seats,
                COUNT(bs.seat_label) AS number_of_tickets
            FROM bookings b
            JOIN showtimes s ON s.id = b.showtime_id
            JOIN movies m ON m.id = s.movie_id
            JOIN theatres t ON t.id = s.theatre_id
            LEFT JOIN booking_seats bs ON bs.booking_id = b.id
            GROUP BY b.id
            ORDER BY b.id DESC
        `).all();

        res.json(bookings);
    } catch (error) {
        console.error("Error fetching booking history:", error.message);

        res.status(500).json({
            error: "Failed to fetch booking history."
        });
    }
});

// --------------------------------------------------
// 8. GET ONE BOOKING BY REFERENCE
// --------------------------------------------------

app.get("/api/bookings/:reference", (req, res) => {
    try {
        const reference = String(req.params.reference).trim();

        if (!reference) {
            return res.status(400).json({
                error: "Booking reference is required."
            });
        }

        const booking = db.prepare(`
            SELECT
                b.id AS booking_id,
                b.booking_reference,
                b.total_amount,
                b.status,
                b.created_at,
                s.id AS showtime_id,
                s.show_date,
                s.show_time,
                s.ticket_price,
                m.id AS movie_id,
                m.title AS movie_title,
                m.language AS movie_language,
                t.name AS theatre_name,
                t.location AS theatre_city,
                GROUP_CONCAT(bs.seat_label, ', ') AS seats,
                COUNT(bs.seat_label) AS number_of_tickets
            FROM bookings b
            JOIN showtimes s ON s.id = b.showtime_id
            JOIN movies m ON m.id = s.movie_id
            JOIN theatres t ON t.id = s.theatre_id
            LEFT JOIN booking_seats bs ON bs.booking_id = b.id
            WHERE b.booking_reference = ?
            GROUP BY b.id
        `).get(reference);

        if (!booking) {
            return res.status(404).json({
                error: "Booking not found."
            });
        }

        res.json(booking);
    } catch (error) {
        console.error("Error fetching booking:", error.message);

        res.status(500).json({
            error: "Failed to fetch booking."
        });
    }
});

// --------------------------------------------------
// 9. DEBUG REGISTERED ROUTES
// --------------------------------------------------

app.get("/api/debug-routes", (req, res) => {
    const routes = [];

    const stack = app.router?.stack || app._router?.stack || [];

    for (const layer of stack) {
        if (layer.route) {
            routes.push({
                path: layer.route.path,
                methods: Object.keys(layer.route.methods)
            });
        }
    }

    res.json({
        express_version: require("express/package.json").version,
        registered_routes: routes
    });
});

// --------------------------------------------------
// 10. API 404 HANDLER
// --------------------------------------------------

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API route not found.",
        requested_url: req.originalUrl
    });
});

// --------------------------------------------------
// 11. START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
    console.log(`CineVerse is running at http://localhost:${PORT}`);
    console.log(`API status: http://localhost:${PORT}/api/status`);
    console.log(`Debug routes: http://localhost:${PORT}/api/debug-routes`);
});
