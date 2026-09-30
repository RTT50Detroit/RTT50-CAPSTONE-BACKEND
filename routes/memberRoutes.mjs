import express from 'express';
import Member from '../models/registration.mjs';
import { logger } from '../middleware/logger.mjs';
import authenticate from '../middleware/authentication.mjs';
import { validate_route_param_id } from '../middleware/validate_request.mjs';

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

    const results = await Member.find(filters);
    return res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ errors: e.message });
  }
});

// RETRIEVE BY ID
router.get('/:id', validate_route_param_id, async (req, res) => {
  try {
    const get_one = await Member.findById(req.params.id);
    if (!get_one) {
      return res.status(404).json({ error: 'Member not found' });
    }
    return res.status(200).json(get_one);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ADD NEW MEMBER
router.post('/', async (req, res) => {
  try {
    if (!req.body.name || !req.body.age || !req.body.gender) {
      return res.status(400).json({ error: 'Missing required fields: name, age, gender' });
    }

    const create = await Member.create(req.body);
    logger.info('New member created:', create);
    return res.status(201).json({ message: 'Member added successfully!', member: create });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE MEMBER BY ID
router.put('/:id', validate_route_param_id, async (req, res) => {
  try {
    const update = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true }); // 'new: true' returns the updated document
    if (!update) {
      return res.status(404).json({ error: 'Member not found' });
    }
    logger.info(`Member with ID ${req.params.id} updated.`);
    return res.status(200).json({ message: 'Member updated successfully!', member: update });
  } catch (e) {
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

    const filtered_data = await Member.find(filters);
    if (filtered_data.length === 0) {
      return res.status(404).json({ message: 'No members found matching the criteria.' });
    }

    return res.status(200).json(filtered_data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;