const express = require('express');
const { body } = require('express-validator');
const { addStudent, getAllStudents, getStudentById, updateStudent, deleteStudent } = require('../controllers/studentController');

const router = express.Router();

/**
 * Validation rules for creating a new student
 */
const studentValidation = [
  body('student_id')
    .trim()
    .notEmpty().withMessage('Student ID (Matricule) is required'),
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 100 }),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 100 }),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone(),
  body('initial_deposit')
    .optional()
    .isFloat({ min: 0 }),
];

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Bank student management endpoints
 */

router.post('/', studentValidation, addStudent);
router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
