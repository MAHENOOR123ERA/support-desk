const express = require('express');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { triageTicket } = require('../services/aiService');
const { getIO } = require('../socket');

const router = express.Router();
router.use(requireAuth);

const { CATEGORIES, PRIORITIES, STATUSES } = Ticket;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function generateTicketNumber() {
  // TCK-YYYYMMDD-XXXX, unique via a small retry loop (fine for MVP scale).
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `TCK-${datePart}-${rand}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Ticket.exists({ ticketNumber: candidate });
    if (!exists) return candidate;
  }
  return `TCK-${datePart}-${Date.now()}`;
}

function canViewTicket(ticket, dbUser) {
  if (dbUser.role === 'admin') return true;
  if (dbUser.role === 'customer') return String(ticket.customer) === String(dbUser._id);
  if (dbUser.role === 'agent') {
    // Agents can view unassigned tickets (to claim them) and their own assigned ones.
    return !ticket.agent || String(ticket.agent) === String(dbUser._id);
  }
  return false;
}

// ---------------------------------------------------------------------------
// POST /api/tickets - customer creates a ticket. Triggers AI triage.
// ---------------------------------------------------------------------------
router.post('/', requireRole('customer', 'admin'), async (req, res) => {
  try {
    const { subject, description, category } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await Ticket.create({
      ticketNumber,
      subject: subject.trim(),
      description: description.trim(),
      category: CATEGORIES.includes(category) ? category : 'General',
      priority: 'Medium',
      status: 'New',
      customer: req.dbUser._id,
    });

    // Fire the initial customer message into the conversation history.
    await Message.create({
      ticket: ticket._id,
      sender: req.dbUser._id,
      senderRole: 'customer',
      text: description.trim(),
    });

    // Run AI triage. This never throws - it fails soft.
    const suggestion = await triageTicket({ subject: ticket.subject, description: ticket.description });
    ticket.aiSuggestion = suggestion;
    await ticket.save();

    // Notify all connected agents that a new ticket needs triage/claiming.
    try {
      getIO().to('agents').emit('ticket:new', { ticket });
    } catch (e) {
      /* socket not initialized in some test contexts - ignore */
    }

    res.status(201).json({ ticket });
  } catch (err) {
    console.error('[tickets] create error:', err);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets - list tickets scoped to the caller's role
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { status, priority, category, mine } = req.query;
    const filter = {};

    if (req.dbUser.role === 'customer') {
      filter.customer = req.dbUser._id;
    } else if (req.dbUser.role === 'agent') {
      if (mine === 'true') {
        filter.agent = req.dbUser._id;
      } else {
        // Default agent view: unassigned + tickets assigned to them
        filter.$or = [{ agent: null }, { agent: req.dbUser._id }];
      }
    }
    // admin: no scoping, sees everything

    if (status && STATUSES.includes(status)) filter.status = status;
    if (priority && PRIORITIES.includes(priority)) filter.priority = priority;
    if (category && CATEGORIES.includes(category)) filter.category = category;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'name email')
      .populate('agent', 'name email');

    res.json({ tickets });
  } catch (err) {
    console.error('[tickets] list error:', err);
    res.status(500).json({ message: 'Failed to load tickets' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:id - single ticket + conversation
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }
    const ticket = await Ticket.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('agent', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!canViewTicket(ticket, req.dbUser)) {
      return res.status(403).json({ message: 'You do not have access to this ticket' });
    }

    const messages = await Message.find({ ticket: ticket._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email role');

    res.json({ ticket, messages });
  } catch (err) {
    console.error('[tickets] get error:', err);
    res.status(500).json({ message: 'Failed to load ticket' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/assign - agent claims an unassigned ticket
// ---------------------------------------------------------------------------
router.patch('/:id/assign', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (ticket.agent && String(ticket.agent) !== String(req.dbUser._id)) {
      return res.status(409).json({ message: 'Ticket is already assigned to another agent' });
    }
    if (ticket.status === 'Resolved') {
      return res.status(400).json({ message: 'Cannot assign a resolved ticket. Reopen it first.' });
    }

    ticket.agent = req.dbUser.role === 'admin' && req.body.agentId ? req.body.agentId : req.dbUser._id;
    if (ticket.status === 'New') ticket.status = 'Assigned';
    await ticket.save();

    const populated = await ticket.populate([{ path: 'customer', select: 'name email' }, { path: 'agent', select: 'name email' }]);
    broadcastTicketUpdate(populated);
    res.json({ ticket: populated });
  } catch (err) {
    console.error('[tickets] assign error:', err);
    res.status(500).json({ message: 'Failed to assign ticket' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/ai-review - agent reviews/edits & finalizes AI suggestion
// This is the mandatory "human review before finalizing" step.
// ---------------------------------------------------------------------------
router.patch('/:id/ai-review', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (ticket.agent && String(ticket.agent) !== String(req.dbUser._id) && req.dbUser.role !== 'admin') {
      return res.status(403).json({ message: 'Only the assigned agent can finalize triage' });
    }

    const { category, priority, summary } = req.body;

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `category must be one of: ${CATEGORIES.join(', ')}` });
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `priority must be one of: ${PRIORITIES.join(', ')}` });
    }
    if (typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ message: 'summary is required' });
    }

    ticket.category = category;
    ticket.priority = priority;
    ticket.aiReviewed = true;
    ticket.reviewedBy = req.dbUser._id;
    // Keep the original AI suggestion for audit, but store the agent-finalized summary alongside it.
    ticket.aiSuggestion = {
      ...(ticket.aiSuggestion ? ticket.aiSuggestion.toObject() : {}),
      summary: summary.trim(),
    };

    await ticket.save();
    const populated = await ticket.populate([{ path: 'customer', select: 'name email' }, { path: 'agent', select: 'name email' }]);
    broadcastTicketUpdate(populated);
    res.json({ ticket: populated });
  } catch (err) {
    console.error('[tickets] ai-review error:', err);
    res.status(500).json({ message: 'Failed to save triage review' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/messages - customer or assigned agent adds a reply
// ---------------------------------------------------------------------------
router.post('/:id/messages', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!canViewTicket(ticket, req.dbUser)) {
      return res.status(403).json({ message: 'You do not have access to this ticket' });
    }
    if (ticket.status === 'Resolved') {
      return res.status(400).json({ message: 'This ticket is resolved. Reopen it to continue the conversation.' });
    }
    if (req.dbUser.role === 'agent' && !ticket.agent) {
      return res.status(400).json({ message: 'Claim this ticket before replying' });
    }
    if (req.dbUser.role === 'agent' && String(ticket.agent) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Only the assigned agent can reply to this ticket' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' });

    const message = await Message.create({
      ticket: ticket._id,
      sender: req.dbUser._id,
      senderRole: req.dbUser.role,
      text: text.trim(),
    });

    // First agent reply moves the ticket from Assigned -> In Progress.
    if (req.dbUser.role === 'agent' && ticket.status === 'Assigned') {
      ticket.status = 'In Progress';
      await ticket.save();
    }

    const populatedMessage = await message.populate('sender', 'name email role');
    const io = safeIO();
    if (io) {
      io.to(`ticket:${ticket._id}`).emit('message:new', { ticketId: String(ticket._id), message: populatedMessage });
      // Also notify the other party's personal room in case they aren't on the ticket page.
      const notifyUser = req.dbUser.role === 'customer' ? ticket.agent : ticket.customer;
      if (notifyUser) io.to(`user:${notifyUser}`).emit('notification', {
        type: 'new_message',
        ticketId: String(ticket._id),
        ticketNumber: ticket.ticketNumber,
      });
      if (ticket.status === 'In Progress') {
        io.to(`ticket:${ticket._id}`).emit('ticket:updated', { ticket });
      }
    }

    res.status(201).json({ message: populatedMessage, ticketStatus: ticket.status });
  } catch (err) {
    console.error('[tickets] message error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/status - update ticket status (workflow-enforced)
// ---------------------------------------------------------------------------
const FORWARD_TRANSITIONS = {
  New: ['Assigned'],
  Assigned: ['In Progress', 'Resolved'],
  'In Progress': ['Resolved'],
  Resolved: [], // resolved tickets can't move forward; must be reopened
};

router.patch('/:id/status', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.dbUser.role === 'agent' && String(ticket.agent) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Only the assigned agent can update this ticket' });
    }

    const { status, resolutionNote } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${STATUSES.join(', ')}` });
    }

    if (!FORWARD_TRANSITIONS[ticket.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot move ticket from "${ticket.status}" to "${status}" through the normal workflow`,
      });
    }

    if (status === 'Resolved') {
      if (!resolutionNote || !resolutionNote.trim()) {
        return res.status(400).json({ message: 'A resolution note is required to resolve a ticket' });
      }
      ticket.resolutionNote = resolutionNote.trim();
      ticket.resolvedAt = new Date();

      await Message.create({
        ticket: ticket._id,
        sender: req.dbUser._id,
        senderRole: req.dbUser.role,
        text: resolutionNote.trim(),
        isResolutionNote: true,
      });
    }

    ticket.status = status;
    await ticket.save();

    const populated = await ticket.populate([{ path: 'customer', select: 'name email' }, { path: 'agent', select: 'name email' }]);
    broadcastTicketUpdate(populated);
    res.json({ ticket: populated });
  } catch (err) {
    console.error('[tickets] status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/reopen - explicit escape hatch out of Resolved
// ---------------------------------------------------------------------------
router.patch('/:id/reopen', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.status !== 'Resolved') {
      return res.status(400).json({ message: 'Only resolved tickets can be reopened' });
    }

    ticket.status = 'In Progress';
    ticket.resolvedAt = null;
    ticket.reopenCount += 1;
    await ticket.save();

    await Message.create({
      ticket: ticket._id,
      sender: req.dbUser._id,
      senderRole: req.dbUser.role,
      text: 'Ticket reopened by agent.',
    });

    const populated = await ticket.populate([{ path: 'customer', select: 'name email' }, { path: 'agent', select: 'name email' }]);
    broadcastTicketUpdate(populated);
    res.json({ ticket: populated });
  } catch (err) {
    console.error('[tickets] reopen error:', err);
    res.status(500).json({ message: 'Failed to reopen ticket' });
  }
});

// ---------------------------------------------------------------------------
function safeIO() {
  try {
    return getIO();
  } catch (e) {
    return null;
  }
}

function broadcastTicketUpdate(ticket) {
  const io = safeIO();
  if (!io) return;
  io.to(`ticket:${ticket._id}`).emit('ticket:updated', { ticket });
  io.to('agents').emit('ticket:updated', { ticket });
  if (ticket.customer) io.to(`user:${ticket.customer._id || ticket.customer}`).emit('ticket:updated', { ticket });
}

module.exports = router;
