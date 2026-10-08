import express from 'express';
import Registration from '../models/registration.mjs';
import bcrypt from 'bcrypt';
import upload from '../config/multer.mjs';
import { withPresenceStatus } from '../utils/memberPresence.mjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Members join through social sign-in and the age verification step. These legacy
// endpoints accept unauthenticated writes (including age and role fields), so they
// stay off unless explicitly re-enabled.
router.use((req, res, next) => {
  if (process.env.ALLOW_PASSWORD_REGISTRATION === 'true') return next();
  return res.status(403).json({
    message: 'Registration is available through social sign-in only.',
  });
});

const getDefaultProfileImage = (gender) => {
  const normalizedGender = String(gender ?? '').trim().toLowerCase();

  if (normalizedGender.startsWith('male') || normalizedGender === 'm' || normalizedGender === 'man') {
    return '/images/male.png';
  }

  return '/images/female.png';
};

router.get('/filter', async (req, res) => {
  try {
    const gender = req.query.gender;

    if (!gender || !['male', 'female'].includes(gender.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid or missing gender filter parameter. Allowed values: male, female' });
    }

    const filtered_data = await Registration.find({
      gender: gender.toLowerCase(),
    });

    if (filtered_data.length === 0) {
      return res.status(404).json({ message: 'No data found matching the gender filter criteria.' });
    }

    res.status(200).json(filtered_data); // Return JSON response
  } catch (e) {
    console.error(`Error in retrieving gender-filtered data: ${e.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await Registration.findById(req.params.id); // Find user by ID
    if (!user) return res.status(404).json({ error: 'User not found' });
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(withPresenceStatus(safeUser)); // Return user as JSON
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

//Add new
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 16);

    // Check if a photo is uploaded
    const profileImage = req.file
                         ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
                         : getDefaultProfileImage(req.body.gender); // Use a gender-matched default image

    const create = await Registration.create({ ...req.body, password: hashedPassword, profileImage, });
    const token = jwt.sign(
        {
          id: create._id,
          name: create.name,
          email: create.email,
          role: create.role || 'member',
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
    );
    const safeUser = create.toObject();
    delete safeUser.password;
    res.status(201).json({ message: 'Registration successful!', token, profile: safeUser });
  }
  catch (e) {
    res.status(500).json({error: e.message});
  }
});

// Edit User Info
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const updates = { ...req.body };

    // If a new file is uploaded, include the `profileImage` in updates
    if (req.file) {
      updates.profileImage =
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const updatedUser = await Registration.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    const safeUser = updatedUser.toObject();
    delete safeUser.password;
    res.json(withPresenceStatus(safeUser));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;