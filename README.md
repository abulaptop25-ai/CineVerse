# CineVerse 🎬

### Movie Ticket Booking Web Application

CineVerse is a web-based movie ticket booking application developed as a college mini-project. It allows users to explore movies, view showtimes, select seats, and book movie tickets through a simple interface.

## ✨ Features

- Browse available movies.
- Search for movies.
- View movie details and ratings.
- Explore theatre locations and showtimes.
- Select seats using an interactive seat layout.
- View selected seats and calculate ticket prices.
- Book movie tickets and receive a booking reference.
- Track occupied seats to help prevent duplicate bookings.
- Store movie and booking data using SQLite.

## 🛠️ Technologies Used

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
- SQLite
- better-sqlite3

## 📁 Project Structure

```text
CineVerse/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js
├── database.js
├── seedMovies.js
├── seedTheatres.js
├── seedShowtimes.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

*Note: The exact files may vary depending on your project.*

## 💻 Requirements

- Windows, Linux, or macOS computer
- Node.js and npm
- A modern web browser
- A code editor such as Visual Studio Code

## 🚀 How to Run the Project

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Open the project folder

```bash
cd CineVerse
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the application

```bash
npm start
```

If the project does not yet have a `start` script in `package.json`, use:

```bash
node server.js
```

### 5. Open the application

Visit:

http://localhost:3000

## 🗄️ Database

CineVerse uses SQLite to store application data, including movies, theatres, showtimes, bookings, and booked seats.

The database is managed locally by the backend.

## 🎯 Project Objective

The objective of CineVerse is to demonstrate the development of a full-stack web application using frontend technologies, a Node.js backend, REST API endpoints, and an SQLite database.

## 📚 Learning Outcomes

Through this project, the developer practises:

- Frontend web development.
- Backend development using Node.js and Express.js.
- Database integration with SQLite.
- REST API development.
- Dynamic user interface updates using JavaScript.
- Movie ticket booking and seat-selection workflows.
- Project documentation and version control using Git and GitHub.

## 👨‍💻 Academic Project

**Project Name:** CineVerse  
**Project Type:** College Mini-Project  
**Domain:** Web Development

---

Developed as a learning project to demonstrate full-stack web development concepts.