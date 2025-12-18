# Medical Appointment Booking System

A robust web application for managing doctor/patient appointments. This system allows patients to book slots and manage their profiles, while providing staff with tools to manage appointments, search for patients, and track system activity.

## Features

### **User Roles**
* **Patients:**
    * Register and secure login.
    * View available appointment slots.
    * Book new appointments.
    * View and manage personal profile.
    * View appointment history.
* **Staff:**
    * Secure staff dashboard.
    * Search for patients by name.
    * View patient details and history.
    * Manage/Edit existing appointments.
    * Process booking confirmations.

### **Key Technical Features**
* **Secure Authentication:** Session-based login with role management (Patient vs. Staff).
* **Input Validation:** Robust server-side validation using `express-validator` to prevent bad data and crashes.
* **Security:** Protection against SQL Injection (parameterized queries) and XSS (EJS escaping).
* **Audit Logging:** tracks critical actions (bookings, updates) for accountability.
* **Dynamic Views:** Server-side rendering using EJS templates.

## Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Template Engine:** EJS (Embedded JavaScript)
* **Database:** MySQL
* **Styling:** Custom CSS
* **Validation:** Express-Validator

## Project Structure

```text
├── middleware/         # Custom middleware (e.g., validationLogic.js)
├── public/             # Static assets (CSS, images)
├── routes/             # Route handlers
│   ├── main.js         # Public routes (Home, About)
│   ├── users.js        # Auth routes (Login, Register, Logout)
│   ├── patient.js      # Patient-specific logic (Booking, Profile)
│   └── staff.js        # Staff-specific logic (Search, Management)
├── views/              # EJS Templates (HTML views)
├── Create_db.sql       # Database initialization script
├── insert_test_data.sql# Sample data for testing
├── index.js            # Entry point of the application
└── .env                # Environment variables (DB credentials)
