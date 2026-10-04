import express from 'express';
import Member from '../models/registration.mjs';
import { logger } from '../middleware/logger.mjs';
import authenticate from '../middleware/authentication.mjs';
import { validate_route_param_id } from '../middleware/validate_request.mjs';
import { withPresenceStatus } from '../utils/memberPresence.mjs';
import { requireMaster } from '../middleware/authentication.mjs';
import bcrypt from 'bcrypt';
import AboutMe from '../models/about.mjs';

const router = express.Router();

// ========================== ROUTES ==========================

// DELETE ALL MEMBERS
router.delete('/', authenticate, async (req, res) => {
  try {
    const delete_all = await Member.deleteMany({});
    logger.warn('Delete attempted: All data has been deleted!');
    console.warn('Delete attempted: All data has been deleted!');
    return res.status(200).json({ message: 'All members have been deleted!', delete_count: delete_all.deletedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// RETRIEVE ALL MEMBERS OR FILTER BY QUERY PARAMETERS
router.get('/', async (req, res) => {
  try {
    const { name, age, gender, minAge, maxAge } = req.query;
    const filters = {};

    if (name) filters.name = { $regex: name, $options: 'i' };

    if (gender) {
      filters.gender = { $regex: new RegExp(String(gender).trim(), 'i') };
    }

    if (age !== undefined && age !== '') {
      const parsedAge = Number(age);
      if (!Number.isNaN(parsedAge)) {
        filters.age = parsedAge;
      }
    }

    if (minAge !== undefined || maxAge !== undefined) {
      filters.age = filters.age && typeof filters.age === 'object' ? filters.age : {};

      if (minAge !== undefined && minAge !== '') {
        const parsedMinAge = Number(minAge);
        if (!Number.isNaN(parsedMinAge)) {
          filters.age.$gte = parsedMinAge;
        }
      }

      if (maxAge !== undefined && maxAge !== '') {
        const parsedMaxAge = Number(maxAge);
        if (!Number.isNaN(parsedMaxAge)) {
          filters.age.$lte = parsedMaxAge;
        }
      }
    }

    const results = (await Member.find(filters).select('-password').lean())
        .map(withPresenceStatus);
    return res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ errors: e.message });
  }
});

router.post('/presence', authenticate, async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
        req.user.id,
        { isOnline: true, lastSeen: new Date() },
        { new: true, select: '_id isOnline lastSeen' },
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.status(200).json(member);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ADD NEW MEMBER
router.post('/', authenticate, requireMaster, async (req, res) => {
  try {
    const { name, age, gender, email, password, bio } = req.body;
    if (!name || age === undefined || !gender || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: name, age, gender, email, password',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 16);
    const create = await Member.create({
      ...req.body,
      name,
      age: Number(age),
      gender,
      email,
      password: hashedPassword,
      bio: typeof bio === 'string' ? bio.trim() : '',
      role: 'member',
    });
    logger.info('New member created:', create);
    const safeMember = create.toObject();
    delete safeMember.password;
    return res.status(201).json({ message: 'Member added successfully!', member: safeMember });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'A member with that email already exists.' });
    }
    res.status(500).json({ error: e.message });
  }
});

// UPDATE MEMBER BY ID
router.put('/:id', authenticate, requireMaster, validate_route_param_id, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.role;
    delete updates.password;

    if (typeof updates.bio === 'string') {
      updates.bio = updates.bio.trim();
      await AboutMe.findOneAndUpdate(
          { userId: req.params.id },
          { userId: req.params.id, content: updates.bio },
          { upsert: true, runValidators: true },
      );
    }

    const update = await Member.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true },
    );
    if (!update) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const safeMember = update.toObject();
    delete safeMember.password;
    logger.info(`Member with ID ${req.params.id} updated.`);
    return res.status(200).json({ message: 'Member updated successfully!', member: safeMember });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'A member with that email already exists.' });
    }
    res.status(500).json({ error: e.message });
  }
});

// DELETE SINGLE MEMBER BY ID
router.delete('/:id', validate_route_param_id, async (req, res) => {
  try {
    const delete_one = await Member.findByIdAndDelete(req.params.id);
    if (!delete_one) {
      return res.status(404).json({ error: 'Member not found' });
    }
    logger.warn(`Member with ID ${req.params.id} deleted.`);
    console.warn(`Member with ID ${req.params.id} deleted.`);
    return res.status(200).json({ message: 'Member deleted successfully!', member: delete_one });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// RETRIEVE BY FILTER (NAME, GENDER, OR AGE RANGE)
router.get('/filter', async (req, res) => {
  const { name, gender, age, minAge, maxAge } = req.query;

  try {
    const filters = {};
    if (name) filters.name = { $regex: new RegExp(name, 'i') };

    if (gender) {
      const normalizedGender = String(gender).trim().toLowerCase();
      if (!['male', 'female'].includes(normalizedGender)) {
        return res.status(400).json({ error: 'Invalid gender filter. Allowed: male, female' });
      }
      filters.gender = { $regex: new RegExp(normalizedGender, 'i') };
    }

    if (age !== undefined && age !== '') {
      const parsedAge = Number(age);
      if (!Number.isNaN(parsedAge)) {
        filters.age = parsedAge;
      }
    }

    if (minAge !== undefined || maxAge !== undefined) {
      filters.age = filters.age && typeof filters.age === 'object' ? filters.age : {};

      if (minAge !== undefined && minAge !== '') {
        const parsedMinAge = Number(minAge);
        if (!Number.isNaN(parsedMinAge)) {
          filters.age.$gte = parsedMinAge;
        }
      }

      if (maxAge !== undefined && maxAge !== '') {
        const parsedMaxAge = Number(maxAge);
        if (!Number.isNaN(parsedMaxAge)) {
          filters.age.$lte = parsedMaxAge;
        }
      }
    }

    const filtered_data = (await Member.find(filters).select('-password').lean())
        .map(withPresenceStatus);
    if (filtered_data.length === 0) {
      return res.status(404).json({ message: 'No members found matching the criteria.' });
    }

    return res.status(200).json(filtered_data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// RETRIEVE BY ID
router.get('/:id', validate_route_param_id, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).select('-password').lean();
    const get_one = member && withPresenceStatus(member);
    if (!get_one) {
      return res.status(404).json({ error: 'Member not found' });
    }
    return res.status(200).json(get_one);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;