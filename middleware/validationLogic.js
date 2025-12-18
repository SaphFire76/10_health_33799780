const { check, validationResult } = require('express-validator');

const validateRegistration = [
    // Username: Alphanumeric, reasonable length
    check('username')
        .trim()
        .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 chars.')
        .isAlphanumeric().withMessage('Username must contain only letters and numbers.'),

    // Names: Letters only and some special characters
    check('first')
        .notEmpty().withMessage('First name is required.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.'),
    
    check('middle')
        .optional({ checkFalsy: true }) // Skips validation if field is empty
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.'),
    
    check('last')
        .notEmpty().withMessage('Last name is required.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.'),

    // Email: Must be valid email format + normalize
    check('email')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    // Phone: Check for numbers and length (UK/International)
    check('phone')
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone('en-GB').withMessage('Invalid phone number.'), // Locale: .isMobilePhone('en-GB')

    // Password: Strong requirements
    check('password')
        .isStrongPassword().withMessage('Password must contain 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 symbol.')
];

const validateLogin = [
    check('username')
        .trim()
        .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 chars.')
        .isAlphanumeric().withMessage('Username must contain only letters and numbers.')
        .escape(),

    // check('email')
    //     .trim()
    //     .isEmail().withMessage('Please enter a valid email.')
    //     .normalizeEmail(),
    
    check('password')
        .notEmpty().withMessage('Password is required.')
];

const validateBooking = [
    // Date: Must be a valid date in YYYY-MM-DD format
    check('date')
        .notEmpty().withMessage('Date is required.')
        .isISO8601().withMessage('Invalid date format.')
        .bail()
        .custom((value) => {
            // console.log("Validating date:", value);
            let tmrw = new Date();
            tmrw.setDate(tmrw.getDate() + 1);
            tmrw = tmrw.toISOString().split('T')[0];

            let max = new Date();
            max.setMonth(max.getMonth() + 6);
            max = max.toISOString().split('T')[0];

            const inputDate = new Date(value);

            if (value < tmrw) {
                throw new Error('Date must be at least one day in the future.');
            }
            if (value > max) {
                throw new Error('Date cannot be more than six months in the future.');
            }

            return true;
        }),

    check('slot')
        .notEmpty().withMessage('Time is required.')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format.')
];

const validateReason = [
    // Reason: Not empty, max length 500 characters
    check('reason')
        .notEmpty().withMessage('Reason for appointment is required.')
        .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters.')
        .trim()
];

const profileValidation = [
    // Names: Letters only and some special characters
    check('fname')
        .notEmpty().withMessage('First name is required.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.'),
    
    check('mname')
        .optional({ checkFalsy: true }) // Skips validation if field is empty
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.'),
    
    check('lname')
        .notEmpty().withMessage('Last name is required.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.'),

    // Email: Must be valid email format
    check('email')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    // Phone: Check for numbers and length 
    check('phone')
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone('en-GB').withMessage('Invalid phone number.') // Locale: .isMobilePhone('en-GB')
];

const validatePasswordChange = [
    // Current Password: Not empty
    check('current_password')
        .notEmpty().withMessage('Current password is required.'),

    // Confirm Password: Must match new password
    check('confirm_password')
        .isStrongPassword().withMessage('New password must contain 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 symbol.')
];

const validatePatientSearch = [
    // Patient Name: Must not be empty
    check('patientName')
        .notEmpty().withMessage('Please enter a name to search for.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Patient name can only contain letters, spaces, hyphens, and apostrophes.')
        .trim()
];


module.exports = { validateRegistration, validateLogin, validateBooking, validateReason, profileValidation, validatePasswordChange, validatePatientSearch };