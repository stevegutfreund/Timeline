const path = require("path");
const FILE = path.basename(__filename).split(".js")[0].toUpperCase();

const { ExError, STATUS_CODE, ERROR } = require("./errorHandler");

// Simple token-based authentication
// In production, use proper JWT tokens and database storage
// API_TOKEN comes from .env (server.js generates one if it is missing).
const VALID_TOKENS = new Set([process.env.API_TOKEN].filter(Boolean));

function requireAuth(req, res, next) {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.query.token ||
    req.body.token;

  if (!token) {
    logger.error(`[${FILE}] No authentication token provided`);
    return res.status(401).json({
      error: "Authentication required",
      message: "Please provide a valid token",
    });
  }

  if (!VALID_TOKENS.has(token)) {
    logger.error(`[${FILE}] Invalid authentication token: ${token}`);
    return res.status(403).json({
      error: "Invalid token",
      message: "The provided token is not valid",
    });
  }

  logger.info(
    `[${FILE}] Authentication successful for token: ${token.substring(0, 8)}...`
  );
  next();
}

function optionalAuth(req, res, next) {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.query.token ||
    req.body.token;

  if (token && VALID_TOKENS.has(token)) {
    req.authenticated = true;
    logger.info(
      `[${FILE}] Optional authentication successful for token: ${token.substring(
        0,
        8
      )}...`
    );
  } else {
    req.authenticated = false;
    logger.info(
      `[${FILE}] No valid authentication provided, proceeding without auth`
    );
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  VALID_TOKENS,
};
