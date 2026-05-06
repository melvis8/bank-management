const express = require('express');
const { getBanks, addBank, createAccount, getAllAccounts, getMyAccounts } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank account and bank system management
 */

/**
 * @swagger
 * /api/accounts/banks:
 *   get:
 *     summary: List all available banks/systems
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of banks
 */
router.get('/banks', getBanks);

/**
 * @swagger
 * /api/accounts/banks:
 *   post:
 *     summary: Add a new bank/system (Admin)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string, example: "Eco Bank" }
 *               code: { type: string, example: "ECO" }
 *               type: { type: string, enum: [bank, mobile_money] }
 *     responses:
 *       201:
 *         description: Bank added
 */
router.post('/banks', addBank);

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Open a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAccountRequest'
 *     responses:
 *       201:
 *         description: Account created
 */
router.post('/', createAccount);

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: List all accounts across all users (Admin)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accounts
 */
router.get('/', getAllAccounts);

/**
 * @swagger
 * /api/accounts/my-accounts:
 *   get:
 *     summary: List all accounts for the logged-in user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user accounts
 */
router.get('/my-accounts', getMyAccounts);

module.exports = router;
