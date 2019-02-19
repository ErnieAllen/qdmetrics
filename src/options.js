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
    this.cache = defaults.cache;
    this.poll = defaults.poll;
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
    this.poll = Math.min(Math.max(this.poll, 1), 60 * 60 * 24);
    this.scrape = Math.min(Math.max(this.scrape, 1), 65535);
    this.connectOptions.port = Math.min(Math.max(this.connectOptions.port, 1), 65535);
    this.local = this.getBoolean(this.local);
    this.edge = this.getBoolean(this.edge);
    this.cache = this.getBoolean(this.cache);
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
    this.cache = get("cache") || this.cache;
    this.poll = get("poll") || this.poll;
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
  const options = new Options(logger.logger, {
    scrape: 5674,             // port on which to listen for prometheus scrape requests
    refresh: 60,              // seconds between topology change requests 
    poll: 5,                  // seconds between statistics updates
    local: false,             // only query router we are connected to
    edge: true,               // query edge routers
    cache: false,             // cache query results
    connectOptions: {         // passed to rhea to connect to router
      address: "localhost",
      port: 5673,
      username: undefined,
      password: undefined,
      reconnect: true,
      properties: { app_identifier: "Prometheus scrape handler" }
    }
  });
  if (argv["h"] || argv["help"]) {
    logger.dumper.info(`
qdmetrics - prometheus client for qpid dispatch router
    usage: node qdmetrics.js <options>

  Options:
    -h                  Show this help text 
    -v                  Show version 
    -scrape #           Port on which to listen for scape requests [5674]
    -refresh #          Seconds between calls to refresh router topology [60]
    -poll #             Seconds between calls to refresh statistics [5]
    -local true|false   Only query the connected router [false]
    -edge true|false    Query edge routers [true]
    -cache true|false   Cache statistics and poll seperately from scrape requests [false]
  Connection options:
    -address            Address of router
    -port               Http enabled port on which a router is listening [5673]
    -ssl-certificate    Client SSL certificate (PEM Format)
    -ssl-key=KEY        Client SSL private key (PEM Format)
    -ssl-trustfile      Trusted Certificate Authority Database file (PEM
                        Format)
    -ssl-password       Certificate password, will be prompted if not
                        specifed.
    -ssl-password-file  Certificate password, will be prompted if not
                        specifed.
    -sasl-mechanisms    Allowed sasl mechanisms to be supplied during the sasl
                        handshake.
    -username           User name for SASL plain authentication
    -password           Password for SASL plain authentication
    -sasl-password-file Password for SASL plain authentication
    -ssl-disable-peer-name-verify
                        Disables SSL peer name verification. WARNING - This
                        option is insecure and must not be used in production
                        environments
    `);
    return null;
  }
  if (argv["v"] || argv["version"]) {
    logger.dumper.info(" version 0.0.1");
    return null;
  }
  return options;
};
