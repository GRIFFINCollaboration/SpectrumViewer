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

  // histoChoiceBar
  dataStore.histoChoiceBarContents = [];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Efficiency Fitter';                                   //header title
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [];                                                 //buffer for raw matrix data
  dataStore.matrix = [];                                                 //buffer for objects containing the uncompressed matrix data
  dataStore.hm = {};                                                 //object for 2d matrix stuff
  dataStore.hm._raw = [];                                                 //buffer for raw matrix data
  dataStore.outputRawFlag = false;                                    // When true binary Matrix data will be unpacked to the rawData.data2 array
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

  // Final results
  dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared],
  //                                                                                       'pileupk1':[1 0 0 0 0 0 0], 'pileupk2':[1 0 0 0 0 0 0], 'pileupE1':[0 0 0 0 0 0 0],
  //                                                                                       'crosstalk0:[0,1,0,0,0,0,0]', 'crosstalk1:[0,1,0,0,0,0,0]', 'crosstalk2:[0,1,0,0,0,0,0]'}

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.

  // Workflow management and progress tracking
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "efficiencyFitterProgress";                        // id of the Div with class = "progress-bar ..."
  dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
  dataStore.progressBarTasksCompleted = 0;                           // Number of tasks completed so far for use with the progress bar
  dataStore.refitPeakID = -1;
  dataStore.refitCallback = function(){ setTimeout(postProcessefficiencyFitter(), 1000); }  // callback function for after a peak refit

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

  // peakFitter scripts for each source
  dataStore.peakFitterScriptTemplate["efficiencyFitter"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : { "All": [], "Ge_Sum_Energy": [], "Addback_Sum_Energy": [] },
    "spectrumList2d" : ["GGoppo",'GG_Addback_oppo'],
    "spectrumListGates" : [],
    "spectrumListProjectionsPeaks" : { "All":[] }
  };
  dataStore.peakFitterScriptTemplate["store"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : { "All": [], "Ge_Sum_Energy": [], "Addback_Sum_Energy": [] },
    "spectrumList2d" : ["GGoppo",'GG_Addback_oppo'],
    "spectrumListGates" : [],
    "spectrumListProjectionsPeaks" : { "All":[] }
  };
  dataStore.peakFitterScriptTemplate["133Ba"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : {
      "All": [], "Ge_Sum_Energy": [80,276.4,302.85,356.01,383.85], "Addback_Sum_Energy": [80,276.4,302.85,356.01,383.85]
    },
    "spectrumList2d" : [
      "GGoppo",'GG_Addback_oppo'
    ],
    "spectrumListGates" : [
      ["y",77,83],
      ["y",157,163],
      ["y",220,226],
      ["y",273,279],
      ["y",300,306],
      ["y",353,359],
      ["y",381,387]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[],
      "y-77-83":[223,277,303],
      "y-157-163":[223],
      "y-220-226":[53.16],
      "y-300-306":[53.16]
    }
  };

  dataStore.peakFitterScriptTemplate["152Eu"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : {
      "All": [], "Ge_Sum_Energy": [121.8, 244.7, 344.3, 411.1, 778.9, 867.4, 964.0,1112.1,1408.0], "Addback_Sum_Energy": [121.8, 244.7, 344.3, 411.1, 778.9, 867.4, 964.0,1112.1,1408.0]
    },
    "spectrumList2d" : [
      "GGoppo",'GG_Addback_oppo'
    ],
    "spectrumListGates" : [
      ["y",119,125],
      ["y",242,248],
      ["y",341,347],
      ["y",408,414],
      ["y",582,590],
      ["y",652,660],
      ["y",684,692],
      ["y",685,693],
      ["y",775,783],
      ["y",837,845],
      ["y",863,871],
      ["y",897,905],
      ["y",915,923],
      ["y",960,968],
      ["y",1108,1116],
      ["y",1166,1174],
      ["y",1403,1413]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[],
      "y-242-248":[719,867],
      "y-408-414":[367],
      "y-582-590":[192],
      "y-652-660":[210],
      "y-685-693":[275,719],
      "y-837-845":[566],
      "y-897-905":[210],
      "y-915-923":[488],
      "y-960-968":[443],
      "y-1108-1116":[295],
      "y-1166-1174":[237],
    }
  };

  dataStore.peakFitterScriptTemplate["60Co"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : {
      "All": [], "Ge_Sum_Energy": [1173.23, 1332.49], "Addback_Sum_Energy": [1173.23, 1332.49]
    },
    "spectrumList2d" : [
      "GGoppo",'GG_Addback_oppo'
    ],
    "spectrumListGates" : [
      ['y',1169,1178],
      ['y',1328,1337]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[]
    }
  };

  dataStore.peakFitterScriptTemplate["56Co"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : {
      "All": [], "Ge_Sum_Energy": [846.76, 1037.84, 1175.1, 1238.29, 1360.21, 1771.35, 2034.76, 2598.46, 3201.95, 3253.42, 3451.15, 3548.27], "Addback_Sum_Energy": [846.76, 1037.84, 1175.1, 1238.29, 1360.21, 1771.35, 2034.76, 2598.46, 3201.95, 3253.42, 3451.15, 3548.27]
    },
    "spectrumList2d" : [
      "GGoppo",'GG_Addback_oppo'
    ],
    "spectrumListGates" : [
      ["y",843,851],
      ["y",1034,1042],
      ["y",1171,1179],
      ["y",1234,1243],
      ["y",1356,1365],
      ["y",1766,1777],
      ["y",1805,1815],
      ["y",2029,2040],
      ["y",2107,2119],
      ["y",2270,2282],
      ["y",2592,2605],
      ["y",3195,3209],
      ["y",3246,3261],
      ["y",3444,3459],
      ["y",3541,3556]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[],
      "y-1034-1042":[733],
      "y-1234-1243":[1360,1963,2015,2212],
      "y-1766-1777":[263],
      "y-1805-1815":[787,1442,1640],
      "y-2107-2119":[1088,1140],
      "y-2270-2282":[977,1271],
      "y-2592-2605":[655]
    }
  };

  dataStore.peakFitterScriptTemplate["11Be"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : ['Ge_Sum_Energy','Addback_Sum_Energy','Hitpattern_Energy'],
    "spectrumList1dPeaks" : {
      "All": [], "Ge_Sum_Energy": [2124.47, 2895.30, 4443.90, 4665.90, 5018.98, 5851.47, 6789.81, 7282.92, 7974.73], "Addback_Sum_Energy": [2124.47, 2895.30, 4443.90, 4665.90, 5018.98, 5851.47, 6789.81, 7282.92, 7974.73]
    },
    "spectrumList2d" : [
      "GGoppo",'GG_Addback_oppo'
    ],
    "spectrumListGates" : [
      ["y",2119,2130],
      ["y",2889,2902],
      ["y",4435,4453],
      ["y",4657,4675],
      ["y",5009,5029],
      ["y",5841,5862],
      ["y",6778,6802],
      ["y",7270,7296],
      ["y",7961,7989]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[],
      "y-2889-2902":[1771],
      "y-2119-2130":[2895,4666,5851],
      "y-5009-5029":[1771]
    }
  };

  // Source Info for performing efficiency Fitting
  dataStore.sourceCalibration = {        // NIST-certification of 60Co sources. Used for calculating absolute efficiency.
    'R-0793': {"date": 1180724400,  "activity": 38480,  "activityUnc": 384.8, "halflife": 1.66372e+8, "lambda": 4.1653e-9},
    'R-0850': {"date": 1221505200,  "activity": 35350,  "activityUnc": 353.5, "halflife": 1.66372e+8, "lambda": 4.1653e-9},
    'R-1105': {"date": 1462129200,  "activity": 38180,  "activityUnc": 381.8, "halflife": 1.66372e+8, "lambda": 4.1653e-9}
  };
  dataStore.keyExchange = {};   // Place for the key exchange to return a source key for a histogram key, or a histogram key for a source key
  dataStore.sourceInfo = {
    '152Eu' : {"name": "Eu-152", "title": "152Eu", 'histoFileName' : '', "maxXValue": 2000,       // General source details
    "progressBarTaskCount":78, // fetch and unpack 2 2d histos (4), fit 9 peaks in 2 1d histos (18), 17 projections in 2 2d histos (34), 22 peaks to fit in projections
    "projectionKeys":[],                 // place to store the keys of the projection histograms for easy allocation later
    "projectionSummingInIndexes":{
      "y-242-248":[6,7],
      "y-408-414":[4],
      "y-582-590":[4],
      "y-652-660":[5],
      "y-685-693":[6,8],
      "y-837-845":[8],
      "y-897-905":[7],
      "y-915-923":[8],
      "y-960-968":[8],
      "y-1108-1116":[8],
      "y-1166-1174":[8]
    },
    "literaturePeaks": [ 121.8, 244.7, 344.3, 411.1, 778.9, 867.4, 964.0, 1112.1, 1408.0 ],     // Peak energies from this source. Literature values taken from ENSDF.
    "literatureIntensity":    [ 0.28531, 0.07549, 0.26590, 0.02237, 0.12928, 0.04228, 0.14510, 0.13667, 0.20868 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
    "literatureIntensityUnc": [ 0.00159, 0.00041, 0.00120, 0.00012, 0.00083, 0.00030, 0.00069, 0.00083, 0.00093 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
    "summingInCorrectionPeaks": [ [[]],  [[]],  [[]],  [[]], // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
    [[367,411.1],[192,586]], // for 778.9 keV
    [[210,656]], // for 867.4 keV
    [[719,244.7],[275,689]], // for 964.0 keV
    [[867.4,244.7],[210,901]], // for 1112.1 keV
    [[719,688],[566,841],[488,919],[443,964.0],[295,1112.1],[237,1170]] // for 1408.0 keV
  ],
  "singles":{
    "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
    "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
    "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
    "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
    "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
    "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
    "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
    "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
    "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
    "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
    "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
  },
  "addback":{
    "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
    "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
    "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
    "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
    "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
    "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
    "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
    "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
    "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
    "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
    "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
  }
},                                                  // Source information and settings
'133Ba' : {"name": "Ba-133", "title": "133Ba", 'histoFileName' : '', "maxXValue": 2000,       // General source details
"progressBarTaskCount":42, // fetch 2 2d histos, fit 5 peaks in 2 1d histos (10), 11 projections in 2 2d histos (22), 12 peaks to fit
"projectionKeys":[],                 // place to store the keys of the projection histograms for easy allocation later
"projectionSummingInIndexes":{
  "y-77-83":[2,3,4],
  "y-157-163":[4],
  "y-220-226":[1],
  "y-300-306":[3]
},
"literaturePeaks": [ 80,        // This peak is the sum of 79 and 80keV - fit them as one.
  276.4, 302.85, 356.01, 383.85 ],     // Peak energies from this source. Literature values taken from ENSDF.
  "literatureIntensity":    [ /*0.02141,*/ 0.32949, 0.07161, 0.18336, 0.62050, 0.08941 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
  "literatureIntensityUnc": [ /*0.00032,*/ 0.00326, 0.00049, 0.00125, 0.00190, 0.00062 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
  "summingInCorrectionPeaks": [ //[[]],// An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
    [[]], // for 80keV
    [[53.16,223]],      // for 276keV. 79 and 80keV are hard to fit.
    [[223,80]],      // for 302keV. 79 and 80keV are hard to fit.
    [[276.4,80],[53.16,302.85]], // for 356keV
    [[302.85,80],[223,160]] ],   // for 383keV
    "singles":{
      "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
      "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
      "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
      "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
      "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
      "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
      "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
      "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
      "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
      "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
      "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
    },
    "addback":{
      "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
      "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
      "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
      "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
      "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
      "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
      "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
      "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
      "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
      "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
      "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
    }
  },
  '56Co' : {"name":  "Co-56", "title":  "56Co", 'histoFileName' : '', "maxXValue":4000,       // General source details
  "progressBarTaskCount":94, // fetch 2 2d histos, fit 13 peaks in 2 1d histos (26), 16 projections in 2 2d histos (32), 30 peaks to fit
  "projectionKeys":[],                 // place to store the keys of the projection histograms for easy allocation later
  "projectionSummingInIndexes":{
    "y-1034-1042":[5],
    "y-1234-1243":[7,8,9,10],
    "y-1766-1777":[6],
    "y-1805-1815":[7,9,10],
    "y-2107-2119":[8,9],
    "y-2270-2282":[9,11],
    "y-2592-2605":[9]
  },
  "literaturePeaks": [ 846.76, 1037.84, 1175.1, 1238.29, 1360.21, 1771.35, 2034.76, 2598.46, 3201.95, 3253.42, 3451.15, 3548.27 ],     // Peak energies from this source. Literature values taken from ENSDF.
  "literatureIntensity":    [ 0.99940, 0.14052, 0.02252, 0.66460, 0.04283, 0.15411, 0.07769, 0.16970, 0.03209, 0.07923, 0.00949, 0.00196 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
  "literatureIntensityUnc": [ 0.00002, 0.00040, 0.00006, 0.00120, 0.00012, 0.00060, 0.00028, 0.00040, 0.00012, 0.00021, 0.00005, 0.00002 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
  "summingInCorrectionPeaks": [ [[]],  [[]],  [[]],  [[]],  [[]], // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
  [[733,1037.84]], // for 1771.35 keV
  [[263,1771.35]], // for 2034.76 keV
  [[1360,1238.29],[787,1810]], // for 2598.46 keV
  [[1963,1238.29],[1088,2113]], // for 3201.95 keV
  [[2015.18,1238.29],[1442,1810],[1140,2113],[977,2276],[655,2598.46]], // for 3253.42 keV
  [[2212,1238.29],[1640,1810]], // for 3451.15 keV
  [[1271,2276]] // for 3548.27 keV
],
"singles":{
  "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
  "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
  "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
  "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
},
"addback":{
  "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
  "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
  "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
  "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
}
},
'11Be' : {"name":  "Be-11", "title":  "11Be", 'histoFileName' : '', "maxXValue":8100,       // General source details
"progressBarTaskCount":48, // fetch 2 2d histos, fit 9 peaks in 2 1d histos (18), 9 projections in 2 2d histos (18), 10 peaks to fit
"projectionKeys":[],                 // place to store the keys of the projection histograms for easy allocation later
"projectionSummingInIndexes":{
  "y-2889-2902":[3],
  "y-2119-2130":[4,6,8],
  "y-5009-5029":[6]
},
"literaturePeaks": [ 2124.47, 2895.30, 4443.90, 4665.90, 5018.98, 5851.47, 6789.81, 7282.92, 7974.73 ],     // Peak energies from this source. Literature values taken from ENSDF.
"literatureIntensity":    [ 1.0, 0.144, 1.0, 0.285, 0.856, 0.532, 0.675, 0.870, 0.462 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"literatureIntensityUnc": [ 0.01, 0.006, 0.01, 0.011, 0.006, 0.012, 0.011, 0.020, 0.011 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"summingInCorrectionPeaks": [ [[]],  [[]],  [[]],   // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
[[1771.31,2895.30]], // for 4665.90 keV
[[2895.30,2124.47]], // for 5018.98 keV
[[]],
[[4665.90,2124.47],[1771.31,5018.98]], // for 6789.81 keV
[[]],
[[5851.47,2124.47]] // for 5018.98 keV
],
"singles":{
  "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
  "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
  "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
  "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
},
"addback":{
  "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
  "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
  "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
  "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
}
},
'60Co' : {"name":  "Co-60", "title":  "60Co", 'histoFileName' : '', "maxXValue": 2000,       // General source details
"progressBarTaskCount":18, // fetch 2 2d histos, fit 2 peaks in 2 1d histos (4), 2 projections in 2 2d histos (4), 0 peaks to fit
"projectionKeys":[],                 // place to store the keys of the projection histograms for easy allocation later
"projectionSummingInIndexes":{},
"literaturePeaks": [ 1173.23, 1332.49],     // Peak energies from this source. Literature values taken from ENSDF.
"literatureIntensity": [ 0.9985, 0.999826 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"literatureIntensityUnc": [ 0.0003, 0.000006 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"summingInCorrectionPeaks": [ [[]], [[]] ],   // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
"singles":{
  "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
  "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
  "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
  "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
},
"addback":{
  "uncorrectedArea": [], "uncorrectedAreaUnc": [], "FWHM": [], "correctedArea": [], "correctedAreaUnc": [],
  "summingInCorrectionCounts": [], "summingInCorrectionCountsUnc": [],   // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], "summingOutCorrectionCountsUnc": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [], "rawEfficiencyUnc": [],               // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [], "relativeEfficiencyUnc": [],     // Relative efficiency calculated for this peak energy after summing correction
  "FCorrectionFactor": [],                                   // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
  "normalizedEfficiency": [], "normalizedEfficiencyUnc": [], // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],                        // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,                                  // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,                               // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [], "absoluteEfficiencyUnc": [],     // Absolute efficiency calculated for this peak energy after summing corrections
},
"sourceCalibration": {},             // NIST-certified calibration details for this source
"Midas": {},                          // Midas info of this historgram file; Title, StartTime, Duration
"timeSinceCertification": 0,         // time in seconds between the certification of the source activity and the start of the run
"sourceActivity": 0,                // source Activity in becquerels at the start of the run
"sourceActivityUnc": 0,             // uncertainty for the source Activity in becquerels at the start of the run
"sourceTotalDecaysDuringThisRun": 0 // Total number of decays of this source during this run
}
};

// Pagination for the results and plotting display
// plotRegion = spectra
// energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
// energyCalibrator = Table of all (detector num, fit params, r2)
// graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
// graphSection = plot of all the residuals for specific peak
// Variables for Pagination menu buttons
dataStore.buttonNames = ["Spectra", "Peak-Fitting Results", "Efficiency Curves Plots", "Efficiency Curves Table"];  // Names to appear on the buttons
dataStore.buttonIDs = ["plotRegionMenuButton", "graphRegionMenuButton", "effCurvesRegionMenuButton", "effResultsRegionMenuButton"];    // IDs for the buttons
dataStore.buttonPages = ["plotRegion", "resultsTableRegion", "effCurvesReportRegion", "effResultsReportRegion"];                 // Pages (div IDs) to be associated with the buttons

//Dygraph plots
dataStore._dataplot = [];                 // Place for all dataplot objects to be created as an array. This makes them indexable and iteratable
dataStore.dataplotData = [];                                       // place for dataplot data
dataStore.efficiencyPlotDataKeyMap = ['Abs', 'Rel', '133Ba', '152Eu', '56Co', '60Co', '11Be','Abs', 'Rel', '133Ba', '152Eu', '56Co', '60Co', '11Be'];
dataStore.efficiencyPlotEquationParameters = [[],[],[],[],[],[],[],[],[],[],[],[],[]];
dataStore.efficiencyPlotDataUnc = [[],[],[],[],[],[],[],[],[],[],[],[],[]]; // Y uncertainty values for drawing the error bars
dataStore.efficiencyPlotY2Data = [[],[],[],[],[],[],[],[],[],[],[],[],[]];
dataStore.efficiencyPlotXData = [[],[],[],[],[],[],[],[],[],[],[],[],[]];
dataStore.efficiencyPlotData = [];
dataStore.efficiencyPlotData[0] = [];    // Absolute efficiency
dataStore.efficiencyPlotData[1] = [];    // Relative efficiency
dataStore.efficiencyPlotData[2] = [];    // 133Ba only
dataStore.efficiencyPlotData[3] = [];    // 152Eu only
dataStore.efficiencyPlotData[4] = [];    // 56Co only
dataStore.efficiencyPlotData[5] = [];    // 60Co only
dataStore.efficiencyPlotData[6] = [];    // 11Be only
dataStore.efficiencyPlotData[7] = [];    // Absolute efficiency, addback
dataStore.efficiencyPlotData[8] = [];    // Relative efficiency, addback
dataStore.efficiencyPlotData[9] = [];    // 133Ba only, addback
dataStore.efficiencyPlotData[10] = [];    // 152Eu only, addback
dataStore.efficiencyPlotData[11] = [];    // 56Co only, addback
dataStore.efficiencyPlotData[12] = [];    // 60Co only, addback
dataStore.efficiencyPlotData[13] = [];    // 11Be only, addback
dataStore.plotInitData = [];
dataStore.plotInitData[0] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[1] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[2] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[3] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[4] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[5] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[6] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[7] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[8] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[9] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[10] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[11] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[12] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[13] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.YAxisMinValue = [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]];
dataStore.YAxisMaxValue = [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]];
dataStore.annotations = [0,0];
dataStore.plotStyle = [];
dataStore.plotStyle[0] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Absolute Singles Efficiency"],
  title: 'Absolute Singles Efficiency', labelsDiv: 'efficiencyPlotAbsLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: true, underlayCallback: drawDygraphCanvasObjects,
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[1] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Relative Singles Efficiency"],
  title: 'Relative Singles Efficiency (no summing corrections)', labelsDiv: 'efficiencyPlotRelLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: true, underlayCallback: drawDygraphCanvasObjects,
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } },
  series: {
    'Relative Efficiency fit': {
      strokeWidth: 3,
      drawPoints: false,
      highlightCircleSize: 3
    }
  }
}
dataStore.plotStyle[2] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 133Ba (unnormalized, no summing corrections)', labelsDiv: 'efficiencyPlot133BaLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[3] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 152Eu (unnormalized, no summing corrections)', labelsDiv: 'efficiencyPlot152EuLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
};
dataStore.plotStyle[4] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 56Co (unnormalized, no summing corrections)', labelsDiv: 'efficiencyPlot56CoLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[5] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 60Co (unnormalized, no summing corrections)', labelsDiv: 'efficiencyPlot60CoLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[6] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 11Be (unnormalized, no summing corrections)', labelsDiv: 'efficiencyPlot60CoLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
// Addback plots:
dataStore.plotStyle[7] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Absolute Addback Efficiency"],
  title: 'Absolute Addback Efficiency', labelsDiv: 'efficiencyABPlotAbsLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: true, underlayCallback: drawDygraphCanvasObjects,
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[8] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Relative Addback Efficiency"],
  title: 'Relative Addback Efficiency (no summing corrections)', labelsDiv: 'efficiencyABPlotRelLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: true, underlayCallback: drawDygraphCanvasObjects,
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } },
  series: {
    'Relative Efficiency fit': {
      strokeWidth: 3,
      drawPoints: false,
      highlightCircleSize: 3
    }
  }
}
dataStore.plotStyle[9] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 133Ba (unnormalized, no summing corrections)', labelsDiv: 'efficiencyABPlot133BaLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[10] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 152Eu (unnormalized, no summing corrections)', labelsDiv: 'efficiencyABPlot152EuLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
};
dataStore.plotStyle[11] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 56Co (unnormalized, no summing corrections)', labelsDiv: 'efficiencyABPlot56CoLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[12] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 60Co (unnormalized, no summing corrections)', labelsDiv: 'efficiencyABPlot60CoLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[13] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 11Be (unnormalized, no summing corrections)', labelsDiv: 'efficiencyABPlot60CoLegend',
  axisLabelColor: '#FFFFFF', colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"], drawPoints: 'true',
  pointSize: 5, highlightCircleSize: 7, strokeWidth: 0.0, legend: 'always', axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
}
setupDataStore();

function setupHistoListSelects(){
  // Remove the select if it already exists
  try{
    document.getElementById('HistoListSelect').remove();
    document.getElementById('HistoListSelectLabel').remove();
  }
  catch(err){ }

  var keys = Object.keys(dataStore.sourceInfo);

  // loop over all sources
  for(i=0; i<keys.length; i++){
    thisTitle = dataStore.sourceInfo[keys[i]].title;

    // Add the title text
    var newLabel = document.createElement("label");
    newLabel.for = 'HistoListSelect'+thisTitle;
    newLabel.id = 'HistoListSelectLabel'+thisTitle;
    newLabel.innerHTML = thisTitle+' Histogram file: ';
    document.getElementById('histoChoice'+thisTitle).appendChild(newLabel);

    // Create a select input for the histo file list
    var newSelect = document.createElement("select");
    newSelect.id = 'HistoListSelect'+thisTitle;
    newSelect.name = 'HistoListSelect'+thisTitle;
    newSelect.onchange = function(){
      var thisKey = this.name.split('Select')[1];
      dataStore.sourceInfo[thisKey].histoFileName = this.value;
    }.bind(newSelect);
    document.getElementById('histoChoice'+thisTitle).appendChild(newSelect);

    // Add the list of histo files as the options
    thisSelect = document.getElementById('HistoListSelect'+thisTitle);
    if(thisTitle == "11Be" || thisTitle == "133Ba" || thisTitle == "56Co"){
      thisSelect.add( new Option("Do not include "+thisTitle, "exclude") );
    }
    for(var j=0; j<dataStore.histoFileList.length; j++){
      thisSelect.add( new Option(dataStore.histoFileList[j], dataStore.histoFileList[j]) );
    }

    // Fire the onchange event for the select with the default value to set it
    document.getElementById('HistoListSelect'+thisTitle).onchange();
  }

  // Create the input and select for the 60Co which defines the activity
  // Add the title text
  var newLabel = document.createElement("label");
  newLabel.for = 'SourceChoiceSelect60Co';
  newLabel.id = 'SourceChoiceSelect60CoLabel';
  newLabel.innerHTML = '60Co source: ';
  document.getElementById('sourceChoice60Co').appendChild(newLabel);

  // Create a select input for the 60Co source list
  var newSelect = document.createElement("select");
  newSelect.id = 'SourceChoiceSelect60Co';
  newSelect.name = 'SourceChoiceSelect60Co';
  newSelect.onchange = function(){
    console.log('onchange of sourceSelect: '+this.value);
    dataStore.sourceInfo['60Co'].sourceCalibration = dataStore.sourceCalibration[this.value];
  }.bind(newSelect);
  document.getElementById('sourceChoice60Co').appendChild(newSelect);

  // Add the list of histo files as the options
  thisSelect = document.getElementById('SourceChoiceSelect60Co');
  var keys = Object.keys(dataStore.sourceCalibration);
  for(i=0; i<keys.length; i++){
    thisSelect.add( new Option(keys[i], keys[i]) );
  }

  // Fire the onchange event for the select with the default value to set it
  document.getElementById('SourceChoiceSelect60Co').onchange();


  // Create the singles Submit button
  newButton = document.createElement('button');
  newButton.setAttribute('id', 'submitHistoFilenameChoicesButton');
  newButton.setAttribute('class', 'btn btn-default btn-lg');
  newButton.innerHTML = "Build efficiency curves";
  newButton.style.padding = '4px';
  newButton.onclick = function(){
    document.getElementById('progressDiv').classList.remove('hidden');
    dataStore.dataType = 'Singles';
    submitHistoFilenameChoices();
  }.bind(newButton);
  document.getElementById('histoChoiceSubmit').appendChild(newButton);

/*
  // Create the Auto-fill for development button
  newButton = document.createElement('button');
  newButton.setAttribute('id', 'autoFillButton');
  newButton.setAttribute('class', 'btn btn-default btn-lg');
  newButton.innerHTML = "Auto-fill for development, ARIES";
  newButton.style.padding = '4px';
  newButton.onclick = function(){
  document.getElementById('HistoListSelect133Ba').value = "run29554.tar";
  document.getElementById('HistoListSelect152Eu').value = "run29547.tar";
  document.getElementById('HistoListSelect56Co').value = "run29550.tar";
  document.getElementById('HistoListSelect60Co').value = "run29556.tar";
  document.getElementById('SourceChoiceSelect60Co').value = "R-1105";
  document.getElementById('HistoListSelect133Ba').onchange();
  document.getElementById('HistoListSelect152Eu').onchange();
  document.getElementById('HistoListSelect56Co').onchange();
  document.getElementById('HistoListSelect60Co').onchange();
  document.getElementById('SourceChoiceSelect60Co').onchange();
}.bind(newButton);
document.getElementById('histoChoiceSubmit').appendChild(newButton);
*/

}

function submitHistoFilenameChoices(){
  // In efficiencyFitter this function is called only once.
  // Here the dataStore.sourceInfo object is set to match the user input.
  // The plotlist menu is setup
  // The progress bar is set up for all sources.

  // TRIGGERING THIS FUNCTION SHOULD DISABLE CHANGING THE SELECTS
  var group = document.getElementsByTagName('select');
  for(var i=0; i<group.length; i++){
    group[i].disabled = true;
  }
  document.getElementById('SourceChoiceSelect60Co').disabled = true;
  document.getElementById('HistoDirectoryInput').disabled = true;
  document.getElementById('submitHistoFilenameChoicesButton').disabled = true;

  // Get the keys of the different sources
  var keys = Object.keys(dataStore.sourceInfo);

  // Remove any sources that are set to exclude
  for(i=0; i<keys.length; i++){
    if(dataStore.sourceInfo[keys[i]].histoFileName == "exclude"){
      console.log("Deleting "+keys[i]+"from dataStore.sourceInfo");
      delete dataStore.sourceInfo[keys[i]];
      document.getElementById('efficiencyPlot'+keys[i]).style.display = 'none';
    }
  }

  // Get the keys of the different sources again in case it changed
  var keys = Object.keys(dataStore.sourceInfo);

  // Get the config file for the 60Co histogram file in order to get the details for absolute efficiency
  // Format check for the data file
  var filename = dataStore.histoFileDirectoryPath;
  if(filename[filename.length]!='/'){
    filename += '/';
  }
  filename += dataStore.sourceInfo['60Co'].histoFileName;
  url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
  XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForRuntime, function(error){ErrorConnectingToAnalyzerServer(error)});

  console.log(dataStore);

  // Build the menu list and set the progressBar tasks
  var groups = [];
  dataStore.progressBarNumberTasks = 0;
  console.log("submitHistoFilenameChoices(): Completed "+dataStore.progressBarTasksCompleted+" tasks of "+dataStore.progressBarNumberTasks);
  for(var i=0; i<keys.length; i++){
    var thisTemplate = dataStore.peakFitterScriptTemplate[keys[i]];
    var histoName = dataStore.sourceInfo[keys[i]].histoFileName.split(".")[0];
    // Build the list of spectra for this histogram name
    var thesePlots = [];
    for(j=0; j<thisTemplate.spectrumList1d.length; j++){
      thesePlots.push(
        {
          "plotID": histoName + ":" + thisTemplate.spectrumList1d[j],
          "title": thisTemplate.spectrumList1d[j]
        });
      }
      // Build the top level dropdown for this histogram name
      groups.push({
        "groupID": histoName,
        "groupTitle": keys[i],
        "plots": thesePlots
      });

      // Add the tasks for this source to the progressBar tasks to track
      dataStore.progressBarNumberTasks += dataStore.sourceInfo[keys[i]].progressBarTaskCount;
      console.log("submitHistoFilenameChoices(): Completed "+dataStore.progressBarTasksCompleted+" tasks of "+dataStore.progressBarNumberTasks);
    }
    dataStore.plotGroups = groups;     //groups to arrange spectra into for dropdowns

    // Generate the spectrum lists based on the list of detectors
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();

    // Generate the efficiencyFitter report table
    dataStore._efficiencyFitterReport = new efficiencyFitterReport('peakFitter','effCurves','effResults');
    dataStore._efficiencyFitterReport.setup();

    // ORIGINAL Generate the Efficiency Fitter report table
    //  dataStore._efficiencyFitterReport = new efficiencyFitterReport('efficiencyFitter');
    //  dataStore._efficiencyFitterReport.setup();

    // Reveal the pagnination menu for the subpages
    document.getElementById('menu').classList.remove('hidden');

    // Draw the search region
    dataStore.viewers[dataStore.plots[0]].plotData();

    // Set the current source which will be used to grab the template in launchPeakFittingProcess()
    // launchPeakFittingProcess() will be called multiple times with each value of datatStore.currentSource
    dataStore.currentSource = "152Eu";

    // Now we have all the user input organized, start the fetching, projecting and fitting processes.
    launchPeakFittingProcess();

    console.log(dataStore);
  }


  function launchPeakFittingProcess(){
    // In efficiencyFitter this function is called multiple times with different values of datatStore.currentSource.
    // This is the start of the automated process
    // The work flow in the analysis process will be; download all spectra for first histogram file, make any projections for 2d spectra, fit all singles, fit all projections, add results to table, delete all raw data, repeat for next histogram file in list until the end of the list.
    // The workflow in functions will be:
    // launchPeakFittingProcess() (requests first file in the list)
    // fetchCallback()
    // createAllLocalMatrices() - this is matrix unpacking into local storage - loops: createLocalMatrices(i) which loops: packZcompressed()
    // projectAllMatrices() -
    // projectionsCallback()
    // fitAllSinglesPeaks() - loops: fitSpectra()
    // fitAllProjectionsPeaks() - loops: fitSpectra()
    // fittingCallback() - calls populateReportTable(), clearLocalMemory() then if more histogram files it requests the next file.
    //

    ///////////////
    // Setup the peakFitting script
    ///////////////

    console.log("launchPeakFittingProcess(): Completed "+dataStore.progressBarTasksCompleted+" tasks of "+dataStore.progressBarNumberTasks);
    // Grab the template peak-fitting script to a local copy here
    var thisScript = {};
    thisScript = dataStore.peakFitterScriptTemplate[dataStore.currentSource];

    // Get the user input on histogramFileNames
    thisScript.histogramFileNames.push(dataStore.sourceInfo[dataStore.currentSource].histoFileName);

    // Setup the peak-fitting script from the template
    receiveScript(JSON.stringify(thisScript));

    ////////////////
    // Now set up for the start of the process
    ////////////////

    // Plug in the active spectra names for the 1d histograms
    for(var i=0; i<dataStore.spectrumList1d.length; i++){
      dataStore._plotControl.activeSpectra.push(dataStore.spectrumList1d[i]);
    }
    // Plug in the active spectra names for the 2d histograms
    for(i=0; i<dataStore.spectrumList2d.length; i++){
      dataStore._plotControl.active2dSpectra.push(dataStore.spectrumList2d[i]);
    }

    // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
    dataStore.histoFileName = dataStore.currentHistoFileName = dataStore.spectrumListHistoFileNames[0];

    // Request the Config for this histogram to get the addresses and calibrations needed for building the Cal file
    // This also gets the midas info about this run (title, start time, duration)
    viewConfigOfHisto(dataStore.histoFileName);

    // change information message
    document.getElementById('histogramMessage').classList.add('hidden');
    document.getElementById('fetchingMessage').classList.remove('hidden');

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'Fetching';

    // Request the first histogram file from the server.
    // This launches a series of promises. Once complete we end with fetchCallback.
    dataStore._plotControl.refreshAll();

  };

  function fetchCallback(){

    // change information message
    document.getElementById('fetchingMessage').classList.add('hidden');
    document.getElementById('projectionsMessage').classList.remove('hidden');

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'Projections';

    // Create projectionsList for the input of the function projectAllMatrices(projectionsList)
    // projectionsList is an array of objects.
    // Each object contains the "matrixName" which is a valid key for the dataStore.matrix array.
    // Each object also contains the "gateDetails" which is an array of gates specific to that 2d spectrum.
    // Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
    // Where BG1SF is the Scaling Factor for a projection between bins BG1Min and BG1Max which will be subtracted from the main Gate projection between bins gateMin and gateMax onto the 'axis' axis.
    var projectionsList = [];
    var histoName = dataStore.histoFileName.split(".")[0];
    for(var i=0; i<dataStore.spectrumList2d.length; i++){
      for(var j=0; j<dataStore.spectrumListGates[dataStore.spectrumList2d[i]].length; j++){
        projectionsList.push(
          {
            "matrixName": histoName  + ":" + dataStore.spectrumList2d[i],
            "gateDetails": dataStore.spectrumListGates[dataStore.spectrumList2d[i]][j]
          });
        }
      }

      // Make the projections needed from each matrix
      projectAllMatrices(projectionsList,true,histoName);
    }

    function projectionsCallback(){

      // Save the spectrumList1dPeaks and spectrumListProjectionsPeaks to the store.
      // We need these later for addFitLines for the refit select
      dataStore.peakFitterScriptTemplate["store"].spectrumList1dPeaks = Object.assign(dataStore.peakFitterScriptTemplate["store"].spectrumList1dPeaks, dataStore.peakFitterScript.spectrumList1dPeaks);
      dataStore.peakFitterScriptTemplate["store"].spectrumListProjectionsPeaks = Object.assign(dataStore.peakFitterScriptTemplate["store"].spectrumListProjectionsPeaks, dataStore.peakFitterScript.spectrumListProjectionsPeaks);

      // change information message
      document.getElementById('projectionsMessage').classList.add('hidden');
      document.getElementById('fittingSinglesMessage').classList.remove('hidden');

      // Set the current task to keep track of our progress
      dataStore.currentTask = 'SinglesFitting';

      // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
      var histoName = dataStore.histoFileName.split(".")[0];
      var spectrumList = [];
      dataStore.spectrumList1d.forEach((element) => spectrumList.push(histoName+":"+element));

      // Start the whole fitting routine for singles peaks
      fitPeaksInSeriesOfHistograms(spectrumList,dataStore.spectrumList1dPeaks,"HPGe");
    }

    function fittingCallback(){
      // All fitting has now been completed
      console.log("fittingCallback in newEfficiencyFitter for source "+dataStore.currentSource+", "+dataStore.currentHistoFileName);

      if(dataStore.currentTask == 'SinglesFitting'){
        // Now perform peak fitting for projections

        // change information message
        document.getElementById('fittingSinglesMessage').classList.add('hidden');
        document.getElementById('fittingSummingMessage').classList.remove('hidden');

        // Set the current task to keep track of our progress
        dataStore.currentTask = 'ProjectionsFitting';

        // Create list of projections to fit for this histogram file
        var theseProjections = [];
        var histoName = dataStore.currentHistoFileName.split(".")[0];
        for(var i=0; i<dataStore.spectrumListProjections.length; i++){
          // Only process the newly created projections for the current histogram file
          if(dataStore.spectrumListProjections[i].includes(histoName)){
            theseProjections.push(dataStore.spectrumListProjections[i]);
          }
        }

        // Save this list of keys for the projections to assist later processing
        var keys = Object.keys(dataStore.spectrumListProjectionsPeaks);
        for(var i=0; i<keys.length; i++){
          if(!keys[i].includes("run")){ continue; } // Only want keys with a histogram included
          dataStore.sourceInfo[dataStore.currentSource].projectionKeys.push(keys[i]);
        }

        // Start the fitting routine for projections peaks for this run file
        fitPeaksInSeriesOfHistograms(theseProjections,dataStore.spectrumListProjectionsPeaks,"HPGe");
        return;
      }

      // If we have not recieved the histograms from all files yet, request the histograms from the next filename
      var keys = Object.keys(dataStore.sourceInfo);
      if(dataStore.currentSource != keys[keys.length-1]){

        for(var i=0; i<keys.length; i++){
          if(dataStore.currentSource == keys[i]){
            dataStore.currentSource = keys[i+1];
            break;
          }
        }

        // Request spectra from the server
        launchPeakFittingProcess();
        return;
      }

      // Now we are done.
      // Reveal the download buttons
      document.getElementById('saveCSVDiv').classList.remove('hidden');
      document.getElementById('saveEffCSVDiv').classList.remove('hidden');
      // efficiencyFitter uses 4 scripts. This button needs a custom function that combines all four scripts.
      //  document.getElementById('saveScriptDiv').classList.remove('hidden');
      document.getElementById('saveRootDiv').classList.remove('hidden');
      document.getElementById('saveGNUDiv').classList.remove('hidden');

      // change information message
      document.getElementById('fittingSummingMessage').classList.add('hidden');
      document.getElementById('efficiencyMessage').classList.remove('hidden');

      console.log(dataStore);
      console.log("Finished");
      console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

      // Copy back the full lists of spectrumList1dPeaks and spectrumListProjectionsPeaks from the store to the live version.
      // We need these for addFitLines to populate the refit select
      dataStore.peakFitterScript.spectrumList1dPeaks = dataStore.peakFitterScriptTemplate["store"].spectrumList1dPeaks;
      dataStore.peakFitterScript.spectrumListProjectionsPeaks = dataStore.peakFitterScriptTemplate["store"].spectrumListProjectionsPeaks;

      // Launch the post-processing
      postProcessefficiencyFitter();
    }


    function postProcessefficiencyFitter(){
      console.log("Post-Process efficiecny fitter");

      // Post processing for efficiency Fitter
      //
      // Collect the fitting results from the fitResults object into the arrays that are used.
      // Perform normalizations

      console.log(dataStore);

      var keys = Object.keys(dataStore.sourceInfo);

      // Copy the area of the fits into the sourceInfo arrays
      for(i=0; i<keys.length; i++){
        var histoKey = dataStore.sourceInfo[keys[i]].histoFileName.split(".")[0]+":Ge_Sum_Energy";
        var histoKeyAB = dataStore.sourceInfo[keys[i]].histoFileName.split(".")[0]+":Addback_Sum_Energy";
        for(var j=0; j<dataStore.sourceInfo[keys[i]].literaturePeaks.length; j++){
          // Save the uncorrected area from the peak fit
          dataStore.sourceInfo[keys[i]]["singles"].uncorrectedArea[j] = dataStore.fitResults[histoKey][j][5];
          dataStore.sourceInfo[keys[i]]["singles"].uncorrectedAreaUnc[j] = Math.sqrt(dataStore.fitResults[histoKey][j][5]);
          dataStore.sourceInfo[keys[i]]["addback"].uncorrectedArea[j] = dataStore.fitResults[histoKeyAB][j][5];
          dataStore.sourceInfo[keys[i]]["addback"].uncorrectedAreaUnc[j] = Math.sqrt(dataStore.fitResults[histoKeyAB][j][5]);
          // Create and zero the entries for the summing-in corrections here
          dataStore.sourceInfo[keys[i]]["singles"].summingInCorrectionCounts[j] = 0;
          dataStore.sourceInfo[keys[i]]["singles"].summingInCorrectionCountsUnc[j] = 0;
          dataStore.sourceInfo[keys[i]]["addback"].summingInCorrectionCounts[j] = 0;
          dataStore.sourceInfo[keys[i]]["addback"].summingInCorrectionCountsUnc[j] = 0;

          // The summing-out correction is the total number of counts in the 180 degree coincidence multiplied by the F factor.
          // The F factor is determined from the number of active crystals which contributed to this 180degree coincidence matrix.
          // F factor will be deduced from the Hittpattern for this source histrogram file.
          for(var k=0; k<dataStore.sourceInfo[keys[i]].projectionKeys.length; k++){
            if(parseInt(dataStore.sourceInfo[keys[i]].projectionKeys[k].split("y-")[1].split("-")[0]) < dataStore.sourceInfo[keys[i]].literaturePeaks[j]
            && parseInt(dataStore.sourceInfo[keys[i]].projectionKeys[k].split("y-")[1].split("-")[1]) > dataStore.sourceInfo[keys[i]].literaturePeaks[j] ){
              if(dataStore.sourceInfo[keys[i]].projectionKeys[k].includes("Addback")){
                dataStore.sourceInfo[keys[i]]["addback"].summingOutCorrectionCounts[j] = dataStore.createdSpectra[dataStore.sourceInfo[keys[i]].projectionKeys[k]].reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a), 0);
                dataStore.sourceInfo[keys[i]]["addback"].summingOutCorrectionCountsUnc[j] = Math.ceil(Math.sqrt(dataStore.sourceInfo[keys[i]]["addback"].summingOutCorrectionCounts[j]));

              }else{
                dataStore.sourceInfo[keys[i]]["singles"].summingOutCorrectionCounts[j] = dataStore.createdSpectra[dataStore.sourceInfo[keys[i]].projectionKeys[k]].reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a), 0);
                dataStore.sourceInfo[keys[i]]["singles"].summingOutCorrectionCountsUnc[j] = Math.ceil(Math.sqrt(dataStore.sourceInfo[keys[i]]["singles"].summingOutCorrectionCounts[j]));
              }
            }
          }
        }
      }

      // Add the area of the fits to the Summing-In correction of the appropriate peak
      for(i=0; i<keys.length; i++){
        var thisProjectionsListIndexes = dataStore.sourceInfo[keys[i]].projectionSummingInIndexes;
        var thisProjectionsList = dataStore.sourceInfo[keys[i]].projectionKeys;
        var indexKeys = Object.keys(thisProjectionsListIndexes);
        for(var j=0; j<indexKeys.length; j++){
          for(var k=0; k<thisProjectionsList.length; k++){
            // Identify the projection associated with this summing-in correction
            if(thisProjectionsList[k].includes(indexKeys[j])){
              for(var m=0; m<thisProjectionsListIndexes[indexKeys[j]].length; m++){
                var thisIndex = thisProjectionsListIndexes[indexKeys[j]][m];
                if(thisProjectionsList[k].includes("Addback")){
                  dataStore.sourceInfo[keys[i]]["addback"].summingInCorrectionCounts[thisIndex] += dataStore.fitResults[thisProjectionsList[k]][m][5];
                  dataStore.sourceInfo[keys[i]]["addback"].summingInCorrectionCountsUnc[thisIndex] += parseInt(Math.sqrt(dataStore.fitResults[thisProjectionsList[k]][m][5])*Math.sqrt(dataStore.fitResults[thisProjectionsList[k]][m][5]));
                }else{
                  dataStore.sourceInfo[keys[i]]["singles"].summingInCorrectionCounts[thisIndex] += dataStore.fitResults[thisProjectionsList[k]][m][5];
                  dataStore.sourceInfo[keys[i]]["singles"].summingInCorrectionCountsUnc[thisIndex] += parseInt(Math.sqrt(dataStore.fitResults[thisProjectionsList[k]][m][5])*Math.sqrt(dataStore.fitResults[thisProjectionsList[k]][m][5]));
                }
              }
            }
          }
        }
      }

      console.log(dataStore);

      // The data for all summing-in and summing-out corrections have now been collected.
      // The summing corrections will be performed in the updateTable function during the loop over all peaks for all sources
      var dataKey = ["singles","addback"];
      for(var j=0; j<dataKey.length; j++){
        for(i=0; i<keys.length; i++){
          currentSource = keys[i];
          for(currentPeak=0; currentPeak<dataStore.sourceInfo[currentSource]['literaturePeaks'].length; currentPeak++){

            // Calculate the raw efficiency (relative efficiency without summing corrections)
            dataStore.sourceInfo[currentSource][dataKey[j]].rawEfficiency[currentPeak] = parseFloat((dataStore.sourceInfo[currentSource][dataKey[j]].uncorrectedArea[currentPeak]/dataStore.sourceInfo[currentSource].literatureIntensity[currentPeak]).toFixed(2));

            // The uncertainties of the summing-in peak counts are added in quadrature, to complete that calculation we perform the square root here.
            dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCountsUnc[currentPeak] = Math.ceil(Math.sqrt(dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCountsUnc[currentPeak]));

            // Calculate the corrected Area from the uncorrected area, summing-in and summing-out
            dataStore.sourceInfo[currentSource][dataKey[j]].correctedArea[currentPeak] = parseInt(dataStore.sourceInfo[currentSource][dataKey[j]].uncorrectedArea[currentPeak]) + parseInt(dataStore.sourceInfo[currentSource][dataKey[j]].summingOutCorrectionCounts[currentPeak]) - parseInt(dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCounts[currentPeak]);

            // Add in quadrature the uncertainties for the summing corrections and uncorrected area
            dataStore.sourceInfo[currentSource][dataKey[j]].correctedAreaUnc[currentPeak] = parseInt(
              Math.ceil(Math.sqrt(
                (dataStore.sourceInfo[currentSource][dataKey[j]].uncorrectedAreaUnc[currentPeak]*dataStore.sourceInfo[currentSource][dataKey[j]].uncorrectedAreaUnc[currentPeak])
                + (dataStore.sourceInfo[currentSource][dataKey[j]].summingOutCorrectionCountsUnc[currentPeak]*dataStore.sourceInfo[currentSource][dataKey[j]].summingOutCorrectionCountsUnc[currentPeak])
                +
                (dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCountsUnc[currentPeak]*dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCountsUnc[currentPeak])
              ))
            );

            // Calculate the relative efficiency (relative efficiency with summing corrections)
            dataStore.sourceInfo[currentSource][dataKey[j]].relativeEfficiency[currentPeak] = parseFloat((dataStore.sourceInfo[currentSource][dataKey[j]].correctedArea[currentPeak]/dataStore.sourceInfo[currentSource].literatureIntensity[currentPeak]).toFixed(2));

            // Combine in quadrature the uncertainties in the input quantities
            dataStore.sourceInfo[currentSource][dataKey[j]].relativeEfficiencyUnc[currentPeak] =  parseFloat(
              Math.ceil(Math.sqrt(
                (dataStore.sourceInfo[currentSource][dataKey[j]].correctedAreaUnc[currentPeak]*dataStore.sourceInfo[currentSource][dataKey[j]].correctedAreaUnc[currentPeak])
                + (dataStore.sourceInfo[currentSource].literatureIntensityUnc[currentPeak]*dataStore.sourceInfo[currentSource].literatureIntensityUnc[currentPeak])
              ))
            );

          }// end of peak for
        }// end of source for
      }// end of dataKey for

      console.log(dataStore);

      //Populate the peakFitter table with all the results
      dataStore._efficiencyFitterReport.updatePeakFitterTable();

      // Now we have all peaks fitted for singles and summing corrections
      //  dataStore._efficiencyFitterReport.performNormalizations();
      performNormalizations();

      // Show the plots subpage
      document.getElementById("effCurvesRegionMenuButton").click();
    }


    function drawDygraphCanvasObjects(ctx, area, layout) {

      // Identify which graph this is
      if(layout.maindiv_.id.includes('Abs') && layout.maindiv_.id.includes('AB')){
        var thisPlotID = 7;
      }else if(layout.maindiv_.id.includes('Rel') && layout.maindiv_.id.includes('AB')){
        var thisPlotID = 8;
      }else if(layout.maindiv_.id.includes('Abs')){
        var thisPlotID = 0;
      }else if(layout.maindiv_.id.includes('Rel')){
        var thisPlotID = 1;
      }else{ console.log('Unrecognized Div for dygraph drawEfficiencyLine'); return;}

      // Bail out if there is no data yet
      if (typeof(dataStore._dataplot[thisPlotID].dygraph) == 'undefined') return;  // won't be set on the initial draw.
      if (dataStore.efficiencyPlotData.length<1) return;  // won't be set on the initial draw.
      if (dataStore.efficiencyPlotData[thisPlotID].length<1) return;  // won't be set on the initial draw.

      drawDygraphEfficiencyLine(thisPlotID, ctx, area, layout);
      drawDygraphErrorBars(thisPlotID, ctx, area, layout);
    }

    function drawDygraphEfficiencyLine(thisPlotID, ctx, area, layout) {
      console.log('drawLines');

      var range = [0,5000];
      var params = dataStore.efficiencyPlotEquationParameters[thisPlotID];
      var color = '#E67E22';
      var step = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.0;

      var y1 = HPGeEfficiency(params, Math.log(parseFloat(range[0]/1000)));
      var p1 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(range[0], y1);
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(p1[0], p1[1]);
      for(i=range[0]+step; i<=range[1]; i+=step){
        // HPGeEfficiency() expects energy in MeV and the natural log.
        y1 = HPGeEfficiency(params, Math.log(parseFloat(i/1000)));
        var p1 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(i, y1);
        ctx.lineTo(p1[0], p1[1]);
      }
      ctx.stroke();
    }

    function drawDygraphErrorBars(thisPlotID, ctx, area, layout) {
      console.log('drawErrorBars');
      console.log(dataStore.efficiencyPlotXData[thisPlotID]);
      console.log(dataStore.efficiencyPlotData[thisPlotID]);
      console.log(dataStore.efficiencyPlotDataUnc[thisPlotID]);

      var range = [0,5000];
      var params = dataStore.efficiencyPlotEquationParameters[thisPlotID];
      var color = '#AAE66A';
      var step = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;

      for(i=0; i<dataStore.efficiencyPlotXData[thisPlotID].length; i++){
        x1 = dataStore.efficiencyPlotXData[thisPlotID][i];
        y1 = dataStore.efficiencyPlotData[thisPlotID][i] - dataStore.efficiencyPlotDataUnc[thisPlotID][i];
        y2 = dataStore.efficiencyPlotData[thisPlotID][i] + dataStore.efficiencyPlotDataUnc[thisPlotID][i];
        var p1 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(x1, y1);
        var p2 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(x1, y2);

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }

    }

    function processConfigFileForRuntime(payload){
      // The run duration is required for calculating the absolute efficiency.
      // The run start date and time is required for calculating the source activity at the time of the data collection.
      // Unpack the response from the server into a local variable
      console.log(payload);
      var thisConfig = JSON.parse(payload);
      console.log(thisConfig.Analyzer[6].Midas);

      // Unpack Midas content
      dataStore.sourceInfo['60Co'].Midas = {
        'Title': thisConfig.Analyzer[6].Midas[0].Value,
        'StartTime': thisConfig.Analyzer[6].Midas[1].Value,
        'Duration': thisConfig.Analyzer[6].Midas[2].Value,
      };

      // Calculate the time in seconds between the certification of the source activity and the run start
      dataStore.sourceInfo['60Co'].timeSinceCertification = dataStore.sourceInfo['60Co'].Midas.StartTime - dataStore.sourceInfo['60Co'].sourceCalibration.date;

      // Calculate the source activity at the time of the run start
      dataStore.sourceInfo['60Co'].sourceActivity = dataStore.sourceInfo['60Co'].sourceCalibration.activity * Math.exp(-1.0*dataStore.sourceInfo['60Co'].sourceCalibration.lambda*dataStore.sourceInfo['60Co'].timeSinceCertification);
      dataStore.sourceInfo['60Co'].sourceActivityUnc = dataStore.sourceInfo['60Co'].sourceActivity * (dataStore.sourceInfo['60Co'].sourceCalibration.activityUnc / dataStore.sourceInfo['60Co'].sourceCalibration.activity);

      // Calculate the number of decays of this source during the full run duration
      dataStore.sourceInfo['60Co'].sourceTotalDecaysDuringThisRun = dataStore.sourceInfo['60Co'].sourceActivity * dataStore.sourceInfo['60Co'].Midas.Duration;
      dataStore.sourceInfo['60Co']["singles"].normalizationAbsFactor = 1.0/dataStore.sourceInfo['60Co'].sourceTotalDecaysDuringThisRun;
      dataStore.sourceInfo['60Co']["singles"].normalizationAbsFactorUnc = dataStore.sourceInfo['60Co']["singles"].normalizationAbsFactor * (dataStore.sourceInfo['60Co'].sourceActivityUnc/dataStore.sourceInfo['60Co'].sourceActivity);
      dataStore.sourceInfo['60Co']["addback"].normalizationAbsFactor = dataStore.sourceInfo['60Co']["singles"].normalizationAbsFactor;
      dataStore.sourceInfo['60Co']["addback"].normalizationAbsFactorUnc = dataStore.sourceInfo['60Co']["singles"].normalizationAbsFactorUnc;

      console.log('Source activity at Run start:');
      console.log(dataStore.sourceInfo['60Co'].timeSinceCertification);
      console.log(dataStore.sourceInfo['60Co'].sourceActivity);
      console.log(dataStore.sourceInfo['60Co'].sourceTotalDecaysDuringThisRun);
      console.log(dataStore.sourceInfo['60Co'].normalizationFactor);
      console.log(dataStore);
    }

    function performNormalizations(){
      var dataKey = ["singles","addback"];
      for(var j=0; j<dataKey.length; j++){
        dataStore.sourceInfo['152Eu'][dataKey[j]].normalizationFactor = 1.0;
        if("133Ba" in dataStore.sourceInfo){
          dataStore.sourceInfo['133Ba'][dataKey[j]].normalizationFactor = normalizeSourceData('133Ba','152Eu',dataKey[j]);
        }
        if("56Co" in dataStore.sourceInfo){
          dataStore.sourceInfo['56Co'][dataKey[j]].normalizationFactor = normalizeSourceData('56Co','152Eu',dataKey[j]);
        }
        dataStore.sourceInfo['60Co'][dataKey[j]].normalizationFactor = normalizeSourceData('60Co','152Eu',dataKey[j]);

        if("133Ba" in dataStore.sourceInfo){
          for(i=0; i<dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiency.length; i++){
            dataStore.sourceInfo['133Ba'][dataKey[j]].normalizedEfficiency.push((dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiency[i]*dataStore.sourceInfo['133Ba'][dataKey[j]].normalizationFactor).toFixed(2));
            dataStore.sourceInfo['133Ba'][dataKey[j]].normalizedEfficiencyUnc.push((dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiencyUnc[i]*dataStore.sourceInfo['133Ba'][dataKey[j]].normalizationFactor).toFixed(2));
          }
        }
        if("56Co" in dataStore.sourceInfo){
          for(i=0; i<dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiency.length; i++){
            dataStore.sourceInfo['56Co'][dataKey[j]].normalizedEfficiency.push((dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiency[i]*dataStore.sourceInfo['56Co'][dataKey[j]].normalizationFactor).toFixed(2));
            dataStore.sourceInfo['56Co'][dataKey[j]].normalizedEfficiencyUnc.push((dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiencyUnc[i]*dataStore.sourceInfo['56Co'][dataKey[j]].normalizationFactor).toFixed(2));
          }
        }
        for(i=0; i<dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency.length; i++){
          dataStore.sourceInfo['60Co'][dataKey[j]].normalizedEfficiency.push((dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency[i]*dataStore.sourceInfo['60Co'][dataKey[j]].normalizationFactor).toFixed(2));
          dataStore.sourceInfo['60Co'][dataKey[j]].normalizedEfficiencyUnc.push((dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiencyUnc[i]*dataStore.sourceInfo['60Co'][dataKey[j]].normalizationFactor).toFixed(2));
        }
        if("11Be" in dataStore.sourceInfo){
          dataStore.sourceInfo['11Be'][dataKey[j]].normalizationFactor = normalizeSourceData('11Be','56Co',dataKey[j]); // Must be done after the 56Co normalizedEfficiency is calculated
          for(i=0; i<dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiency.length; i++){
            dataStore.sourceInfo['11Be'][dataKey[j]].normalizedEfficiency.push((dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiency[i]*dataStore.sourceInfo['11Be'][dataKey[j]].normalizationFactor).toFixed(2));
            dataStore.sourceInfo['11Be'][dataKey[j]].normalizedEfficiencyUnc.push((dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiencyUnc[i]*dataStore.sourceInfo['11Be'][dataKey[j]].normalizationFactor).toFixed(2));
          }
        }

        dataStore.sourceInfo['152Eu'][dataKey[j]].normalizedEfficiency = dataStore.sourceInfo['152Eu'][dataKey[j]].relativeEfficiency;
        dataStore.sourceInfo['152Eu'][dataKey[j]].normalizedEfficiencyUnc = dataStore.sourceInfo['152Eu'][dataKey[j]].relativeEfficiencyUnc;
        if("133Ba" in dataStore.sourceInfo){
          console.log(dataStore.sourceInfo['133Ba'][dataKey[j]].normalizedEfficiency);
          console.log(dataStore.sourceInfo['133Ba'][dataKey[j]].normalizedEfficiencyUnc);
        }
        console.log(dataStore.sourceInfo['152Eu'][dataKey[j]].normalizedEfficiency);
        console.log(dataStore.sourceInfo['152Eu'][dataKey[j]].normalizedEfficiencyUnc);
        if("56Co" in dataStore.sourceInfo){
          console.log(dataStore.sourceInfo['56Co'][dataKey[j]].normalizedEfficiency);
          console.log(dataStore.sourceInfo['56Co'][dataKey[j]].normalizedEfficiencyUnc);
        }
        if("11Be" in dataStore.sourceInfo){
          console.log(dataStore.sourceInfo['11Be'][dataKey[j]].normalizedEfficiency);
          console.log(dataStore.sourceInfo['11Be'][dataKey[j]].normalizedEfficiencyUnc);
        }

        // Now calculate the absolute efficiency
        for(i=0; i<dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency.length; i++){
          dataStore.sourceInfo['60Co'][dataKey[j]].absoluteEfficiency.push((dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency[i]*dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor).toFixed(4));
          var uncertValue = dataStore.sourceInfo['60Co'][dataKey[j]].absoluteEfficiency[i] *
          Math.sqrt(
            ((dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency[i]) *
            (dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency[i]))
            +
            ((dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor) * (dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor))
          );
          dataStore.sourceInfo['60Co'][dataKey[j]].absoluteEfficiencyUnc.push(uncertValue.toFixed(5));
        }

        // Normalize the relative 56Co to the absolute 60Co
        // Then copy the same normalization factor to the other sources because they were already normalized together
        if("56Co" in dataStore.sourceInfo){
          dataStore.sourceInfo['56Co'][dataKey[j]].normalizationAbsFactor = normalizeSourceData('56Co','60Co',dataKey[j]);
          dataStore.sourceInfo['152Eu'][dataKey[j]].normalizationAbsFactor = dataStore.sourceInfo['56Co'][dataKey[j]].normalizationAbsFactor;
          if("133Ba" in dataStore.sourceInfo){
            dataStore.sourceInfo['133Ba'][dataKey[j]].normalizationAbsFactor = dataStore.sourceInfo['56Co'][dataKey[j]].normalizationAbsFactor;
          }
          if("11Be" in dataStore.sourceInfo){
            dataStore.sourceInfo['11Be'][dataKey[j]].normalizationAbsFactor = dataStore.sourceInfo['56Co'][dataKey[j]].normalizationAbsFactor;
          }
        }
        else{ // 56Co is excluded so use 152Eu
          dataStore.sourceInfo['152Eu'][dataKey[j]].normalizationAbsFactor = normalizeSourceData('152Eu','60Co',dataKey[j]);
          if("133Ba" in dataStore.sourceInfo){
            dataStore.sourceInfo['133Ba'][dataKey[j]].normalizationAbsFactor = dataStore.sourceInfo['152Eu'][dataKey[j]].normalizationAbsFactor;
          }
          if("11Be" in dataStore.sourceInfo){
            dataStore.sourceInfo['11Be'][dataKey[j]].normalizationAbsFactor = dataStore.sourceInfo['152Eu'][dataKey[j]].normalizationAbsFactor;
          }
        }

        // Apply the absolute normalization factor to all points
        // and calculate the uncertainty by combining on quadrature
        if("133Ba" in dataStore.sourceInfo){
          for(i=0; i<dataStore.sourceInfo['133Ba'][dataKey[j]].normalizedEfficiency.length; i++){
            dataStore.sourceInfo['133Ba'][dataKey[j]].absoluteEfficiency.push((dataStore.sourceInfo['133Ba'][dataKey[j]].normalizedEfficiency[i]*dataStore.sourceInfo['133Ba'][dataKey[j]].normalizationAbsFactor).toFixed(4));

            var uncertValue = dataStore.sourceInfo['133Ba'][dataKey[j]].absoluteEfficiency[i] *
            Math.sqrt(
              ((dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiency[i]) *
              (dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['133Ba'][dataKey[j]].relativeEfficiency[i]))
              +
              ((dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor) * (dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor))
            );
            dataStore.sourceInfo['133Ba'][dataKey[j]].absoluteEfficiencyUnc.push(uncertValue.toFixed(5));
          }
        }
        for(i=0; i<dataStore.sourceInfo['152Eu'][dataKey[j]].normalizedEfficiency.length; i++){
          dataStore.sourceInfo['152Eu'][dataKey[j]].absoluteEfficiency.push((dataStore.sourceInfo['152Eu'][dataKey[j]].normalizedEfficiency[i]*dataStore.sourceInfo['152Eu'][dataKey[j]].normalizationAbsFactor).toFixed(4));
          var uncertValue = dataStore.sourceInfo['152Eu'][dataKey[j]].absoluteEfficiency[i] *
          Math.sqrt(
            ((dataStore.sourceInfo['152Eu'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['152Eu'][dataKey[j]].relativeEfficiency[i]) *
            (dataStore.sourceInfo['152Eu'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['152Eu'][dataKey[j]].relativeEfficiency[i]))
            +
            ((dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor) * (dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor))
          );
          dataStore.sourceInfo['152Eu'][dataKey[j]].absoluteEfficiencyUnc.push(uncertValue.toFixed(5));
        }
        if("56Co" in dataStore.sourceInfo){
          for(i=0; i<dataStore.sourceInfo['56Co'][dataKey[j]].normalizedEfficiency.length; i++){
            dataStore.sourceInfo['56Co'][dataKey[j]].absoluteEfficiency.push((dataStore.sourceInfo['56Co'][dataKey[j]].normalizedEfficiency[i]*dataStore.sourceInfo['56Co'][dataKey[j]].normalizationAbsFactor).toFixed(4));
            var uncertValue = dataStore.sourceInfo['56Co'][dataKey[j]].absoluteEfficiency[i] *
            Math.sqrt(
              ((dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiency[i]) *
              (dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['56Co'][dataKey[j]].relativeEfficiency[i]))
              +
              ((dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor) * (dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor))
            );
            dataStore.sourceInfo['56Co'][dataKey[j]].absoluteEfficiencyUnc.push(uncertValue.toFixed(5));
          }
        }
        if("11Be" in dataStore.sourceInfo){
          for(i=0; i<dataStore.sourceInfo['11Be'][dataKey[j]].normalizedEfficiency.length; i++){
            dataStore.sourceInfo['11Be'][dataKey[j]].absoluteEfficiency.push((dataStore.sourceInfo['11Be'][dataKey[j]].normalizedEfficiency[i]*dataStore.sourceInfo['11Be'][dataKey[j]].normalizationAbsFactor).toFixed(4));
            var uncertValue = dataStore.sourceInfo['11Be'][dataKey[j]].absoluteEfficiency[i] *
            Math.sqrt(
              ((dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiency[i]) *
              (dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiencyUnc[i]/dataStore.sourceInfo['11Be'][dataKey[j]].relativeEfficiency[i]))
              +
              ((dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor) * (dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactorUnc / dataStore.sourceInfo['60Co'][dataKey[j]].normalizationAbsFactor))
            );
            dataStore.sourceInfo['11Be'][dataKey[j]].absoluteEfficiencyUnc.push(uncertValue.toFixed(5));
          }
        }
        console.log(dataStore.sourceInfo['60Co'][dataKey[j]].normalizationFactor);
        console.log(dataStore.sourceInfo['60Co'][dataKey[j]].relativeEfficiency);
        console.log(dataStore.sourceInfo['60Co'][dataKey[j]].absoluteEfficiency);
      }// end of dataKey for loop

      // Display the results in the table
      dataStore._efficiencyFitterReport.updateTable();

      //update data plots for the individual sources
      reconstructSourceEfficiencyData();

      //update the relative efficiency data plot which includes all sources
      reconstructRelativeEfficiencyData();

      //update the absolute efficiency data plot which includes all sources
      reconstructAbsoluteEfficiencyData();

      // We are finished
      dataStore.currentTask = 'Finished';
      console.log('Everything completed. Tasks completed '+dataStore.progressBarTasksCompleted+' of '+dataStore.progressBarNumberTasks+' tasks, '+(dataStore.progressBarTasksCompleted / dataStore.progressBarNumberTasks)+'.');
      document.getElementById('efficiencyFitterProgress').setAttribute('style', 'width:' + (100) + '%' );
      console.log(dataStore);
    }


    function normalizeSourceData(thisSourceKey,referenceSourceKey,dataKey){
      // The data for thisSourceKey will be normalized to the data of the referenceSourceKey
      // residualsData returns the best-fit normalization factor

      if(thisSourceKey == '133Ba' && referenceSourceKey == '152Eu'){

        // take only some of the points
        var referenceSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].relativeEfficiency.slice(1,3);
        var thisSourceKeyData = dataStore.sourceInfo[thisSourceKey][dataKey].relativeEfficiency.slice(1,4);
      }

      if(thisSourceKey == '56Co' && referenceSourceKey == '152Eu'){

        // take only some of the points
        var referenceSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].relativeEfficiency.slice(6,8);
        var thisSourceKeyData = dataStore.sourceInfo[thisSourceKey][dataKey].relativeEfficiency.slice(0,4);
      }

      if(thisSourceKey == '60Co' && referenceSourceKey == '152Eu'){

        // take only some of the points
        var referenceSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].relativeEfficiency.slice(7,8);
        var thisSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].relativeEfficiency;
      }

      if(thisSourceKey == '11Be' && referenceSourceKey == '56Co'){

        // take only some of the points
        var referenceSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].normalizedEfficiency.slice(6,8);
        var thisSourceKeyData = dataStore.sourceInfo[thisSourceKey][dataKey].relativeEfficiency.slice(0,1);
      }

      if(thisSourceKey == '56Co' && referenceSourceKey == '60Co'){

        // take only some of the points
        var referenceSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].absoluteEfficiency;
        var thisSourceKeyData = dataStore.sourceInfo[thisSourceKey][dataKey].normalizedEfficiency.slice(2,4);
      }

      if(thisSourceKey == '152Eu' && referenceSourceKey == '60Co'){

        // take only some of the points
        var referenceSourceKeyData = dataStore.sourceInfo[referenceSourceKey][dataKey].absoluteEfficiency;
        var thisSourceKeyData = dataStore.sourceInfo[thisSourceKey][dataKey].normalizedEfficiency.slice(7,8);
      }

      var referenceSourceKeyAverage = (referenceSourceKeyData.reduce((a, b) => parseFloat(a) + parseFloat(b), 0))/referenceSourceKeyData.length;
      var thisSourceKeyAverage = (thisSourceKeyData.reduce((a, b) => parseFloat(a) + parseFloat(b), 0))/thisSourceKeyData.length;

      normalizationFactor = referenceSourceKeyAverage / thisSourceKeyAverage;

      console.log([thisSourceKey,referenceSourceKey]);
      console.log(referenceSourceKeyData);
      console.log(thisSourceKeyData);
      console.log([referenceSourceKeyAverage,thisSourceKeyAverage,normalizationFactor]);

      return [normalizationFactor];
    }

    function reconstructSourceEfficiencyData(){
      // First determine the residuals by applying the calibration coefficients to the fitted centroid, then comparing it to the literature energy.
      // Save the residuals data to the dataStore, then
      //arrange the latest residual info for representation in the dygraph.


      // Look through each source
      var keys = Object.keys(dataStore.sourceInfo);
      for(i=0; i<keys.length; i++){
        currentSource = keys[i];

        // Find the plot id for this source
        var thisPlotID = dataStore.efficiencyPlotDataKeyMap.indexOf(currentSource);
        var thisABPlotID = dataStore.efficiencyPlotDataKeyMap.indexOf(currentSource) + 7;
        console.log('reconstructEfficiencyData for Plot'+thisPlotID);
        console.log(currentSource);
        console.log();

        // Fill the flags array
        var flags = [];
        flags.fillN(0, dataStore.sourceInfo[currentSource].literaturePeaks.length);



        for(currentPeak=0; currentPeak<dataStore.sourceInfo[currentSource]['literaturePeaks'].length; currentPeak++){

          // x value should be the literature energy value
          // How do we add x values to the dataplot? - Answer is you pass them to arrangePoints function.

          // y value of raw efficiency plot is the uncorrected area divided by intensity
          dataStore.efficiencyPlotData[thisPlotID][currentPeak] = dataStore.sourceInfo[currentSource]["singles"].rawEfficiency[currentPeak];
          dataStore.efficiencyPlotData[thisABPlotID][currentPeak] = dataStore.sourceInfo[currentSource]["addback"].rawEfficiency[currentPeak];


          // Update the Y axis scale if needed
          if(dataStore.efficiencyPlotData[thisPlotID][currentPeak] < (0.75 * dataStore.YAxisMinValue[thisPlotID][0])){
            dataStore.YAxisMinValue[thisPlotID][0] = dataStore.efficiencyPlotData[thisPlotID][currentPeak] * 1.33;
          }
          if(dataStore.efficiencyPlotData[thisPlotID][dataStore.currentPeak] > (0.75 * dataStore.YAxisMaxValue[thisPlotID][0])){
            dataStore.YAxisMaxValue[thisPlotID][0] = dataStore.efficiencyPlotData[thisPlotID][currentPeak] * 1.33;
          }
          if(dataStore.efficiencyPlotData[thisABPlotID][currentPeak] < (0.75 * dataStore.YAxisMinValue[thisABPlotID][0])){
            dataStore.YAxisMinValue[thisABPlotID][0] = dataStore.efficiencyPlotData[thisABPlotID][currentPeak] * 1.33;
          }
          if(dataStore.efficiencyPlotData[thisABPlotID][dataStore.currentPeak] > (0.75 * dataStore.YAxisMaxValue[thisABPlotID][0])){
            dataStore.YAxisMaxValue[thisABPlotID][0] = dataStore.efficiencyPlotData[thisABPlotID][currentPeak] * 1.33;
          }
        }// end of peak for loop

        // Singles plot
        dataStore.dataplotData[thisPlotID] =
        arrangePoints(dataStore.sourceInfo[currentSource].literaturePeaks, [ dataStore.efficiencyPlotData[thisPlotID] ], flags );
        var eventString = 'updateDyData'+thisPlotID;
        dispatcher({ 'data': dataStore.dataplotData[thisPlotID] }, eventString);
        // Addback plot
        dataStore.dataplotData[thisABPlotID] =
        arrangePoints(dataStore.sourceInfo[currentSource].literaturePeaks, [ dataStore.efficiencyPlotData[thisABPlotID] ], flags );
        var eventString = 'updateDyData'+thisABPlotID;
        dispatcher({ 'data': dataStore.dataplotData[thisABPlotID] }, eventString);

      }// end of source for loop

    }

    function reconstructRelativeEfficiencyData(){
      // First determine the residuals by applying the calibration coefficients to the fitted centroid, then comparing it to the literature energy.
      // Save the residuals data to the dataStore, then
      //arrange the latest residual info for representation in the dygraph.

      // Find the plot id for this source
      var thisPlotID = 1;
      var thisABPlotID = 8;
      console.log('Relative Efficiency plot data for plot'+thisPlotID);

      // The peak energies over all sources are not sequential. So build an
      // object of the peak energies and efficienicies so we can
      // then sort them into energy order before displaying the plot.
      // x value should be the literature energy value
      // y value is raw efficiency normalized to 152Eu

      var data = []; var dataAB = [];

      // loop over all sources
      var count=0;
      var keys = Object.keys(dataStore.sourceInfo);
      for(var i=0; i<keys.length; i++){
        // Singles
        for(var j=0; j<dataStore.sourceInfo[keys[i]].literaturePeaks.length; j++){
          if(isNaN(dataStore.sourceInfo[keys[i]]["singles"].normalizedEfficiency[j]) || !dataStore.sourceInfo[keys[i]]["singles"].normalizedEfficiency[j]){ continue; }
          data.push({
            'X' : dataStore.sourceInfo[keys[i]].literaturePeaks[j],
            'Y' :dataStore.sourceInfo[keys[i]]["singles"].normalizedEfficiency[j],
            'YUnc' :dataStore.sourceInfo[keys[i]]["singles"].normalizedEfficiencyUnc[j]
          });
        }
        // Addback
        for(var j=0; j<dataStore.sourceInfo[keys[i]].literaturePeaks.length; j++){
          if(isNaN(dataStore.sourceInfo[keys[i]]["addback"].normalizedEfficiency[j]) || !dataStore.sourceInfo[keys[i]]["addback"].normalizedEfficiency[j]){ continue; }
          dataAB.push({
            'X' : dataStore.sourceInfo[keys[i]].literaturePeaks[j],
            'Y' :dataStore.sourceInfo[keys[i]]["addback"].normalizedEfficiency[j],
            'YUnc' :dataStore.sourceInfo[keys[i]]["addback"].normalizedEfficiencyUnc[j]
          });
        }

      }

      // Order the x and y arrays in energy order
      data.sort( compareX ); dataAB.sort( compareX );

      // Fill the arrays with the energy-sorted data
      for(var i=0; i<data.length; i++){
        dataStore.efficiencyPlotXData[thisPlotID].push( data[i].X );
        dataStore.efficiencyPlotData[thisPlotID].push( data[i].Y );
        dataStore.efficiencyPlotDataUnc[thisPlotID].push( data[i].YUnc );
      }
      for(var i=0; i<dataAB.length; i++){
        dataStore.efficiencyPlotXData[thisABPlotID].push( dataAB[i].X );
        dataStore.efficiencyPlotData[thisABPlotID].push( dataAB[i].Y );
        dataStore.efficiencyPlotDataUnc[thisABPlotID].push( dataAB[i].YUnc );
      }


      // Fit the relative efficiency curve
      // Make array of log and log values
      // use regression with 8th order polynomial
      // Plot the curve
      dataStore.efficiencyPlotEquationParameters[thisPlotID] = fitEfficiencyCurve(dataStore.efficiencyPlotXData[thisPlotID], dataStore.efficiencyPlotData[thisPlotID]);
      dataStore.efficiencyPlotEquationParameters[thisABPlotID] = fitEfficiencyCurve(dataStore.efficiencyPlotXData[thisABPlotID], dataStore.efficiencyPlotData[thisABPlotID]);

      // Build the relative efficiency curve data from the fitted parameters
      var params = dataStore.efficiencyPlotEquationParameters[thisPlotID];
      params = params.reverse();
      console.log(params);
      var paramsAB = dataStore.efficiencyPlotEquationParameters[thisABPlotID];
      paramsAB = paramsAB.reverse();
      console.log(paramsAB);

      // Hard code to a GEANT4 efficiency curve for testing and development
      // crystalUSSDSSnodescantfullshields1614.50
      //params = [ -2.4731527545,-0.6159638309 , 0.0152499594 ,-0.0901066898 ,-0.0392021262 , 0.0195202734 , 0.0053811928 ,-0.0017085412 ,-0.0004470462  ];
      //for(i=0; i<10000; i+=5){
      for(var i=0; i<dataStore.efficiencyPlotXData[thisPlotID].length; i++){
        var thisX = dataStore.efficiencyPlotXData[thisPlotID][i];
        // HPGeEfficiency() expects energy in MeV and the natural log.
        dataStore.efficiencyPlotY2Data[thisPlotID][i] = HPGeEfficiency(params, Math.log(parseFloat(thisX/1000)));
        console.log('Calculated efficiency of '+dataStore.efficiencyPlotY2Data[thisPlotID][i]+' for energy '+thisX);
      }
      for(var i=0; i<dataStore.efficiencyPlotXData[thisABPlotID].length; i++){
        var thisX = dataStore.efficiencyPlotXData[thisABPlotID][i];
        // HPGeEfficiency() expects energy in MeV and the natural log.
        dataStore.efficiencyPlotY2Data[thisABPlotID][i] = HPGeEfficiency(paramsAB, Math.log(parseFloat(thisX/1000)));
        console.log('Calculated AB efficiency of '+dataStore.efficiencyPlotY2Data[thisABPlotID][i]+' for energy '+thisX);
      }

      // Fill the flags array
      var flags = [];
      flags.fillN(0, dataStore.efficiencyPlotXData[thisPlotID].length);


      // Update the Y axis scale if needed
      if(dataStore.efficiencyPlotData[thisPlotID][dataStore.efficiencyPlotData[thisPlotID].length-1] < (0.75 * dataStore.YAxisMinValue[thisPlotID][0])){
        dataStore.YAxisMinValue[thisPlotID][0] = dataStore.efficiencyPlotData[thisPlotID][dataStore.efficiencyPlotData.length-1] * 1.33;
      }
      if(dataStore.efficiencyPlotData[thisPlotID][0] > (1.33 * dataStore.YAxisMaxValue[thisPlotID][0])){
        dataStore.YAxisMaxValue[thisPlotID][0] = dataStore.efficiencyPlotData[thisPlotID][0] * 1.33;
      }
      if(dataStore.efficiencyPlotData[thisABPlotID][dataStore.efficiencyPlotData[thisABPlotID].length-1] < (0.75 * dataStore.YAxisMinValue[thisABPlotID][0])){
        dataStore.YAxisMinValue[thisABPlotID][0] = dataStore.efficiencyPlotData[thisABPlotID][dataStore.efficiencyPlotData.length-1] * 1.33;
      }
      if(dataStore.efficiencyPlotData[thisABPlotID][0] > (1.33 * dataStore.YAxisMaxValue[thisABPlotID][0])){
        dataStore.YAxisMaxValue[thisABPlotID][0] = dataStore.efficiencyPlotData[thisABPlotID][0] * 1.33;
      }

      //    dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.efficiencyPlotXData[thisPlotID], [dataStore.efficiencyPlotData[thisPlotID], dataStore.efficiencyPlotY2Data[thisPlotID]], flags );
      // Singles
      dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.efficiencyPlotXData[thisPlotID], [dataStore.efficiencyPlotData[thisPlotID]], flags );
      var eventString = 'updateDyData'+thisPlotID;
      dispatcher({ 'data': dataStore.dataplotData[thisPlotID] }, eventString);
      // Addback
      dataStore.dataplotData[thisABPlotID] = arrangePoints(dataStore.efficiencyPlotXData[thisABPlotID], [dataStore.efficiencyPlotData[thisABPlotID]], flags );
      var eventString = 'updateDyData'+thisABPlotID;
      dispatcher({ 'data': dataStore.dataplotData[thisABPlotID] }, eventString);
    }

    function reconstructAbsoluteEfficiencyData(){
      // First determine the residuals by applying the calibration coefficients to the fitted centroid, then comparing it to the literature energy.
      // Save the residuals data to the dataStore, then
      //arrange the latest residual info for representation in the dygraph.

      // Find the plot id for this source
      var thisPlotID = 0;
      var thisABPlotID = 7;
      console.log('Absolute Efficiency plot data for plot'+thisPlotID);
      console.log('Absolute Efficiency plot data for plot'+thisABPlotID);

      // The peak energies over all sources are not sequential. So build an
      // object of the peak energies and efficienicies so we can
      // then sort them into energy order before displaying the plot.
      // x value should be the literature energy value
      // y value is raw efficiency normalized to 152Eu

      var data = []; var dataAB = [];

      // loop over all sources
      var count=0;
      var keys = Object.keys(dataStore.sourceInfo);
      for(var i=0; i<keys.length; i++){
        // Singles
        for(var j=0; j<dataStore.sourceInfo[keys[i]].literaturePeaks.length; j++){
          if(isNaN(dataStore.sourceInfo[keys[i]]["singles"].absoluteEfficiency[j]) || !dataStore.sourceInfo[keys[i]]["singles"].absoluteEfficiency[j]){ continue; }
          data.push({
            'X' : dataStore.sourceInfo[keys[i]].literaturePeaks[j],
            'Y' :dataStore.sourceInfo[keys[i]]["singles"].absoluteEfficiency[j],
            'YUnc' :dataStore.sourceInfo[keys[i]]["singles"].absoluteEfficiencyUnc[j]
          });
        }
        // Addback
        for(var j=0; j<dataStore.sourceInfo[keys[i]].literaturePeaks.length; j++){
          if(isNaN(dataStore.sourceInfo[keys[i]]["addback"].absoluteEfficiency[j]) || !dataStore.sourceInfo[keys[i]]["addback"].absoluteEfficiency[j]){ continue; }
          dataAB.push({
            'X' : dataStore.sourceInfo[keys[i]].literaturePeaks[j],
            'Y' :dataStore.sourceInfo[keys[i]]["addback"].absoluteEfficiency[j],
            'YUnc' :dataStore.sourceInfo[keys[i]]["addback"].absoluteEfficiencyUnc[j]
          });
        }
      }

      // Order the x and y arrays in energy order
      data.sort( compareX ); dataAB.sort( compareX );

      // Fill the arrays with the energy-sorted data
      for(var i=0; i<data.length; i++){
        dataStore.efficiencyPlotXData[thisPlotID].push( data[i].X );
        dataStore.efficiencyPlotData[thisPlotID].push( data[i].Y );
        dataStore.efficiencyPlotDataUnc[thisPlotID].push( data[i].YUnc );
      }
      console.log(dataStore.efficiencyPlotXData[thisPlotID]);
      console.log(dataStore.efficiencyPlotData[thisPlotID]);
      console.log(dataStore.efficiencyPlotDataUnc[thisPlotID]);
      for(var i=0; i<dataAB.length; i++){
        dataStore.efficiencyPlotXData[thisABPlotID].push( dataAB[i].X );
        dataStore.efficiencyPlotData[thisABPlotID].push( dataAB[i].Y );
        dataStore.efficiencyPlotDataUnc[thisABPlotID].push( dataAB[i].YUnc );
      }
      console.log(dataStore.efficiencyPlotXData[thisABPlotID]);
      console.log(dataStore.efficiencyPlotData[thisABPlotID]);
      console.log(dataStore.efficiencyPlotDataUnc[thisABPlotID]);


      // Fit the absolute efficiency curve
      // Make array of log and log values
      // use regression with 8th order polynomial
      // Plot the curve
      dataStore.efficiencyPlotEquationParameters[thisPlotID] = (fitEfficiencyCurve(dataStore.efficiencyPlotXData[thisPlotID], dataStore.efficiencyPlotData[thisPlotID])).reverse();
      dataStore.efficiencyPlotEquationParameters[thisABPlotID] = (fitEfficiencyCurve(dataStore.efficiencyPlotXData[thisABPlotID], dataStore.efficiencyPlotData[thisABPlotID])).reverse();

      // The absolute efficiency curve is built from the fitted parameters in the underlayCallback function of the dygraph using the parameters of the above fit
      var params = dataStore.efficiencyPlotEquationParameters[thisPlotID];
      var paramsAB = dataStore.efficiencyPlotEquationParameters[thisABPlotID];

      //  params = params.reverse();
      console.log(params);
      console.log(paramsAB);

      // Hard code to a GEANT4 efficiency curve for testing and development
      // crystalUSSDSSnodescantfullshields1614.50
      //params = [ -2.4731527545,-0.6159638309 , 0.0152499594 ,-0.0901066898 ,-0.0392021262 , 0.0195202734 , 0.0053811928 ,-0.0017085412 ,-0.0004470462  ];
      //for(i=0; i<10000; i+=5){
      for(var i=0; i<dataStore.efficiencyPlotXData[thisPlotID].length; i++){
        var thisX = dataStore.efficiencyPlotXData[thisPlotID][i];
        // HPGeEfficiency() expects energy in MeV and the natural log.
        dataStore.efficiencyPlotY2Data[thisPlotID][i] = HPGeEfficiency(params, Math.log(parseFloat(thisX/1000)));
        console.log('Calculated absolute efficiency of '+dataStore.efficiencyPlotY2Data[thisPlotID][i]+' for energy '+thisX);
      }
      // Addback
      for(var i=0; i<dataStore.efficiencyPlotXData[thisABPlotID].length; i++){
        var thisX = dataStore.efficiencyPlotXData[thisABPlotID][i];
        // HPGeEfficiency() expects energy in MeV and the natural log.
        dataStore.efficiencyPlotY2Data[thisABPlotID][i] = HPGeEfficiency(paramsAB, Math.log(parseFloat(thisX/1000)));
        console.log('Calculated absolute AB efficiency of '+dataStore.efficiencyPlotY2Data[thisABPlotID][i]+' for energy '+thisX);
      }


      // Fill the flags array
      var flags = [];
      flags.fillN(0, dataStore.efficiencyPlotXData[thisPlotID].length);


      // Update the Y axis scale if needed
      if(dataStore.efficiencyPlotData[thisPlotID][dataStore.efficiencyPlotData[thisPlotID].length-1] < (0.75 * dataStore.YAxisMinValue[thisPlotID][0])){
        dataStore.YAxisMinValue[thisPlotID][0] = dataStore.efficiencyPlotData[thisPlotID][dataStore.efficiencyPlotData.length-1] * 1.33;
      }
      if(dataStore.efficiencyPlotData[thisPlotID][0] > (1.33 * dataStore.YAxisMaxValue[thisPlotID][0])){
        dataStore.YAxisMaxValue[thisPlotID][0] = dataStore.efficiencyPlotData[thisPlotID][0] * 1.33;
      }
      if(dataStore.efficiencyPlotData[thisABPlotID][dataStore.efficiencyPlotData[thisABPlotID].length-1] < (0.75 * dataStore.YAxisMinValue[thisABPlotID][0])){
        dataStore.YAxisMinValue[thisABPlotID][0] = dataStore.efficiencyPlotData[thisABPlotID][dataStore.efficiencyPlotData.length-1] * 1.33;
      }
      if(dataStore.efficiencyPlotData[thisABPlotID][0] > (1.33 * dataStore.YAxisMaxValue[thisABPlotID][0])){
        dataStore.YAxisMaxValue[thisABPlotID][0] = dataStore.efficiencyPlotData[thisABPlotID][0] * 1.33;
      }

      //      dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.efficiencyPlotXData[thisPlotID], [dataStore.efficiencyPlotData[thisPlotID], dataStore.efficiencyPlotY2Data[thisPlotID]], flags );
      dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.efficiencyPlotXData[thisPlotID], [dataStore.efficiencyPlotData[thisPlotID]], flags );
      var eventString = 'updateDyData'+thisPlotID;
      console.log(eventString);
      dispatcher({ 'data': dataStore.dataplotData[thisPlotID] }, eventString);
      // addback
      dataStore.dataplotData[thisABPlotID] = arrangePoints(dataStore.efficiencyPlotXData[thisABPlotID], [dataStore.efficiencyPlotData[thisABPlotID]], flags );
      var eventString = 'updateDyData'+thisABPlotID;
      console.log(eventString);
      dispatcher({ 'data': dataStore.dataplotData[thisABPlotID] }, eventString);

    }

    function fitEfficiencyCurve(Xdata,Ydata){
      //given the x and y data, fit an 8th order polynomial as the efficiency curve
      // Xdata and Ydata are arrays containing the X and the Y data points. X is energy, Y is counts/efficiency
      //this: efficiencyCurveReport object

      //            var quad, slope, intercept;
      var data = [];

      //Convert to log and convert keV to MeV
      for(var i=0; i<Xdata.length; i++){
        data.push([Math.log(Xdata[i]/1000), Math.log(Ydata[i])]);
      }

      // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
      const result = regression.polynomial(data, { order: 8, precision: 20 });
      console.log(result);

      return result.equation;

    }

    function buildEffCSVfile(){
      console.log('Download initiated');
      var keys = Object.keys(dataStore.sourceInfo);

      // Write the table of results to a CSV file for download.
      var CSV = '';

      CSV += 'GRIFFIN '+dataStore.dataType+' Efficiency Data\n\n';

      // List the run files used for this calibration
      for(i=0; i<keys.length; i++){
        currentSource = keys[i];
        CSV += keys[i] + ' runfile:,' + dataStore.sourceInfo[currentSource].histoFileName + '\n';
      }

      var dataKey = ["singles","addback"];
      var dataKeyTitle = ["Singles Efficiency","Addback Efficiency"];
      for(var j=0; j<dataKey.length; j++){
        CSV += '\n\n'+dataKeyTitle[j]+' \n';

        // Print the column titles
        CSV += '\nSource,';
        CSV += 'Peak Energy (keV),';
        CSV += 'Peak Intensity,';
        CSV += 'Peak Intensity Uncertainty,';
        CSV += 'FWHM (keV),';
        CSV += 'Raw Singles Area,';
        CSV += 'Raw Singles Area Uncertainty,';
        CSV += 'Summing-In Correction,';
        CSV += 'Summing-In Correction Uncertainty,';
        CSV += 'Summing-Out Correction,';
        CSV += 'Summing-Out Correction Uncertainty,';
        // F factor
        CSV += 'Corrected Area,';
        CSV += 'Corrected Area Uncertainty,';
        CSV += 'Normalization Factor (Rel),';
        CSV += 'Relative Efficiency,';
        CSV += 'Relative Efficiency Uncertainty,';
        CSV += 'Normalization Factor (Abs),';
        CSV += 'Absolute Efficiency,';
        CSV += 'Absolute Efficiency Uncertainty\n';

        // Loop through all peaks for all sources to provide the data
        for(i=0; i<keys.length; i++){
          currentSource = keys[i];
          for(currentPeak=0; currentPeak<dataStore.sourceInfo[currentSource]['literaturePeaks'].length; currentPeak++){

            if(currentPeak == 0){
              CSV += dataStore.sourceInfo[currentSource].title;
            }
            CSV += ',' + dataStore.sourceInfo[currentSource].literaturePeaks[currentPeak] + ',';
            CSV += dataStore.sourceInfo[currentSource].literatureIntensity[currentPeak]+','+dataStore.sourceInfo[currentSource].literatureIntensityUnc[currentPeak]+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].FWHM[currentPeak] + ',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].uncorrectedArea[currentPeak]+','+dataStore.sourceInfo[currentSource][dataKey[j]].uncorrectedAreaUnc[currentPeak]+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCounts[currentPeak]+','+dataStore.sourceInfo[currentSource][dataKey[j]].summingInCorrectionCountsUnc[currentPeak]+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].summingOutCorrectionCounts[currentPeak]+','+dataStore.sourceInfo[currentSource][dataKey[j]].summingOutCorrectionCountsUnc[currentPeak]+',';
            // F factor
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].correctedArea[currentPeak]+','+dataStore.sourceInfo[currentSource][dataKey[j]].correctedAreaUnc[currentPeak]+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].normalizationFactor+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].normalizedEfficiency[currentPeak]+','+dataStore.sourceInfo[currentSource][dataKey[j]].normalizedEfficiencyUnc[currentPeak]+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].normalizationAbsFactor+',';
            CSV += dataStore.sourceInfo[currentSource][dataKey[j]].absoluteEfficiency[currentPeak]+','+dataStore.sourceInfo[currentSource][dataKey[j]].absoluteEfficiencyUnc[currentPeak]+'\n';

          }
        }
      }
      // Define all the columns in a legend


      // Create a download link
      const textBlob = new Blob([CSV], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = "GRIFFIN-Efficiency-Results.csv";

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }

    function buildDatafile(){
      console.log('Download of data file initiated');
      var keys = Object.keys(dataStore.sourceInfo);

      // Write the table of results to a data file for download.
      var DATA = '';

      // Loop through all peaks for all sources to provide the data
      for(i=0; i<keys.length; i++){
        currentSource = keys[i];
        for(currentPeak=0; currentPeak<dataStore.sourceInfo[currentSource]['literaturePeaks'].length; currentPeak++){
          DATA += dataStore.sourceInfo[currentSource].literaturePeaks[currentPeak] + ' ';
          DATA += dataStore.sourceInfo[currentSource]["singles"].absoluteEfficiency[currentPeak]+' ';
          DATA += dataStore.sourceInfo[currentSource]["singles"].absoluteEfficiencyUnc[currentPeak]+'\n';
        }
      }

      // Create a download link
      const textBlob = new Blob([DATA], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = "GRIFFIN_singles_efficiency_data.dat";

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }

    function buildABDatafile(){
      console.log('Download of data file initiated');
      var keys = Object.keys(dataStore.sourceInfo);

      // Write the table of results to a data file for download.
      var DATA = '';

      // Loop through all peaks for all sources to provide the data
      for(i=0; i<keys.length; i++){
        currentSource = keys[i];
        for(currentPeak=0; currentPeak<dataStore.sourceInfo[currentSource]['literaturePeaks'].length; currentPeak++){
          DATA += dataStore.sourceInfo[currentSource].literaturePeaks[currentPeak] + ' ';
          DATA += dataStore.sourceInfo[currentSource]["addback"].absoluteEfficiency[currentPeak]+' ';
          DATA += dataStore.sourceInfo[currentSource]["addback"].absoluteEfficiencyUnc[currentPeak]+'\n';
        }
      }

      // Create a download link
      const textBlob = new Blob([DATA], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = "GRIFFIN_addback_efficiency_data.dat";

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }

    function buildRootfile(){
      console.log('Download of Root script initiated');
      var keys = Object.keys(dataStore.sourceInfo);

      // Generate the Root script file for download.
      var ROOT = '';

      ROOT += 'void efficiency_curve_GRIFFIN(){\n';
      ROOT += '\n';
      ROOT += '  //reading output file from grif_replay:\n';
      ROOT += '  ifstream * f = new ifstream(\"GRIFFIN_singles_efficiency_data.dat\");\n';
      ROOT += '\n';
      ROOT += '  float energy, efficiency, error;\n';
      ROOT += '  std::vector<float> v_energies;\n';
      ROOT += '  std::vector<float> v_efficiencies;\n';
      ROOT += '\n';
      ROOT += '  while(*f>>energy>>efficiency>>error){\n';
      ROOT += '    cout<<\"Energy: \"<<energy<<\" Efficiency: \"<<efficiency<<\" Error: \"<<error<<endl;\n';
      ROOT += '    v_energies.push_back(energy);\n';
      ROOT += '    v_efficiencies.push_back(efficiency);\n';
      ROOT += '  }\n';
      ROOT += '\n';
      ROOT += '  //define your fit function\n';
      ROOT += '  //TF1 *function_name= new TF1("function_name", "function", low_limit, high_limit)\n';
      ROOT += '  TF1 *f_fit = new TF1(\"f_fit\", \"exp(([0]*log(x*0.001)**0) + ([1]*log(x*0.001)**1) + ([2]*log(x*0.001)**2) + ([3]*log(x*0.001)**3) +';
      ROOT += ' ([4]*log(x*0.001)**4) + ([5]*log(x*0.001)**5) + ([6]*log(x*0.001)**6) + ([7]*log(x*0.001)**7) + ([8]*log(x*0.001)**8))\",0,3600);\n';
      ROOT += '\n';
      ROOT += '  // set initial values for the parameters';
      ROOT += '  f_fit->SetParameter(0,11.2);\n';
      ROOT += '  f_fit->SetParameter(1,-0.5);\n';
      ROOT += '  f_fit->SetParameter(2,-0.05);\n';
      ROOT += '  f_fit->SetParameter(3,-0.09);\n';
      ROOT += '  f_fit->SetParameter(4,0.01);\n';
      ROOT += '  f_fit->SetParameter(5,0.0001);\n';
      ROOT += '  f_fit->SetParameter(6,-0.04);\n';
      ROOT += '  f_fit->SetParameter(7,-0.02);\n';
      ROOT += '  f_fit->SetParameter(8,-0.003);\n';
      ROOT += '\n';
      ROOT += '  // Create the graph and plot the data\n';
      ROOT += '  TGraph *gCurve = new TGraph(v_energies.size(), &(v_energies.at(0)),&(v_efficiencies.at(0)));\n';
      ROOT += '  gCurve->GetXaxis()->SetTitle(\"E_{#gamma} [keV]\");\n';
      ROOT += '  gCurve->GetYaxis()->SetTitle(\"Efficiency\");\n';
      ROOT += '  gCurve->SetTitle(\"GRIFFIN Efficiency Fit\");\n';
      ROOT += '  gCurve->SetLineColor(kBlue); //https://root.cern.ch/doc/v632/classTColor.html\n';
      ROOT += '  gCurve->SetMarkerStyle(8);\n';
      ROOT += '  gCurve->SetMarkerSize(1);\n';
      ROOT += '\n';
      ROOT += '  // Fit the data\n';
      ROOT += '  gCurve->Fit(f_fit,\"R\");\n';
      ROOT += '\n';
      ROOT += '  // Plot the fit result\n';
      ROOT += '  gCurve->Draw(\"AP\"); //https://root.cern/root/html524/TGraphPainter.html\n';
      ROOT += '}\n';

      // Create a download link
      const textBlob = new Blob([ROOT], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = "GRIFFIN_efficiency.C"

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }

    function buildGNUfile(){
      console.log('Download of GNUPlot file initiated');
      var keys = Object.keys(dataStore.sourceInfo);

      // Generate the table of results to a GNUplot file for download.
      var GNU = '';

      GNU += '# GRIFFIN Efficiency curve GNU plot file\n\n';
      GNU += '# set terminal pngcairo  transparent enhanced font \"arial,10\" fontscale 1.0 size 600, 400 \n';
      GNU += '# set output \'errorbars.4.png\'\n';
      GNU += 'set style data lines\n';
      GNU += 'set title \"Efficiency comparison\" \n';
      GNU += 'set xlabel \"Energy [keV]\" \n';
      GNU += 'set xrange [ * : * ] noreverse writeback\n';
      GNU += 'set x2range [ * : * ] noreverse writeback\n';
      GNU += 'set ylabel \"Abs. Eff.\" \n';
      GNU += 'set yrange [ * : * ] noreverse writeback\n';
      GNU += 'set y2range [ * : * ] noreverse writeback\n';
      GNU += 'set zrange [ * : * ] noreverse writeback\n';
      GNU += 'set cbrange [ * : * ] noreverse writeback\n';
      GNU += 'set rrange [ * : * ] noreverse writeback\n';
      GNU += 'NO_ANIMATION = 1\n\n';

      GNU += '## GEANT4 style fit to data\n';
      GNU += '## Starting values are similar to the relative efficiency curve in Ryan Dunlop\'s thesis (Table 4.9).\n';
      GNU += '## Thesis available here: http://hdl.handle.net/10214/16278\n';
      GNU += 'gf1A=11.2\n';
      GNU += 'gf1B=-0.5\n';
      GNU += 'gf1C=-0.05\n';
      GNU += 'gf1D=-0.09\n';
      GNU += 'gf1E=0.01\n';
      GNU += 'gf1F=0.0001\n';
      GNU += 'gf1G=-0.04\n';
      GNU += 'gf1H=-0.02\n';
      GNU += 'gf1I=-0.003\n';
      GNU += 'gf1(x) = exp((gf1A*log(x*0.001)**0) + (gf1B*log(x*0.001)**1) + (gf1C*log(x*0.001)**2) + (gf1D*log(x*0.001)**3) + (gf1E*log(x*0.001)**4) + (gf1F*log(x*0.001)**5) + (gf1G*log(x*0.001)**6) + (gf1H*log(x*0.001)**7) + (gf1I*log(x*0.001)**8))\n';
      GNU += 'fit gf1(x) \"GRIFFIN_singles_efficiency_data.dat\" u 1:2:3 yerrors via gf1A, gf1B, gf1C, gf1D, gf1E, gf1F, gf1G, gf1H, gf1I\n\n';

      GNU += '## Plot the data points\n';
      GNU += 'plot [40:10000] \"GRIFFIN_singles_efficiency_data.dat\" t \"Data from ';
      for(i=0; i<keys.length; i++){
        if(i>0){ GNU += '+'; }
        GNU += keys[i];
      }
      GNU += '\" w yerr, \\\n';
      GNU += 'gf1(x) t \" Efficiency fit\"\n';

      // Create a download link
      const textBlob = new Blob([GNU], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = "GRIFFIN_efficiency.gp";

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }
