// Create a new router
const express = require("express")
const { check, validationResult } = require('express-validator');
const { validateBooking, validateReason, validatePatientSearch } = require('../middleware/validationLogic');
const router = express.Router()
const request = require('request');
const { isStaff } = require("./users");
const { audit_log } = require("./users");

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
router.get('/dashboard', isStaff, function(req, res, next) {
    // Fetch patient appointments from the database
    // let sqlquery = "SELECT * FROM appointments ORDER BY slot";
    let sqlquery = `SELECT patients.fname, patients.mname, patients.lname, appointments.* FROM patients 
    JOIN appointments ON patients.id = appointments.patientID 
    ORDER BY appointments.slot`;
    let userRole = req.session.role;

    db.query(sqlquery, function(err, result){
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
                    res.render('dashboard.ejs', {upcomings: upcoming, pasts: past, city: weather, userRole: userRole});
                } 
            });
        }
    });
});


// Route handlers for editing or cancelling an appointment
router.get('/edit_appointment/:id', isStaff, function(req, res, next) {
    let appointmentID = req.params.id;
    let sqlquery = "SELECT * FROM appointments WHERE id = ?";

    let searchData = [appointmentID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else if (result.length == 0) {
            res.send('Appointment not found.');
        }
        else {
            res.render('edit_appointment.ejs', {appointment: result[0].id, slots: [], role: req.session.role});
        }
    });
});


// Route handlers for changing appointment date/time
router.post('/change_date', isStaff, function(req, res, next) {
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
router.post('/confirm_change', isStaff, validateBooking, function(req, res, next) {
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

            let sqlquery = "UPDATE appointments SET slot = ? WHERE id = ?";

            let searchData = [`${date} ${time}:00`, appointmentID];

            db.query(sqlquery, searchData, function(err, result){
                if(err){
                    next(err);
                } 
                else {
                    audit_log(null, req.session.userID, 'Changed Appointment Time', appointmentID, '', req.ip);
                    res.render('success.ejs', {subject: 'Appointment Time Changed', redirect: 'dashboard', redirectLink: '../staff/dashboard'});
                }
            });
        }
    });
});

// Route handler for cancelling an appointment
router.post('/cancel', isStaff, function(req, res, next) {
    let appointmentID = req.body.appointment;
    let sqlquery = "DELETE FROM appointments WHERE id = ?";

    let searchData = [appointmentID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            audit_log(null, req.session.userID, 'Cancelled Appointment', null, 'Appointment cancelled by staff.', req.ip);
            res.render('success.ejs', {subject: 'Appointment Cancelled', redirect: 'dashboard', redirectLink: '../staff/dashboard'});
        }
    });
});


// Route handler for viewing appointment details
router.get('/appointment_details/:id', isStaff, function(req, res, next) {
    let appointmentID = req.params.id;
    let userRole = req.session.role;
    let sqlquery = `SELECT * FROM patients 
    JOIN appointments ON patients.id = appointments.patientID 
    WHERE appointments.id = ?`;

    let searchData = [appointmentID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else if (result.length == 0) {
            res.send('Appointment not found.');
        }
        else {
            // console.log(result);
            audit_log(null, req.session.userID, 'Viewed Appointment Details', appointmentID, `Staff viewed details of appointment on ${result[0].slot} of patient: ${result[0].fname} ${result[0].lname}, with email: ${result[0].email}.`, req.ip);
            res.render('appointment_details.ejs', {appointment: result[0], userRole: userRole});
        }
    });
});

// Route handlers for searching patients
router.get('/search_patients', isStaff, function(req, res, next) {
    let sqlquery = "SELECT id, fname, mname, lname FROM patients";

    db.query(sqlquery, function(err, result){
        if(err){
            next(err);
        }
        else {
            res.render('search_patients.ejs', {patients: result});
        }
    });
});

// Route handler for processing patient search
router.get('/search', isStaff, validatePatientSearch, function(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let sqlquery = "SELECT id, fname, mname, lname FROM patients";

        db.query(sqlquery, function(err, result){
            if(err){
                next(err);
            }
            else {
                return res.render('search_patients.ejs', {patients: [], errors: errors.array()});
            }
        });
        return;
    }
    let patient = req.query.patientName;
    let sqlquery = "SELECT id, fname, mname, lname FROM patients WHERE fname LIKE ? OR mname LIKE ? OR lname LIKE ?";

    let searchData = [`%${patient}%`, `%${patient}%`, `%${patient}%`];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            res.render('search_patients.ejs', {patients: result});
        }
    });
});

// Route handler for viewing patient details
router.get('/patient_details/:id', isStaff, function(req, res, next) {
    let patientID = req.params.id;
    let sqlquery = "SELECT * FROM patients WHERE id = ?";

    let searchData = [patientID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        }
        else {
            audit_log(null, req.session.userID, 'Viewed Patient Details', null, `Staff viewed details of patient: ${result[0].fname} ${result[0].lname}, with email: ${result[0].email}.`, req.ip);
            let sqlquery = "SELECT * FROM appointments WHERE patientID = ? ORDER BY slot DESC";

            db.query(sqlquery, [patientID], function(err, appointments){
                if(err){
                    next(err);
                }
                else {
                    res.render('patient_details.ejs', {patient: result[0], appointments: appointments});
                }
            });
        }
    });
});

// Route handlers for booking an appointment for a patient
router.get('/book/:id', isStaff, function(req, res, next) {
    let patientID = req.params.id;
    let userRole = req.session.role;
    let sqlquery = "SELECT id, fname, mname, lname FROM patients WHERE id = ?";

    let searchData = [patientID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        }
        else {
            // console.log(result);
            res.render('book.ejs', {slots: [], userRole: userRole, patient: result[0]});
        }
    });
});

// Route handler for selecting a date to book an appointment
router.post('/book_date', isStaff, function(req, res, next) {
    // console.log(req.body);
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

            let sqlquery = "SELECT id, fname, mname, lname FROM patients WHERE id = ?";
            let patientID = req.body.patientID;
            // console.log(patientID);
            let userRole = req.session.role;

            db.query(sqlquery, [patientID], function(err, result){
                if(err){
                    next(err);
                }
                else {
                    // console.log(result);
                    res.render('book.ejs', {slots: availableSlots, userRole: userRole, date: date, patient: result[0]});
                }
            });
        }
    });
});

// Route handler for confirming a booking
router.post('/confirm_booking', isStaff, validateBooking, validateReason, function(req, res, next) {
    const errors = validationResult(req);
    let userID = req.body.patientID;
    let date = req.body.date;
    let time = req.body.slot;

    const dateError = errors.array().find(err => err.path === 'date');
    if (dateError) {
        return res.render('book.ejs', {slots: [], date: date, patient: {id: userID}, userRole: req.session.role, errors: errors.array()});
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
                return res.render('book.ejs', {slots: availableSlots, date: date, patient: {id: userID}, userRole: req.session.role, errors: errors.array()});
            }

            if (!availableSlots.includes(time)) {
                return res.render('book.ejs', {slots: availableSlots, date: date, patient: {id: userID}, userRole: req.session.role, errors: [{msg: "Selected time slot is not available."}]});
            }

            let reason = req.body.reason;
            let sqlquery = "INSERT INTO appointments (patientID, slot, reason) VALUES (?, ?, ?)";

            let searchData = [userID, `${date} ${time}:00`, reason];

            db.query(sqlquery, searchData, function(err, result){
                if(err){
                    next(err);
                } 
                else {
                    audit_log(null, req.session.userID, 'Booked Appointment', result.insertId, '', req.ip);
                    res.render('success.ejs', {subject: 'Booking Confirmed', redirect: 'dashboard', redirectLink: '../staff/dashboard'});
                }
            });
        }
    });
});


router.post('/logout', isStaff, (req,res) => {
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