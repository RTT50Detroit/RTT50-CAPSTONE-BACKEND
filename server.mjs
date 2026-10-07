import express from 'express';
import { config } from 'dotenv';
import conn from './config/db.mjs';
import {logger} from './middleware/logger.mjs';

import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Registration from './models/registration.mjs';
import ensureMasterUser from './utils/ensureMasterUser.mjs';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';

for (const file of [envFile, '.env']) {
  config({ path: file });
}

if (!process.env.JWT_SECRET) {
  // Local development fallback so login and protected note routes can work when no
  // environment secret is configured yet. Production should set JWT_SECRET explicitly.
  process.env.JWT_SECRET = 'dev-local-jwt-secret';
}

const app = express();
const port = process.env.PORT || 5000;
const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(backendDirectory, 'public');
const legacyUploadDirectory = path.join(backendDirectory, 'routes', 'uploads');
await conn();
await ensureMasterUser();

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://socialmatchmaker.netlify.app',
      'https://socialmatchapp.onrender.com',
      ...(process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map((value) => value.trim())
          : []),
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true, // Support for cookies/auth headers
}));
app.use(express.json());

const MemberRoutes = await import('./routes/memberRoutes.mjs').then(
    module => module.default);
const LoginRoutes = await import('./routes/loginRoutes.mjs').then(
    module => module.default);
const AuthRoutes = await import('./routes/authRoutes.mjs').then(
    module => module.default);
const RegistrationRoutes = await import('./routes/registrationRoutes.mjs').then(
    module => module.default);
const DashboardRoutes = await import('./routes/dashboardRoutes.mjs').then(
  module => module.default);
const NoteRoutes = await import('./routes/noteRoutes.mjs').then(
    module => module.default);
const FeedbackRoutes = await import('./routes/feedbackRoutes.mjs').then(
    module => module.default);
const AboutMeRoutes = await import('./routes/aboutMeRoutes.mjs').then(
    module => module.default);
const ProfileImageRoutes = await import('./routes/profileImageRoutes.mjs').then(
    module => module.default);

// Route Definitions
app.use('/api/register', RegistrationRoutes);
app.use('/api/login', LoginRoutes);
app.use('/api/auth', AuthRoutes);
app.use('/api/dashboard', DashboardRoutes);
app.use('/api/members/notes', NoteRoutes);
app.use('/api/members/feedback', FeedbackRoutes);
app.use('/api/members/aboutme', AboutMeRoutes);
app.use('/api/members/profile-image', ProfileImageRoutes);
app.use('/api/members', MemberRoutes);

// Set configuration settings - key/value pairs
app.set('public', './public'); // .static files are located
app.set('views', './views'); // .ejs files are located
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('views'));
app.use(express.static(publicDirectory));
app.use('/uploads', express.static(path.join(publicDirectory, 'uploads')));
app.use('/uploads', express.static(legacyUploadDirectory));

// need for css to work on home route
app.use('/public', express.static(publicDirectory));

// Route Home
app.get('/', async (req, res) => {
  try {
    const { gender, minAge, maxAge } = req.query;
    const query = {};
    const ageFilters = [];

    if (gender) {
      const normalizedGender = String(gender).trim().toLowerCase();
      if (['male', 'female'].includes(normalizedGender)) {
        query.gender = { $regex: new RegExp(normalizedGender, 'i') };
      }
    }

    if (minAge !== undefined && minAge !== '') {
      const parsedMinAge = Number(minAge);
      if (!Number.isNaN(parsedMinAge)) {
        ageFilters.push({ age: { $gte: parsedMinAge } });
      }
    }

    if (maxAge !== undefined && maxAge !== '') {
      const parsedMaxAge = Number(maxAge);
      if (!Number.isNaN(parsedMaxAge)) {
        ageFilters.push({ age: { $lte: parsedMaxAge } });
      }
    }

    if (ageFilters.length > 0) {
      query.$and = ageFilters;
    }

    const registrants = await Registration.find(query).sort({ createdAt: -1 });
    res.render('home', {
      registrants,
      filters: {
        gender: gender || '',
        minAge: minAge || '',
        maxAge: maxAge || '',
      }
    });
  }
  catch (err) {
    // Log errors and respond with a 500 status
    logger.error(`Error loading data: ${err.message}`);
    res.status(500).send('Error loading data.');
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Starts the server
app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
