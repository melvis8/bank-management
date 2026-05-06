const express = require('express');
const { addUser, getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Admin user management
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user manually (Admin)
 */
router.post('/', admin, addUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (Admin)
 */
router.get('/', admin, getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user details and their accounts (Admin or Self)
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user info (Admin)
 */
router.put('/:id', admin, updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin)
 */
router.delete('/:id', admin, deleteUser);

module.exports = router;
