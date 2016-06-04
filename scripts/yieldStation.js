function setupDataStore(){

    dataStore = {}
    dataStore.targetSpectrum = 'SUM_Singles_Energy';                    //analyzer key for spectrum to examine
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';       //host and port of analyzer
    dataStore.plots = [dataStore.targetSpectrum];                       //necessary?
    dataStore.newCellListeners = ['plotControl'];
    dataStore.attachCellListeners = ['plotControl'];                    //ids to dispatch attachCell events to
    dataStore.ODBrequests = [];
    dataStore.doUpdates = true;                                         //include update loop
    dataStore.plotHelpText = "Zoom: Click and drag or single-click on either side of the window to zoom to. <br><br> Unzoom: Double-click. <br><br> Set the fit region for the current fit: shift-click either side of the fit region. <br><br> Add a background region for the current fit: ctrl-click either side of the background region."
}
setupDataStore();

function fetchCallback(){
    //runs as callback after all data has been refreshed.
    dataStore.viewers[dataStore.plots[0]].plotData();
}

function shiftClick(event){
    console.log('xx');
}

function metaClick(event){
    console.log(event)
}