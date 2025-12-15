// Create a new router
const express = require("express")
// const { check, validationResult } = require('express-validator');
const router = express.Router()
const request = require('request');
const { isStaff } = require("./users");

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
    let sqlquery = "SELECT * FROM appointments ORDER BY slot";
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
            res.render('edit_appointment.ejs', {appointment: result[0].id, slots: []});
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
            res.render('success.ejs', {subject: 'Appointment Cancelled', redirect: 'dashboard', redirectLink: '../staff/dashboard'});
        }
    });
});

// Route handlers for changing appointment date/time
router.get('/change_date', isStaff, function(req, res, next) {
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
router.post('/confirm_change', isStaff, function(req, res, next) {
    let appointmentID = req.body.appointment;
    let date = req.body.date;
    let time = req.body.slot;
    let sqlquery = "UPDATE appointments SET slot = ? WHERE id = ?";

    let searchData = [`${date} ${time}:00`, appointmentID];

    db.query(sqlquery, searchData, function(err, result){
        if(err){
            next(err);
        } 
        else {
            res.render('success.ejs', {subject: 'Appointment Time Changed', redirect: 'dashboard', redirectLink: '../staff/dashboard'});
        }
    });
});

// Export the router object so index.js can access it
module.exports = router