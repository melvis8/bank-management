const express = require('express');
const { deposit, withdraw, transfer } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Money movement endpoints
 */

/**
 * @swagger
 * /api/transactions/deposit:
 *   post:
 *     summary: Deposit money to your account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100.00
 *     responses:
 *       200:
 *         description: Deposit successful
 *       401:
 *         description: Unauthorized
 */
router.post('/deposit', deposit);

/**
 * @swagger
 * /api/transactions/withdraw:
 *   post:
 *     summary: Withdraw money from your account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100.00
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *       400:
 *         description: Insufficient funds
 */
router.post('/withdraw', withdraw);

/**
 * @swagger
 * /api/transactions/transfer:
 *   post:
 *     summary: Transfer money to another account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, recipient_account_number]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100.00
 *               recipient_account_number:
 *                 type: string
 *                 example: BMS-20240115-482910
 *     responses:
 *       200:
 *         description: Transfer successful
 *       400:
 *         description: Insufficient funds or invalid identical account
 *       404:
 *         description: Recipient not found
 */
router.post('/transfer', transfer);

module.exports = router;
