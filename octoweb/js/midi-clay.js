window.addEventListener("load",function () {
	app = new App();
});

deviceTypes = {
	"Knob": {"direction":"Output", "addControlElem": emuKnobAddControlElem},
	"Button": {"direction":"Output", "addControlElem": emuButtonAddControlElem},
	"Slider": {"direction":"Output","addControlElem": emuSliderAddControlElem},
 	"Light": {"direction":"Input",},
// 	"Temp": {"direction":"Output"},
// 	"Tilt": {"direction":"Output"},
	"LED": {"direction":"Input","addControlElem": emuLEDAddControlElem},
	"RGB_LED": {"direction":"Input"},
	"Buzzer": {"direction":"Input"}
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

	this.newBlockID = function () {
		return obj.numBlocks++;
	};
	
	this.getDeviceTypeFromName = function (deviceName){
		return deviceTypes[deviceName]["direction"];
	}
	
	this.addNewBlock = function (block) {
		obj.blockObjects[block.blockID] = block;
		// Update display names e.g. block1
		//obj.updateDisplayName(block.blockID);
	};
	
	this.updateDisplayName = function (blockID){
		var currBlock = obj.blockObjects[blockID];
		
		var typeName ="";
		if (currBlock.type == "hw")	typeName =  currBlock.deviceType;	
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
		blockToRemove.deleteView();

		var deviceType = blockToRemove.type;
		if (blockToRemove.type == "hw") deviceType = blockToRemove.deviceType;

		var currBlockTypeCount = obj.blockTypeCounts[deviceType];				
		obj.blockTypeCounts[deviceType] = currBlockTypeCount - 1;

		delete obj.blockObjects[blockID];
	};

	this.addNewRealHwBlock = function (hwBlock) {
		console.log("adding new Hw Block!");
		obj.addNewBlock(hwBlock);
		obj.realHwObjects[hwBlock.blockID] = hwBlock;
		this.menu.addToHwList(hwBlock.blockID);
	};
	
	this.removeRealHwBlock = function (blockID) {
		this.menu.removeFromHwList(blockID);
		obj.removeBlock(blockID);
		delete obj.realHwObjects[blockID];
	};
	
	this.addNewEmuHwBlock = function (hwBlock) {
		obj.addNewBlock(hwBlock);
		this.menu.addToEmuHwList(hwBlock.blockID);
	};
	
	this.removeEmuHwBlock = function (blockID) {
		this.menu.removeFromEmuHwList(blockID);
		obj.removeBlock(blockID);
	};

	this.findBlockID = function (devName){
		for (blockID in obj.realHwObjects){
			if(obj.realHwObjects[blockID].devName == devName){
				return blockID;
			}
		}
	};

	// MIDI FUNCTIONS
	this.setupMidi = function () {
		console.log("Setting up midi");
	
		/// USING JAZZ PLUGING
		this.setupMidiPool();

		// Poll for new midi devices
		this.midiDevicePollTimer = setInterval( checkForMidiDevices, 1000);

	}

	this.setupMidiPool = function (){
		try{
			obj.Pool=new MidiPool;	 
		}
		catch(err){ alert(err);}
	}
	
	// Functions to call when the app is first opened
		this.setupMidi();
		this.menu = new Menu();
		this.menu.addEmuHwBtns(deviceTypes);
	//
};

function Menu() {
	var $menuDiv = $("#menu");
	var $hwList = $("#hardwareList");
	 
 	this.addToHwList = function (blockID) {
 		$hwList = $("#hardwareList");
		// var $newHwEntry = $("<li></li>");
		var $newHwEntry = $("<li></li>");
		$newHwEntry.append("<i class='fa fa-square fa-lg white shadow'></i>");
		$newHwEntry.append(" "+ app.blockObjects[blockID].displayName);
		$newHwEntry.attr("id", "hw_entry"+blockID);
		$newHwEntry.attr("class", "hw_sidebar_entry");
		$hwList.append($newHwEntry);
 	};
 	
  	this.removeFromHwList = function (blockID) {
 		$hwEntry = $("#hw_entry"+blockID);
		$hwEntry.remove();
 	};
 	
  	this.addToEmuHwList = function (blockID) {
 		$emuHwList = $("#emulatedList");
 		var hwEmuCreated = app.blockObjects[blockID].displayName;
 		var block = app.blockObjects[blockID];
 		var id = blockID;
		var newEmuHwEntry = templates.renderEmuHwCreated({id:id,name:hwEmuCreated});
		$emuHwList.append(newEmuHwEntry);
		
		//add event handler for click on button
		var $newEmuHwEntry = $("#"+"hwEmuCreated"+blockID);
		$newEmuHwEntry.bind("click", function(event) {
			$newEmuHwEntry.parent().remove();
			app.removeEmuHwBlock(block.blockID);
		});
 	};
 	
   	this.removeFromEmuHwList = function (blockID) {
 		$emuHwEntry = $("#emu_entry"+blockID);
		$emuHwEntry.remove();
 	};
 	
 	this.addEmuHwBtns = function(devices){
 		console.log("adding emulated hardware buttons");
 		$emuHwOptList = $("#emulationOptionsList");
 		
 		for (var key in devices){
 			//add html for button
 			var newEmuHwBtnHTML = templates.renderEmuHwBtn({name:key});
 			$emuHwOptList.append(newEmuHwBtnHTML);
 			
 			//add event handler for click on button
 			var newEmuHwBtnElem = $("#"+"hwEmuBtn"+key);
 			newEmuHwBtnElem.bind("click", function(event) {
 				var target = event.target;
 				var emuHwType = target.id.substr(8) + "-E";
 				console.log("new emulated hw :" + emuHwType + " clicked");
 				var newEmuHw = new EmuHwBlock(emuHwType, true);
 			});
		};
		
 	};
 	
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

BlockObject.prototype.deleteView = function(){
	console.log("deleting view!");	
	g1 = this;

	// Clean up jsplumb connectors
	jsPlumb.detachAllConnections(this.viewObj.id);
	jsPlumb.removeAllEndpoints(this.viewObj.id); 

	// Remove the actual node
	$(this.viewObj).remove();
}

BlockObject.prototype.removeOutputConnection = function (outputConnectionObj){
	// console.log("removing output connection");
	delete this.outConnections[outputConnectionObj.blockID];
};

BlockObject.prototype.addOutputConnection = function (outputConnectionObj){
	// console.log("adding output connection from " + this.blockID + " to " + outputConnectionObj.blockID);
	this.outConnections[outputConnectionObj.blockID] = outputConnectionObj;
};

BlockObject.prototype.removeInputConnection = function (inputConnectionObj){
	// console.log("removing input connection");
	delete this.inConnections[inputConnectionObj.blockID];
};

BlockObject.prototype.addInputConnection = function (inputConnectionObj){
	// console.log("adding input connection from " + inputConnectionObj.blockID + " to " + this.blockID );
	this.inConnections[inputConnectionObj.blockID] = inputConnectionObj;
};

BlockObject.prototype.sendToAllOutputs = function(msg){
	// console.log("sending to all outputs");
	for (targetBlockID in this.outConnections){
		this.sendMsg(targetBlockID, msg);
	}
};

BlockObject.prototype.sendMsg = function(targetBlockID, msg){
	console.log("Sending message to " + targetBlockID + " from " + this.blockID);
	app.blockObjects[targetBlockID].onReceiveMessage(this.blockID, msg);
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
	
	// Create a default hardware view
	if((undefined === this.viewObj)){
		var displayVal = obj.data ;
		if(obj.deviceType =="Button" || obj.deviceType =="Buzzer")  displayVal = "OFF";
		else displayVal = "0%";		
		
		this.viewObj = drawHardwareBlock(this, this.blockID, obj.deviceIDNum , obj.deviceType, obj.displayName , displayVal);
	}
};

HwBlock.prototype = new BlockObjectClone();
HwBlock.prototype.constructor = HwBlock;

HwBlock.prototype.onReceiveMessage = function(fromBlockID,msg){
	console.log("Hardware: " + this.devName +" blockID:" + this.blockID + " recevied msg: " + msg +" from id:" + fromBlockID);

	// If we were the hardware the generated the message
	if (this.blockID == fromBlockID){
		// console.log("Hardware: " + obj.devName + " message to self");
		// process the message if needed here e.g. check valid message cleaning...
	}
	
	// If the message containes a new value update hardware block
	if (msg) this.update(fromBlockID,msg);
	
	if(this.emuHardwareResponse) this.emuHardwareResponse(msg);
	
	if(this.deviceDirection == "Input"){ // If we have input e.g. buzzer
		midi_out(this.devName,[msg[0],msg[1],msg[2]]);
	}
	else if (this.deviceDirection == "Output"){ // Sensor
		this.sendToAllOutputs(msg);	// Send to any connected output blocks
	}
	else{
		console.log("Error: HwBlock should be an output or input device!");
	}	
};

// Called when the block state has changed - update data and view
HwBlock.prototype.update = function(fromBlockID,msg){
	obj = this;
	// console.log("Updating hardware block:" + obj.devName);

	// Update data - hardware state
	var newVal = msg[2];
	// Update View		
	
	if(msg[0] == 144){ // If the message type is note on/off use string label instead of number
		newVal = 100;
		$("#sensorVal"+obj.blockID).text("ON");
	}
	else if (msg[0] == 128){
		newVal = 0;
		$("#sensorVal"+obj.blockID).text("OFF");		
	}

	// control change for pitch wheel
	else if (msg[0] == 227 || msg[0] == 176 ){
		var sensorPercent = Math.floor(100*msg[2]/127);
		newVal = sensorPercent;
		// special case for temperature
		if(obj.devName =="Temp") {
			var temperature = 25 + (sensorPercent%50); 
			$("#sensorVal"+obj.blockID).text( temperature +"°C");
		}
		else {				
			$("#sensorVal"+obj.blockID).text( sensorPercent +"%");
		}
	}
	$("#sensorVal"+obj.blockID).val(newVal);

	obj.data = newVal;
};

HwBlockClone = function () {};
HwBlockClone.prototype = HwBlock.prototype;

function RealHwBlock(devName){
	console.log("creating Knob");
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
	
	var devType = this.deviceType;
	var controlID = deviceTypes[devType]["addControlElem"](this);
	
};

EmuHwBlock.prototype = new HwBlockClone();
EmuHwBlock.prototype.constructor = EmuHwBlock;

EmuHwBlockClone = function () {};
EmuHwBlockClone.prototype = EmuHwBlock.prototype;

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

RGB_LED_R.prototype.onReceiveMessage = function(fromBlockID,msg){
	console.log("RGB_LED_R on receive message");
	this.setColor(msg[2]);
	HwBlock.prototype.update.call(this, fromBlockID, msg);
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

RGB_LED_G.prototype.onReceiveMessage = function(fromBlockID,msg){
	console.log("RGB_LED_R on receive message");
	this.setColor(msg[2]);
	HwBlock.prototype.update.call(this, fromBlockID, msg);
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

RGB_LED_B.prototype.onReceiveMessage = function(fromBlockID,msg){
	console.log("RGB_LED_R on receive message");
	this.setColor(msg[2]);
	HwBlock.prototype.update.call(this, fromBlockID, msg);
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
	
			midi_out(obj.devName,[msg[0],0,this.r]);
 			midi_out(obj.devName,[msg[0],1,this.g]);
 			midi_out(obj.devName,[msg[0],2,this.b]);

	};
};



function CodeBlock(x,y,viewObjInput){
	var obj = this;
	BlockObject.call(this,viewObjInput);
	this.type="sw";
	this.data = "0";
	this.displayName = "input";      
// 	this.sandbox   = new JSandbox();
	this.result = 0;

	app.addNewBlock(this);

	if(!viewObjInput){

		var freeCellELem = drawCodeBlock(this.blockID,x,y);
		
		// parent element has unique container id .e.g. block-3 		
		this.viewObj = freeCellELem.parentElement;  
	}
	
	// Update software block from an incoming midi message , evaling code
	this.update = function(fromBlockID,msg){
		
		if(!msg){
			console.log("Error in software block update... no message");
			return;
		}
		var fromObj = app.blockObjects[fromBlockID];
		var newVal = convertMidiMsgToNumber(msg);
		var codeBoxElem = $("#block-"+obj.blockID);
		
		// Update the view -----
	
		// Update input field data and view			
		// codeBoxElem.find(".codeArgInput").val(newVal); 

		// Update the existing code argument div that matches the name of the hardware
		var argElems = codeBoxElem.find(".codeArgInput");
		var argNames = codeBoxElem.find(".codeArgName");
		
		for (var i = 0; i < argNames.length; i++) {
			var currName = argNames[i].innerHTML;
			
			// Using display name to find a match
			var displayName = fromObj.displayName;
			if (fromObj.type == "hw") displayName = displayName.toLowerCase();
			
			if (currName == displayName ){
				argElems[i].value = newVal;	
			} 

			// if (fromObj.type == "hw"){
			// 	var deviceName = fromObj.deviceType.toLowerCase();

			// 	if (currName == deviceName){					
			// 		argElems[i].value = newVal;					
			// 	}	
			// } else{
			// 	if (currName == "input"){
			// 		argElems[i].value = newVal;	
			// 	}
			// }
			
		};
		
		// Evaluate code block
		var codeBlockJqueryObj = $("#block-"+obj.blockID);
		// var sourceName = app.blockObjects[fromBlockID].devName;
		// var result = evalCodeBlock(codeBlockJqueryObj,fromBlockID);
		var result = this.evalCodeBlock();
		// var result = this.evalCodeBlockFromSandBox();
		
		// Update output field with evaluated result
		// todo...
		obj.data = result;

		return result;
	};
	
	this.evalCodeBlockFromSandBox = function () {
		
		var codeBlockID = this.blockID;
	
		var codeBlockObj = app.blockObjects[codeBlockID];
		var clobjectDiv = $("#block-"+codeBlockID); // jquery view object
	
		var elem = clobjectDiv.find(".freeCell");
		var inputValue = elem.find(".codeArgInput").val();
		var outputValueElem = clobjectDiv.find(".returnValInput");
		
		var str = elem.html();
		var divs = elem.find('div');
		var code = "";
		divs.each(function() {
			if ($(this).hasClass("codeArgLine")){
				var argElem = $(this).find(".codeArgInput");
				var argName = $(this).find(".codeArgName");
				code = code + argName.text() + " = " + argElem.val() + " ; ";
			}else{
				code = code + " " + $(this).text() + " ";
			}
		});
		console.log("code "+code);
		this.sandbox.eval(code, function (returnVal) {
			console.log("ret " + returnVal);
			obj.result = returnVal;
		});
		
		console.log("evaled code box with results:" +this.result);

		// todo place this in code box update
		if(outputValueElem) {
			outputValueElem.val(this.result);	
		}

		return this.result;
	};
	
	this.evalCodeBlock = function(){
		console.log("Evaling code block");
		var codeBlockID = this.blockID;
	
		var codeBlockObj = app.blockObjects[codeBlockID];
		var clobjectDiv = $("#block-"+codeBlockID); // jquery view object
	
		var elem = clobjectDiv.find(".freeCell");
		var inputValue = elem.find(".codeArgInput").val();
		var outputValueElem = clobjectDiv.find(".returnValInput");
		
		// Insert new lines around div tags so we can spilt into a line array
		var str = elem.html().replace(/(<\/div>)|(<div>)|<div[^>]*>|(<br>)/g,"\n"); 
	
		str = unescapeHTML(str); // remove any unescaped chars e.g. & " ' < >
		var lines = str.trim().split("\n"); // split string into array of lines

		//remove empty lines
		var trimmedlines = [];
		for (var i = 0; i < lines.length; i++) {
			if ( lines[i].trim() !="" && lines[i] !="<br>" ) trimmedlines.push(lines[i]);
		};
		lines = trimmedlines;

		// Add a line for each input argument
		var argElems = clobjectDiv.find(".codeArgInput");
		var argNames = clobjectDiv.find(".codeArgName");
	
		for (var i = 0; i < argNames.length; i++) {
			var currName = argNames[i].innerHTML;
			var currVal = argElems[i].value;	

			lines[i] = "var " + currName + " = " + currVal; // first line is an input variable	
			
		};
	
		// If there is no code to eval  just pass through the first input value	
		var numInConnections = Object.keys(codeBlockObj.inConnections).length
		// if(lines.length == 1){		
		if(lines.length == numInConnections){		
			outputValueElem.val(inputValue);
			return inputValue;
		}
		
		////////////////////////////////////
		/// CODE GENERATION (line by line)
		////////////////////////////////////
		var lastAssignment;
		var lastLine;
		var codeStr= "function(){";
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if(!line) continue; // skip blank lines		
		
			console.log("currline is:" +line);
		
			// Check if current line is an assigment and store variable name for later
			var lineAssignmnetMatch =  isAssignmentLine(line);
			if(lineAssignmnetMatch) lastAssignment = lineAssignmnetMatch[1];

			lastLine = line;
			if(isValidLine(line)) line +=";" ; // add semicolon to each line

			codeStr += line;
		};
	
		// Add a return value line , with defaults:
		// 1. Return last line if it is a valid expression
		// 2. else return last variable assignment in code
		if (lastLine) {
			if(!isValidReturnValue(lastLine)){
				lastLine = lastAssignment;
			}
			codeStr += "return (" + lastLine + ")";
		}

		g1 = lastAssignment;

		codeStr +="}";
		console.log("eval code str:"+codeStr);		

		var result = tryEval(codeStr)();
		console.log("evaled code box with results:" +result);

		// todo place this in code box update
		if(outputValueElem) {
			outputValueElem.val(result);	
		}

		return result;
	};

	this.onReceiveMessage = function(fromBlockID,msg){
		console.log("Software block with blockID:" + obj.blockID + " recevied msg: " + msg +" from id:" + fromBlockID);

		if(!msg){
			console.log("Error: tried to send a message to block with empty message");
			return;
		} 

		// If the message containes a new value update block
		var result = obj.update(fromBlockID,msg);			

		// Send a new msg to any connected outputs
		if(result !=undefined ){
			var newMsg = convertPercentToMidiMsg(result);
			obj.sendToAllOutputs(newMsg);
		}

	};

	// ================================================
	// CODE BLOCK - VIEW FUNCTIONS
	// ================================================

	this.updateArgumentsView = function(){

		// Update the code block views argument lines and output field
		// according the what parents are connected		

		// Setup view variables
		var targetElem = $("#block-"+this.blockID);	  // Jquery obj of the code block view
		var elem = targetElem.find(".freeCell");      // Editable div inside object
		targetInputElems = elem.find(".codeArgInput");// Any existing argument divs
		var numInConnections = Object.keys(this.inConnections).length; // Number of connected parents,  
		
		var linesToAdd = "";

		// First clean up div - Delete all of the preexisintg argument lines
		var argmentLines = $(this.viewObj).find(".codeArgLine");		
		for (var i = 0; i < argmentLines.length; i++) {
			var currTargetInputElem = argmentLines[i];
			currTargetInputElem.remove();
		}
		
		var existingDivider = $(this.viewObj).find(".dividerline");
		if (existingDivider.length > 0 ) existingDivider[0].remove();

		// Add a div for each input connection we have currently
		for ( connectedObjID in this.inConnections ){
			var currConnectedObj = app.blockObjects[connectedObjID];
			
			var currArgumentName ="input";                    // default name of the argument
			var currConnectedObjVal = currConnectedObj.data;  // value of the argument x = 0
			if (currConnectedObjVal ==undefined) currConnectedObjVal = "0";
			
			// Set custom argument name depending on if hardware or software
			// if ( currConnectedObj.type == "sw" ){	
			// 	// If connecting from a code block

			// } 
			// else if (currConnectedObj.type == "hw"){
			// 	// If connecting from hardware
			// 	currArgumentName = currConnectedObj.deviceType.toLowerCase();
			// } 	

			currArgumentName = currConnectedObj.displayName.toLowerCase();

         	// Append a new variable name for each input
			linesToAdd += "<div contenteditable ='false' class='codeArgLine'>" + "<span class='codeArgName'>"+ currArgumentName + 
			"</span> = <input class='codeArgInput' value='" + currConnectedObjVal + "'></input> </div> ";		
		}

		// Append the lines to the elem
		var originalHTML = elem.html();
		var blankLine = "<div><br></div>";
		var dividerline = "<div class='dividerline' contenteditable='false'></div>";
		elem.html(linesToAdd + dividerline + originalHTML + blankLine);

		// Update the output field
		// js todo

		var returnValElem = targetElem.find(".returnValInput");
		var returnVal = "0"; // default return val 
		if( returnValElem.length == 0 ){ // no output div element yet		
			var lastLine = "<div class='returnValDiv' contenteditable='false'><input class='returnValInput' value='" + returnVal + "' readonly></input> </div> ";		
			// elem.append(lastLine);	
			targetElem.append(lastLine);	
			// Set our new data		
			this.data = returnVal;
		}

		jsPlumb.repaint(elem.parent());	// repaint anchors in case shifted	
	}	

};
CodeBlock.prototype = new BlockObjectClone();
CodeBlock.prototype.constructor = CodeBlock;

// When some object connects to a code block
CodeBlock.prototype.addInputConnection = function (outputConnectionObj){

	BlockObject.prototype.addInputConnection.call(this,outputConnectionObj);

	// console.log("Adding input to code block");
	
	this.updateArgumentsView();			
};

// When some object dissconnects from a code block
CodeBlock.prototype.removeInputConnection = function (outputConnectionObj){

	BlockObject.prototype.removeInputConnection.call(this,outputConnectionObj);

	// console.log("Removing input from code block");
	
	this.updateArgumentsView();			
};

// On receive of an midi message from a sensor
function midi_out(name,msg){
	console.log("Sending midi out to device name:" + name + " msg:" + msg);

	// Send the message out to the pool
	app.Pool.MidiOut(name,msg);
}

function play_all(){
	var note=60;
 	for(var i in app.realHwObjects){ 		
 		midi_out(app.realHwObjects[i].devName,[144,note,0x7f]); 
 		note+=5;
 	}
}

function stop_all(){
	var note=60;
	for(var i in app.realHwObjects){ 
		midi_out(app.realHwObjects[i].devName,[128,note,0]); 
		note+=5;
	}
}

// Polling for midi devices
function checkForMidiDevices(){
	
	var deviceList = app.Pool.MidiInList();
	
	// For debugging show list of all detected midi devices in div
	var newDeviceListStr = "Connected Devices:";
	$("#deviceListDiv").text(newDeviceListStr);	
	$("#deviceListDiv").append("<br/>");
	for (var i = 0; i < deviceList.length; i++) {
		var currDeviceName = deviceList[i];
		$("#deviceListDiv").append(currDeviceName + "<br/>");	
	};

	// DISCONNECTED MODULES
	// Detect on disconnection of a module - by checking that new device list contains all previously connected
	for (var blockID in app.realHwObjects){
		var currDeviceName = app.realHwObjects[blockID].devName;
		// Is the hardware device still present in the midi list ?
		if ( $.inArray(currDeviceName, deviceList) == -1){ // Returns -1 if A is not in B
			app.removeRealHwBlock(blockID);				
		}
	}
	
	// NEW CONNECTED MODULES
		
    for(var i = 0; i < deviceList.length ; i ++ ){
    	var currDeviceName = deviceList[i];
    	var foundBlockId = app.findBlockID(currDeviceName);
    	
    	if (!foundBlockId ) { // if no device yet created
    		console.log("Found new midi device to connect to:" + currDeviceName );
    		
    		if(currDeviceName.substring(0, currDeviceName.length - 2) == "RGB_LED"){
    			var newHwBlock = new RGB_LED(currDeviceName);
    		}
    		else{
    			var newHwBlock = new RealHwBlock(currDeviceName);
    		}
    		
    		if(newHwBlock.deviceDirection == "Input" ){// output
    			app.Pool.OpenMidiOut(currDeviceName);
    		}      
    		 		      		
    		// Always add new devices as possible midi inputs (so any device can receive MIDI messages )
   			app.Pool.OpenMidiIn(currDeviceName,function(name){return function(t,a){onNewMidiMsg(name,a);};}(deviceList[i]));        							        		
    	}
    }
	
}

// Main MIDI Message callback. Whenever a new midi message comes in
function onNewMidiMsg( deviceName, msg){
	// console.log("New midi msg generated by: " + deviceName);
	
	// When a device generates a message just send it to its self (hardware block)
	var blockID = app.findBlockID(deviceName);
	var block = app.blockObjects[blockID];
	block.onReceiveMessage(blockID,msg);
}

// MIDI pool object that dynamically creates new instances of the plugin for each
// Midi device
function MidiPool(){
 var place;
 var arr=[];
 var inputs={};
 var outputs={};
 if(arguments.length){
  if(arguments[0].isJazz){
   place=arguments[0].parentNode;
   arr[0]={plugin:arguments[0]};
  }
  else{
   try{ // if this is a good location to create plugins
    var tmp=create_plugin(arguments[0]);
    arr[0]={plugin:tmp};
    place=arguments[0];
   }
   catch(err){}
  }
 }
 if(place===undefined){ // otherwise create plugins at where the current script is
  var scripts=document.getElementsByTagName('script');
  place=scripts[scripts.length-1].parentNode;
 }
 if(!arr.length) arr[0]={plugin:create_plugin(place)};

 // Comment out so midi messages pass though even when browswer doesn't have focus
 // if(navigator.appName=='Microsoft Internet Explorer'){ document.onfocusin=onFocusIE; document.onfocusout=onBlurIE;}
 // else{ window.onfocus=connectMidi; window.onblur=disconnectMidi;}

 function create_plugin(where){
  var obj=document.createElement('object');
  obj.classid="CLSID:1ACE1618-1C7D-4561-AEE1-34842AA85E90";
  if(!obj.isJazz) obj.type="audio/x-jazz";
  obj.style.visibility='hidden';
  obj.style.width='0px'; obj.style.height='0px';
  where.appendChild(obj);
  if(obj.isJazz) return obj;
  where.removeChild(obj);
  throw "Cannot create Jazz-Plugin";
 }

 function connectMidi(){
  try{
   for(i=0;i<arr.length;i++){
    if(arr[i].in){
     if(arr[i].func) arr[i].plugin.MidiInOpen(arr[i].in,arr[i].func);
     else arr[i].plugin.MidiInOpen(arr[i].in);
    }
    if(i && arr[i].out) arr[i].plugin.MidiOutOpen(arr[i].out);
   }
  }
  
 	catch(err){
  		// res.innerHTML=res.innerHTML+' ERR: '+err;
 	}
 }

 function disconnectMidi(){
  try{
   for(i=0;i<arr.length;i++){
    if(arr[i].in) arr[i].plugin.MidiInClose();
    if(i && arr[i].out) arr[i].plugin.MidiOutClose(); // don't close the default out
   }
  }
  catch(err){}
 }
 function onFocusIE(){
  active_element=document.activeElement;
  connectMidi();
 }
 var active_element;
 function onBlurIE(){
  if(active_element!=document.activeElement){ active_element=document.activeElement; return;}
  disconnectMidi();
 }

 this.MidiOutList=function(){ return arr[0].plugin.MidiOutList();}
 this.MidiInList=function(){ return arr[0].plugin.MidiInList();}
 this.MidiOut=function(name,msg){ if(outputs[name]) outputs[name].plugin.MidiOutLong(msg);}
 this.ClearMidiIn=function(name){ if(inputs[name]) inputs[name].plugin.ClearMidiIn();}
 this.QueryMidiIn=function(name){ if(inputs[name]) return inputs[name].plugin.QueryMidiIn();}
 
 this.OpenMidiOut=function(name){
  if(outputs[name]) return;
  var i;
  for(i=0;i<arr.length;i++) if(!arr[i].out) break;
  if(i==arr.length){
   arr[i]={plugin:create_plugin(place)};
  }
  arr[i].out=name;
  arr[i].plugin.MidiOutOpen(name);
  outputs[name]=arr[i];
 }

 this.OpenMidiIn=function(name,func){
  if(!inputs[name]){
   var i;
   for(i=0;i<arr.length;i++) if(!arr[i].in) break;
   if(i==arr.length){
    arr[i]={plugin:create_plugin(place)};
   }
   arr[i].in=name;
   inputs[name]=arr[i];
  }
  if(func) inputs[name].plugin.MidiInOpen(name,func); else inputs[name].plugin.MidiInOpen(name);
  inputs[name].func=func;
 }
}

//////////  MIDI Connections - jsplumb callback on change of any connection
function updateConnections (info, shouldRemove){
	console.log("Updating connections");

	// First check if we plugged input a code block
	// Code blocks have divs with ID = clobject-4 etc , hardware div have id:light-1_container
	var sourceElem = $("#"+info.sourceId);
	var targetElem = $("#"+info.targetId);
	var targetInputElem;
	var targetOutputElem;

	var sourceID = info.sourceId.split("-")[1];
	var targetID = info.targetId.split("-")[1];
	var sourceName = app.blockObjects[sourceID].devName; // remove any underscores
	var targetName = app.blockObjects[targetID].devName;
	
	 console.log("source name: " + sourceName + " sourceID: " + sourceID);
	 console.log("target name: " + targetName + " targetID: " + targetID);
	
	if (shouldRemove){
		app.blockObjects[sourceID].removeOutputConnection(app.blockObjects[targetID]);
		app.blockObjects[targetID].removeInputConnection(app.blockObjects[sourceID]);
	}else{
		app.blockObjects[sourceID].addOutputConnection(app.blockObjects[targetID]);
		app.blockObjects[targetID].addInputConnection(app.blockObjects[sourceID]);
	}		
}


// Code to evaluate text boxes
function evalCodeBlock( codeBlockID,sourceID){
	return 0;
	console.log("Evaling code block");
	
	var codeBlockObj = app.blockObjects[codeBlockID];
	var clobjectDiv = $("#block-"+codeBlockID); // jquery view object
	
	var elem = clobjectDiv.find(".freeCell");
	var inputValue = elem.find(".codeArgInput").val();
	var outputValueElem = clobjectDiv.find(".returnValInput");
		
	// Insert new lines around div tags so we can spilt into a line array
	var str = elem.html().replace(/(<\/div>)|(<div>)|<div[^>]*>|(<br>)/g,"\n"); 
	
	str = unescapeHTML(str); // remove any unescaped chars e.g. & " ' < >
	var lines = str.trim().split("\n"); // split string into array of lines

	//remove empty lines
	var trimmedlines = [];
	for (var i = 0; i < lines.length; i++) {
		if ( lines[i].trim() !="" && lines[i] !="<br>" ) trimmedlines.push(lines[i]);
	};
	lines = trimmedlines;

	// Add a line for each input argument
	var argElems = clobjectDiv.find(".codeArgInput");
	var argNames = clobjectDiv.find(".codeArgName");
	
	for (var i = 0; i < argNames.length; i++) {
		var currName = argNames[i].innerHTML;
		var currVal = argElems[i].value;	

		lines[i] = "var " + currName + " = " + currVal; // first line is an input variable	
			
	};
	
	// If there is no code to eval  just pass through the first input value	
	var numInConnections = Object.keys(codeBlockObj.inConnections).length
	// if(lines.length == 1){		
	if(lines.length == numInConnections){		
		outputValueElem.val(inputValue);
		return inputValue;
	}
		
	////////////////////////////////////
	/// CODE GENERATION (line by line)
	////////////////////////////////////
	var lastAssignment;
	var lastLine;
	var codeStr= "function(){";
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if(!line) continue; // skip blank lines		
		
		console.log("currline is:" +line);
		
		// Check if current line is an assigment and store variable name for later
		var lineAssignmnetMatch =  isAssignmentLine(line);
		if(lineAssignmnetMatch) lastAssignment = lineAssignmnetMatch[1];

		lastLine = line;
		if(isValidLine(line)) line +=";" ; // add semicolon to each line

		codeStr += line;
	};
	
	// Add a return value line , with defaults:
	// 1. Return last line if it is a valid expression
	// 2. else return last variable assignment in code
	if (lastLine) {
		if(!isValidReturnValue(lastLine)){
			lastLine = lastAssignment;
		}
		codeStr += "return (" + lastLine + ")";
	}

	codeStr +="}";
	console.log("eval code str:"+codeStr);		

	var result = tryEval(codeStr)();
	console.log("evaled code box with results:" +result);

	// todo place this in code box update
	if(outputValueElem) {
		outputValueElem.val(result);	
	}

	return result;
}

// Checks if the string is a valid javascript expression 
// i.e. a full statement 
function isValidLine(line){
	if(! line 
		|| line.match("{[^}]*$") // open ended block ( { not closed ) e.g. if () { ...
		|| line.match("^\s*}\s*$") // close bracket hanging out by itself
		|| line.match("^\s*{\s*$") // open bracket hanging out by itself
		// || line.match("^\s*(if|else)") // starts with keyword ( with arbitrary spaces)
	){return false }
	else {
	 return true;
	}
}

// Checks if statement can be returned in an eval
// Assignments , and lines with keywords cannot be returned by javascript syntax
function isValidReturnValue(line){

	if(! line 
		|| line.match("^\s*(if|else|var)") // starts with keyword ( with arbitrary spaces)
		|| line.match("^\s*}\s*$") // close bracket hanging out by itself
		|| line.match("=") // has assignment 
	){return false }
	else {
	 return true;
	}
}

// Is the line an assigment
function isAssignmentLine(line){

	if(! line ) return false;

	// is X = Y , not X == Y
	var foundMatch = line.match(/(\w+)[^=]?=[^=]?(\w+)/);
	
	return 	foundMatch;
}
