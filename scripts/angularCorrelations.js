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

  // Cache (Used for improving performance of angularCorrelations-helper functions)
  dataStore.cache = { Wigner6j: [], ClebschGordan: [], term1: [], factorial: [] }    // a cache for ClebschGordan and factorial values that are calculated often

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
  dataStore.histoChoiceBarContents = ['GRIFFIN'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Angular Correlations';                        //header title
  dataStore.plotGroups = [];                                          // groups used for building the specturm menu (plotlite)
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [];                                                 //buffer for raw matrix data
  dataStore.sparseData = {},                                            //buffer for raw data in sparse data mode
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
  dataStore.roughGainMatchParameters = {};

  //fitting
  dataStore.ROI = {};                                                   //regions of interest to look for peaks in: 'plotname': [[low bin, high bin], [low bin, high bin], ...]
  //                                                                      dataStore.ROI[sourceKey][peakIndex] = [low bin, high bin]
  dataStore.fitResults = {};                                            //fit results: 'plotname': [[amplitude, center, width, intercept, slope, area, FWHM], [amplitude, center, width, intercept, slope, area, FWHM]]
  dataStore.fitResultsData = {};              // Store the data of the curve fitting, 'detector-name':{ 'k1':[[x0,y0],[x1,y1]...], 'k2':[[x0,y0],[x1,y1]...], 'e1':[[x0,y0],[x1,y1]...] }
  dataStore.fitResultsParameters = {};        // Store the parameters of the curve fitting, 'detector-name':{ 'k1':[p0,p1,p2,p3,p4,p5,p6], 'k2':[p0,p1,p2,p3,p4,p5,p6], 'e1':[p0,p1,p2,p3,p4,p5,p6] }

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.
  dataStore.detectorType = "HPGe";
  dataStore.sourceType = "152Eu";

  // Workflow management and progress tracking
  dataStore.currentJob = '60Co';                      // 60Co
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "angularCorrelationsProgress";  // id of the Div with class = "progress-bar ..."
  dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
  dataStore.progressBarTasksCompleted = 0;                           // Number of tasks completed so far for use with the progress bar
  dataStore.refitPeakID = -1;
  dataStore.refitCallback = function(){ setTimeout(processAngularCorrelationData(), 1000); }  // callback function for after a peak refit

  // Script configuration - all are arrays used only as user input
  // The 'peakFitterScript' can be provided by the user as an upload and will be copied into this 'dataStore.peakFitterScript' object
  dataStore.peakFitterScript = {
    'histogramFileNames' : [],                                // List of all the histogram files
    'spectrumList1d' : [],                                    // Names of all the 1d spectra
    'spectrumList1dPeaks' : {},                               // List of all peak centroids to be fitted in the 1d spectra
    'spectrumList2d' : [],                                    // Names of all the 2d spectra
    'spectrumListGates' : [],                                 // List of all the gate limits to make projections from the 2d spectra,
    // Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
    'spectrumListProjectionsPeaks' : {}                       // List of all peak centroids to be fitted in the projected 1d spectra from the 2d spectra
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
  dataStore.appLimitsStore = {}; // A place to store the limits, and centroid, set by mouse clicks on a spectrum
  dataStore.setAppLimitsCallback = function(){
    if(dataStore.appLimitsStore["gateLimits"]){
      dataStore.gg_ang_corr_gamma1E = document.getElementById('gamma1Input').value = dataStore.appLimitsStore["gateLimits"].Centroid;
      document.getElementById('gamma1SetLimitsBadge').classList.remove('red-text');
      dataStore.appLimitsStore[dataStore.appLimitsStore["gateLimits"].Centroid] = dataStore.appLimitsStore["gateLimits"];
    }
    if(dataStore.appLimitsStore["peakLimits"]){
      dataStore.gg_ang_corr_gamma2E = document.getElementById('gamma2Input').value = dataStore.appLimitsStore["peakLimits"].Centroid;
      document.getElementById('gamma2SetLimitsBadge').classList.remove('red-text');
      dataStore.appLimitsStore[dataStore.appLimitsStore["peakLimits"].Centroid] = dataStore.appLimitsStore["peakLimits"];
    }
    console.log(dataStore);
  };

  dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects
  dataStore.cellIndex = dataStore.plots.length;

  // Declare the peakFitterScript object
  dataStore.peakFitterScript = {};                                       // This object contains the files, histograms, projections and peaks that dictate the tasks in the workflow

  dataStore.peakFitterScriptTemplate = {};
  dataStore.peakFitterScriptTemplate = {
    'GRG-GRG-145mm' : {'spectrumList1d' : [
      "GRG01BN00A_GGEnergy","GRG01GN00A_GGEnergy","GRG01RN00A_GGEnergy","GRG01WN00A_GGEnergy", "GRG02BN00A_GGEnergy","GRG02GN00A_GGEnergy","GRG02RN00A_GGEnergy","GRG02WN00A_GGEnergy",
      "GRG03BN00A_GGEnergy","GRG03GN00A_GGEnergy","GRG03RN00A_GGEnergy","GRG03WN00A_GGEnergy", "GRG04BN00A_GGEnergy","GRG04GN00A_GGEnergy","GRG04RN00A_GGEnergy","GRG04WN00A_GGEnergy",
      "GRG05BN00A_GGEnergy","GRG05GN00A_GGEnergy","GRG05RN00A_GGEnergy","GRG05WN00A_GGEnergy", "GRG06BN00A_GGEnergy","GRG06GN00A_GGEnergy","GRG06RN00A_GGEnergy","GRG06WN00A_GGEnergy",
      "GRG07BN00A_GGEnergy","GRG07GN00A_GGEnergy","GRG07RN00A_GGEnergy","GRG07WN00A_GGEnergy", "GRG08BN00A_GGEnergy","GRG08GN00A_GGEnergy","GRG08RN00A_GGEnergy","GRG08WN00A_GGEnergy",
      "GRG09BN00A_GGEnergy","GRG09GN00A_GGEnergy","GRG09RN00A_GGEnergy","GRG09WN00A_GGEnergy", "GRG10BN00A_GGEnergy","GRG10GN00A_GGEnergy","GRG10RN00A_GGEnergy","GRG10WN00A_GGEnergy",
      "GRG11BN00A_GGEnergy","GRG11GN00A_GGEnergy","GRG11RN00A_GGEnergy","GRG11WN00A_GGEnergy", "GRG12BN00A_GGEnergy","GRG12GN00A_GGEnergy","GRG12RN00A_GGEnergy","GRG12WN00A_GGEnergy",
      "GRG13BN00A_GGEnergy","GRG13GN00A_GGEnergy","GRG13RN00A_GGEnergy","GRG13WN00A_GGEnergy", "GRG14BN00A_GGEnergy","GRG14GN00A_GGEnergy","GRG14RN00A_GGEnergy","GRG14WN00A_GGEnergy",
      "GRG15BN00A_GGEnergy","GRG15GN00A_GGEnergy","GRG15RN00A_GGEnergy","GRG15WN00A_GGEnergy", "GRG16BN00A_GGEnergy","GRG16GN00A_GGEnergy","GRG16RN00A_GGEnergy","GRG16WN00A_GGEnergy"
    ], 'spectrumList1dPeaks' : { 'All':[] }, 'histogramFileNames' : [],
    'spectrumList2d' : [
      "Ge_Ge_145mm_angular_bin00","Ge_Ge_145mm_angular_bin01","Ge_Ge_145mm_angular_bin02","Ge_Ge_145mm_angular_bin03","Ge_Ge_145mm_angular_bin04",
      "Ge_Ge_145mm_angular_bin05","Ge_Ge_145mm_angular_bin06","Ge_Ge_145mm_angular_bin07","Ge_Ge_145mm_angular_bin08","Ge_Ge_145mm_angular_bin09",
      "Ge_Ge_145mm_angular_bin10","Ge_Ge_145mm_angular_bin11","Ge_Ge_145mm_angular_bin12","Ge_Ge_145mm_angular_bin13","Ge_Ge_145mm_angular_bin14",
      "Ge_Ge_145mm_angular_bin15","Ge_Ge_145mm_angular_bin16","Ge_Ge_145mm_angular_bin17","Ge_Ge_145mm_angular_bin18","Ge_Ge_145mm_angular_bin19",
      "Ge_Ge_145mm_angular_bin20","Ge_Ge_145mm_angular_bin21","Ge_Ge_145mm_angular_bin22","Ge_Ge_145mm_angular_bin23","Ge_Ge_145mm_angular_bin24",
      "Ge_Ge_145mm_angular_bin25","Ge_Ge_145mm_angular_bin26","Ge_Ge_145mm_angular_bin27","Ge_Ge_145mm_angular_bin28","Ge_Ge_145mm_angular_bin29",
      "Ge_Ge_145mm_angular_bin30","Ge_Ge_145mm_angular_bin31","Ge_Ge_145mm_angular_bin32","Ge_Ge_145mm_angular_bin33","Ge_Ge_145mm_angular_bin34",
      "Ge_Ge_145mm_angular_bin35","Ge_Ge_145mm_angular_bin36","Ge_Ge_145mm_angular_bin37","Ge_Ge_145mm_angular_bin38","Ge_Ge_145mm_angular_bin39",
      "Ge_Ge_145mm_angular_bin40","Ge_Ge_145mm_angular_bin41","Ge_Ge_145mm_angular_bin42","Ge_Ge_145mm_angular_bin43","Ge_Ge_145mm_angular_bin44",
      "Ge_Ge_145mm_angular_bin45","Ge_Ge_145mm_angular_bin46","Ge_Ge_145mm_angular_bin47","Ge_Ge_145mm_angular_bin48","Ge_Ge_145mm_angular_bin49",
      "Ge_Ge_145mm_angular_bin50","Ge_Ge_145mm_angular_bin51"

    ], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'GRG-GRG-110mm' : {'spectrumList1d' : [
      "GRG01BN00A_GGEnergy","GRG01GN00A_GGEnergy","GRG01RN00A_GGEnergy","GRG01WN00A_GGEnergy", "GRG02BN00A_GGEnergy","GRG02GN00A_GGEnergy","GRG02RN00A_GGEnergy","GRG02WN00A_GGEnergy",
      "GRG03BN00A_GGEnergy","GRG03GN00A_GGEnergy","GRG03RN00A_GGEnergy","GRG03WN00A_GGEnergy", "GRG04BN00A_GGEnergy","GRG04GN00A_GGEnergy","GRG04RN00A_GGEnergy","GRG04WN00A_GGEnergy",
      "GRG05BN00A_GGEnergy","GRG05GN00A_GGEnergy","GRG05RN00A_GGEnergy","GRG05WN00A_GGEnergy", "GRG06BN00A_GGEnergy","GRG06GN00A_GGEnergy","GRG06RN00A_GGEnergy","GRG06WN00A_GGEnergy",
      "GRG07BN00A_GGEnergy","GRG07GN00A_GGEnergy","GRG07RN00A_GGEnergy","GRG07WN00A_GGEnergy", "GRG08BN00A_GGEnergy","GRG08GN00A_GGEnergy","GRG08RN00A_GGEnergy","GRG08WN00A_GGEnergy",
      "GRG09BN00A_GGEnergy","GRG09GN00A_GGEnergy","GRG09RN00A_GGEnergy","GRG09WN00A_GGEnergy", "GRG10BN00A_GGEnergy","GRG10GN00A_GGEnergy","GRG10RN00A_GGEnergy","GRG10WN00A_GGEnergy",
      "GRG11BN00A_GGEnergy","GRG11GN00A_GGEnergy","GRG11RN00A_GGEnergy","GRG11WN00A_GGEnergy", "GRG12BN00A_GGEnergy","GRG12GN00A_GGEnergy","GRG12RN00A_GGEnergy","GRG12WN00A_GGEnergy",
      "GRG13BN00A_GGEnergy","GRG13GN00A_GGEnergy","GRG13RN00A_GGEnergy","GRG13WN00A_GGEnergy", "GRG14BN00A_GGEnergy","GRG14GN00A_GGEnergy","GRG14RN00A_GGEnergy","GRG14WN00A_GGEnergy",
      "GRG15BN00A_GGEnergy","GRG15GN00A_GGEnergy","GRG15RN00A_GGEnergy","GRG15WN00A_GGEnergy", "GRG16BN00A_GGEnergy","GRG16GN00A_GGEnergy","GRG16RN00A_GGEnergy","GRG16WN00A_GGEnergy"
    ], 'spectrumList1dPeaks' : { 'All':[] }, 'histogramFileNames' : [],
    'spectrumList2d' : [
      "Ge_Ge_110mm_angular_bin00","Ge_Ge_110mm_angular_bin01","Ge_Ge_110mm_angular_bin02","Ge_Ge_110mm_angular_bin03","Ge_Ge_110mm_angular_bin04",
      "Ge_Ge_110mm_angular_bin05","Ge_Ge_110mm_angular_bin06","Ge_Ge_110mm_angular_bin07","Ge_Ge_110mm_angular_bin08","Ge_Ge_110mm_angular_bin09",
      "Ge_Ge_110mm_angular_bin10","Ge_Ge_110mm_angular_bin11","Ge_Ge_110mm_angular_bin12","Ge_Ge_110mm_angular_bin13","Ge_Ge_110mm_angular_bin14",
      "Ge_Ge_110mm_angular_bin15","Ge_Ge_110mm_angular_bin16","Ge_Ge_110mm_angular_bin17","Ge_Ge_110mm_angular_bin18","Ge_Ge_110mm_angular_bin19",
      "Ge_Ge_110mm_angular_bin20","Ge_Ge_110mm_angular_bin21","Ge_Ge_110mm_angular_bin22","Ge_Ge_110mm_angular_bin23","Ge_Ge_110mm_angular_bin24",
      "Ge_Ge_110mm_angular_bin25","Ge_Ge_110mm_angular_bin26","Ge_Ge_110mm_angular_bin27","Ge_Ge_110mm_angular_bin28","Ge_Ge_110mm_angular_bin29",
      "Ge_Ge_110mm_angular_bin30","Ge_Ge_110mm_angular_bin31","Ge_Ge_110mm_angular_bin32","Ge_Ge_110mm_angular_bin33","Ge_Ge_110mm_angular_bin34",
      "Ge_Ge_110mm_angular_bin35","Ge_Ge_110mm_angular_bin36","Ge_Ge_110mm_angular_bin37","Ge_Ge_110mm_angular_bin38","Ge_Ge_110mm_angular_bin39",
      "Ge_Ge_110mm_angular_bin40","Ge_Ge_110mm_angular_bin41","Ge_Ge_110mm_angular_bin42","Ge_Ge_110mm_angular_bin43","Ge_Ge_110mm_angular_bin44",
      "Ge_Ge_110mm_angular_bin45","Ge_Ge_110mm_angular_bin46","Ge_Ge_110mm_angular_bin47","Ge_Ge_110mm_angular_bin48","Ge_Ge_110mm_angular_bin49",
      "Ge_Ge_110mm_angular_bin50","Ge_Ge_110mm_angular_bin51"

    ], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'GRG-ART' : {'spectrumList1d' : [
      "GRG01BN00A_Energy","GRG01GN00A_Energy","GRG01RN00A_Energy","GRG01WN00A_Energy", "GRG02BN00A_Energy","GRG02GN00A_Energy","GRG02RN00A_Energy","GRG02WN00A_Energy",
      "GRG03BN00A_Energy","GRG03GN00A_Energy","GRG03RN00A_Energy","GRG03WN00A_Energy", "GRG04BN00A_Energy","GRG04GN00A_Energy","GRG04RN00A_Energy","GRG04WN00A_Energy",
      "GRG05BN00A_Energy","GRG05GN00A_Energy","GRG05RN00A_Energy","GRG05WN00A_Energy", "GRG06BN00A_Energy","GRG06GN00A_Energy","GRG06RN00A_Energy","GRG06WN00A_Energy",
      "GRG07BN00A_Energy","GRG07GN00A_Energy","GRG07RN00A_Energy","GRG07WN00A_Energy", "GRG08BN00A_Energy","GRG08GN00A_Energy","GRG08RN00A_Energy","GRG08WN00A_Energy",
      "GRG09BN00A_Energy","GRG09GN00A_Energy","GRG09RN00A_Energy","GRG09WN00A_Energy", "GRG10BN00A_Energy","GRG10GN00A_Energy","GRG10RN00A_Energy","GRG10WN00A_Energy",
      "GRG11BN00A_Energy","GRG11GN00A_Energy","GRG11RN00A_Energy","GRG11WN00A_Energy", "GRG12BN00A_Energy","GRG12GN00A_Energy","GRG12RN00A_Energy","GRG12WN00A_Energy",
      "GRG13BN00A_Energy","GRG13GN00A_Energy","GRG13RN00A_Energy","GRG13WN00A_Energy", "GRG14BN00A_Energy","GRG14GN00A_Energy","GRG14RN00A_Energy","GRG14WN00A_Energy",
      "GRG15BN00A_Energy","GRG15GN00A_Energy","GRG15RN00A_Energy","GRG15WN00A_Energy", "GRG16BN00A_Energy","GRG16GN00A_Energy","GRG16RN00A_Energy","GRG16WN00A_Energy"
    ], 'spectrumList1dPeaks' : { 'All':[] }, 'histogramFileNames' : [],
    'spectrumList2d' : [
      "Ge-ART_angular_bin000","Ge-ART_angular_bin001","Ge-ART_angular_bin002","Ge-ART_angular_bin003","Ge-ART_angular_bin004",
      "Ge-ART_angular_bin005","Ge-ART_angular_bin006","Ge-ART_angular_bin007","Ge-ART_angular_bin008","Ge-ART_angular_bin009",
      "Ge-ART_angular_bin010","Ge-ART_angular_bin011","Ge-ART_angular_bin012","Ge-ART_angular_bin013","Ge-ART_angular_bin014",
      "Ge-ART_angular_bin015","Ge-ART_angular_bin016","Ge-ART_angular_bin017","Ge-ART_angular_bin018","Ge-ART_angular_bin019",
      "Ge-ART_angular_bin020","Ge-ART_angular_bin021","Ge-ART_angular_bin022","Ge-ART_angular_bin023","Ge-ART_angular_bin024",
      "Ge-ART_angular_bin025","Ge-ART_angular_bin026","Ge-ART_angular_bin027","Ge-ART_angular_bin028","Ge-ART_angular_bin029",
      "Ge-ART_angular_bin030","Ge-ART_angular_bin031","Ge-ART_angular_bin032","Ge-ART_angular_bin033","Ge-ART_angular_bin034",
      "Ge-ART_angular_bin035","Ge-ART_angular_bin036","Ge-ART_angular_bin037","Ge-ART_angular_bin038","Ge-ART_angular_bin039",
      "Ge-ART_angular_bin040","Ge-ART_angular_bin041","Ge-ART_angular_bin042","Ge-ART_angular_bin043","Ge-ART_angular_bin044",
      "Ge-ART_angular_bin045","Ge-ART_angular_bin046","Ge-ART_angular_bin047","Ge-ART_angular_bin048","Ge-ART_angular_bin049",
      "Ge-ART_angular_bin050","Ge-ART_angular_bin051","Ge-ART_angular_bin052","Ge-ART_angular_bin053","Ge-ART_angular_bin054" // NEED MORE HERE, 114 bins

    ], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'DSW-DSW' : {'spectrumList1d' : [
      "GRG01BN00A_Energy","GRG01GN00A_Energy","GRG01RN00A_Energy","GRG01WN00A_Energy", "GRG02BN00A_Energy","GRG02GN00A_Energy","GRG02RN00A_Energy","GRG02WN00A_Energy",
      "GRG03BN00A_Energy","GRG03GN00A_Energy","GRG03RN00A_Energy","GRG03WN00A_Energy", "GRG04BN00A_Energy","GRG04GN00A_Energy","GRG04RN00A_Energy","GRG04WN00A_Energy",
      "GRG05BN00A_Energy","GRG05GN00A_Energy","GRG05RN00A_Energy","GRG05WN00A_Energy", "GRG06BN00A_Energy","GRG06GN00A_Energy","GRG06RN00A_Energy","GRG06WN00A_Energy",
      "GRG07BN00A_Energy","GRG07GN00A_Energy","GRG07RN00A_Energy","GRG07WN00A_Energy", "GRG08BN00A_Energy","GRG08GN00A_Energy","GRG08RN00A_Energy","GRG08WN00A_Energy",
      "GRG09BN00A_Energy","GRG09GN00A_Energy","GRG09RN00A_Energy","GRG09WN00A_Energy", "GRG10BN00A_Energy","GRG10GN00A_Energy","GRG10RN00A_Energy","GRG10WN00A_Energy",
      "GRG11BN00A_Energy","GRG11GN00A_Energy","GRG11RN00A_Energy","GRG11WN00A_Energy", "GRG12BN00A_Energy","GRG12GN00A_Energy","GRG12RN00A_Energy","GRG12WN00A_Energy",
      "GRG13BN00A_Energy","GRG13GN00A_Energy","GRG13RN00A_Energy","GRG13WN00A_Energy", "GRG14BN00A_Energy","GRG14GN00A_Energy","GRG14RN00A_Energy","GRG14WN00A_Energy",
      "GRG15BN00A_Energy","GRG15GN00A_Energy","GRG15RN00A_Energy","GRG15WN00A_Energy", "GRG16BN00A_Energy","GRG16GN00A_Energy","GRG16RN00A_Energy","GRG16WN00A_Energy"
    ], 'spectrumList1dPeaks' : { 'All':[] }, 'histogramFileNames' : [],
    'spectrumList2d' : [
      "DSW-DSW_angular_bin000","DSW-DSW_angular_bin001","DSW-DSW_angular_bin002","DSW-DSW_angular_bin003","DSW-DSW_angular_bin004",
      "DSW-DSW_angular_bin005","DSW-DSW_angular_bin006","DSW-DSW_angular_bin007","DSW-DSW_angular_bin008","DSW-DSW_angular_bin009",
      "DSW-DSW_angular_bin010","DSW-DSW_angular_bin011","DSW-DSW_angular_bin012","DSW-DSW_angular_bin013","DSW-DSW_angular_bin014",
      "DSW-DSW_angular_bin015","DSW-DSW_angular_bin016","DSW-DSW_angular_bin017","DSW-DSW_angular_bin018","DSW-DSW_angular_bin019",
      "DSW-DSW_angular_bin020","DSW-DSW_angular_bin021","DSW-DSW_angular_bin022","DSW-DSW_angular_bin023","DSW-DSW_angular_bin024",
      "DSW-DSW_angular_bin025","DSW-DSW_angular_bin026","DSW-DSW_angular_bin027","DSW-DSW_angular_bin028","DSW-DSW_angular_bin029",
      "DSW-DSW_angular_bin030","DSW-DSW_angular_bin031","DSW-DSW_angular_bin032","DSW-DSW_angular_bin033","DSW-DSW_angular_bin034",
      "DSW-DSW_angular_bin035","DSW-DSW_angular_bin036","DSW-DSW_angular_bin037","DSW-DSW_angular_bin038","DSW-DSW_angular_bin039",
      "DSW-DSW_angular_bin040","DSW-DSW_angular_bin041"

    ], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}}

  };


  // Pagination for the results and plotting display
  // plotRegion = spectra
  // energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
  // energyCalibrator = Table of all (detector num, fit params, r2)
  // graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
  // graphSection = plot of all the residuals for specific peak
  // Variables for Pagination menu buttons
  dataStore.buttonNames = ["Spectra", "Peak Fits", "Ang Corr Data Overview table", "Ang Corr Weights Overview table", "Ang Corr Plots"];  // Names to appear on the buttons
  dataStore.buttonIDs = ["plotRegionMenuButton", "fitsTableRegionMenuButton", "dataTableRegionMenuButton", "weightTableRegionMenuButton", "dataPlotRegionMenuButton"];    // IDs for the buttons
  dataStore.buttonPages = ["plotRegion", "resultsFitsTableRegion", "resultsDataTableRegion", "resultsWeightTableRegion","resultsPlotRegion"];                 // Pages (div IDs) to be associated with the buttons

  // Generate THESEdetectors object.
  dataStore.numberOfClovers = 16;
  dataStore.THESEdetectors = [];

  // App specific data structures
  dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared],
  //   'pileupk1':[1 0 0 0 0 0 0], 'pileupk2':[1 0 0 0 0 0 0], 'pileupE1':[0 0 0 0 0 0 0], 'crosstalk:[0,1,0,0,0,0,0]'}

  // User input choices
  dataStore.detectorChoice = [
    {"name": "GRG-GRG-145mm", "title": "Ge-Ge, 145mm"},
    {"name": "GRG-GRG-110mm", "title": "Ge-Ge, 110mm"},
    {"name": "GRG-ART", "title": "Ge-ARIES"},
    {"name": "DSW-DSW", "title": "DSW-DSW (Descant Wall)"}
  ];       // Detector choice information to generate buttons


  // Custom settings for Angular Correlations
  dataStore.singlesSpectra = [];                // list of the names of the singles spectra to be fitted
  dataStore.angCorrProjections = [];            // list of the names of the projections to be fitted
  dataStore.angularBinRawPeakArea = [];         // place to store the raw peak area for each angular bin
  dataStore.angularBinRawPeakAreaUnc = [];         // place to store the uncertainty in the raw peak area for each angular bin
  dataStore.angularBinTRBGPeakArea = [];         // place to store the time-random background peak area for each angular bin
  dataStore.angularBinTRBGPeakAreaUnc = [];         // place to store the uncertainty in the time-random background peak area for each angular bin
  dataStore.angularBinTRBGFactor = [];         // place to store the time-random background factor for each angular bin
  dataStore.angularBinTRBGFactorUnc = [];         // place to store the time-random background factor for each angular bin
  dataStore.angularBinPeakArea = [];         // place to store the peak area for each angular bin
  dataStore.angularBinPeakAreaUnc = [];         // place to store the uncertainty in the peak area for each angular bin
  dataStore.angularBinWeight = [];           // place to store the weighting factor for each angular bin
  dataStore.angularBinWeightUnc = [];        // place to store the weighting factor uncertainty for each angular bin
  dataStore.normalizationFactor = [];        // place to store the Normalization Factor for the angular correlation
  dataStore.normalizationFactorUnc = [];        // place to store the Normalization Factor for the angular correlation
  dataStore.angularBinExcludeList = [];       // place to store list of indexes for angular bins that will be excluded from plots and fitting
  dataStore.angularBinData = [];             // place to store the data value for each angular bin. raw area * bin weight * Normalization
  dataStore.angularBinDataUnc = [];          // place to store the data value uncertainty for each angular bin. raw area * bin weight * Normalization
  dataStore.systematicUncertainty = 0.0;     // a systematic uncertainty to add in quadrature to the angularBinDataUnc
  dataStore.angularBinDataResiduals = [];    // place to store the residuals of the data vs best fit
  dataStore.singlesPeakArea = [];            // place to store the peak areas from each angular bin
  dataStore.singlesPeakAreaUnc = [];            // place to store the peak areas from each angular bin
  dataStore.numCrystalPairs = [];            // place to store the number of crystal pairs for each angular bin
  dataStore.numDegreesOfFreedom = [];          // place to store the number of degrees of freedom for the chi-square fits
  dataStore.criticalValue = 0.0;             // place to store the current critical chi-square value
  dataStore.criticalLevel = 2;               // place to store the current critical value confidence Level index number
  dataStore.criticalLevelStrings = ["90%","95%","99%"];             // place to store the current critical value confidence Level strings
  dataStore.criticalChiSquareValueTable =            // Critical chi-square values for 90%, 95% and 99% confidence levels. index is (NDF-1). https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm
  [[2.706,4.605,6.251,7.779,9.236,10.645,12.017,13.362,14.684,15.987,17.275,18.549,19.812,21.064,22.307,23.542,24.769,25.989,27.204,28.412,29.615,30.813,32.007,33.196,34.382,35.563,36.741,37.916,39.087,40.256,41.422,42.585,43.745,44.903,46.059,47.212,48.363,49.513,50.66,51.805,52.949,54.09,55.23,56.369,57.505,58.641,59.774,60.907,62.038,63.167,64.295,65.422,66.548,67.673,68.796,69.919,71.04,72.16,73.279,74.397,75.514,76.63,77.745,78.86,79.973,81.085,82.197,83.308,84.418,85.527,86.635,87.743,88.85,89.956,91.061,92.166,93.27,94.374,95.476,96.578,97.68,98.78,99.88,100.98,102.079,103.177,104.275,105.372,106.469,107.565,108.661,109.756,110.85,111.944,113.038,114.131,115.223,116.315,117.407,118.498],
  [3.841,5.991,7.815,9.488,11.07,12.592,14.067,15.507,16.919,18.307,19.675,21.026,22.362,23.685,24.996,26.296,27.587,28.869,30.144,31.41,32.671,33.924,35.172,36.415,37.652,38.885,40.113,41.337,42.557,43.773,44.985,46.194,47.4,48.602,49.802,50.998,52.192,53.384,54.572,55.758,56.942,58.124,59.304,60.481,61.656,62.83,64.001,65.171,66.339,67.505,68.669,69.832,70.993,72.153,73.311,74.468,75.624,76.778,77.931,79.082,80.232,81.381,82.529,83.675,84.821,85.965,87.108,88.25,89.391,90.531,91.67,92.808,93.945,95.081,96.217,97.351,98.484,99.617,100.749,101.879,103.01,104.139,105.267,106.395,107.522,108.648,109.773,110.898,112.022,113.145,114.268,115.39,116.511,117.632,118.752,119.871,120.99,122.108,123.225,124.342],
  [6.635,9.21,11.345,13.277,15.086,16.812,18.475,20.09,21.666,23.209,24.725,26.217,27.688,29.141,30.578,32,33.409,34.805,36.191,37.566,38.932,40.289,41.638,42.98,44.314,45.642,46.963,48.278,49.588,50.892,52.191,53.486,54.776,56.061,57.342,58.619,59.893,61.162,62.428,63.691,64.95,66.206,67.459,68.71,69.957,71.201,72.443,73.683,74.919,76.154,77.386,78.616,79.843,81.069,82.292,83.513,84.733,85.95,87.166,88.379,89.591,90.802,92.01,93.217,94.422,95.626,96.828,98.028,99.228,100.425,101.621,102.816,104.01,105.202,106.393,107.583,108.771,109.958,111.144,112.329,113.512,114.695,115.876,117.057,118.236,119.414,120.591,121.767,122.942,124.116,125.289,126.462,127.633,128.803,129.973,131.141,132.309,133.476,134.642,135.807]];
  dataStore.iteration = 0;
  dataStore.bestFitCoeffs = [null,null];              // place to store best fit c2,c4 values
  dataStore.minimaDetails = {};            // place to store best fit result values for all series
  dataStore.NEWminimaDetails = {};            // place to store best fit result values for all series
  dataStore.displayLineData = [];              // Data for the line drawn on the Ang Corr Data plot. Initiallty it will be best fit but can be different
  dataStore.displayLineName = [];              // Name for the line drawn on the Ang Corr Data plot. Initiallty it will be best fit but can be different
  dataStore.displayLineTitle = ""; // Text to be shown as a subtitle on the data plot

  dataStore.theseAngularBins = [];   // At initalization the appropriate 110/145mm data will be copied into here
  dataStore.theseAngularBinsRadians = []; // angular bins in radians rather than degrees
  dataStore.theseGeAngles = []; // At initalization the appropriate 110/145mm data will be copied into here

  // angular differences in degrees for the 110mm distance. There are
  // 110mm
  dataStore.angular_bins_110mm = [
    0.000, 18.787, 25.602, 26.690, 31.946, 33.654, 44.364, 46.794, 48.576, 49.798,
    53.834, 60.151, 62.705, 63.086, 65.016, 66.461, 67.456, 69.864, 70.860, 73.084,
    76.381, 78.669, 83.043, 86.228, 86.238, 88.474, 91.526, 93.762, 93.772, 96.957,
    101.331, 103.619, 106.916, 109.140, 110.136, 112.544, 113.539, 114.984, 116.914,
    117.295, 119.849, 126.166, 130.202, 131.424, 133.206, 135.636, 146.346, 148.054,
    153.310, 154.398, 161.213, 180.000
  ];


  // ge_angles_110mm[c1][c2] = angularIndex of the angular_bins_110mm array of angular differences in degrees
  // angularIndex runs from 0 to 51.
  // c1 and c2 run from 0 to 63
  // Used in angularCorrelations.js to calculate weighting factors
  dataStore.ge_angles_110mm = [
    [0,1,3,1,9,11,7,5,19,26,25,17,9,14,20,12,11,20,24,18,6,13,15,8,
      10,18,14,7,21,28,22,16,31,40,33,27,38,45,43,36,33,41,44,37,23,30,35,29,25,32,
      34,26,37,42,39,31,50,51,50,48,40,42,46,44],
      [1,0,1,3,14,18,10,7,26,34,32,25,11,18,24,20,9,12,20,14,2,6,8,4,7,11,9,5,22,28,21,16,39,42,37,31,45,49,47,43,40,44,46,42,23,29,35,30,17,25,26,19,33,40,31,27,51,50,48,50,33,37,44,41],
      [3,1,0,1,20,24,18,11,25,32,34,26,7,10,18,14,5,9,11,7,4,8,6,2,14,20,12,9,30,35,29,23,42,46,44,40,43,47,49,45,31,37,42,39,16,21,28,22,19,26,25,17,41,44,37,33,50,48,50,51,27,31,40,33],
      [1,3,1,0,12,20,14,9,17,25,26,19,5,7,11,9,7,14,18,10,8,15,13,6,18,24,20,11,29,35,30,23,37,44,41,33,36,43,45,38,27,33,40,31,16,22,28,21,26,34,32,25,44,46,42,40,48,50,51,50,31,39,42,37],
      [9,14,20,12,0,1,3,1,9,11,7,5,19,26,25,17,33,41,44,37,23,30,35,29,11,20,24,18,6,13,15,8,10,18,14,7,21,28,22,16,31,40,33,27,38,45,43,36,40,42,46,44,25,32,34,26,37,42,39,31,50,51,50,48],
      [11,18,24,20,1,0,1,3,14,18,10,7,26,34,32,25,40,44,46,42,23,29,35,30,9,12,20,14,2,6,8,4,7,11,9,5,22,28,21,16,39,42,37,31,45,49,47,43,33,37,44,41,17,25,26,19,33,40,31,27,51,50,48,50],
      [7,10,18,14,3,1,0,1,20,24,18,11,25,32,34,26,31,37,42,39,16,21,28,22,5,9,11,7,4,8,6,2,14,20,12,9,30,35,29,23,42,46,44,40,43,47,49,45,27,31,40,33,19,26,25,17,41,44,37,33,50,48,50,51],
      [5,7,11,9,1,3,1,0,12,20,14,9,17,25,26,19,27,33,40,31,16,22,28,21,7,14,18,10,8,15,13,6,18,24,20,11,29,35,30,23,37,44,41,33,36,43,45,38,31,39,42,37,26,34,32,25,44,46,42,40,48,50,51,50],
      [19,26,25,17,9,14,20,12,0,1,3,1,9,11,7,5,31,40,33,27,38,45,43,36,33,41,44,37,23,30,35,29,11,20,24,18,6,13,15,8,10,18,14,7,21,28,22,16,50,51,50,48,40,42,46,44,25,32,34,26,37,42,39,31],
      [26,34,32,25,11,18,24,20,1,0,1,3,14,18,10,7,39,42,37,31,45,49,47,43,40,44,46,42,23,29,35,30,9,12,20,14,2,6,8,4,7,11,9,5,22,28,21,16,51,50,48,50,33,37,44,41,17,25,26,19,33,40,31,27],
      [25,32,34,26,7,10,18,14,3,1,0,1,20,24,18,11,42,46,44,40,43,47,49,45,31,37,42,39,16,21,28,22,5,9,11,7,4,8,6,2,14,20,12,9,30,35,29,23,50,48,50,51,27,31,40,33,19,26,25,17,41,44,37,33],
      [17,25,26,19,5,7,11,9,1,3,1,0,12,20,14,9,37,44,41,33,36,43,45,38,27,33,40,31,16,22,28,21,7,14,18,10,8,15,13,6,18,24,20,11,29,35,30,23,48,50,51,50,31,39,42,37,26,34,32,25,44,46,42,40],
      [9,11,7,5,19,26,25,17,9,14,20,12,0,1,3,1,10,18,14,7,21,28,22,16,31,40,33,27,38,45,43,36,33,41,44,37,23,30,35,29,11,20,24,18,6,13,15,8,37,42,39,31,50,51,50,48,40,42,46,44,25,32,34,26],
      [14,18,10,7,26,34,32,25,11,18,24,20,1,0,1,3,7,11,9,5,22,28,21,16,39,42,37,31,45,49,47,43,40,44,46,42,23,29,35,30,9,12,20,14,2,6,8,4,33,40,31,27,51,50,48,50,33,37,44,41,17,25,26,19],
      [20,24,18,11,25,32,34,26,7,10,18,14,3,1,0,1,14,20,12,9,30,35,29,23,42,46,44,40,43,47,49,45,31,37,42,39,16,21,28,22,5,9,11,7,4,8,6,2,41,44,37,33,50,48,50,51,27,31,40,33,19,26,25,17],
      [12,20,14,9,17,25,26,19,5,7,11,9,1,3,1,0,18,24,20,11,29,35,30,23,37,44,41,33,36,43,45,38,27,33,40,31,16,22,28,21,7,14,18,10,8,15,13,6,44,46,42,40,48,50,51,50,31,39,42,37,26,34,32,25],
      [11,9,5,7,33,40,31,27,31,39,42,37,10,7,14,18,0,1,3,1,6,8,4,2,25,26,19,17,43,45,38,36,50,51,50,48,43,45,49,47,25,26,34,32,6,8,15,13,12,20,14,9,44,41,33,37,42,40,44,46,11,18,24,20],
      [20,12,9,14,41,44,37,33,40,42,46,44,18,11,20,24,1,0,1,3,8,6,2,4,26,25,17,19,45,43,36,38,51,50,48,50,45,43,47,49,26,25,32,34,8,6,13,15,9,11,7,5,40,33,27,31,39,31,37,42,7,10,18,14],
      [24,20,11,18,44,46,42,40,33,37,44,41,14,9,12,20,3,1,0,1,15,13,6,8,34,32,25,26,49,47,43,45,50,48,50,51,38,36,43,45,19,17,25,26,4,2,6,8,14,18,10,7,42,37,31,39,31,27,33,40,5,7,11,9],
      [18,14,7,10,37,42,39,31,27,31,40,33,7,5,9,11,1,3,1,0,13,15,8,6,32,34,26,25,47,49,45,43,48,50,51,50,36,38,45,43,17,19,26,25,2,4,8,6,20,24,18,11,46,44,40,42,37,33,41,44,9,14,20,12],
      [6,2,4,8,23,23,16,16,38,45,43,36,21,22,30,29,6,8,15,13,0,1,3,1,6,8,4,2,25,26,19,17,43,45,38,36,50,51,50,48,43,45,49,47,25,26,34,32,6,13,15,8,29,30,22,21,49,45,43,47,28,28,35,35],
      [13,6,8,15,30,29,21,22,45,49,47,43,28,28,35,35,8,6,13,15,1,0,1,3,8,6,2,4,26,25,17,19,45,43,36,38,51,50,48,50,45,43,47,49,26,25,32,34,2,6,8,4,23,23,16,16,45,38,36,43,22,21,29,30],
      [15,8,6,13,35,35,28,28,43,47,49,45,22,21,29,30,4,2,6,8,3,1,0,1,15,13,6,8,34,32,25,26,49,47,43,45,50,48,50,51,38,36,43,45,19,17,25,26,4,8,6,2,30,29,21,22,43,36,38,45,16,16,23,23],
      [8,4,2,6,29,30,22,21,36,43,45,38,16,16,23,23,2,4,8,6,1,3,1,0,13,15,8,6,32,34,26,25,47,49,45,43,48,50,51,50,36,38,45,43,17,19,26,25,8,15,13,6,35,35,28,28,47,43,45,49,21,22,30,29],
      [10,7,14,18,11,9,5,7,33,40,31,27,31,39,42,37,25,26,34,32,6,8,15,13,0,1,3,1,6,8,4,2,25,26,19,17,43,45,38,36,50,51,50,48,43,45,49,47,11,18,24,20,12,20,14,9,44,41,33,37,42,40,44,46],
      [18,11,20,24,20,12,9,14,41,44,37,33,40,42,46,44,26,25,32,34,8,6,13,15,1,0,1,3,8,6,2,4,26,25,17,19,45,43,36,38,51,50,48,50,45,43,47,49,7,10,18,14,9,11,7,5,40,33,27,31,39,31,37,42],
      [14,9,12,20,24,20,11,18,44,46,42,40,33,37,44,41,19,17,25,26,4,2,6,8,3,1,0,1,15,13,6,8,34,32,25,26,49,47,43,45,50,48,50,51,38,36,43,45,5,7,11,9,14,18,10,7,42,37,31,39,31,27,33,40],
      [7,5,9,11,18,14,7,10,37,42,39,31,27,31,40,33,17,19,26,25,2,4,8,6,1,3,1,0,13,15,8,6,32,34,26,25,47,49,45,43,48,50,51,50,36,38,45,43,9,14,20,12,20,24,18,11,46,44,40,42,37,33,41,44],
      [21,22,30,29,6,2,4,8,23,23,16,16,38,45,43,36,43,45,49,47,25,26,34,32,6,8,15,13,0,1,3,1,6,8,4,2,25,26,19,17,43,45,38,36,50,51,50,48,28,28,35,35,6,13,15,8,29,30,22,21,49,45,43,47],
      [28,28,35,35,13,6,8,15,30,29,21,22,45,49,47,43,45,43,47,49,26,25,32,34,8,6,13,15,1,0,1,3,8,6,2,4,26,25,17,19,45,43,36,38,51,50,48,50,22,21,29,30,2,6,8,4,23,23,16,16,45,38,36,43],
      [22,21,29,30,15,8,6,13,35,35,28,28,43,47,49,45,38,36,43,45,19,17,25,26,4,2,6,8,3,1,0,1,15,13,6,8,34,32,25,26,49,47,43,45,50,48,50,51,16,16,23,23,4,8,6,2,30,29,21,22,43,36,38,45],
      [16,16,23,23,8,4,2,6,29,30,22,21,36,43,45,38,36,38,45,43,17,19,26,25,2,4,8,6,1,3,1,0,13,15,8,6,32,34,26,25,47,49,45,43,48,50,51,50,21,22,30,29,8,15,13,6,35,35,28,28,47,43,45,49],
      [31,39,42,37,10,7,14,18,11,9,5,7,33,40,31,27,50,51,50,48,43,45,49,47,25,26,34,32,6,8,15,13,0,1,3,1,6,8,4,2,25,26,19,17,43,45,38,36,42,40,44,46,11,18,24,20,12,20,14,9,44,41,33,37],
      [40,42,46,44,18,11,20,24,20,12,9,14,41,44,37,33,51,50,48,50,45,43,47,49,26,25,32,34,8,6,13,15,1,0,1,3,8,6,2,4,26,25,17,19,45,43,36,38,39,31,37,42,7,10,18,14,9,11,7,5,40,33,27,31],
      [33,37,44,41,14,9,12,20,24,20,11,18,44,46,42,40,50,48,50,51,38,36,43,45,19,17,25,26,4,2,6,8,3,1,0,1,15,13,6,8,34,32,25,26,49,47,43,45,31,27,33,40,5,7,11,9,14,18,10,7,42,37,31,39],
      [27,31,40,33,7,5,9,11,18,14,7,10,37,42,39,31,48,50,51,50,36,38,45,43,17,19,26,25,2,4,8,6,1,3,1,0,13,15,8,6,32,34,26,25,47,49,45,43,37,33,41,44,9,14,20,12,20,24,18,11,46,44,40,42],
      [38,45,43,36,21,22,30,29,6,2,4,8,23,23,16,16,43,45,38,36,50,51,50,48,43,45,49,47,25,26,34,32,6,8,15,13,0,1,3,1,6,8,4,2,25,26,19,17,49,45,43,47,28,28,35,35,6,13,15,8,29,30,22,21],
      [45,49,47,43,28,28,35,35,13,6,8,15,30,29,21,22,45,43,36,38,51,50,48,50,45,43,47,49,26,25,32,34,8,6,13,15,1,0,1,3,8,6,2,4,26,25,17,19,45,38,36,43,22,21,29,30,2,6,8,4,23,23,16,16],
      [43,47,49,45,22,21,29,30,15,8,6,13,35,35,28,28,49,47,43,45,50,48,50,51,38,36,43,45,19,17,25,26,4,2,6,8,3,1,0,1,15,13,6,8,34,32,25,26,43,36,38,45,16,16,23,23,4,8,6,2,30,29,21,22],
      [36,43,45,38,16,16,23,23,8,4,2,6,29,30,22,21,47,49,45,43,48,50,51,50,36,38,45,43,17,19,26,25,2,4,8,6,1,3,1,0,13,15,8,6,32,34,26,25,47,43,45,49,21,22,30,29,8,15,13,6,35,35,28,28],
      [33,40,31,27,31,39,42,37,10,7,14,18,11,9,5,7,25,26,19,17,43,45,38,36,50,51,50,48,43,45,49,47,25,26,34,32,6,8,15,13,0,1,3,1,6,8,4,2,44,41,33,37,42,40,44,46,11,18,24,20,12,20,14,9],
      [41,44,37,33,40,42,46,44,18,11,20,24,20,12,9,14,26,25,17,19,45,43,36,38,51,50,48,50,45,43,47,49,26,25,32,34,8,6,13,15,1,0,1,3,8,6,2,4,40,33,27,31,39,31,37,42,7,10,18,14,9,11,7,5],
      [44,46,42,40,33,37,44,41,14,9,12,20,24,20,11,18,34,32,25,26,49,47,43,45,50,48,50,51,38,36,43,45,19,17,25,26,4,2,6,8,3,1,0,1,15,13,6,8,42,37,31,39,31,27,33,40,5,7,11,9,14,18,10,7],
      [37,42,39,31,27,31,40,33,7,5,9,11,18,14,7,10,32,34,26,25,47,49,45,43,48,50,51,50,36,38,45,43,17,19,26,25,2,4,8,6,1,3,1,0,13,15,8,6,46,44,40,42,37,33,41,44,9,14,20,12,20,24,18,11],
      [23,23,16,16,38,45,43,36,21,22,30,29,6,2,4,8,6,8,4,2,25,26,19,17,43,45,38,36,50,51,50,48,43,45,49,47,25,26,34,32,6,8,15,13,0,1,3,1,29,30,22,21,49,45,43,47,28,28,35,35,6,13,15,8],
      [30,29,21,22,45,49,47,43,28,28,35,35,13,6,8,15,8,6,2,4,26,25,17,19,45,43,36,38,51,50,48,50,45,43,47,49,26,25,32,34,8,6,13,15,1,0,1,3,23,23,16,16,45,38,36,43,22,21,29,30,2,6,8,4],
      [35,35,28,28,43,47,49,45,22,21,29,30,15,8,6,13,15,13,6,8,34,32,25,26,49,47,43,45,50,48,50,51,38,36,43,45,19,17,25,26,4,2,6,8,3,1,0,1,30,29,21,22,43,36,38,45,16,16,23,23,4,8,6,2],
      [29,30,22,21,36,43,45,38,16,16,23,23,8,4,2,6,13,15,8,6,32,34,26,25,47,49,45,43,48,50,51,50,36,38,45,43,17,19,26,25,2,4,8,6,1,3,1,0,35,35,28,28,47,43,45,49,21,22,30,29,8,15,13,6],
      [25,17,19,26,40,33,27,31,50,51,50,48,37,33,41,44,12,9,14,20,6,2,4,8,11,7,5,9,28,22,16,21,42,39,31,37,49,45,43,47,44,40,42,46,29,23,30,35,0,1,3,1,18,14,7,10,34,26,25,32,18,11,20,24],
      [32,25,26,34,42,37,31,39,51,50,48,50,42,40,44,46,20,11,18,24,13,6,8,15,18,10,7,14,28,21,16,22,40,31,27,33,45,38,36,43,41,33,37,44,30,23,29,35,1,0,1,3,11,9,5,7,26,19,17,25,14,9,12,20],
      [34,26,25,32,46,44,40,42,50,48,50,51,39,31,37,42,14,7,10,18,15,8,6,13,24,18,11,20,35,29,23,30,44,37,33,41,43,36,38,45,33,27,31,40,22,16,21,28,3,1,0,1,20,12,9,14,25,17,19,26,7,5,9,11],
      [26,19,17,25,44,41,33,37,48,50,51,50,31,27,33,40,9,5,7,11,8,4,2,6,20,14,9,12,35,30,23,29,46,42,40,44,47,43,45,49,37,31,39,42,21,16,22,28,1,3,1,0,24,20,11,18,32,25,26,34,10,7,14,18],
      [37,33,41,44,25,17,19,26,40,33,27,31,50,51,50,48,44,40,42,46,29,23,30,35,12,9,14,20,6,2,4,8,11,7,5,9,28,22,16,21,42,39,31,37,49,45,43,47,18,11,20,24,0,1,3,1,18,14,7,10,34,26,25,32],
      [42,40,44,46,32,25,26,34,42,37,31,39,51,50,48,50,41,33,37,44,30,23,29,35,20,11,18,24,13,6,8,15,18,10,7,14,28,21,16,22,40,31,27,33,45,38,36,43,14,9,12,20,1,0,1,3,11,9,5,7,26,19,17,25],
      [39,31,37,42,34,26,25,32,46,44,40,42,50,48,50,51,33,27,31,40,22,16,21,28,14,7,10,18,15,8,6,13,24,18,11,20,35,29,23,30,44,37,33,41,43,36,38,45,7,5,9,11,3,1,0,1,20,12,9,14,25,17,19,26],
      [31,27,33,40,26,19,17,25,44,41,33,37,48,50,51,50,37,31,39,42,21,16,22,28,9,5,7,11,8,4,2,6,20,14,9,12,35,30,23,29,46,42,40,44,47,43,45,49,10,7,14,18,1,3,1,0,24,20,11,18,32,25,26,34],
      [50,51,50,48,37,33,41,44,25,17,19,26,40,33,27,31,42,39,31,37,49,45,43,47,44,40,42,46,29,23,30,35,12,9,14,20,6,2,4,8,11,7,5,9,28,22,16,21,34,26,25,32,18,11,20,24,0,1,3,1,18,14,7,10],
      [51,50,48,50,42,40,44,46,32,25,26,34,42,37,31,39,40,31,27,33,45,38,36,43,41,33,37,44,30,23,29,35,20,11,18,24,13,6,8,15,18,10,7,14,28,21,16,22,26,19,17,25,14,9,12,20,1,0,1,3,11,9,5,7],
      [50,48,50,51,39,31,37,42,34,26,25,32,46,44,40,42,44,37,33,41,43,36,38,45,33,27,31,40,22,16,21,28,14,7,10,18,15,8,6,13,24,18,11,20,35,29,23,30,25,17,19,26,7,5,9,11,3,1,0,1,20,12,9,14],
      [48,50,51,50,31,27,33,40,26,19,17,25,44,41,33,37,46,42,40,44,47,43,45,49,37,31,39,42,21,16,22,28,9,5,7,11,8,4,2,6,20,14,9,12,35,30,23,29,32,25,26,34,10,7,14,18,1,3,1,0,24,20,11,18],
      [40,33,27,31,50,51,50,48,37,33,41,44,25,17,19,26,11,7,5,9,28,22,16,21,42,39,31,37,49,45,43,47,44,40,42,46,29,23,30,35,12,9,14,20,6,2,4,8,18,14,7,10,34,26,25,32,18,11,20,24,0,1,3,1],
      [42,37,31,39,51,50,48,50,42,40,44,46,32,25,26,34,18,10,7,14,28,21,16,22,40,31,27,33,45,38,36,43,41,33,37,44,30,23,29,35,20,11,18,24,13,6,8,15,11,9,5,7,26,19,17,25,14,9,12,20,1,0,1,3],
      [46,44,40,42,50,48,50,51,39,31,37,42,34,26,25,32,24,18,11,20,35,29,23,30,44,37,33,41,43,36,38,45,33,27,31,40,22,16,21,28,14,7,10,18,15,8,6,13,20,12,9,14,25,17,19,26,7,5,9,11,3,1,0,1],
      [44,41,33,37,48,50,51,50,31,27,33,40,26,19,17,25,20,14,9,12,35,30,23,29,46,42,40,44,47,43,45,49,37,31,39,42,21,16,22,28,9,5,7,11,8,4,2,6,24,20,11,18,32,25,26,34,10,7,14,18,1,3,1,0]
    ];

    // angular differences in degrees between HPGe crystal centers for the 145mm distance.
    dataStore.angular_bins_145mm = [
      0.000, 15.442, 21.905, 29.143, 33.143, 38.382, 44.57, 47.445, 48.741, 51.473,
      55.170, 59.978, 60.102, 62.340, 62.492, 63.423, 68.957, 71.431, 73.358, 73.629,
      75.774, 80.942, 81.546, 83.894, 86.868, 88.966, 91.034, 93.132, 96.106, 98.454,
      99.058, 104.226, 106.371, 106.642, 108.569, 111.043, 116.577, 117.508, 117.660,
      119.898, 120.022, 124.830, 128.527, 131.259, 132.555, 135.430, 141.618, 146.857,
      150.857, 158.095, 164.558, 180.000
    ];

    // ge_angles_145mm[c1][c2] = angularIndex of the angular_bins_145mm array of angular differences in degrees
    // Used in angularCorrelations.js to calculate weighting factors
    dataStore.ge_angles_145mm = [
      [0,1,2,1,9,12,8,5,20,26,25,19,9,15,18,14,12,18,22,16,6,11,13,7,10,16,15,8,21,27,23,17,33,39,35,29,40,45,44,38,35,41,43,36,24,30,34,28,25,31,32,26,36,42,37,33,50,51,50,49,39,42,46,43],
      [1,0,1,2,15,16,10,8,26,32,31,25,12,16,22,18,9,14,18,15,3,6,7,4,8,12,9,5,23,27,21,17,37,42,36,33,45,48,47,44,39,43,46,42,24,28,34,30,19,25,26,20,35,39,33,29,51,50,49,50,35,36,43,41],
      [2,1,0,1,18,22,16,12,25,31,32,26,8,10,16,15,5,9,12,8,4,7,6,3,15,18,14,9,30,34,28,24,42,46,43,39,44,47,48,45,33,36,42,37,17,21,27,23,20,26,25,19,41,43,36,35,50,49,50,51,29,33,39,35],
      [1,2,1,0,14,18,15,9,19,25,26,20,5,8,12,9,8,15,16,10,7,13,11,6,16,22,18,12,28,34,30,24,36,43,41,35,38,44,45,40,29,35,39,33,17,23,27,21,26,32,31,25,43,46,42,39,49,50,51,50,33,37,42,36],
      [9,15,18,14,0,1,2,1,9,12,8,5,20,26,25,19,35,41,43,36,24,30,34,28,12,18,22,16,6,11,13,7,10,16,15,8,21,27,23,17,33,39,35,29,40,45,44,38,39,42,46,43,25,31,32,26,36,42,37,33,50,51,50,49],
      [12,16,22,18,1,0,1,2,15,16,10,8,26,32,31,25,39,43,46,42,24,28,34,30,9,14,18,15,3,6,7,4,8,12,9,5,23,27,21,17,37,42,36,33,45,48,47,44,35,36,43,41,19,25,26,20,35,39,33,29,51,50,49,50],
      [8,10,16,15,2,1,0,1,18,22,16,12,25,31,32,26,33,36,42,37,17,21,27,23,5,9,12,8,4,7,6,3,15,18,14,9,30,34,28,24,42,46,43,39,44,47,48,45,29,33,39,35,20,26,25,19,41,43,36,35,50,49,50,51],
      [5,8,12,9,1,2,1,0,14,18,15,9,19,25,26,20,29,35,39,33,17,23,27,21,8,15,16,10,7,13,11,6,16,22,18,12,28,34,30,24,36,43,41,35,38,44,45,40,33,37,42,36,26,32,31,25,43,46,42,39,49,50,51,50],
      [20,26,25,19,9,15,18,14,0,1,2,1,9,12,8,5,33,39,35,29,40,45,44,38,35,41,43,36,24,30,34,28,12,18,22,16,6,11,13,7,10,16,15,8,21,27,23,17,50,51,50,49,39,42,46,43,25,31,32,26,36,42,37,33],
      [26,32,31,25,12,16,22,18,1,0,1,2,15,16,10,8,37,42,36,33,45,48,47,44,39,43,46,42,24,28,34,30,9,14,18,15,3,6,7,4,8,12,9,5,23,27,21,17,51,50,49,50,35,36,43,41,19,25,26,20,35,39,33,29],
      [25,31,32,26,8,10,16,15,2,1,0,1,18,22,16,12,42,46,43,39,44,47,48,45,33,36,42,37,17,21,27,23,5,9,12,8,4,7,6,3,15,18,14,9,30,34,28,24,50,49,50,51,29,33,39,35,20,26,25,19,41,43,36,35],
      [19,25,26,20,5,8,12,9,1,2,1,0,14,18,15,9,36,43,41,35,38,44,45,40,29,35,39,33,17,23,27,21,8,15,16,10,7,13,11,6,16,22,18,12,28,34,30,24,49,50,51,50,33,37,42,36,26,32,31,25,43,46,42,39],
      [9,12,8,5,20,26,25,19,9,15,18,14,0,1,2,1,10,16,15,8,21,27,23,17,33,39,35,29,40,45,44,38,35,41,43,36,24,30,34,28,12,18,22,16,6,11,13,7,36,42,37,33,50,51,50,49,39,42,46,43,25,31,32,26],
      [15,16,10,8,26,32,31,25,12,16,22,18,1,0,1,2,8,12,9,5,23,27,21,17,37,42,36,33,45,48,47,44,39,43,46,42,24,28,34,30,9,14,18,15,3,6,7,4,35,39,33,29,51,50,49,50,35,36,43,41,19,25,26,20],
      [18,22,16,12,25,31,32,26,8,10,16,15,2,1,0,1,15,18,14,9,30,34,28,24,42,46,43,39,44,47,48,45,33,36,42,37,17,21,27,23,5,9,12,8,4,7,6,3,41,43,36,35,50,49,50,51,29,33,39,35,20,26,25,19],
      [14,18,15,9,19,25,26,20,5,8,12,9,1,2,1,0,16,22,18,12,28,34,30,24,36,43,41,35,38,44,45,40,29,35,39,33,17,23,27,21,8,15,16,10,7,13,11,6,43,46,42,39,49,50,51,50,33,37,42,36,26,32,31,25],
      [12,9,5,8,35,39,33,29,33,37,42,36,10,8,15,16,0,1,2,1,6,7,4,3,25,26,20,19,44,45,40,38,50,51,50,49,44,45,48,47,25,26,32,31,6,7,13,11,14,18,15,9,43,41,35,36,42,39,43,46,12,16,22,18],
      [18,14,9,15,41,43,36,35,39,42,46,43,16,12,18,22,1,0,1,2,7,6,3,4,26,25,19,20,45,44,38,40,51,50,49,50,45,44,47,48,26,25,31,32,7,6,11,13,9,12,8,5,39,35,29,33,37,33,36,42,8,10,16,15],
      [22,18,12,16,43,46,42,39,35,36,43,41,15,9,14,18,2,1,0,1,13,11,6,7,32,31,25,26,48,47,44,45,50,49,50,51,40,38,44,45,20,19,25,26,4,3,6,7,15,16,10,8,42,36,33,37,33,29,35,39,5,8,12,9],
      [16,15,8,10,36,42,37,33,29,33,39,35,8,5,9,12,1,2,1,0,11,13,7,6,31,32,26,25,47,48,45,44,49,50,51,50,38,40,45,44,19,20,26,25,3,4,7,6,18,22,16,12,46,43,39,42,36,35,41,43,9,15,18,14],
      [6,3,4,7,24,24,17,17,40,45,44,38,21,23,30,28,6,7,13,11,0,1,2,1,6,7,4,3,25,26,20,19,44,45,40,38,50,51,50,49,44,45,48,47,25,26,32,31,6,11,13,7,28,30,23,21,48,45,44,47,27,27,34,34],
      [11,6,7,13,30,28,21,23,45,48,47,44,27,27,34,34,7,6,11,13,1,0,1,2,7,6,3,4,26,25,19,20,45,44,38,40,51,50,49,50,45,44,47,48,26,25,31,32,3,6,7,4,24,24,17,17,45,40,38,44,23,21,28,30],
      [13,7,6,11,34,34,27,27,44,47,48,45,23,21,28,30,4,3,6,7,2,1,0,1,13,11,6,7,32,31,25,26,48,47,44,45,50,49,50,51,40,38,44,45,20,19,25,26,4,7,6,3,30,28,21,23,44,38,40,45,17,17,24,24],
      [7,4,3,6,28,30,23,21,38,44,45,40,17,17,24,24,3,4,7,6,1,2,1,0,11,13,7,6,31,32,26,25,47,48,45,44,49,50,51,50,38,40,45,44,19,20,26,25,7,13,11,6,34,34,27,27,47,44,45,48,21,23,30,28],
      [10,8,15,16,12,9,5,8,35,39,33,29,33,37,42,36,25,26,32,31,6,7,13,11,0,1,2,1,6,7,4,3,25,26,20,19,44,45,40,38,50,51,50,49,44,45,48,47,12,16,22,18,14,18,15,9,43,41,35,36,42,39,43,46],
      [16,12,18,22,18,14,9,15,41,43,36,35,39,42,46,43,26,25,31,32,7,6,11,13,1,0,1,2,7,6,3,4,26,25,19,20,45,44,38,40,51,50,49,50,45,44,47,48,8,10,16,15,9,12,8,5,39,35,29,33,37,33,36,42],
      [15,9,14,18,22,18,12,16,43,46,42,39,35,36,43,41,20,19,25,26,4,3,6,7,2,1,0,1,13,11,6,7,32,31,25,26,48,47,44,45,50,49,50,51,40,38,44,45,5,8,12,9,15,16,10,8,42,36,33,37,33,29,35,39],
      [8,5,9,12,16,15,8,10,36,42,37,33,29,33,39,35,19,20,26,25,3,4,7,6,1,2,1,0,11,13,7,6,31,32,26,25,47,48,45,44,49,50,51,50,38,40,45,44,9,15,18,14,18,22,16,12,46,43,39,42,36,35,41,43],
      [21,23,30,28,6,3,4,7,24,24,17,17,40,45,44,38,44,45,48,47,25,26,32,31,6,7,13,11,0,1,2,1,6,7,4,3,25,26,20,19,44,45,40,38,50,51,50,49,27,27,34,34,6,11,13,7,28,30,23,21,48,45,44,47],
      [27,27,34,34,11,6,7,13,30,28,21,23,45,48,47,44,45,44,47,48,26,25,31,32,7,6,11,13,1,0,1,2,7,6,3,4,26,25,19,20,45,44,38,40,51,50,49,50,23,21,28,30,3,6,7,4,24,24,17,17,45,40,38,44],
      [23,21,28,30,13,7,6,11,34,34,27,27,44,47,48,45,40,38,44,45,20,19,25,26,4,3,6,7,2,1,0,1,13,11,6,7,32,31,25,26,48,47,44,45,50,49,50,51,17,17,24,24,4,7,6,3,30,28,21,23,44,38,40,45],
      [17,17,24,24,7,4,3,6,28,30,23,21,38,44,45,40,38,40,45,44,19,20,26,25,3,4,7,6,1,2,1,0,11,13,7,6,31,32,26,25,47,48,45,44,49,50,51,50,21,23,30,28,7,13,11,6,34,34,27,27,47,44,45,48],
      [33,37,42,36,10,8,15,16,12,9,5,8,35,39,33,29,50,51,50,49,44,45,48,47,25,26,32,31,6,7,13,11,0,1,2,1,6,7,4,3,25,26,20,19,44,45,40,38,42,39,43,46,12,16,22,18,14,18,15,9,43,41,35,36],
      [39,42,46,43,16,12,18,22,18,14,9,15,41,43,36,35,51,50,49,50,45,44,47,48,26,25,31,32,7,6,11,13,1,0,1,2,7,6,3,4,26,25,19,20,45,44,38,40,37,33,36,42,8,10,16,15,9,12,8,5,39,35,29,33],
      [35,36,43,41,15,9,14,18,22,18,12,16,43,46,42,39,50,49,50,51,40,38,44,45,20,19,25,26,4,3,6,7,2,1,0,1,13,11,6,7,32,31,25,26,48,47,44,45,33,29,35,39,5,8,12,9,15,16,10,8,42,36,33,37],
      [29,33,39,35,8,5,9,12,16,15,8,10,36,42,37,33,49,50,51,50,38,40,45,44,19,20,26,25,3,4,7,6,1,2,1,0,11,13,7,6,31,32,26,25,47,48,45,44,36,35,41,43,9,15,18,14,18,22,16,12,46,43,39,42],
      [40,45,44,38,21,23,30,28,6,3,4,7,24,24,17,17,44,45,40,38,50,51,50,49,44,45,48,47,25,26,32,31,6,7,13,11,0,1,2,1,6,7,4,3,25,26,20,19,48,45,44,47,27,27,34,34,6,11,13,7,28,30,23,21],
      [45,48,47,44,27,27,34,34,11,6,7,13,30,28,21,23,45,44,38,40,51,50,49,50,45,44,47,48,26,25,31,32,7,6,11,13,1,0,1,2,7,6,3,4,26,25,19,20,45,40,38,44,23,21,28,30,3,6,7,4,24,24,17,17],
      [44,47,48,45,23,21,28,30,13,7,6,11,34,34,27,27,48,47,44,45,50,49,50,51,40,38,44,45,20,19,25,26,4,3,6,7,2,1,0,1,13,11,6,7,32,31,25,26,44,38,40,45,17,17,24,24,4,7,6,3,30,28,21,23],
      [38,44,45,40,17,17,24,24,7,4,3,6,28,30,23,21,47,48,45,44,49,50,51,50,38,40,45,44,19,20,26,25,3,4,7,6,1,2,1,0,11,13,7,6,31,32,26,25,47,44,45,48,21,23,30,28,7,13,11,6,34,34,27,27],
      [35,39,33,29,33,37,42,36,10,8,15,16,12,9,5,8,25,26,20,19,44,45,40,38,50,51,50,49,44,45,48,47,25,26,32,31,6,7,13,11,0,1,2,1,6,7,4,3,43,41,35,36,42,39,43,46,12,16,22,18,14,18,15,9],
      [41,43,36,35,39,42,46,43,16,12,18,22,18,14,9,15,26,25,19,20,45,44,38,40,51,50,49,50,45,44,47,48,26,25,31,32,7,6,11,13,1,0,1,2,7,6,3,4,39,35,29,33,37,33,36,42,8,10,16,15,9,12,8,5],
      [43,46,42,39,35,36,43,41,15,9,14,18,22,18,12,16,32,31,25,26,48,47,44,45,50,49,50,51,40,38,44,45,20,19,25,26,4,3,6,7,2,1,0,1,13,11,6,7,42,36,33,37,33,29,35,39,5,8,12,9,15,16,10,8],
      [36,42,37,33,29,33,39,35,8,5,9,12,16,15,8,10,31,32,26,25,47,48,45,44,49,50,51,50,38,40,45,44,19,20,26,25,3,4,7,6,1,2,1,0,11,13,7,6,46,43,39,42,36,35,41,43,9,15,18,14,18,22,16,12],
      [24,24,17,17,40,45,44,38,21,23,30,28,6,3,4,7,6,7,4,3,25,26,20,19,44,45,40,38,50,51,50,49,44,45,48,47,25,26,32,31,6,7,13,11,0,1,2,1,28,30,23,21,48,45,44,47,27,27,34,34,6,11,13,7],
      [30,28,21,23,45,48,47,44,27,27,34,34,11,6,7,13,7,6,3,4,26,25,19,20,45,44,38,40,51,50,49,50,45,44,47,48,26,25,31,32,7,6,11,13,1,0,1,2,24,24,17,17,45,40,38,44,23,21,28,30,3,6,7,4],
      [34,34,27,27,44,47,48,45,23,21,28,30,13,7,6,11,13,11,6,7,32,31,25,26,48,47,44,45,50,49,50,51,40,38,44,45,20,19,25,26,4,3,6,7,2,1,0,1,30,28,21,23,44,38,40,45,17,17,24,24,4,7,6,3],
      [28,30,23,21,38,44,45,40,17,17,24,24,7,4,3,6,11,13,7,6,31,32,26,25,47,48,45,44,49,50,51,50,38,40,45,44,19,20,26,25,3,4,7,6,1,2,1,0,34,34,27,27,47,44,45,48,21,23,30,28,7,13,11,6],
      [25,19,20,26,39,35,29,33,50,51,50,49,36,35,41,43,14,9,15,18,6,3,4,7,12,8,5,9,27,23,17,21,42,37,33,36,48,45,44,47,43,39,42,46,28,24,30,34,0,1,2,1,16,15,8,10,32,26,25,31,16,12,18,22],
      [31,25,26,32,42,36,33,37,51,50,49,50,42,39,43,46,18,12,16,22,11,6,7,13,16,10,8,15,27,21,17,23,39,33,29,35,45,40,38,44,41,35,36,43,30,24,28,34,1,0,1,2,12,9,5,8,26,20,19,25,15,9,14,18],
      [32,26,25,31,46,43,39,42,50,49,50,51,37,33,36,42,15,8,10,16,13,7,6,11,22,16,12,18,34,28,24,30,43,36,35,41,44,38,40,45,35,29,33,39,23,17,21,27,2,1,0,1,18,14,9,15,25,19,20,26,8,5,9,12],
      [26,20,19,25,43,41,35,36,49,50,51,50,33,29,35,39,9,5,8,12,7,4,3,6,18,15,9,14,34,30,24,28,46,42,39,43,47,44,45,48,36,33,37,42,21,17,23,27,1,2,1,0,22,18,12,16,31,25,26,32,10,8,15,16],
      [36,35,41,43,25,19,20,26,39,35,29,33,50,51,50,49,43,39,42,46,28,24,30,34,14,9,15,18,6,3,4,7,12,8,5,9,27,23,17,21,42,37,33,36,48,45,44,47,16,12,18,22,0,1,2,1,16,15,8,10,32,26,25,31],
      [42,39,43,46,31,25,26,32,42,36,33,37,51,50,49,50,41,35,36,43,30,24,28,34,18,12,16,22,11,6,7,13,16,10,8,15,27,21,17,23,39,33,29,35,45,40,38,44,15,9,14,18,1,0,1,2,12,9,5,8,26,20,19,25],
      [37,33,36,42,32,26,25,31,46,43,39,42,50,49,50,51,35,29,33,39,23,17,21,27,15,8,10,16,13,7,6,11,22,16,12,18,34,28,24,30,43,36,35,41,44,38,40,45,8,5,9,12,2,1,0,1,18,14,9,15,25,19,20,26],
      [33,29,35,39,26,20,19,25,43,41,35,36,49,50,51,50,36,33,37,42,21,17,23,27,9,5,8,12,7,4,3,6,18,15,9,14,34,30,24,28,46,42,39,43,47,44,45,48,10,8,15,16,1,2,1,0,22,18,12,16,31,25,26,32],
      [50,51,50,49,36,35,41,43,25,19,20,26,39,35,29,33,42,37,33,36,48,45,44,47,43,39,42,46,28,24,30,34,14,9,15,18,6,3,4,7,12,8,5,9,27,23,17,21,32,26,25,31,16,12,18,22,0,1,2,1,16,15,8,10],
      [51,50,49,50,42,39,43,46,31,25,26,32,42,36,33,37,39,33,29,35,45,40,38,44,41,35,36,43,30,24,28,34,18,12,16,22,11,6,7,13,16,10,8,15,27,21,17,23,26,20,19,25,15,9,14,18,1,0,1,2,12,9,5,8],
      [50,49,50,51,37,33,36,42,32,26,25,31,46,43,39,42,43,36,35,41,44,38,40,45,35,29,33,39,23,17,21,27,15,8,10,16,13,7,6,11,22,16,12,18,34,28,24,30,25,19,20,26,8,5,9,12,2,1,0,1,18,14,9,15],
      [49,50,51,50,33,29,35,39,26,20,19,25,43,41,35,36,46,42,39,43,47,44,45,48,36,33,37,42,21,17,23,27,9,5,8,12,7,4,3,6,18,15,9,14,34,30,24,28,31,25,26,32,10,8,15,16,1,2,1,0,22,18,12,16],
      [39,35,29,33,50,51,50,49,36,35,41,43,25,19,20,26,12,8,5,9,27,23,17,21,42,37,33,36,48,45,44,47,43,39,42,46,28,24,30,34,14,9,15,18,6,3,4,7,16,15,8,10,32,26,25,31,16,12,18,22,0,1,2,1],
      [42,36,33,37,51,50,49,50,42,39,43,46,31,25,26,32,16,10,8,15,27,21,17,23,39,33,29,35,45,40,38,44,41,35,36,43,30,24,28,34,18,12,16,22,11,6,7,13,12,9,5,8,26,20,19,25,15,9,14,18,1,0,1,2],
      [46,43,39,42,50,49,50,51,37,33,36,42,32,26,25,31,22,16,12,18,34,28,24,30,43,36,35,41,44,38,40,45,35,29,33,39,23,17,21,27,15,8,10,16,13,7,6,11,18,14,9,15,25,19,20,26,8,5,9,12,2,1,0,1],
      [43,41,35,36,49,50,51,50,33,29,35,39,26,20,19,25,18,15,9,14,34,30,24,28,46,42,39,43,47,44,45,48,36,33,37,42,21,17,23,27,9,5,8,12,7,4,3,6,22,18,12,16,31,25,26,32,10,8,15,16,1,2,1,0]
    ];

    // 60Co gg ang corr from Run run29578.tar
    dataStore.quickDataX = [0.000, 15.442, 21.905, 29.143, 33.143, 38.382, 44.57, 47.445, 48.741, 51.473,
      55.170, 59.978, 60.102, 62.340, 62.492, 63.423, 68.957, 71.431, 73.358, 73.629,
      75.774, 80.942, 81.546, 83.894, 86.868, 88.966, 91.034, 93.132, 96.106, 98.454,
      99.058, 104.226, 106.371, 106.642, 108.569, 111.043, 116.577, 117.508, 117.660,
      119.898, 120.022, 124.830, 128.527, 131.259, 132.555, 135.430, 141.618, 146.857,
      150.857, 158.095, 164.558, 180.000];
      dataStore.quickDataY = [1.2, 1.1649445679515484, 1.16404404173609, 1.1534194212971343, 1.1487646735942079, 1.1319730562416195, 1.0855024174242622, 1.0955483598820324, 1.0967150537881445, 1.07477819459717, 1.0670033719253225, 1.0350595775621638, 1.0632547565661457, 1.054290250774924, 1.0397650722247835, 1.0464194928300574, 1.0382793697970039, 1.0345761445428245, 1.0213096453001547, 1.033750779388556, 1.0526274019670399, 1.0135505676433754, 1.022872761287112, 1.0229782483214198, 1.024272823171905, 1.0127807217310842, 1.0259485750877826, 1.010741956012306, 1.014006851101479, 1.0337180827684103, 1.0085204602351001, 1.0315913337747054, 1.045413973136467, 1.0273662602169433, 1.0239243794524204, 1.0302119450801877, 1.045204729193273, 1.0494111870868919, 1.0468512616814172, 1.0468137786650362, 1.0688584627515472, 1.0621886640362925, 1.0848967001474858, 1.086446504807811, 1.0831054060283596, 1.1116666070843002, 1.1222843879096187, 1.1243680235895794, 1.1433331260031783, 1.1398908022870562, 1.189665641136618, 1.2];

    } // end of setupDataStore()
    setupDataStore();

    function initializeAngularCorrelations(detType){
      console.log("initializeAngularCorrelations()");

      // Save the choices to the dataStore
      dataStore.detectorType = detType;
      console.log("Detector choice is "+dataStore.detectorType)

      // Grab the template peak-fitting script to a local copy here
      var thisScript = {};
      thisScript = dataStore.peakFitterScriptTemplate[dataStore.detectorType];

      // Get the user input on histogramFileNames
      thisScript.histogramFileNames.push(document.getElementById('HistoListSelectGRIFFIN').value);
      dataStore.histoFileName = document.getElementById('HistoListSelectGRIFFIN').value;
      dataStore.currentHistoFileName = document.getElementById('HistoListSelectGRIFFIN').value;

      // Setup the peak-fitting script from the template
      receiveScript(JSON.stringify(thisScript));

      // Custom settings for Angular Correlations for this subsytem type
      // generate the groups for plot selector
      // fill the THESEdetectors array of detector names
      // fill the angularMatrices array of 2d histogram names
      switch(dataStore.detectorType){

        case "GRG-GRG-110mm": // Ge-Ge angular correlations for HPGe at 110mm
        case "GRG-GRG-145mm": // Ge-Ge angular correlations for HPGe at 145mm

        // Copy the corresponding angular bin data into the arrays to use
        if(dataStore.detectorType == "GRG-GRG-145mm"){
          dataStore.theseAngularBins = dataStore.angular_bins_145mm;
          dataStore.theseGeAngles = dataStore.ge_angles_145mm;
          dataStore.HPGeDistance = 145;
          var matrixNameString = "Ge_Ge_145mm_angular_bin";
        }else{
          dataStore.theseAngularBins = dataStore.angular_bins_110mm;
          dataStore.theseGeAngles = dataStore.ge_angles_110mm;
          dataStore.HPGeDistance = 110;
          var matrixNameString = "Ge_Ge_110mm_angular_bin";
        }

        // Generate the angular bins in radians
        for(var i=0; i<dataStore.theseAngularBins.length; i++){
          dataStore.theseAngularBinsRadians.push(Math.cos(dataStore.theseAngularBins[i]*(Math.PI / 180.000)));
        }

        // Set up GRIFFIN detectors for GRG-GRG type
        var crystals = ["B","G","R","W"];
        var num=0;
        for(i=1; i<(dataStore.numberOfClovers+1); i++){
          for(k=0; k<4; k++){
            dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00A'; num++;
          }
        }

        // Set up the groups based on THESEdetectors
        var groups = [];
        groups.push({ "groupID": 'AngularBins', "groupTitle": 'Angular Bins', "plots": [] });
        var histoName = dataStore.histoFileName.split(".")[0] + ":";
        var thesePlots = [];
        for(i=0; i<dataStore.THESEdetectors.length; i++){
          thesePlots.push( { "plotID": histoName + dataStore.THESEdetectors[i] + '_GGEnergy', "title": dataStore.THESEdetectors[i] });
        }
        groups.push({ "groupID": 'GRG', "groupTitle": 'Ge Singles for normalization', "plots": thesePlots });

        break; // End of case of GRG-GRG

        ////////////////////////////////////////////////
        case "GRG-ART": // Ge-ARIES angular correlations

        // Set up GRIFFIN and ARIES detectors for GRG-ART type
        var crystals = ["B","G","R","W"];
        var num=0;
        for(i=1; i<(dataStore.numberOfClovers+1); i++){
          for(k=0; k<4; k++){
            dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00A'; num++;
          }
        }
        for(i=1; i<=dataStore.numberOfARIESTiles; i++){
          dataStore.THESEdetectors[num] = 'ART'+alwaysThisLong(i, 2)+'XS00X'; num++;
        }

        // Set up the groups based on THESEdetectors
        var groups = [];
        groups.push({ "groupID": 'AngularBins', "groupTitle": 'Angular Bins', "plots": [] });
        var histoName = dataStore.histoFileName.split(".")[0] + ":";
        var theseGRGPlots = [];
        var theseARTPlots = [];
        for(i=0; i<dataStore.THESEdetectors.length; i++){
          if(dataStore.THESEdetectors[i].includes('GRG')){
            theseGRGPlots.push(
              { "plotID": histoName + dataStore.THESEdetectors[i] + '_Energy', "title": dataStore.THESEdetectors[i] });
            }else if(dataStore.THESEdetectors[i].includes('ART')){
              theseARTPlots.push( { "plotID": histoName + dataStore.THESEdetectors[i] + '_Energy', "title": dataStore.THESEdetectors[i] });
            }
          }
          groups.push({ "groupID": 'GRG', "groupTitle": 'Ge Singles for normalization', "plots": theseGRGPlots });
          groups.push({ "groupID": 'ART', "groupTitle": 'ARIES Singles for normalization', "plots": theseARTPlots });

          break; // End of case of GRG-ART

          ////////////////////////////////////////////////
          case "DSW-DSW": // DSW-DSW angular correlations

          // Set up DESCANT detectors for DSW-DSW type
          var num=0;
          for(i=1; i<=dataStore.numberOfDSW; i++){
            dataStore.THESEdetectors[num] = 'ART'+alwaysThisLong(i, 2)+'XS00X'; num++;
          }

          // Set up the groups based on THESEdetectors
          var groups = [];
          groups.push({ "groupID": 'AngularBins', "groupTitle": 'Angular Bins', "plots": [] });
          var histoName = dataStore.histoFileName.split(".")[0] + ":";
          var thesePlots = [];
          for(i=0; i<dataStore.THESEdetectors.length; i++){
            thesePlots.push(
              {
                "plotID": histoName + dataStore.THESEdetectors[i] + '_CTOF', // Use corrected TOF
                "title": dataStore.THESEdetectors[i]
              });
            }
            groups.push({ "groupID": 'DSW', "groupTitle": 'DESCANT Singles for normalization', "plots": thesePlots });
            break; // End of case of DSW-DSW

            default:
            console.log("Error, unrecognized detectorType = "+dataStore.detectorType);
            break;
          }

          // Names of Angular correlation matrices that we need to fetch and use for GRG-GRG
          dataStore.angularMatrices = thisScript.spectrumList2d;

          ////////////////
          // Set up the menus, reports and display objects
          ////////////////

          // Build the menu list from the groups defined above for this detector type
          if(dataStore.spectrumListHistoFileNames.length>1){
            dataStore.plotGroups = groups;     //groups to arrange spectra into for dropdowns
          }else{
            for(i=0; i<groups.length; i++){
              dataStore.plotGroups.push(groups[i]); //add these groups to arrange spectra into for dropdowns
            }
          }

          // Generate the spectrum menu based on the plotGroups
          dataStore._plotListLite = new plotListLite('plotList');
          dataStore._plotListLite.setup();

          // Generate the angularCorrelations report table
          dataStore._angularCorrelationsReport = new angularCorrelationsReport('resultsDataTableRegion','resultsWeightTableRegion','chiSquareReportTableDiv','resultsFitsTableRegion');
          dataStore._angularCorrelationsReport.setup();

          // Draw the search region
          dataStore.viewers[dataStore.plots[0]].plotData();

          // Hide the subpages. They need to be not hidden while the templates are injected.
          menuButtonClick(dataStore.buttonIDs[0],0);

          // Disable user inputs now we have launched the process
          document.getElementById('HistoDirectoryInput').setAttribute('disabled', true);
          for(var i=0; i<dataStore.histoChoiceBarContents.length; i++){
            var thisTitle = dataStore.histoChoiceBarContents[i];
            document.getElementById('HistoListSelect'+thisTitle).setAttribute('disabled', true);
          }

          // Disable inputs
          for(var i=0; i<dataStore.detectorChoice.length; i++){
            document.getElementById('detectorChoice-'+dataStore.detectorChoice[i].name).setAttribute('disabled', true);
          }

          // Set up the progress tracking
          setupProgressBarTracking();
          dataStore.progressBarNumberTasks -= 52; // We are not unpacking matrices locally

          ////////////////
          // Now set up for the start of the fetching process for the 1d histograms
          ////////////////

          // Plug in the active spectra names for the 1d histograms
          dataStore._plotControl.activeSpectra = [];
          for(var i=0; i<dataStore.spectrumList1d.length; i++){
            dataStore._plotControl.activeSpectra.push(dataStore.spectrumList1d[i]);
          }

          // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
          dataStore.histoFileName = dataStore.currentHistoFileName = dataStore.spectrumListHistoFileNames[0];

          // change information message
          document.getElementById('welcomeMessage').classList.add('hidden');
          document.getElementById('fetchingMessage').classList.remove('hidden');

          // Set the current task to keep track of our progress
          dataStore.currentTask = 'Fetching1d';

          // Request the first histogram file from the server.
          // This launches a series of promises. Once complete we end with fetchCallback.
          dataStore._plotControl.refreshAll();
        }

        function fetchAllMatrices(){
          // Plug in the active spectra names for the 2d histograms
          dataStore.stagedQueries = [];
          for(i=0; i<dataStore.spectrumList2d.length; i++){
            dataStore.stagedQueries.push(dataStore.spectrumList2d[i]);
          }
          // Request only 5 matrices at a time - because of slow networks and computers
          fetchMatrices(dataStore.stagedQueries.slice(-5)); // Request the last 5 matrices in the list
        }

        function fetchMatrices(theseSpectra){
          // Create URLs for 2d histograms (one URL per 2d histogram)
          // ensure one 2d histogram per url using the construct2dQueries function which also calls the binary transfer method
          var queries2d = construct2dQueries([],theseSpectra);
          var allQueries2d = queries2d.map(promiseBinaryURL);

          var spectraFetched = Promise.all(allQueries2d).then(
            function(spectra){
              var i, j, key, viewerKey, newKey, this2dKey;

              // distribute the spectra data received from the analyzer to the appropriate places
              // loop through spectra where each element can be up to 16 histograms
              for(i=0; i<spectra.length; i++){

                // Loop through the keys of this spectrum element where each key is a histogram (or components of a 2d matrix)
                for(key in spectra[i]){

                  // Remove this matrix from the staged list so it will not be requested again
                  dataStore.stagedQueries.splice(dataStore.stagedQueries.indexOf(spectra[i]['binaryName']));

                  // Treatment of 2d spectra received by the binary transfer method
                  // unpackBinaryMatrixData(key,outputRaw,outputDense,outputSparse);
                  // key is used for the dataStore.rawData object
                  // true/false for which outputs will be generated. This can cause memory overflow if many matrices are requested
                  unpackBinaryMatrixData(spectra[i]['binaryName'],dataStore.outputRawFlag,dataStore.outputDenseFlag,dataStore.outputSparseFlag,dataStore.outputDeleteFlag);
                }
              }

            }
          ).catch((error) => {
            console.log("Caught error from Promise.all in plotControl refreshAll.");
            console.error(error.message);
            // This error is either a network interruption, (one or a few 2d histograms would fail)
            // OR an old server without the binary transfer method (would fail for all 2d histograms).
            // First check if we have any 2d histograms received, if so then remove them from the refreshAll request
            // If no 2d histograms received then change to json transfer method and request all again

            //return;
          });

          // End with calling fetchCallback2d()
          spectraFetched.then( function(){ fetchCallback2d(); } )

        }

        function fetchCallback2d(){

          if(dataStore.stagedQueries.length>0){
            // There are more staged requests, so request the next batch of 5
            fetchMatrices(dataStore.stagedQueries.slice(-5)); // Request the last 5 matrices in the list
          }else{
            // We are done now
            fetchCallback();
          }

        }

        function launchAngularCorrelations(){
          // This is the start of the automated process
          console.log(dataStore);

          // Reveal the progress bar
          //  document.getElementById('progressDiv').classList.remove('hidden');

          // change messages
          document.getElementById('readyMessage').classList.add('hidden');
          document.getElementById('projectionsMessage').classList.remove('hidden');

          // Get the peak energies from the User input
          var g1E = parseInt(document.getElementById('gamma1Input').value);
          var g2E = parseInt(document.getElementById('gamma2Input').value);

          /*
          // Use the higher energy peak as the gate because that will likely give less background
          var gateE = (g1E > g2E) ? g1E : g2E;
          var fitE  = (g1E > g2E) ? g2E : g1E;
          */
          // Get user input for which peak to use as the gate
          var gateE = g1E;
          var fitE = g2E;
          var gateChoice = parseInt(document.getElementById('peakGateChoiceInput').value);
          if(gateChoice==2){
            gateE = g2E;
            fitE = g1E;
          }
          dataStore.fitPeakEnergies = [fitE,gateE]; // Remember for use in tables later

          // Set the gate width
          var gateWidth = Math.ceil(typicalPeakWidth(gateE,"HPGe"));

          // Set limits for the projections
          var gateMin = gateE - gateWidth;
          var gateMax = gateE + gateWidth;

          // Set limits for the backgrounds to be subtracted from the projections
          var BG1Max = gateMin - Math.floor(gateWidth*1.5);
          var BG1Min = BG1Max - gateWidth;
          var BG2Min = gateMax + Math.floor(gateWidth*1.5);
          var BG2Max = BG2Min + gateWidth;

          // Grab the template peak-fitting script to a local copy here
          var thisScript = {};
          thisScript = dataStore.peakFitterScriptTemplate[dataStore.detectorType];

          // Get the user input on histogramFileNames
          thisScript.histogramFileNames.push(document.getElementById('HistoListSelectGRIFFIN').value);

          //  var histoName = dataStore.histoFileName.split(".")[0];

          // Set up the gating details for the projections
          var axisLength = dataStore.rawData[thisScript.histogramFileNames[0].split(".")[0] + ":" + dataStore.spectrumList2d[0]].XaxisMax - 1;
          thisScript.spectrumListGates.push(["x",undefined,undefined,undefined,undefined,undefined,undefined]); // Total projection
          thisScript.spectrumListGates.push(["x",gateMin,gateMax,BG1Min,BG1Max,BG2Min,BG2Max]); // Gate defined by user input

          // Add the peaks for fitting
          thisScript.spectrumList1dPeaks.All.push(fitE);
          thisScript.spectrumList1dPeaks.All.push(gateE);
          thisScript.spectrumListProjectionsPeaks.All.push(fitE);
          thisScript.spectrumListProjectionsPeaks.All.push(gateE);

          // Setup the peak-fitting script from the template
          receiveScript(JSON.stringify(thisScript));

          // Set up the progress tracking
          setupProgressBarTracking();

          // Enable onchange functions which now trigger recalculations
          document.getElementById('sysUnc').onchange = function(){
            console.log("sysUnc onchange function");
            dataStore.systematicUncertainty=(this.value/100);
            processAngularCorrelationData();
          };
          var optionsCL = document.getElementsByName('confidenceLimitValue');
          for(var i = 0; i < optionsCL.length; i++){
            optionsCL[i].onclick = function(){
              console.log("confidenceLimitValue onclick function");
              processAngularCorrelationData();
            };
          }
          document.getElementById('betaInput').onchange = function(){ processAngularCorrelationData(); };
          document.getElementById('gammaInput').onchange = function(){ processAngularCorrelationData(); };
          var optionsTR = document.getElementsByName('time_random_select_value');
          for(var i = 0; i < optionsTR.length; i++){
            optionsTR[i].onclick = function(){
              console.log("time_random_select_value onclick function");
              processAngularCorrelationData();
            };
          }

          // Create projectionsList for the input of the function projectAllMatrices(projectionsList,compressed)
          // projectionsList is an array of objects.
          // Each object contains the "matrixName" which is a valid key for the dataStore.matrix array.
          // Each object also contains the "gateDetails" which is an array of gates specific to that 2d spectrum.
          // Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
          // Where BG1SF is the Scaling Factor for a projection between bins BG1Min and BG1Max which will be subtracted from the main Gate projection between bins gateMin and gateMax onto the 'axis' axis.
          var projectionsList = [];
          var histoName = dataStore.histoFileName.split(".")[0] + ":";
          for(var i=0; i<dataStore.spectrumList2d.length; i++){
            for(var j=0; j<dataStore.spectrumListGates[dataStore.spectrumList2d[i]].length; j++){
              projectionsList.push(
                {
                  "matrixName": histoName + dataStore.spectrumList2d[i],
                  "gateDetails": dataStore.spectrumListGates[dataStore.spectrumList2d[i]][j]
                });
              }
            }

            // Start the process of projections for all matrices
            projectAllMatrices(projectionsList,true,'AngularBins');
          };

          function fetchCallback(){
            console.log("fetchCallback with task, "+dataStore.currentTask);
            console.log(dataStore);

            if(dataStore.currentTask == 'Fetching1d'){
              // Set the current task to keep track of our progress
              dataStore.currentTask = 'Fetching2d';

              // Now fetch the matrices
              fetchAllMatrices();

              // Reveal the gate input controls
              // Reveal the cascade details inputs
              document.getElementById('userInputParentDiv').classList.remove('hidden');
              document.getElementById('gateInputsParentDiv').classList.remove('hidden');
              document.getElementById('cascadeInputsDiv').classList.remove('hidden');
              document.getElementById('analysisInputsDiv').classList.remove('hidden');

              // Plot a single spectrum for determining the gate and fit regions
              var plot = dataStore.histoFileName.split(".")[0] + ":" + dataStore.spectrumList1d[0];
              dataStore.viewers[dataStore.plots[0]].addData(plot, JSON.parse(JSON.stringify(dataStore.rawData[plot])) );
              dataStore.viewers[dataStore.plots[0]].plotData();

              return;
            }else{
              // Check that we got all the matrices ok
              var count = 0;
              for(let key in dataStore.rawData){
                const index = dataStore.spectrumList2d.indexOf(key.split(":")[1]);
                if (index > -1) {
                  count++;
                }
              }
              if(count<dataStore.spectrumList2d.length){
                console.log("We are missing some matrices!");

                var string = 'Matrix transfer error, failed to receive all matrices from the server. Please reload to try again.<br>';
                if(document.getElementById('messageDivText')){ document.getElementById('messageDivText').innerHTML = string; }
                if(document.getElementById('messageDiv')){ document.getElementById('messageDiv').style.display = 'block'; }
                return;
              }
            }

            // Set the current task to keep track of our progress
            dataStore.currentTask = 'peakInfoInput';

            // change information message
            document.getElementById('fetchingMessage').classList.add('hidden');
            document.getElementById('readyMessage').classList.remove('hidden');

            // Enable the Launch button
            document.getElementById('ggAngCorrProject').disabled = false;

            // Nothing further to do here on fetchCallback. Further tasks are initiated following User input.
          }

          function projectionsCallback(){
            console.log("ProjectionsCallback");

            // Add this projection spectrum to the list which will be used in processAngularCorrelationData
            for(var i=0; i<dataStore.spectrumListProjections.length; i++){
              if(dataStore.spectrumListProjections[i][dataStore.spectrumListProjections[i].length-1] != 'x'){
                dataStore.angCorrProjections.push(dataStore.spectrumListProjections[i]);
              }
            }

            // change information message
            document.getElementById('projectionsMessage').classList.add('hidden');
            document.getElementById('fittingMessage').classList.remove('hidden');

            // Set the current task to keep track of our progress
            dataStore.currentTask = 'SinglesFitting';

            // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
            var histoName = dataStore.histoFileName.split(".")[0];
            var spectrumList = [];
            dataStore.spectrumList1d.forEach((element) => spectrumList.push(histoName+":"+element));
            dataStore.singlesSpectra = spectrumList;

            // Use Limits if any were set through mouse clicks
            var limits = [];
            for(var i=0; i<dataStore.spectrumList1dPeaks.All.length; i++){
              limits[i] = [-1,-1];
              if(dataStore.appLimitsStore != undefined){
                if(dataStore.appLimitsStore[dataStore.spectrumList1dPeaks.All[i]] != undefined){
                  if(dataStore.appLimitsStore[dataStore.spectrumList1dPeaks.All[i]].LimitLower){ limits[i][0] = dataStore.appLimitsStore[dataStore.spectrumList1dPeaks.All[i]].LimitLower; }
                  if(dataStore.appLimitsStore[dataStore.spectrumList1dPeaks.All[i]].LimitUpper){ limits[i][1] = dataStore.appLimitsStore[dataStore.spectrumList1dPeaks.All[i]].LimitUpper; }
                }
              }
            }

            // Start the whole fitting routine for singles peaks
            console.log("Call fitPeaksInSeriesOfHistograms for singles peak fitting");
            fitPeaksInSeriesOfHistograms(spectrumList,dataStore.spectrumList1dPeaks,"HPGe",limits);
          }

          function fittingCallback(){
            // Might not be finished all fitting yet because singles and projections fitting is done sequentially.
            if(dataStore.currentTask == 'SinglesFitting'){
              // Now perform peak fitting for projections
              console.log("Now initiate projections fitting");

              // Set the current task to keep track of our progress
              dataStore.currentTask = 'ProjectionsFitting';

              // Use Limits if any were set through mouse clicks
              var limits = [];
              for(var i=0; i<dataStore.spectrumListProjectionsPeaks.All.length; i++){
                limits[i] = [-1,-1];
                if(dataStore.appLimitsStore != undefined){
                  if(dataStore.appLimitsStore[dataStore.spectrumListProjectionsPeaks.All[i]] != undefined){
                    if(dataStore.appLimitsStore[dataStore.spectrumListProjectionsPeaks.All[i]].LimitLower){ limits[i][0] = dataStore.appLimitsStore[dataStore.spectrumListProjectionsPeaks.All[i]].LimitLower; }
                    if(dataStore.appLimitsStore[dataStore.spectrumListProjectionsPeaks.All[i]].LimitUpper){ limits[i][1] = dataStore.appLimitsStore[dataStore.spectrumListProjectionsPeaks.All[i]].LimitUpper; }
                  }
                }
              }

              // Start the fitting routine for projections peaks for this run file
              console.log("Call fitPeaksInSeriesOfHistograms for projections peak fitting");
              fitPeaksInSeriesOfHistograms(dataStore.spectrumListProjections,dataStore.spectrumListProjectionsPeaks,"HPGe",limits);
              return;
            }

            // All fitting has now been completed

            // Now we are done.
            // Reveal the download buttons
            document.getElementById('saveCSVDiv').classList.remove('hidden');
            document.getElementById('saveScriptDiv').classList.remove('hidden');

            // change information message
            document.getElementById('fittingMessage').classList.add('hidden');
            document.getElementById('reviewMessage').classList.remove('hidden');

            console.log(dataStore);
            console.log("Finished");
            console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

            // Reveal the subpage menu
            document.getElementById('menu').classList.remove('hidden');

            // Launch the post-processing
            processAngularCorrelationData();
          }

          function processAngularCorrelationData(){
            console.log("processAngularCorrelationData()");
            console.log(dataStore);

            // Reset all warnings
            document.getElementById("dataPlotWarnings").innerHTML = "";

            // Initialize the sums as zero
            var sumAngularBinAreas = 0;
            var sumSinglesAreas = [0,0];
            var sumAngularBinAreasUnc = 0;
            var sumSinglesAreasUnc = [0,0];

            // Always exclude the zero angular bin as it is the same detector
            if(!dataStore.angularBinExcludeList.includes(0)){
              dataStore.angularBinExcludeList.push(0);
            }

            // Set if Time-Random Background Subtraction will be performed
            // 2 = Auto for each angular bin = only if the time-random background contribution is greater than 3% of the raw peak value.
            // 1 = Always subtract Time-Random Background
            // 0 = Never subtract Time-Random Background
            var thisTimeRandomOption = 2;
            var optionsTR = document.getElementsByName('time_random_select_value');
            for(var i = 0; i < optionsTR.length; i++){
              if(optionsTR[i].checked){
                thisTimeRandomOption = optionsTR[i].value;
              }
            }
            console.log("Time-Random Background subtraction setting = "+thisTimeRandomOption);

            // Collect the angular bin peak areas
            // This list contains both total projection and peak-gated projection
            // Exclude the zero angular bin as it is the same detector
            // fitResults object always has the fits in centroid order. So need to ensure we get the correct fit as peak and gate
            var peakIndex=0, gateIndex=1;
            if(dataStore.fitPeakEnergies[1]<dataStore.fitPeakEnergies[0]){ peakIndex=1; gateIndex=0; }
            for(var i=0; i<dataStore.angCorrProjections.length; i++){
              // Here we make the subtraction of the gateE peak from the fitE peak to account for time-random coincidences
              var index = i;
              var thisGateKey = dataStore.angCorrProjections[i]; // Gate for angular correlation
              var thisTotalKey = dataStore.angCorrProjections[i].split("x")[0] + "x"; // Total projection

              console.log(thisTotalKey+", gate "+gateIndex+", peak "+peakIndex);
              // Determine the time-random background subtraction factor from the ratio of the two peaks in the total projection
              dataStore.angularBinTRBGFactor[index] = dataStore.fitResults[thisTotalKey][peakIndex][5] / dataStore.fitResults[thisTotalKey][gateIndex][5];
              // Add the fractional errors in quadrature
              dataStore.angularBinTRBGFactorUnc[index] = dataStore.angularBinTRBGFactor[index] * Math.sqrt( Math.pow(dataStore.fitUncertainty[thisTotalKey][peakIndex]/dataStore.fitResults[thisTotalKey][peakIndex][5],2)
              + Math.pow(dataStore.fitUncertainty[thisTotalKey][gateIndex]/dataStore.fitResults[thisTotalKey][gateIndex][5],2) );
              if(!isFinite(dataStore.angularBinTRBGFactor[index])){ dataStore.angularBinTRBGFactor[index] = 1; }
              if(!isFinite(dataStore.angularBinTRBGFactorUnc[index])){ dataStore.angularBinTRBGFactorUnc[index] = 1; }

              // Save the raw area and uncertainties for the peak and time-random coincidence peak
              dataStore.angularBinRawPeakArea[index] = dataStore.fitResults[thisGateKey][peakIndex][5];
              dataStore.angularBinTRBGPeakArea[index] = dataStore.fitResults[thisGateKey][gateIndex][5];
              dataStore.angularBinRawPeakAreaUnc[index] = dataStore.fitUncertainty[thisGateKey][peakIndex];
              dataStore.angularBinTRBGPeakAreaUnc[index] = dataStore.fitUncertainty[thisGateKey][gateIndex];
              // Protect against failed fits
              if(isNaN(dataStore.angularBinRawPeakArea[index])){ dataStore.angularBinRawPeakArea[index] = 1; }
              if(isNaN(dataStore.angularBinTRBGPeakArea[index])){ dataStore.angularBinTRBGPeakArea[index] = 1; }
              if(isNaN(dataStore.angularBinRawPeakAreaUnc[index])){ dataStore.angularBinRawPeakAreaUnc[index] = 1; }
              if(isNaN(dataStore.angularBinTRBGPeakAreaUnc[index])){ dataStore.angularBinTRBGPeakAreaUnc[index] = 1; }
              // Protect against very low-statistics peaks in the time-random
              if(dataStore.angularBinTRBGPeakAreaUnc[index] > dataStore.angularBinTRBGPeakArea[index]){ dataStore.angularBinTRBGPeakAreaUnc[index] = dataStore.angularBinTRBGPeakArea[index]; } // Limit uncertainty to 100%

              // Subtract time-random coincidence from the raw peak area
              // Only subtract time-random contribution if it is greater than 3% of the raw peak area
              if(thisTimeRandomOption == 1){ // thisTimeRandomOption = 1 for always
                dataStore.angularBinPeakArea[index] = parseInt(dataStore.angularBinRawPeakArea[index] - (dataStore.angularBinTRBGPeakArea[index] * dataStore.angularBinTRBGFactor[index]));
                // Reduce the uncertainty for the normalized TRBG peak area by the same factor
                var uncert = (dataStore.angularBinTRBGPeakAreaUnc[index] * dataStore.angularBinTRBGFactor[index]);
                // Add in quadrature the uncertainties for the two peak areas
                dataStore.angularBinPeakAreaUnc[index] = parseInt( Math.sqrt( uncert*uncert + dataStore.angularBinRawPeakAreaUnc[index]*dataStore.angularBinRawPeakAreaUnc[index] ) );
              }else if(thisTimeRandomOption == 2 && dataStore.angularBinTRBGPeakArea[index] / dataStore.angularBinRawPeakArea[index] > 0.03){ // thisTimeRandomOption == 2 auto and >3% contribution
                dataStore.angularBinPeakArea[index] = parseInt(dataStore.angularBinRawPeakArea[index] - (dataStore.angularBinTRBGPeakArea[index] * dataStore.angularBinTRBGFactor[index]));
                // Reduce the uncertainty for the normalized TRBG peak area by the same factor
                var uncert = (dataStore.angularBinTRBGPeakAreaUnc[index] * dataStore.angularBinTRBGFactor[index]);
                // Add in quadrature the uncertainties for the two peak areas
                dataStore.angularBinPeakAreaUnc[index] = parseInt( Math.sqrt( uncert*uncert + dataStore.angularBinRawPeakAreaUnc[index]*dataStore.angularBinRawPeakAreaUnc[index] ) );
              }else{ // thisTimeRandomOption = 0 for never, or 2 auto and <3% contribution
                dataStore.angularBinPeakArea[index] = parseInt(dataStore.angularBinRawPeakArea[index]);
                dataStore.angularBinPeakAreaUnc[index] = parseInt(dataStore.angularBinRawPeakAreaUnc[index]);
              }
              console.log("Time-Random Background subtraction setting = "+thisTimeRandomOption);
              console.log(index+" Ang bin Peak Area Unc: Final:"+dataStore.angularBinPeakAreaUnc[index]+"/"+dataStore.angularBinPeakArea[index]+" = "+dataStore.angularBinPeakAreaUnc[index]/dataStore.angularBinPeakArea[index]);
              console.log(index+" from: Raw: "+dataStore.angularBinRawPeakAreaUnc[index]+"/"+dataStore.angularBinRawPeakArea[index]+"="+dataStore.angularBinRawPeakAreaUnc[index]/dataStore.angularBinRawPeakArea[index]);
              console.log(index+" and "+"TRBG: "+dataStore.angularBinTRBGPeakAreaUnc[index]+"/"+dataStore.angularBinTRBGPeakArea[index]+"="+dataStore.angularBinTRBGPeakAreaUnc[index]/dataStore.angularBinTRBGPeakArea[index]);
              console.log(index+" reduced to: "+uncert+"/"+dataStore.angularBinTRBGPeakArea[index]+"="+uncert/dataStore.angularBinTRBGPeakArea[index]);
              console.log(index+" TRBG Factor is "+dataStore.angularBinTRBGFactorUnc[index]+"/"+dataStore.angularBinTRBGFactor[index]+"="+dataStore.angularBinTRBGFactorUnc[index]/dataStore.angularBinTRBGFactor[index]);

              // Protect against NaN and infinity results
              if(!isFinite(dataStore.angularBinPeakArea[index])){ dataStore.angularBinPeakArea[index] = 0; }
              if(!isFinite(dataStore.angularBinPeakAreaUnc[index])){ dataStore.angularBinPeakAreaUnc[index] = 0; }

              if(index>0){ // exclude only the zero angular difference bin from the normalization
                sumAngularBinAreas += dataStore.angularBinPeakArea[index];
                sumAngularBinAreasUnc += (dataStore.angularBinPeakAreaUnc[index]*dataStore.angularBinPeakAreaUnc[index]);
              }
              dataStore.angularBinWeight[index] = 0;    // zero the weighting factors here
              dataStore.angularBinWeightUnc[index] = 0; // zero the uncertainty in the weighting factors here
              dataStore.numCrystalPairs[index] = 0;     // zero the number of crystal pairs here
            }
            sumAngularBinAreasUnc = Math.sqrt(sumAngularBinAreasUnc); // Squares of the uncertainties were summed in the loop, now find sqrt

            // The normalization factor is the sum of all angular bin peak areas
            // Need to exclude the constributions from angular bins on the excludeList. This is done above.
            dataStore.normalizationFactor = sumAngularBinAreas;
            dataStore.normalizationFactorUnc = parseInt(sumAngularBinAreasUnc);
            console.log("dataStore.normalizationFactor = "+dataStore.normalizationFactor+" with error "+dataStore.normalizationFactorUnc+" = "+(dataStore.normalizationFactorUnc/dataStore.normalizationFactor));
            console.log(dataStore);

            // Collect the singles peak areas from the fitResults object
            for(i=0; i<dataStore.singlesSpectra.length; i++){

              var thisSinglesKey = dataStore.singlesSpectra[i];
              //    console.log(thisSinglesKey);
              dataStore.singlesPeakArea[i] = [0,0]; // initialize this element
              dataStore.singlesPeakAreaUnc[i] = [0,0]; // initialize this element

              console.log(thisSinglesKey+" for "+peakIndex+" and "+gateIndex);
              if( !isNaN(dataStore.fitResults[thisSinglesKey][peakIndex][5]))
              dataStore.singlesPeakArea[i][0] = dataStore.fitResults[thisSinglesKey][peakIndex][5]; // the fit energy peak
              if( !isNaN(dataStore.fitResults[thisSinglesKey][gateIndex][5]))
              dataStore.singlesPeakArea[i][1] = dataStore.fitResults[thisSinglesKey][gateIndex][5]; // the gate energy peak
              dataStore.singlesPeakAreaUnc[i][0] = dataStore.fitUncertainty[thisSinglesKey][peakIndex]; // the fit energy peak
              dataStore.singlesPeakAreaUnc[i][1] = dataStore.fitUncertainty[thisSinglesKey][gateIndex]; // the gate energy peak

              sumSinglesAreas[0] += dataStore.singlesPeakArea[i][0]; // the fit energy peak
              sumSinglesAreas[1] += dataStore.singlesPeakArea[i][1]; // the gate energy peak
              sumSinglesAreasUnc[0] += (dataStore.fitUncertainty[thisSinglesKey][peakIndex]*dataStore.fitUncertainty[thisSinglesKey][peakIndex]); // the fit energy peak
              sumSinglesAreasUnc[1] += (dataStore.fitUncertainty[thisSinglesKey][gateIndex]*dataStore.fitUncertainty[thisSinglesKey][gateIndex]); // the gate energy peak
            }
            sumSinglesAreasUnc[0] = Math.sqrt(sumSinglesAreasUnc[0]); // sqrt after the sum of squares in the loop
            sumSinglesAreasUnc[1] = Math.sqrt(sumSinglesAreasUnc[1]); // sqrt after the sum of squares in the loop

            // Calculate the weighting factors from singles peak areas of all crystals involved in each angular bin
            for(i=0; i<64; i++){
              // Do not include crystals with NaN peak areas, or peak areas of zero
              if(   isNaN(dataStore.singlesPeakArea[i][0]) || isNaN(dataStore.singlesPeakArea[i][1])
              ||    isNaN(dataStore.singlesPeakAreaUnc[i][0]) || isNaN(dataStore.singlesPeakAreaUnc[i][1])
              || dataStore.singlesPeakArea[i][0]<1 || dataStore.singlesPeakArea[i][1]<1 ){ continue; }
              for(var j=0; j<64; j++){
                // Do not include crystals with NaN peak areas, or peak areas of zero
                if(   isNaN(dataStore.singlesPeakArea[j][0]) || isNaN(dataStore.singlesPeakArea[j][1])
                ||    isNaN(dataStore.singlesPeakAreaUnc[j][0]) || isNaN(dataStore.singlesPeakAreaUnc[j][1])
                || dataStore.singlesPeakArea[j][0]<1 || dataStore.singlesPeakArea[j][1]<1 ){ continue; }
                var angleIndex = dataStore.theseGeAngles[i][j];

                // Add the combination of the peak areas from this pair to the sum for this angular bin
                var first_part  = (dataStore.singlesPeakArea[i][0]/sumSinglesAreas[0])*(dataStore.singlesPeakArea[j][1]/sumSinglesAreas[1]);
                var second_part = (dataStore.singlesPeakArea[j][0]/sumSinglesAreas[0])*(dataStore.singlesPeakArea[i][1]/sumSinglesAreas[1]);

                dataStore.angularBinWeight[angleIndex] += first_part * 0.5;
                dataStore.angularBinWeight[angleIndex] += second_part * 0.5;

                // The fractional errors will be added in quadrature. Here we calculate each squared contributions
                var uncert1 = (dataStore.singlesPeakAreaUnc[i][0]/dataStore.singlesPeakArea[i][0]) * (dataStore.singlesPeakAreaUnc[i][0]/dataStore.singlesPeakArea[i][0]);
                var uncert2 = (dataStore.singlesPeakAreaUnc[j][0]/dataStore.singlesPeakArea[j][0]) * (dataStore.singlesPeakAreaUnc[j][0]/dataStore.singlesPeakArea[j][0]);
                var uncert3 = (dataStore.singlesPeakAreaUnc[i][1]/dataStore.singlesPeakArea[i][1]) * (dataStore.singlesPeakAreaUnc[i][1]/dataStore.singlesPeakArea[i][1]);
                var uncert4 = (dataStore.singlesPeakAreaUnc[j][1]/dataStore.singlesPeakArea[j][1]) * (dataStore.singlesPeakAreaUnc[j][1]/dataStore.singlesPeakArea[j][1]);
                var uncert5 = (sumSinglesAreasUnc[0]/sumSinglesAreas[0]) * (sumSinglesAreasUnc[0]/sumSinglesAreas[0]);
                var uncert6 = (sumSinglesAreasUnc[1]/sumSinglesAreas[1]) * (sumSinglesAreasUnc[1]/sumSinglesAreas[1]);
                var uncertCombo1 = ( first_part * Math.sqrt( uncert1 + uncert4 + uncert5 + uncert6)) * ( first_part * Math.sqrt( uncert1 + uncert4 + uncert5 + uncert6));
                var uncertCombo2 = (second_part * Math.sqrt( uncert2 + uncert3 + uncert5 + uncert6)) * (second_part * Math.sqrt( uncert2 + uncert3 + uncert5 + uncert6));
                var thisUncert =  Math.sqrt( uncertCombo1 + uncertCombo2 );


                //var uncertSum = uncert1 + uncert2 + uncert3 + uncert4 + uncert5 + uncert6;
                //  var uncertSum = uncert1 + uncert2 + uncert3 + uncert4;// + uncert5 + uncert6;
                //  console.log("This pair contribution ["+i+","+j+"]");
                //  console.log("Relative contributions: "+(uncert1/uncertSum)+", "+(uncert2/uncertSum)+", "+(uncert3/uncertSum)+", "+(uncert4/uncertSum)+", "+(uncert5/uncertSum)+", "+(uncert6/uncertSum));
                //  console.log("Value, uncertainty = "+dataStore.angularBinWeight[angleIndex]+", "+thisUncert+" which is "+((thisUncert/dataStore.angularBinWeight[angleIndex])*100)+"%");
                // Sum the squared contributions to include the uncertainty in the peak areas for this pair combination to the running sum
                // However, we are adding them in quadrature for each pair. So here we sum the squares
                // When all are collected then they will be sqrt.
                dataStore.angularBinWeightUnc[angleIndex] +=  thisUncert*thisUncert; // sum the squares. Then square-root will be taken when all combinations collected.

                // Determine the number of crystal pairs in each angular bin here so that crystals with peak areas of zero are not included
                dataStore.numCrystalPairs[angleIndex]++;
              }
            }

            console.log(dataStore);
            console.log("Angular Correlation Data:");
            // Calculate the angular correlation data points
            for(i=0; i<dataStore.angularBinPeakArea.length; i++){

              // The uncertainty in the weighting factor of the angular bins is the uncertainties in the peak areas added in quadrature. So here we sqrt the sum of these after the loop for the sum has ended.
              dataStore.angularBinWeightUnc[i] =  Math.sqrt(dataStore.angularBinWeightUnc[i]);
              console.log("Final Weight["+i+"] Value, uncertainty = "+dataStore.angularBinWeight[i]+", "+dataStore.angularBinWeightUnc[i]+" which is "+((dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[angleIndex])*100)+"%");

              // Calculate the angular correlation data value
              dataStore.angularBinData[i] = dataStore.angularBinPeakArea[i] / (dataStore.angularBinWeight[i] * dataStore.normalizationFactor);

              // Add the fractional errors in quadrature
              dataStore.angularBinDataUnc[i] = dataStore.angularBinData[i]
              * Math.sqrt(  ((dataStore.angularBinPeakAreaUnc[i]/dataStore.angularBinPeakArea[i]) * (dataStore.angularBinPeakAreaUnc[i]/dataStore.angularBinPeakArea[i]))
              + ((dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[i]) * (dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[i]))
              + ((dataStore.normalizationFactorUnc/dataStore.normalizationFactor) * (dataStore.normalizationFactorUnc/dataStore.normalizationFactor))
              + (dataStore.systematicUncertainty*dataStore.systematicUncertainty) // Include a systematic uncertainty set by user input
            )

            // Protect against NaN or infinite values
            if(!isFinite(dataStore.angularBinData[i])){ dataStore.angularBinData[i] = 0.0; }
            if(!isFinite(dataStore.angularBinDataUnc[i])){ dataStore.angularBinDataUnc[i] = 0; }
            //  console.log(dataStore.theseAngularBins[i]+","+dataStore.angularBinData[i]+","+dataStore.angularBinDataUnc[i]);
            //  console.log("Error from "+dataStore.angularBinPeakAreaUnc[i]+"/"+dataStore.angularBinPeakArea[i]+"="+(dataStore.angularBinPeakAreaUnc[i]/dataStore.angularBinPeakArea[i])+", "+dataStore.angularBinWeightUnc[i]+"/"+dataStore.angularBinWeight[i]+"="+(dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[i])+", "+dataStore.normalizationFactorUnc+"/"+dataStore.normalizationFactor+"="+(dataStore.normalizationFactorUnc/dataStore.normalizationFactor) );
          }

          // Set the number of degrees of freedom used in the reduced chi-square calculation
          dataStore.angularBinEmptyCount = 0;
          for(i=0; i<dataStore.angularBinData.length; i++){ if(dataStore.angularBinData[i]==0 && dataStore.angularBinExcludeList.indexOf(i)<0){ dataStore.angularBinEmptyCount++; } }
          dataStore.numDegreesOfFreedom = dataStore.angularBinData.length - dataStore.angularBinExcludeList.length - dataStore.angularBinEmptyCount - 2; // Number of data points minus two parameters to fit (c1,c4)

          console.log(dataStore.angularBinData);
          console.log(dataStore.angularBinExcludeList);
          console.log("Number of degrees of Freedom = "+dataStore.angularBinData.length + " - "+ dataStore.angularBinExcludeList.length + " - "+ dataStore.angularBinEmptyCount+ " - 2 = "+dataStore.numDegreesOfFreedom);

          // Set the confidence level value used in the plotting of the reduced chi-square calculation
          var optionsCL = document.getElementsByName('confidenceLimitValue');
          for(var i = 0; i < optionsCL.length; i++){
            if(optionsCL[i].checked){
              var thisConfidenceLimit = optionsCL[i].value;
              dataStore.criticalLevel = thisConfidenceLimit;
            }
          }
          console.log(thisConfidenceLimit);
          dataStore.criticalValue = dataStore.criticalChiSquareValueTable[thisConfidenceLimit][dataStore.numDegreesOfFreedom-1];
          dataStore.criticalValue = (dataStore.criticalValue / dataStore.numDegreesOfFreedom).toFixed(3);
          console.log("Critical Value of "+dataStore.criticalValue+" from "+dataStore.criticalChiSquareValueTable[thisConfidenceLimit][dataStore.numDegreesOfFreedom-1]+" / "+dataStore.numDegreesOfFreedom);

          // Report the statistics of this correlation
          document.getElementById('dataTableMessage').innerHTML = "<h4>"+dataStore.histoFileName+": "+dataStore.fitPeakEnergies[0]+"-"+dataStore.fitPeakEnergies[1]+"(gate) keV</h4>"+ "<h4>Total gamma-gamma coincidences = "+sumAngularBinAreas.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+". The mean peak area in an individual angular bin = "+(sumAngularBinAreas/(dataStore.angularBinData.length-dataStore.angularBinExcludeList.length)).toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+"</h4>"
          +"<h4>Normalization factor (Sum of Corrected Areas) = "+bracketNotationString(dataStore.normalizationFactor.toFixed(2),dataStore.normalizationFactorUnc)+"</h4>";
          document.getElementById('dataPlotMessage').innerHTML = "<h4>"+dataStore.histoFileName+": "+dataStore.fitPeakEnergies[0]+"-"+dataStore.fitPeakEnergies[1]+"(gate) keV</h4>"+ "<h4>Total gamma-gamma coincidences = "+sumAngularBinAreas.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+". The mean peak area in an individual angular bin = "+(sumAngularBinAreas/(dataStore.angularBinData.length-dataStore.angularBinExcludeList.length)).toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+"</h4>";
          console.log("Total gamma-gamma coincidences = "+sumAngularBinAreas.toFixed(0)+", mean peak area in an individual angular bin = "+(sumAngularBinAreas/(dataStore.angularBinData.length-dataStore.angularBinExcludeList.length)).toFixed(0));
          document.getElementById('dataPlotMessage').innerHTML += "<h4>"+"The Critical Value ("+dataStore.criticalLevelStrings[dataStore.criticalLevel]+" confidence level) for "+dataStore.numDegreesOfFreedom+" degrees of freedom is \u{1D6D8}\u00B2/NDF="+dataStore.criticalValue+"."+"</h4>";
          if(dataStore.systematicUncertainty>0){var systematicString = "A systematic uncertainty of "+(dataStore.systematicUncertainty*100).toFixed(1)+"% has been added in quadrature to each data point. ";}else{var systematicString = "No systematic uncertainty has been added to the data points. ";}
          document.getElementById('dataPlotMessage').innerHTML += "<h4>"+systematicString+"</h4>";

          // Populate the results table for the angular correlation and weights data
          dataStore._angularCorrelationsReport.updateDataTable();
          dataStore._angularCorrelationsReport.updateWeightTable();
          dataStore._angularCorrelationsReport.updateFitsTable();

          // Promise to generate the chi-squared data and then populate the tables and plots
          let dataPromise = new Promise(function(resolve, reject) {
            generateChiSquareData();
            return resolve();
          });

          dataPromise.then(

            function(value){
              console.log("Execute then function of dataPromise");

              // Populate the main angular correlation plot
              dataStore._angularCorrelationsReport.refreshAngCorrPlot();

              // Populate the chi-squred plot
              dataStore._angularCorrelationsReport.populateChiSquarePlot();

              // Write the results to the Table
              dataStore._angularCorrelationsReport.updateChiSquareResultsTable();

              // Show the angular correlations plot when finished
              if(dataStore.currentTask!="refit"){ document.getElementById("dataPlotRegionMenuButton").click(); }
            }
          );

        }

        function generateResidualsData(c2,c4){
          console.log("generateResidualsData");

          dataStore.angularBinDataResiduals = []; // Reset this array, especially if some points have been excluded

          var theorySeries = theoreticalAngularCorrelation(c2,c4, dataStore.expAngBinRadians);
          var thisOffset = angularCorrelationRegression(dataStore.expAngBinData,theorySeries);
          for(var i=0; i<theorySeries.length; i++){ theorySeries[i] = theorySeries[i] + thisOffset; }

          for(var i=0; i<dataStore.expAngBinData.length; i++){
            //  Excluded bins are already accounted for in dataStore.expAngBinData
            dataStore.angularBinDataResiduals[i] = dataStore.expAngBinData[i] - theorySeries[i];
          }
        }

        function generateChiSquareData(){


          // Return a new promise.
          return new Promise(function(resolve) {


            console.log("generateChiSquareData");
            console.log(dataStore.angularBinExcludeList);
            dataStore.theseAngularBinsRadians = [];
            for(var i=0; i<dataStore.theseAngularBins.length; i++){
              dataStore.theseAngularBinsRadians.push(Math.cos(dataStore.theseAngularBins[i]*(Math.PI / 180.000)));
            }

            var thisTheory = [];      // A series of the distribution vs cos(theta)
            var newCoEffs = [];       // Coefficients [a2,a4]. Theoretical and uncorrected for finite element size.
            var correctedCoEffs = []; // Coefficients [c2,c4]. Corrected for finite element size.
            var localMinima = [[]];   // An array of minima indexes for each j value.
            var localMinimaKeys = []; // An array of minima keys for each j value (they may not start from 0).
            var thisOffset = 0.0; // Offset to align theory with data
            // Declare the variables
            var j1, j2, j3, l1a, l1b, l2a, l2b, delta1, delta2;
            var bestFitC = [], bestFitA = [], bestFitKey = '', pure=0;
            dataStore.minimaDetails = {}; // reset this array
            dataStore.NEWminimaDetails = {}; // reset this array
            var expAngBinData = [];
            var expAngBinDataUnc = [];
            var expAngBinRadians = [];

            // Get the beta and gamma parameters for this energy cascade
            // THIS SHOULD BE A CALL TO A FUNCTION BUT HARD-CODED HERE FOR 152EU 344-778
            //dataStore.beta  = 0.954711; // 60Co, 4-2-0, 1332-1173
            //dataStore.gamma = 0.841345; // 60Co, 4-2-0, 1332-1173
            //  dataStore.beta  = 0.957442; // 66Ga, 0-2-0, 1333-1039
            //  dataStore.gamma = 0.852034; // 66Ga, 0-2-0, 1333-1039
            //  dataStore.beta  = 0.950804; // 152Eu, 2-2-0, 1408-121
            //  dataStore.gamma = 0.829300; // 152Eu, 2-2-0, 1408-121
            //dataStore.beta  = 0.950933; // 148Cs, 719-141
            //dataStore.gamma = 0.828565; // 148Cs, 719-141
            //dataStore.beta  = 1.0; // Theory
            //dataStore.gamma = 1.0; // Theory
            //  dataStore.beta  = 0.9; // 148Ba trialling
            //  dataStore.gamma = 0.7; // 148Ba trialling
            dataStore.beta  = parseFloat(document.getElementById('betaInput').value);
            dataStore.gamma = parseFloat(document.getElementById('gammaInput').value);

            // Grab the user input for the cascade
            j2=parseFloat(document.getElementById('j2').value);
            j3=parseFloat(document.getElementById('j3').value);
            delta2 = parseFloat(document.getElementById('mix2').value);

            // Calculate the l2 momenta
            l2a = l2b = Math.abs(j2-j3);
            if(l2a<1){ l2a = l2b = 1; } // E0 is not permitted
            if((j2+j3)>l2b){ l2b++; }

            // Build the array of experimental data to use.
            // Exclude any bins identified in the excludeList.
            var index=0;
            for(var i=0; i<dataStore.angularBinData.length; i++){
              if(dataStore.angularBinExcludeList.includes(i)){ continue; } // Exclude any datapoints on the excludeList
              expAngBinData[index] = dataStore.angularBinData[i];
              expAngBinDataUnc[index] = dataStore.angularBinDataUnc[i];
              expAngBinRadians[index] = dataStore.theseAngularBinsRadians[i];
              index++;
            }
            // Save this x series for use in generating theory curves
            dataStore.expAngBinData = expAngBinData;
            dataStore.expAngBinDataUnc = expAngBinDataUnc;
            dataStore.expAngBinRadians = expAngBinRadians;
            // x series for theory line plotting
            dataStore.expAngFineBinRadians = [];
            for(i=-1; i<=1; i+=0.01){
              dataStore.expAngFineBinRadians.push(i);
            }

            // Zero the arrays and variables
            dataStore.delta1Series = [];
            dataStore.chiSqLabelSeries = [];
            dataStore.chiSquareSeries = [];
            var minChiSquareSeries = [];
            var thisChiSquare, minChiSquare = 100000;

            // Loop through possible j values of j2 plus and minus 2.
            // For each j value, scan the full range of mixing ratio (delta).
            // At each point calculate the theoretical coefficients a2,a4
            // Correct the theoretical coefficients with the finite-element correction parameters for this energy cascade.
            // Determine the chi-square of the fit of this corrected-theory curve with the experimental data.
            // Find the minima in the chi-squared distribution for each j value.
            index=0;
            for(j1=(j2-2); j1<(j2+3); j1++){
              l1a = l1b = Math.abs(j1-j2);
              if(l1a<1){ l1a = l1b = 1; } // E0 is not permitted
              if((j1+j2)>l1b){ l1b++; }
              if(l1a == l1b && l1a == l2a && l1a == l2b){ pure=1; }else{ pure=0; }
              //  console.log("j1,j2,j3,l1a,l1b,l2a,l2b: "+j1+","+j2+","+j3+","+l1a+","+l1b+","+l2a+","+l2b);
              dataStore.delta1Series[index] = [];
              dataStore.chiSquareSeries[index] = [];
              dataStore.chiSqLabelSeries[index] = "j="+j1;
              minChiSquareSeries[index] = 1000000000;
              for(var atanDelta1=-1.5; atanDelta1<=1.5; atanDelta1+=0.01){
                if(atanDelta1>-0.01 && atanDelta1<0.01){ atanDelta1=0.0; }
                dataStore.delta1Series[index].push(atanDelta1.toFixed(2));
                if(pure){ // Need special handling for pure multipolarity case which only has one solution
                  if(atanDelta1 != 0){
                    dataStore.chiSquareSeries[index].push(null);
                    continue;
                  }else{
                    newCoEffs = calculateTheoreticalAngularCorrelationCoefficients(j1, j2, j3, l1a, l1b, l2a, l2b, Math.tan(atanDelta1), delta2);
                    correctedCoEffs[0] = newCoEffs[0] * dataStore.beta;
                    correctedCoEffs[1] = newCoEffs[1] * dataStore.gamma;
                    thisTheory = theoreticalAngularCorrelation(correctedCoEffs[0],correctedCoEffs[1], expAngBinRadians);
                    thisOffset = angularCorrelationRegression(expAngBinData,thisTheory);
                    for(i=0; i<thisTheory.length; i++){ thisTheory[i] = thisTheory[i] + thisOffset; }
                    thisChiSquare = calculateChiSquare(expAngBinData,expAngBinDataUnc,thisTheory)/dataStore.numDegreesOfFreedom;
                    dataStore.chiSquareSeries[index].push(thisChiSquare);
                    var minimaKey = "j="+j1+"-1"; // Only one solution for pure case
                    localMinimaKeys[index] = j1;
                    dataStore.minimaDetails[minimaKey] = {
                      'series': "j="+j1,
                      'params': [j1, j2, j3, l1a, l1b, l2a, l2b, Math.tan(atanDelta1), delta2],
                      'atanDelta1': atanDelta1.toFixed(3),
                      'Delta1': Math.tan(atanDelta1).toFixed(3),
                      'Delta1Unc': 0,
                      'chiSquare': thisChiSquare.toFixed(3),
                      'beta': dataStore.beta,
                      'gamma': dataStore.gamma,
                      'bestFitCoeffsC': [newCoEffs[0]*dataStore.beta,newCoEffs[1]*dataStore.gamma],
                      'bestFitCoeffsA': newCoEffs
                    };
                    // This identifies the global minimum
                    if(thisChiSquare<minChiSquare){  // Global minimum
                      minChiSquare = thisChiSquare;
                      bestFitC = [newCoEffs[0]*dataStore.beta,newCoEffs[1]*dataStore.gamma];
                      bestFitA = newCoEffs;
                      bestFitKey = minimaKey;
                    }
                    continue;
                  }
                }
                // Calculate the chi-square for this set of coefficients and atan(delta) value
                newCoEffs = calculateTheoreticalAngularCorrelationCoefficients(j1, j2, j3, l1a, l1b, l2a, l2b, Math.tan(atanDelta1), delta2);
                correctedCoEffs[0] = newCoEffs[0] * dataStore.beta;
                correctedCoEffs[1] = newCoEffs[1] * dataStore.gamma;
                thisTheory = theoreticalAngularCorrelation(correctedCoEffs[0],correctedCoEffs[1], expAngBinRadians);
                thisOffset = angularCorrelationRegression(expAngBinData,thisTheory);
                for(i=0; i<expAngBinData.length; i++){ thisTheory[i] = thisTheory[i] + thisOffset; }
                thisChiSquare = calculateChiSquare(expAngBinData,expAngBinDataUnc,thisTheory)/dataStore.numDegreesOfFreedom;
                dataStore.chiSquareSeries[index].push(thisChiSquare);

                // This finds the primary local minimum for this j value
                if(thisChiSquare<minChiSquareSeries[index]){
                  minChiSquareSeries[index] = thisChiSquare;
                  var minimaKey = "j="+j1+"-1"; // This is always the primary minimum for this j value
                  //    console.log("This  c2,c4 = ["+newCoEffs[0]+","+newCoEffs[1]+"] and a2,a4 = ["+correctedCoEffs[0]+","+correctedCoEffs[1]+"]");
                  dataStore.minimaDetails[minimaKey] = {
                    'series': "j="+j1,
                    'params': [j1, j2, j3, l1a, l1b, l2a, l2b, Math.tan(atanDelta1), delta2],
                    'atanDelta1': atanDelta1.toFixed(3),
                    'Delta1': Math.tan(atanDelta1).toFixed(4),
                    'Delta1Unc': 0,
                    'chiSquare': thisChiSquare.toFixed(3),
                    'beta': dataStore.beta,
                    'gamma': dataStore.gamma,
                    'bestFitCoeffsC': [newCoEffs[0]*dataStore.beta,newCoEffs[1]*dataStore.gamma],
                    'bestFitCoeffsA': newCoEffs
                  };
                  //        console.log("Saved c2,c4 = ["+dataStore.minimaDetails[minimaKey].bestFitCoeffsC[0]+","+dataStore.minimaDetails[minimaKey].bestFitCoeffsC[1]+"] and a2,a4 = ["+dataStore.minimaDetails[minimaKey].bestFitCoeffsA[0]+","+dataStore.minimaDetails[minimaKey].bestFitCoeffsA[1]+"]");

                  // This identifies the global minimum
                  if(thisChiSquare<minChiSquare){  // Global minimum
                    minChiSquare = thisChiSquare;
                    bestFitC = [newCoEffs[0]*dataStore.beta,newCoEffs[1]*dataStore.gamma];
                    bestFitA = newCoEffs;
                    bestFitKey = minimaKey;
                  }
                }

              }
              //  console.log("End of atan loop");
              console.log(dataStore.minimaDetails);

              // Now we have the full chi-square series for this j value
              // Locate the primary and secondary minimum for this j value
              if(pure){ localMinimaKeys[index] = j1; index++; continue; } // Pure multipolarity only have one solution which was already recorded
              var previousGradient = 1;
              var gradient = 1;
              if(!localMinima[index]){ localMinima[index] = []; localMinimaKeys[index] = j1; }
              for(i=1; i<dataStore.delta1Series[index].length; i++){
                previousGradient = gradient;
                if(dataStore.chiSquareSeries[index][i]<dataStore.chiSquareSeries[index][i-1]){ gradient = -1; }else{ gradient = 1; }
                if(previousGradient<gradient){ // The gradient changed from negative to positive so we have found a minimum
                  console.log("j="+j1+" minimum found at ["+i+"], delta="+dataStore.delta1Series[index][i]+", chi-square="+dataStore.chiSquareSeries[index][i]);
                  localMinima[index].push(i-1);
                  localMinimaKeys[index] = j1;
                }
              }

              index++;
            }

            // Sort the arrays so the primary minimum is always first
            for(i=0; i<localMinima.length; i++){
              if(localMinima[i].length>1){
                if(localMinima[i][1]>localMinima[i][0]){
                  j=localMinima[i][0];
                  localMinima[i][0] = localMinima[i][1];
                  localMinima[i][1] = j;
                }
              }
            }
            console.log(localMinima);
            // Find the uncertainty for each chi-square minimum
            for(i=0; i<localMinima.length; i++){
              for(j=0; j<localMinima[i].length; j++){
                minimaKey = "j="+localMinimaKeys[i]+"-1";
                var theseParams = dataStore.minimaDetails[minimaKey].params;
                if(dataStore.chiSquareSeries[i][localMinima[i][j]].toFixed(3) != dataStore.minimaDetails[minimaKey].chiSquare){
                  console.log("Must be second minimum: "+dataStore.chiSquareSeries[i][localMinima[i][j]].toFixed(4)+" not equal to "+dataStore.minimaDetails[minimaKey].chiSquare+", for atan(delta)="+dataStore.minimaDetails[minimaKey].atanDelta1);
                  theseParams[7] = Number(dataStore.delta1Series[i][localMinima[i][j]]).toFixed(3);
                  theseParams[8] = (Math.tan(dataStore.delta1Series[i][localMinima[i][j]])).toFixed(4);
                  newCoEffs = calculateTheoreticalAngularCorrelationCoefficients(theseParams[0],theseParams[1],theseParams[2],theseParams[3],theseParams[4],theseParams[5],theseParams[6],theseParams[7],theseParams[8]);
                  correctedCoEffs[0] = newCoEffs[0] * dataStore.beta;
                  correctedCoEffs[1] = newCoEffs[1] * dataStore.gamma;
                  minimaKey = "j="+localMinimaKeys[i]+"-2";
                  dataStore.minimaDetails[minimaKey] = {
                    'series': "j="+i,
                    'params': theseParams,
                    'atanDelta1': Number(dataStore.delta1Series[i][localMinima[i][j]]).toFixed(3),
                    'Delta1': (Math.tan(dataStore.delta1Series[i][localMinima[i][j]])).toFixed(4),
                    'chiSquare': dataStore.chiSquareSeries[i][localMinima[i][j]].toFixed(3),
                    'beta': dataStore.beta,
                    'gamma': dataStore.gamma,
                    'bestFitCoeffsC': [newCoEffs[0]*dataStore.beta,newCoEffs[1]*dataStore.gamma],
                    'bestFitCoeffsA': newCoEffs
                  };
                }
                k=localMinima[i][j]; // k is an index number of the series array
                threshold = Number(dataStore.chiSquareSeries[i][k] + (1/dataStore.numDegreesOfFreedom)); // threshold is the chi-square value
                while(dataStore.chiSquareSeries[i][k]<threshold){ k--; }
                var minUncertIndex = k; k=localMinima[i][j];
                while(dataStore.chiSquareSeries[i][k]<threshold){ k++; }
                var maxUncertIndex = k;
                dataStore.minimaDetails[minimaKey]['Delta1Unc'] = ((Math.tan(dataStore.delta1Series[i][maxUncertIndex]) - Math.tan(dataStore.delta1Series[i][minUncertIndex]))/2).toFixed(4);
              }
            }

            console.log([dataStore.delta1Series,dataStore.chiSquareSeries]);

            console.log(dataStore);

            // Generate data for the best fit line to be displayed as a line on the Ang Corr Data plot
            var thisTheory = theoreticalAngularCorrelation(bestFitC[0],bestFitC[1], dataStore.expAngBinRadians); // x series matching data for determining offset
            var thisOffset = angularCorrelationRegression(dataStore.expAngBinData,thisTheory);
            thisTheory = theoreticalAngularCorrelation(bestFitC[0],bestFitC[1], dataStore.expAngFineBinRadians); // fine x series for the actual plot
            for(var i=0; i<thisTheory.length; i++){ thisTheory[i] = thisTheory[i] + thisOffset; }
            dataStore.displayLineData = thisTheory;
            dataStore.displayLineName = "Global minimum, "+bestFitKey.split("-")[0]+", \u03B4 = "+dataStore.minimaDetails[bestFitKey].Delta1;
            dataStore.displayLineTitle = "\u{1D6D8}\u00B2/NDF = "+dataStore.minimaDetails[bestFitKey].chiSquare;

            // Generate the residuals for the global best fit
            generateResidualsData(bestFitC[0],bestFitC[1]);

            // Save the global best fit result for use in the plots
            dataStore.bestFitCoeffs = bestFitC;
            dataStore.bestFitKey = bestFitKey;


            console.log(dataStore);
            // resolve the promise
            resolve("Success!");
          }); // end of promise definition

        }

        function toggleExcludeList(index){

          if( dataStore.angularBinExcludeList.includes(Number(index))){
            // If this index is already excluded, remove this index from the exclude list
            dataStore.angularBinExcludeList.splice(dataStore.angularBinExcludeList.indexOf(Number(index)),1);
          }else{
            // If this index is not already excluded, add it to the exclude list
            dataStore.angularBinExcludeList.push(Number(index));
          }

          // Trigger a recalculation
          dataStore.refitCallback();
        }

        function buildCSVfile(){
          console.log('Download initiated');

          // Write the table of results to a CSV file for download.
          CSV = '';

          CSV += 'GRIFFIN Gamma-Gamma Angular Correlations Data\n\n';

          // List the run files used for this calibration
          CSV += 'Histogram file:,' + dataStore.histoFileName + '\n';
          CSV += dataStore.detectorType + '\n';

          // Print table Titles
          CSV += '\nAngular bin data for angular correlation:,,,,,,,,,,,,,,,Data for calculating Weighting factors from individual crystals:\n';

          // Print the column titles
          CSV += 'Angular Bin Index,';
          CSV += 'Angular Bin (deg),';
          CSV += 'Angular Bin cos(),';
          CSV += 'Num Ge pairs,';
          CSV += 'Angular Bin Raw Area,';
          CSV += 'Angular Bin BKG Area,';
          CSV += 'Angular Bin BKG Factor,';
          CSV += 'Angular Bin Area,';
          CSV += 'Angular Bin Area Uncertainty,';
          CSV += 'Angular Bin Weight,';
          CSV += 'Normalization Factor,';
          CSV += 'Angular Correlation Value,';
          CSV += 'Ang. Corr. Value Uncertainty, , ,';
          CSV += 'Crystal Index,';
          CSV += 'Gate Peak Energy (keV),';
          CSV += 'Singles Area,';
          CSV += 'Singles Area Uncertainty,';
          CSV += 'Fitted Peak Energy (keV),';
          CSV += 'Singles Area,';
          CSV += 'Singles Area Uncertainty\n';

          // Loop through all angular bins to provide the data
          for(i=1; i<=dataStore.singlesPeakArea.length; i++){

            if(i<dataStore.angularBinData.length){
              CSV += (i-1) + ',';
              CSV += dataStore.theseAngularBins[i] + ',';
              CSV += Math.cos(dataStore.theseAngularBins[i]*(Math.PI / 180.000)) + ',';
              CSV += dataStore.numCrystalPairs[i] + ',';
              CSV += dataStore.angularBinRawPeakArea[i] + ',';
              CSV += dataStore.angularBinTRBGPeakArea[i] + ',';
              CSV += dataStore.angularBinTRBGFactor[i] + ',';
              CSV += dataStore.angularBinPeakArea[i] + ',';
              CSV += dataStore.angularBinPeakAreaUnc[i] + ',';
              CSV += dataStore.angularBinWeight[i] + ',';
              CSV += dataStore.normalizationFactor + ',';
              CSV += dataStore.angularBinData[i] + ',';
              CSV += dataStore.angularBinDataUnc[i] + ', , ,';
              CSV += i + ',';
              CSV += dataStore.fitPeakEnergies[1] + ',';
              CSV += dataStore.singlesPeakArea[i-1][1] + ',';
              CSV += dataStore.singlesPeakAreaUnc[i-1][1] + ',';
              CSV += dataStore.fitPeakEnergies[0] + ',';
              CSV += dataStore.singlesPeakArea[i-1][0] + ',';
              CSV += dataStore.singlesPeakAreaUnc[i-1][0] + '\n';
            }else{
              CSV += ' , , , , , , , , , , , , , , ,';
              CSV += i + ',';
              CSV += dataStore.fitPeakEnergies[1] + ',';
              CSV += dataStore.singlesPeakArea[i-1][1] + ',';
              CSV += dataStore.singlesPeakAreaUnc[i-1][1] + ',';
              CSV += dataStore.fitPeakEnergies[0] + ',';
              CSV += dataStore.singlesPeakArea[i-1][0] + ',';
              CSV += dataStore.singlesPeakAreaUnc[i-1][0] + '\n';
            }

          }

          // Create a download link
          const textBlob = new Blob([CSV], {type: 'text/plain'});
          URL.revokeObjectURL(window.textBlobURL);
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(textBlob);
          downloadLink.download = "GRIFFIN-Gamma-Gamma-Angular-Correlation.csv";

          // Trigger the download
          document.body.appendChild(downloadLink);
          downloadLink.click();
        }
