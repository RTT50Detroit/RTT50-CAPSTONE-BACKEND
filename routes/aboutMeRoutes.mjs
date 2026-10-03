import express from 'express';
import AboutMe from '../models/about.mjs';
import dotenv from 'dotenv';
import authenticate from '../middleware/authentication.mjs';
const router = express.Router();
dotenv.config();


// GET /'api/members'
router.get('/', (req, res) => {
  // Simulating real-world workflow: Check for valid token
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized. Please provide a valid token.' });
  }

  // Return the members (profile cards)
  res.status(200).json(members); // Respond with the mock member data
});


// Update Bio
router.patch('/', authenticate, async (req, res) => {
  const { bio } = req.body;

  if (typeof bio !== 'string') {
    return res.status(400).json({ message: 'Bio is required.' });
  }

  try {
    const aboutMe = await AboutMe.findOneAndUpdate(
        { userId: req.user.id },
        { userId: req.user.id, content: bio },
        { new: true, upsert: true, runValidators: true }
    );

    return res.send({
      message: 'AboutMe updated successfully',
      aboutMe,
    });
  } catch (error) {
    console.error('Error updating AboutMe:', error);
    return res.status(500).json({ message: 'Failed to update AboutMe.' });
  }
});

export default router;