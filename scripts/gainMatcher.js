////////////////////////////////////////////
// main setup
////////////////////////////////////////////
// Workflow for gainMatcher:
// Initial setup through a series of user inputs.
// At setupAutomaticCalibration or setupManualCalibration, the list of channels (psc) are requested through XHR(dataStore.ViewConfigQuery, "Problem getting viewConfig from analyzer server", loadData, function(error){console.log(error)});
// the callback loadData build the list of histogram names to request from the server (this.activeSpectra where this is plotControl object). Then calls this.refreshAll where this is plotControl object.
// the refreshAll function in plotControl.html issues promises to receive all spectra from the server. The callback is fetchCallback in gainMatcher.js.
// If manual then the peak regions are defined here by user mouse inputs. If automatic then the guesses are loaded.
// Click the fitAll ('Gainmatch all') button to call this.fitAll were this is the gainMatchReport object.
// this.fitAll uses a releaser to execute an operation for each key of dataStore.rawData.
//      in the releaser: calls this.fitSpectra(keys[i]) with each key of dataStore.rawData. 
//             this.fitSpectra calls this.guessPeaks to identify the peaks, plots the spectrum and fits the peaks by calling fitData which is a viewer function, then dumps the specturm data.
//             fitData is in gammaSpectrum.js. It uses a [guassian + linear background] fit from a maximum-likihood approach. It calls this.fitCallback.
//                    fitCallback is defined in gainMatchReport.html. after fitting, log the fit results (dataStore.fitResults), log the resolution, update any modification made to the ROI by the fitting algortihm,
//                                                                                   update the table. Update the resolution and residuals plots.
//                                in updateTable, this.calculateQuadratic is called to fit the actual energy calibration. Calibration results logged in dataStore.fitResults[spectrum][4]. whatsNormal and highlightOutliers.
//      in the releaser: After all spectra have been looped, then once executes; draw the fit lines, change the message div, plot the first spectrum again, whatsNormal and highlightOutliers.

function setupDataStore(){
    //sets up global variable datastore

    var i, groups = [];

    dataStore = {};

    //network and raw data
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //host + port of analyzer server
    dataStore.ODBhost = 'http://grsmid00.triumf.ca:8081/';                  //MIDAS / ODB host + port

    // Histogram directory and filename
    dataStore.histoFileDirectoryPath = '/tig/grifstore0b/griffin/schedule140/Histograms';
    dataStore.histoFileName = '';
    dataStore.histoAutoLoad = false;        // Flag set by the presence of a directory and filename in the URL to automatically load it. Default is off.

    // Get the analyzer Server and ODB host names from the URL
    GetURLArguments();
    
    dataStore.numberOfClovers = 16;                                     // Default number of clovers is all of the array
    // shouldn't need to change anything below this line -----------------------------------------------------------------------

    dataStore.pageTitle = 'Gain Matcher';                                   //header title
    dataStore.DAQquery = dataStore.ODBhost + '?cmd=jcopy&odb0=/DAQ/PSC/chan&odb1=/DAQ/PSC/PSC&odb2=/Runinfo/Run number&encoding=json-p-nokeys&callback=loadData';
    dataStore.ViewConfigQuery = '';
    dataStore.ODBrequests = [                                               //request strings for odb parameters
        dataStore.ODBhost + '?cmd=jcopy&odb0=/DAQ/PSC/chan&odb1=/DAQ/PSC/gain&odb2=/DAQ/PSC/offset&odb3=/DAQ/PSC/quadratic&encoding=json-p-nokeys&callback=updateODB'
    ];
    dataStore.PSCchannels = {};                                             //store the full list of channels in the PSC table for building a Cal file
    dataStore.PSCaddresses = {};                                            //store the full list of addresses in the PSC table for building a Cal file
    dataStore.midasCalibration = [];                                        //store the full list of the existing calibration coefficients from the server
    dataStore.RunNumber = '';                                               //store the run number for naming the Cal file
    dataStore.rawData = {};                                                 //buffer for raw spectrum data
    //fitting
    dataStore.mode = 'manual';                                              //mode of operation: manual (user defined search regions) or auto (predefined search regions). 
    dataStore.ROI = {};                                                     //regions of interest to look for peaks in: 'plotname': {'ROIupper':[low bin, high bin], 'ROIlower': [low bin, high bin]}
    dataStore.fitResults = {};                                              //fit results: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]
    
    //custom element config
    dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects

    dataStore.resolutionData = [];                                      //dygraphs-sorted peak widths for both peaks, in same order as THESEdetectors: [[detectorIndex, low peak width, high peak width], ...]
    dataStore.residualsData = [];                                     
    dataStore.residualsData[0] = [];                                  
    dataStore.residualsData[1] = [];        // peak1                          
    dataStore.residualsData[2] = [];        //peak2                          
    dataStore.residualsData[3] = [];        //peak3                          
    dataStore.residualsData[4] = [];        //peak4                   
    dataStore.residualsData[5] = [];        // peak1                          
    dataStore.residualsData[6] = [];        //peak2                          
    dataStore.residualsData[7] = [];        //peak3                          
    dataStore.residualsData[8] = [];        //peak4                             
    dataStore.lowPeakResolution = [];                                   //low energy peak resolutions, indexed per GRIFFINdetectors
    dataStore.lowPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                             //start with zeroes
    dataStore.midPeakResolution = [];                                  //as midPeakResolution
    dataStore.midPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                            //start with zeroes
    dataStore.highPeakResolution = [];                                  //as highPeakResolution
    dataStore.highPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                           //start with zeroes
    dataStore.vhiPeakResolution = [];                                  //as highPeakResolution
    dataStore.vhiPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                            //start with zeroes
    dataStore.searchRegionP1 = [];                                         //[x_start, x_finish, y for peak search bar]
    dataStore.searchRegionP2 = [];                                         //[x_start, x_finish, y for peak search bar]
    dataStore.searchRegionP3 = [];                                         //[x_start, x_finish, y for peak search bar]
    dataStore.searchRegionP4 = [];                                         //[x_start, x_finish, y for peak search bar]

    dataStore.modeType = 'Online';                                         //mode of operation: Online or Histo. 
    dataStore.modeChoice = [                                               // Mode choice (online/histogram file) information to generate buttons
	{"name": "Online", "text": "Use online data"},
	{"name": "Histo", "text": "Use a histogram file"}
    ];
    
    dataStore.detectorChoice = [{"name": "HPGe"},{"name": "PACES"}];       // Detector choice information to generate buttons
    
    dataStore.sourceInfo = [                                            // Source information and settings
	{"name":  "Co-60", "title":  "60Co", "lowEnergy":  74.97, "midEnergy": 1173.23, "highEnergy": 1332.49, "vhiEnergy": 2614.52, "maxXValue":2650 },
	{"name":  "Co-56", "title":  "56Co", "lowEnergy": 122.06, "midEnergy":  846.77, "highEnergy": 1238.29, "vhiEnergy": 2598.50, "maxXValue":2650 },
	{"name": "Ba-133", "title": "133Ba", "lowEnergy":  81.00, "midEnergy":  356.01, "highEnergy": 1460.85, "vhiEnergy": 2614.52, "maxXValue":2650 },
	{"name": "Cs-137", "title": "137Cs", "lowEnergy":  74.97, "midEnergy":  511.00, "highEnergy":  661.66, "vhiEnergy": 1460.85, "maxXValue":2000 },
	{"name": "Eu-152", "title": "152Eu", "lowEnergy":  39.91, "midEnergy":  121.78, "highEnergy":  344.28, "vhiEnergy": 1408.00, "maxXValue":2000 },
	{"name": "Bi-207", "title": "207Bi", "lowEnergy":  74.97, "midEnergy":  569.70, "highEnergy": 1063.66, "vhiEnergy": 1770.23, "maxXValue":2000 },
	{"name":  "Sr-90", "title":  "90Sr", "lowEnergy":  59.32, "midEnergy":  511.00, "highEnergy": 1460.85, "vhiEnergy": 2614.52, "maxXValue":2650 },
	{"name": "Background", "title": "Background", "lowEnergy":  74.97, "midEnergy":  511.00, "highEnergy": 1460.85, "vhiEnergy": 2614.52, "maxXValue":2650 }
    ];
    dataStore.sourceInfoPACES = [
	{"name": "PACES",  "title": "PACES 207Bi", "lowEnergy":  74.97, "midEnergy":  481.69, "highEnergy":  975.65, "vhiEnergy": 1682.22, "maxXValue":2000 }
    ];

    dataStore.THESEdetectors = [];                                    //10-char codes of all possible griffin/paces detectors. Contents based on detectorChoice

    dataStore.cellIndex = dataStore.plots.length;

    //resolution plot
    dataStore.plotInitData = [];
    dataStore.plotInitData[0] = [[0,0,0,0,0], [1,0,0,0,0], [2,0,0,0,0], [3,0,0,0,0], [4,0,0,0,0], [5,0,0,0,0], [6,0,0,0,0], [7,0,0,0,0], [8,0,0,0,0]];      //initial dummy data
    dataStore.plotInitData[1] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[2] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[3] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[4] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[5] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[6] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[7] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.plotInitData[8] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
    dataStore.dataplotData = [];                                       // place for dataplot data 
    dataStore.dataplotData[0] = [];                                       // place for dataplot data 
    dataStore.dataplotData[1] = [];                                       // place for dataplot data 
    dataStore.dataplotData[2] = [];                                       // place for dataplot data 
    dataStore.dataplotData[3] = [];                                       // place for dataplot data 
    dataStore.dataplotData[4] = [];                                       // place for dataplot data 
    dataStore.dataplotData[5] = [];                                       // place for dataplot data 
    dataStore.dataplotData[6] = [];                                       // place for dataplot data 
    dataStore.dataplotData[7] = [];                                       // place for dataplot data 
    dataStore.dataplotData[8] = [];                                       // place for dataplot data 
    dataStore.plotStyle = [];
    dataStore.plotStyle[0] = {                                              //dygraphs style object
        labels: ["channel", "Peak1 Width", "Peak2 Width", "Peak3 Width", "Peak4 Width"],
        title: 'Per-Crystal Resolution',
        axisLabelColor: '#FFFFFF',
        colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
        labelsDiv: 'resolutionLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: '0',
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [0,10]
		    }
        }
    }
    dataStore.plotStyle[1] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak1',
        axisLabelColor: '#FFFFFF',
        colors: ["#AAE66A"],
        labelsDiv: 'residualP1newLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [-5,5]
		    }
        }
    }
    dataStore.plotStyle[2] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak2',
        axisLabelColor: '#FFFFFF',
        colors: ["#EFB2F0"],
        labelsDiv: 'residualP2newLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [-5,5]
		    }
        }
    }
    dataStore.plotStyle[3] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak3',
        axisLabelColor: '#FFFFFF',
        colors: ["#B2D1F0"],
        labelsDiv: 'residualP3newLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [-5,5]
		    }
        }
    }
    dataStore.plotStyle[4] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak4',
        axisLabelColor: '#FFFFFF',
        colors: ["#F0DBB2"],
        labelsDiv: 'residualP4newLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            }
        }
    }
    dataStore.plotStyle[5] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak1',
        axisLabelColor: '#FFFFFF',
        colors: ["#AAE66A"],
        labelsDiv: 'residualP1midLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [-5,5]
		    }
        }
    }
    dataStore.plotStyle[6] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak2',
        axisLabelColor: '#FFFFFF',
        colors: ["#EFB2F0"],
        labelsDiv: 'residualP2midLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [-5,5]
		    }
        }
    }
    dataStore.plotStyle[7] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak3',
        axisLabelColor: '#FFFFFF',
        colors: ["#B2D1F0"],
        labelsDiv: 'residualP3midLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            },

            y : {
		     valueRange: [-5,5]
		    }
        }
    }
    dataStore.plotStyle[8] = {                                              //dygraphs style object
        labels: ["channel", "Residual (keV)"],
        title: 'Per-Crystal Residuals Peak4',
        axisLabelColor: '#FFFFFF',
        colors: ["#F0DBB2"],
        labelsDiv: 'residualP4midLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.THESEdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.THESEdetectors.length)
                        return dataStore.THESEdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            }
        }
    }
    dataStore.YAxisMinValue = [[0,0], [-0.1,-1], [-0.1,-1], [-0.1,-1], [-0.1,-1], [-0.1,-1], [-0.1,-1], [-0.1,-1], [-0.1,-1]];  // used in updateData function. First number is y axis, second value is y2 axis
    dataStore.YAxisMaxValue = [[3,3], [0.1,1], [0.1,1], [0.1,1], [0.1,1], [0.1,1], [0.1,1], [0.1,1], [0.1,1]];          // used in updateData function. First number is y axis, second value is y2 axis
    dataStore.annotations = [0,0];
    dataStore._dataplot = [];                 // Place for all dataplot objects to be created as an array. This makes them indexable and iteratable

}
setupDataStore();

function fetchCallback(){
    // change messages
    deleteNode('waitMessage');
    if(document.getElementById('regionMessage')){
	document.getElementById('regionMessage').classList.remove('hidden');
    }
	
    //show first plot
    dataStore._plotListLite.snapToTop();

    //release the fit all button only if in auto mode because then search regions are predefined
    if(dataStore.mode == 'auto'){
	document.getElementById('fitAll').classList.remove('disabled');
	document.getElementById('fitAll').onclick();
    }
}

function setupMenusFromModeChoice(modeType){
    
    //user guidance
    deleteNode('modeMessage');

    // Save the modeType to the dataStore for use later
    dataStore.modeType = modeType;
    
    // If histograms are required then inject the inputs for this
    if(modeType == 'Histo'){
	//user guidance
	document.getElementById('histogramMessage').classList.remove('hidden');

	// Remove the mode buttons and use this Div for the histogram directory and file inputs
	for(i=0; i<dataStore.modeChoice.length; i++){
	deleteNode('modeChoice-'+dataStore.modeChoice[i].name);
	}
	
	// Create the text input for the Histogram file directory
	var newLabel = document.createElement("label");
	newLabel.for = 'HistoDirectoryInput';
	newLabel.innerHTML = 'Histogram fileDirectory: ';
	document.getElementById('modeChoiceBar').appendChild(newLabel);
	
	newInput = document.createElement('input'); 
	newInput.id = 'HistoDirectoryInput'; 
	newInput.type = 'text';
	newInput.style.width = '400px';
	newInput.value = dataStore.histoFileDirectoryPath;
	newInput.onchange = function(){
	    dataStore.histoFileDirectoryPath = this.value;
	    getHistoFileListFromServer();
	}.bind(newInput);
	document.getElementById('modeChoiceBar').appendChild(newInput);

	// Grab the histogram list for the default directory
	getHistoFileListFromServer();
	
	
    }else{
	// Online mode so do straight to detector choice
	// Hide the mode choice
	document.getElementById('modeChoiceBar').classList.add("hidden");
	
	//user guidance
	deleteNode('histogramMessage');
	document.getElementById('detectorMessage').classList.remove('hidden');
	
	// Display the detector choice
	document.getElementById('detectorChoiceBar').classList.remove("hidden");
    }
    
}

function setupHistoListSelect(){
    // Remove the select if it already exists
    try{
	document.getElementById('HistoListSelect').remove();
	document.getElementById('HistoListSelectLabel').remove();
    }
    catch(err){ }
    
    // Add the title text
    var newLabel = document.createElement("label");
    newLabel.for = 'HistoListSelect';
    newLabel.id = 'HistoListSelectLabel';
    newLabel.innerHTML = 'Histogram file: ';
    document.getElementById('modeChoiceBar').appendChild(newLabel);
    
    // Create a select input for the histo file list
    var newSelect = document.createElement("select");
    newSelect.id = 'HistoListSelect';
    newSelect.name = 'HistoListSelect';
    newSelect.onchange = function(){
	dataStore.histoFileName = this.value;
	console.log('Histogram selected is '+dataStore.histoFileName);
	
	//user guidance
	if(document.getElementById('histogramMessage')){
	    deleteNode('histogramMessage');
	}
	document.getElementById('detectorMessage').classList.remove('hidden');
	
	// Display the detector choice
	document.getElementById('detectorChoiceBar').classList.remove("hidden");
    }.bind(newSelect);
    document.getElementById('modeChoiceBar').appendChild(newSelect);
    
    // Add the list of histo files as the options
    thisSelect = document.getElementById('HistoListSelect');
    for(var i=0; i<dataStore.histoFileList.length; i++){
	thisSelect.add( new Option(dataStore.histoFileList[i], dataStore.histoFileList[i]) );
    }

    // If a filename was provided in the URL then set it as the value of the select
    if(dataStore.histoAutoLoad){
	thisSelect.value = dataStore.histoFileName;
    }
    
    // Fire the onchange event for the select with the default value to set it
    document.getElementById('HistoListSelect').onchange();
}

function setupMenusFromDetectorChoice(detectorType){

    // Hide the detector choice
    document.getElementById('detectorChoiceBar').classList.add("hidden");

    // Display the Source choice
    document.getElementById('decisionBarAuto').classList.remove("hidden");
    document.getElementById('decisionBarManual').classList.remove("hidden");

    if(detectorType == 'PACES'){
	// Delete the HPGe source buttons and generate only the PACES buttons
	const thisNode = document.getElementById('decisionBarAuto');
	while (thisNode.firstChild) {
	    thisNode.removeChild(thisNode.lastChild);
	}
	for(var i=0; i<dataStore.sourceInfoPACES.length; i++){
	    // Create Auto calibrate source Submit button
	    newButton = document.createElement('button'); 
	    newButton.setAttribute('id', 'automaticCalibration-'+dataStore.sourceInfoPACES[i].name); 
	    newButton.setAttribute('class', 'btn btn-default'); 
	    newButton.setAttribute('engaged', '0');
	    newButton.value = dataStore.sourceInfoPACES[i].name;
	    newButton.innerHTML = '<span id=\'autoCalibBadge-'+dataStore.sourceInfoPACES[i].name+'\' class=\'glyphicon glyphicon-equalizer\' aria-hidden=\'true\'></span><span id=\'autoText\'>Calibrate '+dataStore.sourceInfoPACES[i].title+'</span>';
            newButton.onclick = function(){
		setupAutomaticCalibration(this.value);
	    }.bind(newButton);
            document.getElementById('decisionBarAuto').appendChild(newButton);
	}
    }
    
    // setup the dataStore for this choice of detectorType
    var i, num=0, groups = [];
    // Save the lists of spectrum names to the dataStore for this detectorType
    if(detectorType == 'HPGe'){
	// Set up GRIFFIN detectors

    var crystals = ["B","G","R","W"];
    var letter = ["A","B"];
    for(j=0; j<2; j++){
	for(i=1; i<(dataStore.numberOfClovers+1); i++){
	    for(k=0; k<4; k++){
		dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];
		num++;
	    }
	}
    }
    
	//generate groups for plot selector
	var histoName = dataStore.histoFileName.split('.')[0];
    for(i=1; i<(dataStore.numberOfClovers+1); i++){
        groups.push({
            "groupID": 'GRG' + alwaysThisLong(i, 2),
            "groupTitle": 'GRIFFIN ' + alwaysThisLong(i, 2),
            "plots": [
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'BN00A_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'BN00A'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'GN00A_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'GN00A'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'RN00A_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'RN00A'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'WN00A_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'WN00A'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'BN00B_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'BN00B'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'GN00B_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'GN00B'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'RN00B_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'RN00B'
                },
                {
                    "plotID": histoName+':'+'GRG' + alwaysThisLong(i, 2) + 'WN00B_Pulse_Height', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'WN00B'
                }
            ]
        })
    }
}else if(detectorType == 'PACES'){

    dataStore.THESEdetectors = [                                      //10-char codes of all possible griffin detectors.
            'PAC01XN00A',
            'PAC02XN00A',
            'PAC03XN00A',
            'PAC04XN00A',
            'PAC05XN00A'
        ];


    //generate groups for plot selector
	var histoName = dataStore.histoFileName.split('.')[0];
        groups.push({
            "groupID": 'PAC',
            "groupTitle": 'PACES',
            "plots": [
                {
                    "plotID": histoName+':'+'PAC01XN00A_Pulse_Height', 
                    "title": 'PAC01XN00A'
                },
                {
                    "plotID": histoName+':'+'PAC02XN00A_Pulse_Height', 
                    "title": 'PAC02XN00A'
                },
                {
                    "plotID": histoName+':'+'PAC03XN00A_Pulse_Height', 
                    "title": 'PAC03XN00A'
                },
                {
                    "plotID": histoName+':'+'PAC04XN00A_Pulse_Height', 
                    "title": 'PAC04XN00A'
                },
                {
                    "plotID": histoName+':'+'PAC05XN00A_Pulse_Height', 
                    "title": 'PAC05XN00A'
                }
            ]
        })

}
    
    dataStore.plotGroups = groups;     //groups to arrange detectors into for dropdowns
    
    // Generate the spectrum lists based on the list of detectors
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();

    // Generate the gain match report table based on the list of detectors
    dataStore._gainMatchReport = new gainMatchReport('gainMatcher', 'setupBar'); 
    dataStore._gainMatchReport.setup(); 

    //user guidance
    deleteNode('detectorMessage');
    document.getElementById('decisionMessage').classList.remove('hidden');
}


function loadData(DAQ){
    // given the list of channels plugged into the DAQ from the ODB, load the appropriate spectra.

    var i, channels = [];
    var Config = {};

    if(dataStore.modeType == 'Online'){
    // If the data is from the online ODB, unpack the data here
    channels = DAQ[0].chan;
    dataStore.PSCchannels = DAQ[0].chan;
    dataStore.PSCaddresses = DAQ[1].PSC;
	dataStore.RunNumber = DAQ[2][ 'Run number' ];
    }else{
	// modeType is Histo
	// If the data is from a histogram file, unpack the data here
	Config = JSON.parse(DAQ);
	dataStore.PSCchannels = [];
	dataStore.PSCaddresses = [];
	
	for(i=0; i<Config.Analyzer[4].Calibrations.length; i++){
	    channels.push(Config.Analyzer[4].Calibrations[i].name);
	    dataStore.PSCchannels.push(Config.Analyzer[4].Calibrations[i].name);
	    dataStore.PSCaddresses.push(Config.Analyzer[4].Calibrations[i].address);
	    if(Config.Analyzer[4].Calibrations[i].name.includes('GRG')){
		keyString = Config.Analyzer[4].Calibrations[i].name + '_Pulse_Height';
		if(!dataStore.midasCalibration[keyString]){ dataStore.midasCalibration[keyString] = []; }
		dataStore.midasCalibration[keyString] = [Config.Analyzer[4].Calibrations[i].offset, Config.Analyzer[4].Calibrations[i].gain, Config.Analyzer[4].Calibrations[i].quad ];
	    }
	}
	// offset, gain and quad are also available in this Config.
	dataStore.RunNumber = dataStore.histoFileName.split("_")[0].replace(/^\D+/g, '').split(".")[0];
    }
    
    //Add the detector type and run number to the name of the Cal file
    if(dataStore.THESEdetectors[0].includes('GRG')){
	document.getElementById('saveCalname').value = 'GRIFFIN-Cal-File-Run'+dataStore.RunNumber+'.cal';
    }else if(dataStore.THESEdetectors[0].includes('PAC')){
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

function updateAnalyzer(){

    // For the ODB it first grabs the PSB table and then sets values only for the channels that are defined there.
    // For the Analyzer we can get a similar list from the viewConfig command with the Histogram file as the argument.
    // That should probably be done for the building of the initial spectrum list for gain-matching if Histogram mode is selected.
    // Need to reformat the URLs generated here for the Analyzer
    
    // bail out if there's no fit yet
    if(Object.keys(dataStore.fitResults).length == 0)
        return;

    var  gain =[], offset = [], quad = [];
    var i, j=0, q, g, o, num=0, position, urls = [];

    //for every channel, update the quads, gains and offsets:
    urls[0]=dataStore.spectrumServer + '?cmd=setCalibration';
    for(i=0; i<dataStore.THESEdetectors.length; i++){
        if( document.getElementById(dataStore.THESEdetectors[i]+'write').checked){
            q = dataStore.fitResults[dataStore.THESEdetectors[i]+'_Pulse_Height'][4][2];
            q = isNumeric(q) ? q : 1;
            quad[i] = q;
            g = dataStore.fitResults[dataStore.THESEdetectors[i]+'_Pulse_Height'][4][1];
            g = isNumeric(g) ? g : 1;
            gain[i] = g;
            o = dataStore.fitResults[dataStore.THESEdetectors[i]+'_Pulse_Height'][4][0];
            o = isNumeric(o) ? o : 0;
            offset[i] = o;

	    // Write a separate URL for each clover
	    if(i>0 && (dataStore.THESEdetectors[i].includes('GRG')) && ((i%4) == 0)){ num++; j=0; urls[num]= dataStore.spectrumServer + '?cmd=setCalibration';}
	    urls[num] += '&channelName'+j+'='+dataStore.THESEdetectors[i]+'&quad'+j+'='+quad[i]+'&gain'+j+'='+gain[i]+'&offset'+j+'='+offset[i];
	    j++;
	    
        }else{
	    // Set some values rather than have these entries undefined for unchecked channels
	    // Channels that did not produce good coefficients are not included in the URLs
            quad[i] = 1;
            gain[i] = 1;
            offset[i] = 0;
	}
    }
    
    //send requests
    for(i=0; i<urls.length; i++){
        XHR(urls[i], 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
        )
    }

    //get rid of the modal
    document.getElementById('dismissAnalyzermodal').click();
}

function updateODB(obj){

    //bail out if there's no fit yet
    if(Object.keys(dataStore.fitResults).length == 0)
        return;

    var channel = obj[0].chan,
        gain = obj[1].gain,
        offset = obj[2].offset,
        quad = obj[3].quadratic,
        i, q, g, o, position, urls = [];

    //for every channel, update the quads, gains and offsets:
    for(i=0; i<channel.length; i++){
        position = dataStore.THESEdetectors.indexOf(channel[i]);
        if( (position != -1) && (document.getElementById(channel[i]+'write').checked)){
            q = dataStore.fitResults[dataStore.THESEdetectors[position]+'_Pulse_Height'][4][2];
            q = isNumeric(q) ? q : 1;
            quad[i] = q;
            g = dataStore.fitResults[dataStore.THESEdetectors[position]+'_Pulse_Height'][4][1];
            g = isNumeric(g) ? g : 1;
            gain[i] = g;
            o = dataStore.fitResults[dataStore.THESEdetectors[position]+'_Pulse_Height'][4][0];
            o = isNumeric(o) ? o : 0;
            offset[i] = o;
        }
    }

    //turn gain and offset arrays into csv strings
    quad = JSON.stringify(quad).slice(1,-1) 
    gain = JSON.stringify(gain).slice(1,-1) 
    offset = JSON.stringify(offset).slice(1,-1) 

    //construct urls to post to
    urls[0] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/quadratic[*]&value='+quad;
    urls[1] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/gain[*]&value='+gain;
    urls[2] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/offset[*]&value='+offset;
    
    //send requests
    for(i=0; i<urls.length; i++){
        XHR(urls[i], 
            'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).', 
            function(){return 0},
            function(error){console.log(error)}
        )
    }

    //get rid of the modal
    document.getElementById('dismissODBmodal').click();
}

function setupManualCalibration(){
    // alternative to the shift-click on plot - set limits automatically then draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    // Set the mode of operation
    dataStore.mode = 'manual';
    
    // Hide the unnessary buttons
    document.getElementById('decisionBarAuto').classList.add('hidden');
    
    // Reveal the peak info inputs
    document.getElementById('setupBar').classList.remove("hidden");

    // Set the decision button to engaged
    document.getElementById('manualCalibration').setAttribute('engaged', 1);
    document.getElementById('manCalibBadge').classList.add('red-text')
    
    //plug in special fit controls
    document.getElementById('fitLow').onclick = dataStore._gainMatchReport.toggleFitMode;
    document.getElementById('fitMid').onclick = dataStore._gainMatchReport.toggleFitMode;
    document.getElementById('fitHigh').onclick = dataStore._gainMatchReport.toggleFitMode;
    document.getElementById('fitvHi').onclick = dataStore._gainMatchReport.toggleFitMode;
    
    // set up shift-click behavior:
    dataStore.viewers[dataStore.plots[0]].shiftclickCallback = shiftclick;
    
    //user guidance
    deleteNode('decisionMessage');
    document.getElementById('waitMessage').classList.remove('hidden');
    
    //identify, register & fetch all spectra
    if(dataStore.modeType == 'Histo'){
	// Histogram mode: get odb data from the histo file via the spectrumServer
	dataStore.ViewConfigQuery = dataStore.spectrumServer + '?cmd=viewConfig&filename=' + dataStore.histoFileDirectoryPath + '/' + dataStore.histoFileName;
	XHR(dataStore.ViewConfigQuery, "Problem getting viewConfig from analyzer server", loadData, function(error){console.log(error)});
    }else{
	// Online mode: get odb data from ODBhost
	promiseScript(dataStore.DAQquery)
    }
}

function setupAutomaticCalibration(sourceType){
    // alternative to the shift-click on plot - set limits automatically then draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    // Set the mode of operation
    dataStore.mode = 'auto';

    // Hide the unnessary buttons
    if(dataStore.THESEdetectors[0].includes('GRG')){
	for(var i=0; i<dataStore.sourceInfo.length; i++){
	    if(dataStore.sourceInfo[i].name != sourceType){
		document.getElementById('automaticCalibration-'+dataStore.sourceInfo[i].name).classList.add('hidden');
	    }
	}
    }
    document.getElementById('manualCalibration').classList.add('hidden');    
    
    // Set the decision button to engaged
    thisID = 'automaticCalibration-' + sourceType;
    thisBadgeID = 'autoCalibBadge-' + sourceType;
    document.getElementById(thisID).setAttribute('engaged', 1);
    document.getElementById(thisBadgeID).classList.add('red-text')
    
    // Reveal the peak info inputs
    document.getElementById('setupBar').classList.remove("hidden");
    
    // Set the search area automatically instead of asking for user input
    autoPeakSearchLimits(sourceType);
    
    //user guidance
    deleteNode('decisionMessage');
    document.getElementById('waitMessage').classList.remove('hidden');

    //identify, register & fetch all spectra
    if(dataStore.modeType == 'Histo'){
	// Histogram mode: get odb data from the histo file via the spectrumServer
	dataStore.ViewConfigQuery = dataStore.spectrumServer + '?cmd=viewConfig&filename=' + dataStore.histoFileDirectoryPath + '/' + dataStore.histoFileName;
	XHR(dataStore.ViewConfigQuery, "Problem getting viewConfig from analyzer server", loadData, function(error){console.log(error)});
    }else{
	// Online mode: get odb data from ODBhost
	promiseScript(dataStore.DAQquery)
    }
    
    // Draw the search region
   dataStore.viewers[dataStore.plots[0]].plotData();

    //plug in special fit controls
    document.getElementById('fitLow').onclick = dataStore._gainMatchReport.toggleFitMode;
    document.getElementById('fitMid').onclick = dataStore._gainMatchReport.toggleFitMode;
    document.getElementById('fitHigh').onclick = dataStore._gainMatchReport.toggleFitMode;
    document.getElementById('fitvHi').onclick = dataStore._gainMatchReport.toggleFitMode;
    
    //user guidance
    deleteNode('regionMessage');
    deleteNode('pickerMessage');

}

function autoPeakSearchLimits(sourceType){
    // alternative to the shift-click on plot - set limits automatically then draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    // Set the peak energies for this source
    if(dataStore.THESEdetectors[0].includes('PAC')){
	// Find the index number for the source information for this sourceType
	var index = dataStore.sourceInfoPACES.map(function(e) { return e.name; }).indexOf(sourceType);
	var lowEnergy  = dataStore.sourceInfoPACES[index].lowEnergy;
	var midEnergy  = dataStore.sourceInfoPACES[index].midEnergy;
	var highEnergy = dataStore.sourceInfoPACES[index].highEnergy;
	var vhiEnergy  = dataStore.sourceInfoPACES[index].vhiEnergy;
    }else{
	// Find the index number for the source information for this sourceType
	var index = dataStore.sourceInfo.map(function(e) { return e.name; }).indexOf(sourceType);
	var lowEnergy  = dataStore.sourceInfo[index].lowEnergy;
	var midEnergy  = dataStore.sourceInfo[index].midEnergy;
	var highEnergy = dataStore.sourceInfo[index].highEnergy;
	var vhiEnergy  = dataStore.sourceInfo[index].vhiEnergy;
    }
    
    // Configure the axis settings
    document.getElementById('logY').onclick();
    document.getElementById('maxX').value = dataStore.sourceInfo[index].maxXValue; 
    document.getElementById('maxX').onchange();
    
    // Set the source details on the page
    document.getElementById('gainMatchercalibrationSource').value = sourceType;
    document.getElementById('peak1').value = lowEnergy;
    document.getElementById('peak2').value = midEnergy;
    document.getElementById('peak3').value = highEnergy;
    document.getElementById('peak4').value = vhiEnergy;

    // Set the limits for the peak searches automatically instead of getting shift-click input from user
    dataStore.searchRegionP1[0] = Math.floor(lowEnergy *0.644);
    dataStore.searchRegionP1[1] = Math.floor(lowEnergy *0.966);
    dataStore.searchRegionP1[2] = 10;
    
    dataStore.searchRegionP2[0] = Math.floor(midEnergy *0.644);
    dataStore.searchRegionP2[1] = Math.floor(midEnergy *0.966);
    dataStore.searchRegionP2[2] = 10;
    
    dataStore.searchRegionP3[0] = Math.floor(highEnergy *0.644);
    dataStore.searchRegionP3[1] = Math.floor(highEnergy *0.966);
    dataStore.searchRegionP3[2] = 10;
    
    dataStore.searchRegionP4[0] = Math.floor(vhiEnergy *0.644);
    dataStore.searchRegionP4[1] = Math.floor(vhiEnergy *0.966);
    dataStore.searchRegionP4[2] = 10;
    
}


function buildCalfile(){
    console.log('Download initiated');

    // Write the Cal file content based on the list in the ODB and the fitted results
    CAL = '';
    
    for(i=0; i<dataStore.PSCchannels.length; i++){
        if(dataStore.PSCchannels[i].slice(0,3) == 'XXX'){ continue; }
       CAL += dataStore.PSCchannels[i]+' { \n';
       CAL += 'Name:	'+dataStore.PSCchannels[i]+'\n';
       CAL += 'Number:	'+i+'\n';
	CAL += 'Address:	0x'+dataStore.PSCaddresses[i].toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
       CAL += 'Digitizer:	GRF16\n';
        if(dataStore.PSCchannels[i].slice(0,3) == dataStore.THESEdetectors[0].slice(0,3)){
	CAL += 'EngCoeff:	'+dataStore.fitResults[dataStore.PSCchannels[i]+'_Pulse_Height'][4][0]+' '+dataStore.fitResults[dataStore.PSCchannels[i]+'_Pulse_Height'][4][1]+' '+dataStore.fitResults[dataStore.PSCchannels[i]+'_Pulse_Height'][4][2]+'\n';
	}else{
       CAL += 'EngCoeff:	0 1 0\n';
	}
	CAL += 'Integration:	0\n';
       CAL += 'ENGChi2:	0\n';
       CAL += 'FileInt:	0\n';
       CAL += '}\n';
       CAL += '\n';
       CAL += '//====================================//\n';
    }

    // Create a download link
    const textBlob = new Blob([CAL], {type: 'text/plain'});
    URL.revokeObjectURL(window.textBlobURL);
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(textBlob);
    downloadLink.download = document.getElementById('saveCalname').value;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
}
