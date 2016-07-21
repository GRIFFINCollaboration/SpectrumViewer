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
    dataStore.summary = {};
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
        labels = document.getElementsByClassName('component-label'),
        lifetimes = document.getElementsByClassName('component-lifetime').toArray().map(function(current, index, arr){
            return parseFloat(current.value);
        }),
        amplitudes = document.getElementsByClassName('component-amplitude'),
        efficiencies = document.getElementsByClassName('component-efficiency').toArray().map(function(current, index, arr){
            return parseFloat(current.value);
        }),
        brs = document.getElementsByClassName('component-br').toArray().map(function(current, index, arr){
            return parseFloat(current.value);
        }),
        yields = document.getElementsByClassName('component-yield'),
        amplitudeGuess = amplitudes.toArray().map(function(current, index, arr){
            return current.value
        }),
        backgroundGuess = 1,
        fitResult = fitMulticomponentDecayPlusFlatBkg(histo, min, max, lifetimes, amplitudeGuess, backgroundGuess),
        implantation = parseFloat(document.getElementById('implantation').value)*getSelected('implantationUnit'),
        decay = parseFloat(document.getElementById('decay').value)*getSelected('decayUnit'),
        nCycles = parseInt(document.getElementById('nCycles').value, 10),
        i, y = [];

    dataStore.summary[dataStore.currentSpectrum] = [];

    for(i=0; i<amplitudes.length; i++){
        //write fit results to ui
        amplitudes[i].value = fitResult.amplitudes[i];

        //calculate yield
        y[i] = evaluateDecayYield(fitResult.amplitudes[i], efficiencies[i], brs[i], implantation, decay, nCycles);
        yields[i].innerHTML = y[i].toFixed(3);

        // produce json summary
        dataStore.summary[dataStore.currentSpectrum][i] = {
            'species': labels[i].value,
            'lifetime': lifetimes[i],
            'amplitude': fitResult.amplitudes[i],
            'efficiency': efficiencies[i],
            'br': brs[i],
            'yield': y[i]
        }
    }
    console.log(dataStore.summary[dataStore.currentSpectrum])

    // draw the fit
    viewer.dropPersistentOverlay();
    viewer.updatePersistentOverlay(fitResult);
}

function evaluateDecayYield(amplitude, efficiency, br, implantation, decay, nCycles){
    return amplitude/efficiency/br;
}

function fitPeaks(){
    // fit the selected gamma peaks, and perform yield calculations

    var viewer = dataStore.viewers[dataStore.plots[0]], 
        histo = viewer.plotBuffer[dataStore.currentSpectrum],
        labels = document.getElementsByClassName('gamma-label'),
        min = document.getElementsByClassName('gamma-min').toArray().map(function(current, index, arr){
            return parseInt(current.value, 10);
        }),
        max = document.getElementsByClassName('gamma-max').toArray().map(function(current, index, arr){
            return parseInt(current.value, 10);
        }),
        efficiencies = document.getElementsByClassName('gamma-efficiency').toArray().map(function(current, index, arr){
            return parseFloat(current.value);
        }),
        brs = document.getElementsByClassName('gamma-br').toArray().map(function(current, index, arr){
            return parseFloat(current.value);
        }),
        yields = document.getElementsByClassName('gamma-yield'),
        implantation = parseFloat(document.getElementById('implantation').value)*getSelected('implantationUnit'),
        decay = parseFloat(document.getElementById('decay').value)*getSelected('decayUnit'),
        nCycles = parseInt(document.getElementById('nCycles').value, 10),
        i, y = [], fitResults = [];

    dataStore.summary[dataStore.currentSpectrum] = [];
    viewer.dropPersistentOverlay();

    for(i=0; i<labels.length; i++){
        //perform the fit - each row is a separate fit for gammas
        fitResults[i] = fitGaussianPlusLinearBkg(histo, min[i], max[i]);

        //calculate yield
        y[i] = evaluateGammaYield(fitResults[i], efficiencies[i], brs[i], implantation, decay, nCycles);
        yields[i].innerHTML = y[i].toFixed(3);

        // produce json summary
        dataStore.summary[dataStore.currentSpectrum][i] = {
            'species': labels[i].value,
            'center': fitResults[i].center,
            'width': fitResults[i].width,
            'amplitude': fitResults[i].amplitude,
            'slope': fitResults[i].slope,
            'intercept': fitResults[i].intercept,
            'efficiency': efficiencies[i],
            'br': brs[i],
            'yield': y[i]
        }

        // draw the fit
        viewer.updatePersistentOverlay(fitResults[i]);
    }
    console.log(dataStore.summary[dataStore.currentSpectrum])

}

function evaluateGammaYield(fitResult, efficiency, br, implantation, decay, nCycles){
    return fitResult.amplitude / efficiency / br;
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

