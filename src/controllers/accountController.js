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
  
  // If user_id is provided, only admin can set it to someone else
  let targetUserId = req.user.id;
  if (user_id && user_id !== req.user.id) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can create accounts for other users' });
    }
    targetUserId = user_id;
  }

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
 * @desc    Update an account (User can update type, Admin can update anything)
 * @route   PUT /api/accounts/:id
 * @access  Private
 */
const updateAccount = async (req, res) => {
  const { account_type, status, balance } = req.body;
  const pool = getPool();

  try {
    // 1. Check if account exists
    const checkRes = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [req.params.id]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const accountOwnerId = checkRes.rows[0].user_id;

    // 2. Permission check
    if (req.user.role !== 'admin' && accountOwnerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this account' });
    }

    // 3. Prepare fields
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        UPDATE accounts 
        SET account_type = COALESCE($1, account_type),
            status = COALESCE($2, status),
            balance = COALESCE($3, balance),
            updated_at = NOW()
        WHERE id = $4 RETURNING *`;
      params = [account_type, status, balance, req.params.id];
    } else {
      // User can only update type
      query = `
        UPDATE accounts 
        SET account_type = COALESCE($1, account_type),
            updated_at = NOW()
        WHERE id = $2 RETURNING *`;
      params = [account_type, req.params.id];
    }

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[UpdateAccount]', error);
    res.status(500).json({ success: false, message: 'Error updating account' });
  }
};

/**
 * @desc    Delete an account (Admin only)
 * @route   DELETE /api/accounts/:id
 * @access  Private (Admin)
 */
const deleteAccount = async (req, res) => {
  const pool = getPool();
  try {
    const result = await pool.query('DELETE FROM accounts WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('[DeleteAccount]', error);
    res.status(500).json({ success: false, message: 'Error deleting account' });
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

module.exports = { getBanks, addBank, createAccount, updateAccount, deleteAccount, getAllAccounts, getMyAccounts };
