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

  // 1. Banks Table (includes mobile money operators)
  await client.query(`
    CREATE TABLE IF NOT EXISTS banks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'bank' CHECK (type IN ('bank', 'mobile_money')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 2. Users Table (Added role column)
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
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 3. Accounts Table — one account per user per bank
  await client.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
      account_number VARCHAR(20) UNIQUE NOT NULL,
      account_type VARCHAR(50) NOT NULL DEFAULT 'savings',
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_user_bank UNIQUE(user_id, bank_id)
    );
  `);

  // 4. Transactions Table
  await client.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_account_number VARCHAR(20),
      recipient_account_number VARCHAR(20),
      type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer')),
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      reference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed default banks and mobile money operators
  const defaultBanks = [
    ['ECOBANK Cameroun', 'ECOBANK', 'bank'],
    ['United Bank for Africa', 'UBA', 'bank'],
    ['Societe Generale Cameroun', 'SGC', 'bank'],
    ['EXPRESS UNION Finance', 'EU', 'bank'],
    ['MTN Mobile Money', 'MOMO', 'mobile_money'],
    ['Orange Money', 'OM', 'mobile_money'],
  ];

  for (const [name, code, type] of defaultBanks) {
    await client.query(
      'INSERT INTO banks (name, code, type) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
      [name, code, type]
    );
  }
};

const initializeDatabase = async () => {
  console.log('[DB] Connecting to PostgreSQL...');
  if (!pool) await createPool();

  try {
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
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    throw err;
  }
};

const getPool = () => {
  if (!pool) throw new Error('Database not initialized yet.');
  return pool;
};

module.exports = { getPool, initializeDatabase };
