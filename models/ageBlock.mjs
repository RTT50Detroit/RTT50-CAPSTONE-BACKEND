import crypto from 'crypto';
import mongoose from 'mongoose';

// Hashed identifiers of people who failed the age check, so the same email or social
// account cannot immediately retry. Raw emails and dates of birth are not stored.
const ageBlockSchema = new mongoose.Schema({
  identifierHash: { type: String, required: true, unique: true },
}, { timestamps: true });

const AgeBlockModel = mongoose.model('AgeBlockModel', ageBlockSchema);

export const hashIdentifier = (value) => crypto
    .createHash('sha256')
    .update(`${process.env.JWT_SECRET}:${String(value).toLowerCase()}`)
    .digest('hex');

export default AgeBlockModel;
