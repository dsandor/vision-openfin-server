'use strict';

const uuid = require('uuid'),
      { Server }  = require('ws'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      debug = require('debug')('vision-collector');


function sendMessage(socket, type, message) {
  return new Promise((resolve, reject) => {
    socket.send(JSON.stringify(Object.assign({ type }, message)), (err) => {
      if (!err) return resolve();

      debug('COL - got error from client [%s]: %s', socket.connectionId, err.message);

      return reject(err);
    });
  });
}

function sendTicks(socket, tickFrequency = 5000) {
  setTimeout(() => {
    sendMessage(socket, 'tick', { time: new Date() })
      .then(() => sendTicks(socket, tickFrequency))
      .catch(() => {
        debug('removing client connect due to failure');
        if (this && this.connections) {
          delete this.connections[socket.connectionId];
        } else {
          debug('attempted to remove failed client but this.connections did not exist.');
        }
      });
  }, tickFrequency);
}

class Collector extends EventEmitter {
  constructor(options) {
    super();
    options = options || {};
    this.port = options.port || 16999;
    this.connections = {}
    this.wsServer = new Server({ port: this.port });
    this.sessionStore = options.sessionStore;  // TODO: Validate session store has correct interface.
    this.tickFrequency = options.tickFrequency || 5000;

    if (options.autoStart) this.initSocket();
  }

  initSocket() {
    this.wsServer.on('connection', (ws) => {
      const connectionId = uuid.v4();

      ws.connectionId = connectionId; // eslint-disable-line no-param-reassign
      this.connections[connectionId] = ws;

      sendMessage(ws, 'handshake', { connectionId });

      ws.on('message', (message) => {
        const parsedMessage = _.attempt(JSON.parse, message);

        if (_.isError(parsedMessage)) {
          debug('Error parsing message from client.  msg:', message, '\nresult:', parsedMessage);
          return;
        }

        if (parsedMessage.type === 'heartbeat') {
          ws.lastHeartbeat = parsedMessage;

          if (this.sessionStore && this.sessionStore.saveSession) {
            this.sessionStore.saveSession(connectionId, parsedMessage);
          }
        }

        if (parsedMessage.type === 'screenshot' && this.sessionStore) {
          this.sessionStore.saveScreenshot(connectionId, parsedMessage.data);
          return this.emit(
            'client-message',
            connectionId,
            JSON.stringify(Object.assign({}, parsedMessage, { data: undefined, connectionId }))
          );
        }

        if (parsedMessage.type === 'user-action') {
          ws.lastAction = { date: + new Date(), action: parsedMessage.action };
        }

        debug('[id:%s] received: %s', connectionId, message);
        this.emit('client-message', connectionId, message);
      });

      ws.on('close', (reason) => {
        if (this.connections && this.connections[connectionId]) {
          debug('removing closed connection:', connectionId, reason);

          try {
            delete this.connections[connectionId];
          } catch(err) {
            debug('~~ Failed removing a closed connection from this.connections in collector:', err);
          }
        } else {
          debug('ws connection closed but this.connections not set or connectionId not found in hashmap:', connectionId);
        }
      });

      sendTicks(ws, this.tickFrequency);
    });
  }


}

module.exports = Collector;
