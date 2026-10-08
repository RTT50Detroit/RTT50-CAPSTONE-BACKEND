import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { MINIMUM_AGE } from '../config/policy.mjs';
import Registration from '../models/registration.mjs';

for (const file of ['.env.development', '.env']) {
  config({ path: file });
}

const { MONGO_URI, MASTER_EMAIL, MASTER_PASSWORD } = process.env;

if (!MONGO_URI || !MASTER_EMAIL || !MASTER_PASSWORD) {
  throw new Error('MONGO_URI, MASTER_EMAIL, and MASTER_PASSWORD are required.');
}

await mongoose.connect(MONGO_URI);

const password = await bcrypt.hash(MASTER_PASSWORD, 16);
const master = await Registration.findOneAndUpdate(
    { email: MASTER_EMAIL.trim().toLowerCase() },
    {
      $set: { role: 'master', password },
      $setOnInsert: {
        name: 'Master User',
        age: MINIMUM_AGE,
        gender: 'other',
      },
    },
    { new: true, upsert: true, runValidators: true },
);

console.log(`Master user ready: ${master.email}`);
await mongoose.disconnect();
