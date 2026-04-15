const { createClient } = require('redis');

let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => console.log('[Redis] Error', err.message));
  redisClient.on('connect', () => console.log('[Redis] Connected'));
}

const initializeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('[Redis] Failed to connect:', err.message);
    }
  } else {
    console.log('[Redis] No REDIS_URL provided. Skipping Redis.');
  }
};

module.exports = { redisClient, initializeRedis };
