const FILE = "ERRORHANDLER";

const STATUS_CODE = {
  SUCCESS: 200,
  CLIENT_ERROR: 400,
  SERVER_ERROR: 500,
};

const INTERNAL_ERRORS = {
  // GENERAL
  UNDEFINED: 1,
  MISSING_PARAMETERS: 2,
  INVALID_API: 3,
  BAD_PARAMETERS: 4,
  NOT_IMPLEMENTED: 5,
  DUPLIACTE_EVENT: 6,
};

const INTERNAL_ERRORS_STR = {
  // GENERAL
  1: "internal server error",
  2: "missing parameters",
  3: "invalid API",
  4: "Wrong use of parameters",
  5: "Not implemented",
  6: "Event already in system",
};

class ExError extends Error {
  constructor(status, error, description) {
    super();
    this.status = status;
    this.error = error;
    this.description = description;
  }
}

const errorHandler = (err, _req, res, _next) => {
  const {
    status = STATUS_CODE.SERVER_ERROR,
    error = INTERNAL_ERRORS.UNDEFINED,
    description = undefined,
  } = err;
  logger.error(
    `[${FILE}] (${error}) ${INTERNAL_ERRORS_STR[error]} ${
      description ? `: ${description}` : ``
    }`
  );
  if (status === STATUS_CODE.SERVER_ERROR)
    logger.error(`[${FILE}] ${err.stack}`);
  res.status(status).json({
    status,
    subStatus: error,
    message:
      INTERNAL_ERRORS_STR[error] + (description ? ": " + description : ""),
  });
};

module.exports = {
  ExError,
  errorHandler,
  STATUS_CODE,
  INTERNAL_ERRORS,
};
