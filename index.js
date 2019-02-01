/**
 * Prometheus client
 * @module Prometheus client
 */

'use strict';

exports.register = require('./node_modules/prom-client/lib/registry').globalRegistry;
exports.Registry = require('./node_modules/prom-client/lib/registry');
exports.contentType = require('./node_modules/prom-client/lib/registry').globalRegistry.contentType;

exports.Counter = require('./node_modules/prom-client/lib/counter');
exports.Gauge = require('./node_modules/prom-client/lib/gauge');
exports.Histogram = require('./node_modules/prom-client/lib/histogram');
exports.Summary = require('./node_modules/prom-client/lib/summary');
exports.Pushgateway = require('./node_modules/prom-client/lib/pushgateway');

exports.linearBuckets = require('./node_modules/prom-client/lib/bucketGenerators').linearBuckets;
exports.exponentialBuckets = require('./node_modules/prom-client/lib/bucketGenerators').exponentialBuckets;

exports.collectDefaultMetrics = require('./node_modules/prom-client/lib/defaultMetrics');

exports.aggregators = require('./node_modules/prom-client/lib/metricAggregators').aggregators;
exports.AggregatorRegistry = require('./node_modules/prom-client/lib/cluster');