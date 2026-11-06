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

async function handleProducts(req, res, pathname) {
  // /api/products or /api/products/1
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[2];
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // GET /api/products/search?q=shirt
  if (req.method === "GET" && id === "search") {
    try {
      const searchTerm = url.searchParams.get("q");

      if (!searchTerm || !searchTerm.trim()) {
        return sendJson(res, 400, { error: "Search term is required" });
      }

      const term = `%${searchTerm.trim()}%`;

      const [rows] = await pool.query(
        `SELECT
           p.ProductID,
           p.Name AS ProductName,
           p.Category,
           p.Price,
           p.QuantityInStock,
           s.Name AS ShopName
         FROM product p
         JOIN shop s ON p.ShopID = s.ShopID
         WHERE p.IsDeleted = 0
           AND s.IsDeleted = 0
           AND (p.Name LIKE ? OR p.Category LIKE ? OR s.Name LIKE ?)
         ORDER BY p.Name`,
        [term, term, term]
      );

      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not search products" });
    }
  }

  // GET /api/products  (optional ?shopId=2 or ?shopType=Online)
  if (req.method === "GET" && !id) {
    try {
      let sql = `SELECT p.*, s.Name AS ShopName, s.ShopType
                 FROM product p
                 JOIN shop s ON s.ShopID = p.ShopID
                 WHERE p.IsDeleted = 0 AND s.IsDeleted = 0`;
      const params = [];

      const shopId = url.searchParams.get("shopId");
      const shopType = url.searchParams.get("shopType");
      if (shopId) {
        sql += " AND p.ShopID = ?";
        params.push(shopId);
      }
      if (shopType) {
        sql += " AND s.ShopType = ?";
        params.push(shopType);
      }

      sql += " ORDER BY p.Name";
      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get products" });
    }
  }

  // GET /api/products/:id
  if (req.method === "GET" && id) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM product WHERE ProductID = ? AND IsDeleted = 0",
        [id]
      );

      if (rows.length === 0) {
        return sendJson(res, 404, { error: "Product not found" });
      }

      return sendJson(res, 200, rows[0]);
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not get product" });
    }
  }

  // POST /api/products
  if (req.method === "POST" && !id) {
    try {
      const body = await readBody(req);
      const { Name, Price, Category, QuantityInStock, ShopID } = body;

      if (!Name || Price == null || !Category || QuantityInStock == null || !ShopID) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }

      const [result] = await pool.query(
        `INSERT INTO product (Name, Price, Category, QuantityInStock, ShopID)
         VALUES (?, ?, ?, ?, ?)`,
        [Name, Price, Category, QuantityInStock, ShopID]
      );

      return sendJson(res, 201, { ProductID: result.insertId });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // PUT /api/products/:id
  if (req.method === "PUT" && id) {
    try {
      const body = await readBody(req);
      const { Name, Price, Category, QuantityInStock, ShopID } = body;

      const [result] = await pool.query(
        `UPDATE product
         SET Name = ?, Price = ?, Category = ?, QuantityInStock = ?, ShopID = ?
         WHERE ProductID = ? AND IsDeleted = 0`,
        [Name, Price, Category, QuantityInStock, ShopID, id]
      );

      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Product not found" });
      }

      return sendJson(res, 200, { message: "Product updated" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 400, { error: error.message });
    }
  }

  // DELETE /api/products/:id  (soft delete)
  if (req.method === "DELETE" && id) {
    try {
      const [result] = await pool.query(
        "UPDATE product SET IsDeleted = 1 WHERE ProductID = ? AND IsDeleted = 0",
        [id]
      );

      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Product not found" });
      }

      return sendJson(res, 200, { message: "Product deleted" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Could not delete product" });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleProducts };