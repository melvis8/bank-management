const fetch = require('node-fetch');
const crypto = require('crypto');

const CAMERPAY_BASE_URL = (process.env.CAMERPAY_BASE_URL || 'https://camerpay.biz/api').replace(/\/+$/, '');
const CAMERPAY_API_URL = `${CAMERPAY_BASE_URL}/api/v1`;
const CAMERPAY_TOKEN = process.env.CAMERPAY_TOKEN || '';
const CAMERPAY_WEBHOOK_SECRET = process.env.CAMERPAY_WEBHOOK_SECRET || '';

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
  createPayment: async ({ amount, currency, description, reference, callbackUrl, method, phone }) => {
    const payload = {
      payment_method: method,
      amount: Math.round(amount), // XAF typically doesn't use decimals, matching curl docs
      currency: currency || 'XAF',
      customer_phone: phone,
      merchant_invoice_id: reference,
      merchant_callback_url: callbackUrl,
      merchant_return_url: callbackUrl, // Fallback to callbackUrl or a default URL
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
   */
  verifyPayment: async (camerpayReference) => {
    const response = await fetch(`${CAMERPAY_API_URL}/payments/${camerpayReference}/verify`, {
      method: 'GET',
      headers: createHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Refund a payment on CamerPay
   */
  refundPayment: async (camerpayReference, amount) => {
    const payload = {};
    if (amount) payload.amount = Math.round(amount * 100);

    const response = await fetch(`${CAMERPAY_API_URL}/payments/${camerpayReference}/refund`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  /**
   * List all payments from CamerPay
   */
  listPayments: async ({ page, perPage, status } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (perPage) params.set('per_page', perPage);
    if (status) params.set('status', status);

    const query = params.toString();
    const url = `${CAMERPAY_API_URL}/payments${query ? `?${query}` : ''}`;

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
