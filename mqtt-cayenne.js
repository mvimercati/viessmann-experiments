const Cayenne = require('cayennejs');

require('./authentication.js');

var connection =  new Cayenne.MQTT(credentials);

var cmd_queue = [];
var last_enabled_temp = "45";

var cmds = {
    "getTExtF"            : [null,  60, null, 1, "temp", "c"],
    "getTSolarColl"       : [null,  60, null, 2, "temp", "c"],
    "getTSan"             : [null,  10, null, 3, "temp", "c"],
    "getTTargetSan"       : [null,  30, null, 4, "temp", "c"],
    "getTempStp2"         : [null,  60, null, 5, "temp", "c"],
    "getTCald"            : [null,   5, null, 6, "temp", "c"],
    "getTempKsoll"        : [null,  60, null, 7, "temp", "c"],
/*        "getTempVLsollM1"     : [null,  60, null, 8, "temp", "c"],*/
    "getTGas"             : [null,  30, null, 9, "temp", "c"],
    "getStartsCount"      : [null,  30, null, 10, "digital", "null"],
    "getBrucHours"        : [null,  60, null, 11, "digital", "null"],
    "getBrucPerc"         : [null,   5, null, 12, "analog", "p"],
/*        "getBrucStatLev"      : [null,   5, null, 13, "", "p"],*/
/*        "getTempRL17A"        : [null,  30, null, 14, "temp", "c"],*/
    "getTBoilerDown"      : [null,  30, null, 15, "temp", "c"],
    /*    "getTBoilerUp"        : [null,   5, null, 16, "temp", "c"],*/
    "getStatusBoilerLoad" : [null,   5, null, 17, "digital", "d"],
    "getSolarPumpRPM"     : [null,  20, null, 18, "analog", "p"],
    "getRiscPumpRPM"      : [null,  10, null, 19, "analog", "p"],
    "getExtInputStatus"   : [null,  60, null, 20, "digital", "d"],
    "getSolarStunden"     : [null,  60, null, 21, "digital", "null"],
    "getSolarLeistung"    : [null,  60, null, 22, "digital", "null"]
};


// subscribe to data channel for actions (actuators)
connection.on("cmd90", function(data) {
    console.log(data);
    var temp = data["payload"].split(",")[1];

    if (temp != "20") {
	last_enabled_temp = temp;
    }
    
    cmd_queue.push("setTTargetSan "+temp+",getTTargetSan");
});

connection.on("cmd91", function(data) {
    console.log(data);
    var enable = data["payload"].split(",")[1];
    var temp;

    if (enable == "0") {
	temp = "20";
    } else {
	temp = last_enabled_temp;
    }
    
    cmd_queue.push("setTTargetSan "+temp+",getTTargetSan");
});


var connected = false;

connection.connect( function(data) {

    connected = true;
    console.log("CONNECT!!!");
});


connection.on("disconnect", function() {

    connected = false;
    console.log("DISCONNECTED - TRY TO RECONNECT!!!!");

    var connection = new Cayenne.MQTT(credentials);
});

setInterval(function() {

    for (var key in cmds) {
	cmds[key][0] = 0;    
    }
    
}, 3600*1000);

setInterval(function() {

    const spawn = require('child_process').spawnSync;
    const vclient = spawn('/bin/cat', ['\/sys\/class\/thermal\/thermal_zone0\/temp'], {shell: '/bin/bash'});
    
    var f = Math.round(parseFloat(vclient.stdout.toString()) / 1000 );

    var d = new Date();
    
    if (connected == true) {
	connection.rawWrite(100, f, "temp","c");
	connection.rawWrite(200, d.getHours() * 10000 + d.getMinutes()*100 + d.getSeconds(), "digital","null");
    }

}, 5000);

setInterval(function() {
    
    var queue = cmd_queue;
    var d = new Date();
    var t = d.getTime();
    
    for (var key in cmds) {

	if ((cmds[key][0] == null) || ((t - cmds[key][0]) > cmds[key][1]*1000)) {

	    queue.push(key);
	    cmds[key][0] = t;		    
	}
    }

    if (queue.length == 0) {
	return;
    }
    
    console.log(queue.join(","));
    
    const spawn = require('child_process').spawnSync;
    const vclient = spawn('/home/pi/vcontrold/bin/vclient', ['-h','localhost','-p','3002','-c','"synchronize,'+queue.join(",")+'"'], {shell: '/bin/bash'});

    var lines = vclient.stdout.toString().split('\n');

    var result;
    var current;
    
    lines.forEach(function(line) {

	result = line.match('(.*):');
	
	if (result != null) {
	    current = result[1];

	} else {

	    result = line.split(" ");

	    if (result != null) {
		if (result != "OK") {

		    if (result[0].length) {

			/*var f = Math.round(parseFloat(result[0]) * 10) / 10;*/
			var f = Math.round(parseFloat(result[0]));
			
			if (cmds[current][2] != f) {

			    cmds[current][2] = f;
			    console.log(current + ": " + f);

			    if (connected == true) {
				connection.rawWrite(cmds[current][3], f, cmds[current][4], cmds[current][5]);
			    }

			    if (current == "getTTargetSan") {
				connection.rawWrite(90, f, "temp", "c");
				connection.rawWrite(91, f < 21 ? 0 : 1, "", "");				
			    }
			}

		    }
		}
	    }
	    
	}

	
    });
    
    cmd_queue = [];
    
}, 1000);



