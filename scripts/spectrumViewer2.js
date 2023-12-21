////////////////////////////////////////////
// main setup
////////////////////////////////////////////


// Obtain the MIDAS server information from the URL
var urlData = parseQuery();
var thisSpectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
//var thisSpectrumServer = 'http://grifstore0.triumf.ca:9093';
var histoDirectory = urlData.histoDir;
var histoFile = urlData.histoFile;
//var SpectrumList; // now local variable in processSpectrumList
var dataStore = {};
console.log('Server is: '+thisSpectrumServer);

// Get the initial list of Histogram files available from the server
getHistoFileListFromServer();

// Get the Spectrum List from the server
GetSpectrumListFromServer(thisSpectrumServer,processSpectrumList);

// Set up the data store. Once that is done then the event listeners can be added.
setupDataStore(setupEventListeners);


function setupDataStore(callback){
    console.log('Execute setupDataStore...');
    console.log(histoDirectory);
    console.log(histoFile);
    
    // Create the dataStore object
  dataStore = {
        "pageTitle": 'Spectrum Viewer',                             //header title
        "topGroups": [],                                     //groups in top nav row
        "waveformSnap": true,                                       //do we want the snap to waveform functionality?
        "doUpdates": true,                                          //do we want the data update button and loop?
        "scaling": false,                                           //do we want to expose x-axis rescaling UI?
        "plots": [],                                                //array of names for default plot cells
        "spectrumServer": thisSpectrumServer,                       //analyzer url + port number
        "ODBrequests": [],                                          //array of odb requests to make on refresh
      "zeroedPlots": {},                                           //initialize empty object for zeroed plots

      "histoDirectory" : urlData.histoDir,                         // histogram directory taken from URL. Then can be changed from a select
      "histoFileName" : urlData.histoFile                        // histogram filename taken from URL. Then can be changed from a select
  }

    dataStore.cellIndex = dataStore.plots.length;
    console.log(dataStore.cellIndex);
    console.log(dataStore.plots);
    console.log(dataStore);

    if(dataStore.histoDirectory==undefined){
	dataStore.histoDirectory = '';
    }

    if(dataStore.histoFileName==undefined){
	dataStore.histoFileName = '';
    }
    
    callback();
}


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
    
}

function processHistoFileList(payload){
    console.log(payload);

    // receive the payload and split into an array of strings
    var thisPayload = payload.split("]")[0].split("[ \n")[1];
    
    // tidy up the strings to extract the list of midas files
    dataStore.histoFileList = thisPayload.split(" , \n ");

    // Sort the list in numberical and alphabetical order, then reverse the order so the newer files appear first (note this is not ideal for sub-runs)
    dataStore.histoFileList.sort();
    dataStore.histoFileList.reverse();

    // Set up the list of histo files
    setupHistoListSelect();

    console.log(dataStore.histoFileList);
}

function setupHistoListSelect(){
    // Display the analyzer server name
    document.getElementById('histo-list-menu-div').innerHTML = thisSpectrumServer;

    // Create a select input for the histo file list
    var newSelect = document.createElement("select");
    newSelect.id = 'HistoListSelect';
    newSelect.name = 'HistoListSelect';
    newSelect.onchange = function(){
    dataStore.histoFileName = this.value;
    GetSpectrumListFromServer(thisSpectrumServer,setupDataStore,setupEventListeners);
    }.bind(newSelect);
    
    document.getElementById('histo-list-menu-div').appendChild(newSelect);

    // Add the list of histo files as the options
    thisSelect = document.getElementById('HistoListSelect');
    for(var i=0; i<dataStore.histoFileList.length; i++){
	thisSelect.add( new Option(dataStore.histoFileList[i], dataStore.histoFileList[i]) );
    }

}


function setupEventListeners(){
    console.log('Execute setupEventListeners...');
    console.log(dataStore.plots);

    
            window.addEventListener('HTMLImportsLoaded', function(e) {
                dataStore.templates = prepareTemplates(['plotList', 'plotGrid', 'plotControl', 'auxPlotControl', 'auxPlotControlTable', 'fitRow', 'footer']);

                dataStore._plotList = new plotList('analyzerPlots');
                dataStore._plotGrid = new plotGrid('plottingGrid');
                dataStore._plotControl = new plotControl('plotCtrl', 'vertical');
                dataStore._auxCtrl = new auxPlotControl('auxCtrl');

                dataStore._plotList.setup();
                dataStore._plotGrid.setup();
                dataStore._plotControl.setup();
                dataStore._auxCtrl.setup();
                setupFooter('foot');

                //start with a single plot
               // document.getElementById('plottingGridnewPlotButton').click();

                //start with GRIFFIN menu displayed
              //  document.getElementById('Griffin').onclick();

                $(function () {
                    $('[data-toggle="tooltip"]').tooltip()
                })
	    });
    
		console.log('Finished setupEventListeners');
    console.log(dataStore.plots);
}
