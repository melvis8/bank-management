const { getPool } = require('../config/database');

/**
 * @desc    Get all banks
 * @route   GET /api/banks
 * @access  Private
 */
const getAllBanks = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM banks ORDER BY name ASC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching banks' });
  }
};

/**
 * @desc    Get bank by ID
 * @route   GET /api/banks/:id
 * @access  Private
 */
const getBankById = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM banks WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Bank not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching bank' });
  }
};

/**
 * @desc    Create a new bank (Admin)
 * @route   POST /api/banks
 * @access  Private (Admin)
 */
const createBank = async (req, res) => {
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
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Bank code already exists' });
    res.status(500).json({ success: false, message: 'Error creating bank' });
  }
};

/**
 * @desc    Update a bank (Admin)
 * @route   PUT /api/banks/:id
 * @access  Private (Admin)
 */
const updateBank = async (req, res) => {
  const { name, code, type } = req.body;
  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE banks 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           type = COALESCE($3, type)
       WHERE id = $4 RETURNING *`,
      [name, code, type, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Bank not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating bank' });
  }
};

/**
 * @desc    Delete a bank (Admin)
 * @route   DELETE /api/banks/:id
 * @access  Private (Admin)
 */
const deleteBank = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('DELETE FROM banks WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Bank not found' });
    res.status(200).json({ success: true, message: 'Bank deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting bank. Check if it has active accounts.' });
  }
};

module.exports = { getAllBanks, getBankById, createBank, updateBank, deleteBank };
