// Functions common to the gainMatcher and efficiencyFitter tools

function GetURLArguments(){
	//return an object with keys/values as per query string
	//note all values will be strings.

	var elts = {};
	var queryString = window.location.search.substring(1)
	var value, i;
        var urlData = [];


	queryString = queryString.split('&');
	for(i=0; i<queryString.length; i++){
		value = queryString[i].split('=');
		urlData[value[0]] = value[1];
	}

    // Save the information to the dataStore
    // Save the hostname and port number for getting spectrum data and writing to the config file
    dataStore.spectrumServer = 'http://'+urlData.analyzerBackend+'.triumf.ca:'+urlData.analyzerPort;
    
    // Save the information to the dataStore
    // Save the hostname and port number for writing the ODB parameters
    dataStore.ODBhost = 'http://'+urlData.ODBHostBackend+'.triumf.ca:'+urlData.ODBHostPort;
    
}

function processHistoFileList(payload){
    console.log(payload);

    // receive the payload and split into an array of strings
    var thisPayload = payload.split(" ]")[0].split("[ \n")[1];
    
    // tidy up the strings to extract the list of midas files
    dataStore.histoFileList = thisPayload.split(" , \n ");

    // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first (note this is not ideal for sub-runs)
    dataStore.histoFileList.sort();
    dataStore.histoFileList.reverse();

    // Set up the list of histo files
    setupHistoListSelect();

    console.log(dataStore.histoFileList);

}

function loadData(DAQ){
    // given the list of channels plugged into the DAQ from the ODB, load the appropriate spectra.

    var i,	
        channels = DAQ[0].chan;
    
    dataStore.PSCchannels = DAQ[0].chan;
    dataStore.PSCaddresses = DAQ[1].PSC;
    dataStore.RunNumber = DAQ[2][ 'Run number' ];

    //Add the detector type and run number to the name of the Cal file
    if(dataStore.THESEdetectors[0].slice(0,3) == 'GRG'){
	document.getElementById('saveCalname').value = 'GRIFFIN-Cal-File-Run'+dataStore.RunNumber+'.cal';
    }else if(dataStore.THESEdetectors[0].slice(0,3) == 'PAC'){
	document.getElementById('saveCalname').value = 'PACES-Cal-File-Run'+dataStore.RunNumber+'.cal';
    }

    // Trigger the saving of this new filename
    document.getElementById('saveCalname').onchange();

    // Plug in the active spectra names    
    for(i=0; i<channels.length; i++){
        if(channels[i].slice(0,3) == dataStore.THESEdetectors[0].slice(0,3))
            dataStore._plotControl.activeSpectra.push(channels[i] + '_Pulse_Height');
    }

    dataStore._plotControl.refreshAll();
}

function shiftclick(clickCoords){
    // callback for shift-click on plot - draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    var buffer;

    // Use each shiftclick to define a small search region around a specific peak
    
    if(dataStore.searchRegionP1.length == 0){
        dataStore.searchRegionP1[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP1[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP1[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP1[0], dataStore.searchRegionP1[2], dataStore.searchRegionP1[1], dataStore.searchRegionP1[2], '#00FFFF');
        this.plotData();
    } else if (dataStore.searchRegionP2.length == 0){
        dataStore.searchRegionP2[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP2[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP2[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP2[0], dataStore.searchRegionP2[2], dataStore.searchRegionP2[1], dataStore.searchRegionP2[2], '#00FFFF');
        this.plotData();
    } else if (dataStore.searchRegionP3.length == 0){
        dataStore.searchRegionP3[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP3[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP3[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP3[0], dataStore.searchRegionP3[2], dataStore.searchRegionP3[1], dataStore.searchRegionP3[2], '#00FFFF');
        this.plotData();
    } else{
        dataStore.searchRegionP4[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP4[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP4[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP4[0], dataStore.searchRegionP4[2], dataStore.searchRegionP4[1], dataStore.searchRegionP4[2], '#00FFFF');
        this.plotData();

        //user guidance
        deleteNode('regionMessage');
        document.getElementById('pickerMessage').classList.remove('hidden');

	//only release the fitAll button once we have a search region defined
        document.getElementById('fitAll').classList.remove('disabled');
    }


// Need to check the ordering of the energy regions and reorder if necessary.

    
}
