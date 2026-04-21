const { getPool } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Generate a unique bank account number: BMS-YYYYMMDD-XXXXXX
 */
const generateAccountNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BMS-${date}-${random}`;
};

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Add a new student and create a bank account
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_id, first_name, last_name, email]
 *             properties:
 *               student_id:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               account_type:
 *                 type: string
 *               initial_deposit:
 *                 type: number
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Student or Email already exists
 *       500:
 *         description: Internal server error
 */
const addStudent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { student_id, first_name, last_name, email, phone, address, account_type, initial_deposit } = req.body;

  const client = await getPool().connect();
  try {
    const account_number = generateAccountNumber();
    const balance = initial_deposit || 0.0;

    const result = await client.query(
      `INSERT INTO students 
        (student_id, first_name, last_name, email, phone, address, account_type, account_number, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [student_id, first_name, last_name, email, phone || null, address || null, account_type || 'savings', account_number, balance]
    );

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A student with this ID or email address already exists',
        error: 'DUPLICATE_ENTRY',
      });
    }
    console.error('[StudentController] addStudent error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: 'INTERNAL_ERROR',
    });
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: List of all students
 */
const getAllStudents = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const client = await getPool().connect();
  try {
    const [countResult, studentsResult] = await Promise.all([
      client.query(`SELECT COUNT(*) FROM students`),
      client.query(`SELECT * FROM students ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: studentsResult.rows,
      pagination: { total, page, limit, totalPages },
    });
  } catch (err) {
    console.error('[StudentController] getAllStudents error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Get student by ID (UUID)
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student details
 *       404:
 *         description: Student not found
 */
const getStudentById = async (req, res) => {
  const { id } = req.params;
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM students WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[StudentController] getStudentById error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Update student details
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student updated successfully
 */
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone, address, status } = req.body;

  const client = await getPool().connect();
  try {
    const checkExistance = await client.query('SELECT id FROM students WHERE id = $1', [id]);
    if (checkExistance.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const result = await client.query(
      `UPDATE students 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name), 
           phone = COALESCE($3, phone), 
           address = COALESCE($4, address), 
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [first_name, last_name, phone, address, status, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('[StudentController] updateStudent error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Delete student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student deleted successfully
 */
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  const client = await getPool().connect();
  try {
    const result = await client.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    return res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('[StudentController] deleteStudent error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

module.exports = { addStudent, getAllStudents, getStudentById, updateStudent, deleteStudent };
