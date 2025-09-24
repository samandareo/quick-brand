const amqp = require("amqplib");
const { sendFCMNotification } = require("../utils/sendFCMNotification");
const Recharge = require("../models/Recharge");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const CONSUME_QUEUE_NAME = 'recharge-response-queue';

let connection = null;
let channel = null;
let isConsuming = false;

const initializeConsumer = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(CONSUME_QUEUE_NAME, { durable: true });
        
        // Set prefetch to handle one message at a time
        await channel.prefetch(1);
        
        console.log('Consumer connected to RabbitMQ');
        
        // Handle connection events
        connection.on('error', (err) => {
            console.error('Consumer connection error:', err);
            isConsuming = false;
            connection = null;
            channel = null;
        });
        
        connection.on('close', () => {
            console.log('Consumer connection closed');
            isConsuming = false;
            connection = null;
            channel = null;
        });
        
        return true;
    } catch (error) {
        console.error('Failed to initialize consumer:', error);
        connection = null;
        channel = null;
        throw error;
    }
};

const startConsuming = async () => {
    try {
        if (!connection || !channel) {
            await initializeConsumer();
        }
        
        if (isConsuming) {
            console.log('Consumer is already running');
            return;
        }
        
        isConsuming = true;
        console.log('Starting to consume messages...');
        
        await channel.consume(CONSUME_QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const messageContent = JSON.parse(msg.content.toString());
                    console.log('Processing recharge response:', messageContent);
                    
                    // Update recharge status in database
                    if (messageContent.rechargeId) {
                        await Recharge.findByIdAndUpdate(
                            messageContent.rechargeId,
                            { 
                                status: messageContent.status,
                                description: `Recharge ${messageContent.status} - ${messageContent.message || ''}`
                            }
                        );
                    }
                    
                    // Send FCM notification
                    const notification = {
                        userId: messageContent.userId,
                        title: "Recharge Status",
                        body: `Your recharge of amount ${messageContent.amount} was ${messageContent.status}.`
                    };
                    
                    await sendFCMNotification(
                        notification.userId, 
                        notification.title, 
                        notification.body
                    );
                    
                    // Acknowledge message
                    channel.ack(msg);
                    console.log('Message processed and acknowledged');
                    
                } catch (error) {
                    console.error('Error processing message:', error);
                    // Reject message and requeue
                    channel.nack(msg, false, true);
                }
            }
        });
        
    } catch (error) {
        console.error('Error starting consumer:', error);
        isConsuming = false;
        throw error;
    }
};

const stopConsuming = async () => {
    try {
        isConsuming = false;
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('Consumer stopped gracefully');
    } catch (error) {
        console.error('Error stopping consumer:', error);
    }
};

// Auto-restart consumer if connection is lost
const autoRestart = async () => {
    if (!isConsuming && process.env.NODE_ENV !== 'test') {
        console.log('Attempting to restart consumer...');
        try {
            await startConsuming();
        } catch (error) {
            console.error('Failed to restart consumer, retrying in 5 seconds...');
            setTimeout(autoRestart, 5000);
        }
    }
};

// Monitor connection and restart if needed
setInterval(() => {
    if (!connection && !isConsuming) {
        autoRestart();
    }
}, 10000);

module.exports = {
    startConsuming,
    stopConsuming,
    initializeConsumer
};