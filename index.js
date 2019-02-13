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
/**
 * Prometheus client
 * @module Prometheus client
 */

"use strict";

exports.register = require("./node_modules/prom-client/lib/registry").globalRegistry;
exports.Registry = require("./node_modules/prom-client/lib/registry");
exports.contentType = require("./node_modules/prom-client/lib/registry").globalRegistry.contentType;

exports.Counter = require("./node_modules/prom-client/lib/counter");
exports.Gauge = require("./node_modules/prom-client/lib/gauge");
exports.Histogram = require("./node_modules/prom-client/lib/histogram");
exports.Summary = require("./node_modules/prom-client/lib/summary");
exports.Pushgateway = require("./node_modules/prom-client/lib/pushgateway");

exports.linearBuckets = require("./node_modules/prom-client/lib/bucketGenerators").linearBuckets;
exports.exponentialBuckets = require("./node_modules/prom-client/lib/bucketGenerators").exponentialBuckets;

exports.collectDefaultMetrics = require("./node_modules/prom-client/lib/defaultMetrics");

exports.aggregators = require("./node_modules/prom-client/lib/metricAggregators").aggregators;
exports.AggregatorRegistry = require("./node_modules/prom-client/lib/cluster");