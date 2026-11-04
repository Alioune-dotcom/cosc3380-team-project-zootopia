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

  // GET /api/reports/product-sales
  if (req.method === "GET" && pathname === "/api/reports/product-sales") {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM v_product_sales ORDER BY Revenue DESC`
      );
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get product sales report"
      });
    }
  }

  // GET /api/reports/customer-spending
  if (req.method === "GET" && pathname === "/api/reports/customer-spending") {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM v_customer_spending
         WHERE IsDeleted = 0
         ORDER BY LifetimeSpend DESC`
      );
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get customer spending report"
      });
    }
  }

  // GET /api/reports/revenue?startDate=&endDate=&paymentType=
  if (req.method === "GET" && pathname === "/api/reports/revenue") {
    try {
      let sql = `
        SELECT
          DATE(t.Date) AS SaleDate,
          t.PaymentType,
          COUNT(DISTINCT t.TransactionID) AS SaleCount,
          COALESCE(SUM(vt.TotalAmount), 0) AS Revenue
        FROM \`transaction\` t
        LEFT JOIN v_transaction_totals vt ON vt.TransactionID = t.TransactionID
        WHERE 1=1
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
      if (filters.paymentType) {
        sql += " AND t.PaymentType = ?";
        params.push(filters.paymentType);
      }

      sql += " GROUP BY DATE(t.Date), t.PaymentType ORDER BY SaleDate DESC";
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
          COUNT(te.TransactionID) AS VisitCount
        FROM enclosure e
        LEFT JOIN transaction_enclosure te
          ON te.EnclosureID = e.EnclosureID
        LEFT JOIN \`transaction\` t
          ON t.TransactionID = te.TransactionID
        WHERE e.IsDeleted = 0
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

      sql += `
        GROUP BY e.EnclosureID, e.Name, e.Location
        ORDER BY VisitCount DESC
      `;
      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get most-visited report" });
    }
  }

  return sendJson(res, 404, { error: "Report not found" });
}

module.exports = { handleReports };
