const fetch = require('node-fetch');
const crypto = require('crypto');

// CAMERPAY_BASE_URL is expected to be 'https://camerpay.biz/api' (no trailing slash).
// All endpoint paths are built relative to this base.
const CAMERPAY_BASE_URL = (process.env.CAMERPAY_BASE_URL || 'https://camerpay.biz/api').replace(/\/+$/, '');
const CAMERPAY_TOKEN = process.env.CAMERPAY_TOKEN || '';
const CAMERPAY_WEBHOOK_SECRET = process.env.CAMERPAY_WEBHOOK_SECRET || '';

if (!process.env.CAMERPAY_WEBHOOK_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[CamerPay] ⚠️  CAMERPAY_WEBHOOK_SECRET is not set. ' +
    'Webhook signature verification is DISABLED — all incoming webhook calls will be accepted. ' +
    'Set this variable in production to secure your webhook endpoint.'
  );
}

class CamerpayError extends Error {
  constructor(message, statusCode, payload = null) {
    super(message);
    this.name = 'CamerpayError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

const createHeaders = () => ({
  'Authorization': `Bearer ${CAMERPAY_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'BMS-CamerPay-Integration/1.0',
});

const handleResponse = async (response) => {
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new CamerpayError(
      body?.message || `CamerPay API error: ${response.statusText}`,
      response.status,
      body
    );
  }

  return body;
};

const camerpayService = {
  /**
   * Create a payment on CamerPay
   */
  createPayment: async ({ amount, currency, description, reference, callbackUrl, returnUrl, method, phone }) => {
    const payload = {
      payment_method: method,
      amount: Math.round(amount), // XAF typically doesn't use decimals, matching curl docs
      currency: currency || 'XAF',
      customer_phone: phone,
      merchant_invoice_id: reference,
      merchant_callback_url: callbackUrl,
      merchant_return_url: returnUrl || callbackUrl, // Browser redirect URL after payment
      source: 'api',
    };

    const response = await fetch(`${CAMERPAY_BASE_URL}/payment/initiate`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * Register our webhook callback URL with CamerPay
   */
  registerWebhook: async ({ callbackUrl, events }) => {
    const payload = {
      url: callbackUrl,
      events: events || ['payment.completed', 'payment.failed', 'payment.refunded'],
    };

    const response = await fetch(`${CAMERPAY_BASE_URL}/webhook/camerpay`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * Verify a payment status on CamerPay
   * Endpoint: GET /api/payment/{reference}/status
   */
  verifyPayment: async (camerpayReference) => {
    const response = await fetch(`${CAMERPAY_BASE_URL}/payment/${camerpayReference}/status`, {
      method: 'GET',
      headers: createHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Refund a payment on CamerPay
   * Endpoint: POST /api/payment/{reference}/refund
   */
  refundPayment: async (camerpayReference, amount) => {
    const payload = {};
    // XAF amounts are whole numbers; send the raw XAF value (not * 100)
    if (amount) payload.amount = Math.round(amount);

    const response = await fetch(`${CAMERPAY_BASE_URL}/payment/${camerpayReference}/refund`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * List all payments from CamerPay
   * Endpoint: GET /api/payment/list
   */
  listPayments: async ({ page, perPage, status } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (perPage) params.set('per_page', perPage);
    if (status) params.set('status', status);

    const query = params.toString();
    const url = `${CAMERPAY_BASE_URL}/payment/list${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Verify webhook signature from CamerPay
   */
  verifyWebhookSignature: (rawBody, signature) => {
    if (!CAMERPAY_WEBHOOK_SECRET) return true;

    const expected = crypto
      .createHmac('sha256', CAMERPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expected)
    );
  },
};

module.exports = { camerpayService, CamerpayError };
