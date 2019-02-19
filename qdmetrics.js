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

"use strict";

// Prometheus client objects
const register = require("./").register;
const Gauge = require("./").Gauge;
let gaugeMap = {};

// Rhea wrapper
const management = require("./src/amqp/management");
const Management = new management("http:");
const utils = require("./src/amqp/utilities");

// Nodejs http server to listen for scrape requests
const http = require("http");
const server = http.createServer();

// logging
const log = require("./src/logging");
const winston = log.logger;
// connection options: command line > environment > config file
let options = require("./src/options")(log);
if (!options)
  process.exit();

// show current options
options.log();

// get object containing all the router statistics to query
const stats = require("./stats").stats;

// the ids of all the routers to be queried
let routerIds = [];
// cached router statistics (if options.cache is true)
let lastRouterResults;
// setInterval handle to periodically refresh the list of routers
let refreshTopologyHandle = null;
let refreshResultsHandle = null;

// startup
// connect to a router
winston.info(`attempting to connect to ${options.connectOptions.address}:${options.connectOptions.port}`);
Management.connection.addDisconnectAction(() => {
  winston.info("connection failed... retrying");
});

Management.connection.connect(options.connectOptions).then(function () {
  // we need fetch and cache the schema before making any queries
  // to get the fully qualified entity names
  Management.connection.addDisconnectAction(onConnectionDropped);
  winston.info(`connected to router at ${options.connectOptions.address}:${options.connectOptions.port}`);
  Management.getSchema()
    .then(function () {
      // initialize the gauges after the schema is available
      initGauges();
      // get the list of routers and edge-routers
      getTopology()
        .then(function (ids) {
          routerIds = ids;
          const names = routerIds.map((r) => utils.nameFromId(r));
          winston.info(`found router(s) ${names}`);
          // start up the scrape request handler after everything is done
          if (options.cache) {
            getStats()
              .then(function (routerResults) {
                lastRouterResults = routerResults;
                server.listen(options["scrape"]);
                refreshResultsHandle = setInterval(pollResults, options.poll * 1000);
              }, function (e) {
                winston.debug(e);
              });
          } else
            server.listen(options["scrape"]);
          // peridocally update the list of routers
          refreshTopologyHandle = setInterval(refreshTopology, options.refresh * 1000);
        });
    }, function (e) {
      winston.debug(e);
    });
}, function (e) {
  winston.debug(e);
});

// called after we are connected to a router and have a schema
// Create the prometheus Gauges for each router statistic
function initGauges() {
  stats.forEach(function (stat) {
    // always keep stats by which router they came from
    let labels = ["router"];
    // also keep stats by the entity
    if (stat.entity !== "router") {
      labels.push(stat.alias ? stat.alias : stat.entity);
    }
    // create a gauge per attribute
    stat.attributes.forEach((attr) => {
      let gauge = new Gauge({
        name: `qdmetrics_${attr}`,
        help: Management.schema().entityTypes[stat.entity].attributes[attr].description,
        labelNames: labels
      });
      gauge.alias = stat.alias;
      gaugeMap[`${stat.entity}.${attr}`] = gauge;
    });
  });
}

// called each scrape request for each statistic
// Set the statistic value for each guage
function setGauge(router, entity, attr, result) {
  let gauge = gaugeMap[`${entity}.${attr}`];
  let label = { router: router };
  if (result.name)
    label[gauge.alias ? gauge.alias : entity] = result.name;
  gauge.set(label, result[attr]);
}

// get the list of routers and edge-routers
function getTopology() {
  return new Promise((function (resolve, reject) {
    // if we only want to get stats from the router to which we are connected
    if (options.local) {
      let local = [Management.topology.getConnectedNode()];
      // if we also want all edge routers that are connected to the router
      if (options.edge) {
        Management.topology.getEdgeList(local)
          .then(function (edges) {
            resolve(local.concat(edges));
          }, function (e) {
            reject(e);
          });
      } else {
        resolve(local);
      }
      return;
    }
    Management.topology.getNodeList()
      .then(function (results) {
        let routerIds = results;
        if (options.edge) {
          Management.topology.getEdgeList(routerIds)
            .then(function (edges) {
              routerIds = routerIds.concat(edges);
              resolve(routerIds);
            }, function (e) {
              reject(e);
            });
        } else
          resolve(routerIds);
      }, function (e) {
        reject(e);
      });
  }));
}

// send a management query to the connected router to get the metrics for all routers
function getStats() {
  return new Promise(function (resolve, reject) {
    Promise.all(stats.map((s) => {
      let attrs = s.attributes.slice();
      if (attrs.indexOf("name") === -1)
        attrs.push("name");
      return Management.topology.get(routerIds, s.entity, attrs);
    }))
      .then(function (allResults) {
        resolve(allResults);
      }, function (e) {
        reject(e);
      });
  });
}

// log when router disconnects or reconnects
function onConnectionOpened() {
  winston.info("connection reopened");
  // get new topology now
  setTimeout(refreshTopology, 100);
  setTimeout(pollResults, 100);
  // start getting new topology periodically
  refreshTopologyHandle = setInterval(refreshTopology, options.refresh * 1000);
  refreshResultsHandle = setInterval(pollResults, options.poll * 1000);
  Management.connection.addDisconnectAction(onConnectionDropped);
}
function onConnectionDropped() {
  winston.error("connection dropped");
  clearInterval(refreshTopologyHandle);
  clearInterval(refreshResultsHandle);
  Management.connection.addConnectAction(onConnectionOpened);
}

// called periodically to refresh the list of routers
function refreshTopology() {
  // start request to get new topology 
  getTopology()
    .then(function (ids) {
      routerIds = ids;
      const names = routerIds.map((r) => utils.nameFromId(r));
      winston.verbose(`updated router list ${names}`);
    }, function (e) {
      winston.debug(`unable to refresh router list: 
        ${!Management.connection.is_connected() ? "not connected" : e}`);
    });
}

function pollResults() {
  getStats()
    .then(function (routerResults) {
      lastRouterResults = routerResults;
      winston.verbose("refreshed statistics");
    }, function (e) {
      winston.debug(`unable to refresh statistics ${e}`);
    });
}

// listen for scrape requests
server.on("request", async (req, res) => {
  if (req.url === "/metrics") {
    try {
      // get all the statistics for all routers
      if (!options.cache)
        lastRouterResults = await getStats();
      // for each entity
      lastRouterResults.forEach(function (rr, i) {
        let entity = stats[i].entity;
        let attributes = stats[i].attributes;
        // for each router
        rr.forEach(function (r, j) {
          let router = utils.nameFromId(routerIds[j]);
          // for each record returned
          r.response.results.forEach(function (result) {
            let o = utils.flatten(r.response.attributeNames, result);
            // for each attribute (statistic) requested
            attributes.forEach(function (attr) {
              setGauge(router, entity, attr, o);
            });
          });
        });
      });
      if (!Management.connection.is_connected()) {
        res.writeHead(503);
        res.end();
        winston.error("not connected for /metrics request");
      } else {
        res.writeHead(200, { "Content-Type": register.contentType });
        res.end(register.metrics());
        winston.info("handled request at /metrics");
      }
    } catch (e) {
      // service not available
      res.writeHead(503);
      res.end();
      if (!Management.connection.is_connected()) {
        winston.error("no connection to router");
      } else
        winston.debug(`unable to get metrics: ${e}`);
    }
  }
});
