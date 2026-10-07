import { config } from 'dotenv';
import mongoose from 'mongoose';

config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });
config();

const { default: conn } = await import('../config/db.mjs');
const { default: Feedback } = await import('../models/feedback.mjs');
const { default: Registration } = await import('../models/registration.mjs');

const samplePosts = [
  {
    title: '[Sample Feedback] Improve profile discovery',
    category: 'Product idea',
    content: 'It would be helpful to filter profiles by shared interests before opening each profile.',
  },
  {
    title: '[Sample Feedback] Profile photo upload issue',
    category: 'Something is not working',
    content: 'The profile photo picker should show a clearer upload state while a larger image is being processed.',
  },
  {
    title: '[Sample Feedback] The relationship resume is useful',
    category: 'Love this',
    content: 'The relationship resume gives profiles a thoughtful way to share context beyond the usual short bio.',
  },
  {
    title: '[Sample Feedback] Add conversation prompts',
    category: 'Community experience',
    content: 'Conversation prompts could make it easier for new members to start a meaningful first interaction.',
  },
  {
    title: '[Sample Feedback] Remember dashboard preferences',
    category: 'Product idea',
    content: 'Saving widget visibility and layout preferences across sessions would make the dashboard feel more personal.',
  },
];

const seedFeedback = async () => {
  await conn();

  try {
    const author = await Registration.findOne({
      $or: [
        { role: 'master' },
        ...(process.env.MASTER_EMAIL ? [{ email: process.env.MASTER_EMAIL.trim().toLowerCase() }] : []),
      ],
    }).select('_id');

    if (!author) {
      throw new Error('No seed author found. Create a member or configure MASTER_EMAIL first.');
    }

    const operations = samplePosts.map((post) => ({
      updateOne: {
        filter: { author: author._id, title: post.title },
        update: {
          $set: {
            category: post.category,
            content: post.content,
          },
          $setOnInsert: {
            author: author._id,
            title: post.title,
            replies: [],
          },
        },
        upsert: true,
      },
    }));

    const result = await Feedback.bulkWrite(operations);
    console.log(
        `Feedback seed complete: ${result.upsertedCount} created, `
        + `${result.modifiedCount} updated.`,
    );
  } finally {
    await mongoose.disconnect();
  }
};

seedFeedback().catch((error) => {
  console.error('Feedback seed failed:', error.message);
  process.exitCode = 1;
});
