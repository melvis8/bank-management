const express = require('express');
const { addUser, getAllUsers, getUserById, updateUser, deleteUser, deleteAllUsers } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Admin user management
 */

router.post('/', admin, addUser);
router.get('/', admin, getAllUsers);
router.delete('/', admin, deleteAllUsers); // Delete ALL users

router.get('/:id', getUserById);
router.put('/:id', admin, updateUser);
router.delete('/:id', admin, deleteUser);

module.exports = router;
