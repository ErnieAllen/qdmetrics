/*
 * Copyright 2018 Red Hat Inc.
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

var utils = {
  isAConsole: function (properties, connectionId, nodeType, key) {
    return this.isConsole({
      properties: properties,
      connectionId: connectionId,
      nodeType: nodeType,
      key: key
    });
  },
  isConsole: function (d) {
    return (d && d.properties && d.properties.console_identifier === 'Dispatch console');
  },
  isArtemis: function (d) {
    return (d.nodeType === 'route-container' || d.nodeType === 'on-demand') && (d.properties && d.properties.product === 'apache-activemq-artemis');
  },

  isQpid: function (d) {
    return (d.nodeType === 'route-container' || d.nodeType === 'on-demand') && (d.properties && d.properties.product === 'qpid-cpp');
  },
  flatten: function (attributes, result) {
    if (!attributes || !result)
      return {};
    var flat = {};
    attributes.forEach(function (attr, i) {
      if (result && result.length > i)
        flat[attr] = result[i];
    });
    return flat;
  },
  flattenAll: function (entity, filter) {
    if (!filter)
      filter = function (e) {
        return e;
      };
    const results = [];
    for (let i = 0; i < entity.results.length; i++) {
      const f = filter(this.flatten(entity.attributeNames, entity.results[i]));
      if (f)
        results.push(f);
    }
    return results;
  },
  copy: function (obj) {
    if (obj)
      return JSON.parse(JSON.stringify(obj));
  },
  identity_clean: function (identity) {
    if (!identity)
      return '-';
    var pos = identity.indexOf('/');
    if (pos >= 0)
      return identity.substring(pos + 1);
    return identity;
  },
  addr_text: function (addr) {
    if (!addr)
      return '-';
    if (addr[0] === addr[0].toLowerCase())
      return addr;
    if (addr[0] == 'M')
      return addr.substring(2);
    else
      return addr.substring(1);
  },
  addr_class: function (addr) {
    if (!addr) return '-';
    if (addr[0] == 'M') return 'mobile';
    if (addr[0] == 'R') return 'router';
    if (addr[0] == 'A') return 'area';
    if (addr[0] == 'L') return 'local';
    if (addr[0] == 'H') return 'edge';
    if (addr[0] == 'C') return 'link-incoming';
    if (addr[0] == 'E') return 'link-incoming';
    if (addr[0] == 'D') return 'link-outgoing';
    if (addr[0] == 'F') return 'link-outgoing';
    if (addr[0] == 'T') return 'topo';
    if (addr === 'queue.waypoint') return 'mobile';
    if (addr === 'link') return 'link';
    return 'unknown: ' + addr[0];
  },
  humanify: function (s) {
    if (!s || s.length === 0)
      return s;
    var t = s.charAt(0).toUpperCase() + s.substr(1).replace(/[A-Z]/g, ' $&');
    return t.replace('.', ' ');
  },
  isMSIE: function () {
    return (document.documentMode || /Edge/.test(navigator.userAgent));
  },
  // return the value for a field
  valFor: function (aAr, vAr, key) {
    var idx = aAr.indexOf(key);
    if ((idx > -1) && (idx < vAr.length)) {
      return vAr[idx];
    }
    return null;
  },
  // return a map with unique values and their counts for a field
  countsFor: function (aAr, vAr, key) {
    const counts = {};
    const idx = aAr.indexOf(key);
    for (let i = 0; i < vAr.length; i++) {
      if (!counts[vAr[i][idx]])
        counts[vAr[i][idx]] = 0;
      counts[vAr[i][idx]]++;
    }
    return counts;
  },
  // extract the name of the router from the router id
  nameFromId: function (id) {
    // the router id looks like
    //  amqp:/_topo/0/routerName/$management'
    //  amqp:/_topo/0/router/Name/$management'
    //  amqp:/_edge/routerName/$management'
    //  amqp:/_edge/router/Name/$management'

    var parts = id.split('/');
    // remove $management
    parts.pop();

    // remove the area if present
    if (parts[2] === '0')
      parts.splice(2, 1);

    // remove amqp/(_topo or _edge)
    parts.splice(0, 2);
    return parts.join('/');
  },

  // construct a router id given a router name and type (_topo or _edge)
  idFromName: function (name, type) {
    const parts = ['amqp:', type, name, '$management'];
    if (type === '_topo')
      parts.splice(2, 0, '0');
    return parts.join('/');
  },

  // calculate the average rate of change per second for a list of fields on the given obj
  // store the historical raw values in storage[key] for future rate calcs
  // keep 'history' number of historical values
  rates: function (obj, fields, storage, key, history = 1) {
    let list = storage[key];
    if (!list) {
      list = storage[key] = [];
    }
    // expire old entries
    while (list.length > history) {
      list.shift();
    }
    const rates = {};
    list.push({
      date: new Date(),
      val: Object.assign({}, obj)
    });

    for (let i = 0; i < fields.length; i++) {
      let cumulative = 0;
      const field = fields[i];
      for (let j = 0; j < list.length - 1; j++) {
        const elapsed = list[j + 1].date - list[j].date;
        const diff = list[j + 1].val[field] - list[j].val[field];
        if (elapsed > 100)
          cumulative += diff / (elapsed / 1000);
      }
      rates[field] = list.length > 1 ? cumulative / (list.length - 1) : 0;
    }
    return rates;
  },
  connSecurity: function (conn) {
    if (!conn.isEncrypted)
      return 'no-security';
    if (conn.sasl === 'GSSAPI')
      return 'Kerberos';
    return conn.sslProto + '(' + conn.sslCipher + ')';
  },
  connAuth: function (conn) {
    if (!conn.isAuthenticated)
      return 'no-auth';
    let sasl = conn.sasl;
    if (sasl === 'GSSAPI')
      sasl = 'Kerberos';
    else if (sasl === 'EXTERNAL')
      sasl = 'x.509';
    else if (sasl === 'ANONYMOUS')
      return 'anonymous-user';
    if (!conn.user)
      return sasl;
    return conn.user + '(' + sasl + ')';
  },
  connTenant: function (conn) {
    if (!conn.tenant) {
      return '';
    }
    if (conn.tenant.length > 1)
      return conn.tenant.replace(/\/$/, '');
  }

};
module.exports = utils;
