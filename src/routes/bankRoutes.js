const express = require('express');
const { getAllBanks, getBankById, createBank, updateBank, deleteBank } = require('../controllers/bankController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Banks
 *   description: Financial system management
 */

router.get('/', getAllBanks);
router.get('/:id', getBankById);
router.post('/', admin, createBank);
router.put('/:id', admin, updateBank);
router.delete('/:id', admin, deleteBank);

module.exports = router;
