const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true, unique: true },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastChecked: { type: Date, default: Date.now },
  latency: { type: Number, default: -1 }, // เพิ่มฟิลด์ latency (ค่าเริ่มต้น -1 ถ้าไม่มีข้อมูล)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('Device', deviceSchema);