CREATE DATABASE  IF NOT EXISTS `final_zoo_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `final_zoo_db`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: final_zoo_db
-- ------------------------------------------------------
-- Server version	8.0.46
-- Final schema: multi-ticket qty, PaymentType, IsSick, alerts, transaction_enclosure, soft delete
-- Online vs in-person sales: transaction has CustomerID (online) OR EmployeeID (in person), always a ShopID

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `animal`
--

DROP TABLE IF EXISTS `animal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `animal` (
  `AnimalID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `SpeciesID` int NOT NULL,
  `EnclosureID` int NOT NULL,
  `Sex` varchar(10) NOT NULL,
  `DateOfBirth` date DEFAULT NULL,
  `AcquisitionDate` date NOT NULL,
  `IsSick` tinyint NOT NULL DEFAULT 0,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`AnimalID`),
  KEY `SpeciesID` (`SpeciesID`),
  KEY `EnclosureID` (`EnclosureID`),
  CONSTRAINT `animal_ibfk_1` FOREIGN KEY (`SpeciesID`) REFERENCES `species` (`SpeciesID`),
  CONSTRAINT `animal_ibfk_2` FOREIGN KEY (`EnclosureID`) REFERENCES `enclosure` (`EnclosureID`),
  CONSTRAINT `animal_chk_sick` CHECK ((`IsSick` IN (0,1))),
  CONSTRAINT `animal_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `animal` WRITE;
/*!40000 ALTER TABLE `animal` DISABLE KEYS */;
/*!40000 ALTER TABLE `animal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attraction`
--

DROP TABLE IF EXISTS `attraction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attraction` (
  `AttractionID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Type` varchar(50) NOT NULL,
  `Schedule` datetime NOT NULL,
  `DurationMinutes` int DEFAULT NULL,
  `EnclosureID` int NOT NULL,
  `HostEmployeeID` int NOT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`AttractionID`),
  KEY `EnclosureID` (`EnclosureID`),
  KEY `HostEmployeeID` (`HostEmployeeID`),
  CONSTRAINT `attraction_ibfk_1` FOREIGN KEY (`EnclosureID`) REFERENCES `enclosure` (`EnclosureID`),
  -- zookeeper who hosts the talk/show (required; trigger checks they're a zookeeper)
  CONSTRAINT `attraction_ibfk_2` FOREIGN KEY (`HostEmployeeID`) REFERENCES `employee` (`EmployeeID`),
  CONSTRAINT `attraction_chk_duration` CHECK ((`DurationMinutes` IS NULL OR `DurationMinutes` > 0)),
  CONSTRAINT `attraction_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `attraction` WRITE;
/*!40000 ALTER TABLE `attraction` DISABLE KEYS */;
/*!40000 ALTER TABLE `attraction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `CustomerID` int NOT NULL AUTO_INCREMENT,
  `Email` varchar(100) NOT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`CustomerID`),
  UNIQUE KEY `Email` (`Email`),
  CONSTRAINT `customer_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `EmployeeID` int NOT NULL AUTO_INCREMENT,
  `FirstName` varchar(50) NOT NULL,
  `LastName` varchar(50) NOT NULL,
  `HireDate` date NOT NULL,
  `PhoneNumber` varchar(25) NOT NULL,
  `EmailAddress` varchar(100) NOT NULL,
  `Salary` decimal(10,2) NOT NULL,
  `SupervisorID` int DEFAULT NULL,
  `EnclosureID` int DEFAULT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`EmployeeID`),
  UNIQUE KEY `PhoneNumber` (`PhoneNumber`),
  UNIQUE KEY `EmailAddress` (`EmailAddress`),
  KEY `SupervisorID` (`SupervisorID`),
  KEY `EnclosureID` (`EnclosureID`),
  CONSTRAINT `employee_ibfk_1` FOREIGN KEY (`SupervisorID`) REFERENCES `employee` (`EmployeeID`),
  CONSTRAINT `employee_ibfk_2` FOREIGN KEY (`EnclosureID`) REFERENCES `enclosure` (`EnclosureID`),
  CONSTRAINT `employee_chk_1` CHECK ((`Salary` > 0)),
  CONSTRAINT `employee_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_shop`
--

DROP TABLE IF EXISTS `employee_shop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_shop` (
  `EmployeeID` int NOT NULL,
  `ShopID` int NOT NULL,
  PRIMARY KEY (`EmployeeID`,`ShopID`),
  KEY `ShopID` (`ShopID`),
  CONSTRAINT `employee_shop_ibfk_1` FOREIGN KEY (`EmployeeID`) REFERENCES `employee` (`EmployeeID`),
  CONSTRAINT `employee_shop_ibfk_2` FOREIGN KEY (`ShopID`) REFERENCES `shop` (`ShopID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `employee_shop` WRITE;
/*!40000 ALTER TABLE `employee_shop` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_shop` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enclosure`
--

DROP TABLE IF EXISTS `enclosure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enclosure` (
  `EnclosureID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `HabitatType` varchar(50) NOT NULL,
  `Capacity` int NOT NULL,
  `Location` varchar(100) NOT NULL,
  `Status` varchar(20) NOT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`EnclosureID`),
  CONSTRAINT `enclosure_chk_1` CHECK ((`Capacity` > 0)),
  CONSTRAINT `enclosure_chk_2` CHECK ((`Status` IN ('Open','Closed'))),
  -- dropdown lists in the app match these
  CONSTRAINT `enclosure_chk_habitat` CHECK ((`HabitatType` IN (
    'Savanna','Grassland','Aquatic','Rainforest','Desert','Arctic','Forest','Aviary','Reptile House','Medical'
  ))),
  CONSTRAINT `enclosure_chk_location` CHECK ((`Location` IN ('Zone A','Zone B','Zone C','Main Plaza','Vet Wing'))),
  CONSTRAINT `enclosure_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `enclosure` WRITE;
/*!40000 ALTER TABLE `enclosure` DISABLE KEYS */;
/*!40000 ALTER TABLE `enclosure` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `ProductID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Price` decimal(8,2) NOT NULL,
  `Category` varchar(50) NOT NULL,
  `QuantityInStock` int NOT NULL,
  `ShopID` int NOT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`ProductID`),
  KEY `ShopID` (`ShopID`),
  CONSTRAINT `product_ibfk_1` FOREIGN KEY (`ShopID`) REFERENCES `shop` (`ShopID`),
  CONSTRAINT `product_chk_1` CHECK ((`Price` >= 0)),
  CONSTRAINT `product_chk_2` CHECK ((`QuantityInStock` >= 0)),
  -- Food/Drink for food stands, Merchandise/Apparel for gift + online (checked in the backend)
  CONSTRAINT `product_chk_category` CHECK ((`Category` IN ('Food','Drink','Merchandise','Apparel'))),
  CONSTRAINT `product_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop`
--

DROP TABLE IF EXISTS `shop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop` (
  `ShopID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Location` varchar(100) NOT NULL,
  `ShopType` varchar(20) NOT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`ShopID`),
  -- Online = the online store (its own stock, like a warehouse)
  CONSTRAINT `shop_chk_1` CHECK ((`ShopType` IN ('Gift','Food','Online'))),
  CONSTRAINT `shop_chk_location` CHECK ((`Location` IN ('Zone A','Zone B','Zone C','Main Plaza','Vet Wing','Online'))),
  -- only the online store has location 'Online'
  CONSTRAINT `shop_chk_online_location` CHECK (((`ShopType` = 'Online') = (`Location` = 'Online'))),
  CONSTRAINT `shop_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `shop` WRITE;
/*!40000 ALTER TABLE `shop` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `species`
--

DROP TABLE IF EXISTS `species`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `species` (
  `SpeciesID` int NOT NULL AUTO_INCREMENT,
  `CommonName` varchar(100) NOT NULL,
  `ScientificName` varchar(100) NOT NULL,
  `Diet` varchar(50) NOT NULL,
  `ConservationStatus` varchar(50) NOT NULL,
  `AvgLifespan` int DEFAULT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`SpeciesID`),
  UNIQUE KEY `ScientificName` (`ScientificName`),
  -- IUCN Red List categories
  CONSTRAINT `species_chk_conservation` CHECK ((`ConservationStatus` IN (
    'Least Concern','Near Threatened','Vulnerable','Endangered','Critically Endangered','Extinct in the Wild','Data Deficient'
  ))),
  CONSTRAINT `species_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `species` WRITE;
/*!40000 ALTER TABLE `species` DISABLE KEYS */;
/*!40000 ALTER TABLE `species` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `species_enclosure`
--

DROP TABLE IF EXISTS `species_enclosure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `species_enclosure` (
  `SpeciesID` int NOT NULL,
  `EnclosureID` int NOT NULL,
  PRIMARY KEY (`SpeciesID`,`EnclosureID`),
  KEY `EnclosureID` (`EnclosureID`),
  CONSTRAINT `species_enclosure_ibfk_1` FOREIGN KEY (`SpeciesID`) REFERENCES `species` (`SpeciesID`),
  CONSTRAINT `species_enclosure_ibfk_2` FOREIGN KEY (`EnclosureID`) REFERENCES `enclosure` (`EnclosureID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `species_enclosure` WRITE;
/*!40000 ALTER TABLE `species_enclosure` DISABLE KEYS */;
/*!40000 ALTER TABLE `species_enclosure` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket` (
  `TicketID` int NOT NULL AUTO_INCREMENT,
  `TransactionID` int NOT NULL,
  `Type` varchar(20) NOT NULL,
  `Quantity` int NOT NULL DEFAULT 1,
  `UnitPrice` decimal(8,2) NOT NULL,
  PRIMARY KEY (`TicketID`),
  KEY `TransactionID` (`TransactionID`),
  CONSTRAINT `ticket_ibfk_1` FOREIGN KEY (`TransactionID`) REFERENCES `transaction` (`TransactionID`),
  CONSTRAINT `ticket_chk_1` CHECK ((`UnitPrice` >= 0)),
  CONSTRAINT `ticket_chk_2` CHECK ((`Type` IN ('Adult','Child','Senior'))),
  CONSTRAINT `ticket_chk_3` CHECK ((`Quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ticket` WRITE;
/*!40000 ALTER TABLE `ticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
-- Two kinds of sale share this table:
--   Online:    CustomerID set, EmployeeID NULL, ShopID = the online store, Card only
--   In person: EmployeeID (cashier) set, CustomerID NULL, ShopID = gift shop / food stand,
--              ReceiptEmail optional (email the customer gave at the register)
CREATE TABLE `transaction` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int DEFAULT NULL,
  `EmployeeID` int DEFAULT NULL,
  `ShopID` int NOT NULL,
  `Date` datetime NOT NULL,
  `PaymentType` varchar(50) NOT NULL,
  `ReceiptEmail` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`TransactionID`),
  KEY `CustomerID` (`CustomerID`),
  KEY `EmployeeID` (`EmployeeID`),
  KEY `ShopID` (`ShopID`),
  CONSTRAINT `transaction_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`),
  CONSTRAINT `transaction_ibfk_2` FOREIGN KEY (`EmployeeID`) REFERENCES `employee` (`EmployeeID`),
  CONSTRAINT `transaction_ibfk_3` FOREIGN KEY (`ShopID`) REFERENCES `shop` (`ShopID`),
  CONSTRAINT `transaction_chk_payment` CHECK ((`PaymentType` IN ('Cash','Card'))),
  -- exactly one of customer (online) or cashier (in person)
  CONSTRAINT `transaction_chk_kind` CHECK (
    (`CustomerID` IS NOT NULL AND `EmployeeID` IS NULL)
    OR
    (`CustomerID` IS NULL AND `EmployeeID` IS NOT NULL)
  ),
  -- online sales are card only
  CONSTRAINT `transaction_chk_online_card` CHECK ((`CustomerID` IS NULL OR `PaymentType` = 'Card')),
  -- optional receipt email, only on in-person sales
  CONSTRAINT `transaction_chk_receipt_inperson` CHECK ((`ReceiptEmail` IS NULL OR `CustomerID` IS NULL)),
  CONSTRAINT `transaction_chk_receipt_format`   CHECK ((`ReceiptEmail` IS NULL OR `ReceiptEmail` LIKE '%_@_%._%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `transaction` WRITE;
/*!40000 ALTER TABLE `transaction` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactionproduct`
--

DROP TABLE IF EXISTS `transactionproduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactionproduct` (
  `TransactionID` int NOT NULL,
  `ProductID` int NOT NULL,
  `Quantity` int NOT NULL,
  `UnitPrice` decimal(8,2) NOT NULL,
  PRIMARY KEY (`TransactionID`,`ProductID`),
  KEY `ProductID` (`ProductID`),
  CONSTRAINT `transactionproduct_ibfk_1` FOREIGN KEY (`TransactionID`) REFERENCES `transaction` (`TransactionID`),
  CONSTRAINT `transactionproduct_ibfk_2` FOREIGN KEY (`ProductID`) REFERENCES `product` (`ProductID`),
  CONSTRAINT `transactionproduct_chk_1` CHECK ((`Quantity` > 0)),
  CONSTRAINT `transactionproduct_chk_2` CHECK ((`UnitPrice` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `transactionproduct` WRITE;
/*!40000 ALTER TABLE `transactionproduct` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactionproduct` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Enclosures visited during a sale (for most-visited report)
--

DROP TABLE IF EXISTS `transaction_enclosure`;
CREATE TABLE `transaction_enclosure` (
  `TransactionID` int NOT NULL,
  `EnclosureID` int NOT NULL,
  PRIMARY KEY (`TransactionID`,`EnclosureID`),
  KEY `EnclosureID` (`EnclosureID`),
  CONSTRAINT `transaction_enclosure_ibfk_1` FOREIGN KEY (`TransactionID`) REFERENCES `transaction` (`TransactionID`),
  CONSTRAINT `transaction_enclosure_ibfk_2` FOREIGN KEY (`EnclosureID`) REFERENCES `enclosure` (`EnclosureID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Manager alerts (low stock, sick animals)
--

DROP TABLE IF EXISTS `alert`;
CREATE TABLE `alert` (
  `AlertID` int NOT NULL AUTO_INCREMENT,
  `AlertType` varchar(30) NOT NULL,
  `Message` varchar(255) NOT NULL,
  `ProductID` int DEFAULT NULL,
  `AnimalID` int DEFAULT NULL,
  `CreatedAt` datetime NOT NULL,
  `IsRead` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`AlertID`),
  KEY `ProductID` (`ProductID`),
  KEY `AnimalID` (`AnimalID`),
  CONSTRAINT `alert_ibfk_1` FOREIGN KEY (`ProductID`) REFERENCES `product` (`ProductID`),
  CONSTRAINT `alert_ibfk_2` FOREIGN KEY (`AnimalID`) REFERENCES `animal` (`AnimalID`),
  CONSTRAINT `alert_chk_type` CHECK ((`AlertType` IN ('LowStock','SickAnimal'))),
  CONSTRAINT `alert_chk_read` CHECK ((`IsRead` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `UserID` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(100) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Role` varchar(20) NOT NULL,
  `EmployeeID` int DEFAULT NULL,
  `CustomerID` int DEFAULT NULL,
  `IsDeleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`),
  UNIQUE KEY `EmployeeID` (`EmployeeID`),
  UNIQUE KEY `CustomerID` (`CustomerID`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`EmployeeID`) REFERENCES `employee` (`EmployeeID`),
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`),
  CONSTRAINT `users_chk_role` CHECK (
    `Role` IN ('Customer', 'Zookeeper', 'Cashier', 'Manager')
  ),
  CONSTRAINT `users_chk_link` CHECK (
    (
      `Role` = 'Customer'
      AND `CustomerID` IS NOT NULL
      AND `EmployeeID` IS NULL
    )
    OR
    (
      `Role` IN ('Manager', 'Zookeeper', 'Cashier')
      AND `EmployeeID` IS NOT NULL
      AND `CustomerID` IS NULL
    )
  ),
  CONSTRAINT `users_chk_deleted` CHECK ((`IsDeleted` IN (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `zooclosure`
-- (history log — no IsDeleted)
--

DROP TABLE IF EXISTS `zooclosure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zooclosure` (
  `ClosureID` int NOT NULL AUTO_INCREMENT,
  `Date` date NOT NULL,
  `Reason` varchar(100) NOT NULL,
  `Scope` varchar(20) NOT NULL,
  `EnclosureID` int DEFAULT NULL,
  PRIMARY KEY (`ClosureID`),
  KEY `EnclosureID` (`EnclosureID`),
  CONSTRAINT `zooclosure_ibfk_1` FOREIGN KEY (`EnclosureID`) REFERENCES `enclosure` (`EnclosureID`),
  CONSTRAINT `zooclosure_chk_1` CHECK ((`Scope` IN ('FullZoo','Enclosure'))),
  CONSTRAINT `zooclosure_chk_2` CHECK (
    (
      `Scope` = 'FullZoo'
      AND `EnclosureID` IS NULL
    )
    OR
    (
      `Scope` = 'Enclosure'
      AND `EnclosureID` IS NOT NULL
    )
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `zooclosure` WRITE;
/*!40000 ALTER TABLE `zooclosure` DISABLE KEYS */;
/*!40000 ALTER TABLE `zooclosure` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed