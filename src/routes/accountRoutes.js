const express = require('express');
const { getBanks, addBank, createAccount, updateAccount, deleteAccount, getAllAccounts, getMyAccounts } = require('../controllers/accountController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank account management
 */

router.get('/banks', getBanks);
router.post('/banks', admin, addBank);
router.post('/', createAccount);
router.get('/', admin, getAllAccounts);
router.get('/my-accounts', getMyAccounts);

/**
 * @swagger
 * /api/accounts/{id}:
 *   put:
 *     summary: Update an account (User can update type, Admin can update all)
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
 *         description: Updated
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
 *         description: Deleted
 */
router.delete('/:id', admin, deleteAccount);

module.exports = router;
