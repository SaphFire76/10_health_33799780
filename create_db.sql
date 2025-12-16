# Create database script for health

# Create the database
CREATE DATABASE IF NOT EXISTS health;
USE health;

# Table for patient details
CREATE TABLE IF NOT EXISTS patients (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    fname       VARCHAR(50) NOT NULL,
    mname       VARCHAR(50),
    lname       VARCHAR(50) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(100) NOT NULL UNIQUE,
    hashedPass  VARCHAR(255) NOT NULL);


# Table for staff details
CREATE TABLE IF NOT EXISTS staff (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    fname       VARCHAR(50) NOT NULL,
    mname       VARCHAR(50),
    lname       VARCHAR(50) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    hashedPass  VARCHAR(255) NOT NULL);

# Table for appointments
CREATE TABLE IF NOT EXISTS appointments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patientID       INT NOT NULL,
    slot            DATETIME NOT NULL UNIQUE,
    reason          VARCHAR(255),
    FOREIGN KEY (patientID) REFERENCES patients(id));

# Table for audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patientID       INT,
    staffID         INT,
    action          VARCHAR(50) NOT NULL,
    appointmentID   INT,
    details         TEXT,
    ip_address      VARCHAR(45),
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP);