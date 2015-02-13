//node midi library
var midi = require('midi');
var mySocketIO = require('./mySocketIO');

var output = new midi.output();	

var global_input = new midi.input();

exports.setupMidi = function(app) {
	setInterval(function () { checkForMidiDevices(app); }, 1000);
};

exports.out = function(deviceName,msg){
	var portNumber = getPortNumberFromDeviceName(deviceName);
	console.log("sending message out to deviceName: " + deviceName + " portName: " + portNumber);
	
	if (portNumber != null){
		output.openPort(portNumber);
		output.sendMessage([msg[0],msg[1],msg[2]]);
		output.closePort();
	}
}

// Returns a number between 0-100 from a standard midi message
exports.convertMidiMsgToNumber = function (msg){
	if(!msg || msg.length !=3) {
		console.log("Error trying to convert invalid midi msg");
		return;
	}

	if (msg[0] == 144 ) return 100; // note on
	if( msg[0] == 128 ) return 0;	// note off
	if (msg[0] == 227) {			// pitch change
		var midiVal = msg[2]; //0-127
		return Math.floor(100*midiVal/127)
	}		
}

// Converts a number from 0-100 into a midi message
exports.convertPercentToMidiMsg = function ( num ){	
	if (num == 100 ) return [144,60,69]; 			    // note on
	else if( num == 0 ) return [128,60,69];	    // note off
	else return  [227,0,Math.round(127*num/100)];   // continuous pitch change		
}

// Converts a number from 0-100 into a midi message
exports.midiPitchMsg = function ( num ){	
	 return  [227,0,Math.round(127*num/100)];   // continuous pitch change		
}

// Converts a number from 0-100 into a midi message
exports.midiOnMsg = function (){	
	  return [144,60,69]; 			    // note on	
}

// Converts a number from 0-100 into a midi message
exports.midiOffMsg = function (){	
	  return [128,60,69];	    // note off	
}

var checkForMidiDevices = function(app){
	var deviceList = getDeviceList();
	var changed = false;
	
	// DISCONNECTED MODULES
	// Detect on disconnection of a module - by checking that new device list contains all previously connected
	for (var blockID in app.realHwObjects){
		var currDeviceName = app.realHwObjects[blockID].devName;
		// Is the hardware device still present in the midi list ?
		if (deviceList.indexOf(currDeviceName) == -1){ // Returns -1 if A is not in B
			app.removeRealHwBlock(blockID);		
		}
	}
	
	
	// NEW CONNECTED MODULES
    for(var i = 0; i < deviceList.length ; i ++ ){
    	var currDeviceName = deviceList[i];
    	var foundBlockId = app.findBlockID(currDeviceName);
    	
    	if (!foundBlockId ) { // if no device yet created
    		console.log("Found new midi device to connect to:" + currDeviceName );
    		var input = new midi.input();
    		
    		if(currDeviceName.substring(0, currDeviceName.length - 2) == "RGB_LED"){
    			var newHwBlock = app.createNewRGBLED(currDeviceName);
    		}
    		else{
    			var newHwBlock =  app.createNewRealHwBlock(currDeviceName);
    		}
    		
    		//if(newHwBlock.deviceDirection == "Input" ){// output
    			//app.Pool.OpenMidiOut(currDeviceName);
    		    	
    		//}
    		 		      		
    		// Always add new devices as possible midi inputs (so any device can receive MIDI messages )
   			//app.Pool.OpenMidiIn(currDeviceName,function(name){return function(t,a){onNewMidiMsg(name,a);};}(deviceList[i]));        							        		
    		input.on('message', function(name){return function(deltaTime, message) {
			  	onNewMidiMsg(app, name , message);
			};}(deviceList[i]));
			newHwBlock.port = input;
    		input.openPort(i);
    	}
    }
	
};

var onNewMidiMsg = function(app, deviceName, msg){
	// console.log("New midi msg generated by: " + deviceName);
	// When a device generates a message just send it to its self (hardware block)
	console.log("Device Name " + deviceName);
	var blockID = app.findBlockID(deviceName);
	console.log("Block ID: " + blockID);
	var block = app.blockObjects[blockID];
	block.onReceiveMessage(blockID,msg);
}

var getDeviceList = function() {
	var deviceList = [];
	var portCount = global_input.getPortCount();

	for(i=0;i<portCount;i++){
		var portName = global_input.getPortName(i);
		console.log("Port Name: " + portName);
		deviceList.push(global_input.getPortName(i));
	}
	return deviceList;
}

var getPortNumberFromDeviceName = function(portName) {
	var deviceList = getDeviceList();
	
	for (var i = 0; i < deviceList.length; i++){
		if (deviceList[i] == portName){
			return i;
		}
	}
	return null;
}