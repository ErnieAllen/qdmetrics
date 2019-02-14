/*
 * Copyright 2019 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const argv = require("minimist")(process.argv.slice(2));
let logger;
class Options {
  constructor(log, defaults) {
    logger = log;
    // set the initial default options
    this.scrape = defaults.scrape;
    this.refresh = defaults.refresh;
    this.local = defaults.local;
    this.edge = defaults.edge;
    this.connectOptions = defaults.connectOptions;

    // set options in the following order
    this.loadFromConfig();
    this.loadFromEnv();
    this.loadFromCommandLine();
    this.sanityCheck();
  }
  sanityCheck() {
    // 10 seconds <= refresh <= 24 hours
    this.refresh = Math.min(Math.max(this.refresh, 10), 60 * 60 * 24);
    this.scrape = Math.min(Math.max(this.scrape, 1), 65535);
    this.connectOptions.port = Math.min(Math.max(this.connectOptions.port, 1), 65535);
    this.local = this.getBoolean(this.local);
    this.edge = this.getBoolean(this.edge);
  }
  getBoolean(value) {
    if (typeof value === "boolean")
      return value;

    if (typeof value === "string")
      switch (value.toLowerCase()) {
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
          return true;
        default:
          return false;
      }
    return true;
  }

  loadFromConfig() {
    try {
      let cfg_opts = require("./options.json");
      this.load(a => cfg_opts[a]);
    } catch (e) {
      if (logger)
        logger.info("could not load options.json");
    }
  }
  loadFromEnv() {
    this.load(a => process.env[`METRICS_${a.toUpperCase()}`]);
  }
  loadFromCommandLine() {
    this.load(a => argv[a]);
  }

  // load these options using the supplied lookup function
  load(get) {
    this.scrape = get("scrape") || this.scrape;
    this.refresh = get("refresh") || this.refresh;
    this.local = get("local") || this.local;
    this.edge = get("edge") || this.edge;
    ["address", "port", "username", "password",
      "ssl-username", "ssl-password", "ssl-password-file",
      "sasl-mechanisms", "ssl-certificate", "ssl-key",
      "ssl-trustfile", "ssl-disable-peer-name-verify"]
      .forEach(a => {
        this.connectOptions[a] = get(a) || this.connectOptions[a];
      });
  }

  log() {
    let tmpOpts = JSON.parse(JSON.stringify(this));
    if (tmpOpts.connectOptions.password)
      tmpOpts.connectOptions.password = "xxxxxx";
    if (tmpOpts.connectOptions["ssl-password"])
      tmpOpts.connectOptions["ssl-password"] = "xxxxxx";
    if (tmpOpts.connectOptions["ssl-password-file"])
      tmpOpts.connectOptions["ssl-password-file"] = "xxxxxx";
    logger.info(`using options: ${JSON.stringify(tmpOpts, null, 2)}`);

  }
}

module.exports = function (logger) {
  // start with defaults
  const options = new Options(logger, {
    scrape: 5674,             // port on which to listen for prometheus scrape requests
    refresh: 60,              // seconds between topology change requests 
    local: false,             // only query router we are connected to
    edge: true,               // query edge routers
    connectOptions: {         // passed to rhea to connect to router
      address: "localhost",
      port: 5673,
      username: undefined,
      password: undefined,
      reconnect: true,
      properties: { app_identifier: "Prometheus scrape handler" }
    }
  });
  return options;
};
