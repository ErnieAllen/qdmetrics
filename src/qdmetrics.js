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

const register = require("../").register;

const Gauge = require("../").Gauge;
let gaugeMap = {};

const management = require("./amqp/management");
const Management = new management("http:");

const utils = require("./amqp/utilities");
const http = require("http");
const server = http.createServer();

const winston = require("./logging");

// the ids of all the routers discovered in the network
let routerIds = [];

// TODO: should be loaded from command line > environment > config file
let options = require("./options")(winston);

// listen for scrape requests
server.on("request", async (req, res) => {
  if (req.url === "/metrics") {
    try {
      // get all the statistics for all routers
      let routerResults = await getStats();
      // for each entity
      routerResults.forEach(function (rr, i) {
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
      res.writeHead(200, { "Content-Type": register.contentType });
      res.end(register.metrics());
      // start request to get new topology 
      getTopology()
        .then(function (ids) {
          routerIds = ids;
          winston.verbose("updated router and edge-router list");
        });
      winston.info("handled request at /metrics");
    } catch (e) {
      winston.debug(e);
    }
  }
});

// startup
// get stats file and connect to the router network
const stats = require("../stats").stats;
// connect to a router
Management.connection.connect(options.connectOptions).then(function () {
  // we need fetch and cache the schema before making any queries
  // to get the fully qualified entity names
  winston.info(`connected to router at ${options.connectOptions.address}:${options.connectOptions.port}`);
  Management.getSchema()
    .then(function () {
      // initialize the gauges after the schema is available
      initGauges();
      getTopology()
        .then(function (ids) {
          routerIds = ids;
          let names = routerIds.map(function (r) {
            return utils.nameFromId(r);
          });
          winston.info(`found router(s) ${names}`);
          // start up the scrape request handler after everything is done
          server.listen(options["scrape-port"]);
        });
    }, function (e) {
      winston.debug(e);
    });
}, function (e) {
  winston.debug(e);
});

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
    Management.topology.getNodeList()
      .then(function (results) {
        let routerIds = results;
        Management.topology.getEdgeList(routerIds)
          .then(function (edges) {
            routerIds = routerIds.concat(edges);
            resolve(routerIds);
          }, function (e) {
            reject(e);
          });
      });
  }));
}

// send a management query to the connected router to get the metrics
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
