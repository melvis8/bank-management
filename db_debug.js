require('dotenv').config();
const { getPool, initializeDatabase } = require('./src/config/database');

async function run() {
  await initializeDatabase();
  const pool = getPool();
  try {
    const accts = await pool.query('SELECT * FROM accounts ORDER BY updated_at DESC LIMIT 5');
    console.log('--- LATEST ACCOUNTS ---');
    console.table(accts.rows);

    const txs = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10');
    console.log('--- LATEST TXS ---');
    console.table(txs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
