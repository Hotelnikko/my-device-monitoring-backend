const TelegramBot = require('node-telegram-bot-api');

const initTelegramBot = (token, chatId) => {
  console.log('Initializing Telegram Bot with Token:', token, 'Chat ID:', chatId);
  const bot = new TelegramBot(token, { polling: false });

  return {
    sendNotification: async (message) => {
      try {
        console.log('Sending Telegram message:', message);
        await bot.sendMessage(chatId, message);
        console.log('Telegram notification sent successfully:', message);
      } catch (error) {
        console.error('Telegram notification error:', error.message, error.stack);
        throw new Error(`Failed to send Telegram notification: ${error.message}`);
      }
    },
  };
};

module.exports = initTelegramBot;