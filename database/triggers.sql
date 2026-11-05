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
    -- remember the usual habitat (unless it was entered straight into quarantine)
    IF quarantine_id IS NULL OR NEW.`EnclosureID` <> quarantine_id THEN
      SET NEW.`HomeEnclosureID` = NEW.`EnclosureID`;
    END IF;
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
    -- remember the usual habitat when the animal first gets sick
    IF OLD.`IsSick` = 0 THEN
      SET NEW.`HomeEnclosureID` = OLD.`EnclosureID`;
    END IF;
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

-- decrease stock on sale; block oversell
CREATE TRIGGER `trg_transactionproduct_stock`
BEFORE INSERT ON `transactionproduct`
FOR EACH ROW
BEGIN
  DECLARE current_stock INT;
  DECLARE product_deleted INT;

  SELECT `QuantityInStock`, `IsDeleted`
  INTO current_stock, product_deleted
  FROM `product`
  WHERE `ProductID` = NEW.`ProductID`;

  IF current_stock IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product not found for this purchase.';
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
