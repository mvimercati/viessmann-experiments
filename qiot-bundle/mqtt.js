/**
 *   This sample code demo random number value send to QIoT Suite Lite by MQTT protocol
 *   requirement:
 *   -- npm install 
 *   run command: node mqtt.js
 */

'use strict';

var qiot = require('./lib/qiot');

/**
 * Setup connection options
 */
var connection = new qiot(qiot.protocol.MQTT);
var connection_option = connection.readResource('./res/resourceinfo.json', './ssl/');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var cmds = {
    "getTExtF"            : [null,  60, null],
    "getTSan"             : [null,   5, null],
    "getTTargetSan"       : [null,  60, null],
    "getTempStp2"         : [null,  60, null],
    "getTCald"            : [null,   5, null],
    "getTempKsoll"        : [null,  60, null],
    "getTempVLsollM1"     : [null,  60, null],
    "getTGas"             : [null,  15, null],
    "getStartsCount"      : [null,  30, null],
    "getBrucHours"        : [null,  60, null],
    "getBrucPerc"         : [null,   5, null],
    "getBrucStatLev"      : [null,   5, null],
    "getTempRL17A"        : [null,  30, null],
    "getTSolarColl"       : [null,  15, null],
    "getTBoilerDown"      : [null,   5, null],
    "getTBoilerUp"        : [null,   5, null],
    "getStatusBoilerLoad" : [null,   5, null],
    "getSolarPumpRPM"     : [null,  20, null],
    "getRiscPumpRPM"      : [null,  20, null],
    "getExtInputStatus"   : [null,  60, null],
    "getSolarStunden"     : [null,  60, null],
    "getSolarLeistung"    : [null,  60, null]
};



/**
 * Send data to QIoT Suite Lite.
 * content of ./res/resourceinfo.json
 * {
 *     ...
 *     "resources": [
 *         {
 *              ...
 *              "resourceid": "temp",
 *              "topic": "qiot/things/admin/abccccc/temp",
 *              ...
 *          }
 *      ,null]
 *  }
 */
connection.on('connect', function(data) {

    connection.subscribeById('setTTargetSan');
    
    setInterval(function() {
        // TODO: you could replace "temp" by any resource id set form QIoT Suite Lite
        //connection.publishById("TempExt", 30); //getRandomInt(0, 50));

        // or publish by resource topic
        // TODO: you could replace "qiot/things/admin/edison/temp" by any Topic form QIoT Suite Lite like following
        // connection.publishByTopic("qiot/things/admin/edison/temp", getRandomInt(0, 50));

	var queue = [];
	var d = new Date();
	var t = d.getTime();
	
	for (var key in cmds) {

	    if ((cmds[key][0] == null) || ((t - cmds[key][0]) > cmds[key][1]*1000)) {

		    queue.push(key);
		    cmds[key][0] = t;		    
	    }
	}

	console.log(queue.join(","));
	
	const spawn = require('child_process').spawnSync;
	const vclient = spawn('/home/pi/vcontrold/bin/vclient', ['-h','localhost','-p','3002','"synchronize,'+queue.join(",")+'"'], {shell: '/bin/bash'});

	var lines = vclient.stdout.toString().split('\n');

	var result;
	var current;
	
	lines.forEach(function(line) {

	    result = line.match('(.*):');
	    
	    if (result != null) {
		current = result[1];
		console.log(current);
	    } else {

		result = line.split(" ");

		if (result != null) {

		    if (result[0].length) {

			var f = Math.round(parseFloat(result[0]) * 10) / 10;
			
			if (cmds[current][2] != f) {
			    
			    cmds[current][2] = f;

			    console.log(f);
			    
			    connection.publishById(current, cmds[current][2]);
			}
		    }

		    if (result.length > 1) {
//			console.log(result[1]);
		    }
		    
		}
		
	    }

	    
	});
	
	
	//vclient -h localhost -p 3002 "synchronize,#{queue.join(",")}"`

//	console.log(`${vclient.stdout}`);
	
//	console.log(`stderr: ${vclient.stderr.toString()}` );
//	console.log(`stdout: ${vclient.stdout.toString()}` );
 	
    }, 5000);
});

connection.on('message', function(data) {
    console.log("MESSAGE -> "  + data);
});

connection.connect(connection_option);
