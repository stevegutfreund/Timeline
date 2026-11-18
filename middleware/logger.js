const { logger, addParamToLog, init } = require("../tools/logger");
const uuid = require("uuid");
const context = require("../tools/async-context");

const FORMAT_LOG = {
  requestId: (reqId) => {
    return { requestId: `[${reqId}]` };
  },
  userId: (userId) => {
    return { UID: `[UID ${userId}]` };
  },
};

const FILE = "LOGGER";

module.exports.reqInfo = (req, res, next) => {
  logger.info(`[${FILE}] ${req.method} ${req.originalUrl}`);
  for (const [key, value] of Object.entries(req.body)) {
    logger.info(`[${FILE}] ${key}: ${value}`);
  }
  next();
};

module.exports.addReqIdToLog = (req, res, next) => {
  req.id = uuid.v4();
  let logger = addParamToLog(FORMAT_LOG.requestId(req.id));
  logger.info(`[${FILE}] new request ${req.id}`);

  const store = new Map();
  store.set("logger", logger);
  return context.run(store, next);
};

module.exports.addUserIdToLog = (req, res, next) => {
  let logger = addParamToLog(FORMAT_LOG.userId(req.requester.id));
  logger.info(`[${FILE}] request from user ${req.requester.id}`);

  const store = new Map();
  store.set("logger", logger);
  return context.run(store, next);
};
