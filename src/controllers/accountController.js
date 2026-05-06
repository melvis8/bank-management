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
 * @desc    Create a new account for the logged-in user in a specific bank
 * @route   POST /api/accounts
 * @access  Private
 */
const createAccount = async (req, res) => {
  const { bank_id, account_type } = req.body;
  const userId = req.user.id;

  if (!bank_id) {
    return res.status(400).json({ success: false, message: 'bank_id is required' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if bank exists
    const bankCheck = await client.query('SELECT code FROM banks WHERE id = $1', [bank_id]);
    if (bankCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }
    const bankCode = bankCheck.rows[0].code;

    // Check if user already has an account in this bank
    const accountCheck = await client.query('SELECT id FROM accounts WHERE user_id = $1 AND bank_id = $2', [userId, bank_id]);
    if (accountCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `You already have an account with ${bankCode}` });
    }

    // Generate a unique account number (e.g., BMS-UBA-12345678)
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const accountNumber = `BMS-${bankCode}-${randomSuffix}`;

    // Create account
    const result = await client.query(
      `INSERT INTO accounts (user_id, bank_id, account_number, account_type) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, bank_id, accountNumber, account_type || 'savings']
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Account created successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CreateAccount]', error);
    if (error.constraint === 'unique_user_bank') {
       return res.status(400).json({ success: false, message: 'You already have an account with this bank' });
    }
    res.status(500).json({ success: false, message: 'Server error creating account' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Get all accounts for the logged-in user
 * @route   GET /api/accounts/my-accounts
 * @access  Private
 */
const getMyAccounts = async (req, res) => {
  const userId = req.user.id;

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.id, a.account_number, a.account_type, a.balance, a.status, a.created_at, b.name as bank_name, b.code as bank_code 
       FROM accounts a 
       JOIN banks b ON a.bank_id = b.id 
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[GetMyAccounts]', error);
    res.status(500).json({ success: false, message: 'Server error fetching accounts' });
  }
};

module.exports = { getBanks, createAccount, getMyAccounts };
