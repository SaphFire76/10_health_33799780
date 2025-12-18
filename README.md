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

```
├── middleware/         # Custom middleware
├── public/             # Static assets (CSS, images)
├── routes/             # Route handlers
│   ├── main.js         # Public routes (Home, About)
│   ├── users.js        # Auth routes (Login, Register)
│   ├── patient.js      # Patient-specific logic (Booking, Profile)
│   └── staff.js        # Staff-specific logic (Search, Management)
├── views/              # EJS Templates (HTML views)
├── Create_db.sql       # Database initialization script
├── insert_test_data.sql# Sample data for testing
├── index.js            # Entry point of the application
└── .env                # Environment variables (DB credentials)
```
## Installation & Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
* Node.js
* MySQL Server

### 2. Clone the Repository
Download the project code to your local machine:
```
git clone [https://github.com/yourusername/your-repo-name.git](https://github.com/yourusername/your-repo-name.git)
cd your-repo-name
```

### 3. Install Dependencies
Install all required Node.js packages
```
npm install
```

### 4. Database Setup
Log in to your MySQL command line or Workbench.

Run the creation script to set up the database structure:
```
source create_db.sql
```

### 5. Configuration
Create a .env file in the root directory to store your sensitive database credentials:
```
HEALTH_HOST='localhost'
HEALTH_USER='health_app'
HEALTH_PASSWORD=<your password>
HEALTH_DATABASE='health'
OPENWEATHER_API_KEY=<your key>
PEPPER=<your secret pepper>
```
### 6. Run the Application
Start the server:
```
node index.js
```
