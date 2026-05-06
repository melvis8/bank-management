const express = require('express');
const { getAllAccounts, getAccountById, createAccount, updateAccount, deleteAccount, getMyAccounts } = require('../controllers/accountController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank account management
 */

// --- Account Management ---
router.get('/', admin, getAllAccounts);
router.get('/my-accounts', getMyAccounts);
router.get('/:id', getAccountById);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', admin, deleteAccount);

module.exports = router;
