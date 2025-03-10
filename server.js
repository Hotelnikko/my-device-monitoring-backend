require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const notificationRoutes = require('./routes/notification');
const cors = require('cors');
const Device = require('./models/Device');
const Notification = require('./models/Notification');
const { checkDeviceStatus } = require('./utils/ping');
const initTelegramBot = require('./utils/telegram');
const { Server } = require('socket.io');

const app = express();
connectDB();

// อนุญาต CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://IPmonitor.vercel.app'],
  credentials: true,
}));

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// สร้าง Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id);

  const token = socket.handshake.query.token;
  console.log('Received token in Socket.IO:', token);

  if (!token) {
    socket.disconnect();
    return;
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    console.log('Decoded userId:', socket.userId);
  } catch (error) {
    console.error('Socket.IO token verification error:', error);
    socket.disconnect();
    return;
  }

  socket.on('disconnect', () => {
    console.log('Socket.IO client disconnected:', socket.id);
  });
});

// เริ่มต้น Telegram Bot
const telegramBot = initTelegramBot(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);

// เก็บสถานะล่าสุดของอุปกรณ์เพื่อป้องกันการแจ้งเตือนซ้ำ
const deviceStatusCache = new Map();

const checkAllDevices = async () => {
  try {
    const devices = await Device.find();
    for (const device of devices) {
      console.log(`Checking device: ${device.name} (${device.ip}), Current Status: ${device.status}`);
      const previousStatus = device.status;
      const isOnline = await checkDeviceStatus(device.ip);
      console.log(`Ping result for ${device.name}: isOnline = ${isOnline}, Type: ${typeof isOnline}`);

      if (typeof isOnline !== 'boolean') {
        console.error(`Invalid status for ${device.name} (${device.ip}), treating as offline`);
        isOnline = false;
      }

      const newStatus = isOnline ? 'online' : 'offline';

      // ตรวจสอบสถานะใน cache เพื่อป้องกันการแจ้งเตือนซ้ำ
      const cachedStatus = deviceStatusCache.get(device.ip) || previousStatus;
      if (cachedStatus !== newStatus) {
        console.log(`Status changed for ${device.name}: ${cachedStatus} -> ${newStatus}`);
        await Device.findByIdAndUpdate(device._id, {
          status: newStatus,
          lastChecked: new Date(),
        });

        // บันทึกการแจ้งเตือนใน MongoDB
        await Notification.create({
          userId: device.userId,
          deviceId: device._id,
          deviceName: device.name,
          ip: device.ip,
          previousStatus: cachedStatus,
          newStatus,
        });

        // ส่งข้อความแจ้งเตือนทุกครั้ง
        const message = `
          Device Status Update:
          - Name: ${device.name}
          - IP: ${device.ip}
          - Previous Status: ${cachedStatus}
          - New Status: ${newStatus}
          - Last Checked: ${new Date().toLocaleString()}
        `;
        
        try {
          await telegramBot.sendNotification(message);
          console.log('Telegram notification sent for device:', device.name);
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError.message, telegramError.stack);
        }

        // อัปเดต cache
        deviceStatusCache.set(device.ip, newStatus);

        // ส่งสถานะใหม่ผ่าน Socket.IO ไปยังทุก client
        io.emit('deviceStatusUpdate', {
          _id: device._id,
          name: device.name,
          ip: device.ip,
          status: newStatus,
          lastChecked: new Date().toISOString(),
        });
      } else {
        console.log(`No status change for ${device.name}, current status: ${newStatus}`);
      }
    }
  } catch (error) {
    console.error('Error checking devices:', error);
  }
};

// เริ่มตรวจสอบสถานะทุก 30 วินาที
setInterval(checkAllDevices, 30000); // 30 วินาที