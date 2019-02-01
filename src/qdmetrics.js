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

'use strict';

const register = require('../').register;

const Gauge = require('../').Gauge;
const g = new Gauge({
  name: 'qdmetrics_acceptedDeliveries',
  help: 'Sum of accepted deleiveries for all routers in the network',
  labelNames: ['router']
});

const management = require('./amqp/management');
const Management = new management('http:');

const utils = require('./amqp/utilities');
const http = require('http');

let routerId = '';

// TODO: should be loaded from command line or config file
let scrapePort = 5674;
let connectOptions = {
  address: 'localhost',
  port: 5673,
  username: '',
  password: '',
  reconnect: true,
  properties: { app_identifier: 'Prometheus scape handler' }
};
// TODO: which stats to fetch should be defined in config file
let routerResults = { acceptedDeliveries: -1 };

const server = http.createServer();
// listen for scrape requests
server.on('request', async (req, res) => {
  if (req.url === '/metrics') {
    try {
      routerResults = await getStats();
      g.set({ router: utils.nameFromId(routerId) }, routerResults.acceptedDeliveries);
      res.writeHead(200, { 'Content-Type': register.contentType });
      res.end(register.metrics());
      console.log('handled prometheus scape request at /metrics')
    } catch (e) {
      console.log(e);
    }
  }
});

// connect to a router
Management.connection.connect(connectOptions).then(function () {
  // we need fetch and cache the schema before making any queries
  // to get the fully qualified entity names
  console.log(`connected to router at ${connectOptions.address}:${connectOptions.port}`)
  Management.getSchema()
    .then(function () {
      routerId = Management.topology.getConnectedNode();
      console.log(`connected to router named "${utils.nameFromId(routerId)}"`);
      server.listen(scrapePort);
    }, function (e) {
      console.log(e);
    });
}, function (e) {
  console.log(e);
});

// send a management query to the connected router to get the metrics
function getStats() {
  return new Promise(function (resolve, reject) {
    const entity = 'router',
      attributes = [];
    try {
      Management.connection.sendQuery(routerId, entity, attributes)
        .then(function (r) {
          let response = r.response;
          resolve(utils.flatten(response.attributeNames, response.results[0]));
        }, function (e) {
          reject(e);
        });
    } catch (e) {
      reject(e);
    }
  })
}
