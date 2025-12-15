// Create a new router
const express = require("express")
// const { check, validationResult } = require('express-validator');
const router = express.Router()
const bcrypt = require('bcrypt');
const e = require("express");

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

// function loginAudit(username, attemptRslt, ip) {
//     let sqlquery = "INSERT INTO loginAudit (username, attemptRslt, ip_address) VALUES (?, ?, ?)";
//     audit = [username, attemptRslt, ip]

//     db.query(sqlquery, audit, () => {});
// }

// Route handler for register page
router.get('/register', function (req, res, next) {
    res.render('register.ejs')
})

// Route handler for patient register form submission
router.post('/register_patient', /*[check('email').isEmail(), check('username').isLength({ min: 5, max: 20}), check('password').isLength({min: 8}), check('last').isAlpha()],*/ function (req, res, next) {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     res.render('./register')
    // }
    // else {
        // saving data in database
        const saltRounds = 10;
        const plainPassword = req.body.password;
        
        bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
            // Store hashed password in your database.
            let sqlquery = "INSERT INTO patients (fname, mname, lname, phone, email, hashedPass) VALUES (?,?,?,?,?,?)"
            let newPatient = [req.sanitize(req.body.first), req.sanitize(req.body.middle), req.sanitize(req.body.last), req.sanitize(req.body.phone), req.sanitize(req.body.email), hashedPassword];

            db.query(sqlquery, newPatient, function(err, result){
                if(err){
                    next(err);
                }
                else{
                    res.render('success.ejs', {subject: 'Registration Success', redirect: 'login', redirectLink: '../users/login'});
                }
            });
        });
    // }
}); 


// router.get('/listusers', function(req, res, next) {
//     let sqlquery = "SELECT * FROM userDetails"; // query database to get all the books
    
//     // execute sql query
//     db.query(sqlquery, (err, result) => {
//         if (err) {
//             next(err)
//         }
//         res.render("listusers.ejs", {users:result})
//     });
// });

// Route handler for login page
router.get('/login', function (req, res, next) {
    res.render('login.ejs')
})

// Route handler for patient login form submission
router.post('/login_patient', /* check('username').isLength({max: 20}),*/ function (req, res, next) {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     res.render('./login')
    // }
    // else {
        // Compare the password supplied with the password in the database
        let sqlquery = "SELECT id, hashedPass FROM patients WHERE email=?";
        let email = [req.sanitize(req.body.email)];

        db.query(sqlquery, email, (err, result) => {
            if(err){
                next(err);
            }
            else if (result.length == 0) {
                // loginAudit(username, 'Failed - User not found', req.ip);
                res.send('Your credentials do not exist in the database.');
            }
            else{
                let hashedPassword = result[0].hashedPass;
                bcrypt.compare(req.body.password, hashedPassword, function(err, isMatch) {
                    if (err) {
                        next(err)
                    }
                    else if (isMatch == true) {
                        // loginAudit(username, 'Success', req.ip);
                        // Save user session here, when login is successful
                        req.session.userID = result[0].id;
                        req.session.role = 'patient';
                        res.redirect('../patient/dashboard');
                    }
                    else {
                        // TODO: Send message
                        // loginAudit(username, 'Failed - Incorrect password', req.ip);
                        res.send('You may not pass filthy stinky crusty dusty musty intuder!')
                    }
                })
            }
        })
    // }
});

// Route handler for staff login form submission
router.post('/login_staff', /* check('username').isLength({max: 20}),*/ function (req, res, next) {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     res.render('./login')
    // }
    // else {
        // Compare the password supplied with the password in the database
        let sqlquery = "SELECT id, hashedPass FROM staff WHERE email=?";
        let email = [req.sanitize(req.body.email)];

        db.query(sqlquery, email, (err, result) => {
            if(err){
                next(err);
            }
            else if (result.length == 0) {
                // loginAudit(username, 'Failed - User not found', req.ip);
                res.send('Your credentials do not exist in the database.');
            }
            else{
                let hashedPassword = result[0].hashedPass;
                bcrypt.compare(req.body.password, hashedPassword, function(err, isMatch) {
                    if (err) {
                        next(err)
                    }
                    else if (isMatch == true) {
                        // loginAudit(username, 'Success', req.ip);
                        // Save user session here, when login is successful
                        req.session.userID = result[0].id;
                        req.session.role = 'staff';
                        res.redirect('../staff/dashboard');
                    }
                    else {
                        // TODO: Send message
                        // loginAudit(username, 'Failed - Incorrect password', req.ip);
                        res.send('You may not pass filthy stinky crusty dusty musty intuder!')
                    }
                })
            }
        })
    // }
})

router.get('/profile', function(req, res, next) {
    let userID = req.session.userID;
    let role = req.session.role;
    let sqlquery = "SELECT * FROM ";

    if (role === 'patient') {
        sqlquery += "patients WHERE id = ?";
    }
    else if (role === 'staff') {
        sqlquery += "staff WHERE id = ?";
    }

    let searchData = [userID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            res.render('profile.ejs', {user: result[0], role: role});
        }
    });
});

router.post('/profile/update', function(req, res, next) {
    let userID = req.session.userID;
    let role = req.session.role;
    let sqlquery = "UPDATE ";
    let searchData = [];

    if (role == 'patient') {
        sqlquery += "patients SET fname=?, mname=?, lname=?, email=?, phone=? WHERE id=?";
        searchData = [req.sanitize(req.body.first), req.sanitize(req.body.middle), req.sanitize(req.body.last), req.sanitize(req.body.email), req.sanitize(req.body.phone), userID];
    }
    else if (role == 'staff') {
        sqlquery += "staff SET fname=?, mname=?, lname=?, email=? WHERE id=?";
        searchData = [req.sanitize(req.body.first), req.sanitize(req.body.middle), req.sanitize(req.body.last), req.sanitize(req.body.email), userID];
    }

    db.query(sqlquery, searchData, function(err, result) {
        if(err){
            next(err);
        }
        else {
            // Reload the profile page to show changes
            res.redirect('/users/profile');
        }
    });
});

router.post('/profile/change_password', function(req, res, next) {
    let userID = req.session.userID;
    let role = req.session.role;
    let sqlquery = "SELECT hashedPass FROM ";

    let currentPassword = req.body.current_password;
    let newPassword = req.body.new_password;
    let confirmPassword = req.body.confirm_password;

    // Check that new password and confirm password match
    if (newPassword != confirmPassword) {
        return res.send("Error: New passwords do not match.");
    }

    if (role == 'patient') {
        sqlquery += "patients WHERE id = ?";
    }
    else if (role == 'staff') {
        sqlquery += "staff WHERE id = ?";
    }

    db.query(sqlquery, [userID], function(err, result) {
        if(err){
            return next(err);
        }
        else{
            // Verify the current password
            bcrypt.compare(currentPassword, result[0].hashedPass, function(err, isMatch) {
                if(err){
                    return next(err);
                }
                else{
                    if (!isMatch) {
                        return res.send("Error: Your current password was incorrect.");
                    }
                    else{
                        const saltRounds = 10;
                        // Hash the new password
                        bcrypt.hash(newPassword, saltRounds, function(err, newHash) {
                            if(err){
                                return next(err);
                            }
                            else{
                                // Update the password in the database
                                let sqlquery = 'UPDATE ';

                                if (role == 'patient') {
                                    sqlquery += "patients SET hashedPass = ? WHERE id = ?";
                                }
                                else if (role == 'staff') {
                                    sqlquery += "staff SET hashedPass = ? WHERE id = ?";
                                }
                                
                                db.query(sqlquery, [newHash, userID], function(err, result) {
                                    if(err){
                                        return next(err);
                                    }
                                    else{
                                        res.render('success.ejs', {subject: 'Password Changed', redirect: 'profile', redirectLink: '../users/profile'});
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    });
});

// router.get('/logout', redirectLogin, (req,res) => {
//     req.session.destroy(err => {
//         if (err) {
//             return res.redirect('../')
//         }
//         res.send('you are now logged out. <a href='+'../'+'>Home</a>');
//     })
// })


// router.get('/audit', function (req, res, next) {
//     let sqlquery = "SELECT * FROM loginAudit"; // query database to get all the books
    
//     // execute sql query
//     db.query(sqlquery, (err, result) => {
//         if (err) {
//             next(err)
//         }
//         res.render("audit.ejs", {audit:result})
//     });
// })

// Export the router object so index.js can access it
module.exports = {
    router: router,
    isPatient: isPatient,
    isStaff: isStaff
};