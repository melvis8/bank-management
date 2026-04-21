const { getPool } = require('../config/database');

/**
 * @desc    Deposit money into a user account
 * @route   POST /api/transactions/deposit
 * @access  Private
 */
const deposit = async (req, res) => {
    const { amount, reference } = req.body;
    const userId = req.user.id;

    if (!amount || amount < 100) {
        return res.status(400).json({ success: false, message: 'Le montant du dépôt doit être d\'au moins 100 XAF' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user exists and get current balance
        const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        if (userRes.rowCount === 0) throw new Error('Utilisateur non trouvé');

        const newBalance = parseFloat(userRes.rows[0].balance) + parseFloat(amount);

        // Update balance
        await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, userId]);

        // Record transaction
        await client.query(
            'INSERT INTO transactions (user_id, type, amount, status, reference) VALUES ($1, $2, $3, $4, $5)',
            [userId, 'deposit', amount, 'completed', reference || 'Dépôt en espèces']
        );

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Dépôt réussi', new_balance: newBalance });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Deposit]', error);
        res.status(500).json({ success: false, message: 'Erreur lors du dépôt', error: error.message });
    } finally {
        client.release();
    }
};

/**
 * @desc    Withdraw money from a user account
 * @route   POST /api/transactions/withdraw
 * @access  Private
 */
const withdraw = async (req, res) => {
    const { amount, reference } = req.body;
    const userId = req.user.id;

    if (!amount || amount < 100) {
        return res.status(400).json({ success: false, message: 'Le montant du retrait doit être d\'au moins 100 XAF' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        if (userRes.rowCount === 0) throw new Error('Utilisateur non trouvé');

        const currentBalance = parseFloat(userRes.rows[0].balance);
        if (currentBalance < amount) {
            return res.status(400).json({ success: false, message: 'Fonds insuffisants' });
        }

        const newBalance = currentBalance - parseFloat(amount);

        await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, userId]);

        await client.query(
            'INSERT INTO transactions (user_id, type, amount, status, reference) VALUES ($1, $2, $3, $4, $5)',
            [userId, 'withdraw', amount, 'completed', reference || 'Retrait guichet']
        );

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Retrait réussi', new_balance: newBalance });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Withdraw]', error);
        res.status(500).json({ success: false, message: 'Erreur lors du retrait', error: error.message });
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
    const { recipient_account_number, amount, reference } = req.body;
    const senderId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Montant invalide' });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check sender
        const senderRes = await client.query('SELECT balance, account_number FROM users WHERE id = $1 FOR UPDATE', [senderId]);
        if (senderRes.rowCount === 0) throw new Error('Expéditeur non trouvé');
        
        const senderBalance = parseFloat(senderRes.rows[0].balance);
        if (senderBalance < amount) {
            return res.status(400).json({ success: false, message: 'Fonds insuffisants pour le transfert' });
        }

        // Check recipient
        const recipientRes = await client.query('SELECT id, balance FROM users WHERE account_number = $1 FOR UPDATE', [recipient_account_number]);
        if (recipientRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Compte destinataire invalide' });
        }
        const recipientId = recipientRes.rows[0].id;

        // Perform transfer
        await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, senderId]);
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, recipientId]);

        // Record transaction
        await client.query(
            'INSERT INTO transactions (user_id, type, amount, status, reference, recipient_account_number) VALUES ($1, $2, $3, $4, $5, $6)',
            [senderId, 'transfer', amount, 'completed', reference || `Virement vers ${recipient_account_number}`, recipient_account_number]
        );

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Transfert effectué avec succès' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Transfer]', error);
        res.status(500).json({ success: false, message: 'Erreur lors du transfert', error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    deposit,
    withdraw,
    transfer
};
