const pino = require("pino");
const context = require("./async-context");

const FILE = "LOGGER";

// Create a logging instance
const basicLogger = pino({
  // TODO what log level should we have in production
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss",
      messageFormat: "{requestId}{UID}: {msg}",
      ignore: "pid,hostname,requestId,UID",
    },
  },
});

// Track bindings manually since bindings() method was removed in newer pino
let currentBindings = {};

// Proxify logger instance to use child logger from context if it exists
let logger = new Proxy(basicLogger, {
  get(target, property, receiver) {
    target = context.getStore() ? context.getStore().get("logger") : target;
    return Reflect.get(target, property, receiver);
  },
});

module.exports.initLogger = (req, res, next) => {
  logger = basicLogger.child({});
  const store = new Map();
  store.set("logger", logger);
  return context.run(store, next);
};

module.exports.addParamToLog = (param) => {
  // Update current bindings manually
  let key = Object.keys(param)[0];
  let value = Object.values(param)[0];
  currentBindings[key] = value;

  // Create child logger with updated bindings
  logger = basicLogger.child(currentBindings);

  return logger;
};

module.exports.logger = logger;
