const { getPool } = require('../config/database');

// Helper to record transaction
const recordTransaction = async (client, user_id, type, amount, status, reference = null, recipient_account_number = null) => {
    return await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, reference, recipient_account_number) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [user_id, type, amount, status, reference, recipient_account_number]
    );
};

const deposit = async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Lock the row for update
        const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        if (userRes.rowCount === 0) throw new Error('User not found');
        
        const newBalance = parseFloat(userRes.rows[0].balance) + parseFloat(amount);
        
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
        await recordTransaction(client, userId, 'deposit', amount, 'completed', 'Self deposit');

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Deposit successful', new_balance: newBalance });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error('[Deposit]', err);
        res.status(500).json({ success: false, message: 'Deposit failed' });
    } finally {
        client.release();
    }
};

const withdraw = async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        if (userRes.rowCount === 0) throw new Error('User not found');
        
        const currentBalance = parseFloat(userRes.rows[0].balance);
        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Insufficient funds' });
        }

        const newBalance = currentBalance - parseFloat(amount);
        
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
        await recordTransaction(client, userId, 'withdraw', amount, 'completed', 'Self withdrawal');

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Withdrawal successful', new_balance: newBalance });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error('[Withdraw]', err);
        res.status(500).json({ success: false, message: 'Withdrawal failed' });
    } finally {
        client.release();
    }
};

const transfer = async (req, res) => {
    const { amount, recipient_account_number } = req.body;
    const senderId = req.user.id;

    if (!amount || amount <= 0 || !recipient_account_number) {
        return res.status(400).json({ success: false, message: 'Invalid transfer details' });
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        // Check sender details quickly
        const senderRes = await client.query('SELECT id, account_number FROM users WHERE id = $1', [senderId]);
        if (senderRes.rowCount === 0) throw new Error('Sender not found');
        const sender = senderRes.rows[0];

        if (sender.account_number === recipient_account_number) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Cannot transfer to identical account' });
        }

        // Get recipient details quickly
        const recipientRes = await client.query('SELECT id FROM users WHERE account_number = $1', [recipient_account_number]);
        if (recipientRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Recipient account not found' });
        }
        const recipient = recipientRes.rows[0];

        // Ensure deadlock-free locking by locking the smaller ID first
        if (sender.id < recipient.id) {
            await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [sender.id]);
            await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [recipient.id]);
        } else {
            await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [recipient.id]);
            await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [sender.id]);
        }

        // Re-check balance after locking to be completely accurate
        const lockedSenderRes = await client.query('SELECT balance FROM users WHERE id = $1', [sender.id]);
        const currentBalance = parseFloat(lockedSenderRes.rows[0].balance);
        
        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Insufficient funds' });
        }

        // Apply changes directly via SET
        await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, sender.id]);
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, recipient.id]);

        // Record transactions
        await recordTransaction(client, sender.id, 'transfer', amount, 'completed', `Transfer to ${recipient_account_number}`, recipient_account_number);

        await client.query('COMMIT');
        
        const newBalance = currentBalance - parseFloat(amount);
        res.status(200).json({ success: true, message: 'Transfer successful', new_balance: newBalance });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error('[Transfer]', err);
        res.status(500).json({ success: false, message: 'Transfer failed' });
    } finally {
        client.release();
    }
};

module.exports = { deposit, withdraw, transfer };
