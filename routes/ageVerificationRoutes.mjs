import express from 'express';
import jwt from 'jsonwebtoken';
import Registration from '../models/registration.mjs';
import { removeIneligibleMember } from '../utils/eligibility.mjs';
import authenticate from '../middleware/authentication.mjs';
import { POLICY_VERSION, MINIMUM_AGE } from '../config/policy.mjs';
import { validateDateOfBirth } from '../utils/age.mjs';
import { createSessionPayload } from '../utils/session.mjs';

const router = express.Router();
const allowedGenders = ['male', 'female', 'other'];
const messages = {
  required: 'Enter your date of birth.',
  invalid: 'Enter a valid date of birth.',
  future: 'Your date of birth cannot be in the future.',
  unrealistic: 'Enter a valid date of birth.',
};

// GET /api/members/age-verification - the signed-in member's verification status.
router.get('/', authenticate, async (req, res) => {
  const member = await Registration.findById(req.user.id)
      .select('ageVerified policyVersion').lean();
  if (!member) return res.status(404).json({ message: 'Member not found.' });

  return res.json({
    ageVerified: Boolean(member.ageVerified),
    policyVersion: member.policyVersion || null,
    currentPolicyVersion: POLICY_VERSION,
    complete: Boolean(member.ageVerified) && member.policyVersion === POLICY_VERSION,
  });
});

// POST /api/members/age-verification - verify age and accept policies.
router.post('/', authenticate, async (req, res) => {
  const { dateOfBirth, gender, confirmsAdult, acceptsPolicies } = req.body || {};

  try {
    const member = await Registration.findById(req.user.id);
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    if (confirmsAdult !== true || acceptsPolicies !== true) {
      return res.status(400).json({
        message: `You must confirm you are ${MINIMUM_AGE} or older and accept the policies.`,
      });
    }

    // Members who already passed the age check re-accept policies against their stored birth date.
    const alreadyVerified = member.ageVerified && member.dateOfBirth;
    const result = alreadyVerified
      ? validateDateOfBirth(member.dateOfBirth.toISOString().slice(0, 10))
      : validateDateOfBirth(dateOfBirth);

    if (!result.valid && result.reason === 'underage') {
      await removeIneligibleMember(member, 'failed age verification');
      return res.status(403).json({
        code: 'UNDERAGE',
        message: `You must be at least ${MINIMUM_AGE} years old to join The Social Match Game.`,
      });
    }
    if (!result.valid) {
      return res.status(400).json({ message: messages[result.reason] || messages.invalid });
    }

    if (!alreadyVerified && !allowedGenders.includes(String(gender || '').toLowerCase())) {
      return res.status(400).json({ message: 'Please select a gender.' });
    }

    const now = new Date();
    if (!alreadyVerified) {
      member.dateOfBirth = result.date;
      member.gender = String(gender).toLowerCase();
      member.ageVerifiedAt = now;
    }
    member.age = result.age;
    member.ageVerified = true;
    member.policyVersion = POLICY_VERSION;
    member.policiesAcceptedAt = now;
    await member.save();

    const user = createSessionPayload(member);
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ message: 'Age verified.', user, token });
  } catch (error) {
    console.error('Age verification failed:', error);
    return res.status(500).json({ message: 'Unable to complete age verification.' });
  }
});

export default router;
