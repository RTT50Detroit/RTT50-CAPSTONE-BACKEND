import express from 'express';
import Feedback from '../models/feedback.mjs';
import authenticate from '../middleware/authentication.mjs';
import requireVerifiedMember from '../middleware/requireVerifiedMember.mjs';

const router = express.Router();
const categories = new Set([
  'Product idea',
  'Something is not working',
  'Love this',
  'Community experience',
]);

const presentAuthor = (author) => (
  author ? { _id: author._id, name: author.name } : undefined
);

const presentReply = (reply) => ({
  ...reply.toObject(),
  author: presentAuthor(reply.author),
  authorName: reply.author?.name,
});

const presentFeedback = (feedback) => ({
  ...feedback.toObject(),
  author: presentAuthor(feedback.author),
  authorName: feedback.author?.name,
  replies: feedback.replies.map(presentReply),
});

router.get('/', authenticate, requireVerifiedMember, async (req, res) => {
  try {
    const feedback = await Feedback.find()
        .sort({ createdAt: -1 })
        .populate('author', 'name')
        .populate('replies.author', 'name');
    return res.json(feedback.map(presentFeedback));
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ message: 'Failed to fetch feedback.' });
  }
});

router.post('/', authenticate, requireVerifiedMember, async (req, res) => {
  const { title, category, content } = req.body;
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const trimmedContent = typeof content === 'string' ? content.trim() : '';

  if (!trimmedTitle || !trimmedContent) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }
  if (!categories.has(category)) {
    return res.status(400).json({ message: 'A valid feedback category is required.' });
  }

  try {
    const feedback = await Feedback.create({
      author: req.user.id,
      title: trimmedTitle,
      category,
      content: trimmedContent,
    });
    await feedback.populate('author', 'name');
    return res.status(201).json(presentFeedback(feedback));
  } catch (error) {
    console.error('Error creating feedback:', error);
    return res.status(500).json({ message: 'Failed to submit feedback.' });
  }
});

router.post('/:id/replies', authenticate, requireVerifiedMember, async (req, res) => {
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content) {
    return res.status(400).json({ message: 'Reply content is required.' });
  }

  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback post not found.' });
    }

    feedback.replies.push({ author: req.user.id, content });
    await feedback.save();
    await feedback.populate('replies.author', 'name');
    const reply = feedback.replies[feedback.replies.length - 1];
    return res.status(201).json({ reply: presentReply(reply) });
  } catch (error) {
    console.error('Error creating feedback reply:', error);
    return res.status(500).json({ message: 'Failed to submit reply.' });
  }
});

export default router;
