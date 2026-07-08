const crypto = require('crypto');
const { getPool } = require('../config/database');
const { camerpayService } = require('../services/camerpayService');

const MIN_PAYMENT = 100;
const MAX_PAYMENT = 5000000;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getAccountWithLock = async (client, accountNumber) => {
  const res = await client.query(
    `SELECT a.*, b.name AS bank_name, b.code AS bank_code
     FROM accounts a
     JOIN banks b ON a.bank_id = b.id
     WHERE a.account_number = $1 FOR UPDATE`,
    [accountNumber]
  );
  return res.rows[0] || null;
};

const generateReference = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PAY-${ts}-${rand}`;
};

// ─── Payment Initiation ─────────────────────────────────────────────────────────

const initiatePayment = async (req, res) => {
  const { account_number, amount, currency, description, idempotency_key, phone } = req.body;
  let { method } = req.body;
  const userId = req.user.id;

  // Map user-friendly methods to CamerPay API methods
  if (method) {
    method = method.toLowerCase();
    if (method === 'momo' || method === 'mtn') method = 'mtn_momo';
    if (method === 'om') method = 'orange_money';
  }

  if (!account_number) {
    return res.status(400).json({
      success: false, message: 'Account number is required', error: 'MISSING_ACCOUNT_NUMBER',
    });
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount < MIN_PAYMENT) {
    return res.status(400).json({
      success: false, message: `Payment amount must be at least ${MIN_PAYMENT} XAF`, error: 'AMOUNT_TOO_LOW',
    });
  }

  if (parsedAmount > MAX_PAYMENT) {
    return res.status(400).json({
      success: false, message: `Payment amount cannot exceed ${MAX_PAYMENT.toLocaleString()} XAF`, error: 'AMOUNT_EXCEEDS_LIMIT',
    });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Idempotency check
    if (idempotency_key) {
      const existing = await client.query(
        'SELECT id, status FROM camerpay_payments WHERE idempotency_key = $1',
        [idempotency_key]
      );
      if (existing.rowCount > 0) {
        const payment = existing.rows[0];
        if (payment.status === 'completed') {
          await client.query('COMMIT');
          return res.status(200).json({
            success: true,
            message: 'Payment completed successfully',
            data: { payment_id: payment.id },
          });
        }
      }
    }

    const account = await getAccountWithLock(client, account_number);
    if (!account) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found', error: 'ACCOUNT_NOT_FOUND' });
    }

    if (account.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'This account does not belong to you', error: 'FORBIDDEN' });
    }

    if (account.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Account is not active', error: 'ACCOUNT_INACTIVE' });
    }

    const reference = generateReference();

    // Use this app's own base URL for the CamerPay callback (webhook for payment notifications)
    const baseUrl = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/api/payments/webhook`;
    // Return URL: where the customer's browser is sent after completing payment
    const frontendUrl = (process.env.FRONTEND_URL || process.env.API_BASE_URL || 'https://bank-management-mz1n.onrender.com').replace(/\/+$/, '');
    const returnUrl = `${frontendUrl}/payments`;

    // Call CamerPay API to process payment
    let camerpayResponse;
    try {
      camerpayResponse = await camerpayService.createPayment({
        amount: parsedAmount,
        currency: currency || 'XAF',
        description: description || 'Mobile payment',
        reference,
        callbackUrl,
        returnUrl,
        method,
        phone,
      });
    } catch (cpErr) {
      await client.query('ROLLBACK');
      console.error('[CamerPay] API call failed:', cpErr.message, cpErr.payload);
      return res.status(502).json({
        success: false,
        message: 'Payment service temporarily unavailable',
        error: 'PAYMENT_GATEWAY_ERROR',
        gateway_message: cpErr.message,
        gateway_details: cpErr.payload
      });
    }

    const camerpayReference = camerpayResponse?.reference || camerpayResponse?.id || reference;

    // Insert into camerpay_payments (internal tracking — NEVER exposed)
    const cpInsert = await client.query(
      `INSERT INTO camerpay_payments
         (account_number, user_id, reference, camerpay_reference, amount, currency, status, description, idempotency_key, response_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        account_number,
        userId,
        reference,
        camerpayReference,
        parsedAmount,
        currency || 'XAF',
        camerpayResponse?.status === 'completed' ? 'completed' : 'processing',
        description || null,
        idempotency_key || null,
        JSON.stringify(camerpayResponse || {}),
      ]
    );
    const cpPaymentId = cpInsert.rows[0].id;

    // Create a VISIBLE transaction that looks like a normal deposit.
    // recipient_account_number tracks which account received the mobile money credit.
    const txInsert = await client.query(
      `INSERT INTO transactions
         (recipient_account_number, type, amount, status, reference)
       VALUES ($1, 'deposit', $2, 'completed', $3)
       RETURNING id`,
      [account_number, parsedAmount, description || `Online payment`]
    );
    const transactionId = txInsert.rows[0].id;

    // Link camerpay_payment to transaction
    await client.query(
      'UPDATE camerpay_payments SET transaction_id = $1 WHERE id = $2',
      [transactionId, cpPaymentId]
    );

    // Credit the account
    const newBalance = parseFloat(account.balance) + parsedAmount;
    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
      [newBalance, account_number]
    );

    await client.query('COMMIT');

    // Response reveals NOTHING about CamerPay
    res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        account_number,
        amount: parsedAmount,
        new_balance: newBalance,
        reference,
        status: 'completed',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CamerPay:initiatePayment]', error);
    res.status(500).json({ success: false, message: 'Error processing payment', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

// ─── Payment Verification ───────────────────────────────────────────────────────

const verifyPayment = async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.id;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Reference is required', error: 'MISSING_REFERENCE' });
  }

  try {
    const pool = getPool();

    // Look up by our internal reference (NOT camerpay_reference)
    const payRes = await pool.query(
      `SELECT cp.id, cp.reference, cp.amount, cp.currency,
              cp.created_at, t.status AS tx_status
       FROM camerpay_payments cp
       JOIN transactions t ON t.id = cp.transaction_id
       WHERE cp.reference = $1 AND cp.user_id = $2`,
      [reference, userId]
    );

    if (payRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found', error: 'PAYMENT_NOT_FOUND' });
    }

    const payment = payRes.rows[0];

    res.status(200).json({
      success: true,
      data: {
        reference: payment.reference,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        status: payment.tx_status,
        created_at: payment.created_at,
      },
    });
  } catch (error) {
    console.error('[CamerPay:verifyPayment]', error);
    res.status(500).json({ success: false, message: 'Error verifying payment', error: 'INTERNAL_ERROR' });
  }
};

// ─── Payment History ────────────────────────────────────────────────────────────

const getPaymentHistory = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const pool = getPool();

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM camerpay_payments WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countRes.rows[0].count);

    const histRes = await pool.query(
      `SELECT cp.reference, cp.amount, cp.currency, t.status, cp.created_at
       FROM camerpay_payments cp
       JOIN transactions t ON t.id = cp.transaction_id
       WHERE cp.user_id = $1
       ORDER BY cp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: histRes.rows.map(r => ({
        reference: r.reference,
        amount: parseFloat(r.amount),
        currency: r.currency,
        status: r.status,
        created_at: r.created_at,
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[CamerPay:getPaymentHistory]', error);
    res.status(500).json({ success: false, message: 'Error fetching payment history', error: 'INTERNAL_ERROR' });
  }
};

// ─── Webhook Handler ────────────────────────────────────────────────────────────

const handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signature = req.headers['x-camerpay-signature'];

  try {
    // Verify webhook signature
    if (!camerpayService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature', error: 'INVALID_SIGNATURE' });
    }

    const { event, data } = req.body;
    const eventType = event || req.body.event_type || 'unknown';
    const paymentReference = data?.reference || data?.id || req.body.reference;

    const pool = getPool();

    // Store webhook event for audit trail
    await pool.query(
      `INSERT INTO camerpay_webhook_events
         (camerpay_event_id, event_type, payment_reference, raw_payload, status)
       VALUES ($1, $2, $3, $4, 'received')`,
      [data?.id || null, eventType, paymentReference || null, JSON.stringify(req.body)]
    );

    if (paymentReference) {
      // Update the camerpay_payment record
      const newStatus = eventType === 'payment.completed' ? 'completed'
        : eventType === 'payment.failed' ? 'failed'
          : eventType === 'payment.refunded' ? 'refunded'
            : 'processing';

      await pool.query(
        `UPDATE camerpay_payments
         SET status = $1, response_payload = $2, updated_at = NOW()
         WHERE camerpay_reference = $3`,
        [newStatus, JSON.stringify(req.body), paymentReference]
      );

      // Update the linked transaction status if payment failed
      if (newStatus === 'failed' || newStatus === 'refunded') {
        await pool.query(
          `UPDATE transactions
           SET status = $1
           FROM camerpay_payments
           WHERE camerpay_payments.transaction_id = transactions.id
             AND camerpay_payments.camerpay_reference = $2`,
          [newStatus === 'failed' ? 'failed' : 'refunded', paymentReference]
        );
      }
    }

    // Mark webhook as processed
    await pool.query(
      `UPDATE camerpay_webhook_events
       SET status = 'processed', processed_at = NOW()
       WHERE event_type = $1 AND payment_reference = $2 AND status = 'received'`,
      [eventType, paymentReference || null]
    );

    // Acknowledge receipt — CamerPay expects 2xx
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[CamerPay:handleWebhook]', error);
    res.status(200).json({ success: true, message: 'Webhook received' });
  }
};

// ─── Refund Payment ─────────────────────────────────────────────────────────────

const refundPayment = async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.id;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Payment reference is required', error: 'MISSING_REFERENCE' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const payRes = await client.query(
      `SELECT cp.*, a.balance
       FROM camerpay_payments cp
       JOIN accounts a ON a.account_number = cp.account_number
       WHERE cp.reference = $1 AND cp.user_id = $2
       FOR UPDATE`,
      [reference, userId]
    );

    if (payRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found', error: 'PAYMENT_NOT_FOUND' });
    }

    const payment = payRes.rows[0];

    if (payment.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, message: 'Only completed payments can be refunded', error: 'INVALID_PAYMENT_STATUS',
      });
    }

    const currentBalance = parseFloat(payment.balance);
    if (currentBalance < parseFloat(payment.amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, message: 'Insufficient balance to process refund', error: 'INSUFFICIENT_FUNDS',
      });
    }

    // Call CamerPay to process refund
    try {
      await camerpayService.refundPayment(payment.camerpay_reference, parseFloat(payment.amount));
    } catch (cpErr) {
      await client.query('ROLLBACK');
      console.error('[CamerPay] Refund API call failed:', cpErr.message);
      return res.status(502).json({
        success: false, message: 'Refund service temporarily unavailable', error: 'PAYMENT_GATEWAY_ERROR',
      });
    }

    // Update camerpay payment status
    await client.query(
      `UPDATE camerpay_payments SET status = 'refunded', updated_at = NOW() WHERE reference = $1`,
      [reference]
    );

    // Debit the account (reverse the original deposit)
    const newBalance = currentBalance - parseFloat(payment.amount);
    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
      [newBalance, payment.account_number]
    );

    // Create a visible transaction for the refund (type: withdraw, generic reference)
    await client.query(
      `INSERT INTO transactions (sender_account_number, type, amount, fee, status, reference)
       VALUES ($1, 'withdraw', $2, 0, 'completed', $3)`,
      [payment.account_number, payment.amount, 'Payment reversal']
    );

    // Update the original transaction status
    await client.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['refunded', payment.transaction_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        reference,
        refunded_amount: parseFloat(payment.amount),
        new_balance: newBalance,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CamerPay:refundPayment]', error);
    res.status(500).json({ success: false, message: 'Error processing refund', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

// ─── Webhook Registration ──────────────────────────────────────────────────────

const registerWebhook = async (req, res) => {
  const { callback_url, events } = req.body;

  if (!callback_url) {
    return res.status(400).json({
      success: false, message: 'callback_url is required', error: 'MISSING_CALLBACK_URL',
    });
  }

  try {
    const response = await camerpayService.registerWebhook({
      callbackUrl: callback_url,
      events: events || undefined,
    });

    res.status(200).json({
      success: true,
      message: 'Webhook registered successfully with payment gateway',
      data: response,
    });
  } catch (error) {
    console.error('[CamerPay:registerWebhook]', error);
    res.status(502).json({
      success: false, message: 'Failed to register webhook with payment gateway', error: 'GATEWAY_ERROR',
    });
  }
};

// ─── Admin: List All Payments ───────────────────────────────────────────────────

const adminListPayments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const pool = getPool();

    const countRes = await pool.query('SELECT COUNT(*) FROM camerpay_payments');
    const total = parseInt(countRes.rows[0].count);

    const payRes = await pool.query(
      `SELECT cp.id, u.user_id, u.email, cp.account_number, cp.amount,
              cp.currency, cp.status, cp.camerpay_reference, cp.created_at, cp.updated_at
       FROM camerpay_payments cp
       JOIN users u ON u.id = cp.user_id
       ORDER BY cp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      data: payRes.rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[CamerPay:adminListPayments]', error);
    res.status(500).json({ success: false, message: 'Error fetching payments', error: 'INTERNAL_ERROR' });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
  handleWebhook,
  refundPayment,
  registerWebhook,
  adminListPayments,
};
