import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Registration from '../models/registration.mjs';

const router = express.Router();
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';
const cookieName = 'sm_session';
const stateCookie = 'sm_oauth_state';
const stateMaxAge = 10 * 60 * 1000;

const providers = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    profile: async (tokens) => {
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!response.ok) throw new Error('Google profile request failed.');
      const profile = await response.json();
      return {
        subject: profile.sub,
        email: profile.email,
        emailVerified: profile.email_verified === true,
        name: profile.name,
      };
    },
  },
  github: {
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    profile: async (tokens) => {
      const headers = {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
      };
      const profileResponse = await fetch('https://api.github.com/user', { headers });
      const emailResponse = await fetch('https://api.github.com/user/emails', { headers });
      if (!profileResponse.ok || !emailResponse.ok) {
        throw new Error('GitHub profile request failed.');
      }
      const profile = await profileResponse.json();
      const emails = await emailResponse.json();
      const verified = emails.find((email) => email.verified && email.primary) ||
        emails.find((email) => email.verified);
      return {
        subject: String(profile.id),
        email: verified?.email,
        emailVerified: Boolean(verified),
        name: profile.name || profile.login,
      };
    },
  },
};

const getCallbackUrl = (provider) => (
  process.env[`${provider.toUpperCase()}_CALLBACK_URL`] ||
  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/${provider}/callback`
);

const parseCookies = (header = '') => Object.fromEntries(
    header.split(';').map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [];
      try {
        return [
          decodeURIComponent(part.slice(0, separator).trim()),
          decodeURIComponent(part.slice(separator + 1).trim()),
        ];
      } catch {
        return [];
      }
    }).filter(([key, value]) => key && value),
);

const setCookie = (res, name, value, maxAge) => {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProduction) attributes.push('Secure');
  res.append('Set-Cookie', attributes.join('; '));
};

const clearCookie = (res, name) => setCookie(res, name, '', 0);

const createSessionToken = (member) => jwt.sign({
  id: member._id,
  name: member.name,
  email: member.email,
  role: member.role || 'member',
}, process.env.JWT_SECRET, { expiresIn: '1h' });

const issueSession = (res, member) => {
  setCookie(res, cookieName, createSessionToken(member), 60 * 60 * 1000);
};

const enabledProvider = (provider) => Boolean(
    providers[provider]?.clientId() && providers[provider]?.clientSecret());

const randomUrlSafe = () => crypto.randomBytes(32).toString('base64url');
const signOAuthState = (state, verifier, provider) => crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${state}.${verifier}.${provider}`)
    .digest('base64url');

router.get('/providers', (req, res) => {
  res.json({
    providers: Object.keys(providers).filter(enabledProvider),
  });
});

router.get('/:provider', (req, res) => {
  const { provider } = req.params;
  const config = providers[provider];
  if (!config || !enabledProvider(provider)) {
    return res.status(404).json({ message: 'This sign-in provider is not configured.' });
  }

  const state = randomUrlSafe();
  const verifier = randomUrlSafe();
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  setCookie(res, stateCookie, JSON.stringify({
    state,
    verifier,
    provider,
    signature: signOAuthState(state, verifier, provider),
  }), stateMaxAge);

  const params = new URLSearchParams({
    client_id: config.clientId(),
    redirect_uri: getCallbackUrl(provider),
    response_type: 'code',
    scope: config.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return res.redirect(`${config.authorize}?${params}`);
});

router.get('/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const config = providers[provider];
  const saved = parseCookies(req.headers.cookie)[stateCookie];

  try {
    if (!config || !enabledProvider(provider) || !saved || req.query.error) {
      throw new Error('OAuth authorization was not completed.');
    }
    const stateData = JSON.parse(saved);
    const expectedSignature = signOAuthState(
        stateData.state, stateData.verifier, stateData.provider);
    const validSignature = stateData.signature &&
      crypto.timingSafeEqual(
          Buffer.from(stateData.signature),
          Buffer.from(expectedSignature),
      );
    if (!validSignature || stateData.provider !== provider ||
        stateData.state !== req.query.state || !req.query.code) {
      throw new Error('OAuth state validation failed.');
    }

    const tokenParams = new URLSearchParams({
      client_id: config.clientId(),
      client_secret: config.clientSecret(),
      code: req.query.code,
      redirect_uri: getCallbackUrl(provider),
      grant_type: 'authorization_code',
      code_verifier: stateData.verifier,
    });
    const tokenResponse = await fetch(config.token, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });
    if (!tokenResponse.ok) throw new Error('OAuth token exchange failed.');
    const tokens = await tokenResponse.json();
    const profile = await config.profile(tokens);

    if (!profile.email || !profile.emailVerified) {
      throw new Error('A verified email address is required for social sign-in.');
    }

    let member = await Registration.findOne({
      $or: [
        { email: profile.email.toLowerCase() },
        { oauthAccounts: { $elemMatch: { provider, subject: profile.subject } } },
      ],
    });
    if (!member) {
      member = await Registration.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email.toLowerCase(),
        emailVerified: true,
        password: await bcrypt.hash(randomUrlSafe(), 12),
        age: 18,
        gender: 'prefer-not-to-say',
        oauthAccounts: [{ provider, subject: profile.subject, email: profile.email }],
      });
    } else if (!member.oauthAccounts.some((account) => (
      account.provider === provider && account.subject === profile.subject
    ))) {
      member.oauthAccounts.push({ provider, subject: profile.subject, email: profile.email });
      member.emailVerified = true;
      await member.save();
    }

    await Registration.findByIdAndUpdate(member._id, {
      isOnline: true,
      lastSeen: new Date(),
    });
    issueSession(res, member);
    clearCookie(res, stateCookie);
    return res.redirect(`${frontendUrl}/auth/callback`);
  } catch (error) {
    clearCookie(res, stateCookie);
    console.error(`OAuth ${provider} callback failed:`, error.message);
    return res.redirect(`${frontendUrl}/login?oauthError=${encodeURIComponent(
        'Social sign-in could not be completed.')}`);
  }
});

router.get('/session/current', async (req, res) => {
  const token = parseCookies(req.headers.cookie)[cookieName];
  if (!token) return res.status(401).json({ message: 'No active session.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user: payload });
  } catch {
    clearCookie(res, cookieName);
    return res.status(401).json({ message: 'Session expired.' });
  }
});

router.post('/session/logout', async (req, res) => {
  clearCookie(res, cookieName);
  return res.status(204).send();
});

export default router;
