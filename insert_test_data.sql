# Insert data into the tables

USE health;

INSERT INTO patients (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'gold', '$2a$12$.EaBJNIJTapGeiZX0lf9lOslMKghnM4vXdNzOpAeruKEvH5eRzMJu');
INSERT INTO staff (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'gold', '$2a$12$.EaBJNIJTapGeiZX0lf9lOslMKghnM4vXdNzOpAeruKEvH5eRzMJu');