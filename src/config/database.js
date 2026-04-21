const { Pool } = require('pg');
const dns = require('dns');
const { URL } = require('url');

/**
 * PostgreSQL Connection Pool — Neon-compatible
 */

let pool = null;

const createPool = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');

  const parsed = new URL(dbUrl);
  const hostname = parsed.hostname;
  const port = parseInt(parsed.port, 10) || 5432;
  const database = parsed.pathname.replace(/^\//, '');
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  let host = hostname;
  try {
    const addresses = await dns.promises.resolve4(hostname);
    if (addresses.length > 0) {
      host = addresses[0];
      console.log(`[DB] Resolved ${hostname} → ${host}`);
    }
  } catch {
    console.warn('[DB] DNS resolve4 failed, falling back to hostname');
  }

  pool = new Pool({
    host,
    port,
    user,
    password,
    database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: {
      rejectUnauthorized: false,
      servername: hostname,
    },
  });

  pool.on('connect', () => console.log('[DB] Client connected to pool'));
  pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

  return pool;
};

/**
 * Run all schema migrations
 */
const runMigrations = async (client) => {
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // Cleanup students table if it exists from previous iteration
  await client.query(`DROP TABLE IF EXISTS students CASCADE;`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(50) UNIQUE NOT NULL,
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

  // Ensure transactions table uses user_id
  await client.query(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='student_id') THEN
        ALTER TABLE transactions RENAME COLUMN student_id TO user_id;
      END IF;
    END $$;
  `);

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

const initializeDatabase = async () => {
  console.log('[DB] Connecting to PostgreSQL (direct TCP/SSL)...');
  if (!pool) await createPool();

  const client = await pool.connect();
  try {
    await runMigrations(client);
    console.log('[DB] Database initialized successfully ✅');
  } catch (err) {
    console.error('[DB] Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const getPool = () => {
  if (!pool) throw new Error('Database not initialized yet.');
  return pool;
};

module.exports = { getPool, initializeDatabase };
