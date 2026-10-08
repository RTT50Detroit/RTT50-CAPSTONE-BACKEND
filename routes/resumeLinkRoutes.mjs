import crypto from 'crypto';
import express from 'express';
import authenticate from '../middleware/authentication.mjs';
import { requireAdultMember } from '../middleware/requireVerifiedMember.mjs';
import ResumeInvite from '../models/resumeInvite.mjs';
import Registration from '../models/registration.mjs';
import { isResumeLabel } from '../utils/resumeLink.mjs';
import { findIdentityMismatches } from '../utils/identityMatch.mjs';
import { MINIMUM_AGE } from '../config/policy.mjs';
import { parseDateOfBirth, validateDateOfBirth } from '../utils/age.mjs';

// The Relationship Resume is the front door. After a person publishes a resume there, its
// server asks for an invite here (shared secret). The person then joins, and the resume link
// is only added to their profile once they are signed in and pass the age and policy checks.
const router = express.Router();

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const RESUME_ORIGIN = 'https://therelationshipresume.netlify.app';
const RESUME_LABEL = 'The Relationship Resume';
const MAX_IDENTITY_ATTEMPTS = 3;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/i;

const hashInvite = (invite) => crypto
    .createHash('sha256')
    .update(`${process.env.JWT_SECRET}:resume-invite:${invite}`)
    .digest('hex');

const safeEqual = (a, b) => {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
};

// Only The Relationship Resume's server knows this secret. Without it the endpoint is off.
const requireIntegrationSecret = (req, res, next) => {
  const secret = process.env.RESUME_INTEGRATION_SECRET;
  const provided = req.header('X-Integration-Secret');
  if (!secret || !provided || !safeEqual(provided, secret)) {
    return res.status(401).json({ message: 'Integration access denied.' });
  }
  return next();
};

// POST /api/integrations/relationship-resume/invites
router.post('/invites', requireIntegrationSecret, async (req, res) => {
  const slug = String(req.body?.slug || '').trim();
  if (!SLUG_PATTERN.test(slug)) {
    return res.status(400).json({ message: 'A valid resume link name is required.' });
  }

  // The resume owner's declared identity travels with the invite and is checked on claim.
  const declaredName = String(req.body?.name || '').trim();
  const declaredSex = String(req.body?.sex || '').toLowerCase();
  const dob = validateDateOfBirth(req.body?.dateOfBirth);
  if (declaredName.length < 3 || declaredName.length > 100 || !['male', 'female', 'other'].includes(declaredSex)) {
    return res.status(400).json({ code: 'IDENTITY_REQUIRED', message: 'Name, date of birth and sex are required.' });
  }
  if (!dob.valid && dob.reason !== 'underage') {
    return res.status(400).json({ code: 'IDENTITY_REQUIRED', message: 'A valid date of birth is required.' });
  }
  if (!dob.valid) {
    return res.status(403).json({
      code: 'UNDER_MINIMUM_AGE',
      message: `Resumes can only be sent to The Social Match Game by people ${MINIMUM_AGE} or older.`,
    });
  }

  try {
    const invite = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
    await ResumeInvite.create({
      inviteHash: hashInvite(invite),
      slug,
      expiresAt,
      declaredName,
      declaredDateOfBirth: parseDateOfBirth(String(req.body.dateOfBirth)),
      declaredSex,
    });
    const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    return res.status(201).json({
      invite,
      expiresAt,
      joinUrl: `${frontend}/join?invite=${encodeURIComponent(invite)}`,
    });
  } catch (error) {
    console.error('Failed to create resume invite:', error.message);
    return res.status(500).json({ message: 'Unable to create an invite.' });
  }
});

// GET /api/integrations/relationship-resume/status
router.get('/status', authenticate, requireAdultMember, async (req, res) => {
  const member = await Registration.findById(req.user.id).select('resumeSlug role').lean();
  return res.json({ resumeLinked: member?.role === 'master' || Boolean(member?.resumeSlug) });
});

// POST /api/integrations/relationship-resume/claim
// Signed in and verified members only; the age and policy check runs on every claim.
router.post('/claim', authenticate, requireAdultMember, async (req, res) => {
  const invite = String(req.body?.invite || '').trim();
  if (!invite || invite.length > 100) {
    return res.status(400).json({ message: 'A valid invite is required.' });
  }
  try {
    const record = await ResumeInvite.findOneAndUpdate(
        {
          inviteHash: hashInvite(invite),
          claimedBy: { $exists: false },
          expiresAt: { $gt: new Date() },
          attempts: { $lt: MAX_IDENTITY_ATTEMPTS },
        },
        { claimedBy: req.user.id },
        { new: true },
    );
    if (!record) {
      return res.status(400).json({ message: 'That invite is invalid, expired or already used.' });
    }

    const member = await Registration.findById(req.user.id)
        .select('links resumeSlug name gender dateOfBirth oauthAccounts');
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    const mismatches = findIdentityMismatches({
      name: record.declaredName, dateOfBirth: record.declaredDateOfBirth, sex: record.declaredSex,
    }, member);
    if (mismatches.length) {
      const attemptsUsed = record.attempts + 1;
      const retry = attemptsUsed < MAX_IDENTITY_ATTEMPTS;
      console.warn(`Resume identity mismatch for member ${member._id}: ${mismatches.join(', ')}`);
      // Keep the invite so the member can fix the problem and check again, within a small limit.
      if (retry) {
        await ResumeInvite.updateOne({ _id: record._id }, { $inc: { attempts: 1 }, $unset: { claimedBy: 1 } });
      } else {
        await ResumeInvite.deleteOne({ _id: record._id });
      }
      return res.status(409).json({
        code: 'IDENTITY_MISMATCH',
        fields: mismatches,
        retry,
        attemptsLeft: MAX_IDENTITY_ATTEMPTS - attemptsUsed,
        message: 'Your resume details must match your verified Social Match profile and your Google or GitHub account.',
      });
    }

    const others = (member.links || []).filter(({ label }) => !isResumeLabel(label));
    member.links = [...others, {
      label: RESUME_LABEL,
      url: `${RESUME_ORIGIN}/r/${encodeURIComponent(record.slug)}`,
    }];
    member.resumeSlug = record.slug;
    member.resumeLinkedAt = new Date();
    member.resumeIdentityVerifiedAt = member.resumeLinkedAt;
    try {
      await member.save();
    } catch (error) {
      if (error.code === 11000) {
        await ResumeInvite.updateOne({ _id: record._id }, { $unset: { claimedBy: 1 } });
        return res.status(409).json({ message: 'That resume is already linked to another member.' });
      }
      throw error;
    }
    // The declared details have done their job; remove them with the invite.
    await ResumeInvite.deleteOne({ _id: record._id });
    return res.json({ message: 'Your resume was added to your profile.', memberId: member._id });
  } catch (error) {
    console.error('Failed to claim resume invite:', error.message);
    return res.status(500).json({ message: 'Unable to add the resume.' });
  }
});

export default router;
