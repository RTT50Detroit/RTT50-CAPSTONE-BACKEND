import express from 'express';
import AboutMe from '../models/about.mjs';
import Registration from '../models/registration.mjs';
import dotenv from 'dotenv';
import authenticate from '../middleware/authentication.mjs';
const router = express.Router();
dotenv.config();


// GET /'api/members'
router.get('/', authenticate, async (req, res) => {
  try {
    const [members, aboutMeEntries] = await Promise.all([
      Registration.find().sort({ createdAt: -1 }).lean(),
      AboutMe.find().lean(),
    ]);
    const bioByUserId = new Map(
        aboutMeEntries.map((entry) => [String(entry.userId), entry.content || ''])
    );

    const profiles = members.map((member) => ({
      id: member._id,
      name: member.name,
      bio: bioByUserId.get(String(member._id)) || '',
      photo: member.photo || member.profileImage,
      age: member.age,
      gender: member.gender,
      createdAt: member.createdAt,
    }));

    return res.status(200).json({ success: true, profiles });
  } catch (error) {
    console.error('Error fetching AboutMe profiles:', error);
    return res.status(500).json({ message: 'Failed to fetch AboutMe profiles.' });
  }
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