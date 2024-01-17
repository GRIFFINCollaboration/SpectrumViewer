////////////////////////////////////////////
// main setup
////////////////////////////////////////////

// a Global variable to pass around the information taken from the URL arguments
var urlData = [];

function setupDataStore(){
    console.log('Execute setupDataStore...');
    
    // Create the dataStore object
  dataStore = {
        "pageTitle": 'Spectrum Viewer',                                           //header title
        "topGroups": [],                                                          //groups in top nav row
        "waveformSnap": true,                                                     //do we want the snap to waveform functionality?
        "doUpdates": false,                                                       //do we want the data update button and loop?
        "scaling": false,                                                         //do we want to expose x-axis rescaling UI?
        "plots": [],                                                              //array of names for default plot cells
        "spectrumServer": '',                                                     //analyzer url + port number
        "ODBrequests": [],                                                        //array of odb requests to make on refresh
      "zeroedPlots": {},                                                          //initialize empty object for zeroed plots

      "histoFileDirectoryPath" : '',                                                      // histogram directory taken from URL. Then can be changed from a select
      "histoFileName" : ''                                                        // histogram filename taken from URL. Then can be changed from a select
  }
    
    // Unpack the URL data, then get the initial list of Histogram files available from the server
    GetURLArguments(getHistoFileListFromServer);

    // Set the initial cell index value
    dataStore.cellIndex = dataStore.plots.length;
    
}

// Set up the data store
setupDataStore();

/////////////////
// helpers
/////////////////

function fetchCallback(){
    //fires after all data has been updated

    var i, 
        keys = Object.keys(dataStore.viewers);

    for(i=0; i<keys.length; i++){
        dataStore.viewers[keys[i]].plotData(null, true);
    }
}

function GetURLArguments(callback){
	//return an object with keys/values as per query string
	//note all values will be strings.

	var elts = {};
	var queryString = window.location.search.substring(1)
	var value, i;

	queryString = queryString.split('&');
	for(i=0; i<queryString.length; i++){
		value = queryString[i].split('=');
		urlData[value[0]] = value[1];
	}

    // Save the information to the dataStore
    // Save the hostname and port number
    dataStore.spectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
    
    // Copy the histogram URL arguments to the dataStore
    dataStore.histoFileDirectoryPath = urlData.histoDir;
    dataStore.histoFileName = urlData.histoFile;
    
    if(dataStore.histoFileDirectoryPath==undefined){
	// No directory for the histogram files has been provided in the URL, so we provide a default one
	dataStore.histoFileDirectoryPath = '/tig/grifstore0b/griffin/schedule140/Histograms';
    }
    if(dataStore.histoFileName==undefined){
	// No histogram filename has been provided in the URL, so we set the string back to nothing
	dataStore.histoFileName = '';
    }

    callback();
}

function ErrorConnectingToAnalyzerServer(error){
    var string = 'Problem connecting to analyzer server: '+thisSpectrumServer+'<br>'+error;
    document.getElementById('histo-list-menu-div').innerHTML = string;
    document.getElementById('histo-list-menu-div').style.display= 'block';
    document.getElementById('histo-list-menu-div').style.width= '100%';
    document.getElementById('histo-list-menu-div').style.backgroundColor= 'red';
}

function processSpectrumList(payload){

    console.log(payload);
    var SpectrumList = JSON.parse(payload);
    
    //declare the holder for the top level groups
    var topGroups = [];

    // Sort through the list from the server to find the folders, subfolders and histogram titles
    // Use this to set up the topGroups, subGroups and items for the menu generation
    for (i in SpectrumList) 
    { 
	thisFolderTitle = i; // this is the topGroup

	// Create a new topGroup for this folder
	newGroup = {
                     "name": thisFolderTitle,
                     "id": thisFolderTitle,
                     "color": '#367FA9',
                     "subGroups": []
	           }
	
	for (j in SpectrumList[i]) 
	{
	    for (k in SpectrumList[i][j]) 
	    {
		y = SpectrumList[i][j][k]
		if (typeof y === 'string' || y instanceof String){
		    if(k==0){
			thisSubfolderTitle = y;   // this is the subGroup

			// Create a new subGroup
			newSubgroup = {
                                       "subname": thisSubfolderTitle,
                                       "id": thisFolderTitle.substring(0,3)+thisSubfolderTitle,
                                       "items": []
                                      }
			// Add this subGroup to the topGroup
                        newGroup.subGroups.push(newSubgroup);
		    }else{
			thisHistoTitle = y;   // this is the items

			// Add this histogram to the items list in this subGroup of the topGroup
                        newGroup.subGroups[newGroup.subGroups.length-1].items.push(thisHistoTitle);			
		    }
		}
	    }
	}
	// Add this new topGroup to the topGroups object
	topGroups.push(newGroup)
    }

    dataStore.topGroups = topGroups;

    // Now need to build the menu based on these topGroups and subGroups
    constructNewSpectrumMenu();
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

    // Get the Spectrum List from the server if a Histogram file has been specified in the URL
    if(dataStore.histoFileName.length>0){
	GetSpectrumListFromServer(dataStore.spectrumServer,processSpectrumList);
    }
}

function setupHistoListSelect(){
    // Clear the previous contents
    document.getElementById('histo-list-menu-div').innerHTML = 'Histogram file: ';
	
    // Create a select input for the histo file list
    var newSelect = document.createElement("select");
    newSelect.id = 'HistoListSelect';
    newSelect.name = 'HistoListSelect';
    newSelect.onchange = function(){
    dataStore.histoFileName = this.value;
	GetSpectrumListFromServer(dataStore.spectrumServer,processSpectrumList);
	console.log('Histogram selected is '+dataStore.histoFileName);
    }.bind(newSelect);
    
    document.getElementById('histo-list-menu-div').appendChild(newSelect);

    // Add the list of histo files as the options
    thisSelect = document.getElementById('HistoListSelect');
	thisSelect.add( new Option('Online', 'Online') );
    for(var i=0; i<dataStore.histoFileList.length; i++){
	thisSelect.add( new Option(dataStore.histoFileList[i], dataStore.histoFileList[i]) );
    }

    // if a Histogram file has been specified in the URL, make it the selected option
    if(dataStore.histoFileName.length>0){
	console.log(dataStore.histoFileName);
	console.log(thisSelect);
	thisSelect.value = dataStore.histoFileName;
    }

    // Get the spectrum list for whatever is selected on startup
    dataStore.histoFileName = document.getElementById('HistoListSelect').value;
    GetSpectrumListFromServer(dataStore.spectrumServer,processSpectrumList);
    console.log('Ininital Histogram file selected is '+dataStore.histoFileName);
}

function constructNewSpectrumMenu(){
    console.log('constructNewSpectrumMenu');
    console.log(dataStore);
    
    // Clear any previous menu content
    document.getElementById('bs-example-navbar-collapse-1').innerHTML = '';
    
    // build the menu based on these topGroups and subGroups
    dataStore._plotList = new plotList('bs-example-navbar-collapse-1');
    dataStore._plotList.setup();
    
}

