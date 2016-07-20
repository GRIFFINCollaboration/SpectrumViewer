function setupDataStore(){

    var topGroups = [
        {
            "name": "Demo",
            "id": "demo",
            "subGroups": [
                {
                    "subname": "Example",
                    "id": "example",
                    "items": ['dummy_decay', 'dummy_spectrum']
                }
            ]
        }
    ]

    dataStore = {}

    dataStore.rawData = [];
    dataStore.topGroups = topGroups;

    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';       //host and port of analyzer
    dataStore.plots = ['yield-station'];                                //names of viewer objects (only one in this case)
    dataStore.ODBrequests = [];
    dataStore.doUpdates = true;                                         //include update loop
    dataStore.plotHelpText = "Zoom: Click and drag or single-click on either side of the window to zoom to. <br><br> Unzoom: Double-click. <br><br> Set the fit region for the current fit: shift-click either side of the fit region."
    dataStore.tableIndex = 0;                                           //serial number for fitting table row elements
    dataStore.newFitRegion = [];
    dataStore.fitLines = [];
    dataStore.pageTitle = "Yield Station";
    dataStore.componentIndex = 0;                                       //monotonic counter for components to fit
    dataStore.host = 'http://grsmid00.triumf.ca:8081/';
    dataStore.cycleRequest = dataStore.host + '?cmd=jcopy&odb0=/PPG&encoding=json-p-nokeys&callback=extractCycleParameters';
}
setupDataStore();

function fetchCallback(){
    //runs as callback after all data has been refreshed.
    dataStore.viewers[dataStore.plots[0]].plotData();
}

function fitDecay(){
    // fit the decay curve, and perform yield calculations

    var viewer = dataStore.viewers[dataStore.plots[0]], 
        histo = viewer.plotBuffer[dataStore.currentSpectrum],
        min = parseInt(document.getElementById('decayMinBin').value,10),
        max = parseInt(document.getElementById('decayMaxBin').value,10),
        lifetimes = document.getElementsByClassName('component-lifetime').toArray().map(function(current, index, arr){
            return current.value
        }),
        amplitudeGuess = document.getElementsByClassName('component-amplitude').toArray().map(function(current, index, arr){
            return current.value
        }),
        backgroundGuess = 1,
        fitResult = fitMulticomponentDecayPlusFlatBkg(histo, min, max, lifetimes, amplitudeGuess, backgroundGuess);

    // draw the fit
    viewer.dropPersistentOverlay();
    viewer.updatePersistentOverlay(fitResult);
}

function extractCycleParameters(ppg){
    //extract the implantation and decay times from a JSON representation of /ODB/PPG,
    //and set these in the UI.

    var ppg = ppg[0],
        current = ppg.Current,
        cycleDefinition = ppg.Cycles[current],
        i, implantation = 1, decay = 1, implantationUnit = 1, decayUnit = 1;

    if(cycleDefinition){
        // identify relevant cycle steps
        for(i=0; i<cycleDefinition.PPGcodes.length; i++){
            if( (0x00010001 & cycleDefinition.PPGcodes[i]) == 0x00010001){
                //found the implantation step
                implantation = cycleDefinition.durations[i];
            } else if ( (0xC004C004 & cycleDefinition.PPGcodes[i]) == 0xC004C004){
                //found the decay step
                decay = cycleDefinition.durations[i];
            }
        }

        //write to UI
        if(implantation>=60000){
            implantation /= 60000;
            implantationUnit = 60000;
        } else if(implantationUnit>=1000){
            implantation /= 1000;
            implantationUnit = 1000;
        }
        if(decay>=60000){
            decay /= 60000;
            decayUnit = 60000;
        } else if(decayUnit>=1000){
            decay /= 1000;
            decayUnit = 1000;
        }

        document.getElementById('implantation').value = implantation;
        document.getElementById('implantationUnit').value = implantationUnit;
        document.getElementById('decay').value = decay;
        document.getElementById('decayUnit').value = decayUnit;
    }
}

