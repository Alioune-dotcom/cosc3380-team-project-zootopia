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

// empty strings from the form become NULL
function optionalInt(value) {
  if (value === undefined || value === null || value === "") return null;
  return parseInt(value, 10);
}

async function handleAttractions(req, res, pathname) {
  // /api/attractions or /api/attractions/1
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[2];
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // GET /api/attractions          — staff: every attraction
  // GET /api/attractions?public=1 — customers: hides ones whose enclosure is
  //   closed, or that fall on a day the zoo / enclosure is closed
  if (req.method === "GET" && !id) {
    try {
      let sql = `
        SELECT
          a.AttractionID,
          a.Name,
          a.Type,
          a.Schedule,
          a.DurationMinutes,
          a.EnclosureID,
          e.Name AS EnclosureName,
          a.HostEmployeeID,
          CONCAT(h.FirstName, ' ', h.LastName) AS HostName
        FROM attraction a
        JOIN enclosure e ON e.EnclosureID = a.EnclosureID
        LEFT JOIN employee h ON h.EmployeeID = a.HostEmployeeID
        WHERE a.IsDeleted = 0
      `;

      if (url.searchParams.get("public") === "1") {
        sql += `
          AND e.IsDeleted = 0
          AND e.Status = 'Open'
          AND NOT EXISTS (
            SELECT 1 FROM zooclosure z
            WHERE z.Date = DATE(a.Schedule)
              AND (z.Scope = 'FullZoo' OR z.EnclosureID = a.EnclosureID)
          )
        `;
      }

      sql += " ORDER BY a.Schedule";
      const [rows] = await pool.query(sql);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get attractions" });
    }
  }

  // GET /api/attractions/:id
  if (req.method === "GET" && id) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM attraction WHERE AttractionID = ? AND IsDeleted = 0",
        [id]
      );

      if (rows.length === 0) {
        return sendJson(res, 404, { error: "Attraction not found" });
      }

      return sendJson(res, 200, rows[0]);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get attraction" });
    }
  }

  // POST /api/attractions
  if (req.method === "POST" && !id) {
    try {
      const body = await readBody(req);
      const { Name, Type, Schedule, EnclosureID } = body;
      const DurationMinutes = optionalInt(body.DurationMinutes);
      const HostEmployeeID = optionalInt(body.HostEmployeeID);

      if (!Name || !Type || !Schedule || !EnclosureID) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }

      const [result] = await pool.query(
        `INSERT INTO attraction (Name, Type, Schedule, DurationMinutes, EnclosureID, HostEmployeeID)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [Name, Type, Schedule, DurationMinutes, EnclosureID, HostEmployeeID]
      );

      return sendJson(res, 201, { AttractionID: result.insertId });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // PUT /api/attractions/:id
  if (req.method === "PUT" && id) {
    try {
      const body = await readBody(req);
      const { Name, Type, Schedule, EnclosureID } = body;
      const DurationMinutes = optionalInt(body.DurationMinutes);
      const HostEmployeeID = optionalInt(body.HostEmployeeID);

      const [result] = await pool.query(
        `UPDATE attraction
         SET Name = ?, Type = ?, Schedule = ?, DurationMinutes = ?, EnclosureID = ?, HostEmployeeID = ?
         WHERE AttractionID = ? AND IsDeleted = 0`,
        [Name, Type, Schedule, DurationMinutes, EnclosureID, HostEmployeeID, id]
      );

      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Attraction not found" });
      }

      return sendJson(res, 200, { message: "Attraction updated" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // DELETE /api/attractions/:id  (soft delete)
  if (req.method === "DELETE" && id) {
    try {
      const [result] = await pool.query(
        "UPDATE attraction SET IsDeleted = 1 WHERE AttractionID = ? AND IsDeleted = 0",
        [id]
      );

      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Attraction not found" });
      }

      return sendJson(res, 200, { message: "Attraction deleted" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not delete attraction" });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleAttractions };