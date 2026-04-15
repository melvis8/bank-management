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
 * /api/users:
 *   post:
 *     summary: Add a new bank user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const addUser = async (req, res) => {
  // Validate incoming request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { first_name, last_name, email, phone, address, account_type, initial_deposit } = req.body;

  const client = await getPool().connect();
  try {
    const account_number = generateAccountNumber();
    const balance = initial_deposit || 0.0;

    const result = await client.query(
      `INSERT INTO users 
        (first_name, last_name, email, phone, address, account_type, account_number, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [first_name, last_name, email, phone || null, address || null, account_type || 'savings', account_number, balance]
    );

    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: result.rows[0],
    });
  } catch (err) {
    // PostgreSQL unique violation error code
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists',
        error: 'DUPLICATE_EMAIL',
      });
    }
    console.error('[UserController] addUser error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: 'INTERNAL_ERROR',
    });
  } finally {
    client.release(); // Always release connection back to pool
  }
};

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users in the system
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of users per page (max 100)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter users by status
 *       - in: query
 *         name: account_type
 *         schema:
 *           type: string
 *           enum: [savings, current, fixed_deposit]
 *         description: Filter users by account type
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const getAllUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { status, account_type } = req.query;

  // Build dynamic WHERE clause
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  if (account_type) {
    conditions.push(`account_type = $${idx++}`);
    values.push(account_type);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const client = await getPool().connect();
  try {
    // Run total count and paginated data in parallel for efficiency
    const [countResult, usersResult] = await Promise.all([
      client.query(`SELECT COUNT(*) FROM users ${whereClause}`, values),
      client.query(
        `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: usersResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    console.error('[UserController] getAllUsers error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: 'INTERNAL_ERROR',
    });
  } finally {
    client.release();
  }
};

module.exports = { addUser, getAllUsers };
