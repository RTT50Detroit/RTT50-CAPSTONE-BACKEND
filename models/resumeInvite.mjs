import mongoose from 'mongoose';

// A resume the Relationship Resume has vouched for, waiting for its owner to join and pass
// verification here. Only a hash of the invite is stored, and it expires on its own.
const resumeInviteSchema = new mongoose.Schema({
  inviteHash: { type: String, required: true, unique: true },
  slug: { type: String, required: true },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationModel' },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export default mongoose.model('ResumeInviteModel', resumeInviteSchema);
