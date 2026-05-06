const bcrypt = require('bcryptjs');
const { initializeDatabase, getPool } = require('./src/config/database');
require('dotenv').config();

const seed = async () => {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('🌱 Seeding data...');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash('Admin123', salt);
    const userPass = await bcrypt.hash('User123', salt);

    const users = [
      ['admin_melvis', 'Melvis', 'Admin', 'admin@bms.com', pass, '+237600000000', 'admin'],
      ['jdoe', 'John', 'Doe', 'john.doe@email.com', userPass, '+237699000111', 'user'],
      ['asmith', 'Alice', 'Smith', 'alice.smith@email.com', userPass, '+237677000222', 'user']
    ];

    const userIds = [];
    for (const u of users) {
      const res = await pool.query(
        'INSERT INTO users (user_id, first_name, last_name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role RETURNING id',
        u
      );
      userIds.push(res.rows[0].id);
    }

    // 2. Get Banks
    const banks = await pool.query('SELECT id, code FROM banks');
    const bankMap = {};
    banks.rows.forEach(b => bankMap[b.code] = b.id);

    // 3. Create Accounts
    const accounts = [
      [userIds[1], bankMap['ECOBANK'], 'BMS-ECOBANK-11112222', 'savings', 150000],
      [userIds[1], bankMap['MOMO'], 'BMS-MOMO-33334444', 'current', 25000],
      [userIds[2], bankMap['UBA'], 'BMS-UBA-55556666', 'savings', 500000],
      [userIds[2], bankMap['OM'], 'BMS-OM-77778888', 'current', 10000]
    ];

    for (const a of accounts) {
      await pool.query(
        'INSERT INTO accounts (user_id, bank_id, account_number, account_type, balance) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (account_number) DO NOTHING',
        a
      );
    }

    console.log('✅ Seeding completed! Admin login: admin@bms.com / Admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
