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

/* global Promise */

const ConnectionManager = require('./connection.js');
const Topology = require('./topology.js');

class Management {
  constructor(protocol) {
    this.connection = new ConnectionManager(protocol);
    this.topology = new Topology(this.connection);
  }
  getSchema(callback) {
    var self = this;
    return new Promise(function (resolve, reject) {
      self.connection.sendMgmtQuery('GET-SCHEMA')
        .then(function (responseAndContext) {
          var response = responseAndContext.response;
          for (var entityName in response.entityTypes) {
            var entity = response.entityTypes[entityName];
            if (entity.deprecated) {
              // deprecated entity
              delete response.entityTypes[entityName];
            } else {
              for (var attributeName in entity.attributes) {
                var attribute = entity.attributes[attributeName];
                if (attribute.deprecated) {
                  // deprecated attribute
                  delete response.entityTypes[entityName].attributes[attributeName];
                }
              }
            }
          }
          self.connection.setSchema(response);
          if (callback)
            callback(response);
          resolve(response);
        }, function (error) {
          if (callback)
            callback(error);
          reject(error);
        });
    });
  }
  schema() {
    return this.connection.schema;
  }
}

module.exports = Management;
