const express = require('express');
const { deposit, withdraw, transfer, getTransactionHistory } = require('../controllers/transactionController');
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
 *     summary: Deposit money into an account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       200:
 *         description: Deposit successful
 *       400:
 *         description: Invalid amount or account
 */
router.post('/deposit', deposit);

/**
 * @swagger
 * /api/transactions/withdraw:
 *   post:
 *     summary: Withdraw money from an account (max 500k, 2% fee)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *       400:
 *         description: Insufficient funds or limit exceeded
 */
router.post('/withdraw', withdraw);

/**
 * @swagger
 * /api/transactions/transfer:
 *   post:
 *     summary: Transfer money between accounts
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *     responses:
 *       200:
 *         description: Transfer successful
 *       404:
 *         description: Recipient account not found
 */
router.post('/transfer', transfer);

/**
 * @swagger
 * /api/transactions/history/{account_number}:
 *   get:
 *     summary: Get transaction history for an account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: account_number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/history/:account_number', getTransactionHistory);

module.exports = router;
