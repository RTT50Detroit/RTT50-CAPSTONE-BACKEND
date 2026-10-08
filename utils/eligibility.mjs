import Registration from '../models/registration.mjs';
import AboutMe from '../models/about.mjs';
import Note from '../models/note.mjs';
import Feedback from '../models/feedback.mjs';
import AgeBlock, { hashIdentifier } from '../models/ageBlock.mjs';
import { MINIMUM_AGE } from '../config/policy.mjs';
import { calculateAge } from './age.mjs';
import { logger } from '../middleware/logger.mjs';

// Deletes a member and everything they own, and blocks their email and social
// identities from re-registering. Only hashes are kept.
export const removeIneligibleMember = async (member, reason) => {
  const identifiers = [member.email, ...(member.oauthAccounts || []).map(
      (account) => `${account.provider}:${account.subject}`)].filter(Boolean);

  await Promise.all(identifiers.map((identifier) => AgeBlock.updateOne(
      { identifierHash: hashIdentifier(identifier) },
      { identifierHash: hashIdentifier(identifier) },
      { upsert: true },
  )));
  await Promise.all([
    AboutMe.deleteMany({ userId: member._id }),
    Note.deleteMany({ user: member._id }),
    Feedback.deleteMany({ author: member._id }),
    Registration.deleteOne({ _id: member._id }),
  ]);
  logger.warn(`Removed ineligible member ${member._id}: ${reason}`);
};

// Early social sign-ups were created with a made-up age of 18 and this placeholder gender
// before the age check existed. Their age was never verified, so they are removed.
const isUnverifiedPlaceholder = (member) => (
  !member.dateOfBirth && !member.ageVerified && member.gender === 'prefer-not-to-say'
);

// Returns a reason string when the member does not meet the age policy, otherwise null.
export const getIneligibilityReason = (member, today = new Date()) => {
  if (member.role === 'master') return null;

  if (member.dateOfBirth) {
    const age = calculateAge(member.dateOfBirth, today);
    return age < MINIMUM_AGE ? `date of birth shows age ${age}` : null;
  }
  if (isUnverifiedPlaceholder(member)) return 'unverified placeholder age from early sign-up';
  if (typeof member.age === 'number' && member.age < MINIMUM_AGE) {
    return `recorded age ${member.age} is under ${MINIMUM_AGE}`;
  }

  return null;
};

// Removes every member who is under the minimum age. Safe to run repeatedly.
export const removeIneligibleMembers = async () => {
  const members = await Registration.find({ role: { $ne: 'master' } })
      .select('email oauthAccounts role dateOfBirth age ageVerified gender').lean();
  let removed = 0;

  for (const member of members) {
    const reason = getIneligibilityReason(member);
    if (!reason) continue;
    await removeIneligibleMember(member, reason);
    removed += 1;
  }

  if (removed) logger.warn(`Age policy sweep removed ${removed} ineligible member(s).`);
  return removed;
};

export const startEligibilitySweep = () => {
  const run = () => removeIneligibleMembers().catch((error) => {
    logger.error(`Age policy sweep failed: ${error.message}`);
  });
  run();
  // Birthdays do not make anyone younger, but this also catches records changed by hand.
  setInterval(run, 24 * 60 * 60 * 1000).unref();
};
