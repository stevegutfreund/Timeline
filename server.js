const path = require("path");
const FILE = path.basename(__filename).split(".js")[0].toUpperCase();

// Load environment variables first
require("dotenv").config();

const express = require("express");
const http = require("http");

const { Router } = require("./routes/route");
let app = new Router({ root: true });

global.DEV = "development";

const PORT = process.env.PORT || 5002;
// Loopback only; the phone reaches it through `tailscale serve` (see start-all.ps1).
const HOST = process.env.HOST || "127.0.0.1";
const env = process.env.NODE_ENV || DEV;

global.ENV = env;

const { logger, initLogger } = require("./tools/logger");

global.__basedir = __dirname;

// Data lives outside git (see .gitignore); both paths can be set in .env.
global.DATA_FILE = path.resolve(__dirname, process.env.DATA_FILE || "events.json");
global.BACKUP_DIR = path.resolve(__dirname, process.env.BACKUP_DIR || "backups");

// Token the UI sends with write requests. Without one in .env, a random token
// is generated per run (the page receives it when served, so the UI still works).
if (!process.env.API_TOKEN) {
  process.env.API_TOKEN = require("crypto").randomBytes(24).toString("hex");
}
global.logger = logger;
if (env === DEV) global.API_DOMAIN = `http://localhost:${PORT}`;

// Configure trust proxy - only trust 1 hop for security
app.router.set("trust proxy", 1); // Only trust the first proxy
app.subroute("/", require("./routes"));

let server = http.createServer(app.router);

server.listen(PORT, HOST, () => {
  require("./services/main.service").init();
  logger.info(`listening at: ${API_DOMAIN}`);
});
