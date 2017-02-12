'use strict';

const Collector = require('./collector'),
      Dashboard = require('./dashboard-api');

let collector = {},
    dashboard = {};

function diagnostics() {
  setTimeout(() => {
    console.log('## Connection count: %d', Object.keys(collector.connections).length);
    diagnostics();
  }, 5000);
}

diagnostics();
// TODO: ws.onDisconnect - remove the connection from the hashmap

module.exports.start = (options) => {
  return new Promise((resolve, reject) => {
    options = options || {};

    if (!options.collector) {
      options.collector = { autoStart: true, port: 16999 };
    }

    if (!options.dashboard) {
      options.dashboard = { autoStart: true, port: 16998 };
    }

    if (options.sessionStore) {
      options.collector.sessionStore = sessionStore;
      options.dashboard.sessionStore = sessionStore;
    }
    
    collector = new Collector(options.collector);
    dashboard = new Dashboard(Object.assign({}, options.dashboard, {collector}));

    resolve(options);
  });
}

module.exports.collector = collector;
module.exports.dashboard = dashboard;
