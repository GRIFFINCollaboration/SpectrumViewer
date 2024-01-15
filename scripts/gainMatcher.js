////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore

    var i, groups = [];

    dataStore = {};

    //network and raw data
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //host + port of analyzer server
    dataStore.ODBhost = 'http://grsmid00.triumf.ca:8081/';                  //MIDAS / ODB host + port

    dataStore.numberOfClovers = 16;                                     // Default number of clovers is all of the array
    // shouldn't need to change anything below this line -----------------------------------------------------------------------

    dataStore.pageTitle = 'Gain Matcher';                                   //header title
    dataStore.DAQquery = dataStore.ODBhost + '?cmd=jcopy&odb0=/DAQ/PSC/chan&odb1=/DAQ/PSC/PSC&odb2=/Runinfo/Run number&encoding=json-p-nokeys&callback=loadData';
    dataStore.ODBrequests = [                                               //request strings for odb parameters
        dataStore.ODBhost + '?cmd=jcopy&odb0=/DAQ/PSC/chan&odb1=/DAQ/PSC/gain&odb2=/DAQ/PSC/offset&odb3=/DAQ/PSC/quadratic&encoding=json-p-nokeys&callback=updateODB'
    ];
    dataStore.PSCchannels = {};                                             //store the full list of channels in the PSC table for building a Cal file
    dataStore.PSCaddresses = {};                                            //store the full list of addresses in the PSC table for building a Cal file
    dataStore.RunNumber = '';                                               //store the run number for naming the Cal file
    dataStore.rawData = {};                                                 //buffer for raw spectrum data
    //fitting
    dataStore.mode = 'manual';                                              //mode of operation: manual (user defined search regions) or auto (predefined search regions). 
    dataStore.ROI = {};                                                     //regions of interest to look for peaks in: 'plotname': {'ROIupper':[low bin, high bin], 'ROIlower': [low bin, high bin]}
    dataStore.fitResults = {};                                              //fit results: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]
    
    //custom element config
    dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects

    dataStore.resolutionData = [];                                      //dygraphs-sorted peak widths for both peaks, in same order as GRIFFINdetectors: [[detectorIndex, low peak width, high peak width], ...]
    dataStore.lowPeakResolution = [];                                   //low energy peak resolutions, indexed per GRIFFINdetectors
    dataStore.lowPeakResolution.fill(0,(dataStore.numberOfClovers*4*2));                             //start with zeroes
    dataStore.midPeakResolution = [];                                  //as midPeakResolution
    dataStore.midPeakResolution.fill(0,(dataStore.numberOfClovers*4*2));                            //start with zeroes
    dataStore.highPeakResolution = [];                                  //as highPeakResolution
    dataStore.highPeakResolution.fill(0,(dataStore.numberOfClovers*4*2));                           //start with zeroes
    dataStore.vhiPeakResolution = [];                                  //as highPeakResolution
    dataStore.vhiPeakResolution.fill(0,(dataStore.numberOfClovers*4*2));                            //start with zeroes
    dataStore.searchRegionP1 = [];                                         //[x_start, x_finish, y for peak search bar]
    dataStore.searchRegionP2 = [];                                         //[x_start, x_finish, y for peak search bar]
    dataStore.searchRegionP3 = [];                                         //[x_start, x_finish, y for peak search bar]
    dataStore.searchRegionP4 = [];                                         //[x_start, x_finish, y for peak search bar]

    dataStore.sourceInfo = [                                            // Source information and settings
	{"name":  "Co-60", "title":  "60Co", "lowEnergy":  74.97, "midEnergy": 1173.23, "highEnergy": 1332.49, "vhiEnergy": 2614.52, "maxXValue":2650 },
	{"name":  "Co-56", "title":  "56Co", "lowEnergy": 122.06, "midEnergy":  846.77, "highEnergy": 1238.29, "vhiEnergy": 2598.50, "maxXValue":2650 },
	{"name": "Ba-133", "title": "133Ba", "lowEnergy":  81.00, "midEnergy":  356.01, "highEnergy": 1460.85, "vhiEnergy": 2614.52, "maxXValue":2650 },
	{"name": "Cs-137", "title": "137Cs", "lowEnergy":  74.97, "midEnergy":  511.00, "highEnergy":  661.66, "vhiEnergy": 1460.85, "maxXValue":2000 },
	{"name": "Eu-152", "title": "152Eu", "lowEnergy":  39.91, "midEnergy":  121.78, "highEnergy":  344.28, "vhiEnergy": 1408.00, "maxXValue":2000 },
	{"name": "Bi-207", "title": "207Bi", "lowEnergy":  74.97, "midEnergy":  569.70, "highEnergy": 1063.66, "vhiEnergy": 1770.23, "maxXValue":2000 },
	{"name": "Background", "title": "Background", "lowEnergy":  74.97, "midEnergy":  511.00, "highEnergy": 1460.85, "vhiEnergy": 2614.52, "maxXValue":2650 }
    ];
    
    dataStore.GRIFFINdetectors = [                                      //10-char codes of all possible griffin detectors.
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
            'GRG16WN00A',
            'GRG01BN00B',
            'GRG01GN00B',
            'GRG01RN00B',
            'GRG01WN00B',
            'GRG02BN00B',
            'GRG02GN00B',
            'GRG02RN00B',
            'GRG02WN00B',
            'GRG03BN00B',
            'GRG03GN00B',
            'GRG03RN00B',
            'GRG03WN00B',
            'GRG04BN00B',
            'GRG04GN00B',
            'GRG04RN00B',
            'GRG04WN00B',
            'GRG05BN00B',
            'GRG05GN00B',
            'GRG05RN00B',
            'GRG05WN00B',
            'GRG06BN00B',
            'GRG06GN00B',
            'GRG06RN00B',
            'GRG06WN00B',
            'GRG07BN00B',
            'GRG07GN00B',
            'GRG07RN00B',
            'GRG07WN00B',
            'GRG08BN00B',
            'GRG08GN00B',
            'GRG08RN00B',
            'GRG08WN00B',
            'GRG09BN00B',
            'GRG09GN00B',
            'GRG09RN00B',
            'GRG09WN00B',
            'GRG10BN00B',
            'GRG10GN00B',
            'GRG10RN00B',
            'GRG10WN00B',
            'GRG11BN00B',
            'GRG11GN00B',
            'GRG11RN00B',
            'GRG11WN00B',
            'GRG12BN00B',
            'GRG12GN00B',
            'GRG12RN00B',
            'GRG12WN00B',
            'GRG13BN00B',
            'GRG13GN00B',
            'GRG13RN00B',
            'GRG13WN00B',
            'GRG14BN00B',
            'GRG14GN00B',
            'GRG14RN00B',
            'GRG14WN00B',
            'GRG15BN00B',
            'GRG15GN00B',
            'GRG15RN00B',
            'GRG15WN00B',
            'GRG16BN00B',
            'GRG16GN00B',
            'GRG16RN00B',
            'GRG16WN00B'
        ];


    //generate groups for plot selector
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
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'BN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'BN00B'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'GN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'GN00B'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'RN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'RN00B'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'WN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'WN00B'
                }
            ]
        })
    }

    dataStore.plotGroups = groups;                                      //groups to arrange detectors into for dropdowns
    dataStore.cellIndex = dataStore.plots.length;

    //resolution plot
    dataStore.plotInitData = [];
    dataStore.plotInitData[0] = [[0,0,0,0,0], [1,0,0,0,0], [2,0,0,0,0], [3,0,0,0,0], [4,0,0,0,0]];      //initial dummy data
    dataStore.plotInitData[1] = [[0,0,0,0,0], [1,0,0,0,0], [2,0,0,0,0], [3,0,0,0,0], [4,0,0,0,0]];      //initial dummy data
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
            },

            y : {
		     valueRange: [0,5]
		    }
        }
    }
    dataStore.plotStyle[1] = {                                              //dygraphs style object
        labels: ["channel", "Peak1 Width", "Peak2 Width", "Peak3 Width", "Peak4 Width"],
        title: 'Per-Crystal Resolution',
        axisLabelColor: '#FFFFFF',
        colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
        labelsDiv: 'resolutionLegend',
        drawPoints: 'true',
        pointSize: '5',
	strokeWidth: 0,
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
            },

            y : {
		     valueRange: [0,15]
		    }
        }
    }
    dataStore.YAxisMinValue = [[0,0], [0,0]];
    dataStore.YAxisMaxValue = [[0,0], [0,0]];
    dataStore.annotations = [0,0];
    
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

function loadData(DAQ){
    // given the list of channels plugged into the DAQ from the ODB, load the appropriate spectra.

    var i,	
        channels = DAQ[0].chan;
    
    dataStore.PSCchannels = DAQ[0].chan;
    dataStore.PSCaddresses = DAQ[1].PSC;
    dataStore.RunNumber = DAQ[2][ 'Run number' ];
    
    //Add the run number to the name of the Cal file
    document.getElementById('saveCalname').value = 'GRIFFIN-Cal-File-Run'+dataStore.RunNumber+'.cal';
    document.getElementById('saveCalname').onchange();

    
    for(i=0; i<channels.length; i++){
        if(channels[i].slice(0,3) == 'GRG')
            dataStore._plotControl.activeSpectra.push(channels[i] + '_Pulse_Height');
    }

    dataStore._plotControl.refreshAll();
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

    //for every griffin channel, update the quads, gains and offsets:
    for(i=0; i<channel.length; i++){
        position = dataStore.GRIFFINdetectors.indexOf(channel[i]);
        if( (position != -1) && (document.getElementById(channel[i]+'write').checked)){
            q = dataStore.fitResults[dataStore.GRIFFINdetectors[position]+'_Pulse_Height'][4][2];
            q = isNumeric(q) ? q : 1;
            quad[i] = q;
            g = dataStore.fitResults[dataStore.GRIFFINdetectors[position]+'_Pulse_Height'][4][1];
            g = isNumeric(g) ? g : 1;
            gain[i] = g;
            o = dataStore.fitResults[dataStore.GRIFFINdetectors[position]+'_Pulse_Height'][4][0];
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
    promiseScript(dataStore.DAQquery)
}

function setupAutomaticCalibration(sourceType){
    // alternative to the shift-click on plot - set limits automatically then draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    // Set the mode of operation
    dataStore.mode = 'auto';
    
    // Set the decision button to engaged
    thisID = 'automaticCalibration-' + sourceType;
    thisBadgeID = 'autoCalibBadge-' + sourceType;
    document.getElementById(thisID).setAttribute('engaged', 1);
    document.getElementById(thisBadgeID).classList.add('red-text')
    
    // Set the search area automatically instead of asking for user input
    autoPeakSearchLimits(sourceType);
    
    //user guidance
    deleteNode('decisionMessage');
    document.getElementById('waitMessage').classList.remove('hidden');

    //identify, register & fetch all spectra
    promiseScript(dataStore.DAQquery)
    
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

    // Find the index number for the source information for this sourceType
    var index = dataStore.sourceInfo.map(function(e) { return e.name; }).indexOf(sourceType);

    console.log(dataStore.sourceInfo);
    console.log('Index for '+sourceType+' is '+index);

    // Set the peak energies for this source
    var lowEnergy  = dataStore.sourceInfo[index].lowEnergy;
    var midEnergy  = dataStore.sourceInfo[index].midEnergy;
    var highEnergy = dataStore.sourceInfo[index].highEnergy;
    var vhiEnergy  = dataStore.sourceInfo[index].vhiEnergy;

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

function shiftclick(clickCoords){
    // callback for shift-click on plot - draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    var buffer;

    // Use each shiftclick to define a small search region around a specific peak
    
    if(dataStore.searchRegionP1.length == 0){
        dataStore.searchRegionP1[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP1[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP1[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP1[0], dataStore.searchRegionP1[2], dataStore.searchRegionP1[1], dataStore.searchRegionP1[2], '#00FFFF');
        this.plotData();
    } else if (dataStore.searchRegionP2.length == 0){
        dataStore.searchRegionP2[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP2[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP2[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP2[0], dataStore.searchRegionP2[2], dataStore.searchRegionP2[1], dataStore.searchRegionP2[2], '#00FFFF');
        this.plotData();
    } else if (dataStore.searchRegionP3.length == 0){
        dataStore.searchRegionP3[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP3[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP3[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP3[0], dataStore.searchRegionP3[2], dataStore.searchRegionP3[1], dataStore.searchRegionP3[2], '#00FFFF');
        this.plotData();
    } else{
        dataStore.searchRegionP4[0] =  Math.floor(clickCoords.x *0.80);
        dataStore.searchRegionP4[1] =  Math.floor(clickCoords.x *1.20);
        dataStore.searchRegionP4[2] = clickCoords.y;
        this.addLine('searchRegion', dataStore.searchRegionP4[0], dataStore.searchRegionP4[2], dataStore.searchRegionP4[1], dataStore.searchRegionP4[2], '#00FFFF');
        this.plotData();

        //user guidance
        deleteNode('regionMessage');
        document.getElementById('pickerMessage').classList.remove('hidden');

	//only release the fitAll button once we have a search region defined
        document.getElementById('fitAll').classList.remove('disabled');
    }


// Need to check the ordering of the energy regions and reorder if necessary.

    
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
        if(dataStore.PSCchannels[i].slice(0,3) == 'GRG'){
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
