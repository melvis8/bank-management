const { Pool } = require('pg');

/**
 * PostgreSQL Connection Pool
 *
 * Uses the standard `pg` driver with SSL for direct TCP connections to Neon.
 * This is the recommended approach for long-running Node.js servers (Express,
 * Render, Railway, etc.) — faster and more reliable than the WebSocket-based
 * @neondatabase/serverless driver which is designed for edge/serverless runtimes.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,   // Neon uses valid certs, but this avoids
  },                              // CA-chain issues on dev machines
});

pool.on('connect', () => console.log('[DB] Client connected to pool'));
pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

/**
 * Run all schema migrations (create tables if they do not exist)
 */
const runMigrations = async (client) => {
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      phone VARCHAR(20),
      address TEXT,
      account_type VARCHAR(50) NOT NULL DEFAULT 'savings',
      account_number VARCHAR(20) UNIQUE,
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer')),
      amount NUMERIC(15, 2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      reference TEXT,
      recipient_account_number VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/**
 * Initialize DB with retry logic.
 * Retries are handled by the caller (connectDBInBackground in index.js).
 */
const initializeDatabase = async () => {
  console.log('[DB] Connecting to PostgreSQL (direct TCP/SSL)...');
  const client = await pool.connect();
  try {
    await runMigrations(client);
    console.log('[DB] Database initialized successfully ✅');
  } catch (err) {
    const msg = err.message || err.code || JSON.stringify(err);
    console.error('[DB] Migration failed:', msg);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initializeDatabase };
