////////////////////////////////////////////
// main setup
////////////////////////////////////////////

// a Global variable to pass around the information taken from the URL arguments
var urlData = [];

function setupDataStore(){

    // Declare the dataStore object
    dataStore = {
	// 2D viewer and common things
       // "topGroups": topGroups,                                     //groups in top nav row
        "topGroups": [],                                            //groups in top nav row
        "cutVertices": [],                                          //[x,y] vertices of cut region polygon
        "ODBhost": 'http://grifstore0.triumf.ca:8081',                 //host:port of ODB to write cut region vertices to
        "spectrumServer": 'http://grifstore0.triumf.ca:9093',          //host:port to pull raw spectra from
        "backendHost": 'grifstore0',                                   //host:port to pull raw spectra from
	"rawData" : {},                                               //buffer for raw spectrum data
        "raw": [0],
        "raw2": [0],
        "closeMenuOnclick": true,                                   //don't keep the plot menu open onclick (can only plot one at a time anyway)
        "pageTitle": '2D Spectrum Tool',


	// 1D viewer things
        "waveformSnap": true,                                                     //do we want the snap to waveform functionality?
        "doUpdates": false,                                                       //do we want the data update button and loop?
        "scaling": false,                                                         //do we want to expose x-axis rescaling UI?
        "plots": [],                                                              //array of names for default plot cells
        "ODBrequests": [],                                                        //array of odb requests to make on refresh
	"zeroedPlots": {},                                                        //initialize empty object for zeroed plots
	"createdSpectra": {},                                                     //initialize empty object for created spectra
	"twoDimensionalSpectra": ['GG:2d', 'Addback_GG:2d', 'Energy_CrystalNumber:2d'],     //list of 2d spectra which need to be handled differently to 1d spectra
	"activeMatrix": "",                                                       //only one 2d spectrum (matrix) is active at any one time. This is the gate target
	"activeMatrixXaxisLength": 0,                                             //only one 2d spectrum (matrix) is active at any one time. This is the X axis length
	"activeMatrixYaxisLength": 0,                                             //only one 2d spectrum (matrix) is active at any one time. This is the Y axis length
	"activeMatrixSymmetrized": false,                                         //only one 2d spectrum (matrix) is active at any one time. This is if it is symmeterized.

	"histoFileDirectoryPath" : '',                                            // histogram directory taken from URL. Then can be changed from a select
	"histoFileName" : '',                                                      // histogram filename taken from URL. Then can be changed from a select
	"counter" : 0
    };
    
    // Unpack the URL data, then get the initial list of Histogram files available from the server
    GetURLArguments(getHistoFileListFromServer);

    // Set the initial cell index value
    dataStore.cellIndex = dataStore.plots.length;
    
}
setupDataStore();

function plotControl2d(wrapID){
    // object to manage data requests and manipulate the plot

    this.wrapID = wrapID;
    this.wrap = document.getElementById(wrapID);

    this.setup = function(){
        //listen for plot requests
        listener(this.wrapID, 'requestPlot', this.routeNewPlot.bind(this));
        listener(this.wrapID, 'requestGate', this.routeNewGate.bind(this));

        //which spectrum are we polling?
        this.activeSpectra = [null];

        // plot updates
        //update interval select
        document.getElementById('upOptions').onchange = this.startRefreshLoop.bind(document.getElementById('upOptions'), this);
        //update now button
        document.getElementById('upNow').onclick = this.refreshData.bind(this);
        //set the refresh loop going
        this.startRefreshLoop.bind(document.getElementById('upOptions'), this)();
    }

    this.startRefreshLoop = function(controlElement){
        //sets the refresh loop as a callback to changing the selector menu.
        //<controlElement>: plotControl2d element
        //this: select element (or anything with a .value of time in ms)

        var period = parseInt(this.value,10); //in miliseconds

        clearInterval(dataStore.dataRefreshLoop);
        if(period != -1)
            dataStore.dataRefreshLoop = setInterval(controlElement.refreshData.bind(controlElement), period );

    }

    /////////////////////
    // data routing
    /////////////////////

    this.routeNewPlot = function(event){
        //catch a requestPlot event, do appropriate things with it.
        //<event>: event; requestPlot custom event
        //this: plotControl2d object
        var i, evt;
	
        // Any requests for 1d objects must be rejected here, they are handled elsewhere
	if(!dataStore.twoDimensionalSpectra.includes(event.detail.plotName)){
            // The plot requested is a 1d matrix but this viewer can only handle 2d
            return;
	}

	// Switch to the 2D viewer for displaying this 2d histogram
	toggleHeatmapMode();
	
        //what spectra has our attention?
        dataStore.activeSpectra = event.detail.plotName;
        dataStore.activeMatrix = event.detail.plotName;
        this.activeSpectra = [event.detail.plotName];
        dataStore.hm.plotTitle = event.detail.plotName;

        //don't need plot help anymore; swap in roi help
        document.getElementById('intro-plot-picker').classList.add('hidden');
        document.getElementById('intro-shift-click').classList.remove('hidden');

        //demand refresh
        this.refreshData()
    }

    this.refreshData = function(){
        //refresh the current histogram data, then call fetchCallback()
        //this: plotControl2d object

	// Display info to user that the data is downloading (switched off in fetchCallback)
        dataStore.hm.DataDownloading('on');
	
	// activeSpectra can now include 1D Projections of 2D matrices which are created locally in the server.
	// So these need to be stripped from the requests that go to the server for updates.
	var activeSpectraForQueries = this.activeSpectra.map((x) => x.split(':')[1]);
	for(let key in dataStore.createdSpectra) {
	    const index = activeSpectraForQueries.indexOf(key);
	    if (index > -1) {
	        activeSpectraForQueries.splice(index, 1);
	    }
	}
	var queries = constructQueries(activeSpectraForQueries);
	
        if(dataStore.activeSpectra){
            Promise.all(queries.map(promiseJSONURL)
                ).then(
                    function(spectra){
			// This is for 2d spectra
			// Need to change this away from [0] and find the correct index number to use

                                // modify the spectrum name that were received from a histogram file to include it at the start
                                if(dataStore.histoFileName.length>0){
                                   var this2dKey = dataStore.histoFileName.split('.')[0] + ':' + JSON.parse(JSON.stringify(spectra[0]['name']));
                                  spectra[0].name = dataStore.histoFileName.split('.')[0] + ':' + spectra[0].name;
                                  }else{
                                   this2dKey = JSON.parse(JSON.stringify(spectra[0]['name']));
                                  }
			
                                //keep the raw results around
                                dataStore.rawData[this2dKey] = JSON.parse(JSON.stringify(spectra[0]));

			dataStore.raw2 = dataStore.rawData[dataStore.activeMatrix].data2;
			dataStore.activeMatrixXaxisLength = dataStore.rawData[dataStore.activeMatrix].XaxisLength;
			dataStore.activeMatrixYaxisLength = dataStore.rawData[dataStore.activeMatrix].YaxisLength;
			dataStore.activeMatrixSymmetrized = dataStore.rawData[dataStore.activeMatrix].symmetrized;
                        fetchCallback(); 
                    }
                )
        }
    }
    
    this.routeNewGate = function(event){
        //catch a requestGate event, do appropriate things with it.
        //<event>: event; requestPlot custom event
        //this: plotControl2d object
        var i, evt, axis, plotName;
	
	// unpack the values from the event
	axis = event.detail.gateAxis;
	min = event.detail.gateMin;
	max = event.detail.gateMax;

	// Make the gated spectra
	if(axis === 'y'){
	    plotName = projectYaxis(min,max);
	}else{
	    plotName = projectXaxis(min,max);
	}
	
	// Add this new specturm to the menu if it is not already there
	let coincIndex = dataStore.topGroups.map(e => e.name).indexOf('Coinc');
	let projIndex = dataStore.topGroups[coincIndex].subGroups.map(e => e.subname).indexOf('Projections');

	// Check if this plotName already exists in the menu
	let plotExistsInMenu = 0;
	let nodesArray = document.getElementById('dropprojlist').childNodes;
	for(i=0; i<nodesArray.length; i++){
	    if(nodesArray[i].id == plotName){
		plotExistsInMenu=1;
	    }
	}
	
	if(plotExistsInMenu == 0){
	    // Need to add this Gate name to the menu and the topGroups object in the dataStore
	dataStore.topGroups[coincIndex].subGroups[projIndex].items.push(plotName);
	    
	newMenuItem = document.createElement('li'); 
	newMenuItem.setAttribute('id', plotName); 
	newMenuItem.setAttribute('class', 'dd-item');
	newMenuItem.innerHTML = '<div class=\'plotName\'>'+plotName+'</div><span id=\''+plotName+'badge\' class=\"badge transparent\"><span class=\"glyphicon glyphicon-ok\" aria-hidden=\"true\"></span></span>';
        newMenuItem.onclick = function (){ dispatcher({ 'plotName': plotName }, 'requestPlot'); };
	document.getElementById('dropprojlist').appendChild(newMenuItem);
	}
	
	// Send a request to plot this now if requested
	if(event.detail.plotNow === true){
            dispatcher({ 'plotName': plotName }, 'requestPlot');
	}
	
    }
}

function toggleHeatmapMode(){
    // hide all 1D projection viewers and controls
    document.getElementById('plotWrap1D').style.display = "none";
    document.getElementById('plotCtrl1D').style.display = "none";
    document.getElementById('gateCtrl1D').style.display = "none";
    document.getElementById('auxCtrlWrap').style.display = "none";
    
    // display spectra as a 2D heatmap and show controls
    document.getElementById('plotWrap2D').style.display = "block";
    document.getElementById('cutBounds').style.display = "block";
    
    // Toggle the mode buttons
    document.getElementById('modeBtn2d').classList.remove('btn-default');
    document.getElementById('modeBtn2d').classList.add('btn-success');
    document.getElementById('modeBtn1d').classList.remove('btn-success');
    document.getElementById('modeBtn1d').classList.add('btn-default');
}

function toggleProjectionMode(){
    // hide all 2D heatmap viewers and controls
    document.getElementById('plotWrap2D').style.display = "none";
    document.getElementById('cutBounds').style.display = "none";
    
    // display spectra as 1D projections and show the controls for gating etc.
    document.getElementById('plotWrap1D').style.display = "block";
    document.getElementById('plotCtrl1D').style.display = "block";
    document.getElementById('gateCtrl1D').style.display = "block";
    document.getElementById('auxCtrlWrap').style.display = "block";

    // If this is the first time to show the 1D projections, 
    // create the first plot cell
    if(typeof dataStore.viewers === 'undefined'){
	document.getElementById('plottingGridnewPlotButton').click();
    }
    
    // Toggle the mode buttons
    document.getElementById('modeBtn1d').classList.remove('btn-default');
    document.getElementById('modeBtn1d').classList.add('btn-success');
    document.getElementById('modeBtn2d').classList.remove('btn-success');
    document.getElementById('modeBtn2d').classList.add('btn-default');
}


function heatmapClick(evt){
    // do something when the plot is clicked

    var data = evt.detail,
        li = document.createElement('li'),
        i;

    // abort if this point already added to list
    // mitigates funky multiple-fires of heatmap_click when updating
    for(i=0; i<dataStore.cutVertices.length; i++){
        if(dataStore.cutVertices[i][0] == data.cell.x && dataStore.cutVertices[i][1] == data.cell.y)
            return 0;
    }

    // don't need plot click help anymore
    document.getElementById('intro-shift-click').classList.add('hidden');

    // expand UI
    li.innerHTML = Mustache.to_html(
        dataStore.templates.cutVertex, 
        {
            'initialX': data.cell.x,
            'initialY': data.cell.y
        }
    );
    // point the delete vertex button at the right place
    li.getElementsByClassName('delete-vertex')[0].onclick = removeCutVertex;
    // point the move vertex buttons at the right place
    li.getElementsByClassName('move-vertex-up')[0].onclick = moveVertex.bind(li, 'up');
    li.getElementsByClassName('move-vertex-down')[0].onclick = moveVertex.bind(li, 'down');

    document.getElementById('cutPolyVertices').appendChild(li);

    //update dataStore
    extractCutVertices();

    //update plot overlay
    dataStore.hm.render();
}

function extractCutVertices(){
    // read the cut vertices from the UI and pack them in dataStore.cutVertices as [[x0,y0], [x1,y1],...]

    var xVertices = document.getElementsByClassName('vertex-x'),
        yVertices = document.getElementsByClassName('vertex-y'),
        i;

    dataStore.cutVertices = [];
    for(i=0; i<xVertices.length; i++){
        dataStore.cutVertices.push([xVertices[i].value, yVertices[i].value])
    }
}

function fetchCallback(){
    //runs after every time the histogram is updated
    
    // replot everything for the 1d viewer
    for(viewerKey in dataStore.viewers){
        dataStore.viewers[viewerKey].plotData(null, true);
    }

    // The rest of this fetchCallback is only for 2d spectra, so if there are not any active then we can bail out here
    
    var numOf2dActive=0;
	for(let key in dataStore.twoDimensionalSpectra) {
	    const index = dataStore._plotControl.activeSpectra.indexOf(key);
	    if (index > -1) {
	        numOf2dActive++;
	    }
	}
    if(numOf2dActive == 0 && dataStore.activeMatrix.length<1){ return; } 
    
    // unpack the raw 2d spectrum to the required format
    try{ objectIndex = this.colorMap.map(e => e.matrix).indexOf(dataStore.activeMatrix);
	 dataStore.hm.colorMap[objectIndex].data = [];
	 //console.log('Clear the colorMap');
       }
    catch(err){
	//console.log('No colorMap to clear')
    }
    
    dataStore.hm.raw = packZ(dataStore.rawData[dataStore.activeMatrix].data2);

    // make the 2d heatmap plot of this histogram 
    dataStore.hm.drawData();

    // Create total projections for the two axes of the active matrix
    dispatcher({ 'gateAxis': 'x', 'gateMin': undefined, 'gateMax': undefined, 'plotNow': false }, 'requestGate');
    dispatcher({ 'gateAxis': 'y', 'gateMin': undefined, 'gateMax': undefined, 'plotNow': false }, 'requestGate');
    
    // Add the data from any created spectra (projections of 2d objects) to any viewers wanting it
    for(key in dataStore.createdSpectra){
        //repopulate all spectra that use this spectrum
        for(viewerKey in dataStore.viewers){
            if(dataStore.viewers[viewerKey].plotBuffer[key]){
                dataStore.viewers[viewerKey].addData(key, dataStore.createdSpectra[key]);
            }
        }
    }
    
    // plug in the onclicks to the 2d heatmap
    dataStore.hm.canvas.addEventListener('heatmap_shiftclick', heatmapClick, false);
    
}

function generateOverlay(){
    // generate the gate polygon overlay

    var i, coords, update = {};

    dataStore.hm.ctx[1].clearRect(0,0,dataStore.hm.width, dataStore.hm.height);
    if(dataStore.cutVertices.length > 1){
        // line style
        dataStore.hm.ctx[1].strokeStyle = '#FFFFFF';
        dataStore.hm.ctx[1].lineWidth = 2;
        // don't draw outside of data area
        dataStore.hm.ctx[1].clip(dataStore.hm.dataArea);

        coords = dataStore.hm.cell2coords(dataStore.cutVertices[0][0], dataStore.cutVertices[0][1]);
        dataStore.hm.ctx[1].beginPath();
        dataStore.hm.ctx[1].moveTo(coords.x, coords.y);
        for(i=1;i<dataStore.cutVertices.length; i++){
            coords = dataStore.hm.cell2coords(dataStore.cutVertices[i][0], dataStore.cutVertices[i][1]);
            dataStore.hm.ctx[1].lineTo(coords.x, coords.y);
        }
        dataStore.hm.ctx[1].closePath();
        dataStore.hm.ctx[1].stroke();
        dataStore.hm.ctx[1].restore();
    }
}


function removeCutVertex(){
    // onclick callback for removing a cut vertex
    // this == delete button

    var parent = this.parentElement,
        grandparent = parent.parentElement;

        grandparent.removeChild(parent);

    extractCutVertices();
    dataStore.hm.render();
}

function moveCutVertex(){
    // onchange callbakc for changing the coordinates of a cut vertex
    // this == input:number element

    extractCutVertices();
    dataStore.hm.render();
}

function saveCutToODB(){
    // take the current cut vertices and save them to the ODB
    var xVals=[], yVals=[],
        i;

    for(i=0; i<dataStore.cutVertices.length; i++){
        xVals.push(dataStore.cutVertices[i][0]);
        yVals.push(dataStore.cutVertices[i][1]);
    }

    CRUDarrays(
        ['/DAQ/analyzerGates/x', '/DAQ/analyzerGates/y'], 
        [xVals, yVals], 
        [7,7]
    )
}

function moveVertex(direction){
    // move vertex one step in <direction>== 'up' or 'down'
    // this == li node containing this vertex

    if(direction=='up'){
        this.parentElement.insertBefore(this, this.previousSibling)
    }else if(direction=='down'){
        this.parentElement.insertBefore(this.nextSibling, this)
    }

    extractCutVertices();
    dataStore.hm.render();
}

