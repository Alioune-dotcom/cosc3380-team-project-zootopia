-- Business-rule triggers for final_zoo_db
-- Run AFTER final_zoo_db.sql

USE `final_zoo_db`;

DROP TRIGGER IF EXISTS `trg_animal_enclosure_capacity`;
DROP TRIGGER IF EXISTS `trg_animal_enclosure_capacity_update`;
DROP TRIGGER IF EXISTS `trg_lineitem_product_stock`;
DROP TRIGGER IF EXISTS `trg_transactionproduct_stock`;
DROP TRIGGER IF EXISTS `trg_product_low_stock_alert`;
DROP TRIGGER IF EXISTS `trg_animal_sick_alert`;
DROP TRIGGER IF EXISTS `trg_animal_sick_quarantine_insert`;
DROP TRIGGER IF EXISTS `trg_animal_sick_quarantine_update`;
DROP TRIGGER IF EXISTS `trg_transaction_shop_rules`;
DROP TRIGGER IF EXISTS `trg_ticket_online_only`;
DROP TRIGGER IF EXISTS `trg_attraction_rules_insert`;
DROP TRIGGER IF EXISTS `trg_attraction_rules_update`;

DELIMITER $$

-- sick → Quarantine Ward; clearing sick requires picking a normal habitat (manual)
CREATE TRIGGER `trg_animal_sick_quarantine_insert`
BEFORE INSERT ON `animal`
FOR EACH ROW
BEGIN
  DECLARE quarantine_id INT;

  SELECT `EnclosureID`
  INTO quarantine_id
  FROM `enclosure`
  WHERE `Name` = 'Quarantine Ward'
    AND `IsDeleted` = 0
  LIMIT 1;

  IF NEW.`IsSick` = 1 THEN
    IF quarantine_id IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quarantine Ward enclosure is missing; cannot house a sick animal.';
    END IF;
    SET NEW.`EnclosureID` = quarantine_id;
  ELSEIF quarantine_id IS NOT NULL AND NEW.`EnclosureID` = quarantine_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Healthy animals cannot stay in Quarantine Ward; pick a habitat.';
  END IF;
END$$

CREATE TRIGGER `trg_animal_sick_quarantine_update`
BEFORE UPDATE ON `animal`
FOR EACH ROW
BEGIN
  DECLARE quarantine_id INT;

  SELECT `EnclosureID`
  INTO quarantine_id
  FROM `enclosure`
  WHERE `Name` = 'Quarantine Ward'
    AND `IsDeleted` = 0
  LIMIT 1;

  IF NEW.`IsSick` = 1 THEN
    IF quarantine_id IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quarantine Ward enclosure is missing; cannot house a sick animal.';
    END IF;
    SET NEW.`EnclosureID` = quarantine_id;
  ELSEIF quarantine_id IS NOT NULL AND NEW.`EnclosureID` = quarantine_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Clear sick and choose a habitat; healthy animals cannot stay in Quarantine.';
  END IF;
END$$

-- block insert if enclosure is full
CREATE TRIGGER `trg_animal_enclosure_capacity`
BEFORE INSERT ON `animal`
FOR EACH ROW
BEGIN
  DECLARE current_count INT;
  DECLARE max_capacity INT;

  SELECT `Capacity`
  INTO max_capacity
  FROM `enclosure`
  WHERE `EnclosureID` = NEW.`EnclosureID`
    AND `IsDeleted` = 0;

  IF max_capacity IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Enclosure not found or is deleted.';
  END IF;

  SELECT COUNT(*)
  INTO current_count
  FROM `animal`
  WHERE `EnclosureID` = NEW.`EnclosureID`
    AND `IsDeleted` = 0;

  IF current_count >= max_capacity THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Enclosure is at capacity; cannot add another animal.';
  END IF;
END$$

-- same check when moving an animal
CREATE TRIGGER `trg_animal_enclosure_capacity_update`
BEFORE UPDATE ON `animal`
FOR EACH ROW
BEGIN
  DECLARE current_count INT;
  DECLARE max_capacity INT;

  IF NEW.`EnclosureID` <> OLD.`EnclosureID` THEN
    SELECT `Capacity`
    INTO max_capacity
    FROM `enclosure`
    WHERE `EnclosureID` = NEW.`EnclosureID`
      AND `IsDeleted` = 0;

    IF max_capacity IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Enclosure not found or is deleted.';
    END IF;

    SELECT COUNT(*)
    INTO current_count
    FROM `animal`
    WHERE `EnclosureID` = NEW.`EnclosureID`
      AND `IsDeleted` = 0;

    IF current_count >= max_capacity THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Enclosure is at capacity; cannot add another animal.';
    END IF;
  END IF;
END$$

-- online sale must use the online store; in-person sale must use a real shop
-- and the cashier must be assigned to that shop (managers can ring up any shop)
CREATE TRIGGER `trg_transaction_shop_rules`
BEFORE INSERT ON `transaction`
FOR EACH ROW
BEGIN
  DECLARE shop_type VARCHAR(20);
  DECLARE shop_deleted INT;
  DECLARE is_assigned INT;
  DECLARE is_manager INT;

  SELECT `ShopType`, `IsDeleted`
  INTO shop_type, shop_deleted
  FROM `shop`
  WHERE `ShopID` = NEW.`ShopID`;

  IF shop_type IS NULL OR shop_deleted = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Shop not found or is deleted.';
  END IF;

  IF NEW.`CustomerID` IS NOT NULL AND shop_type <> 'Online' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Online sales must use the online store.';
  END IF;

  IF NEW.`EmployeeID` IS NOT NULL THEN
    IF shop_type = 'Online' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'In-person sales cannot use the online store.';
    END IF;

    SELECT COUNT(*) INTO is_assigned
    FROM `employee_shop`
    WHERE `EmployeeID` = NEW.`EmployeeID`
      AND `ShopID` = NEW.`ShopID`;

    SELECT COUNT(*) INTO is_manager
    FROM `users`
    WHERE `EmployeeID` = NEW.`EmployeeID`
      AND `Role` = 'Manager'
      AND `IsDeleted` = 0;

    IF is_assigned = 0 AND is_manager = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cashier is not assigned to this shop.';
    END IF;
  END IF;
END$$

-- tickets are only sold online, and not on a day the whole zoo is closed
-- (tickets are for today only)
CREATE TRIGGER `trg_ticket_online_only`
BEFORE INSERT ON `ticket`
FOR EACH ROW
BEGIN
  DECLARE tx_customer INT;

  SELECT `CustomerID`
  INTO tx_customer
  FROM `transaction`
  WHERE `TransactionID` = NEW.`TransactionID`;

  IF tx_customer IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tickets can only be sold online.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM `zooclosure`
    WHERE `Date` = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
    )
    AND Scope = 'FullZoo'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'The zoo is closed today.';
  END IF;
END$$

-- attraction rules (insert): host must be an active zookeeper, and it can't be
-- scheduled at a closed enclosure or on a day the zoo / that enclosure is closed
CREATE TRIGGER `trg_attraction_rules_insert`
BEFORE INSERT ON `attraction`
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM `users` u
    JOIN `employee` e ON e.`EmployeeID` = u.`EmployeeID`
    WHERE u.`EmployeeID` = NEW.`HostEmployeeID`
      AND u.`Role` = 'Zookeeper'
      AND u.`IsDeleted` = 0
      AND e.`IsDeleted` = 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Host must be an active zookeeper.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM `enclosure`
    WHERE `EnclosureID` = NEW.`EnclosureID` AND `Status` = 'Closed'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'That enclosure is closed.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM `zooclosure` z
    WHERE z.`Date` = DATE(NEW.`Schedule`)
      AND (z.`Scope` = 'FullZoo' OR z.`EnclosureID` = NEW.`EnclosureID`)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'There is a closure on that day for this enclosure or the whole zoo.';
  END IF;
END$$

-- attraction rules (update): same checks, but only when the host, enclosure or
-- time changes, so removing (soft delete) an attraction still works
CREATE TRIGGER `trg_attraction_rules_update`
BEFORE UPDATE ON `attraction`
FOR EACH ROW
BEGIN
  IF NEW.`IsDeleted` = 0 AND NEW.`HostEmployeeID` <> OLD.`HostEmployeeID` AND NOT EXISTS (
    SELECT 1
    FROM `users` u
    JOIN `employee` e ON e.`EmployeeID` = u.`EmployeeID`
    WHERE u.`EmployeeID` = NEW.`HostEmployeeID`
      AND u.`Role` = 'Zookeeper'
      AND u.`IsDeleted` = 0
      AND e.`IsDeleted` = 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Host must be an active zookeeper.';
  END IF;

  IF NEW.`IsDeleted` = 0
     AND (NEW.`EnclosureID` <> OLD.`EnclosureID` OR NEW.`Schedule` <> OLD.`Schedule`)
  THEN
    IF EXISTS (
      SELECT 1 FROM `enclosure`
      WHERE `EnclosureID` = NEW.`EnclosureID` AND `Status` = 'Closed'
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'That enclosure is closed.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM `zooclosure` z
      WHERE z.`Date` = DATE(NEW.`Schedule`)
        AND (z.`Scope` = 'FullZoo' OR z.`EnclosureID` = NEW.`EnclosureID`)
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'There is a closure on that day for this enclosure or the whole zoo.';
    END IF;
  END IF;
END$$

-- decrease stock on sale; block oversell
-- product must belong to the shop the sale happened at
CREATE TRIGGER `trg_transactionproduct_stock`
BEFORE INSERT ON `transactionproduct`
FOR EACH ROW
BEGIN
  DECLARE current_stock INT;
  DECLARE product_deleted INT;
  DECLARE product_shop INT;
  DECLARE sale_shop INT;

  SELECT `QuantityInStock`, `IsDeleted`, `ShopID`
  INTO current_stock, product_deleted, product_shop
  FROM `product`
  WHERE `ProductID` = NEW.`ProductID`;

  SELECT `ShopID`
  INTO sale_shop
  FROM `transaction`
  WHERE `TransactionID` = NEW.`TransactionID`;

  IF current_stock IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product not found for this purchase.';
  ELSEIF product_shop <> sale_shop THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product is not sold at this shop.';
  ELSEIF product_deleted = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product is deleted; cannot purchase.';
  ELSEIF NEW.`Quantity` > current_stock THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Not enough product stock for this purchase.';
  ELSE
    UPDATE `product`
    SET `QuantityInStock` = `QuantityInStock` - NEW.`Quantity`
    WHERE `ProductID` = NEW.`ProductID`
      AND `IsDeleted` = 0;
  END IF;
END$$

-- low stock alert for manager (threshold: 5)
CREATE TRIGGER `trg_product_low_stock_alert`
AFTER UPDATE ON `product`
FOR EACH ROW
BEGIN
  IF NEW.`IsDeleted` = 0
     AND NEW.`QuantityInStock` < 5
     AND OLD.`QuantityInStock` >= 5 THEN
    INSERT INTO `alert` (`AlertType`, `Message`, `ProductID`, `AnimalID`, `CreatedAt`, `IsRead`)
    VALUES (
      'LowStock',
      CONCAT(NEW.`Name`, ' is low on stock (', NEW.`QuantityInStock`, ' left).'),
      NEW.`ProductID`,
      NULL,
      NOW(),
      0
    );
  END IF;
END$$

-- sick animal alert for manager (row inserted by MySQL, not the Node API)
CREATE TRIGGER `trg_animal_sick_alert`
AFTER UPDATE ON `animal`
FOR EACH ROW
BEGIN
  IF NEW.`IsSick` = 1 AND OLD.`IsSick` = 0 AND NEW.`IsDeleted` = 0 THEN
    INSERT INTO `alert` (`AlertType`, `Message`, `ProductID`, `AnimalID`, `CreatedAt`, `IsRead`)
    VALUES (
      'SickAnimal',
      CONCAT(NEW.`Name`, ' was marked sick (moved to Quarantine Ward).'),
      NULL,
      NEW.`AnimalID`,
      NOW(),
      0
    );
  END IF;
END$$

DELIMITER ;
