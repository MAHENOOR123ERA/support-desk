const express = require('express');
const Ticket = require('../models/Ticket');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// GET /api/stats - basic dashboard statistics, scoped by role.
// Agents/admins see desk-wide numbers; customers see stats for their own tickets.
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = req.dbUser.role === 'customer' ? { customer: req.dbUser._id } : {};

    const [byStatus, byPriority, byCategory, total, resolvedTickets] = await Promise.all([
      Ticket.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: filter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Ticket.countDocuments(filter),
      Ticket.find({ ...filter, status: 'Resolved', resolvedAt: { $ne: null } }).select('createdAt resolvedAt'),
    ]);

    const avgResolutionMs =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => sum + (t.resolvedAt - t.createdAt), 0) / resolvedTickets.length
        : 0;

    const toMap = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

    res.json({
      total,
      byStatus: toMap(byStatus),
      byPriority: toMap(byPriority),
      byCategory: toMap(byCategory),
      avgResolutionHours: Math.round((avgResolutionMs / 1000 / 60 / 60) * 10) / 10,
      resolvedCount: resolvedTickets.length,
    });
  } catch (err) {
    console.error('[stats] error:', err);
    res.status(500).json({ message: 'Failed to load statistics' });
  }
});

module.exports = router;
