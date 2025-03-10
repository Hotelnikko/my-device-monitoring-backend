const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// Middleware ตรวจสอบ Token
router.use(auth);

// ดึงประวัติการแจ้งเตือนทั้งหมดของผู้ใช้
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ดึงประวัติการแจ้งเตือนตามสถานะ (online/offline)
router.get('/filter', async (req, res) => {
  const { status } = req.query;
  try {
    const query = { userId: req.user.id };
    if (status) query.newStatus = status;
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    console.error('Error filtering notifications:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ลบประวัติการแจ้งเตือนทั้งหมดของผู้ใช้
router.delete('/', async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ msg: 'Notifications cleared successfully' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;