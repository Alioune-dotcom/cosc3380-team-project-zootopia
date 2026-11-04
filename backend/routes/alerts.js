const pool = require("../db");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function handleAlerts(req, res, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[2];
  const action = parts[3];

  // GET /api/alerts
  if (req.method === "GET" && !id) {
    try {
      const [rows] = await pool.query(
        `SELECT AlertID, AlertType, Message, ProductID, AnimalID, CreatedAt, IsRead
         FROM alert
         ORDER BY IsRead ASC, CreatedAt DESC`
      );
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get alerts" });
    }
  }

  // GET /api/alerts/unread-count
  if (req.method === "GET" && id === "unread-count") {
    try {
      const [rows] = await pool.query(
        "SELECT COUNT(*) AS UnreadCount FROM alert WHERE IsRead = 0"
      );
      return sendJson(res, 200, { unreadCount: rows[0].UnreadCount });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get unread count" });
    }
  }

  // PUT /api/alerts/:id/read
  if (req.method === "PUT" && id && action === "read") {
    try {
      const [result] = await pool.query(
        "UPDATE alert SET IsRead = 1 WHERE AlertID = ?",
        [id]
      );
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Alert not found" });
      }
      return sendJson(res, 200, { message: "Alert marked read" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not update alert" });
    }
  }

  // PUT /api/alerts/read-all
  if (req.method === "PUT" && id === "read-all") {
    try {
      await pool.query("UPDATE alert SET IsRead = 1 WHERE IsRead = 0");
      return sendJson(res, 200, { message: "All alerts marked read" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not update alerts" });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleAlerts };
