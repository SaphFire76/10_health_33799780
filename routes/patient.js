// Create a new router
const express = require("express")
// const { check, validationResult } = require('express-validator');
const router = express.Router()
const request = require('request');
const { isPatient } = require("./users");

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
            console.log(result);
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
            console.log("Upcoming: ", upcoming);
            console.log("Past: ", past);
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
    res.render('book.ejs', {slots: []});
});

router.get('/book_date', isPatient, function(req, res, next) {
    let date = req.query.date;
    let allSlots = populate_slots();
    let sqlquery = "SELECT DATE_FORMAT(slot, '%H:%i') FROM appointments WHERE DATE(slot) = ?";

    db.query(sqlquery, [date], function(err, result){
        if(err){
            next(err);
        } 
        else {
            let bookedTimes = result.map(row => Object.values(row)[0]);

            let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

            res.render('book.ejs', {slots: availableSlots, date: date});
        }
    });
});

// Route handler for confirming a booking
router.post('/confirm_booking', isPatient, function(req, res, next) {
    let date = req.body.date;
    let time = req.body.slot;
    let userID = req.session.userID;
    let sqlquery = "INSERT INTO appointments (patientID, slot) VALUES (?, ?)";

    let searchData = [userID, `${date} ${time}:00`];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            res.render('success.ejs', {subject: 'Booking Confirmed', redirect: 'dashboard', redirectLink: '../patient/dashboard'});
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
            res.send('Appointment not found or you do not have permission to edit this appointment.');
        }
        else {
            res.render('edit_appointment.ejs', {appointment: result[0].id, slots: []});
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
        else {
            res.render('success.ejs', {subject: 'Appointment Cancelled', redirect: 'dashboard', redirectLink: '../patient/dashboard'});
        }
    });
});

// Route handlers for changing appointment date/time
router.get('/change_date', isPatient, function(req, res, next) {
    let appointmentID = req.query.appointment;
    let date = req.query.date;
    let allSlots = populate_slots();
    let sqlquery = "SELECT DATE_FORMAT(slot, '%H:%i') FROM appointments WHERE DATE(slot) = ?";

    db.query(sqlquery, [date], function(err, result){
        if(err){
            next(err);
        } 
        else {
            let bookedTimes = result.map(row => Object.values(row)[0]);

            let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

            res.render('edit_appointment.ejs', {slots: availableSlots, date: date, appointment: appointmentID});
        }
    }); 
});

// Route handler for confirming appointment change
router.post('/confirm_change', isPatient, function(req, res, next) {
    let appointmentID = req.body.appointment;
    let userID = req.session.userID;
    let date = req.body.date;
    let time = req.body.slot;
    let sqlquery = "UPDATE appointments SET slot = ? WHERE id = ? AND patientID = ?";

    let searchData = [`${date} ${time}:00`, appointmentID, userID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            res.render('success.ejs', {subject: 'Appointment Time Changed', redirect: 'dashboard', redirectLink: '../patient/dashboard'});
        }
    });
});

// Export the router object so index.js can access it
module.exports = router