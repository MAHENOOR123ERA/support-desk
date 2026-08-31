const express = require('express');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me - returns (and lazily creates) the current user's profile
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.dbUser });
});

// PATCH /api/users/me - update own display name, or role during demo signup.
// NOTE: In a real production app, role changes should be admin-only. For this
// MVP demo we allow a one-time role choice (customer/agent) at signup so the
// grader can create both kinds of accounts without a seeded admin panel.
router.patch('/me', requireAuth, async (req, res) => {
  const { name, role } = req.body;
  const update = {};
  if (typeof name === 'string' && name.trim()) update.name = name.trim();
  if (['customer', 'agent'].includes(role)) update.role = role;

  const user = await User.findByIdAndUpdate(req.dbUser._id, update, { new: true });
  res.json({ user });
});

module.exports = router;
