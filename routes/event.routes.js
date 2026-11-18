const eventCtrl = require("../controllers/event.controller");
const Joi = require("joi");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const { Router } = require("./route");
let router = new Router({ topic: "events" });

// ROUTES

router.route({
  topic: "",
  method: "get",
  route: "/",
  query: Joi.object({
    text: Joi.string().optional(),
    beginText: Joi.string().optional(),
    endText: Joi.string().optional(),
    tags: Joi.string().optional(),
    begin: Joi.number().integer().optional(),
    end: Joi.number().integer().optional(),
  }),
  cbs: [eventCtrl.getEvents], // No auth required for reading
  authorization: false,
  example: {
    query: {
      text: "מבול",
      beginText: "לידת אברהם",
      endText: "פטירת אברהם",
      tags: "נח,אדם הראשון",
      begin: 1500,
      end: 1700,
    },
  },
});

router.route({
  topic: "",
  method: "post",
  route: "/",
  body: Joi.object({
    year: Joi.number().integer().required(),
    text: Joi.string().optional(),
    references: Joi.array().items(Joi.string()).optional(),
  }),
  cbs: [requireAuth, eventCtrl.addEvent], // Authentication required for adding
  authorization: false,
  example: {
    body: {
      year: 1656,
      text: "תחילת המבול",
      references: ["בראשית ז יא"],
    },
  },
});

router.route({
  topic: "",
  method: "post",
  name: "dump",
  route: "/dump",
  cbs: [requireAuth, eventCtrl.dumpEventsToFile], // Authentication required for dumping
  authorization: false,
});

module.exports = router;
