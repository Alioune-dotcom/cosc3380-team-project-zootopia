const pool = require("../db");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function loadTransactionDetail(transactionId, customerId) {
  const [txRows] = await pool.query(
    `SELECT
       t.TransactionID,
       t.CustomerID,
       t.Date,
       t.PaymentType,
       COALESCE(vt.TotalAmount, 0) AS TotalAmount
     FROM \`transaction\` t
     LEFT JOIN v_transaction_totals vt
       ON vt.TransactionID = t.TransactionID
     WHERE t.TransactionID = ?
       AND t.CustomerID = ?`,
    [transactionId, customerId]
  );

  if (txRows.length === 0) {
    return null;
  }

  const row = txRows[0];

  const [tickets] = await pool.query(
    `SELECT TicketID, Type, Quantity, UnitPrice
     FROM ticket
     WHERE TransactionID = ?
     ORDER BY TicketID`,
    [transactionId]
  );

  const [products] = await pool.query(
    `SELECT
       tp.ProductID,
       p.Name AS ProductName,
       tp.Quantity,
       tp.UnitPrice
     FROM transactionproduct tp
     JOIN product p ON p.ProductID = tp.ProductID
     WHERE tp.TransactionID = ?`,
    [transactionId]
  );

  const [enclosures] = await pool.query(
    `SELECT e.EnclosureID, e.Name AS EnclosureName
     FROM transaction_enclosure te
     JOIN enclosure e ON e.EnclosureID = te.EnclosureID
     WHERE te.TransactionID = ?`,
    [transactionId]
  );

  return {
    transactionId: row.TransactionID,
    customerId: row.CustomerID,
    date: row.Date,
    paymentType: row.PaymentType,
    tickets,
    products,
    enclosures,
    totalAmount: row.TotalAmount
  };
}

async function handleTransactions(req, res, pathname) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const parts = pathname.split("/").filter(Boolean);
  // /api/my/transactions or /api/my/transactions/:id
  const detailId = parts[3];

  // GET /api/my/transactions/:id?customerId=1
  if (req.method === "GET" && detailId) {
    try {
      const customerId = url.searchParams.get("customerId");
      if (!customerId) {
        return sendJson(res, 400, { error: "customerId is required" });
      }

      const detail = await loadTransactionDetail(detailId, customerId);
      if (!detail) {
        return sendJson(res, 404, { error: "Transaction not found" });
      }
      return sendJson(res, 200, detail);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get transaction" });
    }
  }

  // GET /api/my/transactions?customerId=1
  if (req.method === "GET" && pathname === "/api/my/transactions") {
    try {
      const customerId = url.searchParams.get("customerId");

      if (!customerId) {
        return sendJson(res, 400, { error: "customerId is required" });
      }

      const [transactions] = await pool.query(
        `SELECT
           t.TransactionID,
           t.CustomerID,
           t.Date,
           t.PaymentType,
           COALESCE(vt.TotalAmount, 0) AS TotalAmount,
           (
             SELECT COALESCE(SUM(tk.Quantity), 0)
             FROM ticket tk
             WHERE tk.TransactionID = t.TransactionID
           ) AS TicketCount,
           (
             SELECT COALESCE(SUM(tp.Quantity), 0)
             FROM transactionproduct tp
             WHERE tp.TransactionID = t.TransactionID
           ) AS ProductCount
         FROM \`transaction\` t
         LEFT JOIN v_transaction_totals vt
           ON vt.TransactionID = t.TransactionID
         WHERE t.CustomerID = ?
         ORDER BY t.Date DESC`,
        [customerId]
      );

      const result = transactions.map((row) => ({
        transactionId: row.TransactionID,
        customerId: row.CustomerID,
        date: row.Date,
        paymentType: row.PaymentType,
        ticketCount: row.TicketCount,
        productCount: row.ProductCount,
        totalAmount: row.TotalAmount
      }));

      return sendJson(res, 200, result);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get transactions" });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleTransactions };
