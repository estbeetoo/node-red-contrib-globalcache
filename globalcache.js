/**
 * Created by aborovsky on 27.08.2015.
 */

var iTach = require('globalcache').iTach;

function timestamp() {
    return new Date().
        toISOString().
        replace(/T/, ' ').      // replace T with a space
        replace(/\..+/, '')
}
function log(msg, args) {
    if (args)
        console.log(timestamp() + ': ' + msg, args);
    else
        console.log(timestamp() + ': ' + msg);
}

module.exports = function (RED) {

    log("loading Global Cache for node-red");

    /**
     * ====== GC-CONTROLLER ================
     * Holds configuration for gcjs host+port,
     * initializes new gcjs connections
     * =======================================
     */
    function GCControllerNode(config) {
        log("new GCControllerNode, config: %j", config);
        RED.nodes.createNode(this, config);
        this.host = config.host;
        this.port = config.port;
        this.mode = config.mode;
        this.gcjsconn = null;
        var node = this;

        /**
         * Initialize an gcjs socket, calling the handler function
         * when successfully connected, passing it the gcjs connection
         */
        this.initializeGCConnection = function (handler) {
            if (node.gcjsconn) {
                log('already configured to GlobalCache device at ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
                if (handler && (typeof handler === 'function'))
                    handler(node.gcjsconn);
                return node.gcjsconn;
            }
            log('configuring to GlobalCache device at ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
            node.gcjsconn = null;
            if (config.mode === 'request-disconnect') {
                node.gcjsconn = new iTach({host: config.host, port: config.port});
                log('GC: successfully connected to ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
                if (handler && (typeof handler === 'function'))
                    handler(node.gcjsconn);
            }
            else
                throw 'Unsupported mode[' + config.mode + ']'
            return node.gcjsconn;
        };
        this.on("close", function () {
            log('disconnecting from gcjs server at ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
            node.gcjsconn && node.gcjsconn.disconnect && node.gcjsconn.disconnect();
        });
    }

    RED.nodes.registerType("gc-controller", GCControllerNode);

    /**
     * ====== GC-OUT =======================
     * Sends outgoing Global Cache device from
     * messages received via node-red flows
     * =======================================
     */
    function GCOut(config) {
        log('new GC-OUT, config: %j', config);
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.ctrl = RED.nodes.getNode(config.controller);
        var node = this;
        //
        this.on("input", function (msg) {
            log('gcout.onInput, msg=%j', msg);
            if (!(msg && msg.hasOwnProperty('payload'))) return;
            var payload;
            if (typeof(msg) === "string")
                payload = msg;
            else if (typeof(msg) === "object" && msg.payload)
                payload = msg.payload.toString();

            if (payload == null) {
                log('gcout.onInput: illegal msg.payload or msg!');
                return;
            }
            this.send(payload, function (err) {
                if (err) {
                    log('send error: %j', err);
                }
            });

        });
        this.on("close", function () {
            log('gcOut.close');
        });

        node.status({fill: "yellow", shape: "dot", text: "inactive"});

        function nodeStatusConnected() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        }

        function nodeStatusDisconnected() {
            node.status({fill: "red", shape: "dot", text: "disconnected"});
        }

        function nodeStatusConnecting() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
        }

        this.send = function (data, callback) {
            log('send data[' + data + ']');
            // init a new one-off connection from the effectively singleton GCController
            // there seems to be no way to reuse the outgoing conn in adreek/node-gcjs
            this.ctrl.initializeGCConnection(function (connection) {
                if (connection.connected)
                    nodeStatusConnected();
                else
                    nodeStatusDisconnected();
                connection.removeListener('connecting', nodeStatusConnecting);
                connection.on('connecting', nodeStatusConnecting);
                connection.removeListener('connected', nodeStatusConnected);
                connection.on('connected', nodeStatusConnected);
                connection.removeListener('disconnected', nodeStatusDisconnected);
                connection.on('disconnected', nodeStatusDisconnected);

                try {
                    log("send: %j", JSON.stringify(data));
                    connection.send(data, function (err) {
                        callback && callback(err);
                    });
                }
                catch (err) {
                    log('error calling send!: %j', err);
                    callback(err);
                }
            });
        }
    }

    //
    RED.nodes.registerType("gc-out", GCOut);

    //TODO: implement it!
    /**
     * ====== GlobalCache-IN ========================
     * Handles incoming Global Cache, injecting
     * json into node-red flows
     * =======================================
     */
    function GCIn(config) {
        log('new GCIn, config: %j', config);
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.connection = null;
        var node = this;
        var gcjsController = RED.nodes.getNode(config.controller);
        /* ===== Node-Red events ===== */
        this.on("input", function (msg) {
            if (msg != null) {

            }
        });
        var node = this;
        this.on("close", function () {
            if (node.receiveEvent && node.connection)
                node.connection.removeListener('event', node.receiveEvent);
            if (node.receiveStatus && node.connection)
                node.connection.removeListener('status', node.receiveStatus);
        });

        function nodeStatusConnecting() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
        }

        function nodeStatusConnected() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        }

        function nodeStatusDisconnected() {
            node.status({fill: "red", shape: "dot", text: "disconnected"});
        }

        node.receiveData = function (data) {
            log('gc event data[' + data.toString('hex') + ']');
            node.send({
                topic: 'gc',
                payload: {
                    'data': data.toString()
                }
            });
        };

//		this.on("error", function(msg) {});

        /* ===== gcjs events ===== */
        gcjsController.initializeGCConnection(function (connection) {
            node.connection = connection;
            node.connection.removeListener('event', node.receiveData);
            node.connection.on('data', node.receiveData);

            if (node.connection.connected)
                nodeStatusConnected();
            else
                nodeStatusDisconnected();
            node.connection.removeListener('connecting', nodeStatusConnecting);
            node.connection.on('connecting', nodeStatusConnecting);
            node.connection.removeListener('connected', nodeStatusConnected);
            node.connection.on('connected', nodeStatusConnected);
            node.connection.removeListener('disconnected', nodeStatusDisconnected);
            node.connection.on('disconnected', nodeStatusDisconnected);
        });
    }

    //
    RED.nodes.registerType("gc-in", GCIn);

    log("registering foobar controller node");
    try {
        new GCControllerNode({host: 'foobar.local', port: 666, mode: 'request-disconnect'});
    } catch (e) {
        log("error registering foobar controller node, cause:\n%j", e);
    }
}
