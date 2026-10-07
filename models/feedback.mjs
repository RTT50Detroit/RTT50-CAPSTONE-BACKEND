import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RegistrationModel',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RegistrationModel',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Product idea',
      'Something is not working',
      'Love this',
      'Community experience',
    ],
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  replies: {
    type: [replySchema],
    default: [],
  },
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
