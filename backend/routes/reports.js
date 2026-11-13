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
        LEFT JOIN (
          transactionproduct tp
          JOIN \`transaction\` t
            ON t.TransactionID = tp.TransactionID
      `;
      const params = [];

      // date range goes in the join, so products with no sales in the range
      // still show up with 0 instead of disappearing
      if (filters.startDate) {
        sql += " AND DATE(t.Date) >= ?";
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += " AND DATE(t.Date) <= ?";
        params.push(filters.endDate);
      }

      sql += `
        ) ON tp.ProductID = p.ProductID
        WHERE p.IsDeleted = 0
          AND s.IsDeleted = 0
      `;

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

  // GET /api/reports/revenue/details
  // Returns individual transactions with their ticket and product details.
  if (
    req.method === "GET" &&
    pathname === "/api/reports/revenue/details"
  ) {
    try {
      const customerId = url.searchParams.get("customerId");
      const shopId = url.searchParams.get("shopId");
      const productName = url.searchParams.get("productName");
      const ticketType = url.searchParams.get("ticketType");

      // Get matching transactions.
      let sql = `
        SELECT
          t.TransactionID,
          t.Date AS SaleDate,
          t.CustomerID,
          COALESCE(c.Email, t.ReceiptEmail) AS CustomerEmail,
          CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
          s.Name AS ShopName,
          t.PaymentType
        FROM \`transaction\` t
        LEFT JOIN customer c
          ON c.CustomerID = t.CustomerID
        LEFT JOIN shop s
          ON s.ShopID = t.ShopID
        LEFT JOIN employee e
          ON e.EmployeeID = t.EmployeeID
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

      if (customerId) {
        sql += " AND t.CustomerID = ?";
        params.push(customerId);
      }

      if (shopId) {
        sql += " AND t.ShopID = ?";
        params.push(shopId);
      }

      // Match the existing revenue report's OR behavior.
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

      sql += " ORDER BY t.Date DESC, t.TransactionID DESC";

      const [transactions] = await pool.query(sql, params);

      if (transactions.length === 0) {
        return sendJson(res, 200, []);
      }

      const transactionIds = transactions.map(
        (transaction) => transaction.TransactionID
      );

      const placeholders = transactionIds.map(() => "?").join(",");

      // Get ticket details separately.
      // If filtering by product only, do not include ticket revenue.
      let tickets = [];

      if (!productName || ticketType) {
        let ticketSql = `
          SELECT
            TransactionID,
            Type AS TicketType,
            Quantity,
            UnitPrice
          FROM ticket
          WHERE TransactionID IN (${placeholders})
        `;

        const ticketParams = [...transactionIds];

        if (ticketType) {
          ticketSql += " AND Type = ?";
          ticketParams.push(ticketType);
        }

        const [ticketRows] = await pool.query(
          ticketSql,
          ticketParams
        );

        tickets = ticketRows;
      }

      // Get product details separately.
      // If filtering by ticket only, do not include product revenue.
      let products = [];

      if (!ticketType || productName) {
        let productSql = `
          SELECT
            tp.TransactionID,
            tp.ProductID,
            p.Name AS ProductName,
            tp.Quantity,
            tp.UnitPrice
          FROM transactionproduct tp
          LEFT JOIN product p
            ON p.ProductID = tp.ProductID
          WHERE tp.TransactionID IN (${placeholders})
        `;

        const productParams = [...transactionIds];

        if (productName) {
          productSql += `
            AND p.Name = ?
            AND p.IsDeleted = 0
          `;
          productParams.push(productName);
        }

        const [productRows] = await pool.query(
          productSql,
          productParams
        );

        products = productRows;
      }

      // Attach item details and calculate each transaction total.
      const details = transactions.map((transaction) => {
        const transactionTickets = tickets.filter(
          (item) =>
            item.TransactionID === transaction.TransactionID
        );

        const transactionProducts = products.filter(
          (item) =>
            item.TransactionID === transaction.TransactionID
        );

        const ticketTotal = transactionTickets.reduce(
          (sum, item) =>
            sum + Number(item.Quantity) * Number(item.UnitPrice),
          0
        );

        const productTotal = transactionProducts.reduce(
          (sum, item) =>
            sum + Number(item.Quantity) * Number(item.UnitPrice),
          0
        );

        const ticketDetails = transactionTickets.map(
          (item) =>
            `${item.TicketType} x${item.Quantity} ($${Number(item.UnitPrice).toFixed(2)} each)`
        );

        const productDetails = transactionProducts.map(
          (item) =>
            `${item.ProductName || `Product #${item.ProductID}`} x${item.Quantity} ($${Number(item.UnitPrice).toFixed(2)} each)`
        );

        return {
          ...transaction,
          TicketDetails: ticketDetails.join("; ") || "—",
          ProductDetails: productDetails.join("; ") || "—",
          TotalAmount: ticketTotal + productTotal
        };
      });

      return sendJson(res, 200, details);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, {
        error: "Could not get detailed revenue report"
      });
    }
  }

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




  // GET /api/reports/visitor-activity
  // ?startDate=&endDate=&ticketType=&enclosureId=&habitatType=
  if (req.method === "GET" && pathname === "/api/reports/visitor-activity") {
    try {
      const ticketType = url.searchParams.get("ticketType");
      const enclosureId = url.searchParams.get("enclosureId");
      const habitatType = url.searchParams.get("habitatType");

      // Ticket popularity
      let ticketSql = `
        SELECT
          tk.Type AS TicketType,
          COALESCE(SUM(tk.Quantity), 0) AS TicketsSold
        FROM ticket tk
        JOIN \`transaction\` t
          ON t.TransactionID = tk.TransactionID
        JOIN customer c
          ON c.CustomerID = t.CustomerID
        WHERE t.CustomerID IS NOT NULL
          AND c.IsDeleted = 0
      `;
      const ticketParams = [];

      if (filters.startDate) {
        ticketSql += " AND DATE(t.Date) >= ?";
        ticketParams.push(filters.startDate);
      }

      if (filters.endDate) {
        ticketSql += " AND DATE(t.Date) <= ?";
        ticketParams.push(filters.endDate);
      }

      if (ticketType) {
        ticketSql += " AND tk.Type = ?";
        ticketParams.push(ticketType);
      }

      ticketSql += `
        GROUP BY tk.Type
        ORDER BY TicketsSold DESC
      `;

      const [ticketRows] = await pool.query(ticketSql, ticketParams);

      // Individual ticket purchase details
      let ticketDetailsSql = `
      SELECT
        tk.TicketID,
        t.TransactionID,
        t.Date AS PurchaseDate,
        c.Email AS CustomerEmail,
        tk.Type AS TicketType,
        tk.Quantity,
        tk.UnitPrice,
        (tk.Quantity * tk.UnitPrice) AS TotalPrice
      FROM ticket tk
      JOIN \`transaction\` t
        ON t.TransactionID = tk.TransactionID
      JOIN customer c
        ON c.CustomerID = t.CustomerID
      WHERE t.CustomerID IS NOT NULL
      AND c.IsDeleted = 0
    `;

      const ticketDetailsParams = [];

      if (filters.startDate) {
        ticketDetailsSql += " AND DATE(t.Date) >= ?";
        ticketDetailsParams.push(filters.startDate);
      }

      if (filters.endDate) {
        ticketDetailsSql += " AND DATE(t.Date) <= ?";
        ticketDetailsParams.push(filters.endDate);
      }

      if (ticketType) {
        ticketDetailsSql += " AND tk.Type = ?";
        ticketDetailsParams.push(ticketType);
      }

      ticketDetailsSql += `
      ORDER BY t.Date DESC, t.TransactionID DESC
      `;

      const [ticketDetailRows] = await pool.query(
        ticketDetailsSql,
        ticketDetailsParams
      );

      // Unique customers who purchased tickets
      let customerSql = `
        SELECT COUNT(DISTINCT t.CustomerID) AS UniqueCustomers
        FROM \`transaction\` t
        JOIN ticket tk
          ON tk.TransactionID = t.TransactionID
        JOIN customer c
          ON c.CustomerID = t.CustomerID
        WHERE t.CustomerID IS NOT NULL
          AND c.IsDeleted = 0
      `;
      const customerParams = [];

      if (filters.startDate) {
        customerSql += " AND DATE(t.Date) >= ?";
        customerParams.push(filters.startDate);
      }

      if (filters.endDate) {
        customerSql += " AND DATE(t.Date) <= ?";
        customerParams.push(filters.endDate);
      }

      if (ticketType) {
        customerSql += " AND tk.Type = ?";
        customerParams.push(ticketType);
      }

      const [customerRows] = await pool.query(customerSql, customerParams);

      // Planned enclosure visits
      let enclosureSql = `
        SELECT
          e.EnclosureID,
          e.Name AS EnclosureName,
          e.Location,
          e.HabitatType,
          COUNT(DISTINCT te.TransactionID) AS VisitCount,
          COUNT(DISTINCT t.CustomerID) AS UniqueCustomers
        FROM transaction_enclosure te
        JOIN \`transaction\` t
          ON t.TransactionID = te.TransactionID
        JOIN customer c
          ON c.CustomerID = t.CustomerID
        JOIN enclosure e
          ON e.EnclosureID = te.EnclosureID
        WHERE t.CustomerID IS NOT NULL
          AND c.IsDeleted = 0
          AND e.IsDeleted = 0
          AND e.EnclosureID <> 6
      `;
      const enclosureParams = [];

      if (filters.startDate) {
        enclosureSql += " AND DATE(t.Date) >= ?";
        enclosureParams.push(filters.startDate);
      }

      if (filters.endDate) {
        enclosureSql += " AND DATE(t.Date) <= ?";
        enclosureParams.push(filters.endDate);
      }

      if (enclosureId) {
        enclosureSql += " AND e.EnclosureID = ?";
        enclosureParams.push(enclosureId);
      }

      if (habitatType) {
        enclosureSql += " AND e.HabitatType = ?";
        enclosureParams.push(habitatType);
      }

      enclosureSql += `
        GROUP BY
          e.EnclosureID,
          e.Name,
          e.Location,
          e.HabitatType
        ORDER BY VisitCount DESC
      `;

      const [enclosureRows] = await pool.query(
        enclosureSql,
        enclosureParams
      );

      // Individual planned enclosure visit details
      let visitDetailsSql = `
  SELECT
    CONCAT(te.TransactionID, '-', te.EnclosureID) AS VisitDetailID,
    t.TransactionID,
    t.Date AS VisitDate,
    c.Email AS CustomerEmail,
    e.Name AS EnclosureName,
    e.Location,
    e.HabitatType
  FROM transaction_enclosure te
  JOIN \`transaction\` t
    ON t.TransactionID = te.TransactionID
  JOIN customer c
    ON c.CustomerID = t.CustomerID
  JOIN enclosure e
    ON e.EnclosureID = te.EnclosureID
  WHERE t.CustomerID IS NOT NULL
    AND c.IsDeleted = 0
    AND e.IsDeleted = 0
    AND e.EnclosureID <> 6
`;

      const visitDetailsParams = [];

      if (filters.startDate) {
        visitDetailsSql += " AND DATE(t.Date) >= ?";
        visitDetailsParams.push(filters.startDate);
      }

      if (filters.endDate) {
        visitDetailsSql += " AND DATE(t.Date) <= ?";
        visitDetailsParams.push(filters.endDate);
      }

      if (enclosureId) {
        visitDetailsSql += " AND e.EnclosureID = ?";
        visitDetailsParams.push(enclosureId);
      }

      if (habitatType) {
        visitDetailsSql += " AND e.HabitatType = ?";
        visitDetailsParams.push(habitatType);
      }

      visitDetailsSql += `
      ORDER BY t.Date DESC, t.TransactionID DESC, e.Name
      `;

      const [visitDetailRows] = await pool.query(
        visitDetailsSql,
        visitDetailsParams
      );

      // Combine the results into one report
      const totalTicketsSold = ticketRows.reduce(
        (total, row) => total + Number(row.TicketsSold),
        0
      );

      const totalPlannedVisits = enclosureRows.reduce(
        (total, row) => total + Number(row.VisitCount),
        0
      );

      return sendJson(res, 200, {
        summary: {
          TotalTicketsSold: totalTicketsSold,
          UniqueCustomers: customerRows[0].UniqueCustomers,
          TotalPlannedVisits: totalPlannedVisits,
          MostPopularTicketType: ticketRows[0]?.TicketType || null,
          MostPopularEnclosure: enclosureRows[0]?.EnclosureName || null
        },
        ticketPopularity: ticketRows,
        plannedVisits: enclosureRows,
        ticketDetails: ticketDetailRows,
        plannedVisitDetails: visitDetailRows
      });

    } catch (error) {
      console.error(error);
      return sendJson(res, 500, {
        error: "Could not get visitor activity report"
      });
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
      const searchParams = new URL(req.url, "http://localhost").searchParams;

      const speciesId = searchParams.get("speciesId");
      const enclosureId = searchParams.get("enclosureId");
      const sex = searchParams.get("sex");
      const healthStatus = searchParams.get("healthStatus");

      // Build shared filters using parameterized SQL.
      const filterConditions = [];
      const filterParams = [];

      if (speciesId) {
        filterConditions.push("a.SpeciesID = ?");
        filterParams.push(speciesId);
      }

      if (enclosureId) {
        filterConditions.push("a.EnclosureID = ?");
        filterParams.push(enclosureId);
      }

      if (sex) {
        filterConditions.push("a.Sex = ?");
        filterParams.push(sex);
      }

      if (healthStatus === "healthy") {
        filterConditions.push("a.IsSick = 0");
      } else if (healthStatus === "sick") {
        filterConditions.push("a.IsSick = 1");
      }

      const filterSql = filterConditions.length
        ? ` AND ${filterConditions.join(" AND ")}`
        : "";

      // Overall population and health summary.
      const [summaryRows] = await pool.query(
        `
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
          ${filterSql}
      `,
        [...filterParams]
      );

      // Population by species.
      const [speciesRows] = await pool.query(
        `
        SELECT
          s.CommonName,
          s.ConservationStatus,
          COUNT(filtered.AnimalID) AS AnimalCount
        FROM species s
        LEFT JOIN (
          SELECT
            a.AnimalID,
            a.SpeciesID
          FROM animal a
          JOIN species s2 ON s2.SpeciesID = a.SpeciesID
          JOIN enclosure e2 ON e2.EnclosureID = a.EnclosureID
          WHERE a.IsDeleted = 0
            AND s2.IsDeleted = 0
            AND e2.IsDeleted = 0
            ${filterSql}
        ) filtered ON filtered.SpeciesID = s.SpeciesID
        WHERE s.IsDeleted = 0
          ${speciesId ? "AND s.SpeciesID = ?" : ""}
        GROUP BY s.SpeciesID, s.CommonName, s.ConservationStatus
        ORDER BY AnimalCount DESC, s.CommonName
      `,
        [
          ...filterParams,
          ...(speciesId ? [speciesId] : [])
        ]
      );

      // Population by enclosure.
      const [enclosureRows] = await pool.query(
        `
        SELECT
          e.Name AS EnclosureName,
          e.HabitatType,
          e.Capacity,
          COUNT(filtered.AnimalID) AS AnimalCount,
          GREATEST(e.Capacity - COUNT(filtered.AnimalID), 0) AS RemainingCapacity,
          ROUND(
            COUNT(filtered.AnimalID) * 100.0 / NULLIF(e.Capacity, 0),
            1
          ) AS CapacityPercentage
        FROM enclosure e
        LEFT JOIN (
          SELECT
            a.AnimalID,
            a.EnclosureID
          FROM animal a
          JOIN species s2 ON s2.SpeciesID = a.SpeciesID
          JOIN enclosure e2 ON e2.EnclosureID = a.EnclosureID
          WHERE a.IsDeleted = 0
            AND s2.IsDeleted = 0
            AND e2.IsDeleted = 0
            ${filterSql}
        ) filtered ON filtered.EnclosureID = e.EnclosureID
        WHERE e.IsDeleted = 0
          ${enclosureId ? "AND e.EnclosureID = ?" : ""}
        GROUP BY e.EnclosureID, e.Name, e.HabitatType, e.Capacity
        ORDER BY AnimalCount DESC, e.Name
      `,
        [
          ...filterParams,
          ...(enclosureId ? [enclosureId] : [])
        ]
      );

      // Population by sex.
      const [sexRows] = await pool.query(
        `
        SELECT
          a.Sex,
          COUNT(*) AS AnimalCount
        FROM animal a
        JOIN species s ON s.SpeciesID = a.SpeciesID
        JOIN enclosure e ON e.EnclosureID = a.EnclosureID
        WHERE a.IsDeleted = 0
          AND s.IsDeleted = 0
          AND e.IsDeleted = 0
          ${filterSql}
        GROUP BY a.Sex
        ORDER BY a.Sex
      `,
        [...filterParams]
      );

      // Individual animal details
      const [detailRows] = await pool.query(
        `
        SELECT
        a.AnimalID,
        a.Name,
        s.CommonName,
        e.Name AS EnclosureName,
        a.Sex,
        CASE
          WHEN a.IsSick = 1 THEN 'Sick'
          ELSE 'Healthy'
        END AS HealthStatus
      FROM animal a
      JOIN species s ON s.SpeciesID = a.SpeciesID
      JOIN enclosure e ON e.EnclosureID = a.EnclosureID
      WHERE a.IsDeleted = 0
        AND s.IsDeleted = 0
        AND e.IsDeleted = 0
        ${filterSql}
      ORDER BY s.CommonName, a.Name
      `,
        [...filterParams]
      );


      // Average enclosure occupancy (independent of animal filters).
      const [occupancyRows] = await pool.query(
        `
        SELECT
          COUNT(*) AS TotalEnclosures,
          COALESCE(SUM(AnimalCount), 0) AS OccupiedAnimals,
          COALESCE(SUM(Capacity), 0) AS TotalCapacity,
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN Capacity > 0
                  THEN AnimalCount * 100.0 / Capacity
                END
              ),
              1
            ),
            0
          ) AS AverageOccupancy
        FROM (
          SELECT
            e.EnclosureID,
            e.Capacity,
            COUNT(a.AnimalID) AS AnimalCount
          FROM enclosure e
          LEFT JOIN animal a
            ON a.EnclosureID = e.EnclosureID
            AND a.IsDeleted = 0
            AND EXISTS (
              SELECT 1
              FROM species s
              WHERE s.SpeciesID = a.SpeciesID
                AND s.IsDeleted = 0
            )
          WHERE e.IsDeleted = 0
            ${enclosureId ? "AND e.EnclosureID = ?" : ""}
          GROUP BY e.EnclosureID, e.Capacity
        ) occupancy
      `,
        enclosureId ? [enclosureId] : []
      );


      return sendJson(res, 200, {
        summary: summaryRows[0],
        bySpecies: speciesRows,
        byEnclosure: enclosureRows,
        bySex: sexRows,
        occupancy: occupancyRows[0],
        details: detailRows
      });

    } catch (error) {
      console.error(error);
      return sendJson(res, 500, {
        error: "Could not get animal population report"
      });
    }
  }

  return sendJson(res, 404, { error: "Report not found" });
}

module.exports = { handleReports };
