# Insert data into the tables

USE health;

INSERT INTO patients (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'goldsmiths@example.com', '$2a$12$Uard57IvpGC9ExjMApUEte6zX7ZM05g6NW0IQouz8DbXvR1P3Ie0m');
INSERT INTO staff (username, fname, lname, email, hashedPass) VALUES ('gold', 'gold', 'smiths', 'goldsmiths@example.com', '$2a$12$Uard57IvpGC9ExjMApUEte6zX7ZM05g6NW0IQouz8DbXvR1P3Ie0m');