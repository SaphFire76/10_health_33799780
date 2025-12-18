// Create a new router
const express = require("express")
const { check, validationResult } = require('express-validator');
const { validateRegistration, validateLogin } = require('../middleware/validationLogic');
const router = express.Router()
const bcrypt = require('bcrypt');
const env = require('dotenv').config();

// Function to redirect to login page if not logged in as patient
const isPatient = (req, res, next) => {
    if (!req.session.userID || req.session.role != 'patient') {
        // console.log("Not patient")
        res.redirect('../users/login') // redirect to the login page
    } else { 
        next (); // move to the next middleware function
    }
}

// Function to redirect to login page if not logged in as staff
const isStaff = (req, res, next) => {
    if (!req.session.userID || req.session.role != 'staff') {
        // console.log("Not staff")
        res.redirect('../users/login') // redirect to the login page
    } else { 
        next (); // move to the next middleware function
    }
}

function audit_log(patientID, staffID, action, appointmentID, details, ip_address) {
    let sqlquery= "SELECT id, fname, mname, lname, email FROM";
    let userID = null;
    let role = null;

    if (patientID !== null ) {
        sqlquery += " patients WHERE id = ?";
        userID = patientID;
        role = 'Patient';
    }
    else if (staffID !== null) {
        sqlquery += " staff WHERE id = ?";
        userID = staffID;
        role = 'Staff';
    }

    db.query(sqlquery, [userID], function(err, result){
        if(err){
            return;
        }
        else {
            let fullName = result[0].fname + " " + (result[0].mname ? result[0].mname + " " : "") + result[0].lname;
            details += `${role}: ${fullName}, with email: ${result[0].email}. `;

            const saveLog = (details) => {
                let sqlquery = "INSERT INTO audit_logs (patientID, staffID, action, appointmentID, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)";
                const audit = [patientID, staffID, action, appointmentID, details, ip_address];

                db.query(sqlquery, audit, () => {});
                return;
            }

            if (appointmentID !== null) {
                let sqlquery = "SELECT slot FROM appointments WHERE id = ?";
                db.query(sqlquery, [appointmentID], function(err, result){
                    if(err){
                        return;
                    }
                    else {
                        let slot = result[0].slot;
                        details += `Appointment slot: ${slot}. `;

                        saveLog(details);
                    }
                });
            }
            else {
                saveLog(details);
            }
        }
    });
}


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
                        audit_log(result[0].id, null, 'Login Success', null, '', req.ip);
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
                        audit_log(null, result[0].id, 'Login Success', null, '', req.ip);
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
});


// Export the router object so index.js can access it
module.exports = {
    router: router,
    isPatient: isPatient,
    isStaff: isStaff,
    audit_log: audit_log
};