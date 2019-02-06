const argv = require("minimist")(process.argv.slice(2));

class Options {
  constructor(logger, defaults) {
    this.logger = logger;
    // set the initial default options
    this["scrape-port"] = defaults["scrape-port"];
    this.connectOptions = defaults.connectOptions;

    // set options in the following order
    this.loadFromConfig();
    this.loadFromEnv();
    this.loadFromCommandLine();
  }
  loadFromConfig() {
    try {
      let cfg_opts = require("./options.json");
      this.load(cfg_opts, a => cfg_opts[a]);
    } catch (e) {
      if (this.logger)
        this.logger.info("could not load options.json");
    }
  }
  loadFromEnv() {
    this.load(a => process.env[`METRICS_${a.toUpperCase()}`] ?
      process.env[`METRICS_${a.toUpperCase()}`] :
      null);
  }
  loadFromCommandLine() {
    this.load(a => argv[a]);
  }
  load(get) {
    this["scrape-port"] = get("scrape-port") || this["scrape-port"];
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
    "scrape-port": 5674,
    connectOptions: {
      address: "localhost",
      port: 5673,
      reconnect: true,
      properties: { app_identifier: "Prometheus scrape handler" }
    }
  });
  return options;
};
