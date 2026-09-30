import express from 'express';
import Registration from 'models/registration.mjs';
import {logger} from 'middleware/logger.mjs';
const router = express.Router();

router.get('/', async (req, res) => {
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

export default router;