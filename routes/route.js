const path = require("path");
const FILE = path.basename(__filename).split(".js")[0].toUpperCase();

const {
  ExError,
  STATUS_CODE,
  INTERNAL_ERRORS,
} = require("../middleware/errorHandler");
const express = require("express");

const EXTERNAL = "EXTERNAL";

const options = {
  abortEarly: false, // include all errors
  allowUnknown: true, // ignore unknown props
  stripUnknown: true, // remove unknown props
};

class Serializable {
  openapiJSON() {}

  postmanJSON() {}

  toJSON(format = "postman") {
    if (format === "postman") return this.postmanJSON();
    if (format === "openapi") return this.openapiJSON();
  }
}

class Endpoint extends Serializable {
  constructor(
    router,
    name,
    method,
    route,
    notes,
    headers,
    query,
    body,
    params,
    file,
    authorization = false,
    registerToken = false,
    adminAuthorization = false,
    adminRegisterToken = false,
    example,
    external = false
  ) {
    super();
    this.router = router;
    this.name = name;
    this.method = method;
    this.route = route;
    this.notes = notes;
    this.headers = headers;
    this.query = query;
    this.body = body;
    this.params = params;
    this.file = file;
    this.authorization = authorization;
    this.registerToken = registerToken;
    this.adminAuthorization = adminAuthorization;
    this.adminRegisterToken = adminRegisterToken;
    this.example = example;
    this.openapiJSON = this.postmanJSON;
    this.external = external;
  }

  get querySchema() {
    return (req, res, next) => {
      if (this.query) {
        const { error, value } = this.query.validate(req.query, options);
        if (error) {
          let message = error.details[0].message;
          logger.error(`[${FILE}] ${message}`);
          next(
            new ExError(
              STATUS_CODE.CLIENT_ERROR,
              INTERNAL_ERRORS.BAD_PARAMETERS,
              message
            )
          );
        } else {
          req.query = value;
          next();
        }
      } else next();
    };
  }

  get bodySchema() {
    return (req, res, next) => {
      if (this.body) {
        const { error, value } = this.body.validate(req.body, options);
        if (error) {
          let message = error.details[0].message;
          logger.error(`[${FILE}] ${message}`);
          next(
            new ExError(
              STATUS_CODE.CLIENT_ERROR,
              INTERNAL_ERRORS.BAD_PARAMETERS,
              message
            )
          );
        } else {
          req.body = value;
          next();
        }
      } else next();
    };
  }

  get paramsSchema() {
    return (req, res, next) => {
      if (this.params) {
        const { error, value } = this.params.validate(req.params, options);
        if (error) {
          let message = error.details[0].message;
          logger.error(`[${FILE}] ${message}`);
          next(
            new ExError(
              STATUS_CODE.CLIENT_ERROR,
              INTERNAL_ERRORS.BAD_PARAMETERS,
              message
            )
          );
        } else {
          req.params = value;
          next();
        }
      } else next();
    };
  }

  // since we are using multer for uploading,
  // req.file will only be initialized if the correct key name was used
  // so need to validate schema
  get fileSchema() {
    return (req, res, next) => {
      if (this.file) {
        if (!req.file) {
          logger.error(`[${FILE}] file is missing or has wrong name`);
          next(
            new ExError(
              STATUS_CODE.CLIENT_ERROR,
              INTERNAL_ERRORS.BAD_PARAMETERS
            )
          );
        } else {
          next();
        }
      } else next();
    };
  }

  postmanJSON() {
    let url = this.router?.fullPath
      ? this.router.fullPath + this.route
      : this.route;
    let name = this.name ? this.name : url;

    let header = [];
    if (this.authorization) {
      header.push({
        key: "Authorization",
        value: "{{token}}",
        type: "text",
      });
    }

    if (this.adminAuthorization) {
      header.push({
        key: "Authorization",
        value: "{{admintoken}}",
        type: "text",
      });
    }

    if (this.headers)
      for (const [key, value] of Object.entries(this.headers)) {
        header.push({
          key,
          value,
          type: "text",
        });
      }

    if ((this.external || this.headers) && this.example.headers) {
      header.push(
        ...Object.entries(this.example.headers).map(([key, value]) => ({
          key,
          value: value.toString(),
        }))
      );
    }

    let query = [];
    if ((this.external || this.query) && this.example.query) {
      query = Object.entries(this.example.query).map(([key, value]) => ({
        key,
        value: value.toString(),
      }));
    }

    let body = {};
    if ((this.external || this.body) && this.example.body)
      body = {
        mode: "raw",
        raw: JSON.stringify(this.example.body),
        options: {
          raw: { language: "json" },
        },
      };

    if ((this.external || this.file) && this.example.file)
      body = {
        mode: "formdata",
        formdata: [
          {
            key: this.example.file.fieldname,
            type: "file",
          },
        ],
      };

    let route = url;
    let variable = [];
    if ((this.external || this.params) && this.example.params) {
      variable = Object.entries(this.example.params).map(([key, value]) => {
        let re = new RegExp(`\/:${key}.*?(?:\/|$)`);
        route = route.replace(re, `\/:${key}\/`).replace("\\\\", "\\");
        return { key, value: value.toString() };
      });
    }
    route = route.replace(/\/$/, "");

    if (!this.name && (this.external || this.params) && this.example.params) {
      Object.entries(this.example.params).forEach(([key, _]) => {
        if (!this.name) {
          let re = new RegExp(`\/:${key}.*?(?:\/|$)`);
          let keyname = key;
          if (key.endsWith("Id")) keyname = key.slice(0, -2);
          name = name.replace(re, `/${keyname}/`).replace("\\\\", "\\");
        }
      });
      name = name.replace(/\//g, " ").trim();
    }

    if (this.authorization || this.adminAuthorization) name = `${name} 🔒`;

    let event = [];
    if (this.registerToken)
      event.push({
        listen: "test",
        script: {
          exec: [
            "var jsonData = JSON.parse(responseBody);\r",
            "if (jsonData.accessToken)\r",
            '\tpm.collectionVariables.set("token", jsonData.accessToken);\r',
            "if (jsonData.refreshToken)\r",
            '\tpm.collectionVariables.set("refreshToken", jsonData.refreshToken);',
          ],
          type: "text/javascript",
        },
      });

    if (this.adminRegisterToken)
      event.push({
        listen: "test",
        script: {
          exec: [
            "var jsonData = JSON.parse(responseBody);\r",
            "if (jsonData.accessToken)\r",
            '\tpm.collectionVariables.set("admintoken", jsonData.accessToken);',
          ],
          type: "text/javascript",
        },
      });

    return {
      name,
      event,
      request: {
        method: this.method.toUpperCase(),
        header,
        body,
        url: {
          raw: url,
          host: this.external
            ? route.slice(0, route.indexOf("/", "https://".length))
            : ["{{API-DOMAIN}}"],
          path: this.external
            ? route.slice(route.indexOf("/", "https://".length) + 1).split("/")
            : route.split("/").slice(1),
          query,
          variable,
        },
        description: this.notes,
      },
    };
  }
}

class Collection extends Serializable {
  constructor() {
    super();
    this.items = [];
    this.topic2id = {};
    this.NUM_OF_ROUTES = 0;
  }

  get numOfAPIs() {
    return this.NUM_OF_ROUTES;
  }

  addAPI({ topic, api }) {
    this.NUM_OF_ROUTES += 1;

    if (!topic) return this.items.push(api);

    let topics = topic.split(">");
    let suffixTopic = topics.slice(1).join(">");

    if (this.topic2id[topics[0]] >= 0) {
      return this.items[this.topic2id[topics[0]]].addAPI({
        api,
        topic: suffixTopic,
      });
    }

    this.topic2id[topics[0]] = this.items.length;
    this.items[this.topic2id[topics[0]]] = new NamedCollection(topics[0]);
    return this.items[this.topic2id[topics[0]]].addAPI({
      api,
      topic: suffixTopic,
    });
  }

  getTags(params) {
    return this.items
      .filter((item) => item instanceof Collection)
      .map((item) => item.getTags(params))
      .filter((item) => item !== undefined);
  }

  postmanJSON() {
    return { item: this.items.map((item) => item.postmanJSON()) };
  }

  openapiJSON() {
    return {
      item: this.items
        .map((item) => item.openapiJSON())
        .filter((item) => item !== undefined),
    };
  }
}

class NamedCollection extends Collection {
  constructor(name) {
    super();
    this.name = name;
  }

  getTags({ format = "postman", chainTags = undefined }) {
    if (this.name === EXTERNAL) return undefined;
    let tag = this.name;
    if (format === "openapi")
      tag = chainTags ? `${chainTags}>${this.name}` : this.name;
    return {
      tag,
      subTags: this.items
        .filter((item) => {
          return item instanceof Collection;
        })
        .map((item) => item.getTags({ format, chainTags: tag })),
    };
  }

  postmanJSON() {
    return {
      name: this.name,
      item: this.items.map((item) => item.postmanJSON()),
    };
  }

  openapiJSON(chainNames = undefined) {
    if (this.name === EXTERNAL) return undefined;
    let name = chainNames ? `${chainNames}>${this.name}` : this.name;
    return {
      name,
      item: this.items.map((item) => item.openapiJSON(name)),
    };
  }
}

let COLLECTION = new Collection();

// Router is a wrapper for the express router
class Router {
  constructor(specs = {}) {
    const { root = false, topic = undefined } = specs;
    this._router = root ? express() : express.Router();
    this._parent = null;
    this.root = root;
    this._topic = topic;
  }

  use(...params) {
    this._router.use(...params);
  }

  get(...params) {
    this._router.get(...params);
  }

  post(...params) {
    this._router.post(...params);
  }

  put(...params) {
    this._router.put(...params);
  }

  delete(...params) {
    this._router.delete(...params);
  }

  enable(...params) {
    this._router.enable(...params);
  }

  patch(...params) {
    this._router.patch(...params);
  }

  get url() {
    return this._url;
  }

  set url(val) {
    this._url = val;
  }

  get topic() {
    return this._topic;
  }

  set topic(val) {
    this._topic = val;
  }

  get fullPath() {
    return this._parent?.fullPath
      ? this._parent.fullPath + this._url
      : this._url;
  }

  get parent() {
    return this._parent;
  }

  set parent(router) {
    this._parent = router;
  }

  subroute(url, ...middleware) {
    let router = middleware.slice(-1)[0];
    middleware = middleware.slice(0, middleware.length - 1);
    this._router.use(url, router.router, ...middleware);
    router.url = url;
    router.parent = this;
  }

  route({
    name,
    topic,
    method,
    route,
    notes,
    headers,
    query,
    body,
    params,
    file,
    precbs = [],
    cbs = [],
    postcbs = [],
    authorization = false,
    registerToken = false,
    adminAuthorization = false,
    adminRegisterToken = false,
    external = false,
    example,
    document = true,
  }) {
    if (external) authorization = false;
    let api = new Endpoint(
      external ? undefined : this, // this is need in order to construct the full route for the docs
      name,
      method,
      route,
      notes,
      headers,
      query,
      body,
      params,
      file,
      authorization,
      registerToken,
      adminAuthorization,
      adminRegisterToken,
      example,
      external
    );

    if (!external)
      this._router[method](
        route,
        ...precbs,
        api.querySchema,
        api.bodySchema,
        api.paramsSchema,
        api.fileSchema,
        ...cbs,
        ...postcbs
      );

    if (document) {
      let combtopic = external
        ? `${EXTERNAL}>${topic}`
        : this._topic
        ? topic
          ? `${this._topic}>${topic}`
          : this._topic
        : topic;
      COLLECTION.addAPI({ topic: combtopic, api });
    }
  }

  get router() {
    return this._router;
  }
}

module.exports = { Router, COLLECTION };
