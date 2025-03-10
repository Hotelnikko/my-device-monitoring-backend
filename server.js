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

// เชื่อมต่อกับ MongoDB
connectDB();

// อนุญาต CORS สำหรับ Vercel และเครื่องท้องถิ่น
app.use(cors({
  origin: ['http://localhost:3000', 'https://my-device-monitoring-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  credentials: true,
}));

// เพิ่มการจัดการคำขอ OPTIONS สำหรับทุก route
app.options('*', cors());

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// การจัดการข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Something went wrong!' });
});

// สร้าง Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://my-device-monitoring-frontend.vercel.app'],
    methods: ['GET', 'POST'],
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
      const cachedStatus = deviceStatusCache.get(device.ip) || previousStatus;

      if (cachedStatus !== newStatus) {
        console.log(`Status changed for ${device.name}: ${cachedStatus} -> ${newStatus}`);
        await Device.findByIdAndUpdate(device._id, {
          status: newStatus,
          lastChecked: new Date(),
        });

        await Notification.create({
          userId: device.userId,
          deviceId: device._id,
          deviceName: device.name,
          ip: device.ip,
          previousStatus: cachedStatus,
          newStatus,
        });

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

        deviceStatusCache.set(device.ip, newStatus);

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

setInterval(checkAllDevices, 30000);