const axios = require('axios');
const { CATEGORIES, PRIORITIES } = require('../models/Ticket');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Calls the Anthropic API to triage a support ticket into a structured
 * suggestion: { category, priority, summary }. Designed to fail soft:
 * on any error or timeout it returns { failed: true, error } instead of
 * throwing, so ticket creation always succeeds and agents can triage
 * manually if AI is unavailable.
 */
async function triageTicket({ subject, description }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 8000);

  if (!apiKey) {
    return {
      category: null,
      priority: null,
      summary: null,
      raw: null,
      failed: true,
      error: 'AI is not configured (missing ANTHROPIC_API_KEY). Please triage manually.',
      generatedAt: new Date(),
    };
  }

  const systemPrompt =
    'You are a support-ticket triage assistant. Read the customer subject and description ' +
    'and respond with ONLY a compact JSON object, no prose, no markdown fences, in this exact shape: ' +
    `{"category": one of ${JSON.stringify(CATEGORIES)}, "priority": one of ${JSON.stringify(PRIORITIES)}, ` +
    '"summary": a single short sentence (max 20 words) summarizing the issue for an agent}. ' +
    'Base priority on urgency/business impact (e.g. billing/payment/security issues affecting money => High).';

  const userPrompt = `Subject: ${subject}\n\nDescription: ${description}`;

  try {
    const response = await axios.post(
      ANTHROPIC_URL,
      {
        model,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: timeoutMs,
      }
    );

    const textBlock = (response.data.content || []).find((b) => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return {
        category: null,
        priority: null,
        summary: null,
        raw,
        failed: true,
        error: 'AI response could not be parsed. Please triage manually.',
        generatedAt: new Date(),
      };
    }

    const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'General';
    const priority = PRIORITIES.includes(parsed.priority) ? parsed.priority : 'Medium';
    const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : '';

    return {
      category,
      priority,
      summary,
      raw: cleaned,
      failed: false,
      error: null,
      generatedAt: new Date(),
    };
  } catch (err) {
    const reason =
      err.code === 'ECONNABORTED'
        ? 'AI request timed out'
        : err.response
        ? `AI service error (${err.response.status})`
        : 'AI service unreachable';
    console.error('[aiService] triage failed:', reason, err.message);
    return {
      category: null,
      priority: null,
      summary: null,
      raw: null,
      failed: true,
      error: `${reason}. You can still triage this ticket manually.`,
      generatedAt: new Date(),
    };
  }
}

module.exports = { triageTicket };
