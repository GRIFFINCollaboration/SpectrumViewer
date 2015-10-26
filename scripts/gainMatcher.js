function dataSetup(data){

    var i, groups = []

    for(i=1; i<17; i++){
        groups.push({
            "groupID": 'GRG' + alwaysThisLong(i, 2),
            "groupTitle": 'GRIFFIN ' + alwaysThisLong(i, 2),
            "plots": [
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'BN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'BN00A'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'GN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'GN00A'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'RN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'RN00A'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'WN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'WN00A'
                }
            ]
        })
    }

    return {
        "detectors" : dataStore.GRIFFINdetectors,
        "groups": groups
    }

}

function spectraCallback(spectra){
    //callback to run after fetching spectra from the analyzer
    //overwrites the default version used in other spectrum viewer projects

    var i, key
    for(i=0; i<spectra.length; i++){
        for(key in spectra[i]){
            if(key != 'metadata')
                dataStore.rawData[key] = JSON.parse(JSON.stringify(spectra[i][key]));
        }
    }
}

function pageLoad(){

    var i;

    //set up plots
    var spectraNames = generateEnergySpectraNames(dataStore.GRIFFINdetectors);
    //dummy 'viewer' for refreshPlots to go look in
    dataStore.viewer = {'plotBuffer': {}};
    for(i=0; i<spectraNames.length; i++){
        dataStore.viewer.plotBuffer[spectraNames[i]] = []
    }
    refreshPlots();

    //set up clickable list items in plot selection
    (function() {
        var plots = document.getElementById('plotMenu').getElementsByTagName('li'), 
        i;

        for (i=0; i < plots.length; i++) {
            plots[i].onclick = toggleData;
        }
    })();
}

function toggleData(){
    //callback for selecting a new plot

    var plotKey = this.id + '_Energy';

    //dump old data, add new
    dataStore.viewer.removeData(dataStore.currentPlot);
    dataStore.viewer.addData(plotKey, JSON.parse(JSON.stringify(dataStore.rawData[plotKey])) );
    dataStore.currentPlot = plotKey;

    dataStore.viewer.plotData();

    addFitLines();

}

function addFitLines(){
    //add current fits to the plot

    var lower, upper;

    dataStore.viewer.containerFit.removeAllChildren();

    //add fit lines
    lower = dataStore.viewer.addFitLine(
                dataStore.ROI[dataStore.currentPlot].ROIlower[0], 
                dataStore.ROI[dataStore.currentPlot].ROIlower[1] - dataStore.ROI[dataStore.currentPlot].ROIlower[0], 
                dataStore.fitResults[dataStore.currentPlot][0][0], 
                dataStore.fitResults[dataStore.currentPlot][0][1], 
                dataStore.fitResults[dataStore.currentPlot][0][2], 
                dataStore.fitResults[dataStore.currentPlot][0][3], 
                dataStore.fitResults[dataStore.currentPlot][0][4]
            );

    upper = dataStore.viewer.addFitLine(
                dataStore.ROI[dataStore.currentPlot].ROIupper[0], 
                dataStore.ROI[dataStore.currentPlot].ROIupper[1] - dataStore.ROI[dataStore.currentPlot].ROIupper[0], 
                dataStore.fitResults[dataStore.currentPlot][1][0], 
                dataStore.fitResults[dataStore.currentPlot][1][1], 
                dataStore.fitResults[dataStore.currentPlot][1][2], 
                dataStore.fitResults[dataStore.currentPlot][1][3], 
                dataStore.fitResults[dataStore.currentPlot][1][4]
            );
    dataStore.viewer.containerFit.addChild(lower)
    dataStore.viewer.containerFit.addChild(upper)

    dataStore.viewer.stage.update();
}

function fetchCallback(){
    //after data has arrived, set up spectrum viewer and perform the inital fits.

    var i, j, keys = Object.keys(dataStore.rawData);

    //create a real spectrum viewer
    createFigure()
    setupFigureControl();
    dataStore.viewer.fitCallback = fitCallback;

    //keep the plot list the same height as the plot region
    document.getElementById('plotMenu').style.height = document.getElementById('plotWrap').offsetHeight + 'px';

    for(i=0; i<keys.length; i++){

        //identify regions of interest on all plots
        guessPeaks(keys[i], dataStore.rawData[keys[i]])

        dataStore.viewer.addData(keys[i], JSON.parse(JSON.stringify(dataStore.rawData[keys[i]])) )
        dataStore.currentPlot = keys[i];
        dataStore.viewer.plotData() //kludge to update limits, could be nicer

        //first peak
        dataStore.viewer.FitLimitLower = dataStore.ROI[keys[i]].ROIlower[0]
        dataStore.viewer.FitLimitUpper = dataStore.ROI[keys[i]].ROIlower[1]

        dataStore.viewer.fitData(keys[i], 0);
        dataStore.fitResults[keys[i]] = [dataStore.latestFit]

        //second peak
        dataStore.viewer.FitLimitLower = dataStore.ROI[keys[i]].ROIupper[0]
        dataStore.viewer.FitLimitUpper = dataStore.ROI[keys[i]].ROIupper[1]
        dataStore.viewer.fitData(keys[i], 0);
        dataStore.fitResults[keys[i]].push(dataStore.latestFit);
        if(i<keys.length-1) 
            dataStore.viewer.removeData(keys[i]);        

        //estimate goodness of fit
        for(j=0; j<2; j++){
            dataStore.fitResults[keys[i]][j].push(
                RCS(
                    dataStore.rawData[keys[i]].slice(dataStore.ROI[keys[i]].ROIlower[0], dataStore.ROI[keys[i]].ROIlower[1]),
                    evalGauss(dataStore.ROI[keys[i]].ROIlower[0], dataStore.ROI[keys[i]].ROIlower[1], dataStore.fitResults[keys[i]][j]),
                    3
                )
            )
        }
    }

    //write results to table and set up fit line re-drawing
    updateTable()
    dataStore.viewer.drawCallback = addFitLines;
}

function fitCallback(center, width, amplitude, intercept, slope){
    dataStore.latestFit = [amplitude, center, width, intercept, slope]
}

function evalGauss(min, max, params){
    //return an array of gaussian + linear bkg evaluations at the center of each bin on [min,max).
    //parameters == [amplitude, center, sigma, intercept, slope]

    var i, theory = []

    for(i=min; i<max; i++){
        theory.push(params[0]*Math.exp(-1*Math.pow((i+0.5-params[1]),2) / 2 / params[2]*params[2]) + params[3] + params[4]*(i+0.5));
    }

    return theory;
}

function updateTable(){
    //update the report table with whatever is currently in the dataStore
    //recall dataStore.fitReults[plotTitle] = [[amplitude, center, width, slope, intercept, fitQuality],[...]], for [low energy, high energy].

    var i, keys = Object.keys(dataStore.fitResults);

    for(i=0; i<keys.length; i++){
        document.getElementById(keys[i].slice(0,10) + 'chan1').innerHTML = dataStore.fitResults[keys[i]][0][1].toFixed(3);
        document.getElementById(keys[i].slice(0,10) + 'chan2').innerHTML = dataStore.fitResults[keys[i]][1][1].toFixed(3);
        document.getElementById(keys[i].slice(0,10) + 'qual1').innerHTML = dataStore.fitResults[keys[i]][0][5].toFixed(3);
        document.getElementById(keys[i].slice(0,10) + 'qual2').innerHTML = dataStore.fitResults[keys[i]][1][5].toFixed(3);
    }
}

function calculateLine(lowBin, highBin){
    //given the positions of the low bin and high bin, return [intercept, slope] defining
    //a striaght calibration line using the energies reported in the input.


}

function generateEnergySpectraNames(detectors){
    //generate an array of spectra names for the detectors listed.

    return dataStore.GRIFFINdetectors.map(
        function(elt){
            return elt + '_Energy'
        }
    )
}

function guessPeaks(spectrumName, data){
    //given a spectrum <data>, identify the bins corresponding to the maxima of the two largest peaks.
    //register a range around those peaks as our automated guesses for where the gammas of interest lie.

    var i, max, center, ROIlower, ROIupper, buffer,
    dataCopy = JSON.parse(JSON.stringify(data)),
    ROIwidth = 5;

    max = Math.max.apply(Math, dataCopy);
    center = dataCopy.indexOf(max);
    ROIlower = [center - ROIwidth, center + ROIwidth];

    //mask out this peak so we can find the next biggest
    for(i=center-ROIwidth; i<=center+ROIwidth; i++){
        dataCopy[i] = 0
    }

    max = Math.max.apply(Math, dataCopy);
    center = dataCopy.indexOf(max);
    ROIupper = [center - ROIwidth, center + ROIwidth];

    //make sure lower contains the lower energy peak (currently contains the highest intensity peak)
    if(ROIlower[0] > ROIupper[0]){
        buffer = JSON.parse(JSON.stringify(ROIlower));
        ROIlower = JSON.parse(JSON.stringify(ROIupper));
        ROIupper = JSON.parse(JSON.stringify(buffer));
    }

    dataStore.ROI[spectrumName] = {
        "ROIlower": ROIlower,
        "ROIupper": ROIupper
    }

}

dataStore = {}
dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';
dataStore.ODBrequests = [];
dataStore.rawData = {};
dataStore.ROI = {};
dataStore.fitResults = {};
dataStore.GRIFFINdetectors = [
        'GRG01BN00A',
        'GRG01GN00A',
        'GRG01RN00A',
        'GRG01WN00A'/*,
        'GRG02BN00A',
        'GRG02GN00A',
        'GRG02RN00A',
        'GRG02WN00A',
        'GRG03BN00A',
        'GRG03GN00A',
        'GRG03RN00A',
        'GRG03WN00A',
        'GRG04BN00A',
        'GRG04GN00A',
        'GRG04RN00A',
        'GRG04WN00A',
        'GRG05BN00A',
        'GRG05GN00A',
        'GRG05RN00A',
        'GRG05WN00A',
        'GRG06BN00A',
        'GRG06GN00A',
        'GRG06RN00A',
        'GRG06WN00A',
        'GRG07BN00A',
        'GRG07GN00A',
        'GRG07RN00A',
        'GRG07WN00A',
        'GRG08BN00A',
        'GRG08GN00A',
        'GRG08RN00A',
        'GRG08WN00A',
        'GRG09BN00A',
        'GRG09GN00A',
        'GRG09RN00A',
        'GRG09WN00A',
        'GRG10BN00A',
        'GRG10GN00A',
        'GRG10RN00A',
        'GRG10WN00A',
        'GRG11BN00A',
        'GRG11GN00A',
        'GRG11RN00A',
        'GRG11WN00A',
        'GRG12BN00A',
        'GRG12GN00A',
        'GRG12RN00A',
        'GRG12WN00A',
        'GRG13BN00A',
        'GRG13GN00A',
        'GRG13RN00A',
        'GRG13WN00A',
        'GRG14BN00A',
        'GRG14GN00A',
        'GRG14RN00A',
        'GRG14WN00A',
        'GRG15BN00A',
        'GRG15GN00A',
        'GRG15RN00A',
        'GRG15WN00A',
        'GRG16BN00A',
        'GRG16GN00A',
        'GRG16RN00A',
        'GRG16WN00A'*/
    ]