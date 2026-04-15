require('dotenv').config();
const { pool } = require('./src/config/database');
const { initializeRedis } = require('./src/config/redis');

async function test() {
  console.log('Testing DB');
  try {
    const client = await pool.connect();
    console.log('DB connected');
    client.release();
  } catch(e) {
    console.error('DB Error: ', e.message);
  }

  console.log('Testing Redis');
  try {
    await initializeRedis();
    console.log('Redis connected or skipped');
  } catch (e) {
    console.error('Redis Error: ', e.message);
  }
}

test();
