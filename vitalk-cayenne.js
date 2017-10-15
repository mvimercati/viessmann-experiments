const Cayenne = require('cayennejs');

require('./authentication.js');
var sem = require('semaphore')(1);

var connection =  new Cayenne.MQTT(credentials);

var cmd_queue = [];
var last_enabled_temp = "45";

var queue = [];


var cmds = {
    "getTExtF"            : [null,  60, null, 1, "temp", "c",  '800', 2, 10],
    "getTSolarColl"       : [null,  60, null, 2, "temp", "c", '6564', 2, 10],
    "getTSan"             : [null,  10, null, 3, "temp", "c",  '804', 2, 10],
    "getTTargetSan"       : [null,  30, null, 4, "temp", "c", '6300', 1, 1],
    "getTempStp2"         : [null,  60, null, 5, "temp", "c",  '814', 2, 10],
    "getTCald"            : [null,   5, null, 6, "temp", "c",  '802', 2, 10],
    "getTempKsoll"        : [null,  60, null, 7, "temp", "c", '555A', 2, 10],
    /*        "getTempVLsollM1"     : [null,  60, null, 8, "temp", "c"],*/
    "getTGas"             : [null,  30, null, 9, "temp", "c",  '808', 2, 10],
    "getStartsCount"      : [null,  30, null, 10, "digital", "null", '88A', 2, 1],
    "getBrucHours"        : [null,  60, null, 11, "digital", "null", '8A7', 4, 3600],
    "getBrucPerc"         : [null,   5, null, 12, "analog", "p", 'A38F', 1, 2],
    /*        "getBrucStatLev"      : [null,   5, null, 13, "", "p"],*/
    /*        "getTempRL17A"        : [null,  30, null, 14, "temp", "c"],*/
    "getTBoilerDown"      : [null,  30, null, 15, "temp", "c", '6566', 2, 10],
    /*    "getTBoilerUp"        : [null,   5, null, 16, "temp", "c"],*/
    "getStatusBoilerLoad" : [null,   5, null, 17, "digital", "null", '6513', 1, 1],
    "getSolarPumpRPM"     : [null,  20, null, 18, "digital", "null", '6552', 1, 1],
    "getRiscPumpRPM"      : [null,  10, null, 19, "analog", "p", '7660', 2, 1],
    "getExtInputStatus"   : [null,  60, null, 20, "digital", "d", 'A80', 1, 1],
    "getSolarStunden"     : [null,  60, null, 21, "digital", "null", '6568', 2, 1],
    "getSolarLeistung"    : [null,  60, null, 22, "digital", "null", '6560', 4, 1],
    "getMischerM1"        : [null,  30, null, 23, "digital", "null", 'A10', 1, 1]
};


const net = require('net');

const vitalk = net.createConnection({ port: 3083 }, () => {
    //'connect' listener
    console.log('connected to server!');
});

vitalk.on('data', (data) => {

    if (data.toString().startsWith("Welcome")) {
	return;
    }

    //console.log(data.toString());
    
    if (data.toString().startsWith("OK")) {
	return;
    }
    
    sem.take(function() { 
	key = queue.shift();

	var b = data.toString().split(";");
	var v = 0;

	for (i = b.length - 2; i >= 0; i--) {
	    v = (v * 256) + Number(b[i]); 	    
	}

	//console.log("Received "+key+" = " + v / cmds[key][8]);

	update(key, v);
	
	sem.leave();
    });
});

vitalk.on('end', () => {
    console.log('disconnected from server');
});


// subscribe to data channel for actions (actuators)
connection.on("cmd90", function(data) {
    console.log(data);
    var temp = data["payload"].split(",")[1];

    if (temp != "20") {
	last_enabled_temp = temp;
    }

    write("getTTargetSan", temp);
    read("getTTargetSan");
    //cmd_queue.push("setTTargetSan "+temp+",getTTargetSan");
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


    write("getTTargetSan", temp);
    read("getTTargetSan");
    
    //cmd_queue.push("setTTargetSan "+temp+",getTTargetSan");
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

    if (connected == false) {
	return;
    }

    
//    var queue = cmd_queue;
    var d = new Date();
    var t = d.getTime();
    
    for (var key in cmds) {

	if ((cmds[key][0] == null) || ((t - cmds[key][0]) > cmds[key][1]*1000)) {

	    read(key);
		
	    cmds[key][0] = t;

	}
    }
/*
    if (queue.length == 0) {
	return;
    }
*/

});

function update(key, value)
{

    value = Math.round( value / cmds[key][8] );

    if (cmds[key][2] != value) {

	cmds[key][2] = value;
	
	console.log(key + ": " + value);

	if (connected == true) {
	    connection.rawWrite(cmds[key][3], value, cmds[key][4], cmds[key][5]);
	}

	if (key == "getTTargetSan") {
	    connection.rawWrite(90, value, "temp", "c");
	    connection.rawWrite(91, value < 21 ? 0 : 1, "", "");
	}
    }
    
}

function read(key)
{
    sem.take( function() {

	console.log("REQ " +key);
	queue.push(key);
	vitalk.write("rg "+cmds[key][6]+" "+cmds[key][7]+"\n");

	sem.leave();
    });
}

function write(key, value)
{
    sem.take( function() {

	console.log("WRI " +key);

	value = value * cmds[key][8];

	console.log(value);
	
	vitalk.write("rs "+cmds[key][6]+" "+value+"\n");

	sem.leave();
    });
}


