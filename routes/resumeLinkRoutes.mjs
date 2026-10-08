import crypto from 'crypto';
import express from 'express';
import authenticate from '../middleware/authentication.mjs';
import { requireAdultMember } from '../middleware/requireVerifiedMember.mjs';
import ResumeInvite from '../models/resumeInvite.mjs';
import Registration from '../models/registration.mjs';
import { isResumeLabel } from '../utils/resumeLink.mjs';

// The Relationship Resume is the front door. After a person publishes a resume there, its
// server asks for an invite here (shared secret). The person then joins, and the resume link
// is only added to their profile once they are signed in and pass the age and policy checks.
const router = express.Router();

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const RESUME_ORIGIN = 'https://therelationshipresume.netlify.app';
const RESUME_LABEL = 'The Relationship Resume';
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
  try {
    const invite = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
    await ResumeInvite.create({ inviteHash: hashInvite(invite), slug, expiresAt });
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
        { inviteHash: hashInvite(invite), claimedBy: { $exists: false }, expiresAt: { $gt: new Date() } },
        { claimedBy: req.user.id },
        { new: true },
    );
    if (!record) {
      return res.status(400).json({ message: 'That invite is invalid, expired or already used.' });
    }

    const member = await Registration.findById(req.user.id).select('links resumeSlug');
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }
    const others = (member.links || []).filter(({ label }) => !isResumeLabel(label));
    member.links = [...others, {
      label: RESUME_LABEL,
      url: `${RESUME_ORIGIN}/r/${encodeURIComponent(record.slug)}`,
    }];
    member.resumeSlug = record.slug;
    member.resumeLinkedAt = new Date();
    await member.save();
    return res.json({ message: 'Your resume was added to your profile.', memberId: member._id });
  } catch (error) {
    console.error('Failed to claim resume invite:', error.message);
    return res.status(500).json({ message: 'Unable to add the resume.' });
  }
});

export default router;
