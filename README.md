node-red-contrib-globalcache
==========================
# Description
Global Cache (iTach & iTach flex) nodes for node-red.

iTach protocol documentation: http://www.globalcache.com/files/docs/API-iTach.pdf

# What's inside?
It will include three nodes:

'gc-controller' : a unique CONFIG node that holds connection configuration for GlobalCache and will acts as the encapsulator for GlobalCache access. As a node-red 'config' node, it cannot be added to a graph, but it acts as a singleton object that gets created in the the background when you add an 'gc' or 'gc-device' node and configure it accordingly.

-- 'gc-out' : GlobalCache output node that can send GlobalCache, so it can be used with function blocks.

-- 'gc-in': GlobalCache listener node, who emits flow messages based on activity on the GlobalCache bus. Not working in v0.2.0.

-- payload contains:

--- string data - REQUIRED

**Right now it not tested in all directions, working with IP2CC and WF2IR.**
 
# Usage

According to official documentation: http://nodered.org/docs/getting-started/adding-nodes.html
 
# License

![Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png "CC BY-NC-SA 4.0")

#TODO

Implement autodiscovery by Beacon and arp tables