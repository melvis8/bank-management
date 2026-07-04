const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const {
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
  handleWebhook,
  refundPayment,
  registerWebhook,
  adminListPayments,
} = require('../controllers/camerpayController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Validation helpers ──────────────────────────────────────────────────────────

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints (powered by a secure payment gateway)
 */

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate a payment into your account
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_number
 *               - amount
 *             properties:
 *               account_number:
 *                 type: string
 *                 example: "BMS-ECOBANK-12345678"
 *               amount:
 *                 type: number
 *                 minimum: 100
 *                 example: 5000
 *               currency:
 *                 type: string
 *                 default: XAF
 *                 example: XAF
 *               description:
 *                 type: string
 *                 example: "Online payment"
 *               idempotency_key:
 *                 type: string
 *                 description: Unique key to prevent duplicate payments
 *                 example: "idemp-001"
 *     responses:
 *       200:
 *         description: Payment completed successfully
 *       400:
 *         description: Validation error or invalid account
 *       502:
 *         description: Payment gateway temporarily unavailable
 */
router.post(
  '/initiate',
  protect,
  [
    body('account_number').notEmpty().withMessage('Account number is required'),
    body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least 100 XAF'),
    body('currency').optional().isIn(['XAF', 'EUR', 'USD']).withMessage('Invalid currency'),
    body('description').optional().isString().isLength({ max: 500 }),
    body('idempotency_key').optional().isString().isLength({ max: 255 }),
  ],
  validate,
  initiatePayment
);

/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify a payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment reference returned from initiate
 *     responses:
 *       200:
 *         description: Payment status
 *       404:
 *         description: Payment not found
 */
router.get(
  '/verify/:reference',
  protect,
  [param('reference').notEmpty().withMessage('Reference is required')],
  validate,
  verifyPayment
);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get your payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get(
  '/history',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  getPaymentHistory
);

/**
 * @swagger
 * /api/payments/refund/{reference}:
 *   post:
 *     summary: Refund a completed payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund processed
 *       400:
 *         description: Payment not refundable
 */
router.post(
  '/refund/:reference',
  protect,
  [param('reference').notEmpty().withMessage('Payment reference is required')],
  validate,
  refundPayment
);

/**
 * @swagger
 * /api/payments/register-webhook:
 *   post:
 *     summary: Register our callback URL with the payment gateway
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callback_url
 *             properties:
 *               callback_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://myserver.com/api/payments/webhook"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["payment.completed", "payment.failed"]
 *     responses:
 *       200:
 *         description: Webhook registered successfully
 *       502:
 *         description: Gateway registration failed
 */
router.post(
  '/register-webhook',
  protect,
  admin,
  [
    body('callback_url').isURL().withMessage('Valid callback URL is required'),
    body('events').optional().isArray(),
  ],
  validate,
  registerWebhook
);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Webhook receiver for payment gateway callbacks
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 */
router.post('/webhook', handleWebhook);

/**
 * @swagger
 * /api/payments/admin:
 *   get:
 *     summary: Admin - List all payments across all users
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of all payments
 */
router.get('/admin', protect, admin, adminListPayments);

module.exports = router;
