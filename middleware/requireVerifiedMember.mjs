import Registration from '../models/registration.mjs';
import { POLICY_VERSION } from '../config/policy.mjs';
import { getIneligibilityReason, removeIneligibleMember } from '../utils/eligibility.mjs';

// Blocks access until the member has passed the 21+ age check and accepted the current
// policies. Checks the database on every request so a stale token cannot bypass it.
const requireVerifiedMember = async (req, res, next) => {
  try {
    const member = await Registration.findById(req.user?.id)
        .select('email oauthAccounts role dateOfBirth age ageVerified gender policyVersion').lean();

    if (!member) {
      return res.status(401).json({ message: 'Member account not found.' });
    }
    if (member.role === 'master') return next();

    const reason = getIneligibilityReason(member);
    if (reason) {
      await removeIneligibleMember(member, reason);
      return res.status(403).json({
        code: 'UNDERAGE',
        message: 'This account has been removed because it does not meet our age requirement.',
      });
    }

    if (!member.ageVerified || member.policyVersion !== POLICY_VERSION) {
      return res.status(403).json({
        code: 'AGE_VERIFICATION_REQUIRED',
        message: 'Age verification and policy acceptance are required.',
      });
    }

    return next();
  } catch (error) {
    console.error('Age verification check failed:', error.message);
    return res.status(500).json({ message: 'Unable to verify member status.' });
  }
};

export default requireVerifiedMember;
