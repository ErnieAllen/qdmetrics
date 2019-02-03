const winston = require("winston");

module.exports = function () {

  const files = new winston.transports.File({ filename: "qdmetrics.log" });
  const myconsole = new winston.transports.Console();

  winston.add(myconsole);
  winston.add(files);

};