var fs = require("fs").promises;
const path = require("path");

const { COLLECTION } = require("../routes/route");

global.DEV = "development";
global.DOCKER = "docker";
global.STG = "staging";
global.TEST = "test";
global.DEMO = "demo";
global.PROD = "production";

const env = process.env.NODE_ENV || DEV;

// GLOBALS (maybe put into a file)
global.ENV = env;
global.__basedir = path.join(__dirname, "../");
global.logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  sanitize: () => {},
};

console.log("collecting all APIs...");

require("../routes/index");

console.log(`collected ${COLLECTION.numOfAPIs} APIs...`);

console.log("creating postman collection JSON...");

let collection = {
  info: {
    name: "TL",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    {
      key: "API-DOMAIN",
      value: "{{DEV}}",
    },
    {
      key: "DEV",
      value: "http://localhost:1543",
    },
  ],
};

let postmanJSON = { ...collection, ...COLLECTION.toJSON((format = "postman")) };

fs.writeFile(
  path.join(__dirname, "API.postman_collection.json"),
  JSON.stringify(postmanJSON),
  "utf8"
);

console.log("DONE");
