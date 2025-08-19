const db = require('../db/index');
const { sendDailyUpdate } = require('../neural/upload');

let subscriptions = new Map();

const subscribeUser = (userId) => {
    if (!subscriptions.has(userId)) {
        subscriptions.set(userId, true);
        return true;
    }
    return false;
};

const unsubscribeUser = (userId) => {
    if (subscriptions.has(userId)) {
        subscriptions.delete(userId);
        return true;
    }
    return false;
};

const isUserSubscribed = (userId) => {
    return subscriptions.has(userId);
};

const sendDailyMessages = async () => {
    for (const userId of subscriptions.keys()) {
        const userData = await db.getUserData(userId);
        if (userData) {
            const result = await sendDailyUpdate(userData);
            // Logic to send result back to user
            // e.g., bot.sendMessage(userId, result);
        }
    }
};

module.exports = {
    subscribeUser,
    unsubscribeUser,
    isUserSubscribed,
    sendDailyMessages,
};