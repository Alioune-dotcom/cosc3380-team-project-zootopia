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

async function handleEnclosures(req, res, pathname) {
  // /api/enclosures or /api/enclosures/1
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[2];

  // GET /api/enclosures
  if (req.method === "GET" && !id) {
    try {
      const [rows] = await pool.query(
        `SELECT
           e.*,
           (
             SELECT COUNT(*)
             FROM animal a
             JOIN species s ON s.SpeciesID = a.SpeciesID
             WHERE a.EnclosureID = e.EnclosureID
              AND a.IsDeleted = 0
              AND s.IsDeleted = 0
           ) AS AnimalCount,
           COALESCE(o.IsOpenToday, 0) AS IsOpenToday
         FROM enclosure e
         LEFT JOIN v_enclosure_open_today o ON o.EnclosureID = e.EnclosureID
         WHERE e.IsDeleted = 0
         ORDER BY e.Name`
      );
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get enclosures" });
    }
  }

  // GET /api/enclosures/:id/animals
  if (req.method === "GET" && id && parts[3] === "animals") {
    try {
      const [encRows] = await pool.query(
        "SELECT * FROM enclosure WHERE EnclosureID = ? AND IsDeleted = 0",
        [id]
      );
      if (encRows.length === 0) {
        return sendJson(res, 404, { error: "Enclosure not found" });
      }

      const [animals] = await pool.query(
        `SELECT
           a.AnimalID,
           a.Name AS AnimalName,
           a.Sex,
           a.DateOfBirth,
           a.IsSick,
           s.CommonName AS Species
         FROM animal a
         JOIN species s ON s.SpeciesID = a.SpeciesID
         WHERE a.EnclosureID = ?
           AND a.IsDeleted = 0
           AND s.IsDeleted = 0
         ORDER BY a.Name`,
        [id]
      );

      return sendJson(res, 200, {
        enclosure: encRows[0],
        animals,
        animalCount: animals.length
      });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get enclosure animals" });
    }
  }

  // GET /api/enclosures/:id
  if (req.method === "GET" && id && !parts[3]) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM enclosure WHERE EnclosureID = ? AND IsDeleted = 0",
        [id]
      );

      if (rows.length === 0) {
        return sendJson(res, 404, { error: "Enclosure not found" });
      }

      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS AnimalCount
         FROM animal a
         JOIN species s ON s.SpeciesID = a.SpeciesID
         WHERE a.EnclosureID = ?
         AND a.IsDeleted = 0
         AND s.IsDeleted = 0`,
        [id]
      );

      return sendJson(res, 200, {
        ...rows[0],
        AnimalCount: countRows[0].AnimalCount
      });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get enclosure" });
    }
  }

  // POST /api/enclosures/reopen-all
if (req.method === "POST" && id === "reopen-all") {
  try {
    const [result] = await pool.query(
      // never open the Quarantine Ward / medical areas to the public
      `UPDATE enclosure SET Status = 'Open'
       WHERE IsDeleted = 0
         AND HabitatType <> 'Medical'
         AND Name <> 'Quarantine Ward'`
    );

    return sendJson(res, 200, {
      message: "All enclosures reopened",
      updated: result.affectedRows
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not reopen enclosures" });
  }
}


  // POST /api/enclosures
  if (req.method === "POST" && !id) {
    try {
      const body = await readBody(req);
      const { Name, HabitatType, Capacity, Location, Status } = body;

      if (!Name || !HabitatType || !Capacity || !Location || !Status) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }

      const [result] = await pool.query(
        `INSERT INTO enclosure (Name, HabitatType, Capacity, Location, Status)
         VALUES (?, ?, ?, ?, ?)`,
        [Name, HabitatType, Capacity, Location, Status]
      );

      return sendJson(res, 201, { EnclosureID: result.insertId });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // PUT /api/enclosures/:id
  if (req.method === "PUT" && id) {
    try {
      const body = await readBody(req);
      const { Name, HabitatType, Capacity, Location, Status } = body;

      const [result] = await pool.query(
        `UPDATE enclosure
         SET Name = ?, HabitatType = ?, Capacity = ?, Location = ?, Status = ?
         WHERE EnclosureID = ? AND IsDeleted = 0`,
        [Name, HabitatType, Capacity, Location, Status, id]
      );

      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Enclosure not found" });
      }

      return sendJson(res, 200, { message: "Enclosure updated" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }


if (req.method === "DELETE" && id) {
  try {
    // Check whether the enclosure still contains active animals
    const [animalRows] = await pool.query(
      `SELECT COUNT(*) AS AnimalCount
       FROM animal
       WHERE EnclosureID = ?
         AND IsDeleted = 0`,
      [id]
    );

    const animalCount = animalRows[0].AnimalCount;

    // Prevent deletion if animals are still assigned
    if (animalCount > 0) {
      return sendJson(res, 409, {
        error: `Cannot delete this enclosure because it still contains ${animalCount} active animal(s). Please reassign the animals first.`
      });
    }

    // Soft-delete the enclosure
    const [result] = await pool.query(
      `UPDATE enclosure
       SET IsDeleted = 1
       WHERE EnclosureID = ?
         AND IsDeleted = 0`,
      [id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Enclosure not found" });
    }

    // Also hide attractions that belonged to this enclosure
    await pool.query(
      `UPDATE attraction
       SET IsDeleted = 1
       WHERE EnclosureID = ?
         AND IsDeleted = 0`,
      [id]
    );

    return sendJson(res, 200, {
      message: "Enclosure deleted"
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, {
      error: "Could not delete enclosure"
    });
  }
}

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleEnclosures };