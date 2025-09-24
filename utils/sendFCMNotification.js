const User = require('../models/User');
const { sendToTokens } = require('./notificationService');

exports.sendFCMNotification = async (userId, title, body) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            throw new Error('User not found or FCM token missing');
        }
        await sendToTokens(user.fcmTokens, title, body);
        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};
        