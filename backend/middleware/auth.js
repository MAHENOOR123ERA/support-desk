const admin = require('../config/firebase');
const User = require('../models/User');

/**
 * Verifies the Firebase ID token sent in the Authorization header
 * ("Bearer <token>"), then loads (or lazily creates) the matching
 * local Mongo user record and attaches it to req.dbUser.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing authentication token' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;

    let dbUser = await User.findOne({ firebaseUid: decoded.uid });
    if (!dbUser) {
      // First time we see this Firebase user: create a local profile.
      dbUser = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
        role: 'customer',
      });
    }

    req.dbUser = dbUser;
    next();
  } catch (err) {
    console.error('[auth] token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}

module.exports = requireAuth;
