if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const http = require("http");
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "..", "frontend", "dist");

// animal route
const { handleAnimals } = require("./routes/animals");

// enclosure route
const { handleEnclosures } = require("./routes/enclosures");

// species route
const { handleSpecies } = require("./routes/species");

// shops route
const { handleShops } = require("./routes/shops");

// products route
const { handleProducts } = require("./routes/products");

// attractions route
const { handleAttractions } = require("./routes/attractions");

// closures route
const { handleClosures } = require("./routes/closures");

// auth route
const { handleAuth } = require("./routes/auth");

// reports route
const { handleReports } = require("./routes/reports");

// checkout route
const { handleCheckout } = require("./routes/checkout");

// transactions route
const { handleTransactions } = require("./routes/transactions");

// alerts route
const { handleAlerts } = require("./routes/alerts");

// employees route
const { handleEmployees } = require("./routes/employees");

// customers route
const { handleCustomers } = require("./routes/customers");

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
  };
  return types[ext] || "application/octet-stream";
}

// serve the Vite build (Azure). if dist is missing, API still works (local vite dev)
function tryServeFrontend(res, pathname) {
  if (!fs.existsSync(DIST)) {
    return false;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(DIST, safePath));

  if (!filePath.startsWith(DIST)) {
    return false;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  // react router pages like /checkout
  const indexPath = path.join(DIST, "index.html");
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { "Content-Type": contentType(indexPath) });
    fs.createReadStream(indexPath).pipe(res);
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // GET /api/health
  if (req.method === "GET" && pathname === "/api/health") {
    try {
      const connection = await pool.getConnection();
      connection.release();
      return sendJson(res, 200, { message: "Database connected!" });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 500, { error: "Database connection failed" });
    }
  }

  if (pathname === "/api/animals" || pathname.startsWith("/api/animals/")) {
    return handleAnimals(req, res, pathname);
  }

  if (pathname === "/api/enclosures" || pathname.startsWith("/api/enclosures/")) {
    return handleEnclosures(req, res, pathname);
  }

  if (pathname === "/api/species" || pathname.startsWith("/api/species/")) {
    return handleSpecies(req, res, pathname);
  }

  if (pathname === "/api/shops" || pathname.startsWith("/api/shops/")) {
    return handleShops(req, res, pathname);
  }

  if (pathname === "/api/products" || pathname.startsWith("/api/products/")) {
    return handleProducts(req, res, pathname);
  }

  if (pathname === "/api/attractions" || pathname.startsWith("/api/attractions/")) {
    return handleAttractions(req, res, pathname);
  }

  if (pathname === "/api/closures" || pathname.startsWith("/api/closures/")) {
    return handleClosures(req, res, pathname);
  }

  if (pathname === "/api/reports" || pathname.startsWith("/api/reports/")) {
    return handleReports(req, res, pathname);
  }

  if (pathname === "/api/login" || pathname === "/api/signup") {
    return handleAuth(req, res, pathname);
  }

  if (pathname === "/api/checkout") {
    return handleCheckout(req, res, pathname);
  }

  if (
    pathname === "/api/my/transactions" ||
    pathname.startsWith("/api/my/transactions/")
  ) {
    return handleTransactions(req, res, pathname);
  }

  if (pathname === "/api/alerts" || pathname.startsWith("/api/alerts/")) {
    return handleAlerts(req, res, pathname);
  }

  if (pathname === "/api/employees" || pathname.startsWith("/api/employees/")) {
    return handleEmployees(req, res, pathname);
  }

  if (pathname === "/api/customers" || pathname.startsWith("/api/customers/")) {
    return handleCustomers(req, res, pathname);
  }

  if (
    (req.method === "GET" || req.method === "HEAD") &&
    tryServeFrontend(res, pathname)
  ) {
    return;
  }

  sendJson(res, 404, { error: "Route not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
