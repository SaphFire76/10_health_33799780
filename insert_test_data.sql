# Insert data into the tables

USE health;

INSERT INTO patients (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'goldsmiths@example.com', '$2a$12$V8pLNwpzqV1DHMu3hmJcGucVsGXfHxnxXlls4PkAxCa3pzfhUFJyG');
INSERT INTO staff (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'goldsmiths@example.com', '$2a$12$V8pLNwpzqV1DHMu3hmJcGucVsGXfHxnxXlls4PkAxCa3pzfhUFJyG');