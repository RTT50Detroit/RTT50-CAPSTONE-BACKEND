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
      Registration.find().select('-password -role').sort({ createdAt: -1 }).lean(),
      AboutMe.find().lean(),
    ]);
    const aboutMeByUserId = new Map(
        aboutMeEntries.map((entry) => [String(entry.userId), entry.content || ''])
    );

    const profiles = members.map((member) => ({
      id: member._id,
      name: member.name,
      aboutMe: aboutMeByUserId.has(String(member._id))
        ? aboutMeByUserId.get(String(member._id))
        : member.aboutMe || '',
      photo: member.photo || member.profileImage,
      profileImage: member.profileImage,
      age: member.age,
      gender: member.gender,
      occupation: member.occupation || '',
      hobbies: member.hobbies || [],
      links: member.links || [],
      createdAt: member.createdAt,
    }));

    return res.status(200).json({ success: true, profiles });
  } catch (error) {
    console.error('Error fetching about-me profiles:', error);
    return res.status(500).json({ message: 'Failed to fetch about-me profiles.' });
  }
});


// Update the signed-in member's profile details.
router.patch('/', authenticate, async (req, res) => {
  const { aboutMe, occupation, hobbies, links } = req.body;
  const updates = {};

  if (aboutMe !== undefined) {
    if (typeof aboutMe !== 'string') {
      return res.status(400).json({ message: 'About me must be a string.' });
    }
    updates.aboutMe = aboutMe.trim();
  }
  if (occupation !== undefined) {
    if (typeof occupation !== 'string') {
      return res.status(400).json({ message: 'Occupation must be a string.' });
    }
    updates.occupation = occupation.trim();
  }
  if (hobbies !== undefined) {
    if (!Array.isArray(hobbies) ||
        hobbies.some((hobby) => typeof hobby !== 'string')) {
      return res.status(400).json({ message: 'Hobbies must be an array of strings.' });
    }
    updates.hobbies = [...new Set(hobbies.map((hobby) => hobby.trim()).filter(Boolean))];
  }
  if (links !== undefined) {
    if (!Array.isArray(links) || links.some((link) => (
      !link || typeof link.label !== 'string' || typeof link.url !== 'string'
    ))) {
      return res.status(400).json({ message: 'Links must include a label and URL.' });
    }
    updates.links = links
        .map(({ label, url }) => ({ label: label.trim(), url: url.trim() }))
        .filter(({ label, url }) => label && url);
    if (updates.links.some(({ url }) => {
      try {
        return !['http:', 'https:'].includes(new URL(url).protocol);
      } catch {
        return true;
      }
    })) {
      return res.status(400).json({ message: 'Links must use an HTTP or HTTPS URL.' });
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'At least one profile field is required.' });
  }

  try {
    if (updates.aboutMe !== undefined) {
      await AboutMe.findOneAndUpdate(
          { userId: req.user.id },
          { userId: req.user.id, content: updates.aboutMe },
          { new: true, upsert: true, runValidators: true }
      );
    }
    const updatedUser = await Registration.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true },
    ).select('-password -role');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    return res.send({
      message: 'Profile updated successfully.',
      profile: updatedUser,
    });
  } catch (error) {
    console.error('Error updating member profile:', error);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
});

export default router;