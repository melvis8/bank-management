const { Pool } = require('pg');
const dns = require('dns');
const { URL } = require('url');

/**
 * PostgreSQL Connection Pool — Neon-compatible
 *
 * On some networks / Node.js versions, DNS happy-eyeballs resolution causes
 * timeouts when connecting to Neon's multi-IP hostnames. This module resolves
 * the host to an IPv4 address first, then connects directly by IP while
 * passing the original hostname as the TLS SNI servername (required by Neon
 * to route to the correct project).
 *
 * This approach is reliable locally and on Render / Railway / etc.
 */

let pool = null;

/**
 * Parse DATABASE_URL and create a Pool that bypasses DNS issues.
 */
const createPool = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');

  const parsed = new URL(dbUrl);
  const hostname = parsed.hostname;
  const port = parseInt(parsed.port, 10) || 5432;
  const database = parsed.pathname.replace(/^\//, '');
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  // Resolve hostname to IPv4 to avoid Node.js happy-eyeballs timeouts
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
      servername: hostname,        // TLS SNI — Neon uses this to route to your project
    },
  });

  pool.on('connect', () => console.log('[DB] Client connected to pool'));
  pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

  return pool;
};

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
 * Initialize DB: create the pool (with DNS resolution), connect, run migrations.
 * Retries are handled by the caller (connectDBInBackground in index.js).
 */
const initializeDatabase = async () => {
  console.log('[DB] Connecting to PostgreSQL (direct TCP/SSL)...');
  if (!pool) await createPool();

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

/**
 * Lazy getter — modules that import `pool` will use this proxy.
 * The actual Pool is created in initializeDatabase().
 */
const getPool = () => {
  if (!pool) throw new Error('Database not initialized yet. Call initializeDatabase() first.');
  return pool;
};

module.exports = { getPool, initializeDatabase };
