import dotenv from 'dotenv';
import express from 'express';
import { config } from 'dotenv';
import conn from './config/db.mjs';
import {logger} from './middleware/logger.mjs';

import cors from 'cors';
import path from 'path';
import {fileURLToPath} from 'url';
import Registration from './models/registration.mjs';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
config({ path: '.env' });

const app = express();
const port = process.env.PORT || 5000;
conn();

const allowedOrigins = process.env.ALLOWED_ORIGINS
                       ? process.env.ALLOWED_ORIGINS.split(',')
                       : []; // Default to an empty array if not set

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || process.env.NODE_ENV === 'production') {
      callback(null, true); // Allow all origins in production or if origin is not present
    } else {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://socialmatchmaker.netlify.app',
        'https://socialmatchapp.onrender.com',
        ...(process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : []),
      ];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
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
const RegistrationRoutes = await import('./routes/registrationRoutes.mjs').then(
    module => module.default);
const DashboardRoutes = await import('./routes/dashboardRoutes.mjs').then(
    module => module.default);
const NoteRoutes = await import('./routes/noteRoutes.mjs').then(
    module => module.default);
const AboutMeRoutes = await import('./routes/aboutMeRoutes.mjs').then(
    module => module.default);
const ProfileImageRoutes = await import('./routes/profileImageRoutes.mjs').then(
    module => module.default);
const ProfileCardRoutes = await import('./routes/profileCardRoutes.mjs').then(
    module => module.default);

// Route Definitions
app.use('/api/register', RegistrationRoutes);
app.use('/api/login', LoginRoutes);
app.use('/api/dashboard', DashboardRoutes);
app.use('/api/members/notes', NoteRoutes);
app.use('/api/members/aboutme', AboutMeRoutes);
app.use('/api/members/profile-image', ProfileImageRoutes);
app.use('/api/members', MemberRoutes);
app.use('/api/members/', ProfileCardRoutes);

// Set configuration settings - key/value pairs
app.set('public', './public'); // .static files are located
app.set('views', './views'); // .ejs files are located
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('views'));
app.use(express.static('public'));

// Simulate __dirname in ES module
const __filename = fileURLToPath(import.meta.url); // Get the file's full path
const __dirname = path.dirname(__filename); // Get the file's directory path
app.use('/data', express.static(path.join(__dirname, 'data')));
// need for css to work on home route
app.use('/public', express.static(path.join(__dirname, 'public')));

// Route Home
app.get('/', async (req, res) => {
  try {
    const registrants = await Registration.find().sort({ createdAt: -1 });
    res.render('home', {registrants});
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
