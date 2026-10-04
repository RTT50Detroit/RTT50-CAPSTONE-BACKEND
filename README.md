# Backend Project - Social Match Makers
https://socialmatch.onrender.com/

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Folder Structure](#folder-structure)
- [Scripts](#scripts)
- [License](#license)

---

## Overview

This is a backend application built using **Node.js** and **Express.js**, with a focus on scalability and modularity. The application supports dynamic routing, RESTful API architecture, middleware customization, and a fully configured set of tools for effective backend development.

---

## Features

This application is a backend for a social matching platform that helps users register, authenticate, build profiles, and interact with other members.

### Core Features

- User registration and login with password hashing and JWT-based authentication.
- Member online presence tracking with login, logout, and heartbeat updates.
- Protected member routes for authenticated access to personal data and actions.
- Member profile management with create, read, update, and delete support.
- Gender-based and age-based filtering for member browsing on the home dashboard.
- Profile image support using uploaded files or default gender-based avatars.
- Personal notes feature for authenticated users to create, read, update, and delete notes.
- About Me profile section for storing and updating user bio information.
- Member card/profile views rendered through EJS templates for the app front end.
- Dynamic home page that displays filtered registrant data from MongoDB.
- CORS configuration for secure local and deployment environment access.
- Centralized request logging with custom Winston middleware.
- MongoDB persistence using Mongoose models for users, profiles, notes, and related data.

### Business Use Case

The app supports a matchmaking/social network workflow where members can:

- sign up for an account
- log in securely
- manage personal profile information
- upload a profile image
- store personal notes
- view and filter others in the member directory
- maintain a public-facing profile card experience

---

## Tech Stack

- **Node.js** - Runtime environment.
- **Express.js** - Backend framework.
- **MongoDB** with **Mongoose** - Database and ODM for data models.
- **EJS** - Embedded JavaScript templates.
- **Middleware**: 
  - `cors` for handling cross-origin requests.
  - `dotenv` for environment configuration.
  - `express.json()` for parsing JSON requests.
  - Custom logger based on **winston**.

---

## Getting Started

### Prerequisites

Ensure you have the following installed in your environment:
- **Node.js** (v20.0.0 or above)
- **npm** (Node Package Manager)
- **MongoDB** (Running locally or as a cloud-based instance)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd <project_folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (explained below).

4. Start the server:
   ```bash
   npm run start
   ```

To create or promote the master account, set `MASTER_EMAIL` and
`MASTER_PASSWORD` in the environment and run:
```bash
npm run create-master
```

### Environment Variables

This project supports multiple environment configurations. Create `.env.development` or `.env.production` files depending on your environment. Add the following variables:
```plaintext
NODE_ENV=development           # or production
PORT=<server_port>             # Port number (default: 5000)
MONGO_URI=<mongo_connection_uri>
JWT_SECRET=<secret_for_tokens>
ALLOWED_ORIGINS=<comma_separated_allowed_origins>
MASTER_EMAIL=<master_account_email>
MASTER_PASSWORD=<master_account_password>
```
Replace `<mongo_connection_uri>` and other placeholders with your actual configuration details.

---

## API Endpoints

### Routes Overview

Below are the available routes implemented in the backend:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/register` | `POST` | No | Register a new member and hash the password before saving it. |
| `/api/login` | `POST` | No | Verify email/password and return a JWT token for authenticated routes. |
| `/api/login/logout` | `POST` | Yes | Mark the authenticated member offline. |
| `/api/dashboard` | `GET` | Yes | Return dashboard data for the authenticated user. |
| `/api/members` | `GET` | No | Fetch all members or filter by query parameters such as name, age, and gender. |
| `/api/members/:id` | `GET` | No | Retrieve a single member by ID. |
| `/api/members/presence` | `POST` | Yes | Refresh the authenticated member's online presence. |
| `/api/members` | `POST` | Master | Create a member record with required profile fields. |
| `/api/members/:id` | `PUT` | Master | Update a specific member record by ID. |
| `/api/members/:id` | `DELETE` | No | Delete a member record by ID. |
| `/api/members/filter` | `GET` | No | Return members matching name, gender, or age-range filters. |
| `/api/members/notes` | `GET` | Yes | Return all notes for the authenticated user, newest first. |
| `/api/members/notes` | `POST` | Yes | Create a new note associated with the authenticated user. |
| `/api/members/notes/:id` | `PUT` | Yes | Update a specific note owned by the current user. |
| `/api/members/notes/:id` | `DELETE` | Yes | Delete a note owned by the current user. |
| `/api/members/aboutme` | `PATCH` | Yes | Update the authenticated user’s About Me content. |
| `/api/members/profile-image/:id` | `GET` | No | Return the profile image URL for a member. |
| `/api/members/profile-image/:id` | `POST` | No | Upload and save a new profile image for a member. |
| `/` | `GET` | No | Home page showing filtered registrants and member cards. |

### Static and Home Routes

- The home route (`/`) provides a dynamic admin panel to render registrant data from a MongoDB collection.
- Static assets served from:
  - `/public`
  - `/views`

---

## Folder Structure

Here's the structure of the backend application:
```plaintext
project-folder/
│
├── config/
│   └── db.mjs           # Database connection
│
├── middleware/
│   └── logger.mjs       # Winston logger middleware
│
├── models/
│   └── registration.mjs # Mongoose model for registrants
│
├── routes/
│   ├── memberRoutes.mjs
│   ├── loginRoutes.mjs
│   ├── registrationRoutes.mjs
│   ├── dashboardRoutes.mjs
│   ├── noteRoutes.mjs
│   ├── aboutMeRoutes.mjs
│   └── profileImageRoutes.mjs
│
├── public/              # Static files (e.g., CSS, images)
├── views/               # EJS files for rendering templates
├── .env                 # Environment variables
├── .gitignore           # Ignored files for Git
├── package.json         # Project metadata and dependencies
├── README.md            # Documentation (this file)
├── server.mjs           # Server entry point
└── ...
```

---

## Scripts

Below are the available scripts in the `package.json` file:

- **Start the server**:
  ```bash
  npm run start
  ```

---

## License

This project is licensed under the [MIT License](LICENSE).
