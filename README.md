node-red-contrib-globalcache
==========================
## Description
Global Cache (iTach & iTach flex) nodes for node-red.

iTach protocol documentation: http://www.globalcache.com/files/docs/API-iTach.pdf

## Install via NPM

From inside your node-red directory:
```
npm install node-red-contrib-globalcache
```

## What's inside?
It includes three nodes:

1. ```globalcache-controller``` : a unique CONFIG node that holds connection configuration for GlobalCache and will acts as the encapsulator for GlobalCache access. As a node-red 'config' node, it cannot be added to a graph, but it acts as a singleton object that gets created in the the background when you add an 'gc' or 'gc-device' node and configure it accordingly.

2. ```globalcache-out``` : GlobalCache output node that can send GlobalCache, so it can be used with function blocks.

3. ```globalcache-in```: GlobalCache listener node, who emits flow messages based on activity on the GlobalCache bus. Not working in v0.2.0.

Message contains fields:

- ```payload``` - (**REQUIRED**) must be JavaScript object or a string, an example:
```
{  
   "serial":"setstate,1:1,1"
}
```
or
```
setstate,1:1,1
```
If one specify three parameters: ```unit_number```, ```output``` and ```command```, than all incoming string commands will be transformed into GlobalCache packet: ```[command],[unit_number]:[output],[command]```

- ```format``` - must be equal ```ccf``` or ```hex```for IR Commands 
- ```justnow``` - should contain ```true``` for commands that shoulds be executed just now (without Queue of commands)

**Right now it not tested in all directions, working with IP2CC and WF2IR.**
 
# Usage

According to official documentation: http://nodered.org/docs/getting-started/adding-nodes.html
 
# License

![Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png "CC BY-NC-SA 4.0")

#TODO

Implement autodiscovery by Beacon and arp tables
