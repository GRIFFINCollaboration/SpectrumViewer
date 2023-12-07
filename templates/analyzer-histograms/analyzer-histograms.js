////////////////////////////
// Analyzer Interface Gates and Histogram setup
////////////////////////////


    ////////////////
    // setup
    ////////////////

    function processHistograms(payload){
        // callback after getting the Config file containing the Global conditions, Gates conditions and Histogram definitions from the server/ODB
        // finish initial setup

	// Place the response from the server into the dataStore
        dataStore.Configs = payload;
	
        // populate the current configuration - this should be received from the server
        loadConfig(dataStore.Configs.Current);
        buildConfigMenu();
    }

    //////////////////////////
    // DOM manipulations
    //////////////////////////

    function addNewGlobal(){
        // add a new Global Condition block

	// Create the new html block
        var wrap = document.createElement('div');
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'globalCondition' + dataStore.globalCondition.globalIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['globalBlock'], 
            {  
                "globalNumber": dataStore.globalCondition.globalIndex
            }
        );
        document.getElementById('globals-wrap').appendChild(wrap);

	// Create the new condition in the dataStore and fill with generic initial values
	var newContents = {
	    "name" : 'new-global-condition',
	    "min" : -100,
	    "max" : 100
	};
	dataStore.globalCondition.contents[dataStore.globalCondition.globalIndex] = newContents;

	// Increase the Global counters
        dataStore.globalCondition.nRows[dataStore.globalCondition.globalIndex] = 0;
        dataStore.globalCondition.globalIndex++;
    }

    function deleteGlobalBlock(globalNumber){
	console.log('deleteGlobalNode '+globalNumber);
	console.log(dataStore.globalCondition);
        // delete the indexed Global block
        deleteNode('globalCondition' + globalNumber);
	
	// delete the indexed Global contents from the dataStore
	dataStore.globalCondition.contents.splice(globalNumber,1);
	
	// decrease the Global counters
	dataStore.globalCondition.nRows.splice(globalNumber,1);
        dataStore.globalCondition.globalIndex--;
	console.log(dataStore.globalCondition);
    }

    function addNewGate(){
        // add a new Gate Condition block

	// Create the new html block
        var wrap = document.createElement('div');
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'gateCondition' + dataStore.gateCondition.gateIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['gateBlock'], 
            {  
                "gateNumber": dataStore.gateCondition.gateIndex,
                "sortCodeVariables": dataStore.sortCodeVariables,
                "logicOptions": dataStore.logicOptions
            }
        );
        document.getElementById('gates-wrap').appendChild(wrap);
	
	// Add the first row for the first condition
        dataStore.gateCondition.nRows[dataStore.gateCondition.gateIndex] = 0;
	addNewGateConditionRow(dataStore.gateCondition.gateIndex);
	
	// Increase the Gate counter
        dataStore.gateCondition.gateIndex++;
    }

    function deleteGateBlock(gateNumber){
	console.log('deleteGateNode '+gateNumber);
	console.log(dataStore.gateCondition);
        // delete the indexed Gate block
        deleteNode('gateCondition' + gateNumber);
	
	// delete the indexed Gate contents from the dataStore
	dataStore.gateCondition.contents.splice(gateNumber,1);
	
	// decrease the Gate counters
	dataStore.gateCondition.nRows.splice(gateNumber,1);
        dataStore.gateCondition.gateIndex--;
	console.log(dataStore.gateCondition);
    }

    function addNewHistogram(){
        // add a new Histogram Condition block

	// Create the new html block
        var wrap = document.createElement('div');
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'histogramCondition' + dataStore.histogramDefinition.histogramIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['histogramBlock'], 
            {  
                "histogramNumber": dataStore.histogramDefinition.histogramIndex
            }
        );
        document.getElementById('histograms-wrap').appendChild(wrap);
	
	// Add the first row for the first condition
        dataStore.histogramDefinition.nRows[dataStore.histogramDefinition.histogramIndex] = 0;
	addNewHistogramCondition(dataStore.histogramDefinition.histogramIndex);
	
	// Increase the Histogram counter
        dataStore.histogramDefinition.histogramIndex++;
    }

    function duplicateHistogramBlock(histogramNumber){
        // add a new Histogram Definition block and populate it with the contents of the existing one
	var existingHistogramNumber = histogramNumber;
	
	// Create the new html block
        var wrap = document.createElement('div');
        wrap.setAttribute('class', 'condition-block');
        wrap.setAttribute('id', 'histogramDefinition' + dataStore.histogramDefinition.histogramIndex);
        wrap.innerHTML = Mustache.to_html(
            dataStore.templates['histogramBlock'], 
            {  
                "histogramNumber": dataStore.histogramDefinition.histogramIndex
            }
        );
        document.getElementById('histograms-wrap').appendChild(wrap);

	// Use the var existingHistogramNumber to now populate the contents with the values from the existing definition
	//
	//
	//
	//
	
	// Increase the Histogram counters
        dataStore.histogramDefinition.nRows[dataStore.histogramDefinition.histogramIndex] = 0;
        dataStore.histogramDefinition.histogramIndex++;
    }

    function deleteHistogramBlock(histogramNumber){
	console.log('deleteHistogramNode '+histogramNumber);
	console.log(dataStore.histogramDefinition);
        // delete the indexed Histogram block
        deleteNode('histogramDefinition' + histogramNumber);
	
	// delete the indexed Histogram contents from the dataStore
	dataStore.histogramDefinition.contents.splice(histogramNumber,1);
	
	// decrease the Histogram counters
	dataStore.histogramDefinition.nRows.splice(histogramNumber,1);
        dataStore.histogramDefinition.histogramIndex--;
	console.log(dataStore.histogramDefinition);
    }

function addNewGateConditionRow(gateIndex){
    
    var gateConditionIndex = dataStore.gateCondition.nRows[gateIndex];
    
    // If this is the first condition row, create the space in the datastore for it
    if (gateConditionIndex == 0 ) {
	// This is the first condition row for this gateIndex and the space in the dataStore must be created for it
	var newContents = {
	    "name" : document.getElementById('gateName'+gateIndex).value,
	    "gateCondition" : []
	};
	dataStore.gateCondition.contents[gateIndex] = newContents;
    }

    // Ensure this new row has a unique indexID. This needs to be done because some rows may have been deleted.
    if(gateConditionIndex>0){
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
	var newCondition ={
                       "indexID" : thisIndexID,
	               "Variable" : 'Gate1',
	               "Logic" : 'GT',
	               "Value" : 100
	}
    // Update the dataStore with the latest values
	dataStore.gateCondition.contents[gateIndex].gateCondition[gateConditionIndex] = newCondition;
	
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
    }

    function addNewHistogramCondition(histogramIndex){
        // add a new histogramCondition row to the indexed histogram block
    
    var histogramConditionIndex = dataStore.histogramDefinition.nRows[histogramIndex];
    
    // If this is the first condition row, create the space in the datastore for it
    if (histogramConditionIndex == 0 ) {
	// This is the first condition row for this histogramIndex and the space in the dataStore must be created for it
	var newContents = {
	    "name" : document.getElementById('histogramName'+histogramIndex).value,
	    "histogramCondition" : []
	};
	dataStore.histogramDefinition.contents[histogramIndex] = newContents;
    }

    // Ensure this new row has a unique indexID. This needs to be done because some rows may have been deleted.
    if(histogramConditionIndex>0){
	thisIndexID = histogramConditionIndex;
	for(var i=0; i<dataStore.histogramDefinition.contents[histogramIndex].histogramCondition.length; i++){
	    if(dataStore.histogramDefinition.contents[histogramIndex].histogramCondition[i].indexID>=thisIndexID){
		thisIndexID = dataStore.histogramDefinition.contents[histogramIndex].histogramCondition[i].indexID + 1;
	    }
	}
    }else{
	thisIndexID = 0;
    }

	//var listOfGateConditions = ["Gate1","Gate2","Gate3","Gate4"];
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
	var newCondition ={
                       "indexID" : thisIndexID,
	               "Variable" : 'Gate10'
	}
	// Update the dataStore with the latest values
	dataStore.histogramDefinition.contents[histogramIndex].histogramCondition[histogramConditionIndex] = newCondition;
	
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
    }

    function addNewAND(orIndex){
        // add a new AND row to the indexed OR block

        var table = document.getElementById('filterContent'+orIndex),
            row = document.createElement('div');
        row.setAttribute('class', 'col-md-12 and-row');
        row.setAttribute('id', 'ANDrow' + orIndex + dataStore.filter.nRows[orIndex])
        row.innerHTML = Mustache.to_html(
            dataStore.templates['andRow'], 
            {  
                "orNumber": orIndex,
                "andNumber": dataStore.filter.nRows[orIndex],
                "detType": dataStore.detectorTypes[dataStore.hostname]
            }
        );
        table.appendChild(row);

        dataStore.filter.nRows[orIndex]++;
    }

    function deleteAND(orNumber, andNumber){
        // delete the indexed AND row in the indexed OR block

        deleteNode('ANDrow' + orNumber + andNumber);
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

function saveGlobalChangeToAnalyzerODB(globalNumber){
    //when something changes in any of the definitions, save the change to the dataStore and send it to the analyzer ODB
	var newContents = {
	    "name" : document.getElementById('globalName'+globalNumber).value,
	    "min" : document.getElementById('globalMin'+globalNumber).value,
	    "max" : document.getElementById('globalMax'+globalNumber).value
	};
	dataStore.globalCondition.contents[globalNumber] = newContents;

    console.log('saveGlobalChangeToAnalyzerODB '+globalNumber);
    console.log(dataStore.globalCondition);
    // Submit this change to the analyzer server via a JSET URL command
    
}

function saveGateChangeToAnalyzerODB(gateNumber){
    //when something changes in any of the definitions, save the change to the dataStore and send it to the analyzer ODB
	var newContents = {
	    "name" : document.getElementById('gateName'+gateNumber).value,
	    "gateCondition" : []
	};

    // Some elements could have been deleted from the list so the index numbers of the Id input elements might not be continuous.
    // So we need to only get the values from the indexes which exist
    for(var i=0; i<dataStore.gateCondition.contents[gateNumber].gateCondition.length; i++){
	var indexID = dataStore.gateCondition.contents[gateNumber].gateCondition[i].indexID;
	var newCondition ={
                       "indexID" : indexID,
	               "Variable" : document.getElementById('gateConditionVariableSelect'+gateNumber+'-'+indexID).value,
	               "Logic" : document.getElementById('gateConditionLogicSelect'+gateNumber+'-'+indexID).value,
	               "Value" : document.getElementById('gateConditionValue'+gateNumber+'-'+indexID).value
	}
	newContents.gateCondition.push(newCondition); // This is just a local variable
    }
    // Update the dataStore with the latest values
	dataStore.gateCondition.contents[gateNumber] = newContents;

    // Submit this change to the analyzer server via a JSET URL command
    
}

function saveHistogramChangeToAnalyzerODB(histogramNumber){
    //when something changes in any of the definitions, save the change to the dataStore and send it to the analyzer ODB
	var newContents = {
	    "name" : document.getElementById('histogramName'+histogramNumber).value,
	    "histogramCondition" : []
	};

    // Some elements could have been deleted from the list so the index numbers of the Id input elements might not be continuous.
    // So we need to only get the values from the indexes which exist
    for(var i=0; i<dataStore.histogramDefinition.contents[histogramNumber].histogramCondition.length; i++){
	var indexID = dataStore.histogramDefinition.contents[histogramNumber].histogramCondition[i].indexID;
	var newCondition ={
                       "indexID" : indexID,
	               "Variable" : document.getElementById('histogramCondition'+histogramNumber+'-'+indexID).value
	}
	newContents.histogramCondition.push(newCondition); // This is just a local variable
    }
    // Update the dataStore with the latest values
	dataStore.histogramDefinition.contents[histogramNumber] = newContents;

//    console.log(dataStore.histogramDefinition);
    // Submit this change to the analyzer server via a JSET URL command
    
}
