'use strict';

const Collector = require('./collector'),
      Dashboard = require('./dashboard-api');

let collector = {},
    dashboard = {};

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
      options.collector.sessionStore = options.sessionStore;
      options.dashboard.sessionStore = options.sessionStore;
    }
    
    module.exports.collector = collector = new Collector(options.collector);
    module.exports.dashboard = dashboard = new Dashboard(Object.assign({}, options.dashboard, {collector}));

    resolve(options);
  });
}
