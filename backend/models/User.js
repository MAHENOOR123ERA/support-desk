const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    role: {
      type: String,
      enum: ['customer', 'agent', 'admin'],
      default: 'customer',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
