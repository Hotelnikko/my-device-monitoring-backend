const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

// Middleware เพื่อตรวจสอบ Token
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { userId: req.user.id };
    if (status && status !== 'all') {
      query.newStatus = status;
    }
    const notifications = await Notification.find(query).sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ลบการแจ้งเตือนทั้งหมด
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ msg: 'Notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;