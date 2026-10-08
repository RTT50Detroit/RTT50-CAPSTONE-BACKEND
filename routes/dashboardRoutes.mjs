import express from 'express';
import authenticate from '../middleware/authentication.mjs';
import requireVerifiedMember from '../middleware/requireVerifiedMember.mjs';

const router = express.Router();

// Mock profile data to return for the dashboard (replace with DB queries if needed)
const profiles = [
  { id: 1, name: "John Doe", aboutMe: "Avid traveler and explorer." },
  { id: 2, name: "Jane Smith", aboutMe: "Technology enthusiast and coffee lover." },
  { id: 3, name: "Alice Brown", aboutMe: "Food blogger and photographer." }
];

router.get('/', authenticate, requireVerifiedMember, (req, res) => {
  // If the token is valid, the middleware attaches `req.registrant` with the
  // decoded payload
  res.status(200).json({
    message: `Welcome to the Dashboard, ${req.user.email}`,
    user: req.user,
    data: {
      profileData: 'Some data for the dashboard...' // Example response
    }
  });
});

// Route for fetching profile data (protected API)
router.get('/profiles', authenticate, requireVerifiedMember, (req, res) => {
  res.status(200).json({ success: true, profiles });
});



export default router;