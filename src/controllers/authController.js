const { getPool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET || 'bms_super_secret_fallback_key', {
    expiresIn: '30d',
  });
};

const register = async (req, res) => {
  const { first_name, last_name, email, password } = req.body;
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }

  const client = await getPool().connect();
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    const account_number = `BMS-${date}-${random}`;

    const result = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, account_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, account_number, balance`,
      [first_name, last_name, email, password_hash, account_number]
    );

    const user = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: generateToken(user.id, user.email),
      data: user,
    });
  } catch (err) {
    if (err.code === '23505') {
       return res.status(409).json({ success: false, message: 'Email already exists', error: 'DUPLICATE_EMAIL' });
    }
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
       return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'UNAUTHORIZED' });
    }

    const user = result.rows[0];
    
    if (!user.password_hash) {
       return res.status(401).json({ success: false, message: 'Account requires password reset', error: 'UNAUTHORIZED' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
       return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'UNAUTHORIZED' });
    }

    const userData = {
      id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, account_number: user.account_number, balance: user.balance
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: generateToken(user.id, user.email),
      data: userData,
    });
  } catch(err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

module.exports = { register, login };
