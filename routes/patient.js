// Create a new router
const express = require("express");
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { validateBooking, validateReason, profileValidation, validatePasswordChange } = require('../middleware/validationLogic');
const request = require('request');
const bcrypt = require('bcrypt');
const { isPatient } = require("./users");
const { audit_log } = require("./users");
const env = require('dotenv').config();

// Function to generate all possible appointment slots
function populate_slots() {
    const startHour = 9;  // 9:00 AM
    const endHour = 17;   // 5:00 PM (Clinic closes, so no appts start at 17:00)
    const interval = 20;  // Minutes per slot

    const allSlots = [];

    // Loop through every hour from 9 to 16
    for (let hour = startHour; hour < endHour; hour++) {
        
        // Loop through minutes: 0, 20, 40
        for (let minute = 0; minute < 60; minute += interval) {
            
            // Format the numbers to look like "09:00:00"
            const formattedHour = hour.toString().padStart(2, '0');
            const formattedMinute = minute.toString().padStart(2, '0');
            
            const timeString = `${formattedHour}:${formattedMinute}`;
            
            allSlots.push(timeString);
        }
    }
    return allSlots;
}

// Route handler for patient dashboard
router.get('/dashboard', isPatient, function(req, res, next) {
    // Fetch patient appointments from the database
    let userID = req.session.userID;
    let sqlquery = "SELECT * FROM appointments WHERE patientID = ? ORDER BY slot";

    db.query(sqlquery, [userID], function(err, result){
        if(err){
            next(err);
        } else {
            let current = new Date();
            let upcoming = [];
            let past = [];
            for (let i = 0; i < result.length; i++) {
                if (result[i].slot > current) {
                    upcoming.push(result[i]);
                }
                else {
                    past.push(result[i]);
                }
            }
            // Fetch weather data from OpenWeather API
            let apiKey = process.env.OPENWEATHER_API_KEY;
            let city = 'london';
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

            request(url, function (err, response, body) {
                if(err){
                    next(err)
                } else {
                    var weather = JSON.parse(body);
                    res.render('dashboard.ejs', {upcomings: upcoming, pasts: past, city: weather, userRole: req.session.role});
                } 
            });
        }
    });
});

// Route handler for booking an appointment
router.get('/book', isPatient, function(req, res, next) {
    const userRole = req.session.role;
    res.render('book.ejs', {slots: [], userRole: userRole});
});

// Route handler for selecting a date to book an appointment
router.post('/book_date', isPatient, function(req, res, next) {
    const userRole = req.session.role;
    let date = req.body.date;
    let allSlots = populate_slots();
    let sqlquery = "SELECT DATE_FORMAT(slot, '%H:%i') FROM appointments WHERE DATE(slot) = ?";

    db.query(sqlquery, [date], function(err, result){
        if(err){
            next(err);
        } 
        else {
            let bookedTimes = result.map(row => Object.values(row)[0]);

            let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
            
            res.render('book.ejs', {slots: availableSlots, userRole: userRole, date: date});
        }
    });
});

// Route handler for confirming a booking
router.post('/confirm_booking', isPatient, validateBooking, validateReason, function(req, res, next) {
    const errors = validationResult(req);
    let date = req.body.date;
    let time = req.body.slot;

    const dateError = errors.array().find(err => err.path === 'date');
    if (dateError) {
        return res.render('book.ejs', {slots: [], date: date, userRole: req.session.role, errors: errors.array()});
    }

    let allSlots = populate_slots();
    let sqlquery = "SELECT DATE_FORMAT(slot, '%H:%i') FROM appointments WHERE DATE(slot) = ?";

    db.query(sqlquery, [date], function(err, result){
        if(err){
            next(err);
        } 
        else {
            let bookedTimes = result.map(row => Object.values(row)[0]);

            let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
            
            if (!errors.isEmpty()) {
                return res.render('book.ejs', {slots: availableSlots, userRole: req.session.role, date: date, errors: errors.array()});
            }

            if (!availableSlots.includes(time)) {
                return res.render('book.ejs', {slots: availableSlots, userRole: req.session.role, date: date, errors: [{msg: "Selected time slot is not available."}]});
            }

            let userID = req.session.userID;
            let reason = req.body.reason;
            let sqlquery = "INSERT INTO appointments (patientID, slot, reason) VALUES (?, ?, ?)";

            let searchData = [userID, `${date} ${time}:00`, reason];

            db.query(sqlquery, searchData, function(err, result){
                if(err){
                    next(err);
                } 
                else {
                    audit_log(userID, null, 'Booked Appointment', result.insertId, '', req.ip);
                    res.render('success.ejs', {subject: 'Booking Confirmed', redirect: 'dashboard', redirectLink: '../patient/dashboard'});
                }
            });
        }
    });
});

// Route handlers for editing or cancelling an appointment
router.get('/edit_appointment/:id', isPatient, function(req, res, next) {
    let appointmentID = req.params.id;
    let userID = req.session.userID;
    let sqlquery = "SELECT * FROM appointments WHERE id = ? AND patientID = ?";

    let searchData = [appointmentID, userID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else if (result.length == 0) {
            audit_log(userID, null, 'Appointment Edit Attempt', appointmentID, `Tried to edit appointment that does not belong to them.`, req.ip);
            res.send('Appointment not found or you do not have permission to edit this appointment.');
        }
        else {
            res.render('edit_appointment.ejs', {appointment: result[0].id, slots: [], role: req.session.role});
        }
    });
});

// Route handlers for changing appointment date/time
router.post('/change_date', isPatient, function(req, res, next) {
    let appointmentID = req.body.appointment;
    let date = req.body.date;
    let allSlots = populate_slots();
    let sqlquery = "SELECT DATE_FORMAT(slot, '%H:%i') FROM appointments WHERE DATE(slot) = ?";

    db.query(sqlquery, [date], function(err, result){
        if(err){
            next(err);
        }
        else {
            let bookedTimes = result.map(row => Object.values(row)[0]);

            let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

            res.render('edit_appointment.ejs', {slots: availableSlots, date: date, appointment: appointmentID, role: req.session.role});
        }
    }); 
});

// Route handler for confirming appointment change
router.post('/confirm_change', isPatient, validateBooking, function(req, res, next) {
    const errors = validationResult(req);
    let appointmentID = req.body.appointment;
    let date = req.body.date;
    let time = req.body.slot;

    const dateError = errors.array().find(err => err.path === 'date');
    if (dateError) {
        return res.render('edit_appointment.ejs', {slots: [], date: date, appointment: appointmentID, role: req.session.role, errors: errors.array()});
    }

    let allSlots = populate_slots();
    let sqlquery = "SELECT DATE_FORMAT(slot, '%H:%i') FROM appointments WHERE DATE(slot) = ?";

    db.query(sqlquery, [date], function(err, result){
        if(err){
            next(err);
        } 
        else {
            let bookedTimes = result.map(row => Object.values(row)[0]);

            let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
            
            if (!errors.isEmpty()) {
                return res.render('edit_appointment.ejs', {slots: availableSlots, date: date, appointment: appointmentID, errors: errors.array(), role: req.session.role});
            }

            if (!availableSlots.includes(time)) {
                return res.render('edit_appointment.ejs', {slots: availableSlots, date: date, appointment: appointmentID, errors: [{msg: "Selected time slot is not available."}], role: req.session.role});
            }

            let userID = req.session.userID;
            let sqlquery = "UPDATE appointments SET slot = ? WHERE id = ? AND patientID = ?";

            let searchData = [`${date} ${time}:00`, appointmentID, userID];

            db.query(sqlquery, searchData, function(err, result){
                if(err){
                    next(err);
                }
                else if (result.affectedRows == 0) {
                    return res.render('edit_appointment.ejs', {slots: availableSlots, date: date, appointment: appointmentID, errors: [{msg: "Appointment not found or you do not have permission to edit this appointment."}]});
                }
                else {
                    audit_log(userID, null, 'Changed Appointment Time', appointmentID, '', req.ip);
                    res.render('success.ejs', {subject: 'Appointment Time Changed', redirect: 'dashboard', redirectLink: '../patient/dashboard'});
                }
            });
        }
    });
});

// Route handler for cancelling an appointment
router.post('/cancel', isPatient, function(req, res, next) {
    let appointmentID = req.body.appointment;
    let userID = req.session.userID;
    let sqlquery = "DELETE FROM appointments WHERE id = ? AND patientID = ?";

    let searchData = [appointmentID, userID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        }
        else if (result.length == 0) {
            res.send('Appointment not found or you do not have permission to edit this appointment.');
        }
        else {
            audit_log(userID, null, 'Cancelled Appointment', null, 'Appointment cancelled.', req.ip);
            res.render('success.ejs', {subject: 'Appointment Cancelled', redirect: 'dashboard', redirectLink: '../patient/dashboard'});
        }
    });
});

// Route handler for viewing appointment details
router.get('/appointment_details/:id', isPatient, function(req, res, next) {
    let appointmentID = req.params.id;
    let userID = req.session.userID;
    let userRole = req.session.role;
    let sqlquery = "SELECT * FROM appointments WHERE id = ? AND patientID = ?";

    let searchData = [appointmentID, userID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else if (result.length == 0) {
            audit_log(userID, null, 'Appointment View Attempt', appointmentID, `Tried to view appointment that does not belong to them.`, req.ip);
            res.send('Appointment not found or you do not have permission to view this appointment.');
        }
        else {
            // console.log(result);
            res.render('appointment_details.ejs', {appointment: result[0], userRole: userRole});
        }
    });
});

// Route handler for viewing and editing patient profile
router.get('/profile', isPatient, function(req, res, next) {
    let userID = req.session.userID;
    let sqlquery = "SELECT * FROM patients WHERE id = ?";

    let searchData = [userID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            res.render('profile.ejs', {user: result[0], errors: []});
        }
    });
});

// Route handler for updating patient profile
router.post('/update', isPatient, profileValidation, function(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.redirect('profile.ejs', {user: req.body, errors: errors.array()});
    }
    else {
        let userID = req.session.userID;
        let sqlquery = "UPDATE patients SET fname=?, mname=?, lname=?, email=?, phone=? WHERE id=?";
        let searchData = [req.body.fname, req.body.mname, req.body.lname, req.body.email, req.body.phone, userID];

        db.query(sqlquery, searchData, function(err, result) {
            if(err){
                next(err);
            }
            else {
                audit_log(userID, null, 'Profile Updated', null, 'Patient updated their profile information.', req.ip);
                // Reload the profile page to show changes
                res.redirect('/patient/profile');
            }
        });
    }
});

// Route handler for changing user password
router.post('/change_password', isPatient, validatePasswordChange, function(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('profile.ejs', {user: req.body, errors: errors.array()});
    }
    else {
        let userID = req.session.userID;
        let sqlquery = "SELECT email, hashedPass FROM patients WHERE id = ?";

        let currentPassword = req.body.current_password;
        let newPassword = req.body.new_password;
        let confirmPassword = req.body.confirm_password;

        // Check that new password and confirm password match
        if (newPassword != confirmPassword) {
            res.render('profile.ejs', {user: req.body, errors: [{msg: "New passwords do not match."}]});
        }

        const pepper = process.env.PEPPER;
        currentPassword = pepper + currentPassword;
        newPassword = pepper + newPassword;

        db.query(sqlquery, [userID], function(err, result) {
            if(err){
                return next(err);
            }
            else{
                const email = result[0].email;
                // Verify the current password
                bcrypt.compare(currentPassword, result[0].hashedPass, function(err, isMatch) {
                    if(err){
                        return next(err);
                    }
                    else{
                        if (!isMatch) {
                            // console.log(email);
                            audit_log(userID, null, 'Password Change Failed - Incorrect current password', null, 'User entered incorrect current password.', req.ip);
                            return res.render('profile.ejs', {user: req.body, errors: [{msg: "Your current password was incorrect."}]});
                        }
                        else{
                            const saltRounds = 12;
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
                                            audit_log(userID, null, 'Password Changed Successfully', null, 'User successfully changed their password.', req.ip);
                                            res.render('success.ejs', {subject: 'Password Changed', redirect: 'profile', redirectLink: '/patient/profile'});
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });
    }
});

router.post('/logout', isPatient, (req,res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('../')
        }
        res.clearCookie('connect.sid');
        res.redirect('/users/login');
    })
})

// Export the router object so index.js can access it
module.exports = router