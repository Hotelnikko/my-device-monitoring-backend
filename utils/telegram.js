const TelegramBot = require('node-telegram-bot-api');

const initTelegramBot = (token, chatId) => {
  const bot = new TelegramBot(token, { polling: false });

  const sendNotification = async (message) => {
    try {
      await bot.sendMessage(chatId, message);
    } catch (error) {
      throw new Error(`Telegram Bot error: ${error.message}`);
    }
  };

  return { sendNotification };
};

module.exports = initTelegramBot;