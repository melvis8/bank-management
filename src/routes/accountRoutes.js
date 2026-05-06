const express = require('express');
const { getBanks, getBankById, addBank, updateBank, deleteBank, createAccount, updateAccount, deleteAccount, getAllAccounts, getMyAccounts } = require('../controllers/accountController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank account and bank system management
 */

// --- Bank Management ---
router.get('/banks', getBanks);
router.get('/banks/:id', getBankById);
router.post('/banks', admin, addBank);
router.put('/banks/:id', admin, updateBank);
router.delete('/banks/:id', admin, deleteBank);

// --- Account Management ---
router.post('/', createAccount);
router.get('/', admin, getAllAccounts);
router.get('/my-accounts', getMyAccounts);
router.put('/:id', updateAccount);
router.delete('/:id', admin, deleteAccount);

module.exports = router;
