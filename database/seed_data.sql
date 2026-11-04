-- Test data for final_zoo_db
-- Run after final_zoo_db.sql (+ triggers/views)

USE final_zoo_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE alert;
TRUNCATE TABLE transaction_enclosure;
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
(3, 'Penguin', 'Aptenodytes forsteri', 'Carnivore', 'Near Threatened', 20),
(4, 'Giraffe', 'Giraffa camelopardalis', 'Herbivore', 'Vulnerable', 25),
(5, 'Zebra', 'Equus quagga', 'Herbivore', 'Near Threatened', 20);

INSERT INTO enclosure (EnclosureID, Name, HabitatType, Capacity, Location, Status) VALUES
(1, 'Lion Habitat', 'Savanna', 4, 'Zone A', 'Open'),
(2, 'Elephant Yard', 'Grassland', 3, 'Zone B', 'Open'),
(3, 'Penguin Pool', 'Aquatic', 4, 'Zone C', 'Open'),
(4, 'Giraffe Plains', 'Savanna', 4, 'Zone A', 'Open'),
(5, 'Zebra Meadow', 'Grassland', 5, 'Zone B', 'Open'),
(6, 'Quarantine Ward', 'Medical', 20, 'Vet Wing', 'Closed');

INSERT INTO species_enclosure (SpeciesID, EnclosureID) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

INSERT INTO animal (AnimalID, Name, SpeciesID, EnclosureID, Sex, DateOfBirth, AcquisitionDate, IsSick) VALUES
(1, 'Simba', 1, 1, 'Male', '2018-03-12', '2019-06-01', 0),
(2, 'Nala', 1, 1, 'Female', '2019-01-20', '2020-02-15', 0),
(3, 'Ellie', 2, 2, 'Female', '2012-11-11', '2014-01-05', 0),
(4, 'Waddles', 3, 3, 'Male', '2020-12-01', '2021-03-18', 0),
(5, 'Pebbles', 3, 3, 'Female', '2021-02-10', '2021-06-01', 0),
(6, 'Stretch', 4, 4, 'Male', '2016-05-01', '2017-08-20', 0),
(7, 'Dots', 4, 6, 'Female', '2018-09-14', '2019-01-10', 1),
(8, 'Stripe', 5, 5, 'Male', '2019-04-22', '2020-05-01', 0),
(9, 'Zigzag', 5, 5, 'Female', '2020-07-07', '2021-02-14', 0);

INSERT INTO attraction (AttractionID, Name, Type, Schedule, EnclosureID) VALUES
(1, 'Lion Talk', 'Talk', '2026-11-05 13:00:00', 1),
(2, 'Penguin Feeding', 'Show', '2026-11-05 11:00:00', 3),
(3, 'Elephant Bath', 'Show', '2026-11-06 15:00:00', 2),
(4, 'Giraffe Feeding', 'Talk', '2026-11-06 10:30:00', 4);

INSERT INTO shop (ShopID, Name, Location, ShopType) VALUES
(1, 'Gift Shop', 'Main Plaza', 'Gift'),
(2, 'Snack Stand', 'Zone A', 'Food'),
(3, 'Safari Cafe', 'Zone B', 'Food');

INSERT INTO product (ProductID, Name, Price, Category, QuantityInStock, ShopID) VALUES
(1, 'Plush Lion', 18.99, 'Merchandise', 12, 1),
(2, 'Zoo Shirt', 24.99, 'Apparel', 8, 1),
(3, 'Pretzel', 4.50, 'Food', 25, 2),
(4, 'Water Bottle', 12.00, 'Merchandise', 15, 1),
(5, 'Ice Cream', 5.50, 'Food', 20, 2),
(6, 'Safari Cap', 16.99, 'Apparel', 3, 1),
(7, 'Burger Combo', 11.99, 'Food', 18, 3);

INSERT INTO customer (CustomerID, Email) VALUES
(1, 'ava@email.com'),
(2, 'jordan@email.com'),
(3, 'sam@email.com'),
(4, 'riley@email.com');

INSERT INTO employee (EmployeeID, FirstName, LastName, HireDate, PhoneNumber, EmailAddress, Salary, SupervisorID, EnclosureID) VALUES
(1, 'Morgan', 'Clark', '2015-03-01', '713-555-1001', 'morgan@zoo.com', 90000.00, NULL, NULL),
(2, 'Alex', 'Rivera', '2017-06-15', '713-555-1002', 'alex@zoo.com', 55000.00, 1, 1),
(3, 'Quinn', 'Baker', '2022-05-01', '713-555-1003', 'quinn@zoo.com', 38000.00, 1, NULL),
(4, 'Jamie', 'Lee', '2021-09-01', '713-555-1004', 'jamie@zoo.com', 42000.00, 1, 3),
(5, 'Casey', 'Nguyen', '2023-01-15', '713-555-1005', 'casey@zoo.com', 36000.00, 1, NULL);

INSERT INTO employee_shop (EmployeeID, ShopID) VALUES
(3, 1),
(3, 2),
(5, 1),
(5, 3);

INSERT INTO users (UserID, Username, Password, Role, EmployeeID, CustomerID) VALUES
(1, 'morgan', 'pass123', 'Manager', 1, NULL),
(2, 'alex', 'pass123', 'Zookeeper', 2, NULL),
(3, 'quinn', 'pass123', 'Cashier', 3, NULL),
(4, 'jamie', 'pass123', 'Zookeeper', 4, NULL),
(5, 'casey', 'pass123', 'Cashier', 5, NULL),
(6, 'ava', 'pass123', 'Customer', NULL, 1),
(7, 'jordan', 'pass123', 'Customer', NULL, 2),
(8, 'sam', 'pass123', 'Customer', NULL, 3),
(9, 'riley', 'pass123', 'Customer', NULL, 4);

INSERT INTO `transaction` (TransactionID, CustomerID, Date, PaymentType) VALUES
(1, 1, '2026-10-20 10:15:00', 'Card'),
(2, 2, '2026-10-21 11:05:00', 'Cash'),
(3, 3, '2026-10-22 14:20:00', 'Card'),
(4, 1, '2026-10-25 09:40:00', 'Card'),
(5, 4, '2026-10-28 16:10:00', 'Cash');

INSERT INTO ticket (TicketID, TransactionID, Type, Quantity, UnitPrice) VALUES
(1, 1, 'Adult', 2, 29.99),
(2, 1, 'Child', 1, 19.99),
(3, 2, 'Child', 2, 19.99),
(4, 3, 'Adult', 1, 29.99),
(5, 3, 'Senior', 1, 24.99),
(6, 4, 'Adult', 3, 29.99),
(7, 5, 'Adult', 1, 29.99),
(8, 5, 'Child', 2, 19.99);

INSERT INTO transactionproduct (TransactionID, ProductID, Quantity, UnitPrice) VALUES
(1, 1, 2, 18.99),
(2, 3, 1, 4.50),
(3, 2, 1, 24.99),
(4, 5, 2, 5.50),
(5, 4, 1, 12.00),
(5, 7, 1, 11.99);

INSERT INTO transaction_enclosure (TransactionID, EnclosureID) VALUES
(1, 1),
(1, 3),
(2, 3),
(3, 2),
(3, 4),
(4, 1),
(4, 5),
(5, 2),
(5, 3),
(5, 4);

INSERT INTO zooclosure (ClosureID, Date, Reason, Scope, EnclosureID) VALUES
(1, '2026-10-18', 'Bad weather', 'FullZoo', NULL),
(2, '2026-10-23', 'Fence repair', 'Enclosure', 1),
(3, '2026-10-26', 'Storm', 'FullZoo', NULL),
(4, '2026-10-29', 'Maintenance', 'Enclosure', 3);

-- demo alerts (sick animal + low stock sample; triggers also create these on updates)
INSERT INTO alert (AlertID, AlertType, Message, ProductID, AnimalID, CreatedAt, IsRead) VALUES
(1, 'SickAnimal', 'Dots was marked sick.', NULL, 7, '2026-10-28 09:00:00', 0),
(2, 'LowStock', 'Safari Cap is low on stock (3 left).', 6, NULL, '2026-10-29 14:00:00', 0);
