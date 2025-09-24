const amqp = require("amqplib");
const { sendFCMNotification } = require("../utils/sendFCMNotification");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = 'recharge-queue';

let connection = null;
let channel = null;

const initializeProducer = async () => {
    try {
        if (!connection) {
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });
            
            console.log('Producer connected to RabbitMQ');
            
            // Handle connection events
            connection.on('error', (err) => {
                console.error('Producer connection error:', err);
                connection = null;
                channel = null;
            });
            
            connection.on('close', () => {
                console.log('Producer connection closed');
                connection = null;
                channel = null;
            });
        }
    } catch (error) {
        console.error('Failed to initialize producer:', error);
        connection = null;
        channel = null;
        throw error;
    }
};

exports.publishToQueue = async (data) => {
    try {
        if (!connection || !channel) {
            await initializeProducer();
        }
        
        const success = channel.sendToQueue(
            QUEUE_NAME, 
            Buffer.from(JSON.stringify(data)), 
            { persistent: true }
        );
        
        if (!success) {
            console.warn('Message could not be sent, channel write buffer is full');
        }
        
        return success;
    } catch (error) {
        console.error('Error publishing to queue:', error);
        // Reset connection on error
        connection = null;
        channel = null;
        throw error;
    }
};

exports.closeProducer = async () => {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('Producer closed gracefully');
    } catch (error) {
        console.error('Error closing producer:', error);
    }
};