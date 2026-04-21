const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const register = async (req, res) => {
  const { user_id, first_name, last_name, email, password, phone } = req.body;

  try {
    const pool = getPool();
    
    // Check if user exists
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1 OR user_id = $2', [email, user_id]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate account number
    const account_number = `ACC-${Date.now()}`;

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (user_id, first_name, last_name, email, password_hash, phone, account_number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, first_name, last_name, email, password_hash, phone, account_number]
    );

    res.status(201).json({
      success: true,
      data: {
        id: newUser.rows[0].id,
        user_id: newUser.rows[0].user_id,
        email: newUser.rows[0].email,
        account_number: newUser.rows[0].account_number
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'bms_super_secret_fallback_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_number: user.account_number,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login };
