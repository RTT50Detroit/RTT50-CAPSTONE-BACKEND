import jwt from 'jsonwebtoken';

const authenticate = (req, res, next) => {
  const bearerToken = req.header('Authorization')?.split(' ')[1];
  const cookieToken = req.headers.cookie?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('sm_session='))
      ?.slice('sm_session='.length);
  const token = bearerToken && bearerToken !== 'null' && bearerToken !== 'undefined'
    ? bearerToken
    : cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user payload to the request object
    next(); // Continue to the next handler
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication token expired.' });
    }

    console.error('Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

export default authenticate;

export const requireMaster = (req, res, next) => {
  if (String(req.user?.role || '').toLowerCase() !== 'master') {
    return res.status(403).json({ message: 'Master access is required.' });
  }

  next();
};