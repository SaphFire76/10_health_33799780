# Insert data into the tables

USE health;

INSERT INTO patients (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'goldsmiths@example.com', '$2a$12$Uard57IvpGC9ExjMApUEte6zX7ZM05g6NW0IQouz8DbXvR1P3Ie0m');
INSERT INTO staff (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'goldsmiths@example.com', '$2a$12$Uard57IvpGC9ExjMApUEte6zX7ZM05g6NW0IQouz8DbXvR1P3Ie0m');
INSERT INTO appointments (patientID, slot, reason) VALUES (1, '2025-02-01 10:00:00', 'General Checkup');
INSERT INTO appointments (patientID, slot, reason) VALUES (1, '2024-02-01 10:00:00', 'General Checkup');