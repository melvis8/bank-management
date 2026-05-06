const { getPool } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * @desc    Create a new user manually (Admin)
 * @route   POST /api/users
 * @access  Private (Admin)
 */
const addUser = async (req, res) => {
  const { user_id, first_name, last_name, email, password, phone, address, role } = req.body;

  if (!user_id || !first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const pool = getPool();
  try {
    const existing = await pool.query('SELECT id FROM users WHERE user_id = $1 OR email = $2', [user_id, email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'User ID or Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (user_id, first_name, last_name, email, password_hash, phone, address, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, email, first_name, last_name, role`,
      [user_id, first_name, last_name, email, password_hash, phone, address, role || 'user']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Admin-AddUser]', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
};

/**
 * @desc    Get all users (Admin)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT id, user_id, first_name, last_name, email, phone, role, status, created_at FROM users ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin-ListUsers]', error);
    res.status(500).json({ success: false, message: 'Error retrieving users' });
  }
};

/**
 * @desc    Get user by ID with accounts
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const pool = getPool();
    const userRes = await pool.query('SELECT id, user_id, first_name, last_name, email, phone, address, role, status, created_at FROM users WHERE id = $1', [req.params.id]);

    if (userRes.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const accountsRes = await pool.query(
      `SELECT a.*, b.name as bank_name FROM accounts a JOIN banks b ON a.bank_id = b.id WHERE a.user_id = $1`,
      [req.params.id]
    );

    res.status(200).json({ success: true, data: { ...userRes.rows[0], accounts: accountsRes.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving user details' });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
const updateUser = async (req, res) => {
  const { first_name, last_name, phone, address, status, role } = req.body;
  const pool = getPool();
  try {
    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           status = COALESCE($5, status),
           role = COALESCE($6, role),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [first_name, last_name, phone, address, status, role, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
};

/**
 * @desc    Delete user (Admin)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res) => {
  const pool = getPool();
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
};

/**
 * @desc    Delete ALL users (Admin) - EXTREME CAUTION
 * @route   DELETE /api/users
 * @access  Private (Admin)
 */
const deleteAllUsers = async (req, res) => {
  const pool = getPool();
  try {
    // Delete all users except the current admin
    const result = await pool.query('DELETE FROM users WHERE id != $1 RETURNING id', [req.user.id]);
    res.status(200).json({ success: true, message: `Deleted ${result.rowCount} users successfully. Admin account preserved.` });
  } catch (error) {
    console.error('[Admin-DeleteAll]', error);
    res.status(500).json({ success: false, message: 'Error deleting all users' });
  }
};

module.exports = { addUser, getAllUsers, getUserById, updateUser, deleteUser, deleteAllUsers };
