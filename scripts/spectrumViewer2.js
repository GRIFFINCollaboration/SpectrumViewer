////////////////////////////////////////////
// main setup
////////////////////////////////////////////

// a Global variable to pass around the information taken from the URL arguments
var urlData = [];

function setupDataStore(){
    
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
    // This call also results in the spectrum menu being dynamically generated from the list received from the server
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
