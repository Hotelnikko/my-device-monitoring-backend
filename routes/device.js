const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Device = require('../models/Device');

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

// ดึงอุปกรณ์ทั้งหมดของผู้ใช้
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.user.id });
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// เพิ่มอุปกรณ์ใหม่
router.post('/add', auth, async (req, res) => {
  try {
    const { name, ip } = req.body;
    const device = new Device({
      userId: req.user.id,
      name,
      ip,
      status: 'offline',
    });
    await device.save();
    res.json(device);
  } catch (error) {
    console.error('Error adding device:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ลบอุปกรณ์
router.delete('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ msg: 'Device not found' });
    if (device.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    await device.remove();
    res.json({ msg: 'Device removed' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;