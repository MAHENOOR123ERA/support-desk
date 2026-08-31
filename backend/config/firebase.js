require('dotenv').config();

const admin = require('firebase-admin');

// Initializes the Firebase Admin SDK once, using service-account credentials
// supplied via environment variables. This is used ONLY on the backend to
// verify ID tokens issued by the Firebase client SDK on the frontend.
if (!admin.apps.length) {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!process.env.FIREBASE_PROJECT_ID || !privateKey) {
    console.warn(
      '[Firebase] Admin credentials are not fully configured. ' +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

module.exports = admin;
