const pool = require("../db");

const TICKET_PRICES = {
  Adult: 29.99,
  Child: 19.99,
  Senior: 24.99
};

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

async function insertProducts(connection, transactionId, productList) {
  for (const item of productList) {
    const productId = item.productId;
    const quantity = item.quantity;

    if (!productId || !quantity || quantity <= 0) {
      const err = new Error("Each product needs productId and quantity > 0");
      err.statusCode = 400;
      throw err;
    }

    const [productRows] = await connection.query(
      "SELECT Price, IsDeleted FROM product WHERE ProductID = ?",
      [productId]
    );

    if (productRows.length === 0 || productRows[0].IsDeleted === 1) {
      const err = new Error("Product not found");
      err.statusCode = 400;
      throw err;
    }

    await connection.query(
      `INSERT INTO transactionproduct (TransactionID, ProductID, Quantity, UnitPrice)
       VALUES (?, ?, ?, ?)`,
      [transactionId, productId, quantity, productRows[0].Price]
    );
  }
}

async function insertTickets(connection, transactionId, tickets) {
  const inserted = [];

  for (const line of tickets) {
    const type = line.type;
    const quantity = parseInt(line.quantity, 10);

    if (!type || !quantity || quantity <= 0) {
      const err = new Error("Each ticket needs type and quantity > 0");
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = TICKET_PRICES[type];
    if (unitPrice == null) {
      const err = new Error("Ticket type must be Adult, Child, or Senior");
      err.statusCode = 400;
      throw err;
    }

    const [result] = await connection.query(
      `INSERT INTO ticket (TransactionID, Type, Quantity, UnitPrice)
       VALUES (?, ?, ?, ?)`,
      [transactionId, type, quantity, unitPrice]
    );

    inserted.push({
      ticketId: result.insertId,
      type,
      quantity,
      unitPrice
    });
  }

  return inserted;
}

async function insertVisitedEnclosures(connection, transactionId, enclosureIds) {
  const unique = [...new Set(enclosureIds.map((id) => parseInt(id, 10)).filter(Boolean))];

  for (const enclosureId of unique) {
    const [rows] = await connection.query(
      "SELECT EnclosureID FROM enclosure WHERE EnclosureID = ? AND IsDeleted = 0",
      [enclosureId]
    );
    if (rows.length === 0) {
      const err = new Error("Enclosure not found: " + enclosureId);
      err.statusCode = 400;
      throw err;
    }

    await connection.query(
      `INSERT INTO transaction_enclosure (TransactionID, EnclosureID)
       VALUES (?, ?)`,
      [transactionId, enclosureId]
    );
  }
}

// the online store is the one shop with ShopType = 'Online'
async function getOnlineStoreId(connection) {
  const [rows] = await connection.query(
    "SELECT ShopID FROM shop WHERE ShopType = 'Online' AND IsDeleted = 0 ORDER BY ShopID LIMIT 1"
  );
  if (rows.length === 0) {
    const err = new Error("Online store is not set up");
    err.statusCode = 500;
    throw err;
  }
  return rows[0].ShopID;
}

async function rollbackQuietly(connection) {
  if (!connection) return;

  try {
    await connection.rollback();
  } catch (rollbackError) {
    console.error(rollbackError.message);
  } finally {
    connection.release();
  }
}

async function handleCheckout(req, res, pathname) {
  // POST /api/checkout — ONLINE purchase by a logged-in customer
  // tickets and/or online-store products (at least one), card only
  // enclosure visits require at least one ticket
  if (req.method === "POST" && pathname === "/api/checkout") {
    let connection;

    try {
      const body = await readBody(req);
      const { customerId } = body;
      const productList = Array.isArray(body.products) ? body.products : [];
      const enclosureIds = Array.isArray(body.enclosureIds) ? body.enclosureIds : [];
      const tickets = Array.isArray(body.tickets) ? body.tickets : [];

      if (!customerId) {
        return sendJson(res, 400, { error: "Missing customerId" });
      }

      if (tickets.length === 0 && productList.length === 0) {
        return sendJson(res, 400, {
          error: "Add at least one ticket or product"
        });
      }

      if (tickets.length === 0 && enclosureIds.length > 0) {
        return sendJson(res, 400, {
          error: "Visiting enclosures requires a ticket"
        });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [customerRows] = await connection.query(
        "SELECT CustomerID FROM customer WHERE CustomerID = ? AND IsDeleted = 0",
        [customerId]
      );
      if (customerRows.length === 0) {
        await rollbackQuietly(connection);
        return sendJson(res, 400, { error: "Customer not found" });
      }

      const shopId = await getOnlineStoreId(connection);

      // online = customer set, no cashier, online store, Card
      const [txResult] = await connection.query(
        `INSERT INTO \`transaction\` (CustomerID, EmployeeID, ShopID, \`Date\`, PaymentType)
         VALUES (?, NULL, ?, NOW(), 'Card')`,
        [customerId, shopId]
      );

      const transactionId = txResult.insertId;

      const ticketRows = tickets.length > 0
        ? await insertTickets(connection, transactionId, tickets)
        : [];

      if (productList.length > 0) {
        await insertProducts(connection, transactionId, productList);
      }

      if (enclosureIds.length > 0) {
        await insertVisitedEnclosures(connection, transactionId, enclosureIds);
      }

      await connection.commit();
      connection.release();

      return sendJson(res, 201, {
        transactionId,
        tickets: ticketRows,
        paymentType: "Card",
        message: "Purchase complete"
      });
    } catch (error) {
      await rollbackQuietly(connection);
      console.error(error.message);
      return sendJson(res, error.statusCode || 400, { error: error.message });
    }
  }

  // POST /api/sales — IN-PERSON sale rung up by a cashier at a gift shop / food stand
  // no customer recorded; products only; Cash or Card
  if (req.method === "POST" && pathname === "/api/sales") {
    let connection;

    try {
      const body = await readBody(req);
      const { employeeId, shopId, paymentType } = body;
      const productList = Array.isArray(body.products) ? body.products : [];

      if (!employeeId || !shopId || !paymentType) {
        return sendJson(res, 400, { error: "Missing cashier, shop, or payment type" });
      }

      if (paymentType !== "Cash" && paymentType !== "Card") {
        return sendJson(res, 400, { error: "PaymentType must be Cash or Card" });
      }

      if (productList.length === 0) {
        return sendJson(res, 400, { error: "Add at least one product" });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      // shop + cashier rules are checked by trg_transaction_shop_rules
      const [txResult] = await connection.query(
        `INSERT INTO \`transaction\` (CustomerID, EmployeeID, ShopID, \`Date\`, PaymentType)
         VALUES (NULL, ?, ?, NOW(), ?)`,
        [employeeId, shopId, paymentType]
      );
      const transactionId = txResult.insertId;

      await insertProducts(connection, transactionId, productList);

      await connection.commit();
      connection.release();

      return sendJson(res, 201, {
        transactionId,
        paymentType,
        message: "Sale recorded"
      });
    } catch (error) {
      await rollbackQuietly(connection);
      console.error(error.message);
      return sendJson(res, error.statusCode || 400, { error: error.message });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleCheckout };
