const ping = require('ping');

const deviceStatusCache = new Map();

const checkDeviceStatus = async (ip) => {
  try {
    console.log(`Pinging IP: ${ip}`);
    const res = await ping.promise.probe(ip, {
      timeout: 2, // เวลาในการรอตอบกลับ 2 วินาที (สามารถปรับได้ตามความเหมาะสม)
    });
    console.log(`Ping result for ${ip}:`, {
      alive: res.alive,
      time: res.time,
      host: res.host,
    });

    const isOnline = res.alive; // ใช้ res.alive เป็นสถานะ

    // ตรวจสอบว่า res.alive เป็น boolean หรือไม่
    if (typeof isOnline !== 'boolean') {
      console.warn(`Invalid ping result for ${ip}, treating as offline`);
      deviceStatusCache.set(ip, {
        status: false,
        timestamp: Date.now(),
      });
      return false;
    }

    // อัปเดต cache
    deviceStatusCache.set(ip, {
      status: isOnline,
      timestamp: Date.now(),
    });

    return isOnline;
  } catch (error) {
    console.error(`Ping error for IP ${ip}:`, error);
    return false; // ถ้ามีข้อผิดพลาดถือว่าออฟไลน์
  }
};

module.exports = { checkDeviceStatus };