const Cayenne = require('cayennejs');

require('./authentication.js');
var sem = require('semaphore')(1);

var connection =  new Cayenne.MQTT(credentials);

var cmd_queue = [];
var last_enabled_temp = "42";

var queue = [];
var inhibitDeInputs = false;
var reenableCounter = 0;
var lastDEInput = 1;

var cmds = {
    "OutdoorTemp"         : [null,  60, null,  1, "temp", "c",       '5525', 2, 10,   1, 0],
    "SolarPanelTemp"      : [null,  60, null,  2, "temp", "c",       '6564', 2, 10,   1, 0],
    "HotWaterTemp"        : [null,  30, null,  3, "temp", "c",       '0804', 2, 10,   1, 0],
    "HotWaterTempTarget"  : [null,  30, null,  4, "temp", "c",       '6300', 1, 1,    1, 0],
    "BurnerTemp"          : [null,   5, null,  6, "temp", "c",       '0802', 2, 10,   1, 0],
    "HeatingTempTarget"   : [null,  60, null,  7, "temp", "c",       '555A', 2, 10,   1, 0],
/*  "ExhaustGasTemp"      : [null,  30, null,  9, "temp", "c",       '0808', 2, 10,   1, 0],*/
    "StartsCounterBurner" : [null,  60, null, 10, "digital", "null", '088A', 2, 1,    1, 0],
    "RuntimeHoursBurner"  : [null, 600, null, 11, "digital", "null", '08A7', 4, 3600, 1, 0],
    "BurnerPowerThrottle" : [null,   5, null, 12, "analog", "p",     'A38F', 1, 2,    1, 0],
    "BoilerLowerTemp"     : [null,  30, null, 15, "temp", "c",       '6566', 2, 10,   1, 0],
    "BoilerLoading"       : [null,   5, null, 17, "digital", "null", '6513', 1, 1,    1, 0],
/*  "SolarPumpActive"     : [null,  30, null, 18, "digital", "null", '6552', 1, 1,    1, 0],*/
    "InternalPumpRPM"     : [null,   5, null, 19, "analog", "p",     '0A3C', 1, 1,    1, 0],
/*  "HeatingRequest"      : [null,  60, null, 20, "digital", "d",    '0A80', 1, 1,    1, 0],*/
    "RuntimeHoursSolar"   : [null, 900, null, 21, "digital", "null", '6568', 2, 1,    1, 0],
    "TotalSolarEnergy"    : [null, 120, null, 22, "digital", "null", '6560', 4, 1,    1, 0],
    "SwitchingValvePos"   : [null,  15, null, 23, "digital", "null", '0A10', 1, 1,    1, 0],

/*    "FlowTemp"            : [null,  60, null, 24, "temp", "c",       '080C', 2, 10,  10, 0], sempre 20 */
/*    "ReturnTemp"          : [null,  60, null, 25, "temp", "c",       '080A', 2, 10,  10, 0], sempre 20 */
/*    "WaterFlow"           : [null,  60, null, 26, "", "",            '0C24', 2, 1,    1, 0], sempre 0 */
    "HeatingPumpRPM"      : [null,  60, null, 28, "", "",            '7663', 1, 1,    1, 1],

    "EnableThermostat"    : [null,  5, null, 29, "", "",            '773A', 1, 1,    1, 0],
/*  "StartsCounterSolar"  : [null, 120, null, 30, "", "",            'CF50', 4, 1,    1, 0], */
    "DailySolarEnergy"    : [null, 120, null, 31, "", "",            'CF30', 4, 1000, 10, 0],
/*  "RoomTemp"            : [null,  60, null, 32, "temp", "c",       '2306', 1, 1,    1, 0], */
    "ActiveDEInput"       : [null,  5, null, 33, "", "",            '27D8', 1, 1,    1, 0],

/*  "DailySolarEnergyArray0"    : [null, 5, null, 32, "", "",            'CF30', 32, 1],*/
    
    "SolarPumpRPM"        : [null, 30, null, 34, "", "",             'CFB0', 1, 1, 1, 23],
/*    "ACSTemp"             : [null,  20, null, 35, "temp", "c",       '0814', 2, 10,  10, 0],*/
/*    "ComfortTemp"         : [null,  20, null, 36, "temp", "c",       '0812', 2, 10,  10, 0],*/
    
    
};


const net = require('net');

const vitalk = net.createConnection({ port: 3083 }, () => {
    //'connect' listener
    console.log('connected to server!');
});

vitalk.on('data', (data) => {

    console.log(data.toString());
    
    if (data.toString().startsWith("Welcome")) {
	return;
    }

    sem.leave();
    
    if (data.toString().startsWith("OK")) {
	return;
    }
    
    /*sem.take(function() { */
	key = queue.shift();

	var b = data.toString().split(";");
	var v = 0;

	for (i = (cmds[key][10] + cmds[key][7] - 1); i >= (cmds[key][10]); i--) {
	    v = (v * 256) + Number(b[i]);
	}

    if ((cmds[key][7] == 2) && (v > 32768)) {
	v = v - 65536;
    }
    
	update(key, v);
	//sem.leave();
    /*});*/

    
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
/*
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
*/
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

    if ((inhibitDeInputs == true) && (key == "BoilerLoading") && (value == 0))
    {
	reenableCounter--;
	console.log("Enable inputs in a while");
	if (reenableCounter == 0)
	{
	    console.log("Reenable inputs");
	    inhibitDeInputs = false;
	    write("ActiveDEInput", lastDEInput);
	    read("ActiveDEInput");
	}
    }
    
    if (cmds[key][2] != value) {

	cmds[key][2] = value;
	
	console.log(key + ": " + value);

	if (connected == false) {
	    return;
	}

	connection.rawWrite(cmds[key][3], value, cmds[key][4], cmds[key][5]);

	if ((key == "BoilerLoading") && (value == 1))
	{
	    console.log("Disable Inputs");
	    lastDEInput = cmds["ActiveDEInput"][2];
	    write("ActiveDEInput", 0);
	    read("ActiveDEInput");
	    
	    inhibitDeInputs = true;
	    reenableCounter = 20;
	}
	
	if (key == "HotWaterTempTarget")
	{
	    connection.rawWrite(90, value, "temp", "c");
	    connection.rawWrite(91, value < 21 ? 0 : 1, "", "");
	}

	if (key == "EnableThermostat")
	{
	    connection.rawWrite(92, value, "", "");
	}

	if (key == "ActiveDEInput")
	{
	    connection.rawWrite(93, value == 1 ? 0 : 1, "", "");
	}
    }
    
}

function read(key)
{
    sem.take( function() {

	console.log("REQ " +key);
	queue.push(key);
	var len = cmds[key][7] + cmds[key][10];
	
	vitalk.write("rg "+cmds[key][6]+" "+len+"\n");

	//sem.leave();
    });
}

function write(key, value)
{
    sem.take( function() {

	value = value * cmds[key][8];
	vitalk.write("rs "+cmds[key][6]+" "+value+"\n");
	//sem.leave();
    });
}


