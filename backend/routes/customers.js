const pool = require("../db");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleCustomers(req, res, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[2];

  // GET /api/customers
  if (req.method === "GET" && !id) {
    try {
      const [rows] = await pool.query(
        `SELECT
           c.CustomerID,
           c.Email,
           u.Username,
           COALESCE(vs.LifetimeSpend, 0) AS LifetimeSpend,
           COALESCE(vs.TransactionCount, 0) AS TransactionCount
         FROM customer c
         LEFT JOIN users u ON u.CustomerID = c.CustomerID AND u.IsDeleted = 0
         LEFT JOIN v_customer_spending vs ON vs.CustomerID = c.CustomerID
         WHERE c.IsDeleted = 0
         ORDER BY c.Email`
      );
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get customers" });
    }
  }

  // GET /api/customers/:id
  if (req.method === "GET" && id) {
    try {
      const [rows] = await pool.query(
        `SELECT c.CustomerID, c.Email, u.Username
         FROM customer c
         LEFT JOIN users u ON u.CustomerID = c.CustomerID AND u.IsDeleted = 0
         WHERE c.CustomerID = ? AND c.IsDeleted = 0`,
        [id]
      );
      if (rows.length === 0) {
        return sendJson(res, 404, { error: "Customer not found" });
      }
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get customer" });
    }
  }

  // POST /api/customers
  if (req.method === "POST" && !id) {
    let connection;
    try {
      const body = await readBody(req);
      const email = (body.Email || "").trim();
      const username = (body.Username || "").trim();
      const password = body.Password;

      if (!email || !username || !password) {
        return sendJson(res, 400, { error: "Email, Username, and Password required" });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [custResult] = await connection.query(
        "INSERT INTO customer (Email) VALUES (?)",
        [email]
      );
      const customerId = custResult.insertId;

      await connection.query(
        `INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
         VALUES (?, ?, 'Customer', NULL, ?)`,
        [username, password, customerId]
      );

      await connection.commit();
      connection.release();
      return sendJson(res, 201, { CustomerID: customerId });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
          connection.release();
        } catch (rollbackError) {
          console.error(rollbackError.message);
        }
      }
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // PUT /api/customers/:id
  if (req.method === "PUT" && id) {
    try {
      const body = await readBody(req);
      const email = (body.Email || "").trim();
      if (!email) {
        return sendJson(res, 400, { error: "Email is required" });
      }

      const [result] = await pool.query(
        "UPDATE customer SET Email = ? WHERE CustomerID = ? AND IsDeleted = 0",
        [email, id]
      );
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Customer not found" });
      }
      return sendJson(res, 200, { message: "Customer updated" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // DELETE /api/customers/:id
  if (req.method === "DELETE" && id) {
    try {
      const [result] = await pool.query(
        "UPDATE customer SET IsDeleted = 1 WHERE CustomerID = ? AND IsDeleted = 0",
        [id]
      );
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Customer not found" });
      }
      await pool.query(
        "UPDATE users SET IsDeleted = 1 WHERE CustomerID = ? AND IsDeleted = 0",
        [id]
      );
      return sendJson(res, 200, { message: "Customer deleted" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not delete customer" });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleCustomers };
