//On the Server

//the midi wrapper that we wrote on top of the node library
var central = require('./central');
var myMidi = require('./midi');
var mySocketIO = require('./mySocketIO');

var app = new App();

deviceTypes = {
	"Angle": {"direction":"Output", "addControlElem": "emuKnobAddControlElem"},
	"Button": {"direction":"Output", "addControlElem": "emuButtonAddControlElem"},
	"Buzzer": {"direction":"Input"},
	"Fan": {"direction":"Input","addControlElem": "emuFanAddControlElem"},
	"Force_Sensor": {"direction":"Output", "addControlElem": "emuKnobAddControlElem"},
	"Heater": {"direction":"Input", "addControlElem": "emuHeaterAddControlElem"},
	"Knob": {"direction":"Output", "addControlElem": "emuKnobAddControlElem"},
	"Light": {"direction":"Input","addControlElem": "emuLEDAddControlElem"},
	"Light_Sensor": {"direction":"Output", "addControlElem": "emuKnobAddControlElem"},
	"Motion_Sensor": {"direction":"Output", "addControlElem": "emuMotionAddControlElem"},
	"Motor": {"direction":"Input", "addControlElem": "emuFanAddControlElem"},
	"Slider": {"direction":"Output","addControlElem": "emuSliderAddControlElem"},
	"Switch": {"direction":"Output", "addControlElem": "emuSwitchAddControlElem"},
	"Temperature": {"direction":"Output", "addControlElem": "emuKnobAddControlElem"},
	"Tilt": {"direction":"Output", "addControlElem": "emuButtonAddControlElem"},
	"Timer": {"direction":"Output", "addControlElem": "emuTimerAddControlElem"},
	"Vibration": {"direction":"Input", "addControlElem": "emuFanAddControlElem"},
	// "RGB_LED": {"direction":"Input"},	
};


function App() {
	var obj = this;
	this.numBlocks = 0;
	this.blockObjects = {};
	this.blockTypeCounts = {};
	this.realHwObjects = {};

	// Midi Pool variables
	this.Pool;
	this.ins;
	this.outs;
	this.midiDevicePollTimer;
	
	/* To interface with the rest of the app */
	this.createNewRealHwBlock = function (currDeviceName) {
		return new RealHwBlock(currDeviceName);
	};
	
	this.createNewRGBLED = function (currDeviceName) {
		return new RGB_LED(currDeviceName);
	};
	
	this.createNewEmuHwBlock = function(emuHwType){
		if("Timer" == emuHwType.split("-")[0]){
			return new EmuTimerBlock(emuHwType);
		}else{
			return new EmuHwBlock(emuHwType);
		}
	};
	
	this.createNewCodeBlock = function(x,y){
		return new CodeBlock(x,y);
	};
	
	/* To interface with the rest of the app */

	this.newBlockID = function () {
		return obj.numBlocks++;
	};
	
	this.getDeviceTypeFromName = function (deviceName){
		if(deviceName in deviceTypes){
			return deviceTypes[deviceName]["direction"];
		}
		else{
		 return  null;
		 }
	}
	
	this.addNewBlock = function (block) {
		obj.blockObjects[block.blockID] = block;
		obj.updateDisplayName(block.blockID);
		// Update display names e.g. block1
		var blockList = this.getBlockListForClient();
		mySocketIO.sendBlockListToClient(blockList);
	};
	
	this.updateDisplayName = function (blockID){
		var currBlock = obj.blockObjects[blockID];
		
		var typeName ="";
		if (currBlock.type == "hw")	typeName =  currBlock.deviceType;
		else if(currBlock.type == "sw") typeName = currBlock.displayName;
		else typeName = currBlock.type; 	
		
		// increment the type count
		var currBlockTypeCount = obj.blockTypeCounts[typeName];
		if ( currBlockTypeCount ) currBlockTypeCount += 1;
		else currBlockTypeCount = 1;
		obj.blockTypeCounts[typeName] = currBlockTypeCount;

		// only show number if more than one type
		if (currBlockTypeCount != 1) currBlock.displayName += currBlockTypeCount;  
	}

	this.removeBlock = function (blockID) {
		console.log("removing block with id: " + blockID );
		
		var blockToRemove = obj.blockObjects[blockID];
		blockToRemove.Remove();

		var deviceType = blockToRemove.type;
		if (blockToRemove.type == "hw") deviceType = blockToRemove.deviceType;

		var currBlockTypeCount = obj.blockTypeCounts[deviceType];				
		obj.blockTypeCounts[deviceType] = currBlockTypeCount - 1;

		delete obj.blockObjects[blockID];
		
		var blockList = this.getBlockListForClient();
		mySocketIO.sendBlockListToClient(blockList);
	};

	this.addNewRealHwBlock = function (hwBlock) {
		console.log("adding new Hw Block!");
		obj.addNewBlock(hwBlock);
		obj.realHwObjects[hwBlock.blockID] = hwBlock;
		//this.menu.addToHwList(hwBlock.blockID);
	};
	
	this.removeRealHwBlock = function (blockID) {
		//this.menu.removeFromHwList(blockID);
		obj.blockObjects[blockID].port.closePort();
		obj.removeBlock(blockID);
		delete obj.realHwObjects[blockID];
	};
	
	this.addNewEmuHwBlock = function (hwBlock) {
		obj.addNewBlock(hwBlock);
	};
	
	this.addNewSwBlock = function (swBlock) {
		obj.addNewBlock(swBlock);
		//this.menu.addToEmuHwList(hwBlock.blockID);
	};
	
	this.removeEmuHwBlock = function (blockID) {
		//this.menu.removeFromEmuHwList(blockID);
		obj.removeBlock(blockID);
	};
	
	this.removeSwBlock = function (blockID) {
		obj.removeBlock(blockID);
	};
	
	this.findBlockID = function (devName){
		console.log("Finding block id by device name");
		for (blockID in obj.realHwObjects){
			if(obj.realHwObjects[blockID].devName == devName){
				return blockID;
			}
		}
	};
	
	this.getBlockListForClient = function(includeConnections) {
		var blockList = {};

		for(var block in obj.blockObjects){
			//Emulated HW blocks and Real HW blocks
			//console.log("adding block to list: " + block);
			if(obj.blockObjects[block].type == "hw"){
				blockList[block] = 
					{"type": "hw",
					"devName":obj.blockObjects[block].devName,
					"devIDNum":obj.blockObjects[block].deviceIDNum}
			}else if(obj.blockObjects[block].type == "sw"){
				blockList[block] = 
					{"type": "sw",
					"x":obj.blockObjects[block].initX,
					 "y":obj.blockObjects[block].initY,
					 "html":obj.blockObjects[block].html}
			}
			if(includeConnections){
				blockList[block]["outConnections"] = Object.keys(obj.blockObjects[block].outConnections);
			}
		}
		return blockList;
	};

	// MIDI FUNCTIONS
	console.log("Setting up Midi Data");
	myMidi.setupMidi(this);
};


function BlockObject(viewObj){
	console.log("creating block object");
	var obj = this;
	this.viewObj = viewObj;
	this.inConnections = {};
	this.outConnections = {};
	this.blockID = app.newBlockID();
	this.type = typeof this.type !== 'undefined' ? this.type : "block";
	this.displayName = typeof this.displayName !== 'undefined' ? this.displayName : "block";
	this.data = typeof this.data !== 'undefined' ? this.data : 0;
};

BlockObjectClone = function () {};
BlockObjectClone.prototype = BlockObject.prototype;

BlockObject.prototype.Remove = function(){
	console.log("deleting all connections");	
	
	for(block in this.outConnections){
		this.outConnections[block].removeInputConnection(this.blockID);
	};
	
	for(block in this.inConnections){
		this.inConnections[block].removeOutputConnection(this.blockID);
		//if(app.blockObjects[block].type === "sw"){
		  	//app.blockObjects[block].update(block,undefined,undefined);
		 //}
	};	
	/*
		// Clean up jsplumb connectors
		// Remove the actual node
		$(this.viewObj).remove();
		jsPlumb.detachAllConnections(this.viewObj.id);
		jsPlumb.removeAllEndpoints(this.viewObj.id); 
	*/
}

BlockObject.prototype.removeOutputConnection = function (blockID){
	// console.log("removing output connection");
	delete this.outConnections[blockID];
};

BlockObject.prototype.addOutputConnection = function (outputConnectionObj){
	 console.log("adding output connection from " + this.blockID + " to " + outputConnectionObj.blockID);
	this.outConnections[outputConnectionObj.blockID] = outputConnectionObj;
};

BlockObject.prototype.removeInputConnection = function (blockID){
	// console.log("removing input connection");
	delete this.inConnections[blockID];
};

BlockObject.prototype.addInputConnection = function (inputConnectionObj){
	 console.log("adding input connection from " + inputConnectionObj.blockID + " to " + this.blockID );
	this.inConnections[inputConnectionObj.blockID] = inputConnectionObj;
};

BlockObject.prototype.sendToAllOutputs = function(msgDict){
	// console.log("sending to all outputs");
	for (targetBlockID in this.outConnections){
		this.sendMsg(targetBlockID, msgDict);
	}
	
	//Test
	//this.sendMsg(2,msg);
};

BlockObject.prototype.onReceiveMessage = function(blockID, msgDict) {
	var msg = msgDict['msg'];
	//Should be done by objects further down the inheritance chain
}

BlockObject.prototype.update = function(fromBlockID, msgDict) {
	//Should be done by objects further down the inheritance chain
	this.data = myMidi.convertMidiMsgToNumber(msgDict['msg']);
}

BlockObject.prototype.sendMsg = function(targetBlockID, msgDict){
	console.log("Sending message to " + targetBlockID + " from " + this.blockID);
	app.blockObjects[targetBlockID].onReceiveMessage(this.blockID, msgDict);
};

function HwBlock(devName){
	console.log("Creating new hardware block with name:" + devName);
	var obj = this;
	this.type = "hw";						 // object type
	this.devName = devName; 	             // Assumes midi device name in format "button-5"
	this.deviceType = devName.split("-")[0]; // Just the type part of the name "button"
	this.deviceIDNum = devName.split("-")[1];// Just the numerical part of the name "5"
	this.data = 0; 						 // Current state of device
	this.deviceDirection = app.getDeviceTypeFromName(this.deviceType); // e.g. has Input or Output
	this.displayName = typeof this.displayName !== 'undefined' ? this.displayName : this.deviceType;
	BlockObject.call(this,undefined);

	console.log("block ID:" + this.blockID);
	console.log("displayName: " + obj.displayName);
};

HwBlock.prototype = new BlockObjectClone();
HwBlock.prototype.constructor = HwBlock;

HwBlock.prototype.onReceiveMessage = function(fromBlockID,msgDict){
	var msg = msgDict['msg'];
	var newMsgDict = {};
	newMsgDict['msg'] =msg;
	newMsgDict['dist'] =msgDict['dist']+1;
	
	console.log("Hardware: " + this.devName +" blockID:" + this.blockID + " recevied msg: " + msg +" from id:" + fromBlockID);
	
	// If we were the hardware the generated the message
	if (this.blockID == fromBlockID){
		// console.log("Hardware: " + obj.devName + " message to self");
		// process the message if needed here e.g. check valid message cleaning...
	}
	
	// If the message containes a new value update hardware block view on server
	// and update this block's current value
	if (msg) this.update(fromBlockID,msgDict);
	
	if(this.emuHardwareResponse) this.emuHardwareResponse(msg);
	
	// Sending out midi messages
	if(this.deviceDirection == "Input"){ // If we have input e.g. buzzer
		myMidi.out(this.devName,[msg[0],msg[1],msg[2]]);
	}
	else if (this.deviceDirection == "Output"){ // Sensor
		this.sendToAllOutputs(newMsgDict);	// Send to any connected output blocks
	}
	else{
		console.log("Error: HwBlock should be an output or input device!");
	}
};

// Called when the block state has changed - update data and view
HwBlock.prototype.update = function(fromBlockID,msgDict){
	
	var msg = msgDict["msg"]			 
	
	// ---------------------------------------------------------
	// PUT SPECIAL CASE MODIFICATIONS TO MIDI MESSAGES HERE
	// ---------------------------------------------------------

	//js: Todo place special case code for some hardware eg. changing message values
	// Speacial case code for temperature sensor 50% is about 70F (so need to add 20% on value)
	if (this.deviceType == "Temperature"){		
		
		midiPercent = myMidi.convertMidiMsgToNumber(msg) // Convert to a percent for easier math 50%	
		modifiedMidiPercent = midiPercent + 20 			// add 20%
		modifiedMidiMsg = myMidi.convertPercentToMidiMsg(modifiedMidiPercent) // Convert back to a message										
		msgDict["msg"][2] =modifiedMidiMsg[2] // Set the new value 
	}

	// Speacial case code for Motion sensor 0-33% range , just make any non zero value 100%
	if (this.deviceType == "Motion_Sensor"){				
		midiPercent = myMidi.convertMidiMsgToNumber(msg) 
		if (midiPercent > 0 ){
			msgDict["msg"][2] =127 // set all the way to 100%			
		}else{
			msgDict["msg"][2] = 0 // Set to 0%			
		}		
	}

	// Speacial case code for FSR - is inverted and in range 0 - 36% or 0 - 46 midi message
	if (this.deviceType == "Force_Sensor"){		
		midiPercent = myMidi.convertMidiMsgToNumber(msg) 
		console.log("Midi percent:"+midiPercent);		
		modifiedMidiPercent = 100 -(100 * (midiPercent/37)) // Convert to 0 - 100 range , and invert			 
		modifiedMidiMsg = myMidi.convertPercentToMidiMsg(modifiedMidiPercent) // Convert back to a message										
		msgDict["msg"][2] =modifiedMidiMsg[2] // Set the new value 
	}

	//Call parent function. This updates the blocks current value
	BlockObject.prototype.update.call(this,fromBlockID, msgDict);

	mySocketIO.sendMidiToClient(this.blockID, msgDict);
};

HwBlockClone = function () {};
HwBlockClone.prototype = HwBlock.prototype;

function RealHwBlock(devName){
	console.log("creating Knob");
	this.port = undefined;
	HwBlock.call(this,devName);
	app.addNewRealHwBlock(this);
};

RealHwBlock.prototype = new HwBlockClone();
RealHwBlock.prototype.constructor = RealHwBlock;

RealHwBlockClone = function () {};
RealHwBlockClone.prototype = RealHwBlock.prototype;

function EmuHwBlock(devName){
	console.log("creating Emulated Hardware");
	HwBlock.call(this,devName);
	app.addNewEmuHwBlock(this);
};

EmuHwBlock.prototype = new HwBlockClone();
EmuHwBlock.prototype.constructor = EmuHwBlock;

EmuHwBlockClone = function () {};
EmuHwBlockClone.prototype = EmuHwBlock.prototype;

function EmuTimerBlock(devName){
	this.intervalFunc  = undefined;
	this.numMillis = 100;
	this.logicLevel = 0;
	HwBlock.call(this,devName);
	app.addNewEmuHwBlock(this);
};

EmuTimerBlock.prototype = new EmuHwBlockClone();
EmuTimerBlock.prototype.constructor = EmuTimerBlock;

EmuTimerBlock.prototype.Remove = function(){
	var obj = this;
	//make sure you're recurring function call is cleared 
	if(!(this.intervalFunc === undefined)){
		clearInterval(this.intervalFunc);
	}
	BlockObject.prototype.Remove.call(obj);
};

EmuTimerBlock.prototype.onReceiveMessage = function(fromBlockID,msgDict){
	var obj = this;
	var msg = msgDict['msg'];
	var newMsgDict = {};
	newMsgDict['dist'] = msgDict['dist'] + 1;
	newMsgDict['msg'] = msg;
	
	console.log("Timer on receive message");
	
	//We actually don't want to send this value out
	//We just want to update our existing value
	//EmuHwBlock.prototype.onReceiveMessage.call(this, fromBlockID, msg);
	
	//update value and sent it out to client to update view
	EmuHwBlock.prototype.update.call(this,fromBlockID,msgDict);
	var numSeconds = Math.round(myMidi.convertMidiMsgToNumber(msg))/10;
	var numSecondsMidi = myMidi.convertPercentToMidiMsg(numSeconds);
	obj.sendToAllOutputs(numSecondsMidi);
	
	var intervalInMillis = myMidi.convertMidiMsgToNumber(msg);
	if(intervalInMillis != 0){
		var interval = intervalInMillis*this.numMillis;
	
		//console.log("New interval: " + interval);
		var newIntervalFunc = function () {
			var numSeconds = Math.round(myMidi.convertMidiMsgToNumber(msg))/10;
			var numSecondsMidi = myMidi.convertPercentToMidiMsg(numSeconds);
			newMsgDict['msg']=numSecondsMidi;
			obj.sendToAllOutputs(newMsgDict);
			
			if(obj.logicLevel === 100){
				obj.logicLevel = 0;
			}else{
				obj.logicLevel = 100;
			}
			
		}
	
		//first time this is called we dont need to stop the recurring function
		if(this.intervalFunc === undefined){
			this.intervalFunc = setInterval(newIntervalFunc,interval);
		}else{
			//stop last timer pulse
			clearInterval(this.intervalFunc);
			//begin new pulse with new value
			this.intervalFunc = setInterval(newIntervalFunc,interval);
		}
	}else{
	   clearInterval(this.intervalFunc);
	   this.intervalFunc = undefined;
	}
	
};

EmuTimerBlockClone = function () {};
EmuTimerBlockClone.prototype = EmuHwBlock.prototype;

function RGB_LED_R(devName, RGB_LED){
	console.log("creating RGB_LED_R");
	var obj = this;
	this.displayName = "RGB_LED-Red";
	RealHwBlock.call(this,devName);
	this.RGB_LED = RGB_LED;
};

RGB_LED_R.prototype = new RealHwBlockClone();
RGB_LED_R.prototype.constructor = RGB_LED_R;

RGB_LED_R.prototype.setColor = function(colorByte){
		console.log("RGB_R set color " + colorByte);
		this.RGB_LED.r = colorByte;
};

RGB_LED_R.prototype.onReceiveMessage = function(fromBlockID,msgDict){
	var msg = msgDict['msg']
	console.log("RGB_LED_R on receive message");
	this.setColor(msg[2]);
	HwBlock.prototype.update.call(this, fromBlockID, msgDict);
	this.RGB_LED.sendOutColors(msg);
};

function RGB_LED_G(devName, RGB_LED){
	console.log("creating RGB_LED_R");
	var obj = this;
	this.displayName = "RGB_LED-Green";
	RealHwBlock.call(this,devName);
	this.RGB_LED = RGB_LED;
};

RGB_LED_G.prototype = new RealHwBlockClone();
RGB_LED_G.prototype.constructor = RGB_LED_G;

RGB_LED_G.prototype.setColor = function(colorByte){
		console.log("RGB_R set color " + colorByte);
		this.RGB_LED.g = colorByte;
};

RGB_LED_G.prototype.onReceiveMessage = function(fromBlockID,msgDict){
	console.log("RGB_LED_R on receive message");
	var msg = msgDict['msg']
	this.setColor(msg[2]);
	HwBlock.prototype.update.call(this, fromBlockID, msgDict);
	this.RGB_LED.sendOutColors(msg);
};

function RGB_LED_B(devName, RGB_LED){
	console.log("creating RGB_LED_R");
	var obj = this;
	this.displayName = "RGB_LED-Blue";
	RealHwBlock.call(this,devName);
	this.RGB_LED = RGB_LED;
};

RGB_LED_B.prototype = new RealHwBlockClone();
RGB_LED_B.prototype.constructor = RGB_LED_B;

RGB_LED_B.prototype.setColor = function(colorByte){
		console.log("RGB_R set color " + colorByte);
		this.RGB_LED.b = colorByte;
};

RGB_LED_B.prototype.onReceiveMessage = function(fromBlockID,msgDict){
	console.log("RGB_LED_R on receive message");
	var msg = msgDict['msg']
	this.setColor(msg[2]);
	HwBlock.prototype.update.call(this, fromBlockID, msgDict);
	this.RGB_LED.sendOutColors(msg);
};

function RGB_LED(devName){
	console.log("creating RGB_LED");
	var obj = this;
	this.devName = devName;
	this.deviceDirection = "Input";
	
	this.r = 0;
	this.g = 0;
	this.b = 0;
	
	this.rgb_led_r = new RGB_LED_R(devName, obj);
	this.rgb_led_g = new RGB_LED_G(devName, obj);
	this.rgb_led_b = new RGB_LED_B(devName, obj);
	
	this.sendOutColors = function(msg){
			var r = obj.r;
			var g = obj.g;
			var b = obj.b;
			
			console.log("RGB_LED Sending Out Colors: " + r +" " + g +" "+ b);
			
			var r_msg = [0,0,0];
			var g_msg = [0,0,0];
			var b_msg = [0,0,0];
	
			r_msg[0] = msg[0];
			r_msg[1] = msg[1];
			//r_msg[2] = this.r;
			r_msg[1] = r;
	
			g_msg[0] = msg[0];
			g_msg[1] = msg[1];
			g_msg[2] = g;
	
			b_msg[0] = msg[0];
			b_msg[1] = msg[1];
			b_msg[2] = b;
	
			myMidi.out(obj.devName,[msg[0],0,this.r]);
 			myMidi.out(obj.devName,[msg[0],1,this.g]);
 			myMidi.out(obj.devName,[msg[0],2,this.b]);
	};
};


function CodeBlock(x,y){
	var obj = this;
	this.initX = x;
	this.initY = y;
	this.type="sw";
	this.data = 0;
	this.displayName = "CodeBlock";
	this.result = 0;
	this.text = "";
	this.html = undefined;
	this.inputArgs = "";
	this.state = 0;
	BlockObject.call(this,undefined);
// 	this.sandbox   = new JSandbox();

	app.addNewSwBlock(this);
	
	this.updateCodeText = function (text,html) {
		this.text = text;
		this.html = html;
	};
	
	this.execCodeBlock = function () {
		var code = "";
		var inputBlockArg = "";
		//go through all input connections and initialize their corresponding variables
		for(blockID in this.inConnections){
			inputBlockArg = ""
			inputBlockArg += this.inConnections[blockID].displayName;
			inputBlockArg += " = ";
			inputBlockArg += this.inConnections[blockID].data;
			inputBlockArg += ";";
			
			code += inputBlockArg;
		};
		//add the current state of the code block
		code += " Output = " + this.state + ";";
		
		//add the code typed in the code block
		code += this.text;
		
		console.log("Code to be Executed: ");
		console.log(code);
		
		//TODO: try to return errors gracefully
		try {
			var result = eval(code);
		} catch (e) {
			if (e instanceof SyntaxError){
				result = "ERROR: " + e.message;
			}
		}
		console.log("Results of Code block Execution: " + result);
		return result;
	};
};


CodeBlock.prototype = new BlockObjectClone();
CodeBlock.prototype.constructor = CodeBlock;

// Called when the block state has changed - update data and view
CodeBlock.prototype.update = function(fromBlockID,msgDict,result){
	//Call parent function. This updates the blocks current value
	//BlockObject.prototype.update.call(this,fromBlockID, msg);
	
	//Send the block ID of the block the message came from
	//send the message 
	//send the result of the code execution
	mySocketIO.sendOutputValToClient(this.blockID,result,fromBlockID,msgDict);	
};


// Called when the block state has changed - update data and view
CodeBlock.prototype.onReceiveMessage = function(fromBlockID, msgDict){
	var msg = msgDict['msg'];
	var newMsgDict = {};
	
	console.log("Software block with blockID:" + this.blockID + " recevied msg: " + msg +" from id:" + fromBlockID);

	if(!msg){
		console.log("Error: tried to send a message to block with empty message");
		return;
	} 

	// If the message containes a new value update block
	result = this.execCodeBlock(fromBlockID,msg);
	//if we get back a string we got an error from the eval
	if(typeof(result) !== "string"){
		this.state = this.data = result;
		
		this.update(fromBlockID,msgDict,result);	
		// If the message containes a new value update hardware block view on server
		// and update this block's current value
		var newMsg = myMidi.convertPercentToMidiMsg(result);
		// Send a new msg to any connected outputs
		newMsgDict['msg'] = newMsg;
		newMsgDict['dist'] = msgDict['dist'] + 1;
		this.sendToAllOutputs(newMsgDict);
	}else{
		mySocketIO.sendCodeBlockErrorToClient(this.blockID,result);
	}
};

module.exports = app;
