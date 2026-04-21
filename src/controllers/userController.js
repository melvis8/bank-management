const { getPool } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Public (or Admin)
 */
const addUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { user_id, first_name, last_name, email, phone, address, account_type, initial_deposit } = req.body;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user or email already exists
    const existing = await client.query('SELECT id FROM users WHERE user_id = $1 OR email = $2', [user_id, email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'User with this ID or Email already exists' });
    }

    // Generate account number
    const accountNumber = `ACC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertQuery = `
      INSERT INTO users (user_id, first_name, last_name, email, phone, address, account_type, account_number, balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      user_id, first_name, last_name, email, phone, address, account_type || 'savings', accountNumber, initial_deposit || 0
    ]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[User-Add]', error);
    res.status(500).json({ success: false, message: 'Server error during user creation' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Get all users with basic pagination
 * @route   GET /api/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      count: result.rowCount,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: result.rows
    });
  } catch (error) {
    console.error('[User-List]', error);
    res.status(500).json({ success: false, message: 'Error retrieving users' });
  }
};

/**
 * @desc    Get single user by UUID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[User-Details]', error);
    res.status(500).json({ success: false, message: 'Error retrieving user details' });
  }
};

/**
 * @desc    Update user information
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
const updateUser = async (req, res) => {
  const { first_name, last_name, phone, address, status, account_type } = req.body;
  const pool = getPool();

  try {
    const checkResult = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateQuery = `
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          status = COALESCE($5, status),
          account_type = COALESCE($6, account_type),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [first_name, last_name, phone, address, status, account_type, req.params.id]);

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[User-Update]', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res) => {
  const pool = getPool();
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: `User ${req.params.id} deleted successfully` });
  } catch (error) {
    console.error('[User-Delete]', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
};

module.exports = {
  addUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
