const express = require('express');
const { getBanks, addBank, createAccount, getAllAccounts, getMyAccounts } = require('../controllers/accountController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank account and bank system management
 */

router.get('/banks', getBanks);
router.post('/banks', admin, addBank); // Admin only
router.post('/', createAccount);
router.get('/', admin, getAllAccounts); // Admin only
router.get('/my-accounts', getMyAccounts);

module.exports = router;
