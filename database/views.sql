-- Views for final_zoo_db
-- Run after final_zoo_db.sql (and seed if you want data in reports)

USE final_zoo_db;

DROP VIEW IF EXISTS v_transaction_totals;
DROP VIEW IF EXISTS v_customer_spending;
DROP VIEW IF EXISTS v_product_sales;
DROP VIEW IF EXISTS v_enclosure_occupancy;
DROP VIEW IF EXISTS v_low_stock;
DROP VIEW IF EXISTS v_closures_summary;
DROP VIEW IF EXISTS v_most_visited_enclosures;
DROP VIEW IF EXISTS v_revenue_summary;
DROP VIEW IF EXISTS v_sick_animals;
DROP VIEW IF EXISTS v_enclosure_open_today;

-- Total for each sale: tickets (qty * price) + products
-- Channel: Online if a customer is set, otherwise In person (cashier sale)
CREATE VIEW v_transaction_totals AS
SELECT
  t.TransactionID,
  t.CustomerID,
  t.EmployeeID,
  t.ShopID,
  CASE WHEN t.CustomerID IS NOT NULL THEN 'Online' ELSE 'In person' END AS Channel,
  t.Date,
  t.PaymentType,
  COALESCE((
    SELECT SUM(tk.Quantity * tk.UnitPrice)
    FROM ticket tk
    WHERE tk.TransactionID = t.TransactionID
  ), 0)
  + COALESCE((
    SELECT SUM(tp.Quantity * tp.UnitPrice)
    FROM transactionproduct tp
    WHERE tp.TransactionID = t.TransactionID
  ), 0) AS TotalAmount
FROM `transaction` t;

CREATE VIEW v_customer_spending AS
SELECT
  c.CustomerID,
  c.Email,
  c.IsDeleted,
  COUNT(vt.TransactionID) AS TransactionCount,
  COALESCE(SUM(vt.TotalAmount), 0) AS LifetimeSpend
FROM customer c
LEFT JOIN v_transaction_totals vt
  ON vt.CustomerID = c.CustomerID
GROUP BY
  c.CustomerID,
  c.Email,
  c.IsDeleted;

CREATE OR REPLACE VIEW v_product_sales AS
SELECT
  p.ProductID,
  p.Name,
  p.ShopID,
  IFNULL(SUM(tp.Quantity), 0) AS UnitsSold,
  IFNULL(SUM(tp.Quantity * tp.UnitPrice), 0.00) AS Revenue
FROM product p
LEFT JOIN transactionproduct tp
  ON tp.ProductID = p.ProductID
WHERE p.IsDeleted = 0
GROUP BY
  p.ProductID,
  p.Name,
  p.ShopID;

CREATE OR REPLACE VIEW v_enclosure_occupancy AS
SELECT
  e.EnclosureID,
  e.Name AS EnclosureName,
  e.Capacity,
  COUNT(a.AnimalID) AS AnimalCount,
  e.Capacity - COUNT(a.AnimalID) AS RemainingCapacity,
  ROUND(COUNT(a.AnimalID) * 100.0 / NULLIF(e.Capacity, 0), 2) AS CapacityPercentage
FROM enclosure e
LEFT JOIN animal a
  ON a.EnclosureID = e.EnclosureID
 AND a.IsDeleted = 0
WHERE e.IsDeleted = 0
GROUP BY
  e.EnclosureID,
  e.Name,
  e.Capacity;

CREATE OR REPLACE VIEW v_closures_summary AS
SELECT
  z.Scope,
  z.Reason,
  COUNT(*) AS ClosureCount,
  MIN(z.Date) AS FirstDate,
  MAX(z.Date) AS LastDate
FROM zooclosure z
GROUP BY
  z.Scope,
  z.Reason;

CREATE OR REPLACE VIEW v_most_visited_enclosures AS
SELECT
  e.EnclosureID,
  e.Name AS EnclosureName,
  e.Location,
  COUNT(te.TransactionID) AS VisitCount
FROM enclosure e
LEFT JOIN transaction_enclosure te
  ON te.EnclosureID = e.EnclosureID
WHERE e.IsDeleted = 0
GROUP BY
  e.EnclosureID,
  e.Name,
  e.Location;

CREATE OR REPLACE VIEW v_revenue_summary AS
SELECT
  DATE(t.Date) AS SaleDate,
  t.PaymentType,
  COUNT(DISTINCT t.TransactionID) AS SaleCount,
  COALESCE(SUM(vt.TotalAmount), 0) AS Revenue
FROM `transaction` t
LEFT JOIN v_transaction_totals vt
  ON vt.TransactionID = t.TransactionID
GROUP BY
  DATE(t.Date),
  t.PaymentType;

CREATE OR REPLACE VIEW v_sick_animals AS
SELECT
  a.AnimalID,
  a.Name AS AnimalName,
  s.CommonName AS Species,
  e.Name AS Enclosure,
  a.IsSick
FROM animal a
JOIN species s ON s.SpeciesID = a.SpeciesID
JOIN enclosure e ON e.EnclosureID = a.EnclosureID
WHERE a.IsDeleted = 0
  AND a.IsSick = 1;

-- The one shared "is it open today" rule.
-- An enclosure is open today if its Status is Open AND there is no closure today
-- for the whole zoo or for that enclosure. Customer pages + checkout use this.
CREATE VIEW v_enclosure_open_today AS
SELECT
  e.EnclosureID,
  e.Name,
  CASE
    WHEN e.Status = 'Open'
     AND NOT EXISTS (
       SELECT 1
       FROM zooclosure z
       WHERE z.Date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )
         AND (z.Scope = 'FullZoo' OR z.EnclosureID = e.EnclosureID)
     )
    THEN 1 ELSE 0
  END AS IsOpenToday
FROM enclosure e
WHERE e.IsDeleted = 0;
