require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');

const connectDB = require('./config/db');
require('./config/firebase'); // initializes firebase-admin on import
const { initSocket } = require('./socket');

const usersRouter = require('./routes/users');
const ticketsRouter = require('./routes/tickets');
const statsRouter = require('./routes/stats');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/users', usersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/stats', statsRouter);

// 404 handler
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Central error handler (catches anything thrown synchronously in routes)
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
});
