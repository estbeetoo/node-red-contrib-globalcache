/**
 * Created by aborovsky on 27.08.2015.
 */

var util = require('util'),
    iTach = require('globalcache').iTach;

module.exports = function (RED) {

    /**
     * ====== GC-CONTROLLER ================
     * Holds configuration for gcjs host+port,
     * initializes new gcjs connections
     * =======================================
     */
    function GCControllerNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = config.host;
        this.port = config.port;
        this.mode = config.mode;
        this.gcjsconn = null;
        var node = this;
        node.log("new GCControllerNode, config: %j", config);

        /**
         * Initialize an gcjs socket, calling the handler function
         * when successfully connected, passing it the gcjs connection
         */
        this.initializeGCConnection = function (handler) {
            if (node.gcjsconn) {
                node.log('already configured to GlobalCache device at ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
                if (handler && (typeof handler === 'function'))
                    handler(node.gcjsconn);
                return node.gcjsconn;
            }
            node.log('configuring to GlobalCache device at ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
            node.gcjsconn = null;
            if (config.mode === 'request-disconnect') {
                node.gcjsconn = new iTach({host: config.host, port: config.port});
                node.log('GC: successfully connected to ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
                if (handler && (typeof handler === 'function'))
                    handler(node.gcjsconn);
            }
            else
                throw 'Unsupported mode[' + config.mode + ']'
            return node.gcjsconn;
        };
        this.on("close", function () {
            node.log('disconnecting from gcjs server at ' + config.host + ':' + config.port + ' in mode[' + config.mode + ']');
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
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.ctrl = RED.nodes.getNode(config.controller);
        var node = this;
        node.log('new GC-OUT, config: ' + util.inspect(config));
        //
        this.on("input", function (msg) {
            node.log('gcout.onInput msg[' + util.inspect(msg) + ']');
            if (!(msg && msg.hasOwnProperty('payload'))) return;
            var payload = msg.payload;
            if (typeof(msg.payload) === "object") {
                payload = msg.payload;
            } else if (typeof(msg.payload) === "string") {
                try {
                    payload = JSON.parse(msg.payload);
                } catch (e) {
                    payload = msg.payload.toString();
                }
            }
            if (payload == null) {
                node.log('gcout.onInput: illegal msg.payload!');
                return;
            }
            this.send(payload, function (err) {
                if (err) {
                    node.error('send error: ' + err);
                }
            });

        });
        this.on("close", function () {
            node.log('gcOut.close');
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
            node.log('send data[' + data + ']');
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
                    node.log("send:  " + JSON.stringify(data));
                    connection.send(data, function (err) {
                        callback && callback(err);
                    });
                }
                catch (err) {
                    node.error('error calling send: ' + err);
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
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.connection = null;
        var node = this;
        node.log('new GCIn, config: %j', config);
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
            node.log('gc event data[' + data.toString('hex') + ']');
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

    RED.nodes.registerType("gc-in", GCIn);
}
