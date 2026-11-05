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

async function handleCheckout(req, res, pathname) {
  // POST /api/checkout — needs a ticket or a product; enclosure visits need a ticket
  if (req.method === "POST" && pathname === "/api/checkout") {
    let connection;

    try {
      const body = await readBody(req);
      const { customerId, paymentType } = body;
      const productList = Array.isArray(body.products) ? body.products : [];
      const enclosureIds = Array.isArray(body.enclosureIds) ? body.enclosureIds : [];

      // support multi-ticket lines, or legacy single ticketType
      let tickets = Array.isArray(body.tickets) ? body.tickets : [];
      if (tickets.length === 0 && body.ticketType) {
        tickets = [{ type: body.ticketType, quantity: body.ticketQuantity || 1 }];
      }

      if (!customerId || !paymentType) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }

      if (paymentType !== "Cash" && paymentType !== "Card") {
        return sendJson(res, 400, { error: "PaymentType must be Cash or Card" });
      }

      if (tickets.length === 0 && productList.length === 0) {
        return sendJson(res, 400, { error: "Add at least one ticket or product" });
      }

      if (tickets.length === 0 && enclosureIds.length > 0) {
        return sendJson(res, 400, { error: "Visiting enclosures requires a ticket" });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [customerRows] = await connection.query(
        "SELECT CustomerID FROM customer WHERE CustomerID = ? AND IsDeleted = 0",
        [customerId]
      );
      if (customerRows.length === 0) {
        await connection.rollback();
        connection.release();
        return sendJson(res, 400, { error: "Customer not found" });
      }

      const [txResult] = await connection.query(
        `INSERT INTO \`transaction\` (CustomerID, \`Date\`, PaymentType)
         VALUES (?, NOW(), ?)`,
        [customerId, paymentType]
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
        paymentType,
        message: "Purchase complete"
      });
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
      return sendJson(res, error.statusCode || 400, { error: error.message });
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

module.exports = { handleCheckout };
