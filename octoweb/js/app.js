// this is the main application

// #Imports
// clay.js

console.log("hello from application");


//////////////////////////	INIT ON LOAD //////////////////////////

$( document ).ready(function() {
	
	// Everywhere is draggable except content editable areas
	// $( "div.draggable" ).draggable({ cancel: ".editable" });

	//////////////////////////////////// Test code 
 });



//// JS PLUMB

jsPlumb.ready(function() {

	// var instance = jsPlumb.getInstance({
	var instance = jsPlumb.importDefaults({  // Using the jsplumb object
		// default drag options
		DragOptions : { cursor: 'Move', zIndex:2000 },
		// the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
		// case it returns the 'labelText' member that we set on each connection in the 'init' method below.
		// ConnectionOverlays : [
		// 	// [ "Arrow", { location:1 } ],
		// 	[ "Label", { 
		// 		location:0.5,
		// 		id:"label",
		// 		cssClass:"aLabel"
		// 	}]
		// ],
		// Container:"flowchart-demo"
	});

	// this is the paint style for the connecting lines..
	var connectorPaintStyle = {
		lineWidth:2,
		// strokeStyle:"#61B7CF",
		strokeStyle:"darkgrey",
		joinstyle:"round",
		outlineColor:"white",
		outlineWidth:2
	},
	// .. and this is the hover style. 
	connectorHoverStyle = {
		lineWidth:4,
		strokeStyle:"#3CB6FF",
		outlineWidth:2,
		outlineColor:"white"

	},
	endpointHoverStyle = {
		fillStyle:"#3CB6FF",
		strokeStyle:"#3CB6FF"
	},
	targetEndpointHoverStyle = {
		
		strokeStyle:"#3CB6FF"
	},
	// the definition of source endpoints (the small blue ones)
	sourceEndpoint = {
		endpoint:"Dot",
		// endpoint: [ "Image", { url:"styles/img/wire-nub.png" } ],  // use an image
		paintStyle:{ 
			strokeStyle:"black",
			// fillStyle:"transparent",
			fillStyle:"#616161",
			radius:6,  // size of the target
			lineWidth:1
		},
		maxConnections:-1,
		isSource:true,
		// connector:[ "Flowchart", { stub:[40, 60], gap:10, cornerRadius:5, alwaysRespectStubs:true } ],								                
		// connector:[ "Straight", { cornerRadius:5 } ],								                
		connector:[ "Bezier", { curviness:50 } ],
		// connector:[ "Bezier", { curviness:10 } ],
		
		connectorStyle:connectorPaintStyle,
		hoverPaintStyle:endpointHoverStyle,
		connectorHoverStyle:connectorHoverStyle,
        dragOptions:{},
        // overlays:[
        // 	[ "Label", { 
        //     	location:[0.5, 1.5], 
        //     	label:"Drag",
        //     	cssClass:"endpointSourceLabel" 
        //     } ]
        // ]
	},		
	// the definition of target endpoints (will appear when the user drags a connection) 
	targetEndpoint = {
		endpoint:"Dot",					
		paintStyle:{ fillStyle:"white",radius:6, strokeStyle:"black",lineWidth:1},
		hoverPaintStyle:targetEndpointHoverStyle,
		maxConnections:-1,
		dropOptions:{ hoverClass:"hover", activeClass:"active" },
		isTarget:true,			
        // overlays:[
        // 	[ "Label", { location:[0.5, -0.5], label:"Drop", cssClass:"endpointTargetLabel" } ]
        // ]
	},			
	init = function(connection) {			
		connection.getOverlay("label").setLabel(connection.sourceId.substring(15) + "-" + connection.targetId.substring(15));
		connection.bind("editCompleted", function(o) {
			if (typeof console != "undefined")
				console.log("connection edited. path is now ", o.path);
		});
	};			

	_addEndpoints = function(toId, sourceAnchors, targetAnchors) {
	
			if(sourceAnchors.length > 0){
				for (var i = 0; i < sourceAnchors.length; i++) {
					var sourceUUID = toId + sourceAnchors[i];
					instance.addEndpoint("" + toId, sourceEndpoint, { anchor:sourceAnchors[i], uuid:sourceUUID });						
				}
			}

			// js : Manually offset move anchors , last two are x and y offset
			// Offset endpoints using custom  anchor:[ 0.5, 1, 0, 1 ] , [x, y, dx, dy]
    		// x and yare coordinates in the interval [0,1] specifying the position of the anchor, and dx and dy
    		// e.g. [0, 0.5, -1, 0] defines a Left ,  [0.5, 0, 0, -1] defines a Top
    		// https://jsplumbtoolkit.com/doc/anchors
			
			if(targetAnchors.length > 0){
				var targetUUID = toId + targetAnchors[0];
				instance.addEndpoint("" + toId, targetEndpoint, { anchor: [0.5, 0, 0, -1,0,10] , uuid:targetUUID });						
			}
			
			// for (var j = 0; j < targetAnchors.length; j++) {
// 				var targetUUID = toId + targetAnchors[j];
// 				instance.addEndpoint("" + toId, targetEndpoint, { anchor:targetAnchors[j], uuid:targetUUID });						
// 			}
		};

	instance.bind("connection", function(info, originalEvent) {
		console.log("Connection made info:" +	info);
		originalEvent.preventDefault();
		updateConnections(info);
		// connect the source (Sensor) to Target (output eg buzzer)

	});
	instance.bind("connectionDetached", function(info, originalEvent) {
		console.log("Connection detached info:" +	info);
		updateConnections(info, true);
	});
	
	instance.bind("connectionMoved", function(info, originalEvent) {
		console.log("Connection moved info:" +	info);
		//  only remove here, because a 'connection' event is also fired.
		// in a future release of jsplumb this extra connection event will not
		// be fired.
		updateConnections(info, true);
	});
		// _addEndpoints("a", ["BottomCenter"], ["TopCenter"]);
		// _addEndpoints("b", ["BottomCenter"], ["TopCenter"]);
		// _addEndpoints("c", ["BottomCenter"], ["TopCenter"]);
		// instance.draggable($(".draggable"));

// 	// suspend drawing and initialise.
// 	instance.doWhileSuspended(function() {

// 		// _addEndpoints("Window4", ["TopCenter", "BottomCenter"], ["LeftMiddle", "RightMiddle"]);			
// 		// _addEndpoints("Window2", ["LeftMiddle", "BottomCenter"], ["TopCenter", "RightMiddle"]);
// 		// _addEndpoints("Window3", ["RightMiddle", "BottomCenter"], ["LeftMiddle", "TopCenter"]);
// 		// _addEndpoints("Window1", ["LeftMiddle", "RightMiddle"], ["TopCenter", "BottomCenter"]);
// ///
// 		_addEndpoints("Window4", ["BottomCenter"], ["TopCenter"]);
// 		_addEndpoints("Window2", ["BottomCenter"], ["TopCenter"]);
// 		_addEndpoints("Window3", ["BottomCenter"], ["TopCenter"]);
// 		_addEndpoints("Window1", ["BottomCenter"], ["TopCenter"]);
					
// 		// listen for new connections; initialise them the same way we initialise the connections at startup.
// 		instance.bind("connection", function(connInfo, originalEvent) { 
// 			init(connInfo.connection);
// 		});			
					
// 		// make all the window divs draggable						
// 		instance.draggable(jsPlumb.getSelector(".flowchart-demo .window"), { grid: [20, 20] });		
// 		// THIS DEMO ONLY USES getSelector FOR CONVENIENCE. Use your library's appropriate selector 
// 		// method, or document.querySelectorAll:
// 		//jsPlumb.draggable(document.querySelectorAll(".window"), { grid: [20, 20] });
        
// 		// connect a few up
// 		instance.connect({uuids:["Window2BottomCenter", "Window3TopCenter"], editable:true });
// 		instance.connect({uuids:["Window2LeftMiddle", "Window4LeftMiddle"], editable:true});
// 		instance.connect({uuids:["Window4TopCenter", "Window4RightMiddle"], editable:true});
// 		instance.connect({uuids:["Window3RightMiddle", "Window2RightMiddle"], editable:true});
// 		instance.connect({uuids:["Window4BottomCenter", "Window1TopCenter"], editable:true});
// 		instance.connect({uuids:["Window3BottomCenter", "Window1BottomCenter"], editable:true});
// 		//
        
// 		//
// 		// listen for clicks on connections, and offer to delete connections on click.
// 		//
// 		instance.bind("click", function(conn, originalEvent) {
// 			if (confirm("Delete connection from " + conn.sourceId + " to " + conn.targetId + "?"))
// 				jsPlumb.detach(conn); 
// 		});	
		
// 		instance.bind("connectionDrag", function(connection) {
// 			console.log("connection " + connection.id + " is being dragged. suspendedElement is ", connection.suspendedElement, " of type ", connection.suspendedElementType);
// 		});		
		
// 		instance.bind("connectionDragStop", function(connection) {
// 			console.log("connection " + connection.id + " was dragged");
// 		});

// 		instance.bind("connectionMoved", function(params) {
// 			console.log("connection " + params.connection.id + " was moved");
// 		});
// 	});

// 	jsPlumb.fire("jsPlumbDemoLoaded", instance);

	console.log("jsplumb done setting up");	
});
