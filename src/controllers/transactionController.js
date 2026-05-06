const { getPool } = require('../config/database');

const MAX_WITHDRAWAL = 500000;
const MIN_DEPOSIT = 100;
const WITHDRAWAL_FEE_RATE = 0.02; // 2%

// Helper to get account by account_number with a row lock
const getAccountForUpdate = async (client, accountNumber) => {
  const res = await client.query(
    `SELECT a.*, b.name AS bank_name, b.code AS bank_code
     FROM accounts a
     JOIN banks b ON a.bank_id = b.id
     WHERE a.account_number = $1 FOR UPDATE`,
    [accountNumber]
  );
  return res.rows[0] || null;
};

/**
 * @desc    Deposit money into an account
 * @route   POST /api/transactions/deposit
 * @access  Private
 */
const deposit = async (req, res) => {
  const { account_number, amount, reference } = req.body;
  const userId = req.user.id;

  if (!account_number) {
    return res.status(400).json({ success: false, message: 'account_number is required', error: 'MISSING_ACCOUNT_NUMBER' });
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount < MIN_DEPOSIT) {
    return res.status(400).json({
      success: false,
      message: `Deposit amount must be at least ${MIN_DEPOSIT} XAF`,
      error: 'AMOUNT_TOO_LOW',
    });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const account = await getAccountForUpdate(client, account_number);
    if (!account) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found', error: 'ACCOUNT_NOT_FOUND' });
    }

    // Verify the account belongs to the authenticated user
    if (account.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'This account does not belong to you', error: 'FORBIDDEN' });
    }

    if (account.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Account is not active', error: 'ACCOUNT_INACTIVE' });
    }

    const newBalance = parseFloat(account.balance) + parsedAmount;

    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
      [newBalance, account_number]
    );

    await client.query(
      `INSERT INTO transactions (sender_account_number, type, amount, fee, status, reference)
       VALUES ($1, 'deposit', $2, 0, 'completed', $3)`,
      [account_number, parsedAmount, reference || `Cash deposit to ${account_number}`]
    );

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Deposit successful',
      data: {
        account_number,
        bank: account.bank_name,
        deposited: parsedAmount,
        new_balance: newBalance,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Deposit]', error);
    res.status(500).json({ success: false, message: 'Error processing deposit', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Withdraw money from an account
 * @route   POST /api/transactions/withdraw
 * @access  Private
 */
const withdraw = async (req, res) => {
  const { account_number, amount, reference } = req.body;
  const userId = req.user.id;

  if (!account_number) {
    return res.status(400).json({ success: false, message: 'account_number is required', error: 'MISSING_ACCOUNT_NUMBER' });
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount', error: 'INVALID_AMOUNT' });
  }

  if (parsedAmount > MAX_WITHDRAWAL) {
    return res.status(400).json({
      success: false,
      message: `Cannot withdraw more than ${MAX_WITHDRAWAL.toLocaleString()} XAF at once`,
      error: 'EXCEEDS_WITHDRAWAL_LIMIT',
    });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const account = await getAccountForUpdate(client, account_number);
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

    const fee = parseFloat((parsedAmount * WITHDRAWAL_FEE_RATE).toFixed(2));
    const totalDeducted = parsedAmount + fee;
    const currentBalance = parseFloat(account.balance);

    if (currentBalance < totalDeducted) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. You need ${totalDeducted.toLocaleString()} XAF (amount: ${parsedAmount.toLocaleString()} + fee: ${fee.toLocaleString()}) but have ${currentBalance.toLocaleString()} XAF`,
        error: 'INSUFFICIENT_FUNDS',
        details: { balance: currentBalance, requested: parsedAmount, fee, total_needed: totalDeducted },
      });
    }

    const newBalance = parseFloat((currentBalance - totalDeducted).toFixed(2));

    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
      [newBalance, account_number]
    );

    await client.query(
      `INSERT INTO transactions (sender_account_number, type, amount, fee, status, reference)
       VALUES ($1, 'withdraw', $2, $3, 'completed', $4)`,
      [account_number, parsedAmount, fee, reference || `Withdrawal from ${account_number}`]
    );

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      data: {
        account_number,
        bank: account.bank_name,
        withdrawn: parsedAmount,
        fee_applied: fee,
        total_deducted: totalDeducted,
        new_balance: newBalance,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Withdraw]', error);
    res.status(500).json({ success: false, message: 'Error processing withdrawal', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Transfer money between accounts
 * @route   POST /api/transactions/transfer
 * @access  Private
 */
const transfer = async (req, res) => {
  const { sender_account_number, recipient_account_number, amount, reference } = req.body;
  const userId = req.user.id;

  if (!sender_account_number || !recipient_account_number) {
    return res.status(400).json({
      success: false,
      message: 'Both sender_account_number and recipient_account_number are required',
      error: 'MISSING_FIELDS',
    });
  }

  if (sender_account_number === recipient_account_number) {
    return res.status(400).json({
      success: false,
      message: 'Cannot transfer to the same account',
      error: 'SAME_ACCOUNT',
    });
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount', error: 'INVALID_AMOUNT' });
  }

  if (parsedAmount < MIN_DEPOSIT) {
    return res.status(400).json({
      success: false,
      message: `Transfer amount must be at least ${MIN_DEPOSIT} XAF`,
      error: 'AMOUNT_TOO_LOW',
    });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const senderAccount = await getAccountForUpdate(client, sender_account_number);
    if (!senderAccount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sender account not found', error: 'SENDER_NOT_FOUND' });
    }

    if (senderAccount.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Sender account does not belong to you', error: 'FORBIDDEN' });
    }

    if (senderAccount.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Sender account is not active', error: 'SENDER_ACCOUNT_INACTIVE' });
    }

    const recipientAccount = await getAccountForUpdate(client, recipient_account_number);
    if (!recipientAccount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Recipient account not found', error: 'RECIPIENT_NOT_FOUND' });
    }

    if (recipientAccount.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Recipient account is not active', error: 'RECIPIENT_ACCOUNT_INACTIVE' });
    }

    const senderBalance = parseFloat(senderAccount.balance);
    if (senderBalance < parsedAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. You have ${senderBalance.toLocaleString()} XAF but tried to transfer ${parsedAmount.toLocaleString()} XAF`,
        error: 'INSUFFICIENT_FUNDS',
        details: { balance: senderBalance, requested: parsedAmount },
      });
    }

    const newSenderBalance = parseFloat((senderBalance - parsedAmount).toFixed(2));
    const newRecipientBalance = parseFloat((parseFloat(recipientAccount.balance) + parsedAmount).toFixed(2));

    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
      [newSenderBalance, sender_account_number]
    );
    await client.query(
      'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
      [newRecipientBalance, recipient_account_number]
    );

    await client.query(
      `INSERT INTO transactions (sender_account_number, recipient_account_number, type, amount, fee, status, reference)
       VALUES ($1, $2, 'transfer', $3, 0, 'completed', $4)`,
      [sender_account_number, recipient_account_number, parsedAmount, reference || `Transfer from ${sender_account_number} to ${recipient_account_number}`]
    );

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data: {
        sender_account_number,
        recipient_account_number,
        amount: parsedAmount,
        sender_new_balance: newSenderBalance,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Transfer]', error);
    res.status(500).json({ success: false, message: 'Error processing transfer', error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
};

/**
 * @desc    Get transaction history for an account
 * @route   GET /api/transactions/history/:account_number
 * @access  Private
 */
const getTransactionHistory = async (req, res) => {
  const { account_number } = req.params;
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const pool = getPool();

    // Verify account belongs to user
    const acctRes = await pool.query(
      'SELECT id FROM accounts WHERE account_number = $1 AND user_id = $2',
      [account_number, userId]
    );
    if (acctRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Account not found or does not belong to you', error: 'FORBIDDEN' });
    }

    const totalRes = await pool.query(
      `SELECT COUNT(*) FROM transactions WHERE sender_account_number = $1 OR recipient_account_number = $1`,
      [account_number]
    );
    const total = parseInt(totalRes.rows[0].count);

    const txRes = await pool.query(
      `SELECT * FROM transactions
       WHERE sender_account_number = $1 OR recipient_account_number = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [account_number, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: txRes.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[TransactionHistory]', error);
    res.status(500).json({ success: false, message: 'Error fetching transaction history', error: 'INTERNAL_ERROR' });
  }
};

module.exports = { deposit, withdraw, transfer, getTransactionHistory };
