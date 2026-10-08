import express from 'express';
import Note from '../models/note.mjs';
import authenticate from '../middleware/authentication.mjs';
import requireVerifiedMember from '../middleware/requireVerifiedMember.mjs';

const router = express.Router();
const noteTypes = new Set(['note', 'journal']);

router.get('/', authenticate, requireVerifiedMember, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notes.' });
  }
});

router.post('/', authenticate, requireVerifiedMember, async (req, res) => {
  const { title, content, type = 'journal' } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ message: 'Content is required.' });
  }
  if (!noteTypes.has(type)) {
    return res.status(400).json({ message: 'Type must be either note or journal.' });
  }

  try {
    const note = await Note.create({
      user: req.user.id,
      title: title?.trim() || 'Untitled entry',
      content: content.trim(),
      type,
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create note.' });
  }
});

router.put('/:id', authenticate, requireVerifiedMember, async (req, res) => {
  const { title, content, type } = req.body;

  if (type !== undefined && !noteTypes.has(type)) {
    return res.status(400).json({ message: 'Type must be either note or journal.' });
  }

  try {
    const note = await Note.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        {
          title: title?.trim() || 'Untitled entry',
          content: content?.trim(),
          ...(type === undefined ? {} : { type }),
        },
        { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update note.' });
  }
});

router.delete('/:id', authenticate, requireVerifiedMember, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    res.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note.' });
  }
});

export default router;