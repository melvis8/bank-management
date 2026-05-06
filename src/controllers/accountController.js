const { getPool } = require('../config/database');

/**
 * @desc    Get all banks available in the system
 * @route   GET /api/accounts/banks
 * @access  Private
 */
const getBanks = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM banks ORDER BY name ASC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[GetBanks]', error);
    res.status(500).json({ success: false, message: 'Server error fetching banks' });
  }
};

/**
 * @desc    Add a new bank (Admin)
 * @route   POST /api/accounts/banks
 * @access  Private (Admin)
 */
const addBank = async (req, res) => {
  const { name, code, type } = req.body;
  if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code required' });

  try {
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO banks (name, code, type) VALUES ($1, $2, $3) RETURNING *',
      [name, code, type || 'bank']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[AddBank]', error);
    res.status(500).json({ success: false, message: 'Error adding bank' });
  }
};

/**
 * @desc    Create a new account for a user in a specific bank
 * @route   POST /api/accounts
 * @access  Private
 */
const createAccount = async (req, res) => {
  const { bank_id, account_type, user_id } = req.body;
  const targetUserId = user_id || req.user.id; // Allow admin to create for others

  if (!bank_id) {
    return res.status(400).json({ success: false, message: 'bank_id is required' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bankCheck = await client.query('SELECT code FROM banks WHERE id = $1', [bank_id]);
    if (bankCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }
    const bankCode = bankCheck.rows[0].code;

    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const accountNumber = `BMS-${bankCode}-${randomSuffix}`;

    const result = await client.query(
      `INSERT INTO accounts (user_id, bank_id, account_number, account_type) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [targetUserId, bank_id, accountNumber, account_type || 'savings']
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Account created successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.constraint === 'unique_user_bank') {
       return res.status(400).json({ success: false, message: 'User already has an account with this bank' });
    }
    res.status(500).json({ success: false, message: 'Server error creating account' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Get all accounts (Admin)
 * @route   GET /api/accounts
 * @access  Private (Admin)
 */
const getAllAccounts = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.*, b.name as bank_name, u.email as user_email 
       FROM accounts a 
       JOIN banks b ON a.bank_id = b.id 
       JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[GetAllAccounts]', error);
    res.status(500).json({ success: false, message: 'Error fetching accounts' });
  }
};

/**
 * @desc    Get accounts for current user
 * @route   GET /api/accounts/my-accounts
 * @access  Private
 */
const getMyAccounts = async (req, res) => {
  const userId = req.user.id;
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.*, b.name as bank_name, b.code as bank_code 
       FROM accounts a 
       JOIN banks b ON a.bank_id = b.id 
       WHERE a.user_id = $1`,
      [userId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching your accounts' });
  }
};

module.exports = { getBanks, addBank, createAccount, getAllAccounts, getMyAccounts };
