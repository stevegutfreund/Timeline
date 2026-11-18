const eventService = require("../services/event.service");

const FILE = "EVENT.CONTROLLER";

module.exports = {
  getEvents,
  addEvent,
  loadEventsFromFile,
  dumpEventsToFile,
};

async function getEvents(req, res, next) {
  logger.info(`[${FILE}] got a getEvents request`);

  try {
    let event = await eventService.get(
      req.query.text,
      req.query.tags,
      req.query.begin,
      req.query.end,
      req.query.beginText,
      req.query.endText
    );
    res.status(200).json(event);
  } catch (e) {
    next(e);
  }
}

async function addEvent(req, res, next) {
  logger.info(`[${FILE}] got a addEvent request`);

  try {
    let event = await eventService.add(req.body);
    eventService.dump();
    res.status(200).json(event);
  } catch (e) {
    next(e);
  }
}

async function loadEventsFromFile(req, res, next) {
  logger.info(`[${FILE}] got a loadEventsFromFile request`);

  try {
    var data = JSON.parse(req.file.buffer.toString());
    await eventService.addFromJson(data);
    res.status(200).json();
  } catch (e) {
    next(e);
  }
}

async function dumpEventsToFile(req, res, next) {
  logger.info(`[${FILE}] got a dumpEventsToFile request`);

  try {
    await eventService.dump();
    res.status(200).json();
  } catch (e) {
    next(e);
  }
}
