const pool = require("../db");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(data));
}

function getDateFilters(url) {
  return {
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate"),
    paymentType: url.searchParams.get("paymentType"),
    scope: url.searchParams.get("scope"),
    enclosureId: url.searchParams.get("enclosureId")
  };
}

async function handleReports(req, res, pathname) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const filters = getDateFilters(url);

  // GET /api/reports/enclosure-occupancy
  if (req.method === "GET" && pathname === "/api/reports/enclosure-occupancy") {
    try {
      let sql = `SELECT * FROM v_enclosure_occupancy WHERE 1=1`;
      const params = [];

      if (filters.enclosureId) {
        sql += " AND EnclosureID = ?";
        params.push(filters.enclosureId);
      }

      sql += " ORDER BY CapacityPercentage DESC";
      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get enclosure occupancy report"
      });
    }
  }


  // GET /api/reports/product-sales?startDate=&endDate=&shopId=&productId=
  if (req.method === "GET" && pathname === "/api/reports/product-sales") {
    try {
      let sql = `
        SELECT
          p.ProductID,
          p.Name,
          p.ShopID,
          COALESCE(SUM(tp.Quantity), 0) AS UnitsSold,
          COALESCE(SUM(tp.Quantity * tp.UnitPrice), 0) AS Revenue
        FROM product p
        JOIN shop s ON s.ShopID = p.ShopID
        LEFT JOIN transactionproduct tp
          ON tp.ProductID = p.ProductID
        LEFT JOIN \`transaction\` t
          ON t.TransactionID = tp.TransactionID
        WHERE p.IsDeleted = 0
          AND s.IsDeleted = 0
      `;
      const params = [];

      if (filters.startDate) {
        sql += " AND (t.Date IS NULL OR DATE(t.Date) >= ?)";
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += " AND (t.Date IS NULL OR DATE(t.Date) <= ?)";
        params.push(filters.endDate);
      }

      if (url.searchParams.get("shopId")) {
        sql += " AND p.ShopID = ?";
        params.push(url.searchParams.get("shopId"));
      }

      if (url.searchParams.get("productId")) {
        sql += " AND p.ProductID = ?";
        params.push(url.searchParams.get("productId"));
      }

      sql += `
        GROUP BY p.ProductID, p.Name, p.ShopID
        ORDER BY Revenue DESC
      `;

      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get product sales report"
      });
    }
  }


  // GET /api/reports/customer-spending?startDate=&endDate=&customerId=
  if (req.method === "GET" && pathname === "/api/reports/customer-spending") {
    try {
      let sql = `
        SELECT
          c.CustomerID,
          c.Email,
          COUNT(vt.TransactionID) AS TransactionCount,
          COALESCE(SUM(vt.TotalAmount), 0) AS LifetimeSpend
        FROM customer c
        LEFT JOIN v_transaction_totals vt
          ON vt.CustomerID = c.CustomerID
      `;
      const params = [];

      if (filters.startDate) {
        sql += " AND DATE(vt.Date) >= ?";
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += " AND DATE(vt.Date) <= ?";
        params.push(filters.endDate);
      }

      sql += " WHERE c.IsDeleted = 0";

      const customerId = url.searchParams.get("customerId");

      if (customerId) {
        sql += " AND c.CustomerID = ?";
        params.push(customerId);
      }

      sql += `
        GROUP BY c.CustomerID, c.Email
        ORDER BY LifetimeSpend DESC
      `;

      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get customer spending report"
      });
    }
  }

    // GET /api/reports/revenue?startDate=&endDate=&paymentType=&customerId=&shopId=&productId=&ticketType=
  if (req.method === "GET" && pathname === "/api/reports/revenue") {
    try {
      const customerId = url.searchParams.get("customerId");
      const shopId = url.searchParams.get("shopId");
      const productName = url.searchParams.get("productName");
      const ticketType = url.searchParams.get("ticketType");

      // If a product is selected, count only that product.
      // If a ticket type is selected, count only that ticket type.
      // If neither is selected, count all products and tickets.
      const productRevenue = productName
  ? `COALESCE((
      SELECT SUM(tp.Quantity * tp.UnitPrice)
      FROM transactionproduct tp
      JOIN product p ON p.ProductID = tp.ProductID
      WHERE tp.TransactionID = t.TransactionID
        AND p.Name = ?
        AND p.IsDeleted = 0
    ), 0)`
  : ticketType
    ? "0"
    : `COALESCE((
        SELECT SUM(tp.Quantity * tp.UnitPrice)
        FROM transactionproduct tp
        WHERE tp.TransactionID = t.TransactionID
      ), 0)`;

      const ticketRevenue = ticketType
  ? `COALESCE((
      SELECT SUM(tk.Quantity * tk.UnitPrice)
      FROM ticket tk
      WHERE tk.TransactionID = t.TransactionID
        AND tk.Type = ?
    ), 0)`
  : productName
    ? "0"
    : `COALESCE((
        SELECT SUM(tk.Quantity * tk.UnitPrice)
        FROM ticket tk
        WHERE tk.TransactionID = t.TransactionID
      ), 0)`;

      let sql = `
        SELECT
          DATE(t.Date) AS SaleDate,
          t.PaymentType,
          COUNT(DISTINCT t.TransactionID) AS SaleCount,
          COALESCE(SUM(${productRevenue} + ${ticketRevenue}), 0) AS Revenue
        FROM \`transaction\` t
        WHERE 1=1
      `;

      // Parameters for the revenue subqueries appear first in the SQL.
      const params = [];

      if (productName) params.push(productName);
      if (ticketType) params.push(ticketType);

      if (filters.startDate) {
        sql += " AND DATE(t.Date) >= ?";
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += " AND DATE(t.Date) <= ?";
        params.push(filters.endDate);
      }

      if (filters.paymentType) {
        sql += " AND t.PaymentType = ?";
        params.push(filters.paymentType);
      }

      if (customerId) {
        sql += " AND t.CustomerID = ?";
        params.push(customerId);
      }

      if (shopId) {
        sql += " AND t.ShopID = ?";
        params.push(shopId);
      }

      // When product and/or ticket type is selected, include only
      // transactions containing at least one matching item.
      const matchingConditions = [];
      const matchingParams = [];

      if (productName) {
  matchingConditions.push(`
    EXISTS (
      SELECT 1
      FROM transactionproduct tp
      JOIN product p ON p.ProductID = tp.ProductID
      WHERE tp.TransactionID = t.TransactionID
        AND p.Name = ?
        AND p.IsDeleted = 0
    )
  `);
  matchingParams.push(productName);
}

      if (ticketType) {
        matchingConditions.push(`
          EXISTS (
            SELECT 1
            FROM ticket tk
            WHERE tk.TransactionID = t.TransactionID
              AND tk.Type = ?
          )
        `);
        matchingParams.push(ticketType);
      }

      if (matchingConditions.length > 0) {
        sql += ` AND (${matchingConditions.join(" OR ")})`;
        params.push(...matchingParams);
      }

      sql += `
        GROUP BY DATE(t.Date), t.PaymentType
        ORDER BY SaleDate DESC
      `;

      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get revenue report" });
    }
  }

  // GET /api/reports/closures?startDate=&endDate=&scope=
  if (req.method === "GET" && pathname === "/api/reports/closures") {
    try {
      let sql = `
        SELECT
          z.ClosureID,
          z.Date,
          z.Reason,
          z.Scope,
          z.EnclosureID,
          e.Name AS EnclosureName
        FROM zooclosure z
        LEFT JOIN enclosure e ON e.EnclosureID = z.EnclosureID
        WHERE 1=1
      `;
      const params = [];

      if (filters.startDate) {
        sql += " AND z.Date >= ?";
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        sql += " AND z.Date <= ?";
        params.push(filters.endDate);
      }
      if (filters.scope) {
        sql += " AND z.Scope = ?";
        params.push(filters.scope);
      }

      sql += " ORDER BY z.Date DESC";
      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get closures report" });
    }
  }


  // GET /api/reports/most-visited?startDate=&endDate=
  if (req.method === "GET" && pathname === "/api/reports/most-visited") {
    try {
      let sql = `
        SELECT
          e.EnclosureID,
          e.Name AS EnclosureName,
          e.Location,
          COUNT(t.TransactionID) AS VisitCount
        FROM enclosure e
        LEFT JOIN transaction_enclosure te
          ON te.EnclosureID = e.EnclosureID
        LEFT JOIN \`transaction\` t
          ON t.TransactionID = te.TransactionID
      `;
      const params = [];

      if (filters.startDate) {
        sql += " AND DATE(t.Date) >= ?";
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += " AND DATE(t.Date) <= ?";
        params.push(filters.endDate);
      }

      sql += `
        WHERE e.IsDeleted = 0
          AND e.EnclosureID <> 6
        GROUP BY e.EnclosureID, e.Name, e.Location
        ORDER BY VisitCount DESC
      `;
      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get most-visited report"
      });
    }
  }

    // GET /api/reports/animal-population
  if (req.method === "GET" && pathname === "/api/reports/animal-population") {
    try {
      const [summaryRows] = await pool.query(`
        SELECT
          COUNT(*) AS TotalAnimals,
          COALESCE(SUM(a.IsSick = 0), 0) AS HealthyAnimals,
          COALESCE(SUM(a.IsSick = 1), 0) AS SickAnimals
        FROM animal a
        JOIN species s ON s.SpeciesID = a.SpeciesID
        JOIN enclosure e ON e.EnclosureID = a.EnclosureID
        WHERE a.IsDeleted = 0
          AND s.IsDeleted = 0
          AND e.IsDeleted = 0
      `);

      const [speciesRows] = await pool.query(`
        SELECT
          s.CommonName,
          s.ConservationStatus,
          COUNT(a.AnimalID) AS AnimalCount
        FROM species s
        LEFT JOIN animal a
          ON a.SpeciesID = s.SpeciesID
          AND a.IsDeleted = 0
        WHERE s.IsDeleted = 0
        GROUP BY s.SpeciesID, s.CommonName, s.ConservationStatus
        ORDER BY AnimalCount DESC, s.CommonName
      `);

      const [enclosureRows] = await pool.query(`
        SELECT
          e.Name AS EnclosureName,
          e.HabitatType,
          COUNT(a.AnimalID) AS AnimalCount
        FROM enclosure e
        LEFT JOIN animal a
          ON a.EnclosureID = e.EnclosureID
          AND a.IsDeleted = 0
        WHERE e.IsDeleted = 0
        GROUP BY e.EnclosureID, e.Name, e.HabitatType
        ORDER BY AnimalCount DESC, e.Name
      `);

      return sendJson(res, 200, {
        summary: summaryRows[0],
        bySpecies: speciesRows,
        byEnclosure: enclosureRows
      });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get animal population report"
      });
    }
  }

  return sendJson(res, 404, { error: "Report not found" });
}

module.exports = { handleReports };
