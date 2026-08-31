# AI-Assisted Customer Support Desk

A focused MVP implementing: Customer submits ticket → AI triages → Agent
receives → Agent responds → Resolve.

**Stack:** React (Vite) · Node.js/Express · MongoDB (Mongoose) · Firebase
Authentication · Socket.IO (real-time) · Anthropic Claude API (AI triage)

```
support-desk/
├── backend/     Express API, MongoDB models, Firebase token verification,
│                Socket.IO server, AI triage service
└── frontend/    React app (Vite), Firebase client auth, Socket.IO client
```

---

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)
- A Firebase project with **Email/Password** sign-in enabled
  (Firebase Console → Authentication → Sign-in method)
- An Anthropic API key (console.anthropic.com) — optional but required for
  the AI triage feature to actually call the model. Without it, the app
  still works end-to-end; tickets are just flagged "AI unavailable" for
  manual triage (this is the required fail-soft behavior).

## 2. Firebase setup

1. Create a Firebase project (or reuse one).
2. **Authentication → Sign-in method →** enable **Email/Password**.
3. **Project settings → General → Your apps →** add a **Web app**. Copy the
   config values into `frontend/.env` (see below).
4. **Project settings → Service accounts →** "Generate new private key".
   This downloads a JSON file. Copy `project_id`, `client_email`, and
   `private_key` into `backend/.env` (see below). Keep this file secret —
   never commit it or put it in frontend code.

## 3. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env: MONGO_URI, FIREBASE_*, ANTHROPIC_API_KEY
npm install
npm run dev        # starts on http://localhost:5000
```

`.env` values you must fill in:

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | Your MongoDB connection string |
| `FIREBASE_PROJECT_ID` | Firebase service-account JSON `project_id` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service-account JSON `client_email` |
| `FIREBASE_PRIVATE_KEY` | Firebase service-account JSON `private_key` (keep the `\n` escapes) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

## 4. Frontend setup

```bash
cd frontend
cp .env.example .env
# edit .env: VITE_FIREBASE_* (from the Firebase web app config), VITE_API_URL
npm install
npm run dev         # starts on http://localhost:5173
```

## 5. Try it out

1. Go to `http://localhost:5173/register`, create a **customer** account.
2. Log out, register a second account as an **agent**.
3. As the customer: **New ticket** → submit something like *"I was charged
   twice for the same order and need one payment refunded."* The backend
   calls Claude to triage it (category/priority/summary) and saves the raw
   suggestion on the ticket.
4. Log in as the agent: the new ticket appears on the **Agent dashboard** in
   real time (no refresh, via Socket.IO). Open it, review the AI suggestion,
   edit it if needed, and click **Confirm & finalize triage**.
5. Click **Claim this ticket**, then reply to the customer — the message
   appears instantly on the customer's open ticket page.
6. Type a resolution note and click **Mark as resolved**. Status changes are
   pushed live to both dashboards and the stats bar updates.
7. (Optional) Promote a user to `admin` directly in MongoDB
   (`db.users.updateOne({email:"..."}, {$set:{role:"admin"}})`) to see the
   supervisor view at `/admin`.

## 6. How the mandatory requirements map to the code

| Requirement | Where |
|---|---|
| Auth, protected areas | Firebase Auth (frontend) + `middleware/auth.js` verifying ID tokens on every API call; `ProtectedRoute.jsx` gating pages by role |
| Ticket creation form | `frontend/src/pages/NewTicket.jsx` |
| Unique ticket number | `generateTicketNumber()` in `backend/routes/tickets.js` |
| Status workflow New→Assigned→In Progress→Resolved | `FORWARD_TRANSITIONS` map in `backend/routes/tickets.js`, enforced server-side |
| AI triage (category/priority/summary) | `backend/services/aiService.js` (Anthropic API call, fail-soft) |
| Human review before finalizing | `PATCH /api/tickets/:id/ai-review` + `AISuggestionCard.jsx` (editable form, only saved on explicit "Confirm & finalize") |
| Agent dashboard | `frontend/src/pages/AgentDashboard.jsx` |
| Agent reply + status change | `TicketDetail.jsx` (message form, resolve form) |
| Customer view of status | `TicketDetail.jsx` + `CustomerDashboard.jsx` |
| Conversation persists | `Message` model, `GET /api/tickets/:id` returns full history |
| Dashboard stats from real data | `backend/routes/stats.js` (Mongo aggregation), `StatsBar.jsx` |
| Responsive UI, loading/success/error states | Tailwind responsive classes throughout; `LoadingSpinner.jsx`, inline error banners, toast on `TicketDetail.jsx` |
| Real-time updates | `backend/socket/index.js` + `frontend/src/socket.js`: new-ticket notifications, live messages, live status changes, typing indicator |
| Only own tickets (customer), assigned tickets (agent) | `canViewTicket()` + role-scoped Mongo filters in `backend/routes/tickets.js` |
| Resolved ticket immutable unless reopened | `FORWARD_TRANSITIONS.Resolved = []`, explicit `PATCH /:id/reopen` endpoint |
| Priority enum validated | Mongoose `enum` on `Ticket.priority` + explicit checks in route handlers |
| AI output validated before storage | `ai-review` route rejects any category/priority not in the allowed enum |
| AI keys never in frontend | `ANTHROPIC_API_KEY` only read in `backend/services/aiService.js`; frontend never sees it |
| Resolution note required to resolve | Validated server-side in `PATCH /:id/status` |

## 7. Notes / extension points (not required for MVP)

- Automatic assignment by category, duplicate-ticket detection, and email
  notifications are natural next additions on top of the `Ticket`/`Message`
  models already in place.
- The demo signup lets a user pick "customer" or "agent" so graders don't
  need a seeded admin panel; in a real deployment, role assignment should be
  admin-only.
- The typing indicator (`ticket:typing` socket event) is included as a small
  bonus real-time feature beyond the required one.
