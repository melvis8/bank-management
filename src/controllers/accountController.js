const { getPool } = require('../config/database');

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
    res.status(500).json({ success: false, message: 'Error fetching accounts' });
  }
};

/**
 * @desc    Get single account by ID
 * @route   GET /api/accounts/:id
 * @access  Private
 */
const getAccountById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.*, b.name as bank_name, u.email as user_email 
       FROM accounts a 
       JOIN banks b ON a.bank_id = b.id 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = $1`, 
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Account not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching account' });
  }
};

/**
 * @desc    Create a new account (Admin or Self)
 * @route   POST /api/accounts
 * @access  Private
 */
const createAccount = async (req, res) => {
  const { bank_id, account_type, user_id, initial_balance } = req.body;
  
  let targetUserId = req.user.id;
  if (user_id && user_id !== req.user.id) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can create accounts for others' });
    }
    targetUserId = user_id;
  }

  if (!bank_id) return res.status(400).json({ success: false, message: 'bank_id is required' });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Constraint check: One account per user per bank
    const check = await client.query('SELECT id FROM accounts WHERE user_id = $1 AND bank_id = $2', [targetUserId, bank_id]);
    if (check.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'User already has an account in this bank' });
    }

    const bankCheck = await client.query('SELECT code FROM banks WHERE id = $1', [bank_id]);
    if (bankCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }
    const bankCode = bankCheck.rows[0].code;

    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const accountNumber = `BMS-${bankCode}-${randomSuffix}`;

    const result = await client.query(
      `INSERT INTO accounts (user_id, bank_id, account_number, account_type, balance) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [targetUserId, bank_id, accountNumber, account_type || 'savings', initial_balance || 0]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Error creating account' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Update an account (Admin or Owner)
 * @route   PUT /api/accounts/:id
 * @access  Private
 */
const updateAccount = async (req, res) => {
  const { account_type, status, balance } = req.body;
  const pool = getPool();
  try {
    const check = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [req.params.id]);
    if (check.rowCount === 0) return res.status(404).json({ success: false, message: 'Account not found' });

    if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let query, params;
    if (req.user.role === 'admin') {
      query = `UPDATE accounts SET account_type = COALESCE($1, account_type), status = COALESCE($2, status), balance = COALESCE($3, balance), updated_at = NOW() WHERE id = $4 RETURNING *`;
      params = [account_type, status, balance, req.params.id];
    } else {
      query = `UPDATE accounts SET account_type = COALESCE($1, account_type), updated_at = NOW() WHERE id = $2 RETURNING *`;
      params = [account_type, req.params.id];
    }

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
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
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Account not found' });
    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting account' });
  }
};

/**
 * @desc    Get accounts for current user
 * @route   GET /api/accounts/my-accounts
 * @access  Private
 */
const getMyAccounts = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.*, b.name as bank_name, b.code as bank_code 
       FROM accounts a 
       JOIN banks b ON a.bank_id = b.id 
       WHERE a.user_id = $1`,
      [req.user.id]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching accounts' });
  }
};

module.exports = { getAllAccounts, getAccountById, createAccount, updateAccount, deleteAccount, getMyAccounts };
