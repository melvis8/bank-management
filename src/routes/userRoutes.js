const express = require('express');
const { body } = require('express-validator');
const { addUser, getAllUsers } = require('../controllers/userController');

const router = express.Router();

/**
 * Validation rules for creating a new user
 */
const createUserValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone().withMessage('Must be a valid phone number'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),

  body('account_type')
    .optional()
    .isIn(['savings', 'current', 'fixed_deposit'])
    .withMessage('Account type must be one of: savings, current, fixed_deposit'),

  body('initial_deposit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Initial deposit must be a non-negative number'),
];

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Bank user management endpoints
 */

/**
 * POST /api/users - Create a new bank user
 */
router.post('/', createUserValidation, addUser);

/**
 * GET /api/users - Retrieve all bank users (with pagination & filtering)
 */
router.get('/', getAllUsers);

module.exports = router;
