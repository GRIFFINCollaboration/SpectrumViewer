////////////////////////////
// Analyzer Interface Viewer setup
////////////////////////////

function setupViewerDataStore(callback){
    console.log('Execute setupViewerDataStore...');

    /*
    // Test JSON object
   SpectrumList = {
                     "Hits_and_Sums" : [
                                        ["Hits", "HITPATTERN_Energy", "HITPATTERN_Time", "HITPATTERN_Waveform", "HITPATTERN_Pulse_Height", "HITPATTERN_Rate"], 
                                        ["Sums", "SUM_Singles_GeA_Energy", "SUM_Singles_GeB_Energy", "SUM_SCEPTAR_Energy", "SUM_LaBr3_Energy", "SUM_TAC_Energy"],
                                        ["Coinc", "COINC_gamma-gamma", "COINC_beta-gamma", "COINC_beta-PACES", "COINC_gamma-PACES", "COINC_beta-Addback"],
                                        ["DeltaT", "deltaT_gamma-gamma"],
                     ],
                     "Griffin" : [
	                          ["Energy", "GRG01BN00A_Energy", "GRG01GN00A_Energy", "GRG01RN00A_Energy", "GRG01WN00A_Energy", "GRG01BN00B_Energy"],
	                          ["Time", "GRG01BN00A_Time", "GRG01GN00A_Time", "GRG01RN00A_Time", "GRG01WN00A_Time", "GRG01BN00B_Time"],
	                 ["Pulse_Height", "GRG01BN00A_Pulse_Height", "GRG01GN00A_Pulse_Height", "GRG01RN00A_Pulse_Height", "GRG01WN00A_Pulse_Height", "GRG01BN00B_Pulse_Height"],
                     ],
                  }
*/

    
    console.log(dataStore.SpectrumList);
    SpectrumList = dataStore.midasFileSpectrumList;

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

    // Add the top groups to the dataStore
    dataStore.topGroups = topGroups;

    // Update the counters
    dataStore.cellIndex = dataStore.plots.length;

    // Call the callback function provided in the arguments
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

function GetMidasFileSpectrumListFromServer(ServerName, callback){
    console.log('Execute GetSpectrumFromServer...');

    
    // Get the Spectrum List from the analyser server
    
    var errorMessage = 'Error receiving Spectrum List from server, '+ServerName; 
    var urlString = ServerName+'/?cmd=getSpectrumList';
    
    var req = new XMLHttpRequest();
    req.open('GET', urlString);

    // Once the response is received, convert the text response from the server to JSON Object
  req.onreadystatechange = () => {
      if (req.readyState === 4) {
	 // console.log('Response text is: '+req.response);
	 // JSONString = req.response.split(")")[0].split("(")[1];
	  JSONString = req.response;
	//  console.log('JSON String is: '+JSONString);
	 dataStore.SpectrumList = JSON.parse(JSONString);
	  // The third argument passed to this function is the callback for the next function, so we pass it on here
          callback(arguments[2]);
    }
  };

    // Handle network errors
    req.onerror = function() {
        reject(Error(errorMessage));
    };

    // Make the request
    req.send();

}

function setupEventListeners(){
    console.log('Execute setupEventListeners...');

            window.addEventListener('HTMLImportsLoaded', function(e) {

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
                document.getElementById('plottingGridnewPlotButton').click();

                //start with GRIFFIN menu displayed
                document.getElementById('Griffin').onclick();

                $(function () {
                    $('[data-toggle="tooltip"]').tooltip()
                })
	    });
    
		console.log('Finished setupEventListeners');
}

