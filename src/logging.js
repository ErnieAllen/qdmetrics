const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    myFormat
  ),
  transports: [new transports.File({ filename: "qdmetrics.log" }), new transports.Console()]
});

logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "debug";

module.exports = logger;






