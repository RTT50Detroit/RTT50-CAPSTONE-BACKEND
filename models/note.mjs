import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
  type: String,
  default: 'Untitled entry',
  trim: true,
},
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['note', 'journal'],
    default: 'journal',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

export default mongoose.model('Note', noteSchema);