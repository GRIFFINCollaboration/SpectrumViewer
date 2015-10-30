////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore
    dataStore = {}
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';
    dataStore.ODBrequests = [];
    dataStore.rawData = {};
    dataStore.ROI = {};
    dataStore.fitResults = {};
    dataStore.resolutionData = [[0,0,0], [1,0,0], [2,0,0], [3,0,0]]
    dataStore.lowPeakResolution = []
    dataStore.lowPeakResolution.fill(0,64)
    dataStore.highPeakResolution = []
    dataStore.highPeakResolution.fill(0,64)
    dataStore.GRIFFINdetectors = [
            'GRG01BN00A',
            'GRG01GN00A',
            'GRG01RN00A',
            'GRG01WN00A',
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
            'GRG16WN00A'
        ]
}
setupDataStore();

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

    document.getElementById('fitLow').onclick = toggleFitMode
    document.getElementById('fitHigh').onclick = toggleFitMode
    document.getElementById('calibrationSource').onchange = updateEnergies
    document.getElementById('peak1').onchange = customEnergy
    document.getElementById('peak2').onchange = customEnergy

    initializeResolutionPlot();
}

////////////////////////
// Data Wrangling
////////////////////////

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

function toggleData(){
    //callback for selecting a new plot

    var plotKey = this.id + '_Energy';

    //dump old data, add new
    dataStore.viewer.removeData(dataStore.currentPlot);
    dataStore.viewer.addData(plotKey, JSON.parse(JSON.stringify(dataStore.rawData[plotKey])) );
    dataStore.viewer.fitTarget = plotKey;
    dataStore.currentPlot = plotKey;

    dataStore.viewer.plotData();

    addFitLines();

}

function fetchCallback(){
    //after data has arrived, set up spectrum viewer and perform the inital fits.

    var i, keys = Object.keys(dataStore.rawData);

    //create a real spectrum viewer
    createFigure()
    setupFigureControl();
    dataStore.viewer.fitCallback = fitCallback;

    //keep the plot list the same height as the plot region
    document.getElementById('plotMenu').style.height = document.getElementById('plotWrap').offsetHeight + 'px';

    //plug in gain match button
    document.getElementById('fitAll').onclick = fitAll
}

///////////////////
// Fitting
///////////////////

function fitAll(){
    var i, keys = Object.keys(dataStore.rawData);

    releaser(
        function(i){
            var keys = Object.keys(dataStore.rawData);
            fitSpectra(keys[i])
            document.getElementById('progress').setAttribute('style', 'width:' + (100*(keys.length - i) / keys.length) + '%' )   
        },

        function(){
            //set up fit line re-drawing
            dataStore.viewer.drawCallback = addFitLines;
            //reset to first plot
            document.getElementById(dataStore.GRIFFINdetectors[0]).onclick();
        },

        keys.length-1
    )
}

function toggleFitMode(){
    //manage the state of the Fit Mode button, and the corresponding state of the viewer.

    if(parseInt(this.getAttribute('engaged'),10) == 0){
        dataStore.viewer.setupFitMode();
        this.setAttribute('engaged', 1);
        if(this.id == 'fitLow')
            document.getElementById('refitLoBadge').classList.add('redText')
        if(this.id == 'fitHigh')
            document.getElementById('refitHiBadge').classList.add('redText')
    }
    else{
        dataStore.viewer.leaveFitMode();
        this.setAttribute('engaged', 0);
        if(this.id == 'fitLow')
            document.getElementById('refitLoBadge').classList.remove('redText')
        if(this.id == 'fitHigh')
            document.getElementById('refitHiBadge').classList.remove('redText')
    }

    if(this.id == 'fitLow')
        dataStore.currentPeak = 0
    else
        dataStore.currentPeak = 1

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

function fitSpectra(spectrum){
    //redo the fits for the named spectrum.

    //identify regions of interest
    guessPeaks(spectrum, dataStore.rawData[spectrum])

    //set up fitting
    dataStore.viewer.addData(spectrum, JSON.parse(JSON.stringify(dataStore.rawData[spectrum])) )
    dataStore.currentPlot = spectrum;
    dataStore.viewer.plotData() //kludge to update limits, could be nicer
    dataStore.viewer.fitTarget = spectrum;

    //first peak
    dataStore.currentPeak = 0
    dataStore.viewer.FitLimitLower = dataStore.ROI[spectrum].ROIlower[0]
    dataStore.viewer.FitLimitUpper = dataStore.ROI[spectrum].ROIlower[1]
    dataStore.viewer.fitData(spectrum, 0);
    
    //second peak
    dataStore.currentPeak = 1
    dataStore.viewer.FitLimitLower = dataStore.ROI[spectrum].ROIupper[0]
    dataStore.viewer.FitLimitUpper = dataStore.ROI[spectrum].ROIupper[1]
    dataStore.viewer.fitData(spectrum, 0);
    
    //dump data so it doesn't stack up 
    dataStore.viewer.removeData(spectrum);        
}

function fitCallback(center, width, amplitude, intercept, slope){
    //after fitting, log the fit results, as well as any modification made to the ROI by the fitting algortihm
    //also update table
    var lowPeak = document.getElementById('fitLow');
    var highPeak = document.getElementById('fitHigh');


    if(!dataStore.fitResults[dataStore.currentPlot])
        dataStore.fitResults[dataStore.currentPlot] = [];

    //keep track of fit results
    dataStore.fitResults[dataStore.currentPlot][dataStore.currentPeak] = [amplitude, center, width, intercept, slope]

    //convenient to arrange resolution data here
    if(dataStore.currentPeak == 0)
        dataStore.lowPeakResolution[dataStore.GRIFFINdetectors.indexOf(dataStore.currentPlot.slice(0,10))] = width;
    else if(dataStore.currentPeak == 1)
        dataStore.highPeakResolution[dataStore.GRIFFINdetectors.indexOf(dataStore.currentPlot.slice(0,10))] = width;

    if(dataStore.currentPeak == 0){
        dataStore.ROI[dataStore.currentPlot].ROIlower[0] = dataStore.viewer.FitLimitLower;
        dataStore.ROI[dataStore.currentPlot].ROIlower[1] = dataStore.viewer.FitLimitUpper;
    } else {
        dataStore.ROI[dataStore.currentPlot].ROIupper[0] = dataStore.viewer.FitLimitLower;
        dataStore.ROI[dataStore.currentPlot].ROIupper[1] = dataStore.viewer.FitLimitUpper;
    }

    //update table
    updateTable(dataStore.currentPlot);
    whatsNormal();
    highlightOutliers();

    //update plot
    dataStore.viewer.plotData();

    //update resolution plot
    reconstructResolutionData()

    //disengage fit mode buttons
    if( parseInt(lowPeak.getAttribute('engaged'),10) == 1)
        lowPeak.onclick();
    if( parseInt(highPeak.getAttribute('engaged'),10) == 1)
        highPeak.onclick();

}

function guessPeaks(spectrumName, data){
    //given a spectrum <data>, identify the bins corresponding to the maxima of the two largest peaks
    //around where we expect the calibration peaks to fall (+- 30 bins of bin==peak energy in kev)
    //register a range around those peaks as our automated guesses for where the gammas of interest lie.

    var i, max, center, ROIlower, ROIupper, buffer,
    dataCopy = JSON.parse(JSON.stringify(data)),
    ROIwidth = 5;
    searchWidth = 30;
    var lowEnergy = parseInt(document.getElementById('peak1').value,10);
    var highEnergy = parseInt(document.getElementById('peak2').value,10);

    max = Math.max.apply(Math, dataCopy.slice(lowEnergy - searchWidth, lowEnergy + searchWidth));
    center = dataCopy.slice(lowEnergy - searchWidth, lowEnergy + searchWidth).indexOf(max) + lowEnergy - searchWidth;
    ROIlower = [center - ROIwidth, center + ROIwidth];

    //mask out this peak so we can find the next biggest
    for(i=center-ROIwidth; i<=center+ROIwidth; i++){
        dataCopy[i] = 0
    }

    max = Math.max.apply(Math, dataCopy.slice(highEnergy - searchWidth, highEnergy + searchWidth));
    center = dataCopy.slice(highEnergy - searchWidth, highEnergy + searchWidth).indexOf(max) + highEnergy - searchWidth;
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

/////////////////////////
// Resolution Plot
/////////////////////////

function initializeResolutionPlot(){
    //set up the resolution plot.

    var labels = ['channel', 'Low Energy Peak', 'High Energy Peak'];

    dataStore.dygraph = new Dygraph(
        // containing div
        document.getElementById('resolutionPlot'),

        // data
        dataStore.resolutionData,

        //style
        {   
            labels: labels,
            title: 'Per-Crystal Resolution',
            //height: 750,//document.getElementById('resolutionWrap').offsetWidth*3/4,
            //width: 480,//document.getElementById('resolutionWrap').offsetWidth,
            axisLabelColor: '#FFFFFF',
            colors: ["#AAE66A", "#EFB2F0"],
            labelsDiv: 'resolutionLegend',
            legend: 'always',
            valueFormatter: function(num, opts, seriesName, dygraph, row, col){

                if(col == 0)
                    return dataStore.GRIFFINdetectors[num]
                else
                    return num.toFixed(3)
            },
            axes: {
                x: {
                    axisLabelFormatter: function(number, granularity, opts, dygraph){
                        if(number < dataStore.GRIFFINdetectors.length)
                            return dataStore.GRIFFINdetectors[number].slice(3,6);
                        else
                            return number
                        
                    }
                }
            }
        }
    );
}

function reconstructResolutionData(){
    //arrange the latest resolution info for representation in the dygraph.

    var i, detectorIndex = [],
    flags = [];
    flags.fill(0,64)

    for(i=0; i<dataStore.GRIFFINdetectors.length; i++){
        detectorIndex[i] = i;
    }

    dataStore.resolutionData = arrangePoints(detectorIndex, [dataStore.lowPeakResolution, dataStore.highPeakResolution], flags )
    dataStore.dygraph.updateOptions( { 'file': dataStore.resolutionData } );
}

////////////////
// Helpers
////////////////

function updateTable(spectrum){
    //update the report table with whatever is currently in the dataStore
    //recall dataStore.fitReults[plotTitle] = [[amplitude, center, width, slope, intercept],[...]], for [low energy, high energy].
    var calibration

    if(Array.isArray(dataStore.fitResults[spectrum][0]))
        document.getElementById(spectrum.slice(0,10) + 'chan1').innerHTML = dataStore.fitResults[spectrum][0][1].toFixed(3);
    if(Array.isArray(dataStore.fitResults[spectrum][1]))
        document.getElementById(spectrum.slice(0,10) + 'chan2').innerHTML = dataStore.fitResults[spectrum][1][1].toFixed(3);

    if(Array.isArray(dataStore.fitResults[spectrum][0]) && Array.isArray(dataStore.fitResults[spectrum][1])){
        calibration = calculateLine(dataStore.fitResults[spectrum][0][1], dataStore.fitResults[spectrum][1][1]);
        document.getElementById(spectrum.slice(0,10) + 'intercept').innerHTML = calibration[0].toFixed(3);
        document.getElementById(spectrum.slice(0,10) + 'slope').innerHTML = calibration[1].toFixed(3);
        dataStore.fitResults[spectrum][2] = calibration
    }
}

function calculateLine(lowBin, highBin){
    //given the positions of the low bin and high bin, return [intercept, slope] defining
    //a striaght calibration line using the energies reported in the input.

    var lowEnergy = document.getElementById('peak1').value
    var highEnergy = document.getElementById('peak2').value
    var slope, intercept;

    slope = (lowEnergy - highEnergy) / (lowBin - highBin);
    intercept = lowEnergy - slope*lowBin

    return [intercept, slope]

}

function generateEnergySpectraNames(detectors){
    //generate an array of spectra names for the detectors listed.

    return dataStore.GRIFFINdetectors.map(
        function(elt){
            return elt + '_Energy'
        }
    )
}

function whatsNormal(){
    //identifies the mean and SD of the fit peak position across all detectors for both claibration peaks

    var i, mean = [0,0], mean2 = [0,0], sd;
    var keys = Object.keys(dataStore.fitResults);
    var numFirst = 0, numSecond = 0

    for(i=0; i<keys.length; i++){
        if(dataStore.fitResults[keys[i]][0] && dataStore.fitResults[keys[i]][0][1]){
            mean[0] += dataStore.fitResults[keys[i]][0][1];
            mean2[0] += Math.pow(dataStore.fitResults[keys[i]][0][1],2);
            numFirst++;
        }
        if(dataStore.fitResults[keys[i]][1] && dataStore.fitResults[keys[i]][1][1]){
            mean[1] += dataStore.fitResults[keys[i]][1][1];
            mean2[1] += Math.pow(dataStore.fitResults[keys[i]][1][1],2);
            numSecond++
        }
    }

    mean[0] /= numFirst;
    mean[1] /= numSecond;
    mean2[0] /= numFirst;
    mean2[1] /= numSecond;

    sd = [ Math.sqrt(mean2[0] - Math.pow(mean[0],2)), Math.sqrt(mean2[1] - Math.pow(mean[1],2))]

    dataStore.meanPeaks = mean;
    dataStore.sdPeaks = sd;

}

function highlightOutliers(){
    //step through the fit results, and highlight table rows corresponding to wacky channels

    var i;
    var keys = Object.keys(dataStore.fitResults);

    for(i=0; i<keys.length; i++){
        if( dataStore.fitResults[keys[i]][0] && dataStore.fitResults[keys[i]][1] && (
                dataStore.fitResults[keys[i]][0][1] > dataStore.meanPeaks[0] + dataStore.sdPeaks[0]*2
                || dataStore.fitResults[keys[i]][0][1] < dataStore.meanPeaks[0] - dataStore.sdPeaks[0]*2
                || isNaN(dataStore.fitResults[keys[i]][0][1])
                || dataStore.fitResults[keys[i]][1][1] > dataStore.meanPeaks[1] + dataStore.sdPeaks[1]*2
                || dataStore.fitResults[keys[i]][1][1] < dataStore.meanPeaks[1] - dataStore.sdPeaks[1]*2
                || isNaN(dataStore.fitResults[keys[i]][1][1])
            )
        ){
            document.getElementById(keys[i].slice(0,10) + 'row').style = 'background-color: #FF0000;'
        } else{
            document.getElementById(keys[i].slice(0,10) + 'row').style = ''
        }
    }
}

////////////////
// Callbacks
////////////////

function updateEnergies(){
    //callback for the calibration source dropdown; updates energy input boxes with standard values

    var calibtationSource = getSelected(this.id);
    var lowEnergy = document.getElementById('peak1');
    var highEnergy = document.getElementById('peak2');

    if(calibtationSource == 'Co-60'){
        lowEnergy.value = 1163
        highEnergy.value = 1332
    } else if(calibtationSource == 'Eu-152'){
        lowEnergy.value = 121
        highEnergy.value = 1408
    }

    //fit all calibration peaks in all spectra
    fitAll();

    //reset to first plot
    document.getElementById(dataStore.GRIFFINdetectors[0]).onclick()
}

function customEnergy(){
    //callback for changing the calibration energies to custom values
    var i, keys = Object.keys(dataStore.fitResults)
    var defaultSources = document.getElementById('calibrationSource')

    defaultSources.value = 'custom'

    //fit all calibration peaks in all spectra
    fitAll();

    //reset to first plot
    document.getElementById(dataStore.GRIFFINdetectors[0]).onclick()
}