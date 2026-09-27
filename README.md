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

- RESTful API Design.
- User authentication and registration.
- CORS control with dynamic origin support.
- Template rendering using **EJS** for home routes.
- Secure handling of static files.
- Modular routing for scalability.
- Centralized logging using custom middleware with **winston**.
- Dynamic environment-based configuration using **dotenv**.
- MongoDB integration using **Mongoose**.

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

### Environment Variables

This project supports multiple environment configurations. Create `.env.development` or `.env.production` files depending on your environment. Add the following variables:
```plaintext
NODE_ENV=development           # or production
PORT=<server_port>             # Port number (default: 5000)
MONGO_URI=<mongo_connection_uri>
JWT_SECRET=<secret_for_tokens>
ALLOWED_ORIGINS=<comma_separated_allowed_origins>
```
Replace `<mongo_connection_uri>` and other placeholders with your actual configuration details.

---

## API Endpoints

### Routes Overview

Below are the available routes implemented in the backend:

| Endpoint                       | Description                        | Method |
|--------------------------------|------------------------------------|--------|
| `/api/members`                 | Member-related actions             | All    |
| `/api/register`                | User registration                  | POST   |
| `/api/login`                   | User login                         | POST   |
| `/api/dashboard`               | Dashboard data                     | GET    |
| `/api/members/notes`           | Notes management                   | All    |
| `/api/members/aboutme`         | About Me section                   | All    |
| `/api/members/profile-image`   | Upload/manage profile images       | POST   |
| `/api/members/`                | User profile cards (default route) | All    |

### Static and Home Routes

- The home route (`/`) provides a dynamic admin panel to render registrant data from a MongoDB collection.
- Static assets served from:
  - `/public`
  - `/views`
  - `/data`

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
│   ├── profileImageRoutes.mjs
│   └── profileCardRoutes.mjs
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

- **Development server**:
  ```bash
  npm run dev
  ```

- **Lint the code**:
  ```bash
  npm run lint
  ```

---

## License

This project is licensed under the [MIT License](LICENSE).
