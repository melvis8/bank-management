const { getPool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET || 'bms_super_secret_fallback_key', {
    expiresIn: '30d',
  });
};

const register = async (req, res) => {
  const { student_id, first_name, last_name, email, password } = req.body;
  if (!student_id || !first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Veuillez fournir tous les champs requis (matricule, prénom, nom, email, mot de passe)' });
  }

  const client = await getPool().connect();
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    const account_number = `BMS-${date}-${random}`;

    const result = await client.query(
      `INSERT INTO students (student_id, first_name, last_name, email, password_hash, account_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, student_id, first_name, last_name, email, account_number, balance`,
      [student_id, first_name, last_name, email, password_hash, account_number]
    );

    const student = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Compte étudiant créé avec succès',
      token: generateToken(student.id, student.email),
      data: student,
    });
  } catch (err) {
    if (err.code === '23505') {
       return res.status(409).json({ success: false, message: 'Le matricule ou l\'email existe déjà', error: 'DUPLICATE_ENTRY' });
    }
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Veuillez fournir l\'email et le mot de passe' });
  }

  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM students WHERE email = $1', [email]);
    if (result.rows.length === 0) {
       return res.status(401).json({ success: false, message: 'Identifiants invalides', error: 'UNAUTHORIZED' });
    }

    const student = result.rows[0];
    
    if (!student.password_hash) {
       return res.status(401).json({ success: false, message: 'Le compte nécessite une réinitialisation de mot de passe', error: 'UNAUTHORIZED' });
    }

    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
       return res.status(401).json({ success: false, message: 'Identifiants invalides', error: 'UNAUTHORIZED' });
    }

    const studentData = {
      id: student.id, 
      student_id: student.student_id,
      email: student.email, 
      first_name: student.first_name, 
      last_name: student.last_name, 
      account_number: student.account_number, 
      balance: student.balance
    };

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token: generateToken(student.id, student.email),
      data: studentData,
    });
  } catch(err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

module.exports = { register, login };
