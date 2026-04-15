require('dotenv').config();
const { initializeDatabase, getPool } = require('./src/config/database');
const { initializeRedis } = require('./src/config/redis');

async function test() {
  console.log('Testing DB');
  try {
    await initializeDatabase();
    const pool = getPool();
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('DB connected. Server time:', res.rows[0].now);
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
