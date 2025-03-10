const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  deviceName: { type: String, required: true },
  ip: { type: String, required: true },
  previousStatus: { type: String, enum: ['online', 'offline'], required: true },
  newStatus: { type: String, enum: ['online', 'offline'], required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);