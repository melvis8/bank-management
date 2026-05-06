const express = require('express');
const { getAllAccounts, getAccountById, createAccount, updateAccount, deleteAccount, getMyAccounts } = require('../controllers/accountController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank account management (Admin only for full list/deletion)
 */

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Get all accounts in the system (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accounts
 */
router.get('/', admin, getAllAccounts);

/**
 * @swagger
 * /api/accounts/my-accounts:
 *   get:
 *     summary: Get accounts for the currently logged-in user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's accounts
 */
router.get('/my-accounts', getMyAccounts);

/**
 * @swagger
 * /api/accounts/{id}:
 *   get:
 *     summary: Get account details by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account details
 */
router.get('/:id', getAccountById);

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Create a new bank account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bank_id]
 *             properties:
 *               bank_id: { type: string, format: uuid }
 *               user_id: { type: string, format: uuid, description: "Optional - Admin can specify a user ID" }
 *               account_type: { type: string, enum: [savings, current], default: savings }
 *               initial_balance: { type: number, default: 0 }
 *     responses:
 *       201:
 *         description: Account created successfully
 */
router.post('/', createAccount);

/**
 * @swagger
 * /api/accounts/{id}:
 *   put:
 *     summary: Update an account (Owner or Admin)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
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
 *               account_type: { type: string, enum: [savings, current] }
 *               status: { type: string, enum: [active, suspended] }
 *               balance: { type: number }
 *     responses:
 *       200:
 *         description: Account updated successfully
 */
router.put('/:id', updateAccount);

/**
 * @swagger
 * /api/accounts/{id}:
 *   delete:
 *     summary: Delete an account (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.delete('/:id', admin, deleteAccount);

module.exports = router;
