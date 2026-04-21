const { getPool } = require('../config/database');

const MIN_TRANSACTION_AMOUNT = 100;

// Helper to record transaction
const recordTransaction = async (client, student_id, type, amount, status, reference = null, recipient_account_number = null) => {
    return await client.query(
        `INSERT INTO transactions (student_id, type, amount, status, reference, recipient_account_number) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [student_id, type, amount, status, reference, recipient_account_number]
    );
};

/**
 * @swagger
 * /api/transactions/deposit:
 *   post:
 *     summary: Deposit money into student account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 100
 *     responses:
 *       200:
 *         description: Deposit successful
 *       400:
 *         description: Invalid amount (min 100 XAF)
 */
const deposit = async (req, res) => {
    const { amount } = req.body;
    const studentId = req.user.id;

    if (!amount || amount < MIN_TRANSACTION_AMOUNT) {
        return res.status(400).json({ 
            success: false, 
            message: `Minimum deposit amount is ${MIN_TRANSACTION_AMOUNT} XAF` 
        });
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const studentRes = await client.query('SELECT balance FROM students WHERE id = $1 FOR UPDATE', [studentId]);
        if (studentRes.rowCount === 0) throw new Error('Student not found');
        
        const newBalance = parseFloat(studentRes.rows[0].balance) + parseFloat(amount);
        
        await client.query('UPDATE students SET balance = $1 WHERE id = $2', [newBalance, studentId]);
        await recordTransaction(client, studentId, 'deposit', amount, 'completed', 'Dépôt étudiant');

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Dépôt réussi', new_balance: newBalance });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error('[Deposit]', err);
        res.status(500).json({ success: false, message: 'Le dépôt a échoué' });
    } finally {
        client.release();
    }
};

/**
 * @swagger
 * /api/transactions/withdraw:
 *   post:
 *     summary: Withdraw money from student account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 100
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *       400:
 *         description: Invalid amount or insufficient funds
 */
const withdraw = async (req, res) => {
    const { amount } = req.body;
    const studentId = req.user.id;

    if (!amount || amount < MIN_TRANSACTION_AMOUNT) {
        return res.status(400).json({ 
            success: false, 
            message: `Minimum withdrawal amount is ${MIN_TRANSACTION_AMOUNT} XAF` 
        });
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const studentRes = await client.query('SELECT balance FROM students WHERE id = $1 FOR UPDATE', [studentId]);
        if (studentRes.rowCount === 0) throw new Error('Student not found');
        
        const currentBalance = parseFloat(studentRes.rows[0].balance);
        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Fonds insuffisants' });
        }

        const newBalance = currentBalance - parseFloat(amount);
        
        await client.query('UPDATE students SET balance = $1 WHERE id = $2', [newBalance, studentId]);
        await recordTransaction(client, studentId, 'withdraw', amount, 'completed', 'Retrait étudiant');

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Retrait réussi', new_balance: newBalance });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error('[Withdraw]', err);
        res.status(500).json({ success: false, message: 'Le retrait a échoué' });
    } finally {
        client.release();
    }
};

const transfer = async (req, res) => {
    const { amount, recipient_account_number } = req.body;
    const senderId = req.user.id;

    if (!amount || amount <= 0 || !recipient_account_number) {
        return res.status(400).json({ success: false, message: 'Détails du transfert invalides' });
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const senderRes = await client.query('SELECT id, account_number FROM students WHERE id = $1', [senderId]);
        if (senderRes.rowCount === 0) throw new Error('Expéditeur non trouvé');
        const sender = senderRes.rows[0];

        if (sender.account_number === recipient_account_number) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Impossible de transférer sur le même compte' });
        }

        const recipientRes = await client.query('SELECT id FROM students WHERE account_number = $1', [recipient_account_number]);
        if (recipientRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Compte destinataire non trouvé' });
        }
        const recipient = recipientRes.rows[0];

        if (sender.id < recipient.id) {
            await client.query('SELECT id FROM students WHERE id = $1 FOR UPDATE', [sender.id]);
            await client.query('SELECT id FROM students WHERE id = $1 FOR UPDATE', [recipient.id]);
        } else {
            await client.query('SELECT id FROM students WHERE id = $1 FOR UPDATE', [recipient.id]);
            await client.query('SELECT id FROM students WHERE id = $1 FOR UPDATE', [sender.id]);
        }

        const lockedSenderRes = await client.query('SELECT balance FROM students WHERE id = $1', [sender.id]);
        const currentBalance = parseFloat(lockedSenderRes.rows[0].balance);
        
        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Fonds insuffisants' });
        }

        await client.query('UPDATE students SET balance = balance - $1 WHERE id = $2', [amount, sender.id]);
        await client.query('UPDATE students SET balance = balance + $1 WHERE id = $2', [amount, recipient.id]);

        await recordTransaction(client, sender.id, 'transfer', amount, 'completed', `Transfert vers ${recipient_account_number}`, recipient_account_number);

        await client.query('COMMIT');
        
        const newBalance = currentBalance - parseFloat(amount);
        res.status(200).json({ success: true, message: 'Transfert réussi', new_balance: newBalance });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error('[Transfer]', err);
        res.status(500).json({ success: false, message: 'Le transfert a échoué' });
    } finally {
        client.release();
    }
};

module.exports = { deposit, withdraw, transfer };
