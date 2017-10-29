const Cayenne = require('cayennejs');

require('./authentication.js');
var sem = require('semaphore')(1);

var connection =  new Cayenne.MQTT(credentials);

var cmd_queue = [];
var last_enabled_temp = "45";

var queue = [];


var cmds = {
    "OutdoorTemp"         : [null,  60, null,  1, "temp", "c",       '5525', 2, 10, 10],
    "SolarPanelTemp"      : [null,  60, null,  2, "temp", "c",       '6564', 2, 10, 10],
    "HotWaterTemp"        : [null,  30, null,  3, "temp", "c",       '0804', 2, 10, 10],
    "HotWaterTempTarget"  : [null,  30, null,  4, "temp", "c",       '6300', 1, 1,   1],
    "BurnerTemp"          : [null,   5, null,  6, "temp", "c",       '0802', 2, 10,  1],
    "HeatingTempTarget"   : [null,  60, null,  7, "temp", "c",       '555A', 2, 10,  1],
    "ExhaustGasTemp"      : [null,  30, null,  9, "temp", "c",       '0808', 2, 10,  1],
    "StartsCounterBurner" : [null,  60, null, 10, "digital", "null", '088A', 2, 1,   1],
    "RuntimeHoursBurner"  : [null, 600, null, 11, "digital", "null", '08A7', 4, 3600, 1],
    "BurnerPowerThrottle" : [null,   5, null, 12, "analog", "p",     'A38F', 1, 2,    1],
    "BoilerLowerTemp"     : [null,  30, null, 15, "temp", "c",       '6566', 2, 10,  10],
    "BoilerLoading"       : [null,   5, null, 17, "digital", "null", '6513', 1, 1,    1],
    "SolarPumpActive"     : [null,  30, null, 18, "digital", "null", '6552', 1, 1,    1],
    "InternalPump"        : [null,   5, null, 19, "analog", "p",     '0A3C', 1, 1,    1],
    "HeatingRequest"      : [null,  60, null, 20, "digital", "d",    '0A80', 1, 1,    1],
    "RuntimeHoursSolar"   : [null, 900, null, 21, "digital", "null", '6568', 2, 1,    1],
    "TotalSolarEnergy"    : [null, 120, null, 22, "digital", "null", '6560', 4, 1,    1],
    "SwitchingValvePos"   : [null,  15, null, 23, "digital", "null", '0A10', 1, 1,    1],

/*    "MandataFlowTemp?"    : [null,  60, null, 24, "temp", "c",       '080C', 2, 10],*/
/*    "ReturnTemp?"         : [null,  60, null, 25, "temp", "c",       '080A', 2, 10],*/
/*    "WaterFlow?"          : [null,  60, null, 26, "", "",            '0C24', 2, 1],*/
/*    "StatoPompaRisc?"     : [null,  60, null, 28, "", "",            '7663', 2, 256],*/

    "EnableThermostat"    : [null,  60, null, 29, "", "",            '773A', 1, 1,    1],
    "StartsCounterSolar"  : [null, 120, null, 30, "", "",            'CF50', 4, 1,    1],
    "DailySolarEnergy"    : [null, 120, null, 31, "", "",            'CF30', 4, 1000, 10],
    "RoomTemp"            : [null,  60, null, 32, "temp", "c",       '2306', 1, 1,    1],
    
    "ActiveDEInput"       : [null,  60, null, 33, "", "",            '27D8', 1, 1,    1],
    
    
/*    "DailySolarEnergyArray0"    : [null, 5, null, 32, "", "",            'CF30', 32, 1],*/
    
/*    "solar"       : [null, 30, null, 40, "", "",            'CFB0',  24, 1, 1],*/
    
    /*"solar"       : [null, 5, null, 40, "", "",            'CF**00-19',  19, 1, 1],*/
    /*"hotwater"    : [null, 5, null, 40, "", "",            '67**56-XX',   2, 1, 1],*/
    /* CFC7 /C6 pompa solare */
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

    write("HotWaterTempTarget", temp);
    read("HotWaterTempTarget");
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

    write("HotWaterTempTarget", temp);
    read("HotWaterTempTarget");
});

connection.on("cmd92", function(data) {
    console.log(data);
    var enable = data["payload"].split(",")[1];
    var temp;

    if (enable == "0") {
	write("EnableThermostat", 0);
    } else {
	write("EnableThermostat", 1);
    }

    read("EnableThermostat");
});

connection.on("cmd93", function(data) {
    console.log(data);
    var enable = data["payload"].split(",")[1];
    var temp;

    if (enable == "0") {
	write("ActiveDEInput", 1);
    } else {
	write("ActiveDEInput", 3);
    }

    read("ActiveDEInput");
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
});

function update(key, value)
{
    value = value / cmds[key][8];
    value = Math.round( value * cmds[key][9] ) / cmds[key][9];

    if (cmds[key][2] != value) {

	cmds[key][2] = value;
	
	console.log(key + ": " + value);

	if (connected == false) {
	    return;
	}

	connection.rawWrite(cmds[key][3], value, cmds[key][4], cmds[key][5]);

	if (key == "HotWaterTempTarget") {
	    connection.rawWrite(90, value, "temp", "c");
	    connection.rawWrite(91, value < 21 ? 0 : 1, "", "");
	}

	if (key == "EnableThermostat") {
	    connection.rawWrite(92, value, "", "");
	}

	if (key == "ActiveDEInput") {
	    connection.rawWrite(93, value == 1 ? 0 : 1, "", "");
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

	value = value * cmds[key][8];
	vitalk.write("rs "+cmds[key][6]+" "+value+"\n");
	sem.leave();
    });
}


