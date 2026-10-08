import { POLICY_VERSION } from '../config/policy.mjs';

// Claims placed in session tokens. Never trusted for authorization on the server;
// requireVerifiedMember checks the database instead.
export const createSessionPayload = (member) => ({
  id: member._id,
  name: member.name,
  email: member.email,
  role: member.role || 'member',
  ageVerified: Boolean(member.ageVerified) && member.policyVersion === POLICY_VERSION,
  policyVersion: member.policyVersion || null,
});
