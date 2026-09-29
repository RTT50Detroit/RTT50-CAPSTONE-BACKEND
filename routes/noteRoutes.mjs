import express from 'express';
import Note from '../models/note.mjs';
import authenticate from '../middleware/authentication.mjs';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notes.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { title, content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ message: 'Content is required.' });
  }

  try {
    const note = await Note.create({
      user: req.user.id,
      title: title?.trim() || 'Untitled entry',
      content: content.trim(),
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create note.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        {
          title: req.body.title?.trim() || 'Untitled entry',
          content: req.body.content?.trim(),
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

router.delete('/:id', authenticate, async (req, res) => {
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