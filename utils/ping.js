const ping = require('ping');

const checkDeviceStatus = async (ip) => {
  try {
    const res = await ping.promise.probe(ip, { timeout: 10 });
    return res.alive;
  } catch (error) {
    console.error(`Error pinging ${ip}:`, error);
    return false;
  }
};

module.exports = { checkDeviceStatus };