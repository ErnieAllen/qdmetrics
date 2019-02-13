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

class Options {
  constructor(logger, defaults) {
    this.logger = logger;
    // set the initial default options
    this["scrape"] = defaults["scrape"];
    this.connectOptions = defaults.connectOptions;

    // set options in the following order
    this.loadFromConfig();
    this.loadFromEnv();
    this.loadFromCommandLine();
  }
  loadFromConfig() {
    try {
      let cfg_opts = require("./options.json");
      this.load(a => cfg_opts[a]);
    } catch (e) {
      if (this.logger)
        this.logger.info("could not load options.json");
    }
  }
  loadFromEnv() {
    this.load(a => process.env[`METRICS_${a.toUpperCase()}`]);
  }
  loadFromCommandLine() {
    this.load(a => argv[a]);
  }
  load(get) {
    this["scrape"] = get("scrape") || this["scrape"];
    ["address", "port", "ssl-username", "ssl-password", "ssl-password-file",
      "sasl-mechanisms", "ssl-certificate", "ssl-key",
      "ssl-trustfile", "ssl-disable-peer-name-verify"]
      .forEach(a => {
        this.connectOptions[a] = get(a) || this.connectOptions[a];
      });
  }
}

module.exports = function (logger) {
  const options = new Options(logger, {
    "scrape": 5674,
    connectOptions: {
      address: "localhost",
      port: 5673,
      reconnect: true,
      properties: { app_identifier: "Prometheus scrape handler" }
    }
  });
  return options;
};
