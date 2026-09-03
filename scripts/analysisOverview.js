////////////////////////////////////////////
// main setup
////////////////////////////////////////////
//
// Peak Fitter general work flow:
// Histogram directory is taken from the URL.
// User input is required for a list of peaks to fit in, a list of spectra, in a list of histogram files.
// User input can be provided a JSON script upload, or manual via text input boxes with rapid-fill assistance.
// The peakFitter will then loop through downloading the spectra for one histogram file at a time, and fit all spectra in those spectra.
// Once all peaks in all spectra in all histogram files are fitted the results are displayed in a table, and available for download.
// At the end the analysis script (JSON format) is also available for download for easy repeat of this analysis.
//
//
// Technical workflow description:
// Histogram directory is taken from the URL.
// User input is six lists for histogram filenames, 1d spectrum names, peak centroids to fit in 1d spectra, 2d spectrum names, gate limits for making projections, peak centroids to fit in 2d spectra.
// User clicks a button to launch the analysis process.
// In order to limit and reduce overall memory usage the 1d and 2d raw spectrum data will be dropped between histogram files.
// The work flow in the analysis process will be; download all spectra for first histogram file, make any projections for 2d spectra, fit all singles, fit all projections, add results to table, delete all raw data, repeat for next histogram file in list until the end of the list.
// Most apps have the download all spectra from all runs completed before starting the projections and then peak fitting. So this workflow is different because we dont know how many runfiles there will be.
// Job done.

function setupDataStore(){
  //sets up global variable datastore

  var i, groups = [];

  dataStore = {};

  //network and raw data
  dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //host + port of analyzer server
  dataStore.ODBhost = 'http://grsmid00.triumf.ca:8081/';                  //MIDAS / ODB host + port
  dataStore.ODBrequests = [];                 //request strings for odb parameters (needed by plotcontrol)
  dataStore.xmltimeout = 0; // zero is setting no timeout

  // Histogram directory and filename
  dataStore.histoFileDirectoryPath = '/Users/garns/Work/Data';
  dataStore.histoFileName = '';
  dataStore.histoAutoLoad = false;        // Flag set by the presence of a directory and filename in the URL to automatically load it. Default is off.
  dataStore.Config = {};                  // Place to store the Calibrations from the config file. Used for building Cal files etc.
  dataStore.Midas = {};                  // Place to store the Midas info from the config file.

  // histoChoiceBar
  dataStore.histoChoiceBarContents = ['137Cs'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Analysis Overview';                                   //header title
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [];                                                 //buffer for raw matrix data
  dataStore.matrix = [];                                                 //buffer for objects containing the uncompressed matrix data
  dataStore.hm = {};                                                 //object for 2d matrix stuff
  dataStore.hm._raw = [];                                                 //buffer for raw matrix data
  dataStore.outputRawFlag = true;                                    // When true binary Matrix data will be unpacked to the rawData.data2 array
  dataStore.outputDenseFlag = false;                                 // When true binary Matrix data will be unpacked to the dataStore.hm._raw and dataStore.hm.raw arrays
  dataStore.outputSparseFlag = false;                                // When true binary Matrix data will be unpacked to the sparseData object
  dataStore.outputDeleteFlag = false;                                 // When true the original arrayBuffer will be deleted from dataStore.rawData
  dataStore.activeMatrix = '';                                         // keep track of the current 2d spectrum
  dataStore.activeMatrixXaxisLength = 16;
  dataStore.activeMatrixYaxisLength = 16;
  dataStore.activeMatrixSymmetrized = true;
  dataStore.createdSpectra = {};                                       //initialize empty object for created spectra
  dataStore.createdBG1Spectra = {};                                    //initialize empty object for created background (BG1) spectra
  dataStore.createdBG2Spectra = {};                                    //initialize empty object for created background (BG2) spectra

  //fitting
  dataStore.ROI = {};                                                   //regions of interest to look for peaks in: 'plotname': [[low bin, high bin], [low bin, high bin], ...]
  //                                                                      dataStore.ROI[sourceKey][peakIndex] = [low bin, high bin]
  dataStore.fitResults = {};                                            //fit results: 'plotname': [[amplitude, center, width, intercept, slope, area, FWHM], [amplitude, center, width, intercept, slope, area, FWHM]]
  dataStore.fitResultsData = {};              // Store the data of the curve fitting, 'detector-name':{ 'k1':[[x0,y0],[x1,y1]...], 'k2':[[x0,y0],[x1,y1]...], 'e1':[[x0,y0],[x1,y1]...] }
  dataStore.fitResultsParameters = {};        // Store the parameters of the curve fitting, 'detector-name':{ 'k1':[p0,p1,p2,p3,p4,p5,p6], 'k2':[p0,p1,p2,p3,p4,p5,p6], 'e1':[p0,p1,p2,p3,p4,p5,p6] }
  dataStore.peakOfInterest = null;

  // Final results
  dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared],
  //                                                                                       'pileupk1':[1 0 0 0 0 0 0], 'pileupk2':[1 0 0 0 0 0 0], 'pileupE1':[0 0 0 0 0 0 0],
  //                                                                                       'crosstalk0:[0,1,0,0,0,0,0]', 'crosstalk1:[0,1,0,0,0,0,0]', 'crosstalk2:[0,1,0,0,0,0,0]'}
  dataStore.betaEfficiency = {};  // Place to store beta efficiency information

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.

  // Workflow management and progress tracking
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "analysisOverviewProgress";            // id of the Div with class = "progress-bar ..."
  dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
  dataStore.progressBarTasksCompleted = 0;                           // Number of tasks completed so far for use with the progress bar

  // Script configuration - all are arrays used only as user input
  // The 'peakFitterScript' can be provided by the user as an upload and will be copied into this 'dataStore.peakFitterScript' object
  dataStore.peakFitterScript = {
    'histogramFileNames' : [],                                // List of all the histogram files
    'spectrumList1d' : [],                                    // Names of all the 1d spectra
    'spectrumList1dPeaks' : [],                               // List of all peak centroids to be fitted in the 1d spectra
    'spectrumList2d' : [],                                    // Names of all the 2d spectra
    'spectrumListGates' : [],                                 // List of all the gate limits to make projections from the 2d spectra,
    // Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
    'spectrumListProjectionsPeaks' : []                       // List of all peak centroids to be fitted in the projected 1d spectra from the 2d spectra
  };

  // Actual lists of arrays and objects used in workflow
  // Lists for the histogram filenames, 1d spectrum names, peak centroids to fit in 1d spectra, 2d spectrum names, gate limits for making projections, peak centroids to fit in 2d spectra.
  dataStore.spectrumListHistoFileNames = [];                        // List of all the histogram files
  dataStore.spectrumListHistoFileDetails = {};                      // List of objects containing the run details of the histogram files
  dataStore.spectrumList1d = [];                                    // List of all the 1d spectra
  dataStore.spectrumList1dPeaks = {};                               // List of all peaks to fit in the 1d spectra
  // Format for peaks: 'spectrumname': [1173,1332.0], ...]
  dataStore.spectrumList2d = [];                                    // List of all the 2d spectra
  dataStore.spectrumListGates = {};                                 // List of all the gate limits for the 2d spectra,
  // Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
  dataStore.spectrumListProjections = [];                           // List of all 1d projections from the 2d spectra
  dataStore.spectrumListProjectionsPeaks = {};                      // List of all peaks to fit in the projected 1d spectra from 2d spectra
  // Format for peaks: 'projectionname': [1173,1332.0], ...]
  dataStore.numRunFiles = 0;
  dataStore.num1dSpectra = 0;
  dataStore.num1dPeaks = 0;
  dataStore.num2dSpectra = 0;
  dataStore.num2dGates = 0;
  dataStore.num2dPeaks = 0;

  dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects
  dataStore.cellIndex = dataStore.plots.length;

  // Declare the peakFitterScript object
  dataStore.peakFitterScript = {};
  dataStore.peakFitterScriptTemplate = {};

  // BGO HV alignment histograms
  dataStore.peakFitterScriptTemplate["analysisOverview"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [],
    "spectrumList1dPeaks" : {
      "All": []
    },
    "spectrumList2d" : [],
    "spectrumListGates" : [],
    "spectrumListProjectionsPeaks" : {
      "All":[]
    }
  };

  // analysisOverview specific things
  // dataStore.detTypesData object controls this page
  // Key used for identifying detectorTypes from ODB.
  // Title used for reports in Title.
  dataStore.detTypesData = {
    "GRG":{
      "Title": "HPGe", "matrixName": "GeEnergy_CrystalNum", "maxChans": 64, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "GRS":{
      "Title": "BGO", "matrixName": "BgoEnergy_CrystalNum", "maxChans": 320, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "LBL":{
      "Title": "LaBr3", "matrixName": "Labr3Energy_CrystalNum", "maxChans": 8, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "LBS":{
      "Title": "Ancil. BGO", "matrixName": "BgoAncilEnergy_CrystalNum", "maxChans": 24, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "PAC":{
      "Title": "PACES", "matrixName": "PacesEnergy_CrystalNum", "maxChans": 5, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 15000, "rateError": 20000,
    }, "ZDS":{
      "Title": "ZDS", "matrixName": "ZDS01XN00A_Energy", "maxChans": 1, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 120000, "rateError": 170000,
    }, "SEP":{
      "Title": "SCEPTAR", "matrixName": "SceptarEnergy_CrystalNum", "maxChans": 20, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 40000, "rateError": 60000,
    }, "ART":{
      "Title": "ARIES", "matrixName": "AriesEnergy_CrystalNum", "maxChans": 76, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 50000, "rateError": 100000,
    }, "RCS":{
      "Title": "RCMP", "matrixName": "", "maxChans": 384, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "QED":{
      "Title": "QED", "matrixName": "QED01_E_strips", "maxChans": 64, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }
  };

  // QED spectra
    dataStore.QEDanalysisSpectrumList = [
      "QED_DCS_azimuth_0_180",
    "QED_DCS_azimuth_70_110",
    "QED_DCS_azimuth_93_103"
  , "QED_DCS_azimuth2_0_180"
  , "QED_DCS_azimuth2_10_170"
  , "QED_DCS_azimuth2_20_160"
  , "QED_DCS_azimuth2_30_150"
  , "QED_DCS_azimuth2_40_140"
  , "QED_DCS_azimuth2_50_130"
  , "QED_DCS_azimuth2_60_120"
  , "QED_DCS_azimuth2_70_110"
  , "QED_DCS_azimuth2_80_100"
  , "QED_DCS_azimuth2_85_95"
  , "QED_DCS_azimuth2_93_103"
  ];
    dataStore.QEDanalysisWFList = [
      "QED_DCS_azimuth_TRWF_0_180",
    "QED_DCS_azimuth_TRWF_70_110",
    "QED_DCS_azimuth_TRWF_93_103",
 "QED_DCS_azimuth2_TRWF_0_180"
, "QED_DCS_azimuth2_TRWF_10_170"
, "QED_DCS_azimuth2_TRWF_20_160"
, "QED_DCS_azimuth2_TRWF_30_150"
, "QED_DCS_azimuth2_TRWF_40_140"
, "QED_DCS_azimuth2_TRWF_50_130"
, "QED_DCS_azimuth2_TRWF_60_120"
, "QED_DCS_azimuth2_TRWF_70_110"
, "QED_DCS_azimuth2_TRWF_80_100"
, "QED_DCS_azimuth2_TRWF_85_95"
, "QED_DCS_azimuth2_TRWF_93_103"
  ];

  // Beta efficiency calculations
  dataStore.betaEfficiencyCheck = {};
  dataStore.betaEfficiencyCheck["SCEPTAR"] = {
    "detectorName" : "sceptar",
    "spectrumName" : "Ge_Sum_En_SceptarTagged",
    "histogramName" : "",
    "active" : false,
    "counts" : 0,
    "countsUncertainty" : 0,
    "efficiency" : 0,
    "efficiencyUncertainty" : 0
  };
  dataStore.betaEfficiencyCheck["ZDS"] = {
    "detectorName" : "zds",
    "spectrumName" : "Ge_Sum_En_ZdsTagged",
    "histogramName" : "",
    "active" : false,
    "counts" : 0,
    "countsUncertainty" : 0,
    "efficiency" : 0,
    "efficiencyUncertainty" : 0
  };
  dataStore.betaEfficiencyCheck["ARIES"] = {
    "detectorName" : "aries",
    "spectrumName" : "Ge_Sum_En_AriesTagged",
    "histogramName" : "",
    "active" : false,
    "counts" : 0,
    "countsUncertainty" : 0,
    "efficiency" : 0,
    "efficiencyUncertainty" : 0
  };


  // Pagination for the results and plotting display
  // plotRegion = spectra
  // energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
  // energyCalibrator = Table of all (detector num, fit params, r2)
  // graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
  // graphSection = plot of all the residuals for specific peak
  // Variables for Pagination menu buttons
  dataStore.buttonNames = ["Spectra", "Table of Results"];  // Names to appear on the buttons
  dataStore.buttonIDs = ["plotRegionMenuButton", "graphRegionMenuButton"];    // IDs for the buttons
  dataStore.buttonPages = ["plotRegion", "resultsTableRegion"];                 // Pages (div IDs) to be associated with the buttons

  // Generate THESEdetectors object. Used for building the coefficients table
  dataStore.numberOfClovers = 16;
  dataStore.THESEdetectors = [];
  var crystals = ["B","G","R","W"];
  var letter = ["A"];  // var letter = ["A","B"];
  var num = 0;
  var strips = ["P","N"];
  for(j=0; j<letter.length; j++){
    for(i=1; i<(dataStore.numberOfClovers+1); i++){
      for(k=0; k<4; k++){
        dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];
        num++;
      }
    }
  }

  // Populate channel names for each detector type
  var bgo_letter = ['A','B','C'];
  var keys = Object.keys(dataStore.detTypesData);
  for(var x=0; x<keys.length; x++){

    if(keys[x] == "GRG"){
      for(j=0; j<letter.length; j++){
        for(i=1; i<(dataStore.numberOfClovers+1); i++){
          for(k=0; k<4; k++){
            dataStore.detTypesData[keys[x]].channelNames.push('GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j]);
          }
        }
      }
    }

    if(keys[x] == "GRS"){
      for(j=0; j<letter.length; j++){
        for(i=1; i<(dataStore.numberOfClovers+1); i++){
          for(k=0; k<4; k++){
            for(var m=1; m<6; m++){
              dataStore.detTypesData[keys[x]].channelNames.push('GRS'+alwaysThisLong(i, 2)+crystals[k]+'N0'+m+'X');
            }
          }
        }
      }
    }

    if(keys[x] == "LBL"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      for(k=1; k<9; k++){
        dataStore.detTypesData[keys[x]].channelNames.push('LBL'+alwaysThisLong(k, 2)+'XN00X');
      }
    }

    if(keys[x] == "LBS"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      dataStore.detTypesData[keys[x]].channelNames[1] = "";
      dataStore.detTypesData[keys[x]].channelNames[2] = "";
      for(k=1; k<9; k++){
        for(m=0; m<3; m++){
          dataStore.detTypesData[keys[x]].channelNames.push('LBS'+alwaysThisLong(k, 2)+bgo_letter[m]+'N00X');
        }
      }
    }

    if(keys[x] == "SEP"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      for(k=1; k<21; k++){
        dataStore.detTypesData[keys[x]].channelNames.push('SEP'+alwaysThisLong(k, 2)+'XN00X');
      }
    }

    if(keys[x] == "ART"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      for(k=1; k<77; k++){
        dataStore.detTypesData[keys[x]].channelNames.push('ART'+alwaysThisLong(k, 2)+'XS00X');
      }
    }

    if(keys[x] == "PAC"){ dataStore.detTypesData[keys[x]].channelNames = ['','PAC01XN00A','PAC02XN00A','PAC03XN00A','PAC04XN00A','PAC05XN00A']; }
    if(keys[x] == "ZDS"){ dataStore.detTypesData[keys[x]].channelNames = ['ZDS01XN00A']; }

    if(keys[x] == "QED"){
      for(j=1; j<6; j++){
        for(i=0; i<2; i++){
          for(k=0; k<32; k++){
            dataStore.detTypesData[keys[x]].channelNames.push('QED'+alwaysThisLong(j, 2)+'X'+strips[i]+alwaysThisLong(k, 2)+'X');
          }
        }
      }
    }
  }

}


// Top level promise to control the initial load workflow
Promise.all([
  onloadInitialSetup()
]).then(
  function(){
    // This then is executed after the top level promise then is executed.
    console.log("last then");
    launchAnalysisTasks()
  }
);

// Control the initial load workflow
function onloadInitialSetup(){

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    // Set up the data store and get URL arguments. Once that is done then the event listeners can be added.
    Promise.all([
      setupDataStore(),
      promiseURLArguments(),
      setupEventListeners()
    ]
  ).then(
    function(){
      // viewConfig of the run file
      console.log("First then");
      viewConfigOfHisto(dataStore.histoFileName);
      resolve("success");
    }
  )

});
}

function setupEventListeners(){

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    window.addEventListener('HTMLImportsLoaded', function(e) {

      ///////////////
      // initial setup
      ///////////////
      console.log("Add event listeners...");

      // Inject templates
      dataStore.templates = prepareTemplates(['header', 'plotGrid', 'plotControl', 'analysisOverviewReportContents', 'analysisOverviewReport', 'analysisOverviewReportTable', 'footer']);

      // Header and footer setup
      setupHeader('head', 'Analysis Overview');
      setupFooter('foot');

      // PlotControl is needed for fetching spectra. Here the parent div is hidden
      dataStore._plotControl = new plotControl('plotCtrl', 'horizontal');
      dataStore._plotControl.setup();

      // Spectrum Viewer
      dataStore._plotGrid = new plotGrid('plottingGrid');
      dataStore._plotGrid.setup();
      dataStore._plotGrid.manageCellCreation(null, dataStore.plots[0]);
      deleteNode('plottingGridnewPlotButton'); //don't want additional plots in this app

      // Inject the dismiss button to the messageDiv
      newButton = document.createElement('button');
      newButton.setAttribute('id', 'messageDivDismissButton');
      newButton.setAttribute('class', 'btn btn-default btn-lg');
      newButton.innerHTML = "Dismiss";
      //newButton.style.padding = '4px';
      newButton.onclick = function(){
        ClearErrorConnectingToAnalyzerServer();
      }.bind(newButton);
      document.getElementById('messageDivButton').appendChild(newButton);

      $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      });

      resolve("success");
    });

  });
}

function viewConfigOfHisto(histo){
  console.log('View config of Histogram '+histo);

  // Format check for the data file
  HistoFileDirectory = dataStore.histoFileDirectoryPath;
  if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
    HistoFileDirectory += '/';
  }
  filename = HistoFileDirectory + histo;

  // get the config file from the server/ODB for this histogram
  url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
  XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForOverview, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function processConfigFileForOverview(payload){
  console.log("processConfigFileForOverview");
  // Unpack the response from the server into a local variable
  //  console.log(payload);
  var thisConfig = JSON.parse(payload);

  // Unpack Midas content
  dataStore.Midas = {
    'Run': dataStore.histoFileName,
    'Title': thisConfig.Analyzer[6].Midas[0].Value,
    'EpochTime': thisConfig.Analyzer[6].Midas[1].Value*1000,
    'StartTime': new Date(thisConfig.Analyzer[6].Midas[1].Value*1000),
    'EndTime': new Date((Number(thisConfig.Analyzer[6].Midas[1].Value) + Number(thisConfig.Analyzer[6].Midas[2].Value))*1000),
    'Duration': thisConfig.Analyzer[6].Midas[2].Value
  };

  // Format the epoche time to Vancouver time (where all GRIFFIN data is collected)
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: "short",
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  });

  // Refresh the display
  document.getElementById('widget-title-header').innerHTML = dataStore.Midas.Run+": "+dataStore.Midas.Title;
  document.getElementById('widget-title-times').innerHTML =  formatter.format(dataStore.Midas.StartTime)+" to "+formatter.format(dataStore.Midas.EndTime);
  document.getElementById('widget-title').classList.add('widget-good');
}

function launchAnalysisTasks(){
  console.log("Launch analysis tasks...");

  // Plug in the active spectra names for the 1d histograms
  dataStore._plotControl.activeSpectra = [];
  dataStore.spectrumList1d = ["ZDS01XN00A_Energy", "Ge_Sum_Energy", "Ge_Sum_En_SceptarTagged", "Ge_Sum_En_ZdsTagged", "Ge_Sum_En_AriesTagged", "HPGe_cycle_activity"];
  dataStore.spectrumList1d.push(...dataStore.QEDanalysisSpectrumList);
  dataStore.spectrumList1d.push(...dataStore.QEDanalysisWFList);
  for(var i=0; i<dataStore.spectrumList1d.length; i++){
    dataStore._plotControl.activeSpectra.push(dataStore.spectrumList1d[i]);
  }
  // Plug in the active spectra names for the 2d histograms
  dataStore.spectrumList2d = ["GeEnergy_CrystalNum", "BgoEnergy_CrystalNum", "Labr3Energy_CrystalNum", "BgoAncilEnergy_CrystalNum", "SceptarEnergy_CrystalNum", "PacesEnergy_CrystalNum", "AriesEnergy_CrystalNum", "QED01_E_strips", "cycle_vs_Ge"];
  for(i=0; i<dataStore.spectrumList2d.length; i++){
    dataStore._plotControl.active2dSpectra.push(dataStore.spectrumList2d[i]);
  }

  // Request the first histogram file from the server.
  // This launches a series of promises. Once complete we end with fetchCallback.
  dataStore._plotControl.refreshAll();
}

function fetchCallback(){
  console.log("fetch");
  console.log(dataStore);
  constructRatesOverAllCycles();
  setupBetaEfficiency();
  // performGainmatchingCheck();
  setupQEDplots();
}

function constructRatesAndHitpatterns(){
  // The rates for all detector channels have been received as 2d histograms of channel number vs energy
  var problemString = "Details:";
  var keys = Object.keys(dataStore.detTypesData);

  for(var i=0; i<keys.length; i++){
    if(dataStore.detTypesData[keys[i]].matrixName.length<1){ continue; }
    // Build 2d spectrum name from histogram and matrixName
    var histoName = dataStore.histoFileName.split(".")[0] + ":" + dataStore.detTypesData[keys[i]].matrixName;

    // Zero this counter
    var activeChans=0;

    // Handle ZDS differently because only a 1d histogram
    if(keys[i] == "ZDS"){
      sum=0;
      console.log(keys[i]);
      if(!dataStore.rawData[histoName]){ continue; }
      for(var k=0; k<dataStore.rawData[histoName].length; k++){
        sum += dataStore.rawData[histoName][k];
      }
      // Determine number of active channels
      if(sum>10){ activeChans=1;
        // Determine number of counts for rate calculation and hitpatternData
        dataStore.detTypesData[keys[i]].hitpatternData[0] = sum;
        dataStore.detTypesData[keys[i]].totalHits = sum;
        dataStore.detTypesData[keys[i]].meanRate = sum;
      }
    }else if(!dataStore.rawData[histoName]){ // 2d histogram is missing
      continue;
    }else if(!dataStore.rawData[histoName].data2){ // 2d histogram was not unpacked
      continue;
    }else{
      // Handle this subsystem with 2d histogram
      console.log(keys[i]);
      // Loop through each detector channel in the matrix
      // j is the detector channel number
      // k is the energy channel
      for(var j=0; j<dataStore.rawData[histoName].data2[0].length; j++){
        var sum=0;
        for(var k=0; k<dataStore.rawData[histoName].data2.length; k++){
          sum += dataStore.rawData[histoName].data2[k][j];
        }
        // Determine number of active channels
        if(sum>10){ activeChans++;
          // Determine number of counts in each channel of histogram for rate calculation and hitpatternData
          dataStore.detTypesData[keys[i]].hitpatternData[j] = sum;

          // Add to totals and means
          dataStore.detTypesData[keys[i]].totalHits += sum;
          dataStore.detTypesData[keys[i]].meanRate += sum;
        }
      }
    }
    // Bail out if there are no active channels for this subsystem type
    if(activeChans==0){ continue; }

    // Inject parent div for this widget report
    newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'widget-title-'+keys[i]);
    newDiv.setAttribute('class', 'col-md-2 report report-good');
    document.getElementById('widget-title-ancillaries').appendChild(newDiv);

    // inject template for the contents
    document.getElementById('widget-title-'+keys[i]).innerHTML = Mustache.to_html(
      dataStore.templates.analysisOverviewReportContents,
      {
        'id': keys[i],
        'title': dataStore.detTypesData[keys[i]].Title,
      }
    );

    // Divide by run duration for mean rate
    dataStore.detTypesData[keys[i]].meanRate /= activeChans;
    dataStore.detTypesData[keys[i]].meanRate /= dataStore.Midas.Duration;
    dataStore.detTypesData[keys[i]].activeChans = activeChans;

    // Calculate the median value
    var orderedHitpatternData = dataStore.detTypesData[keys[i]].hitpatternData.filter(element => element !== undefined).toSorted((a, b) => a - b);
    var index = parseInt(orderedHitpatternData.length / 2);
    dataStore.detTypesData[keys[i]].medianRate = orderedHitpatternData[index] / dataStore.Midas.Duration;
    console.log("Mean / Median = "+dataStore.detTypesData[keys[i]].meanRate+" / "+dataStore.detTypesData[keys[i]].medianRate);

    // Exclude outliers using the IQR (Interquartile Range) Method
    var dataset = orderedHitpatternData.slice(0,index);
    var Q1 = dataset[parseInt(dataset.length/2)] / dataStore.Midas.Duration;
    var Q2 = dataStore.detTypesData[keys[i]].medianRate;
    dataset = orderedHitpatternData.slice(index);
    var Q3 = dataset[parseInt(dataset.length/2)] / dataStore.Midas.Duration;
    var IQR = Q3 - Q1;
    console.log("Q1,Q2,Q3,IQR: "+Q1+","+Q2+","+Q3+","+IQR);
    var lowerFence = Q1 - (1.5*IQR);
    var upperFence = Q3 + (1.5*IQR);
    console.log("Lower/Upper Fence: "+lowerFence+", "+upperFence);

    // Check for noisy channels or low-counting channels
    for(var j=0; j<dataStore.detTypesData[keys[i]].hitpatternData.length; j++){
      if((dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration) > upperFence){
        console.log("Noisey "+keys[i]+" channel["+j+"]: "+(dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration)+" kHz where mean is "+dataStore.detTypesData[keys[i]].meanRate+", median is "+dataStore.detTypesData[keys[i]].medianRate+", and upper fence is "+upperFence);
        dataStore.detTypesData[keys[i]].highCounters.push(j);
        console.log("high: "+dataStore.detTypesData[keys[i]].channelNames[j]);
      }
      if((dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration) < lowerFence){
        console.log("Low-counting "+keys[i]+" channel["+j+"]: "+(dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration)+" kHz where mean is "+dataStore.detTypesData[keys[i]].meanRate+", median is "+dataStore.detTypesData[keys[i]].medianRate+", and lower fence is "+lowerFence);
        dataStore.detTypesData[keys[i]].lowCounters.push(j);
        console.log("low: "+dataStore.detTypesData[keys[i]].channelNames[j]);
      }
    }

    // Print statitics to the div
    var string;
    document.getElementById(keys[i]+'-activeChans').innerHTML = dataStore.detTypesData[keys[i]].activeChans+" of "+dataStore.detTypesData[keys[i]].maxChans+" active";
    document.getElementById(keys[i]+'-rates').innerHTML = (dataStore.detTypesData[keys[i]].meanRate/1000).toFixed(1)+"kHz/crystal average";
    if(dataStore.detTypesData[keys[i]].highCounters.length>0){
      string = dataStore.detTypesData[keys[i]].highCounters.length + " counting at a higher rate";
      problemString += "<br>"+dataStore.detTypesData[keys[i]].highCounters.length + " " + dataStore.detTypesData[keys[i]].Title + " counting at a higher rate: ";
      problemString += dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].highCounters[0]];
      for(j=1; j<dataStore.detTypesData[keys[i]].highCounters.length; j++){
        problemString += ", "+dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].highCounters[j]];
      }
      document.getElementById(keys[i]+'-highCounters').innerHTML = string;
    }
    if(dataStore.detTypesData[keys[i]].lowCounters.length>0){
      string = dataStore.detTypesData[keys[i]].lowCounters.length + " counting at a lower rate";
      problemString += "<br>"+dataStore.detTypesData[keys[i]].lowCounters.length + " " + dataStore.detTypesData[keys[i]].Title + " counting at a lower rate: ";
      problemString += dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].lowCounters[0]];
      for(j=1; j<dataStore.detTypesData[keys[i]].lowCounters.length; j++){
        problemString += ", "+dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].lowCounters[j]];
      }
      document.getElementById(keys[i]+'-lowCounters').innerHTML = string;
    }

    // Inject hitpattern plot
    createBasicHitsBarchart(keys[i]+"-plotly-Div",dataStore.detTypesData[keys[i]].hitpatternData,dataStore.detTypesData[keys[i]].Title)

    // Color the Div based on the rates
    if(dataStore.detTypesData[keys[i]].meanRate>dataStore.detTypesData[keys[i]].rateError){
      console.log('error for '+keys[i]);
      document.getElementById('widget-title-'+keys[i]).classList.remove('report-good');
      document.getElementById('widget-title-'+keys[i]).classList.add('report-error');
    }else if(dataStore.detTypesData[keys[i]].meanRate>dataStore.detTypesData[keys[i]].rateWarn
      || dataStore.detTypesData[keys[i]].highCounters.length>0
      || dataStore.detTypesData[keys[i]].lowCounters.length>0){
        console.log('warn for '+keys[i]);
        document.getElementById('widget-title-'+keys[i]).classList.remove('report-good');
        document.getElementById('widget-title-'+keys[i]).classList.add('report-warn');
      }

    }

    // Print the problems string to the problems div
    document.getElementById('widget-title-problems').innerHTML = problemString;
    console.log(dataStore);

  }

  function createBasicHitsBarchart(targetDiv, hitpatternData, title){
    // re-create the specified histogram
    var layout = {
      margin:{ t:0,r:0,b:0,l:0},
      plot_bgcolor: "#222222",
      paper_bgcolor: "#222222",
      range: [0, null]   // Sets the minimum to 0, maximum is auto-calculated
    };

    var labels = [];
    for(var i=1; i<=hitpatternData.length; i++){
      labels.push(title+alwaysThisLong(i,2));
    }

    var hits = {
      x: labels,
      y: hitpatternData,
      type: 'bar'
    };

    // hitpattern bar chart
    Plotly.newPlot(targetDiv, [hits], layout, {displayModeBar: false});
  }

  function constructRatesOverAllCycles(){
    //  var histoName = dataStore.histoFileName.split(".")[0] + ":" + "HPGe_cycle_activity";
    var histoName = dataStore.histoFileName.split(".")[0] + ":" + "cycle_vs_Ge";
    if(!dataStore.rawData[histoName]){ return; }
    if(!dataStore.rawData[histoName].data2[0]){ return; }

    var layout = {
      autosize: true,
      margin:{ t:40,r:50,b:50,l:50,pad:4},
      plot_bgcolor: "#222222",
      paper_bgcolor: "#222222",
      title: 'Total event rate throughout this run',
      xaxis: {
        autorange: true,
        rangeselector: {buttons: [
          {
            count: 1,
            label: '1m',
            step: 'month',
            stepmode: 'backward'
          },
          {
            count: 6,
            label: '6m',
            step: 'month',
            stepmode: 'backward'
          },
          {step: 'all'}
        ]},
        rangeslider: { autorange: true },
        type: 'date'
      },
      yaxis: {
        autorange: "max", // Automatically determines the maximum
        range: [0, null],   // Sets the minimum to 0, maximum is auto-calculated
        type: 'linear'
      }
    };

    // Construct the cycles data from the 2d histogram
    var xData = [], yData = [];
    var cyclesTimeUnit = 100; // Default in grif-replay is 100ms per bin in cycles data

    // First find cycle duration which is less than the axis length
    var thisCycleLength = dataStore.rawData[histoName].YaxisLength;
    var i=0;
    while(dataStore.rawData[histoName].data2[i][0]>0){
      i++;
      if(i>=thisCycleLength){ break; }
    }
    thisCycleLength = i;

    // Build the time and rate data from the 2d histogram into single series suitable for plotting
    var cycleNumber = 0;
    var maxTimeLength = Math.ceil( (dataStore.Midas.Duration * 1000) / cyclesTimeUnit);
    for(var j=0; j<dataStore.rawData[histoName].data2[0].length; j++){
      for(i=0; i<thisCycleLength; i++){
        var thisTime = dataStore.Midas.EpochTime + (cycleNumber * thisCycleLength * cyclesTimeUnit) + (i * cyclesTimeUnit);
        xData.push(thisTime);
        yData.push(dataStore.rawData[histoName].data2[i][j]);

        // Find maximum bin per cycle. Remember the bin index in an array

        if(xData.length>maxTimeLength){ break; }
      }
      if(xData.length>maxTimeLength){ break; }
      cycleNumber++;
    }
    // Trim the zero data from the end
    while(yData[yData.length-1] == 0){
      xData.pop();
      yData.pop();
    }

    // Calculate a more accurate run duration
    var original = dataStore.Midas.Duration;
    console.log("Compared to original MIDAS duration of "+original+" seconds.");
    dataStore.Midas.Duration = parseFloat(xData.length*cyclesTimeUnit)/1000;
    console.log("Run duration from cycles is "+(xData.length*cyclesTimeUnit)+" milliseconds.");

    // Update the Run duration printed in the top widget
    document.getElementById('widget-title-times').innerHTML += ", Duration: "+dataStore.Midas.Duration+"s";

    // Find average of all maximum bin contents. Might need to average over several bins.
    // Find the variance

    var cycleData = [{
      type: "scatter",
      mode: "lines",
      name: "Cycle data",
      x: xData,
      y: yData,
      line: {color: '#17BECF'}
    }];

    Plotly.newPlot('widget-cycles-plotly', cycleData, layout, {displayModeBar: false});

    // Color the Div based on the rates
    document.getElementById('widget-cycles').classList.add('widget-good');
    document.getElementById('widget-cycles-plotly').classList.add('report-good');

    // Now calculate rates and hitpatterns
    constructRatesAndHitpatterns();
  }

  function setupBetaEfficiency(){
    console.log("setupBetaEfficiency function called");

    //var betaEff_keys = ["SCEPTAR", "ZDS", "ARIES"];
    //  var betaEff_names = ["sceptar", "zds", "aries"];
    //  var beta_spectra = ["Ge_Sum_Energy", "Ge_Sum_En_SceptarTagged", "Ge_Sum_En_ZdsTagged", "Ge_Sum_En_AriesTagged"];
    var viewerName = dataStore.plots[0];
    var fileName = dataStore.histoFileName.split(".")[0];
    var theseHistograms = [], thesePeaks = {}, theseLimits=[];
    var sum=0;

    // Add the Ge singles spectrum
    var thisSpectrum = fileName+":"+"Ge_Sum_Energy";
    dataStore.viewers[viewerName].addData(thisSpectrum,dataStore.rawData[thisSpectrum]);
    theseHistograms.push(thisSpectrum);
    sum=0; maxValue=0; maxChan=0;
    for(var j=0; j<dataStore.rawData[thisSpectrum].length; j++){
      sum += dataStore.rawData[thisSpectrum][j];
      if(j>100 && dataStore.rawData[thisSpectrum][j]>maxValue){
        maxValue = dataStore.rawData[thisSpectrum][j];
        maxChan = j;
      }
    }
    if(dataStore.peakOfInterest == null){
      dataStore.peakOfInterest = maxChan;
      document.getElementById('peakOfInterestInput').value = maxChan;
    }
    thesePeaks[thisSpectrum] = [dataStore.peakOfInterest];
    theseLimits.push([-1,-1]);

    var keys = Object.keys(dataStore.betaEfficiencyCheck);
    // Plot spectra for the beta detectors present in this run
    // Add this plot to the list for peak fitting
    for(var i=0; i<keys.length; i++){
      sum=0; maxValue=0; maxChan=0;
      var thisSpectrum = fileName+":"+dataStore.betaEfficiencyCheck[keys[i]].spectrumName;
      if(!dataStore.rawData[thisSpectrum]){ continue; }

      for(var j=0; j<dataStore.rawData[thisSpectrum].length; j++){
        sum += dataStore.rawData[thisSpectrum][j];
        if(j>100 && dataStore.rawData[thisSpectrum][j]>maxValue){
          maxValue = dataStore.rawData[thisSpectrum][j];
          maxChan = j;
        }
      }
      if(sum<100){ continue; } // Skip empty spectra
      dataStore.betaEfficiencyCheck[keys[i]].active = true;
      dataStore.betaEfficiencyCheck[keys[i]].histogramName = thisSpectrum;

      if(dataStore.peakOfInterest == null){
        dataStore.peakOfInterest = maxChan;
        document.getElementById('peakOfInterestInput').value = maxChan;
      }

      dataStore.viewers[viewerName].addData(thisSpectrum,dataStore.rawData[thisSpectrum]);
      theseHistograms.push(thisSpectrum);
      thesePeaks[thisSpectrum] = [dataStore.peakOfInterest];
      theseLimits.push([-1,-1]);
    }

    // Bail out here if we dont have any beta detectors active.
    if(theseHistograms.length<2){
      document.getElementById('widget-beta-efficiency').classList.add('hidden');
      return;
    }

    // Save this list for replotting
    dataStore.betaEfficiencySpectra = theseHistograms;

    // Set the axis limits
    var xMin = (dataStore.peakOfInterest<100) ? 100 : (dataStore.peakOfInterest - 100);
    var xMax = (dataStore.peakOfInterest+100 > 8191) ? 8191 : (dataStore.peakOfInterest + 100);
    dataStore.viewers[viewerName].XaxisLimitMin = xMin;
    dataStore.viewers[viewerName].XaxisLimitMax = xMax;
    dataStore.viewers[viewerName].setAxisType('log');

    // Trigger the initial draw
    dataStore.viewers[viewerName].plotData();

    // Start the fitting routine for singles peaks
    fitPeaksInSeriesOfHistograms(theseHistograms,thesePeaks,"HPGe",theseLimits);
  }

  function fittingCallback(){
    console.log("fittingCallback function");
    var viewerName = dataStore.plots[0];

    // Add the gamma singles
    var histo = dataStore.histoFileName.split(".")[0] + ":Ge_Sum_Energy";
    dataStore.viewers[viewerName].addData(histo,dataStore.rawData[histo]);
    // Update the spectra for each active beta detector
    var keys = Object.keys(dataStore.betaEfficiencyCheck);
    for(var i=0; i<keys.length; i++){
      if(dataStore.betaEfficiencyCheck[keys[i]].active){
        histo = dataStore.betaEfficiencyCheck[keys[i]].histogramName;
        dataStore.viewers[viewerName].addData(histo,dataStore.rawData[histo]);
      }
    }

    // Set the axis limits
    var xMin = (dataStore.peakOfInterest<100) ? 100 : (dataStore.peakOfInterest - 100);
    var xMax = (dataStore.peakOfInterest+100 > 8191) ? 8191 : (dataStore.peakOfInterest + 100);
    dataStore.viewers[viewerName].XaxisLimitMin = xMin;
    dataStore.viewers[viewerName].XaxisLimitMax = xMax;
    dataStore.viewers[viewerName].setAxisType('log');

    // Plot the data
    dataStore.viewers[viewerName].plotData();

    // Print beta Efficiency Results
    calculateBetaEfficiency();
  }

  function calculateBetaEfficiency(){
    console.log("calculateBetaEfficiency function called");
    console.log(dataStore);

    var singlesCounts = dataStore.fitResults[dataStore.histoFileName.split(".")[0] + ":Ge_Sum_Energy"][0][5];
    var singlesCountsUnc = Math.sqrt(singlesCounts);

    var keys = Object.keys(dataStore.betaEfficiencyCheck);
    for(var i=0; i<keys.length; i++){
      if(dataStore.betaEfficiencyCheck[keys[i]].active){
        // First clear any existing results
        dataStore.betaEfficiencyCheck[keys[i]].counts = 0;
        dataStore.betaEfficiencyCheck[keys[i]].countsUncertainty = 0;
        dataStore.betaEfficiencyCheck[keys[i]].efficiency = 0;
        dataStore.betaEfficiencyCheck[keys[i]].efficiencyUncertainty = 0;

        var histo = dataStore.betaEfficiencyCheck[keys[i]].histogramName;
        dataStore.betaEfficiencyCheck[keys[i]].counts = dataStore.fitResults[histo][0][5];
        dataStore.betaEfficiencyCheck[keys[i]].countsUncertainty = Math.sqrt(dataStore.betaEfficiencyCheck[keys[i]].counts)/dataStore.betaEfficiencyCheck[keys[i]].counts;
        dataStore.betaEfficiencyCheck[keys[i]].efficiency = ((dataStore.betaEfficiencyCheck[keys[i]].counts / singlesCounts)*100).toFixed(1);
        dataStore.betaEfficiencyCheck[keys[i]].efficiencyUncertainty = (dataStore.betaEfficiencyCheck[keys[i]].countsUncertainty * dataStore.betaEfficiencyCheck[keys[i]].efficiency).toFixed(2);

        var detName = dataStore.betaEfficiencyCheck[keys[i]].detectorName;
        document.getElementById('betaEff'+detName+'Row').classList.remove('hidden');
        document.getElementById('betaEff'+detName+'Cell1').innerHTML = parseInt(dataStore.betaEfficiencyCheck[keys[i]].counts)+"/"+parseInt(singlesCounts);
        document.getElementById('betaEff'+detName+'Cell2').innerHTML = dataStore.betaEfficiencyCheck[keys[i]].efficiency+" %";
        document.getElementById('betaEff'+detName+'Cell3').innerHTML = "&plusmn;"+dataStore.betaEfficiencyCheck[keys[i]].efficiencyUncertainty+" %";
      }
    }
  }
