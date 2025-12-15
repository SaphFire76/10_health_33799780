// Import express and ejs and mysql
const express = require ('express');
const session = require('express-session');
const expressSanitizer = require('express-sanitizer');
const ejs = require('ejs');
const path = require('path');
const mysql = require('mysql2');
const env = require('dotenv').config();

// Create the express application object
const app = express()
const port = 8000

// Create a session
app.use(session({
    secret: 'somerandomstuff',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}))

// Make a helper function available to all EJS files
app.locals.formatSlot = function(dateObj) {
    let d = new Date(dateObj);
    let hours = d.getHours().toString().padStart(2, '0');
    let minutes = d.getMinutes().toString().padStart(2, '0');
    let day = d.getDate().toString().padStart(2, '0');
    let month = (d.getMonth() + 1).toString().padStart(2, '0');
    let year = d.getFullYear();
    
    return `${hours}:${minutes} ${day}/${month}/${year}`;
}

// Tell Express that we want to use EJS as the templating engine
app.set('view engine', 'ejs')

// Set up the body parser 
app.use(express.urlencoded({ extended: true }))

// // Make session data available in all EJS files
// app.use(function(req, res, next) {
//     // This makes 'userRole' available in ALL EJS files automatically
//     res.locals.userRole = req.session.role; 
//     res.locals.userId = req.session.userId;
    
//     next(); // Continue to the actual route
// });

// Create an input sanitizer
app.use(expressSanitizer());

// Set up public folder (for css and static js)
app.use(express.static(path.join(__dirname, 'public')))

// Define our application-specific data
app.locals.appData = {name: 'Booker'};

// Define the database connection pool
const db = mysql.createPool({
    host: process.env.HEALTH_HOST,
    user: process.env.HEALTH_USER,
    password: process.env.HEALTH_PASSWORD,
    database: process.env.HEALTH_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
global.db = db;

// Load the route handlers
const mainRoutes = require("./routes/main");
app.use('/', mainRoutes);

// Load the route handlers for /users
const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes.router);

// Load the route handlers for /patient
const patientRoutes = require('./routes/patient');
app.use('/patient', patientRoutes);

// Load the route handlers for /staff
const staffRoutes = require('./routes/staff');
app.use('/staff', staffRoutes);

// // Load the route handlers for /api
// const apiRoutes = require('./routes/api')
// app.use('/api', apiRoutes)

// Start the web app listening
app.listen(port, () => console.log(`Booker app listening on port ${port}!`))