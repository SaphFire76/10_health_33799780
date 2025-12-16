// Create a new router
const express = require("express")
const { check, validationResult } = require('express-validator');
const router = express.Router()
const bcrypt = require('bcrypt');
const env = require('dotenv').config();

// Function to redirect to login page if not logged in as patient
const isPatient = (req, res, next) => {
    if (!req.session.userID || req.session.role != 'patient') {
        res.redirect('../users/login') // redirect to the login page
    } else { 
        next (); // move to the next middleware function
    }
}

// Function to redirect to login page if not logged in as staff
const isStaff = (req, res, next) => {
    if (!req.session.userID || req.session.role != 'staff') {
        res.redirect('../users/login') // redirect to the login page
    } else { 
        next (); // move to the next middleware function
    }
}

const redirectLogin = (req, res, next) => {
    if (!req.session.userID) {
        res.redirect('../users/login') // redirect to the login page
    } else { 
        next (); // move to the next middleware function
    } 
}

function audit_log(patientID, staffID, action, appointmentID, details, ip_address) {
    let sqlquery = "INSERT INTO audit_logs (patientID, staffID, action, appointmentID, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)";
    audit = [patientID, staffID, action, appointmentID, details, ip_address];

    db.query(sqlquery, audit, () => {});
}

const validateRegistration = [
    // Username: Alphanumeric, reasonable length
    check('username')
        .trim()
        .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 chars.')
        .isAlphanumeric().withMessage('Username must contain only letters and numbers.')
        .escape(),

    // Names: Letters only, clean up extra spaces
    check('first')
        .notEmpty().withMessage('First name is required.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.')
        .escape(),
    
    check('middle')
        .optional({ checkFalsy: true }) // Skips validation if field is empty
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.')
        .escape(),
    
    check('last')
        .notEmpty().withMessage('Last name is required.')
        .matches(/^[a-zA-Z '\-]+$/).withMessage('Name must only contain letters, spaces, apostrophes, or hyphens.')
        .escape(),

    // Email: Must be valid email format + normalize
    check('email')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    // Phone: Check for numbers and length (UK/International)
    check('phone')
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone('en-GB').withMessage('Invalid phone number.') // You can specify locale: .isMobilePhone('en-GB')
        .escape(),

    // Password: Strong requirements
    check('password')
        .isStrongPassword().withMessage('Password must contain 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 symbol.')
];

// Route handler for register page
router.get('/register', function (req, res, next) {
    res.render('register.ejs', {errors: [], userData: {}})
})

// Route handler for patient register form submission
router.post('/register_patient', validateRegistration, function (req, res, next) {
    const errors = validationResult(req);
    const pepper = process.env.PEPPER;
    
    if (!errors.isEmpty()) {
        let userData = { ...req.body };
        
        delete userData.password; 
        
        return res.render('register.ejs', { 
            errors: errors.array(),
            userData: userData 
        });
    }
    else {
        // saving data in database
        const saltRounds = 12;
        const plainPassword = pepper + req.body.password;
        
        bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
            // Store hashed password in your database.
            let sqlquery = "INSERT INTO patients (username, fname, mname, lname, phone, email, hashedPass) VALUES (?,?,?,?,?,?,?)"
            let newPatient = [req.body.username, req.body.first, req.body.middle, req.body.last, req.body.phone, req.body.email, hashedPassword];

            db.query(sqlquery, newPatient, function(err, result){
                if(err){
                    next(err);
                }
                else{
                    res.render('success.ejs', {subject: 'Registration Success', redirect: 'login', redirectLink: '../users/login'});
                }
            });
        });
    }
});

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

// Route handler for login page
router.get('/login', function (req, res, next) {
    res.render('login.ejs', {errors: []})
})

// Route handler for patient login form submission
router.post('/login_patient', validateLogin, function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('./login', { errors: errors.array() })
    }
    else {
        // Compare the password supplied with the password in the database
        // let sqlquery = "SELECT id, hashedPass FROM patients WHERE email=?";
        let sqlquery = "SELECT id, hashedPass FROM patients WHERE username=?";
        // let email = [req.body.email];
        let email = [req.body.username];
        const pepper = process.env.PEPPER;
        const plainPassword = pepper + req.body.password;

        db.query(sqlquery, email, (err, result) => {
            if(err){
                next(err);
            }
            else if (result.length == 0) {
                audit_log(null, null, 'Login Failed - Patient not found', null, null, req.ip);
                res.render('./login', { errors: [{ msg: 'Credentials do not exist in the database.' }] })
            }
            else{
                let hashedPassword = result[0].hashedPass;
                bcrypt.compare(plainPassword, hashedPassword, function(err, isMatch) {
                    if (err) {
                        next(err)
                    }
                    else if (isMatch == true) {
                        audit_log(result[0].id, null, 'Login Success', null, `Patient logged in with username: ${req.body.username}`, req.ip);
                        // Save user session here, when login is successful
                        req.session.userID = result[0].id;
                        req.session.role = 'patient';
                        res.redirect('../patient/dashboard');
                    }
                    else {
                        audit_log(result[0].id, null, 'Login Failed - Incorrect password', null, null, req.ip);
                        res.render('./login', { errors: [{ msg: 'Incorrect password.' }] })
                    }
                })
            }
        })
    }
});

// Route handler for staff login form submission
router.post('/login_staff', validateLogin, function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('./login', { errors: errors.array() })
    }
    else {
        // Compare the password supplied with the password in the database
        // let sqlquery = "SELECT id, hashedPass FROM staff WHERE email=?";
        // let email = [req.body.email];
        let sqlquery = "SELECT id, hashedPass FROM staff WHERE username=?";
        let email = [req.body.username];
        const pepper = process.env.PEPPER;
        const plainPassword = pepper + req.body.password;

        db.query(sqlquery, email, (err, result) => {
            if(err){
                next(err);
            }
            else if (result.length == 0) {
                audit_log(null, null, 'Login Failed - Staff not found', null, null, req.ip);
                res.render('./login', { errors: [{ msg: 'Credentials do not exist in the database.' }] })
            }
            else{
                let hashedPassword = result[0].hashedPass;
                bcrypt.compare(plainPassword, hashedPassword, function(err, isMatch) {
                    if (err) {
                        next(err)
                    }
                    else if (isMatch == true) {
                        audit_log(null, result[0].id, 'Login Success', null, `Staff logged in with username: ${req.body.username}`, req.ip);
                        // Save user session here, when login is successful
                        req.session.userID = result[0].id;
                        req.session.role = 'staff';
                        res.redirect('../staff/dashboard');
                    }
                    else {
                        audit_log(null, result[0].id, 'Login Failed - Incorrect password', null, null, req.ip);
                        res.render('./login', { errors: [{ msg: 'Incorrect password.' }] })
                    }
                })
            }
        })
    }
})

// router.get('/logout', redirectLogin, (req,res) => {
//     req.session.destroy(err => {
//         if (err) {
//             return res.redirect('../')
//         }
//         res.send('you are now logged out. <a href='+'../'+'>Home</a>');
//     })
// })

// Export the router object so index.js can access it
module.exports = {
    router: router,
    isPatient: isPatient,
    isStaff: isStaff,
    audit_log: audit_log
};