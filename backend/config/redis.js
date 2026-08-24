const logger = require('./logger');

let client = null;
let redisAvailable = false;

const connectRedis = async () => {
  // Skip Redis if explicitly disabled
  if (process.env.REDIS_DISABLED === 'true') {
    logger.warn('⚠️  Redis disabled via REDIS_DISABLED=true. Caching/sessions will use in-memory fallback.');
    return null;
  }

  try {
    const { createClient } = require('redis');
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => {
      if (!redisAvailable) return; // suppress repeated errors after initial failure
      logger.warn('Redis connection error (non-fatal):', err.message);
    });
    client.on('connect', () => {
      redisAvailable = true;
      logger.info('✅ Redis connected');
    });
    // Set a short connect timeout so the server doesn't hang
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 3000)),
    ]);
    redisAvailable = true;
    return client;
  } catch (err) {
    logger.warn(`⚠️  Redis not available (${err.message}). Running without cache — this is OK for development.`);
    client = null;
    return null;
  }
};

const getRedis = () => {
  return client; // Returns null if Redis not connected — callers must handle null
};

module.exports = { connectRedis, getRedis };
