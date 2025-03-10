const express = require('express');
const Device = require('../models/Device');
const auth = require('../middleware/auth');
const router = express.Router();

// Middleware ตรวจสอบ Token
router.use(auth);

// Get all devices with real-time status
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.user.id }); // หรือ req.user.userId
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add device
router.post('/add', async (req, res) => {
  const { name, ip } = req.body;
  try {
    const device = new Device({ name, ip, userId: req.user.id });
    await device.save();
    res.json(device);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete device
router.delete('/:id', async (req, res) => {
  await Device.findByIdAndDelete(req.params.id);
  res.json({ msg: 'Device deleted' });
});

module.exports = router;