const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

/**
 * Register a new user (no bank account created at registration).
 */
const register = async (req, res) => {
  const { user_id, first_name, last_name, email, password, phone } = req.body;

  try {
    const pool = getPool();

    // Check if user exists
    const userExist = await pool.query('SELECT id FROM users WHERE email = $1 OR user_id = $2', [email, user_id]);
    if (userExist.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user (no account number here)
    const newUser = await pool.query(
      'INSERT INTO users (user_id, first_name, last_name, email, password_hash, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, email, first_name, last_name, phone',
      [user_id, first_name, last_name, email, password_hash, phone]
    );

    res.status(201).json({
      success: true,
      data: newUser.rows[0],
    });
  } catch (error) {
    console.error('[Register]', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * Login and issue JWT.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'bms_super_secret_fallback_key', { expiresIn: '24h' });

    // Return basic profile; account info obtained via /api/accounts endpoints
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('[Login]', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

module.exports = { register, login };
