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

const utils = require("./utilities");
class Topology {
  constructor(connectionManager) {
    this.connection = connectionManager;
  }

  getConnectedNode() {
    let parts = this.connection.getReceiverAddress().split("/");
    parts[parts.length - 1] = "$management";
    return parts.join("/");
  }
  getNodeList() {
    return new Promise((function (resolve, reject) {
      this.connection.sendMgmtQuery("GET-MGMT-NODES").then(
        (function (results) {
          let routerIds = results.response;
          if (
            Object.prototype.toString.call(routerIds) === "[object Array]"
          ) {
            // if there is only one node, it will not be returned
            if (routerIds.length === 0) {
              routerIds.push(this.getConnectedNode());
            }
            resolve(routerIds);
          } else {
            reject("GET-MGMT-NODES returned non-array");
          }
        }).bind(this), function (e) {
          reject(e);
        });
    }).bind(this));
  }
  getEdgeList(ids) {
    return new Promise((function (resolve, reject) {
      this.get(ids, "connection", ["container", "role"])
        .then(function (results) {
          let edges = [];
          // for each entity
          results.forEach(function (r) {
            // for each record returned
            r.response.results.forEach(function (result) {
              let connection = utils.flatten(r.response.attributeNames, result);
              if (connection.role === "edge") {
                edges.push(utils.idFromName(connection.container, "_edge"));
              }
            });
          });
          resolve(edges);
        }, function (e) {
          reject(e);
        });
    }).bind(this));
  }
  get(ids, entity, attributes) {
    return new Promise((function (resolve, reject) {
      Promise.all(ids.map((id) => this.connection.sendQuery(id, entity, attributes)))
        .then(function (allResults) {
          resolve(allResults);
        }, function (firstError) {
          reject(firstError);
        });
    }).bind(this));
  }

}
module.exports = Topology;
