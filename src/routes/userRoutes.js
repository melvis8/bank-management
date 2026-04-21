const express = require('express');
const { body } = require('express-validator');
const { addUser, getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const userValidation = [
  body('user_id').trim().notEmpty().withMessage('User ID (Matricule) is required'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Must be a valid email'),
];

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Bank user management
 */

router.post('/', userValidation, addUser);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
