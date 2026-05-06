const express = require('express');
const { getAllBanks, getBankById, createBank, updateBank, deleteBank } = require('../controllers/bankController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Banks
 *   description: Financial system management (Admin only for modifications)
 */

/**
 * @swagger
 * /api/banks:
 *   get:
 *     summary: Get all supported banks and mobile money operators
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of banks retrieved successfully
 */
router.get('/', getAllBanks);

/**
 * @swagger
 * /api/banks/{id}:
 *   get:
 *     summary: Get bank details by ID
 *     tags: [Banks]
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
 *         description: Bank details
 *       404:
 *         description: Bank not found
 */
router.get('/:id', getBankById);

/**
 * @swagger
 * /api/banks:
 *   post:
 *     summary: Create a new bank or financial system (Admin only)
 *     tags: [Banks]
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
 *               code: { type: string, example: "ECOBANK" }
 *               type: { type: string, enum: [bank, mobile_money], default: bank }
 *     responses:
 *       201:
 *         description: Bank created successfully
 */
router.post('/', admin, createBank);

/**
 * @swagger
 * /api/banks/{id}:
 *   put:
 *     summary: Update bank details (Admin only)
 *     tags: [Banks]
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
 *               name: { type: string }
 *               code: { type: string }
 *               type: { type: string, enum: [bank, mobile_money] }
 *     responses:
 *       200:
 *         description: Bank updated successfully
 */
router.put('/:id', admin, updateBank);

/**
 * @swagger
 * /api/banks/{id}:
 *   delete:
 *     summary: Delete a bank (Admin only)
 *     tags: [Banks]
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
 *         description: Bank deleted successfully
 */
router.delete('/:id', admin, deleteBank);

module.exports = router;
