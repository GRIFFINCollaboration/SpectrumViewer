////////////////////////////
// Analyzer Interface Gates and Histogram setup
////////////////////////////


    ////////////////
    // setup
    ////////////////

    function processConfigFile(payload){
        // callback after getting the Config file containing the Global conditions, Gates conditions and Histogram definitions from the server/ODB
        // finish initial setup
	
	// Unpack the response and place the response from the server into the dataStore
	console.log(payload);
        dataStore.Configs = JSON.parse(payload);
//	console.log(dataStore.Configs);

	// Reset the dataStore of any old definitions
	dataStore.sortCodeVariables = [];
        dataStore.globalCondition = {                   // place to park Global condition info on the dataStore
                "globalIndex" : 0,               // monotonically increasing counter to create unique IDs for new Glabal condition blocks
	    "contents" : []             // array of structures holding the variables and values for each Global condition
    	};
        dataStore.gateCondition = {                  // place to park Gate condition info on the dataStore
              "gateIndex" : 0,                 // monotonically increasing counter to create unique IDs for new Gate condition blocks
            "nRows" : [],                 // array of monotonic counters for number of rows inserted into Gate condition block; Gate block # == array index. 
	    "contents" : []             // array of structures holding the variables and values for each Gate condition
	};
        dataStore.histogramDefinition = {             // place to park Histogram definition info on the dataStore
                   "histogramIndex" : 0,            // monotonically increasing counter to create unique IDs for new Histogram condition blocks
            "nRows" : [],            // array of monotonic counters for number of rows inserted into Histogram condition block; Histogram block # == array index. 
            "contents" : []            // place to save Histogram definition parameters
	};
	
	// Unpack the Config file from the server into the dataStore layout

    // Unpack Sort Variables content
	for(var i=0; i<dataStore.Configs.Analyzer[0].Variables.length; i++){
	    dataStore.sortCodeVariables.push(dataStore.Configs.Analyzer[0].Variables[i]);   
	}
	
    // Unpack Global content
	for(var i=0; i<dataStore.Configs.Analyzer[3].Globals.length; i++){
	    dataStore.globalCondition.contents.push(dataStore.Configs.Analyzer[3].Globals[i]);   
	}
	
    // Unpack Gate content
    for(var i=0; i<dataStore.Configs.Analyzer[1].Gates.length; i++){
	    dataStore.gateCondition.contents.push(dataStore.Configs.Analyzer[1].Gates[i]);   
    }
    
    // Unpack the Histogram content
    for(var i=0; i<dataStore.Configs.Analyzer[2].Histograms.length; i++){
	dataStore.histogramDefinition.contents.push(dataStore.Configs.Analyzer[2].Histograms[i]);
    }

	// Unpack the Calibrations content here
	//dataStore.Configs.Analyzer[4].Calibrations
	
	// Unpack the Directories content here
	if(dataStore.Configs.Analyzer[5].Directories[0].Path.length>0){ midasFileDataDirectoryPath = dataStore.Configs.Analyzer[5].Directories[0].Path; }
	if(dataStore.Configs.Analyzer[5].Directories[1].Path.length>0){ histoFileDirectoryPath = dataStore.Configs.Analyzer[5].Directories[1].Path; }
	if(dataStore.Configs.Analyzer[5].Directories[2].Path.length>0){ configFileDataDirectoryPath = dataStore.Configs.Analyzer[5].Directories[2].Path; }
    
        // populate the current configuration based on what was received from the server
        buildConfigMenu();
    }

function buildConfigMenu(){

    // Need to delete everything already existing here first

    
    // Create the expand buttons for each section
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandGlobalListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>+</p>';
    newButton.onclick = function(){
	expandGlobalList();
    }.bind(newButton);
    document.getElementById('globalHeader').appendChild(newButton);
    
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandGateListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>+</p>';
    newButton.onclick = function(){
	expandGateList();
    }.bind(newButton);
    document.getElementById('gateHeader').appendChild(newButton);
    
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandHistogramListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>+</p>';
    newButton.onclick = function(){
	expandHistogramList();
    }.bind(newButton);
    document.getElementById('histogramHeader').appendChild(newButton);
    
    
    // Create and populate the Global, Gate and Histogram blocks based on the Config file received from the server

    // Build Global content
    for(var i=0; i<dataStore.globalCondition.contents.length; i++){
	addNewGlobal(i);
    }
    
    // Build Gate content
    for(var i=0; i<dataStore.gateCondition.contents.length; i++){
	addNewGate(i);
    }
    
    // Build the Histogram content
    for(var i=0; i<dataStore.histogramDefinition.contents.length; i++){
	addNewHistogram(i);
    }

}

    //////////////////////////
    // DOM manipulations
    //////////////////////////

function expandGlobalList(){

    // Change the visibility of the section
    document.getElementById('GlobalConditions').classList.toggle('hidden');
    
    // delete the expand button
    document.getElementById('expandGlobalListButton').remove();
	
    // Create the collapse button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'collapseGlobalListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>-</p>';
    newButton.onclick = function(){
	collapseGlobalList();
    }.bind(newButton);
    document.getElementById('globalHeader').appendChild(newButton);
    
}
function expandGateList(){

    // Change the visibility of the section
    document.getElementById('GateConditions').classList.toggle('hidden');
    
    // delete the expand button
    document.getElementById('expandGateListButton').remove();
	
    // Create the collapse button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'collapseGateListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>-</p>';
    newButton.onclick = function(){
	collapseGateList();
    }.bind(newButton);
    document.getElementById('gateHeader').appendChild(newButton);
    
}
function expandHistogramList(){

    // Change the visibility of the section
    document.getElementById('HistogramDefinitions').classList.toggle('hidden');
    
    // delete the expand button
    document.getElementById('expandHistogramListButton').remove();
	
    // Create the collapse button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'collapseHistogramListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>-</p>';
    newButton.onclick = function(){
	collapseHistogramList();
    }.bind(newButton);
    document.getElementById('histogramHeader').appendChild(newButton);
    
}
function collapseGlobalList(){

    // Change the visibility of the section
    document.getElementById('GlobalConditions').classList.toggle('hidden');
    
    // delete the collapse button
    document.getElementById('collapseGlobalListButton').remove();
	
    // Create the expand button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandGlobalListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>+</p>';
    newButton.onclick = function(){
	expandGlobalList();
    }.bind(newButton);
    document.getElementById('globalHeader').appendChild(newButton);
    
}
function collapseGateList(){

    // Change the visibility of the section
    document.getElementById('GateConditions').classList.toggle('hidden');
    
    // delete the collapse button
    document.getElementById('collapseGateListButton').remove();
    
    // Create the expand button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandGateListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>+</p>';
    newButton.onclick = function(){
	expandGateList();
    }.bind(newButton);
    document.getElementById('gateHeader').appendChild(newButton);
}
function collapseHistogramList(){

    // Change the visibility of the section
    document.getElementById('HistogramDefinitions').classList.toggle('hidden');
    
    // delete the collapse button
    document.getElementById('collapseHistogramListButton').remove();
    
    // Create the expand button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'expandHistogramListButton'); 
    newButton.setAttribute('class', 'btn-expand-large');
    newButton.innerHTML = '<p>+</p>';
    newButton.onclick = function(){
	expandHistogramList();
    }.bind(newButton);
    document.getElementById('histogramHeader').appendChild(newButton);
}

    function addNewGlobal(arrayIndex){
        // add a new Global Condition block
	
	// The argument arrayIndex is used for populating initial values of the html with those from a specific set in the dataStore.
	// Set arrayIndex to -1 to create a new instance and create the new space for it in the dataStore
	// Every instance requires a unique name
	if(isNaN(arrayIndex)){
	    // This is a new instance so everything must be created
	    var arrayIndex = -1;

	    // Get the unique gate name entered in the modal
	    var thisGlobalName = dataStore.uniqueGlobalName;

	    // Close the modal
	    $('#globalModal').modal('hide');
	    
	    // Reset the name in the modal text box ready for next time
	    document.getElementById('globalModalInput').value = '';
	}else{
	    // The values for this instance are already stored in the dataStore
	    // A unique name is required for this instance.
	    var thisGlobalName = dataStore.globalCondition.contents[arrayIndex].name;
	}

	// Create the new html block
        var wrap = document.createElement('div');
	var globalIndex = dataStore.globalCondition.globalIndex;
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'globalCondition' + globalIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['globalBlock'], 
            {  
                "globalNumber": globalIndex
            }
        );
        document.getElementById('globals-wrap').appendChild(wrap);

	// Populate the Gate with the entry in dataStore.gateCondition.contents[arrayIndex] if an arrayIndex was provided
	if(arrayIndex>=0){
	    document.getElementById('globalName'+globalIndex).value = thisGlobalName;
	    document.getElementById('globalMin'+globalIndex).value = dataStore.globalCondition.contents[arrayIndex].min;
	    document.getElementById('globalMax'+globalIndex).value = dataStore.globalCondition.contents[arrayIndex].max;
	}else{
	    document.getElementById('globalName'+globalIndex).value = thisGlobalName;
	}
	    
	// Increase the Global counters
        dataStore.globalCondition.globalIndex++;

	// If this is a new instance, create space for it in the dataStore and save it also to the server
	if(arrayIndex<0){
	    // Create the new condition in the dataStore and fill with generic initial values
	    var newContents = {
		"name" : 'new-global-condition',
		"min" : -100,
		"max" : 100
	    };
	    dataStore.globalCondition.contents[dataStore.globalCondition.globalIndex] = newContents;

	    // save it also to the server
	    saveGlobalChangeToAnalyzerODB(globalIndex);
	}
    }

function deleteGlobalBlock(globalNumber){
    // First use this globalNumber to get the name of this global from the html element id="globalName{{globalNumber}}"
    // Search the dataStore.globalCondition.contents[] array for the one matching that name.
    // Then you have the correct index number which might be different from globalNumber if some elements have been deleted.
    // Need to find the correct array index of this html element
    var thisName = document.getElementById('globalName'+globalNumber).value;
    i = dataStore.globalCondition.contents.length-1;
    while(dataStore.globalCondition.contents[i].name != thisName){
	i--;
	if(i<0){ break; }
    }
    let globalNumberIndex = i;
	
    // delete the Global condition from the server version
    var url = dataStore.spectrumServer + '/?cmd=removeGlobal';
    url += '&globalname='+dataStore.globalCondition.contents[globalNumberIndex].name;
    
    console.log('Remove Global, URL for analyzer server: '+url);

    // Send the request
        XHR(url, 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
           );

        // delete the indexed Global block
        deleteNode('globalCondition' + globalNumber);
	
	// delete the indexed Global contents from the dataStore
	dataStore.globalCondition.contents.splice(globalNumberIndex,1);
	
	// decrease the Global counters
        dataStore.globalCondition.globalIndex--;
    }

    function addNewGate(arrayIndex){
        // add a new Gate Condition block
	
	// The argument arrayIndex is used for populating initial values of the html with those from a specific set in the dataStore.
	// Set arrayIndex to -1 to create a new instance and create the new space for it in the dataStore
	// Every instance requires a unique name
	if(isNaN(arrayIndex)){
	    // This is a new instance so everything must be created
	    var arrayIndex = -1;

	    // Get the unique gate name entered in the modal
	    var thisGateName = dataStore.uniqueGateName;

	    // Close the modal
	    $('#gateModal').modal('hide');
	    
	    // Reset the name in the modal text box ready for next time
	    document.getElementById('gateModalInput').value = '';
	}else{
	    // The values for this instance are already stored in the dataStore
	    // A unique name is required for this instance.
	    var thisGateName = dataStore.gateCondition.contents[arrayIndex].name;
	}

	// Create the new html block
        var wrap = document.createElement('div');
	var gateIndex = dataStore.gateCondition.gateIndex;
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'gateCondition' + gateIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['gateBlock'], 
            {  
                "gateNumber": gateIndex,
                "sortCodeVariables": dataStore.sortCodeVariables,
                "logicOptions": dataStore.logicOptions
            }
        );
        document.getElementById('gates-wrap').appendChild(wrap);
	
	// Populate the Gate with the entry in dataStore.gateCondition.contents[arrayIndex] if an arrayIndex was provided
	document.getElementById('gateName'+gateIndex).value = thisGateName;
	
	    
	// Add the first row for the first condition
        dataStore.gateCondition.nRows[gateIndex] = 0;
	addNewGateConditionRow(gateIndex,arrayIndex);

	// Populate the Gate with the entry in dataStore.gateCondition.contents[arrayIndex] if an arrayIndex was provided
	if(arrayIndex>=0){
	    for(var i=0; i<dataStore.gateCondition.contents[arrayIndex].gateCondition.length; i++){
		if(i>0){
		    // Create the additonal condition row for this dataStore entry
		    addNewGateConditionRow(gateIndex,arrayIndex);
		}
		document.getElementById('gateConditionVariableSelect'+gateIndex+'-'+i).value = dataStore.gateCondition.contents[arrayIndex].gateCondition[i].Variable;
		document.getElementById('gateConditionLogicSelect'+gateIndex+'-'+i).value = dataStore.gateCondition.contents[arrayIndex].gateCondition[i].Logic;
		if(dataStore.gateCondition.contents[arrayIndex].gateCondition[i].Logic == 'RA'){
		    insertRangeInputs(gateIndex,i);
		    document.getElementById('gateConditionRangeMin'+gateIndex+'-'+i).value = (dataStore.gateCondition.contents[arrayIndex].gateCondition[i].Value & 0xFFFF);
		    document.getElementById('gateConditionRangeMax'+gateIndex+'-'+i).value = (dataStore.gateCondition.contents[arrayIndex].gateCondition[i].Value >> 16);
		}else{
		    document.getElementById('gateConditionValue'+gateIndex+'-'+i).value = dataStore.gateCondition.contents[arrayIndex].gateCondition[i].Value;
		}
	    }
	}
	
	// Increase the Gate counter
        dataStore.gateCondition.gateIndex++;

	// If this is a new instance, save it also to the server
	if(arrayIndex<0){
	    saveGateChangeToAnalyzerODB(gateIndex);
	}
    }

function deleteGateBlock(gateNumber){
    // First use this gateNumber to get the name of this gate from the html element id="gateName{{gateNumber}}"
    // Search the dataStore.gateCondition.contents[] array for the one matching that name.
    // Then you have the correct index number which might be different from gateNumber if some elements have been deleted.
    // Need to find the correct array index of this html element
    var thisName = document.getElementById('gateName'+gateNumber).value;
    i = dataStore.gateCondition.contents.length-1;
    while(dataStore.gateCondition.contents[i].name != thisName){
	i--;
	if(i<0){ break; }
    }
    let gateNumberIndex = i;
    
    // delete the Gate condition from the server version
    var url = dataStore.spectrumServer + '/?cmd=removeGate';
    url += '&gatename='+dataStore.gateCondition.contents[gateNumberIndex].name;
    
    console.log('Remove Gate, URL for analyzer server: '+url);

    // Send the request
        XHR(url, 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
           );
    
        // delete the indexed Gate block
        deleteNode('gateCondition' + gateNumber);
	
	// delete the indexed Gate contents from the dataStore
	dataStore.gateCondition.contents.splice(gateNumberIndex,1);
	
	// decrease the Gate counters
	dataStore.gateCondition.nRows.splice(gateNumberIndex,1);
        dataStore.gateCondition.gateIndex--;
    }

    function addNewHistogram(arrayIndex){
        // add a new Histogram Condition block

	// The argument arrayIndex is used for populating initial values of the html with those from a specific set in the dataStore.
	// Set arrayIndex to -1 to create a new instance and create the new space for it in the dataStore
	// Every instance requires a unique name
	if(isNaN(arrayIndex)){
	    // This is a new instance so everything must be created
	    var arrayIndex = -1;

	    // Get the unique histogram name entered in the modal
	    var thisHistogramName = dataStore.uniqueHistogramName;

	    // Close the modal
	    $('#histogramModal').modal('hide');
	    
	    // Reset the name in the modal text box ready for next time
	    document.getElementById('histogramModalInput').value = '';
	}else{
	    // The values for this instance are already stored in the dataStore
	    // A unique name is required for this instance.
	    var thisHistogramName = dataStore.histogramDefinition.contents[arrayIndex].name;
	}
	
	// Create the new html block
        var wrap = document.createElement('div');
	var histogramIndex = dataStore.histogramDefinition.histogramIndex;
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'histogramCondition' + histogramIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['histogramBlock'], 
            {  
                "histogramNumber": histogramIndex,
                "sortCodeVariables": dataStore.sortCodeVariables
            }
        );
        document.getElementById('histograms-wrap').appendChild(wrap);
	
	// Populate the Histogram with the entry in dataStore.histogramDefinition.contents[arrayIndex] if an arrayIndex was provided
	if(arrayIndex>=0){
	    document.getElementById('histogramName'+histogramIndex).value = thisHistogramName;
	    document.getElementById('histogramPath'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].path;
	    if(dataStore.histogramDefinition.contents[arrayIndex].Ybins>0){
		document.getElementById('2dimension'+histogramIndex).checked = true;
	    }else{
		document.getElementById('1dimension'+histogramIndex).checked = true;
		toggleHistogramDimensions(histogramIndex, 1)
	    }
	    document.getElementById('Xvariable'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Xvariable;
	    document.getElementById('Xmin'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Xmin;
	    document.getElementById('Xmax'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Xmax;
	    document.getElementById('Xbins'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Xbins;
	    document.getElementById('Yvariable'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Yvariable;
	    document.getElementById('Ymin'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Ymin;
	    document.getElementById('Ymax'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Ymax;
	    document.getElementById('Ybins'+histogramIndex).value = dataStore.histogramDefinition.contents[arrayIndex].Ybins;
	}else{
	    document.getElementById('histogramName'+histogramIndex).value = thisHistogramName;
	}
	
	// Default to 1D for new definitions
	if(arrayIndex<0){
	    toggleHistogramDimensions(histogramIndex, 1)
	}
	
	// Add the first row for the first condition
        dataStore.histogramDefinition.nRows[histogramIndex] = 0;
//	addNewHistogramConditionRow(histogramIndex,arrayIndex);

	// Populate the Histogram with the entry in dataStore.histogramDefinition.contents[arrayIndex] if an arrayIndex was provided
	if(arrayIndex>=0){
	    for(var i=0; i<dataStore.histogramDefinition.contents[arrayIndex].histogramCondition.length; i++){
	//	if(i>0){
		    // Create the additonal condition row for this dataStore entry
		    addNewHistogramConditionRow(histogramIndex,arrayIndex);
	//	}
		document.getElementById('histogramCondition'+histogramIndex+'-'+i).value = dataStore.histogramDefinition.contents[arrayIndex].histogramCondition[i].Gate;
	    }
	}
	
	// Increase the Histogram counter
        dataStore.histogramDefinition.histogramIndex++;

	// If this is a new instance, save it also to the server
	if(arrayIndex<0){
	    saveHistogramChangeToAnalyzerODB(histogramIndex);
	}
    }

function deleteHistogramBlock(histogramNumber){
    // First use this histogramNumber to get the name of this histogram from the html element id="histogramName{{histogramNumber}}"
    // Search the dataStore.histogramDefinition.contents[] array for the one matching that name.
    // Then you have the correct index number which might be different from histogramNumber if some elements have been deleted.
    // Need to find the correct array index of this html element
    var thisName = document.getElementById('histogramName'+histogramNumber).value;
    i = dataStore.histogramDefinition.contents.length-1;
    while(dataStore.histogramDefinition.contents[i].name != thisName){
	i--;
	if(i<0){ break; }
    }
    let histogramNumberIndex = i;
    
    // delete the Histogram condition from the server version
    var url = dataStore.spectrumServer + '/?cmd=removeHistogram';
    url += '&histoname='+dataStore.histogramDefinition.contents[histogramNumberIndex].name;
    
    console.log('Remove Histogram, URL for analyzer server: '+url);

    // Send the request
        XHR(url, 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
           );

        // delete the indexed Histogram block
        deleteNode('histogramCondition' + histogramNumber);
	
	// delete the indexed Histogram contents from the dataStore
	dataStore.histogramDefinition.contents.splice(histogramNumberIndex,1);
	
	// decrease the Histogram counters
	dataStore.histogramDefinition.nRows.splice(histogramNumberIndex,1);
        dataStore.histogramDefinition.histogramIndex--;
    }

function addNewGateConditionRow(gateIndex,arrayIndex){
    // The arrayIndex argument is only passed by the initial setup functions to populate the Gate with the values from the dataStore 
	if(isNaN(arrayIndex)){
	    var arrayIndex = -1;
	}
    var gateConditionIndex = dataStore.gateCondition.nRows[gateIndex];
    
    // If this is the first condition row, create the space in the datastore for it
    if (gateConditionIndex == 0 && arrayIndex<0) {
	// This is the first condition row for this gateIndex and the space in the dataStore must be created for it
	var newContents = {
	    "name" : document.getElementById('gateName'+gateIndex).value,
	    "gateCondition" : []
	};
	dataStore.gateCondition.contents[gateIndex] = newContents;
    }

    // Ensure this new row has a unique indexID. This needs to be done because some rows may have been deleted.
    if(arrayIndex>=0){
	thisIndexID = gateConditionIndex;
    }else if(gateConditionIndex>0){
	thisIndexID = gateConditionIndex;
	for(var i=0; i<dataStore.gateCondition.contents[gateIndex].gateCondition.length; i++){
	    if(dataStore.gateCondition.contents[gateIndex].gateCondition[i].indexID>=thisIndexID){
		thisIndexID = dataStore.gateCondition.contents[gateIndex].gateCondition[i].indexID + 1;
	    }
	}
    }else{
	thisIndexID = 0;
    }
    
        // add a new GateCondition row to the indexed gate block
        var table = document.getElementById('gateContentConditionTable'+gateIndex),
            row = document.createElement('div');
            row.setAttribute('class', 'col-md-12 and-row');
            row.setAttribute('id', 'gateCondition' + gateIndex + thisIndexID)
            row.innerHTML = Mustache.to_html(
            dataStore.templates['gateConditionRow'], 
            {  
                "gateNumber": gateIndex,
                "gateConditionNumber": thisIndexID,
                "sortCodeVariables": dataStore.sortCodeVariables,
                "logicOptions": dataStore.logicOptions
            }
        );
        table.appendChild(row);

    // Add the space for this new condition to the dataStore
    // but only if there is not a definition there already
    if(arrayIndex<0){
	var newCondition ={
            "indexID" : thisIndexID,
	    "Variable" : 'Gate1',
	    "Logic" : 'GT',
	    "Value" : 100
	}
	// Update the dataStore with the latest values
	dataStore.gateCondition.contents[gateIndex].gateCondition[gateConditionIndex] = newCondition;
    }
    
    // Increase the Gate Condition Counter
    dataStore.gateCondition.nRows[gateIndex]++;
    }

    function deleteGateConditionRow(gateNumber, gateConditionNumber){
        // delete the indexed gateCondition row in the indexed gate block
        deleteNode('gateCondition' + gateNumber + gateConditionNumber);
	    
	// Need to find the correct array index of this html element indexID
	i = dataStore.gateCondition.contents[gateNumber].gateCondition.length - 1;
	while(dataStore.gateCondition.contents[gateNumber].gateCondition[i].indexID != gateConditionNumber){
	    i--;
	    if(i<0){ break; }
	}
	// delete the indexed Gate condition contents from the dataStore
	dataStore.gateCondition.contents[gateNumber].gateCondition.splice(i,1);
	    
	// Decrease the Gate Condition Counter
	dataStore.gateCondition.nRows[gateNumber]--;

	// Update the server
	saveGateChangeToAnalyzerODB(gateNumber);
    }


function onLogicSelectChange(gateNumber, gateConditionNumber){
    if(document.getElementById('gateConditionLogicSelect'+gateNumber+'-'+gateConditionNumber).value == 'RA'){
	// The Range option has just been selected. Change the Value input box into Min and Max input boxes
	insertRangeInputs(gateNumber,gateConditionNumber);
    }else if(dataStore.gateCondition.contents[gateNumber].gateCondition[gateConditionNumber].Logic == 'RA'){
	// The Range option was previously selected and now changed. Remove the Min and Max input boxes and insert the Value input box
	removeRangeInputs(gateNumber,gateConditionNumber);
    }else{
	// The Range option was not selected this time, or the previous time. So just save whatever change was made to the dataStore and server version
    }
    
    // Update the dataStore and server version
    saveGateChangeToAnalyzerODB(gateNumber);
}

function insertRangeInputs(gateNumber,gateConditionNumber){
    // Remove the Value input box
    document.getElementById('gateConditionValueDiv'+gateNumber+'-'+gateConditionNumber).innerHTML = '';
    
    // Insert the Min input box
    var newInput = document.createElement("input");
    newInput.type = 'number';
    newInput.id = 'gateConditionRangeMin'+gateNumber+'-'+gateConditionNumber;
    newInput.value = '0';
    newInput.min = '−32768';
    newInput.max = '32766';
    newInput.onchange = function(){
	saveGateChangeToAnalyzerODB(gateNumber);
    }.bind(newInput);
    document.getElementById('gateConditionValueDiv'+gateNumber+'-'+gateConditionNumber).appendChild(newInput);
    
    // Insert the Max input box
    var newInput = document.createElement("input");
    newInput.type = 'number';
    newInput.id = 'gateConditionRangeMax'+gateNumber+'-'+gateConditionNumber;
    newInput.value = '1000';
    newInput.min = '−32767';
    newInput.max = '32767';
    newInput.onchange = function(){
	saveGateChangeToAnalyzerODB(gateNumber);
    }.bind(newInput);
    document.getElementById('gateConditionValueDiv'+gateNumber+'-'+gateConditionNumber).appendChild(newInput);	
}

function removeRangeInputs(gateNumber,gateConditionNumber){
    // Remove the Min and Max input boxes
    document.getElementById('gateConditionValueDiv'+gateNumber+'-'+gateConditionNumber).innerHTML = '';
    
    // Insert the Value input box
    var newInput = document.createElement("input");
    newInput.type = 'number';
    newInput.id = 'gateConditionValue'+gateNumber+'-'+gateConditionNumber;
    newInput.value = '4096';
    newInput.min = '–2147483648';
    newInput.max = '2147483647';
    newInput.onchange = function(){
	saveGateChangeToAnalyzerODB(gateNumber);
    }.bind(newInput);
    document.getElementById('gateConditionValueDiv'+gateNumber+'-'+gateConditionNumber).appendChild(newInput);    
}

function addNewHistogramConditionRow(histogramIndex,arrayIndex){
        // add a new histogramCondition row to the indexed histogram block
	
    // The arrayIndex argument is only passed by the initial setup functions to populate the Gate with the values from the dataStore 
	if(isNaN(arrayIndex)){
	    var arrayIndex = -1;
	}
    
    var histogramConditionIndex = dataStore.histogramDefinition.nRows[histogramIndex];
    
    // If this is the first condition row, create the space in the datastore for it
    if (histogramConditionIndex == 0  && arrayIndex<0) {
	// This is the first condition row for this histogramIndex and the space in the dataStore must be created for it
	var newContents = {
	    "name" : document.getElementById('histogramName'+histogramIndex).value,
	    "histogramCondition" : []
	};
	dataStore.histogramDefinition.contents[histogramIndex] = newContents;
    }

    // Ensure this new row has a unique indexID. This needs to be done because some rows may have been deleted.
    if(arrayIndex>=0){
	thisIndexID = histogramConditionIndex;
    }else if(histogramConditionIndex>0){
	thisIndexID = histogramConditionIndex;
	for(var i=0; i<dataStore.histogramDefinition.contents[histogramIndex].histogramCondition.length; i++){
	    if(dataStore.histogramDefinition.contents[histogramIndex].histogramCondition[i].indexID>=thisIndexID){
		thisIndexID = dataStore.histogramDefinition.contents[histogramIndex].histogramCondition[i].indexID + 1;
	    }
	}
    }else{
	thisIndexID = 0;
    }

	var listOfGateConditions = [];
	for(var i=0; i<dataStore.gateCondition.contents.length; i++){
	    thisName = dataStore.gateCondition.contents[i].name;
	    var thisObject = {
		"name" : thisName
	    }
	    listOfGateConditions.push(thisObject);
	}

        // add a new HistogramCondition row to the indexed gate block
        var table = document.getElementById('histogramContentConditionTable'+histogramIndex),
            row = document.createElement('div');
        row.setAttribute('class', 'col-md-12 and-row');
        row.setAttribute('id', 'histogramCondition' + histogramIndex + thisIndexID)
        row.innerHTML = Mustache.to_html(
            dataStore.templates['histogramConditionRow'], 
            {  
                "histogramNumber": histogramIndex,
                "histogramConditionNumber": thisIndexID,
                "gateCondition": listOfGateConditions
            }
        );
        table.appendChild(row);
    
    // Add the space for this new condition to the dataStore
    // but only if there is not a definition there already
    if(arrayIndex<0){
	var newCondition ={
            "indexID" : thisIndexID,
	    "Variable" : 'Gate10'
	}
	// Update the dataStore with the latest values
	dataStore.histogramDefinition.contents[histogramIndex].histogramCondition[histogramConditionIndex] = newCondition;
    }
    
    // Increase the Histogram Condition Counter
    dataStore.histogramDefinition.nRows[histogramIndex]++;
}

    function deleteHistogramConditionRow(histogramNumber, histogramConditionNumber){
        // delete the indexed histogramCondition row in the indexed histogram block
        deleteNode('histogramCondition' + histogramNumber + histogramConditionNumber);
	    
	// Need to find the correct array index of this html element indexID
	i = dataStore.histogramDefinition.contents[histogramNumber].histogramCondition.length - 1;
	while(dataStore.histogramDefinition.contents[histogramNumber].histogramCondition[i].indexID != histogramConditionNumber){
	    i--;
	    if(i<0){ break; }
	}
	// delete the indexed Histogram condition contents from the dataStore
	dataStore.histogramDefinition.contents[histogramNumber].histogramCondition.splice(i,1);
	    
	// Decrease the Histogram Condition Counter
	dataStore.histogramDefinition.nRows[histogramNumber]--;

	// Update the server
	saveHistogramChangeToAnalyzerODB(histogramNumber);
    }

function toggleHistogramDimensions(histogramNumber, dimension){

    // If dimension is changing to 1D, hide the y axis contents
    if(dimension==1){
	document.getElementById('YvariableRow'+histogramNumber).style.display = 'none';
	document.getElementById('YinputRow'+histogramNumber).style.display = 'none';
    }else{
	// If dimension is changing to 2D, reveal the y axis contents
	document.getElementById('YvariableRow'+histogramNumber).style.display = 'block';
	document.getElementById('YinputRow'+histogramNumber).style.display = 'block';
    }
    
}

    /////////////////////
    // data loading
    /////////////////////

    function requestNewConfigName(){
        //when something changes in any of the definitions, remind the user to change the name of the Config file

        var nameField = document.getElementById('configName'),
            currentName = nameField.value;

        if(dataStore.Configs.hasOwnProperty(currentName))
            nameField.value = 'my-new-config';
    }

function enterUniqueGlobalName(){
    BadName=0;
    var thisName = document.getElementById('globalModalInput').value;
    if(thisName.length<1){
	BadName=1;
    }

    // Check that this name does not match any existing global condition names
    for(var i=0; i<dataStore.globalCondition.contents.length; i++){
	if(dataStore.globalCondition.contents[i].name == thisName){
	    // this name is not unique
	    BadName=1;
	}
    }

    if(BadName){
	// This name already exists or is too short
	document.getElementById('globalModalButton').disabled = true;
    }else{
	// This name is unique
	dataStore.uniqueGlobalName = thisName;
	document.getElementById('globalModalButton').disabled = false;
    }
    
}

function enterUniqueGateName(){
    BadName=0;
    var thisName = document.getElementById('gateModalInput').value;
    if(thisName.length<1){
	BadName=1;
    }

    // Check that this name does not match any existing gate condition names
    for(var i=0; i<dataStore.gateCondition.contents.length; i++){
	if(dataStore.gateCondition.contents[i].name == thisName){
	    // this name is not unique
	    BadName=1;
	}
    }

    if(BadName){
	// This name already exists or is too short
	document.getElementById('gateModalButton').disabled = true;
    }else{
	// This name is unique
	dataStore.uniqueGateName = thisName;
	document.getElementById('gateModalButton').disabled = false;
    }
    
}

function enterUniqueHistogramName(){
    BadName=0;
    var thisName = document.getElementById('histogramModalInput').value;
    if(thisName.length<1){
	BadName=1;
    }

    // Check that this name does not match any existing histogram definition names
    for(var i=0; i<dataStore.histogramDefinition.contents.length; i++){
	if(dataStore.histogramDefinition.contents[i].name == thisName){
	    // this name is not unique
	    BadName=1;
	}
    }

    if(BadName){
	// This name already exists or is too short
	document.getElementById('histogramModalButton').disabled = true;
    }else{
	// This name is unique
	dataStore.uniqueHistogramName = thisName;
	document.getElementById('histogramModalButton').disabled = false;
    }
    
}

function saveGlobalChangeToAnalyzerODB(globalNumber){
    //when something changes in any of the definitions, save the change to the dataStore and send it to the analyzer ODB
	var newContents = {
	    "name" : document.getElementById('globalName'+globalNumber).value,
	    "min" : document.getElementById('globalMin'+globalNumber).value,
	    "max" : document.getElementById('globalMax'+globalNumber).value
	};

    // Check for special characters that are not allowed
    var specials = ['&','=','{','}','?','!'];
    for(var i=0; i<specials.length; i++){
	if(newContents.name.includes(specials[i])){
	    // We have a problem character
	    console.log('Bad character found in '+newContents.name);
	    newContents.name = newContents.name.replace(specials[i], '-');
	    console.log('Changed to '+newContents.name);
	    document.getElementById('globalName'+globalNumber).value = newContents.name;
	    
	    document.getElementById('alertModalButton').click();
	}
    }
    
    // save the change to the dataStore
	dataStore.globalCondition.contents[globalNumber] = newContents;

    
    // Submit this change to the analyzer server via a JSET URL command

    // The following is for the analyzer server
    // cmd=addGlobal&globalname=XXXX&min=XXX&max=XXX
    var url = dataStore.spectrumServer + '/?cmd=addGlobal';
    url += '&globalname='+dataStore.globalCondition.contents[globalNumber].name;
    url += '&globalmin='+dataStore.globalCondition.contents[globalNumber].min;
    url += '&globalmax='+dataStore.globalCondition.contents[globalNumber].max;
    
    console.log('Save Global, URL for analyzer server: '+url);

    // Send the request
        XHR(url, 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
           );
    
}

function saveGateChangeToAnalyzerODB(gateNumber){
    //when something changes in any of the definitions, save the change to the dataStore and send it to the analyzer ODB
	var newContents = {
	    "name" : document.getElementById('gateName'+gateNumber).value,
	    "gateCondition" : []
	};
    
    // Check for special characters that are not allowed
    var specials = ['&','=','{','}','?','!'];
    for(var i=0; i<specials.length; i++){
	if(newContents.name.includes(specials[i])){
	    // We have a problem character
	    console.log('Bad character found in '+newContents.name);
	    newContents.name = newContents.name.replace(specials[i], '-');
	    console.log('Changed to '+newContents.name);
	    document.getElementById('gateName'+gateNumber).value = newContents.name;
	    
	    document.getElementById('alertModalButton').click();
	}
    }

    // Some elements could have been deleted from the list so the index numbers of the Id input elements might not be continuous.
    // So we need to only get the values from html objects with the indexes which exist
    for(var i=0; i<dataStore.gateCondition.contents[gateNumber].gateCondition.length; i++){
	var indexID = dataStore.gateCondition.contents[gateNumber].gateCondition[i].indexID;

	// The Range Logic type has two inputs for Max and Min values. They are packed together into a single 32-bit word as two 16-bit values.
	if(document.getElementById('gateConditionLogicSelect'+gateNumber+'-'+indexID).value == 'RA'){
	    var thisMin = parseInt(document.getElementById('gateConditionRangeMin'+gateNumber+'-'+indexID).value);
	    var thisMax = parseInt(document.getElementById('gateConditionRangeMax'+gateNumber+'-'+indexID).value);
	    var thisValue = (thisMin | (thisMax<<16));
	}else{
	    var thisValue = document.getElementById('gateConditionValue'+gateNumber+'-'+indexID).value;
	}

	// Create space for the condition
	var newCondition ={
                       "indexID" : indexID,
	               "Variable" : document.getElementById('gateConditionVariableSelect'+gateNumber+'-'+indexID).value,
	               "Logic" : document.getElementById('gateConditionLogicSelect'+gateNumber+'-'+indexID).value,
	               "Value" : thisValue
	}
	newContents.gateCondition.push(newCondition); // This is just a local variable
    }
    // Update the dataStore with the latest values
	dataStore.gateCondition.contents[gateNumber] = newContents;

    // Submit this change to the analyzer server via a JSET URL command

    // The following is for the analyzer server
    // cmd=addGate&gatename=XXXX&varname=XXX&op=XXX&value=XXX
    var url = dataStore.spectrumServer + '/?cmd=addGate';
    url += '&gatename='+dataStore.gateCondition.contents[gateNumber].name;
    for(var i=0; i<dataStore.gateCondition.contents[gateNumber].gateCondition.length; i++){
	url += '&varname'+i+'='+dataStore.gateCondition.contents[gateNumber].gateCondition[i].Variable;
	url += '&op'+i+'='+dataStore.gateCondition.contents[gateNumber].gateCondition[i].Logic;
	url += '&value'+i+'='+dataStore.gateCondition.contents[gateNumber].gateCondition[i].Value;
    }
    
    console.log('Save Gate, URL for analyzer server: '+url);

    // Send the request
        XHR(url, 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
           );
}

function saveHistogramChangeToAnalyzerODB(histogramNumber){
    //when something changes in any of the definitions, save the change to the dataStore and send it to the analyzer ODB
	var newContents = {
	    "name" : document.getElementById('histogramName'+histogramNumber).value,
	    "path" : document.getElementById('histogramPath'+histogramNumber).value,
	    "type" : document.querySelector('input[name=dimensionType'+histogramNumber+']:checked').value,
	    "Xvariable" : document.getElementById('Xvariable'+histogramNumber).value,
	    "Xmin" : document.getElementById('Xmin'+histogramNumber).value,
	    "Xmax" : document.getElementById('Xmax'+histogramNumber).value,
	    "Xbins" : document.getElementById('Xbins'+histogramNumber).value,
	    "Yvariable" : document.getElementById('Yvariable'+histogramNumber).value,
	    "Ymin" : document.getElementById('Ymin'+histogramNumber).value,
	    "Ymax" : document.getElementById('Ymax'+histogramNumber).value,
	    "Ybins" : document.getElementById('Ybins'+histogramNumber).value,
	    "histogramCondition" : []
	};
    
    // Check for special characters that are not allowed
    var specials = ['&','=','{','}','?','!'];
    for(var i=0; i<specials.length; i++){
	if(newContents.name.includes(specials[i])){
	    // We have a problem character
	    console.log('Bad character found in '+newContents.name);
	    newContents.name = newContents.name.replace(specials[i], '-');
	    console.log('Changed to '+newContents.name);
	    document.getElementById('histogramName'+histogramNumber).value = newContents.name;
	    
	    document.getElementById('alertModalButton').click();
	}
	if(newContents.path.includes(specials[i])){
	    // We have a problem character
	    console.log('Bad character found in '+newContents.path);
	    newContents.path = newContents.path.replace(specials[i], '-');
	    console.log('Changed to '+newContents.path);
	    document.getElementById('histogramPath'+histogramNumber).value = newContents.path;
	    
	    document.getElementById('alertModalButton').click();
	}
    }

    // Some elements could have been deleted from the list so the index numbers of the Id input elements might not be continuous.
    // So we need to only get the values from the indexes which exist
    try{
	for(var i=0; i<dataStore.histogramDefinition.contents[histogramNumber].histogramCondition.length; i++){
	    var indexID = dataStore.histogramDefinition.contents[histogramNumber].histogramCondition[i].indexID;
	    var newCondition ={
                "indexID" : indexID,
	        "Gate" : document.getElementById('histogramCondition'+histogramNumber+'-'+indexID).value
	    }
	    newContents.histogramCondition.push(newCondition); // This is just a local variable
	}
    }
    catch(err){ }
    // Update the dataStore with the latest values
	dataStore.histogramDefinition.contents[histogramNumber] = newContents;
    
//    console.log(dataStore.histogramDefinition);
    // Submit this change to the analyzer server via a JSET URL command
    
    // The following is for the analyzer server
    // cmd=addHistogram&name=XXXX&title=XXX&path=XXXX&op=XXX&xbins=XXX&xvarname=XXX[optional... &ybins=XXX&yvarname=XXXX]&gate1=XXX&gate2=XXX....
    var url = dataStore.spectrumServer + '/?cmd=addHistogram';
    url += '&name='+dataStore.histogramDefinition.contents[histogramNumber].name;
    url += '&title='+dataStore.histogramDefinition.contents[histogramNumber].name;
    url += '&path='+dataStore.histogramDefinition.contents[histogramNumber].path;
    url += '&xvarname='+dataStore.histogramDefinition.contents[histogramNumber].Xvariable;
    url += '&xbins='+dataStore.histogramDefinition.contents[histogramNumber].Xbins;
    url += '&xmin='+dataStore.histogramDefinition.contents[histogramNumber].Xmin;
    url += '&xmax='+dataStore.histogramDefinition.contents[histogramNumber].Xmax;
    if(dataStore.histogramDefinition.contents[histogramNumber].type==2){
	url += '&yvarname='+dataStore.histogramDefinition.contents[histogramNumber].Yvariable;
	url += '&ybins='+dataStore.histogramDefinition.contents[histogramNumber].Ybins;
	url += '&ymin='+dataStore.histogramDefinition.contents[histogramNumber].Ymin;
	url += '&ymax='+dataStore.histogramDefinition.contents[histogramNumber].Ymax;
    }
    for(var i=0; i<dataStore.histogramDefinition.contents[histogramNumber].histogramCondition.length; i++){
	url += '&gate'+i+'='+dataStore.histogramDefinition.contents[histogramNumber].histogramCondition[i].Gate;
    }
    
    console.log('Save Histogram, URL for analyzer server: '+url);

    // Send the request
        XHR(url, 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
           );
    
}
