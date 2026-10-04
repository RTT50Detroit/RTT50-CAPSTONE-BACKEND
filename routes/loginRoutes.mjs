import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Registration from '../models/registration.mjs';
import authenticate from '../middleware/authentication.mjs';

const router = express.Router();

router.post(['/', '/login'], async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find registrant by email
    const registrant = await Registration.findOne({ email });
    console.log('Registrant Found:', registrant);

    if (!registrant) {
      console.log('No registrant found with this email address!');
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, registrant.password);
    console.log('Password Entered:', password);
    console.log('Stored Hashed Password:', registrant.password);

    if (!isPasswordValid) {
      console.log('Password validation failed!');
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    await Registration.findByIdAndUpdate(registrant._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    // Generate JWT Token
    const token = jwt.sign(
        {
          id: registrant._id,
          name: registrant.name,
          email: registrant.email,
          role: registrant.role || 'member',
        },
        // Payload used by the authenticated frontend and API routes.
        process.env.JWT_SECRET, { expiresIn: '1h' });

    // Respond with token
    res.json({ token });
  } catch (err) {
    console.error('Error occurred:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    await Registration.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastSeen: new Date(),
    });
    return res.status(204).send();
  } catch (err) {
    console.error('Error updating presence on logout:', err);
    return res.status(500).json({ message: 'Unable to update online status.' });
  }
});

export default router;