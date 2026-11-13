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



async function handleClosures(req, res, pathname) {
  // /api/closures or /api/closures/1
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[2];



  // GET /api/closures/today — is the whole zoo closed today? (tickets are for today only)
  if (req.method === "GET" && id === "today") {
    try {
      const [rows] = await pool.query(
        `SELECT Reason FROM zooclosure
        WHERE \`Date\` = DATE(
        CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )
        AND Scope = 'FullZoo'
        LIMIT 1`
      );
      return sendJson(res, 200, {
        fullZooClosed: rows.length > 0,
        reason: rows.length > 0 ? rows[0].Reason : null
      });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not check today's closures" });
    }
  }

  // GET /api/closures
  if (req.method === "GET" && !id) {
    try {
      const [rows] = await pool.query("SELECT * FROM zooclosure");
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get closures" });
    }
  }


  // GET /api/closures/:id
  if (req.method === "GET" && id) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM zooclosure WHERE ClosureID = ?",
        [id]
      );
      if (rows.length === 0) {
        return sendJson(res, 404, { error: "Closure not found" });
      }
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get closure" });
    }
  }




  // POST /api/closures
  if (req.method === "POST" && !id) {
    try {
      const body = await readBody(req);
      const { Date, Reason, Scope, EnclosureID } = body;

      if (!Date || !Reason || !Scope) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }
      if (Scope === "FullZoo" && EnclosureID != null) {
        return sendJson(res, 400, { error: "FullZoo closure cannot have EnclosureID" });
      }
      if (Scope === "Enclosure" && EnclosureID == null) {
        return sendJson(res, 400, { error: "Enclosure closure needs EnclosureID" });
      }

      // save the closure history row
      const [result] = await pool.query(
        `INSERT INTO zooclosure (\`Date\`, Reason, Scope, EnclosureID)
       VALUES (?, ?, ?, ?)`,
        [Date, Reason, Scope, EnclosureID ?? null]
      );

      // also update live enclosure Status, but only for a closure dated TODAY.
      // future closures must not close anything early; v_enclosure_open_today and the
      // attraction triggers already check zooclosure by date when that day comes.
      if (Scope === "FullZoo") {
        await pool.query(
          `UPDATE enclosure
        SET Status = 'Closed'
        WHERE IsDeleted = 0
        AND DATE(?) = DATE(
          CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )`,
          [Date]
        );
      } else if (Scope === "Enclosure") {
        await pool.query(
          `UPDATE enclosure
        SET Status = 'Closed'
        WHERE EnclosureID = ?
        AND IsDeleted = 0
        AND DATE(?) = DATE(
          CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )`,
          [EnclosureID, Date]
        );
      }

      return sendJson(res, 201, { ClosureID: result.insertId });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }


  // PUT /api/closures/:id
  if (req.method === "PUT" && id) {
    try {
      const body = await readBody(req);
      const { Date, Reason, Scope, EnclosureID } = body;
      if (Scope === "FullZoo" && EnclosureID != null) {
        return sendJson(res, 400, { error: "FullZoo closure cannot have EnclosureID" });
      }
      if (Scope === "Enclosure" && EnclosureID == null) {
        return sendJson(res, 400, { error: "Enclosure closure needs EnclosureID" });
      }


      const [result] = await pool.query(
        `UPDATE zooclosure
         SET \`Date\` = ?, Reason = ?, Scope = ?, EnclosureID = ?
         WHERE ClosureID = ?`,
        [Date, Reason, Scope, EnclosureID ?? null, id]
      );
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Closure not found" });
      }
      return sendJson(res, 200, { message: "Closure updated" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }


  // DELETE /api/closures/:id
  if (req.method === "DELETE" && id) {
    try {
      const [result] = await pool.query(
        "DELETE FROM zooclosure WHERE ClosureID = ?",
        [id]
      );
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Closure not found" });
      }
      return sendJson(res, 200, { message: "Closure deleted" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not delete closure" });
    }
  }
  sendJson(res, 404, { error: "Route not found" });
}
module.exports = { handleClosures };