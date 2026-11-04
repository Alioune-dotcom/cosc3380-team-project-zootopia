-- Small test data for final_zoo_db
-- Run after final_zoo_db.sql

USE final_zoo_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE transactionproduct;
TRUNCATE TABLE ticket;
TRUNCATE TABLE `transaction`;
TRUNCATE TABLE users;
TRUNCATE TABLE employee_shop;
TRUNCATE TABLE zooclosure;
TRUNCATE TABLE attraction;
TRUNCATE TABLE animal;
TRUNCATE TABLE species_enclosure;
TRUNCATE TABLE product;
TRUNCATE TABLE shop;
TRUNCATE TABLE employee;
TRUNCATE TABLE customer;
TRUNCATE TABLE species;
TRUNCATE TABLE enclosure;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO species (SpeciesID, CommonName, ScientificName, Diet, ConservationStatus, AvgLifespan) VALUES
(1, 'Lion', 'Panthera leo', 'Carnivore', 'Vulnerable', 15),
(2, 'Elephant', 'Loxodonta africana', 'Herbivore', 'Endangered', 60),
(3, 'Penguin', 'Aptenodytes forsteri', 'Carnivore', 'Near Threatened', 20);

INSERT INTO enclosure (EnclosureID, Name, HabitatType, Capacity, Location, Status) VALUES
(1, 'Lion Habitat', 'Savanna', 4, 'Zone A', 'Open'),
(2, 'Elephant Yard', 'Grassland', 3, 'Zone B', 'Open'),
(3, 'Penguin Pool', 'Aquatic', 2, 'Zone C', 'Open');

INSERT INTO species_enclosure (SpeciesID, EnclosureID) VALUES
(1, 1),
(2, 2),
(3, 3);

-- Penguin pool capacity 2 and already full (good for capacity trigger test)
INSERT INTO animal (AnimalID, Name, SpeciesID, EnclosureID, Sex, DateOfBirth, AcquisitionDate) VALUES
(1, 'Simba', 1, 1, 'Male', '2018-03-12', '2019-06-01'),
(2, 'Nala', 1, 1, 'Female', '2019-01-20', '2020-02-15'),
(3, 'Ellie', 2, 2, 'Female', '2012-11-11', '2014-01-05'),
(4, 'Waddles', 3, 3, 'Male', '2020-12-01', '2021-03-18'),
(5, 'Pebbles', 3, 3, 'Female', '2021-02-10', '2021-06-01');

INSERT INTO attraction (AttractionID, Name, Type, Schedule, EnclosureID) VALUES
(1, 'Lion Talk', 'Talk', '2026-10-25 13:00:00', 1),
(2, 'Penguin Feeding', 'Show', '2026-10-25 11:00:00', 3);

INSERT INTO shop (ShopID, Name, Location, ShopType) VALUES
(1, 'Gift Shop', 'Main Plaza', 'Gift'),
(2, 'Snack Stand', 'Zone A', 'Food');

INSERT INTO product (ProductID, Name, Price, Category, QuantityInStock, ShopID) VALUES
(1, 'Plush Lion', 18.99, 'Merchandise', 10, 1),
(2, 'Zoo Shirt', 24.99, 'Apparel', 5, 1),
(3, 'Pretzel', 4.50, 'Food', 20, 2);

INSERT INTO customer (CustomerID, Email) VALUES
(1, 'ava@email.com'),
(2, 'jordan@email.com');

INSERT INTO employee (EmployeeID, FirstName, LastName, HireDate, PhoneNumber, EmailAddress, Salary, SupervisorID, EnclosureID) VALUES
(1, 'Morgan', 'Clark', '2015-03-01', '713-555-1001', 'morgan@zoo.com', 90000.00, NULL, NULL),
(2, 'Alex', 'Rivera', '2017-06-15', '713-555-1002', 'alex@zoo.com', 55000.00, 1, 1),
(3, 'Quinn', 'Baker', '2022-05-01', '713-555-1003', 'quinn@zoo.com', 38000.00, 1, NULL);

INSERT INTO employee_shop (EmployeeID, ShopID) VALUES
(3, 1);

-- staff: short Username; work email stays on employee
-- customers: Username is separate from customer.Email
INSERT INTO users (UserID, Username, Password, Role, EmployeeID, CustomerID) VALUES
(1, 'morgan', 'pass123', 'Manager', 1, NULL),
(2, 'alex', 'pass123', 'Zookeeper', 2, NULL),
(3, 'quinn', 'pass123', 'Cashier', 3, NULL),
(4, 'ava', 'pass123', 'Customer', NULL, 1),
(5, 'jordan', 'pass123', 'Customer', NULL, 2);

INSERT INTO `transaction` (TransactionID, CustomerID, Date, PaymentType) VALUES
(1, 1, '2026-10-20 10:15:00', 'Card'),
(2, 2, '2026-10-21 11:05:00', 'Cash');

INSERT INTO ticket (TicketID, TransactionID, Type, UnitPrice) VALUES
(1, 1, 'Adult', 29.99),
(2, 2, 'Child', 19.99),
(3, 1, 'Adult', 29.99),
(4, 1, 'Child', 19.99);

INSERT INTO transactionproduct (TransactionID, ProductID, Quantity, UnitPrice) VALUES
(1, 1, 2, 18.99),
(2, 3, 1, 4.50);

INSERT INTO zooclosure (ClosureID, Date, Reason, Scope, EnclosureID) VALUES
(1, '2026-10-18', 'Bad weather', 'FullZoo', NULL),
(2, '2026-10-23', 'Fence repair', 'Enclosure', 1);