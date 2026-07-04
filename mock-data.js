/**
 * ============================================================
 *  BMS API — Complete Mock Data Reference
 *  File: mock-data.js
 *
 *  Contains ready-to-use payloads for every route:
 *   • /api/auth/register  (POST)
 *   • /api/auth/login     (POST)
 *   • /api/users          (CRUD)
 *   • /api/accounts       (CRUD)
 *   • /api/banks          (CRUD)
 *   • /api/transactions   (deposit / withdraw / transfer / history)
 *
 *  Plain-text passwords (for easy copy-paste):
 *   Admin role  →  Admin@BMS2024!
 *   User role   →  User@BMS2024!
 *   Weak / edge →  see individual entries
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
// 1.  AUTH — REGISTER  POST /api/auth/register
//     Each entry can be sent as the request body directly.
// ─────────────────────────────────────────────────────────────
const registerPayloads = [
  // ── VALID REGISTRATIONS ──────────────────────────────────
  {
    label: "01 – Admin user (Melvis)",
    payload: {
      user_id: "admin_melvis",
      first_name: "Melvis",
      last_name: "Nguefack",
      email: "admin.melvis@bms.com",
      password: "Admin@BMS2024!",
      phone: "+237690000001",
      role: "admin",
    },
  },
  {
    label: "02 – Regular user (John Doe)",
    payload: {
      user_id: "jdoe_001",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@bms.com",
      password: "User@BMS2024!",
      phone: "+237699111001",
      role: "user",
    },
  },
  {
    label: "03 – Regular user (Alice Smith)",
    payload: {
      user_id: "asmith_002",
      first_name: "Alice",
      last_name: "Smith",
      email: "alice.smith@bms.com",
      password: "User@BMS2024!",
      phone: "+237699222002",
      role: "user",
    },
  },
  {
    label: "04 – Regular user (Bob Martin)",
    payload: {
      user_id: "bmartin_003",
      first_name: "Bob",
      last_name: "Martin",
      email: "bob.martin@bms.com",
      password: "User@BMS2024!",
      phone: "+237699333003",
      role: "user",
    },
  },
  {
    label: "05 – Regular user (Chloe Biya)",
    payload: {
      user_id: "cbiya_004",
      first_name: "Chloe",
      last_name: "Biya",
      email: "chloe.biya@bms.com",
      password: "User@BMS2024!",
      phone: "+237699444004",
      role: "user",
    },
  },
  {
    label: "06 – Regular user (David Kamga)",
    payload: {
      user_id: "dkamga_005",
      first_name: "David",
      last_name: "Kamga",
      email: "david.kamga@bms.com",
      password: "User@BMS2024!",
      phone: "+237699555005",
      role: "user",
    },
  },
  {
    label: "07 – Regular user (Eva Talla)",
    payload: {
      user_id: "etalla_006",
      first_name: "Eva",
      last_name: "Talla",
      email: "eva.talla@bms.com",
      password: "User@BMS2024!",
      phone: "+237699666006",
      role: "user",
    },
  },
  {
    label: "08 – Regular user (Frank Ndzie)",
    payload: {
      user_id: "fndzie_007",
      first_name: "Frank",
      last_name: "Ndzie",
      email: "frank.ndzie@bms.com",
      password: "User@BMS2024!",
      phone: "+237699777007",
      role: "user",
    },
  },
  {
    label: "09 – Regular user (Grace Fonyuy)",
    payload: {
      user_id: "gfonyuy_008",
      first_name: "Grace",
      last_name: "Fonyuy",
      email: "grace.fonyuy@bms.com",
      password: "User@BMS2024!",
      phone: "+237699888008",
      role: "user",
    },
  },
  {
    label: "10 – Regular user (Henri Assiga)",
    payload: {
      user_id: "hassiga_009",
      first_name: "Henri",
      last_name: "Assiga",
      email: "henri.assiga@bms.com",
      password: "User@BMS2024!",
      phone: "+237699999009",
      role: "user",
    },
  },

  // ── INVALID / EDGE-CASE REGISTRATIONS (for negative testing) ─
  {
    label: "11 – DUPLICATE email (should return 400)",
    payload: {
      user_id: "jdoe_dup",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@bms.com", // already registered above
      password: "User@BMS2024!",
      phone: "+237699111002",
      role: "user",
    },
  },
  {
    label: "12 – DUPLICATE user_id (should return 400)",
    payload: {
      user_id: "jdoe_001", // already registered above
      first_name: "Jonathan",
      last_name: "Doe",
      email: "jonathan.doe2@bms.com",
      password: "User@BMS2024!",
      phone: "+237699100100",
      role: "user",
    },
  },
  {
    label: "13 – MISSING required field — no email (should return 500/400)",
    payload: {
      user_id: "noemail_test",
      first_name: "NoEmail",
      last_name: "Test",
      password: "User@BMS2024!",
      phone: "+237600000099",
      role: "user",
    },
  },
  {
    label: "14 – MISSING password (should return 500/400)",
    payload: {
      user_id: "nopass_test",
      first_name: "NoPass",
      last_name: "Test",
      email: "nopass@bms.com",
      phone: "+237600000088",
      role: "user",
    },
  },
  {
    label: "15 – No role provided (defaults to 'user')",
    payload: {
      user_id: "norole_test",
      first_name: "NoRole",
      last_name: "Test",
      email: "norole@bms.com",
      password: "User@BMS2024!",
      phone: "+237600000077",
      // role omitted — should default to "user"
    },
  },
];

// ─────────────────────────────────────────────────────────────
// 2.  AUTH — LOGIN  POST /api/auth/login
// ─────────────────────────────────────────────────────────────
const loginPayloads = [
  // ── VALID LOGINS ─────────────────────────────────────────
  {
    label: "01 – Admin login",
    payload: { email: "admin.melvis@bms.com", password: "Admin@BMS2024!" },
  },
  {
    label: "02 – John Doe login",
    payload: { email: "john.doe@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "03 – Alice Smith login",
    payload: { email: "alice.smith@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "04 – Bob Martin login",
    payload: { email: "bob.martin@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "05 – Chloe Biya login",
    payload: { email: "chloe.biya@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "06 – David Kamga login",
    payload: { email: "david.kamga@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "07 – Eva Talla login",
    payload: { email: "eva.talla@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "08 – Frank Ndzie login",
    payload: { email: "frank.ndzie@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "09 – Grace Fonyuy login",
    payload: { email: "grace.fonyuy@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "10 – Henri Assiga login",
    payload: { email: "henri.assiga@bms.com", password: "User@BMS2024!" },
  },

  // ── INVALID LOGINS (negative tests) ──────────────────────
  {
    label: "11 – WRONG password (should return 401)",
    payload: { email: "john.doe@bms.com", password: "WrongPassword!" },
  },
  {
    label: "12 – NON-EXISTENT email (should return 401)",
    payload: { email: "ghost@bms.com", password: "User@BMS2024!" },
  },
  {
    label: "13 – Empty email (should return 401/400)",
    payload: { email: "", password: "User@BMS2024!" },
  },
  {
    label: "14 – Empty password (should return 401/400)",
    payload: { email: "john.doe@bms.com", password: "" },
  },
  {
    label: "15 – SQL injection attempt (should be safe)",
    payload: {
      email: "' OR '1'='1",
      password: "' OR '1'='1",
    },
  },
];

// ─────────────────────────────────────────────────────────────
// 3.  USERS — CRUD  /api/users  (Admin token required)
// ─────────────────────────────────────────────────────────────
const userPayloads = {
  // POST /api/users — Admin creates a user
  create: [
    {
      label: "Create user – Iris Fomban",
      payload: {
        user_id: "ifomban_010",
        first_name: "Iris",
        last_name: "Fomban",
        email: "iris.fomban@bms.com",
        password: "User@BMS2024!",
        phone: "+237699010010",
        role: "user",
      },
    },
    {
      label: "Create user – Jules Nkeng",
      payload: {
        user_id: "jnkeng_011",
        first_name: "Jules",
        last_name: "Nkeng",
        email: "jules.nkeng@bms.com",
        password: "User@BMS2024!",
        phone: "+237699011011",
        role: "user",
      },
    },
  ],
  // PUT /api/users/:id — Admin updates a user
  update: [
    {
      label: "Update user – change phone and address",
      payload: {
        phone: "+237699000999",
        address: "123 Rue de la Paix, Yaoundé, Cameroun",
      },
    },
    {
      label: "Update user – suspend account",
      payload: { status: "suspended" },
    },
    {
      label: "Update user – reactivate account",
      payload: { status: "active" },
    },
    {
      label: "Update user – promote to admin",
      payload: { role: "admin" },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 4.  BANKS  /api/banks  (GET = any auth, POST/PUT/DELETE = admin)
// ─────────────────────────────────────────────────────────────
const bankPayloads = {
  create: [
    {
      label: "Create bank – Afriland First Bank",
      payload: { name: "Afriland First Bank", code: "AFB", type: "bank" },
    },
    {
      label: "Create bank – CCA Bank",
      payload: { name: "CCA Bank", code: "CCAB", type: "bank" },
    },
    {
      label: "Create mobile money – Moov Money",
      payload: { name: "Moov Money", code: "MOOV", type: "mobile_money" },
    },
    {
      label: "Create bank – BICEC",
      payload: { name: "BICEC Cameroun", code: "BICEC", type: "bank" },
    },
    {
      label: "Create bank – SCB Cameroun",
      payload: { name: "SCB Cameroun", code: "SCB", type: "bank" },
    },
  ],
  update: [
    {
      label: "Update bank name",
      payload: { name: "Afriland First Bank (Updated)" },
    },
    {
      label: "Update bank type to mobile_money",
      payload: { type: "mobile_money" },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 5.  ACCOUNTS  /api/accounts  (token required)
//     bank_id must be a real UUID from GET /api/banks
//     Replace <BANK_UUID_*> with actual UUIDs after calling GET /api/banks
// ─────────────────────────────────────────────────────────────
const accountPayloads = {
  create: [
    {
      label: "Create savings account at ECOBANK",
      payload: {
        bank_id: "<BANK_UUID_ECOBANK>",
        account_type: "savings",
        initial_balance: 100000,
      },
    },
    {
      label: "Create current account at UBA",
      payload: {
        bank_id: "<BANK_UUID_UBA>",
        account_type: "current",
        initial_balance: 50000,
      },
    },
    {
      label: "Create savings account at SGC",
      payload: {
        bank_id: "<BANK_UUID_SGC>",
        account_type: "savings",
        initial_balance: 250000,
      },
    },
    {
      label: "Create MOMO account",
      payload: {
        bank_id: "<BANK_UUID_MOMO>",
        account_type: "current",
        initial_balance: 15000,
      },
    },
    {
      label: "Create Orange Money account",
      payload: {
        bank_id: "<BANK_UUID_OM>",
        account_type: "savings",
        initial_balance: 5000,
      },
    },
    {
      label: "Admin creates account for a specific user",
      payload: {
        bank_id: "<BANK_UUID_ECOBANK>",
        user_id: "<USER_UUID>", // admin only — provide actual user UUID
        account_type: "savings",
        initial_balance: 0,
      },
    },
  ],
  update: [
    {
      label: "Update account type to current",
      payload: { account_type: "current" },
    },
    {
      label: "Suspend account",
      payload: { status: "suspended" },
    },
    {
      label: "Reactivate account",
      payload: { status: "active" },
    },
    {
      label: "Admin adjusts balance (admin only)",
      payload: { balance: 500000 },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 6.  TRANSACTIONS  /api/transactions  (token required)
//     Replace <ACCOUNT_NUMBER_*> with real account numbers
//     from GET /api/accounts/my-accounts
// ─────────────────────────────────────────────────────────────
const transactionPayloads = {
  // POST /api/transactions/deposit
  deposit: [
    {
      label: "Deposit 10,000 XAF",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 10000 },
    },
    {
      label: "Deposit 50,000 XAF",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 50000 },
    },
    {
      label: "Deposit 200,000 XAF",
      payload: { account_number: "<ACCOUNT_NUMBER_2>", amount: 200000 },
    },
    {
      label: "Deposit 1,000 XAF (small amount)",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 1000 },
    },
    {
      label: "Deposit 0 XAF (should fail — amount must be > 0)",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 0 },
    },
  ],
  // POST /api/transactions/withdraw
  withdraw: [
    {
      label: "Withdraw 5,000 XAF (+ 2% fee = 100 XAF)",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 5000 },
    },
    {
      label: "Withdraw 100,000 XAF (+ 2% fee = 2,000 XAF)",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 100000 },
    },
    {
      label: "Withdraw 499,000 XAF (just under 500k limit)",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 499000 },
    },
    {
      label: "Withdraw 500,001 XAF (EXCEEDS 500k limit — should fail)",
      payload: { account_number: "<ACCOUNT_NUMBER_1>", amount: 500001 },
    },
    {
      label: "Withdraw more than balance (should fail)",
      payload: { account_number: "<ACCOUNT_NUMBER_2>", amount: 9999999 },
    },
  ],
  // POST /api/transactions/transfer
  transfer: [
    {
      label: "Transfer 20,000 XAF between own accounts",
      payload: {
        sender_account_number: "<ACCOUNT_NUMBER_1>",
        recipient_account_number: "<ACCOUNT_NUMBER_2>",
        amount: 20000,
      },
    },
    {
      label: "Transfer 5,000 XAF to another user's account",
      payload: {
        sender_account_number: "<ACCOUNT_NUMBER_1>",
        recipient_account_number: "<OTHER_USER_ACCOUNT_NUMBER>",
        amount: 5000,
      },
    },
    {
      label: "Transfer to non-existent account (should return 404)",
      payload: {
        sender_account_number: "<ACCOUNT_NUMBER_1>",
        recipient_account_number: "BMS-FAKE-00000000",
        amount: 1000,
      },
    },
    {
      label: "Transfer with insufficient funds (should fail)",
      payload: {
        sender_account_number: "<ACCOUNT_NUMBER_1>",
        recipient_account_number: "<ACCOUNT_NUMBER_2>",
        amount: 9999999,
      },
    },
    {
      label: "Transfer 1 XAF (minimum valid amount)",
      payload: {
        sender_account_number: "<ACCOUNT_NUMBER_1>",
        recipient_account_number: "<ACCOUNT_NUMBER_2>",
        amount: 1,
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 7.  SEEDER — Rich seed function (run: node mock-data.js seed)
//     Seeds all 10 users + accounts + transactions into the DB.
// ─────────────────────────────────────────────────────────────
if (process.argv[2] === 'seed') {
  const bcrypt = require('bcryptjs');
  const { initializeDatabase, getPool } = require('./src/config/database');
  require('dotenv').config();

  const richSeed = async () => {
    try {
      await initializeDatabase();
      const pool = getPool();
      console.log('\n🌱  Starting rich seed...\n');

      // ── Hash passwords ──────────────────────────────────
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('Admin@BMS2024!', salt);
      const userHash  = await bcrypt.hash('User@BMS2024!',  salt);

      // ── 10 Users ────────────────────────────────────────
      const users = [
        ['admin_melvis',  'Melvis',  'Nguefack', 'admin.melvis@bms.com',   adminHash, '+237690000001', 'admin'],
        ['jdoe_001',      'John',    'Doe',       'john.doe@bms.com',       userHash,  '+237699111001', 'user'],
        ['asmith_002',    'Alice',   'Smith',     'alice.smith@bms.com',    userHash,  '+237699222002', 'user'],
        ['bmartin_003',   'Bob',     'Martin',    'bob.martin@bms.com',     userHash,  '+237699333003', 'user'],
        ['cbiya_004',     'Chloe',   'Biya',      'chloe.biya@bms.com',     userHash,  '+237699444004', 'user'],
        ['dkamga_005',    'David',   'Kamga',     'david.kamga@bms.com',    userHash,  '+237699555005', 'user'],
        ['etalla_006',    'Eva',     'Talla',     'eva.talla@bms.com',      userHash,  '+237699666006', 'user'],
        ['fndzie_007',    'Frank',   'Ndzie',     'frank.ndzie@bms.com',    userHash,  '+237699777007', 'user'],
        ['gfonyuy_008',   'Grace',   'Fonyuy',    'grace.fonyuy@bms.com',   userHash,  '+237699888008', 'user'],
        ['hassiga_009',   'Henri',   'Assiga',    'henri.assiga@bms.com',   userHash,  '+237699999009', 'user'],
      ];

      const userIds = [];
      for (const u of users) {
        const r = await pool.query(
          `INSERT INTO users (user_id, first_name, last_name, email, password_hash, phone, role)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role
           RETURNING id, user_id, email`,
          u
        );
        userIds.push(r.rows[0].id);
        console.log(`  ✅  User: ${r.rows[0].email}`);
      }

      // ── Fetch banks ─────────────────────────────────────
      const banks = await pool.query('SELECT id, code FROM banks');
      const bk = {};
      banks.rows.forEach(b => (bk[b.code] = b.id));

      // ── Accounts (pair users 1-9 with banks, skip admin) ─
      const bankCodes = ['ECOBANK', 'UBA', 'SGC', 'MOMO', 'OM', 'EU'];
      const accTypes  = ['savings', 'current'];
      const accountNumbers = [];

      for (let i = 1; i < userIds.length; i++) {
        const bankCode = bankCodes[(i - 1) % bankCodes.length];
        const bankId   = bk[bankCode];
        if (!bankId) continue;

        const accType  = accTypes[i % 2];
        const accNum   = `BMS-${bankCode}-${String(10000 + i * 1111).padStart(8, '0')}`;
        const balance  = (i + 1) * 25000; // 50k, 75k, 100k …

        await pool.query(
          `INSERT INTO accounts (user_id, bank_id, account_number, account_type, balance)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (account_number) DO NOTHING`,
          [userIds[i], bankId, accNum, accType, balance]
        );
        accountNumbers.push(accNum);
        console.log(`  🏦  Account: ${accNum} (${accType}, ${balance} XAF) → user ${i}`);
      }

      // ── Transactions between first 2 accounts ───────────
      if (accountNumbers.length >= 2) {
        const [acc1, acc2] = accountNumbers;

        const txns = [
          { type: 'deposit',  sender: null, recipient: acc1, amount: 100000, fee: 0 },
          { type: 'deposit',  sender: null, recipient: acc2, amount: 50000,  fee: 0 },
          { type: 'withdraw', sender: acc1, recipient: null, amount: 10000,  fee: 200 },
          { type: 'withdraw', sender: acc2, recipient: null, amount: 5000,   fee: 100 },
          { type: 'transfer', sender: acc1, recipient: acc2, amount: 20000,  fee: 400 },
          { type: 'deposit',  sender: null, recipient: acc1, amount: 75000,  fee: 0 },
          { type: 'withdraw', sender: acc1, recipient: null, amount: 15000,  fee: 300 },
          { type: 'transfer', sender: acc2, recipient: acc1, amount: 8000,   fee: 160 },
          { type: 'deposit',  sender: null, recipient: acc2, amount: 30000,  fee: 0 },
          { type: 'transfer', sender: acc1, recipient: acc2, amount: 5000,   fee: 100 },
        ];

        for (const t of txns) {
          await pool.query(
            `INSERT INTO transactions (sender_account_number, recipient_account_number, type, amount, fee, status, reference)
             VALUES ($1,$2,$3,$4,$5,'completed',$6)`,
            [t.sender, t.recipient, t.type, t.amount, t.fee, `REF-SEED-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`]
          );
          console.log(`  💸  TX: ${t.type.toUpperCase()} ${t.amount} XAF`);
        }
      }

      console.log('\n✅  Rich seed completed!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑  Admin  →  admin.melvis@bms.com  /  Admin@BMS2024!');
      console.log('👤  Users  →  john.doe@bms.com      /  User@BMS2024!');
      console.log('           →  alice.smith@bms.com   /  User@BMS2024!');
      console.log('           →  (same password for all 9 regular users)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    } catch (err) {
      console.error('❌  Rich seed failed:', err);
      process.exit(1);
    }
  };

  richSeed();
} else {
  // ── Export for use in tests ────────────────────────────
  module.exports = {
    registerPayloads,
    loginPayloads,
    userPayloads,
    bankPayloads,
    accountPayloads,
    transactionPayloads,
  };
}
