const Cayenne = require('cayennejs');

var connection =  new Cayenne.MQTT({
    username: "9add20f0-9651-11e7-94c8-a1bba3f5296f",
    password: "362012fd2e87f634ec6baa394c8b3c0874107795",
    clientId: "2ede4a40-9666-11e7-9727-55550d1a07e7"
});


var cmd_queue = [];

var cmds = {
    "getTExtF"            : [null,  60, null, 1, "temp", "c"],
    "getTSolarColl"       : [null,  60, null, 2, "temp", "c"],
    "getTSan"             : [null,  10, null, 3, "temp", "c"],
    "getTTargetSan"       : [null,  60, null, 4, "temp", "c"],
        "getTempStp2"         : [null,  60, null, 5, "temp", "c"],
    "getTCald"            : [null,   5, null, 6, "temp", "c"],
        "getTempKsoll"        : [null,  60, null, 7, "temp", "c"],
        "getTempVLsollM1"     : [null,  60, null, 8, "temp", "c"],
    "getTGas"             : [null,  60, null, 9, "temp", "c"],
    "getStartsCount"      : [null,  30, null, 10, "", ""],
    "getBrucHours"        : [null,  60, null, 11, "", "ore"],
    "getBrucPerc"         : [null,   5, null, 12, "", "%"],
/*        "getBrucStatLev"      : [null,   5, null, 13, "", "p"],*/
        "getTempRL17A"        : [null,  30, null, 14, "temp", "c"],
    "getTBoilerDown"      : [null,  10, null, 15, "temp", "c"],
    /*    "getTBoilerUp"        : [null,   5, null, 16, "temp", "c"],*/
    "getStatusBoilerLoad" : [null,   5, null, 17, "", ""],
    "getSolarPumpRPM"     : [null,  20, null, 18, "", "%"],
    "getRiscPumpRPM"      : [null,  10, null, 19, "", "%"],
    "getExtInputStatus"   : [null,  60, null, 20, "", ""],
    "getSolarStunden"     : [null,  60, null, 21, "", "ore"],
    "getSolarLeistung"    : [null,  60, null, 22, "", "kWh"]
};


// subscribe to data channel for actions (actuators)
connection.on("cmd90", function(data) {
    console.log(data);
    var temp = data["payload"].split(",")[1];

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

    var connection = new Cayenne.MQTT({
	username: "9add20f0-9651-11e7-94c8-a1bba3f5296f",
	password: "362012fd2e87f634ec6baa394c8b3c0874107795",
	clientId: "2ede4a40-9666-11e7-9727-55550d1a07e7"
    });
});

setInterval(function() {

    const spawn = require('child_process').spawnSync;
    const vclient = spawn('/bin/cat', ['\/sys\/class\/thermal\/thermal_zone0\/temp'], {shell: '/bin/bash'});
    
    var f = Math.round(parseFloat(vclient.stdout.toString()) / 1000 );

    var d = new Date();
    
    if (connected == true) {
	connection.rawWrite(100, f, "temp","c");
	connection.rawWrite(200, d.getHours() * 10000 + d.getMinutes()*100 + d.getSeconds(), "","");
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
    
    console.log("--");
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

	    if ((result != null) && (result != "OK")) {

		if (result[0].length) {

		    /*var f = Math.round(parseFloat(result[0]) * 10) / 10;*/
		    var f = Math.round(parseFloat(result[0]));
		    
		    if (cmds[current][2] != f) {
			
			cmds[current][2] = f;
			console.log(current + ": " + f);

			if (connected == true) {
			    connection.rawWrite(cmds[current][3], f, cmds[current][4], cmds[current][5]);
			}
		    }

		}

		if (result.length > 1) {
		    //			console.log(result[1]);
		}
		
	    }
	    
	}

	
    });
    
    cmd_queue = [];
    
}, 5000);



