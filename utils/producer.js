const amqp = require("amqplib");
require("dotenv").config();


const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'recharge-queue';

exports.publishToQueue = async (data) => {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), { persistent: true });

    setTimeout(() => {
        channel.close();
        connection.close();
    }, 500);
}