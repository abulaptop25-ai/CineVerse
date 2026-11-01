// ========================================
// CINEVERSE — MAIN APPLICATION
// ========================================


// ========================================
// 1. HTML ELEMENTS AND APPLICATION STATE
// ========================================

let movies = [];

const movieGrid = document.getElementById("movie-grid");
const movieSearch = document.getElementById("movie-search");
const languageFilters = document.getElementById("language-filters");

const movieModal = document.getElementById("movie-modal");
const closeModalButton = document.getElementById("close-modal");

const modalTitle = document.getElementById("modal-title");
const modalGenre = document.getElementById("modal-genre");
const modalRating = document.getElementById("modal-rating");
const modalDescription = document.getElementById("modal-description");
const modalBookButton = document.getElementById("modal-book-button");

const showtimesList = document.getElementById("showtimes-list");

const seatModal = document.getElementById("seat-modal");
const closeSeatModalButton = document.getElementById("close-seat-modal");

const seatMovieName = document.getElementById("seat-movie-name");
const seatShowtimeDetails = document.getElementById("seat-showtime-details");
const seatGrid = document.getElementById("seat-grid");

const selectedSeatNames = document.getElementById("selected-seat-names");
const seatTotalPrice = document.getElementById("seat-total-price");
const confirmSeatsButton = document.getElementById("confirm-seats-button");

const bookingModal = document.getElementById("booking-modal");
const closeBookingModalButton = document.getElementById("close-booking-modal");
const closeBookingButton = document.getElementById("close-booking-button");

const bookingReference = document.getElementById("booking-reference");
const bookingMovie = document.getElementById("booking-movie");
const bookingTheatre = document.getElementById("booking-theatre");
const bookingDate = document.getElementById("booking-date");
const bookingTime = document.getElementById("booking-time");
const bookingSeats = document.getElementById("booking-seats");
const bookingTicketCount = document.getElementById("booking-ticket-count");
const bookingTotal = document.getElementById("booking-total");

let selectedMovie = null;
let selectedShowtime = null;
let selectedSeats = [];
let occupiedSeats = [];

let selectedLanguage = "all";


// ========================================
// 2. GENERAL HELPERS
// ========================================

function formatPrice(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function formatSelectedShowtime(showtime) {
    return (
        showtime.theatre_name +
        " • " + (showtime.theatre_city || showtime.location || "") +
        " • " + formatDate(showtime.show_date) +
        " • " + formatTime(showtime.show_time)
    );
}


// ========================================
// 3. LOAD MOVIES
// ========================================

async function loadMovies() {
    try {
        const response = await fetch("/api/movies");

        if (!response.ok) {
            throw new Error("Could not load movies.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid movie data received.");
        }

        movies = data;
        filterMovies();

    } catch (error) {
        movieGrid.textContent =
            "Unable to load movies. Please refresh the page.";

        console.error("Movie loading error:", error);
    }
}


// ========================================
// 4. DISPLAY MOVIE CARDS
// ========================================

function displayMovies(movieList) {
    movieGrid.replaceChildren();

    if (!movieList.length) {
        movieGrid.textContent =
            "No movies found. Try another search or language.";
        return;
    }

    movieList.forEach(function (movie) {
        const card = document.createElement("article");
        card.className = "movie-card";

        // MOVIE POSTER
        const poster = document.createElement("div");
        poster.className = "movie-poster movie-open";
        poster.dataset.movie = movie.title;
        poster.tabIndex = 0;
        poster.setAttribute("role", "button");
        poster.setAttribute(
            "aria-label",
            "View details for " + movie.title
        );

        const image = document.createElement("img");

        if (movie.image) {
            image.src = movie.image;
            image.alt = "Poster artwork for " + movie.title;
            image.loading = "lazy";

            image.onerror = function () {
                this.style.display = "none";
                poster.classList.add("poster-fallback");
            };
        } else {
            image.style.display = "none";
            poster.classList.add("poster-fallback");
        }

        const fallbackTitle = document.createElement("span");
        fallbackTitle.className = "poster-fallback-title";
        fallbackTitle.textContent = movie.title;

        const rating = document.createElement("span");
        rating.className = "movie-rating";
        rating.textContent = "★ " + movie.rating;

        poster.append(image, fallbackTitle, rating);

        // MOVIE INFORMATION
        const info = document.createElement("div");
        info.className = "movie-info";

        const title = document.createElement("h3");
        title.textContent = movie.title;

        const language = document.createElement("p");
        language.className = "movie-language";
        language.textContent = movie.language || "Language unavailable";

        const genre = document.createElement("p");
        genre.className = "movie-genre";
        genre.textContent = movie.genre || "Genre unavailable";

        const description = document.createElement("p");
        description.className = "movie-description";
        description.textContent = movie.description || "";

        const bookButton = document.createElement("button");
        bookButton.className = "book-button";
        bookButton.type = "button";
        bookButton.dataset.movie = movie.title;
        bookButton.textContent = "Book Tickets";

        info.append(
            title,
            language,
            genre,
            description,
            bookButton
        );

        card.append(poster, info);
        movieGrid.appendChild(card);
    });
}


// ========================================
// 5. MOVIE SEARCH AND LANGUAGE FILTERS
// ========================================

function filterMovies() {
    const searchText = movieSearch.value.toLowerCase().trim();

    const filteredMovies = movies.filter(function (movie) {
        const matchesSearch =
            (movie.title || "").toLowerCase().includes(searchText) ||
            (movie.genre || "").toLowerCase().includes(searchText) ||
            (movie.language || "").toLowerCase().includes(searchText);

        const matchesLanguage =
            selectedLanguage === "all" ||
            (movie.language || "").toLowerCase() ===
                selectedLanguage.toLowerCase();

        return matchesSearch && matchesLanguage;
    });

    displayMovies(filteredMovies);
}

movieSearch.addEventListener("input", filterMovies);

languageFilters.addEventListener("click", function (event) {
    const button = event.target.closest(".language-filter");

    if (!button) {
        return;
    }

    selectedLanguage = button.dataset.language;

    languageFilters.querySelectorAll(".language-filter").forEach(
        function (filterButton) {
            const isActive = filterButton === button;

            filterButton.classList.toggle("active", isActive);

            filterButton.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        }
    );

    filterMovies();
});


// ========================================
// 6. OPEN MOVIE DETAILS
// ========================================

async function openMovieDetails(movie) {
    selectedMovie = movie;
    selectedShowtime = null;
    selectedSeats = [];
    occupiedSeats = [];

    modalTitle.textContent = movie.title;

    modalGenre.textContent =
        "Genre: " + (movie.genre || "Not specified");

    modalRating.textContent =
        "★ Rating: " + movie.rating + " / 10";

    modalDescription.textContent =
        (movie.language ? "Language: " + movie.language + "\n\n" : "") +
        (movie.description || "");

    movieModal.classList.add("active");
    movieModal.setAttribute("aria-hidden", "false");

    showtimesList.textContent = "Loading available showtimes...";

    updateSeatSummary();

    await loadShowtimes(movie.id);
}


// ========================================
// 7. LOAD SHOWTIMES
// ========================================

async function loadShowtimes(movieId) {
    try {
        const response = await fetch(
            "/api/movies/" + movieId + "/showtimes"
        );

        if (!response.ok) {
            throw new Error("Could not load showtimes.");
        }

        const data = await response.json();

        if (
            !selectedMovie ||
            Number(selectedMovie.id) !== Number(movieId)
        ) {
            return;
        }

        if (!Array.isArray(data)) {
            throw new Error("Invalid showtime data received.");
        }

        displayShowtimes(data);

    } catch (error) {
        showtimesList.textContent =
            "Unable to load showtimes. Please try again.";

        console.error("Showtimes loading error:", error);
    }
}


// ========================================
// 8. DISPLAY SHOWTIMES
// ========================================

function displayShowtimes(showtimes) {
    showtimesList.replaceChildren();

    if (!showtimes.length) {
        showtimesList.textContent =
            "No showtimes are available for this movie yet.";
        return;
    }

    showtimes.forEach(function (showtime) {
        const card = document.createElement("div");
        card.className = "showtime-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-pressed", "false");

        const theatre = document.createElement("h4");
        theatre.textContent = showtime.theatre_name;

        const location = document.createElement("p");
        location.textContent =
            showtime.theatre_city || showtime.location || "";

        const date = document.createElement("p");
        date.textContent = "Date: " + formatDate(showtime.show_date);

        const time = document.createElement("p");
        time.textContent =
            "Showtime: " + formatTime(showtime.show_time);

        const price = document.createElement("p");
        price.textContent =
            "Ticket price: " + formatPrice(showtime.ticket_price);

        card.append(theatre, location, date, time, price);

        function selectShowtime() {
            showtimesList.querySelectorAll(".showtime-card").forEach(
                function (otherCard) {
                    otherCard.classList.remove("selected");
                    otherCard.setAttribute("aria-pressed", "false");
                }
            );

            card.classList.add("selected");
            card.setAttribute("aria-pressed", "true");

            selectedShowtime = showtime;
            selectedSeats = [];

            updateSeatSummary();
        }

        card.addEventListener("click", selectShowtime);

        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectShowtime();
            }
        });

        showtimesList.appendChild(card);
    });
}


// ========================================
// 9. CLOSE MOVIE DETAILS
// ========================================

function closeMovieDetails() {
    movieModal.classList.remove("active");
    movieModal.setAttribute("aria-hidden", "true");

    selectedMovie = null;
    selectedShowtime = null;
    selectedSeats = [];
    occupiedSeats = [];
}

closeModalButton.addEventListener("click", closeMovieDetails);

movieModal.addEventListener("click", function (event) {
    if (event.target === movieModal) {
        closeMovieDetails();
    }
});


// ========================================
// 10. MOVIE CARD CLICK HANDLERS
// ========================================

movieGrid.addEventListener("click", function (event) {
    const bookButton = event.target.closest(".book-button");
    const poster = event.target.closest(".movie-open");

    const target = bookButton || poster;

    if (!target) {
        return;
    }

    const movie = movies.find(function (item) {
        return item.title === target.dataset.movie;
    });

    if (movie) {
        openMovieDetails(movie);
    }
});

movieGrid.addEventListener("keydown", function (event) {
    const poster = event.target.closest(".movie-open");

    if (
        poster &&
        (event.key === "Enter" || event.key === " ")
    ) {
        event.preventDefault();

        const movie = movies.find(function (item) {
            return item.title === poster.dataset.movie;
        });

        if (movie) {
            openMovieDetails(movie);
        }
    }
});


// ========================================
// 11. OPEN SEAT-SELECTION POPUP
// ========================================

modalBookButton.addEventListener("click", async function () {
    if (!selectedMovie) {
        alert("Please select a movie first.");
        return;
    }

    if (!selectedShowtime) {
        alert("Please select a showtime first.");
        return;
    }

    selectedSeats = [];

    seatMovieName.textContent = selectedMovie.title;

    seatShowtimeDetails.textContent =
        formatSelectedShowtime(selectedShowtime);

    seatModal.classList.add("active");
    seatModal.setAttribute("aria-hidden", "false");

    updateSeatSummary();

    await generateSeatGrid();
});


// ========================================
// 12. LOAD AND GENERATE SEAT GRID
// ========================================

async function generateSeatGrid() {
    seatGrid.replaceChildren();

    if (!selectedShowtime) {
        seatGrid.textContent =
            "Please select a showtime first.";
        return;
    }

    seatGrid.textContent = "Loading seat availability...";

    const showtimeId =
        selectedShowtime.showtime_id ?? selectedShowtime.id;

    const requestedShowtimeId = Number(showtimeId);

    try {
        const response = await fetch(
            "/api/showtimes/" + requestedShowtimeId + "/seats"
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Could not load seat availability."
            );
        }

        if (
            !selectedShowtime ||
            Number(
                selectedShowtime.showtime_id ?? selectedShowtime.id
            ) !== requestedShowtimeId
        ) {
            return;
        }

        if (!Array.isArray(data.seats)) {
            throw new Error("The server returned invalid seat data.");
        }

        occupiedSeats = data.seats
            .filter(function (seat) {
                return seat.status === "occupied";
            })
            .map(function (seat) {
                return seat.seat_label;
            });

        seatGrid.replaceChildren();

        const seatsByRow = {};

        data.seats.forEach(function (seat) {
            if (!seatsByRow[seat.row]) {
                seatsByRow[seat.row] = [];
            }

            seatsByRow[seat.row].push(seat);
        });

        Object.keys(seatsByRow).sort().forEach(function (row) {
            const rowContainer = document.createElement("div");
            rowContainer.className = "seat-row";

            const rowLabel = document.createElement("span");
            rowLabel.className = "seat-row-label";
            rowLabel.textContent = row;

            rowContainer.appendChild(rowLabel);

            seatsByRow[row]
                .sort(function (a, b) {
                    return a.seat_number - b.seat_number;
                })
                .forEach(function (seat) {
                    const seatName = seat.seat_label;
                    const button = document.createElement("button");

                    button.type = "button";
                    button.className = "cinema-seat";
                    button.textContent = seat.seat_number;
                    button.dataset.seat = seatName;

                    if (seat.status === "occupied") {
                        button.classList.add("occupied");
                        button.disabled = true;

                        button.setAttribute(
                            "aria-label",
                            "Seat " + seatName + ", occupied"
                        );
                    } else {
                        const isSelected =
                            selectedSeats.includes(seatName);

                        button.classList.add(
                            isSelected ? "selected" : "available"
                        );

                        button.setAttribute(
                            "aria-label",
                            "Seat " + seatName +
                            (isSelected ? ", selected" : ", available")
                        );

                        button.setAttribute(
                            "aria-pressed",
                            String(isSelected)
                        );

                        button.addEventListener("click", function () {
                            toggleSeat(seatName, button);
                        });
                    }

                    rowContainer.appendChild(button);
                });

            seatGrid.appendChild(rowContainer);
        });

        if (data.seats.length === 0) {
            seatGrid.textContent =
                "No seats are configured for this showtime.";
        }

    } catch (error) {
        seatGrid.replaceChildren();

        const message = document.createElement("p");
        message.textContent =
            "Unable to load seat availability. Please try again.";

        seatGrid.appendChild(message);

        console.error("Seat availability error:", error);
    }
}


// ========================================
// 13. SELECT OR DESELECT A SEAT
// ========================================

function toggleSeat(seatName, button) {
    if (occupiedSeats.includes(seatName)) {
        return;
    }

    const index = selectedSeats.indexOf(seatName);

    if (index === -1) {
        selectedSeats.push(seatName);
    } else {
        selectedSeats.splice(index, 1);
    }

    const isSelected = selectedSeats.includes(seatName);

    button.classList.toggle("selected", isSelected);
    button.classList.toggle("available", !isSelected);

    button.setAttribute(
        "aria-label",
        "Seat " + seatName +
        (isSelected ? ", selected" : ", available")
    );

    button.setAttribute("aria-pressed", String(isSelected));

    updateSeatSummary();
}


// ========================================
// 14. UPDATE SEAT SUMMARY
// ========================================

function updateSeatSummary() {
    selectedSeatNames.textContent = selectedSeats.length
        ? [...selectedSeats].sort().join(", ")
        : "None";

    const price = selectedShowtime
        ? Number(selectedShowtime.ticket_price) || 0
        : 0;

    seatTotalPrice.textContent = formatPrice(
        selectedSeats.length * price
    );
}


// ========================================
// 15. CLOSE SEAT POPUP
// ========================================

function closeSeatModal() {
    seatModal.classList.remove("active");
    seatModal.setAttribute("aria-hidden", "true");
}

closeSeatModalButton.addEventListener("click", closeSeatModal);

seatModal.addEventListener("click", function (event) {
    if (event.target === seatModal) {
        closeSeatModal();
    }
});


// ========================================
// 16. BOOKING CONFIRMATION
// ========================================

function openBookingConfirmation(booking, movie, showtime) {
    bookingReference.textContent = booking.booking_reference;
    bookingMovie.textContent = movie.title;
    bookingTheatre.textContent = showtime.theatre_name;

    bookingDate.textContent = new Date(
        showtime.show_date + "T00:00:00"
    ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    bookingTime.textContent = formatTime(showtime.show_time);

    bookingSeats.textContent = booking.seats.join(", ");

    bookingTicketCount.textContent =
        booking.number_of_tickets ?? booking.seats.length;

    bookingTotal.textContent = formatPrice(booking.total_amount);

    bookingModal.classList.add("active");
    bookingModal.setAttribute("aria-hidden", "false");
}

function closeBookingConfirmation() {
    bookingModal.classList.remove("active");
    bookingModal.setAttribute("aria-hidden", "true");
}

closeBookingModalButton.addEventListener(
    "click",
    closeBookingConfirmation
);

closeBookingButton.addEventListener(
    "click",
    closeBookingConfirmation
);

bookingModal.addEventListener("click", function (event) {
    if (event.target === bookingModal) {
        closeBookingConfirmation();
    }
});


// ========================================
// 17. ESCAPE KEY SUPPORT
// ========================================

document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
        return;
    }

    if (bookingModal.classList.contains("active")) {
        closeBookingConfirmation();
    } else if (seatModal.classList.contains("active")) {
        closeSeatModal();
    } else if (movieModal.classList.contains("active")) {
        closeMovieDetails();
    }
});


// ========================================
// 18. CONFIRM AND SAVE BOOKING
// ========================================

confirmSeatsButton.addEventListener("click", async function () {
    if (!selectedMovie || !selectedShowtime) {
        alert("Please select a movie and showtime first.");
        return;
    }

    if (selectedSeats.length === 0) {
        alert("Please select at least one seat.");
        return;
    }

    const movieForBooking = selectedMovie;
    const showtimeForBooking = selectedShowtime;
    const seatsForBooking = [...selectedSeats];

    const showtimeId =
        showtimeForBooking.showtime_id ?? showtimeForBooking.id;

    confirmSeatsButton.disabled = true;

    const originalText = confirmSeatsButton.textContent;
    confirmSeatsButton.textContent = "Booking...";

    try {
        const response = await fetch("/api/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                showtime_id: Number(showtimeId),
                seats: seatsForBooking
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "Unable to complete booking."
            );
        }

        const booking = data.booking;

        if (
            !booking ||
            !booking.booking_reference ||
            !Array.isArray(booking.seats) ||
            typeof booking.total_amount !== "number"
        ) {
            throw new Error(
                "The server returned an unexpected booking response."
            );
        }

        selectedSeats = [];

        closeSeatModal();

        openBookingConfirmation(
            booking,
            movieForBooking,
            showtimeForBooking
        );

        await generateSeatGrid();

        updateSeatSummary();

    } catch (error) {
        alert(error.message);

        console.error("Booking error:", error);

        await generateSeatGrid();

        updateSeatSummary();

    } finally {
        confirmSeatsButton.disabled = false;
        confirmSeatsButton.textContent = originalText;
    }
});


// ========================================
// 19. START THE APPLICATION
// ========================================

loadMovies();