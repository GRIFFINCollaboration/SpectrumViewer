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
  dataStore.histoChoiceBarContents = ['GRIFFIN'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'new GainMatcher';                                   //header title
  dataStore.plotGroups = [];                                          // groups used for building the specturm menu (plotlite)
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [];                                                 //buffer for raw matrix data
  dataStore.matrix = [];                                                 //buffer for objects containing the uncompressed matrix data
  dataStore.hm = {};                                                 //object for 2d matrix stuff
  dataStore.hm._raw = [];                                                 //buffer for raw matrix data
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
  dataStore.progressBarKey = "newGainMatcherProgress";  // id of the Div with class = "progress-bar ..."
  dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
  dataStore.progressBarTasksCompleted = 0;                           // Number of tasks completed so far for use with the progress bar
  dataStore.refitCallback = function(){ setTimeout(postProcessGainMatcher(), 1000); }  // callback function for after a peak refit

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

  dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects
  dataStore.cellIndex = dataStore.plots.length;

  // Declare the peakFitterScript object
  dataStore.peakFitterScript = {};                                       // This object contains the files, histograms, projections and peaks that dictate the tasks in the workflow

  dataStore.peakFitterScriptTemplate = {};
  dataStore.peakFitterScriptTemplate = {
    'HPGe' : {'spectrumList1d' : [
      "GRG01BN00A_Pulse_Height","GRG01GN00A_Pulse_Height","GRG01RN00A_Pulse_Height","GRG01WN00A_Pulse_Height",
      "GRG02BN00A_Pulse_Height","GRG02GN00A_Pulse_Height","GRG02RN00A_Pulse_Height","GRG02WN00A_Pulse_Height",
      "GRG03BN00A_Pulse_Height","GRG03GN00A_Pulse_Height","GRG03RN00A_Pulse_Height","GRG03WN00A_Pulse_Height",
      "GRG04BN00A_Pulse_Height","GRG04GN00A_Pulse_Height","GRG04RN00A_Pulse_Height","GRG04WN00A_Pulse_Height",
      "GRG05BN00A_Pulse_Height","GRG05GN00A_Pulse_Height","GRG05RN00A_Pulse_Height","GRG05WN00A_Pulse_Height",
      "GRG06BN00A_Pulse_Height","GRG06GN00A_Pulse_Height","GRG06RN00A_Pulse_Height","GRG06WN00A_Pulse_Height",
      "GRG07BN00A_Pulse_Height","GRG07GN00A_Pulse_Height","GRG07RN00A_Pulse_Height","GRG07WN00A_Pulse_Height",
      "GRG08BN00A_Pulse_Height","GRG08GN00A_Pulse_Height","GRG08RN00A_Pulse_Height","GRG08WN00A_Pulse_Height",
      "GRG09BN00A_Pulse_Height","GRG09GN00A_Pulse_Height","GRG09RN00A_Pulse_Height","GRG09WN00A_Pulse_Height",
      "GRG10BN00A_Pulse_Height","GRG10GN00A_Pulse_Height","GRG10RN00A_Pulse_Height","GRG10WN00A_Pulse_Height",
      "GRG11BN00A_Pulse_Height","GRG11GN00A_Pulse_Height","GRG11RN00A_Pulse_Height","GRG11WN00A_Pulse_Height",
      "GRG12BN00A_Pulse_Height","GRG12GN00A_Pulse_Height","GRG12RN00A_Pulse_Height","GRG12WN00A_Pulse_Height",
      "GRG13BN00A_Pulse_Height","GRG13GN00A_Pulse_Height","GRG13RN00A_Pulse_Height","GRG13WN00A_Pulse_Height",
      "GRG14BN00A_Pulse_Height","GRG14GN00A_Pulse_Height","GRG14RN00A_Pulse_Height","GRG14WN00A_Pulse_Height",
      "GRG15BN00A_Pulse_Height","GRG15GN00A_Pulse_Height","GRG15RN00A_Pulse_Height","GRG15WN00A_Pulse_Height",
      "GRG16BN00A_Pulse_Height","GRG16GN00A_Pulse_Height","GRG16RN00A_Pulse_Height","GRG16WN00A_Pulse_Height",
      "GRG01BN00B_Pulse_Height","GRG01GN00B_Pulse_Height","GRG01RN00B_Pulse_Height","GRG01WN00B_Pulse_Height",
      "GRG02BN00B_Pulse_Height","GRG02GN00B_Pulse_Height","GRG02RN00B_Pulse_Height","GRG02WN00B_Pulse_Height",
      "GRG03BN00B_Pulse_Height","GRG03GN00B_Pulse_Height","GRG03RN00B_Pulse_Height","GRG03WN00B_Pulse_Height",
      "GRG04BN00B_Pulse_Height","GRG04GN00B_Pulse_Height","GRG04RN00B_Pulse_Height","GRG04WN00B_Pulse_Height",
      "GRG05BN00B_Pulse_Height","GRG05GN00B_Pulse_Height","GRG05RN00B_Pulse_Height","GRG05WN00B_Pulse_Height",
      "GRG06BN00B_Pulse_Height","GRG06GN00B_Pulse_Height","GRG06RN00B_Pulse_Height","GRG06WN00B_Pulse_Height",
      "GRG07BN00B_Pulse_Height","GRG07GN00B_Pulse_Height","GRG07RN00B_Pulse_Height","GRG07WN00B_Pulse_Height",
      "GRG08BN00B_Pulse_Height","GRG08GN00B_Pulse_Height","GRG08RN00B_Pulse_Height","GRG08WN00B_Pulse_Height",
      "GRG09BN00B_Pulse_Height","GRG09GN00B_Pulse_Height","GRG09RN00B_Pulse_Height","GRG09WN00B_Pulse_Height",
      "GRG10BN00B_Pulse_Height","GRG10GN00B_Pulse_Height","GRG10RN00B_Pulse_Height","GRG10WN00B_Pulse_Height",
      "GRG11BN00B_Pulse_Height","GRG11GN00B_Pulse_Height","GRG11RN00B_Pulse_Height","GRG11WN00B_Pulse_Height",
      "GRG12BN00B_Pulse_Height","GRG12GN00B_Pulse_Height","GRG12RN00B_Pulse_Height","GRG12WN00B_Pulse_Height",
      "GRG13BN00B_Pulse_Height","GRG13GN00B_Pulse_Height","GRG13RN00B_Pulse_Height","GRG13WN00B_Pulse_Height",
      "GRG14BN00B_Pulse_Height","GRG14GN00B_Pulse_Height","GRG14RN00B_Pulse_Height","GRG14WN00B_Pulse_Height",
      "GRG15BN00B_Pulse_Height","GRG15GN00B_Pulse_Height","GRG15RN00B_Pulse_Height","GRG15WN00B_Pulse_Height",
      "GRG16BN00B_Pulse_Height","GRG16GN00B_Pulse_Height","GRG16RN00B_Pulse_Height","GRG16WN00B_Pulse_Height"
    ], 'spectrumList1dPeaks' : { 'All':[74.97,1173.23,1332.49,2614.52] }, 'histogramFileNames' : [],
    'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'LaBr3' : {'spectrumList1d' : [
      "LBL01XN00X_Pulse_Height","LBL02XN00X_Pulse_Height","LBL03XN00X_Pulse_Height","LBL04XN00X_Pulse_Height",
      "LBL05XN00X_Pulse_Height","LBL06XN00X_Pulse_Height","LBL07XN00X_Pulse_Height","LBL08XN00X_Pulse_Height"
    ], 'spectrumList1dPeaks' : { 'All':[74.97,1173.23,1332.49,2614.52] }, 'histogramFileNames' : [],
    'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'PACES' : {'spectrumList1d' : [
      "PAC01XN00A_Pulse_Height","PAC02XN00A_Pulse_Height","PAC03XN00A_Pulse_Height","PAC04XN00A_Pulse_Height","PAC05XN00A_Pulse_Height"
    ], 'spectrumList1dPeaks' : { 'All':[74.97, 481.69, 975.65, 1682.22] }, 'histogramFileNames' : [],
    'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'RCMP' : {'spectrumList1d' : [
      "RCS01XP00X_Pulse_Height","RCS01XP01X_Pulse_Height","RCS01XP02X_Pulse_Height","RCS01XP03X_Pulse_Height","RCS01XP04X_Pulse_Height","RCS01XP05X_Pulse_Height","RCS01XP06X_Pulse_Height","RCS01XP07X_Pulse_Height",
      "RCS01XP08X_Pulse_Height","RCS01XP09X_Pulse_Height","RCS01XP10X_Pulse_Height","RCS01XP11X_Pulse_Height","RCS01XP12X_Pulse_Height","RCS01XP13X_Pulse_Height","RCS01XP14X_Pulse_Height","RCS01XP15X_Pulse_Height",
      "RCS01XP16X_Pulse_Height","RCS01XP17X_Pulse_Height","RCS01XP18X_Pulse_Height","RCS01XP19X_Pulse_Height","RCS01XP20X_Pulse_Height","RCS01XP21X_Pulse_Height","RCS01XP22X_Pulse_Height","RCS01XP23X_Pulse_Height",
      "RCS01XP24X_Pulse_Height","RCS01XP25X_Pulse_Height","RCS01XP26X_Pulse_Height","RCS01XP27X_Pulse_Height","RCS01XP28X_Pulse_Height","RCS01XP29X_Pulse_Height","RCS01XP30X_Pulse_Height","RCS01XP31X_Pulse_Height",
      "RCS01XN00X_Pulse_Height","RCS01XN01X_Pulse_Height","RCS01XN02X_Pulse_Height","RCS01XN03X_Pulse_Height","RCS01XN04X_Pulse_Height","RCS01XN05X_Pulse_Height","RCS01XN06X_Pulse_Height","RCS01XN07X_Pulse_Height",
      "RCS01XN08X_Pulse_Height","RCS01XN09X_Pulse_Height","RCS01XN10X_Pulse_Height","RCS01XN11X_Pulse_Height","RCS01XN12X_Pulse_Height","RCS01XN13X_Pulse_Height","RCS01XN14X_Pulse_Height","RCS01XN15X_Pulse_Height",
      "RCS01XN16X_Pulse_Height","RCS01XN17X_Pulse_Height","RCS01XN18X_Pulse_Height","RCS01XN19X_Pulse_Height","RCS01XN20X_Pulse_Height","RCS01XN21X_Pulse_Height","RCS01XN22X_Pulse_Height","RCS01XN23X_Pulse_Height",
      "RCS01XN24X_Pulse_Height","RCS01XN25X_Pulse_Height","RCS01XN26X_Pulse_Height","RCS01XN27X_Pulse_Height","RCS01XN28X_Pulse_Height","RCS01XN29X_Pulse_Height","RCS01XN30X_Pulse_Height","RCS01XN31X_Pulse_Height",

      "RCS02XP00X_Pulse_Height","RCS02XP01X_Pulse_Height","RCS02XP02X_Pulse_Height","RCS02XP03X_Pulse_Height","RCS02XP04X_Pulse_Height","RCS02XP05X_Pulse_Height","RCS02XP06X_Pulse_Height","RCS02XP07X_Pulse_Height",
      "RCS02XP08X_Pulse_Height","RCS02XP09X_Pulse_Height","RCS02XP10X_Pulse_Height","RCS02XP11X_Pulse_Height","RCS02XP12X_Pulse_Height","RCS02XP13X_Pulse_Height","RCS02XP14X_Pulse_Height","RCS02XP15X_Pulse_Height",
      "RCS02XP16X_Pulse_Height","RCS02XP17X_Pulse_Height","RCS02XP18X_Pulse_Height","RCS02XP19X_Pulse_Height","RCS02XP20X_Pulse_Height","RCS02XP21X_Pulse_Height","RCS02XP22X_Pulse_Height","RCS02XP23X_Pulse_Height",
      "RCS02XP24X_Pulse_Height","RCS02XP25X_Pulse_Height","RCS02XP26X_Pulse_Height","RCS02XP27X_Pulse_Height","RCS02XP28X_Pulse_Height","RCS02XP29X_Pulse_Height","RCS02XP30X_Pulse_Height","RCS02XP31X_Pulse_Height",
      "RCS02XN00X_Pulse_Height","RCS02XN01X_Pulse_Height","RCS02XN02X_Pulse_Height","RCS02XN03X_Pulse_Height","RCS02XN04X_Pulse_Height","RCS02XN05X_Pulse_Height","RCS02XN06X_Pulse_Height","RCS02XN07X_Pulse_Height",
      "RCS02XN08X_Pulse_Height","RCS02XN09X_Pulse_Height","RCS02XN10X_Pulse_Height","RCS02XN11X_Pulse_Height","RCS02XN12X_Pulse_Height","RCS02XN13X_Pulse_Height","RCS02XN14X_Pulse_Height","RCS02XN15X_Pulse_Height",
      "RCS02XN16X_Pulse_Height","RCS02XN17X_Pulse_Height","RCS02XN18X_Pulse_Height","RCS02XN19X_Pulse_Height","RCS02XN20X_Pulse_Height","RCS02XN21X_Pulse_Height","RCS02XN22X_Pulse_Height","RCS02XN23X_Pulse_Height",
      "RCS02XN24X_Pulse_Height","RCS02XN25X_Pulse_Height","RCS02XN26X_Pulse_Height","RCS02XN27X_Pulse_Height","RCS02XN28X_Pulse_Height","RCS02XN29X_Pulse_Height","RCS02XN30X_Pulse_Height","RCS02XN31X_Pulse_Height",

      "RCS03XP00X_Pulse_Height","RCS03XP01X_Pulse_Height","RCS03XP02X_Pulse_Height","RCS03XP03X_Pulse_Height","RCS03XP04X_Pulse_Height","RCS03XP05X_Pulse_Height","RCS03XP06X_Pulse_Height","RCS03XP07X_Pulse_Height",
      "RCS03XP08X_Pulse_Height","RCS03XP09X_Pulse_Height","RCS03XP10X_Pulse_Height","RCS03XP11X_Pulse_Height","RCS03XP12X_Pulse_Height","RCS03XP13X_Pulse_Height","RCS03XP14X_Pulse_Height","RCS03XP15X_Pulse_Height",
      "RCS03XP16X_Pulse_Height","RCS03XP17X_Pulse_Height","RCS03XP18X_Pulse_Height","RCS03XP19X_Pulse_Height","RCS03XP20X_Pulse_Height","RCS03XP21X_Pulse_Height","RCS03XP22X_Pulse_Height","RCS03XP23X_Pulse_Height",
      "RCS03XP24X_Pulse_Height","RCS03XP25X_Pulse_Height","RCS03XP26X_Pulse_Height","RCS03XP27X_Pulse_Height","RCS03XP28X_Pulse_Height","RCS03XP29X_Pulse_Height","RCS03XP30X_Pulse_Height","RCS03XP31X_Pulse_Height",
      "RCS03XN00X_Pulse_Height","RCS03XN01X_Pulse_Height","RCS03XN02X_Pulse_Height","RCS03XN03X_Pulse_Height","RCS03XN04X_Pulse_Height","RCS03XN05X_Pulse_Height","RCS03XN06X_Pulse_Height","RCS03XN07X_Pulse_Height",
      "RCS03XN08X_Pulse_Height","RCS03XN09X_Pulse_Height","RCS03XN10X_Pulse_Height","RCS03XN11X_Pulse_Height","RCS03XN12X_Pulse_Height","RCS03XN13X_Pulse_Height","RCS03XN14X_Pulse_Height","RCS03XN15X_Pulse_Height",
      "RCS03XN16X_Pulse_Height","RCS03XN17X_Pulse_Height","RCS03XN18X_Pulse_Height","RCS03XN19X_Pulse_Height","RCS03XN20X_Pulse_Height","RCS03XN21X_Pulse_Height","RCS03XN22X_Pulse_Height","RCS03XN23X_Pulse_Height",
      "RCS03XN24X_Pulse_Height","RCS03XN25X_Pulse_Height","RCS03XN26X_Pulse_Height","RCS03XN27X_Pulse_Height","RCS03XN28X_Pulse_Height","RCS03XN29X_Pulse_Height","RCS03XN30X_Pulse_Height","RCS03XN31X_Pulse_Height",

      "RCS04XP00X_Pulse_Height","RCS04XP01X_Pulse_Height","RCS04XP02X_Pulse_Height","RCS04XP03X_Pulse_Height","RCS04XP04X_Pulse_Height","RCS04XP05X_Pulse_Height","RCS04XP06X_Pulse_Height","RCS04XP07X_Pulse_Height",
      "RCS04XP08X_Pulse_Height","RCS04XP09X_Pulse_Height","RCS04XP10X_Pulse_Height","RCS04XP11X_Pulse_Height","RCS04XP12X_Pulse_Height","RCS04XP13X_Pulse_Height","RCS04XP14X_Pulse_Height","RCS04XP15X_Pulse_Height",
      "RCS04XP16X_Pulse_Height","RCS04XP17X_Pulse_Height","RCS04XP18X_Pulse_Height","RCS04XP19X_Pulse_Height","RCS04XP20X_Pulse_Height","RCS04XP21X_Pulse_Height","RCS04XP22X_Pulse_Height","RCS04XP23X_Pulse_Height",
      "RCS04XP24X_Pulse_Height","RCS04XP25X_Pulse_Height","RCS04XP26X_Pulse_Height","RCS04XP27X_Pulse_Height","RCS04XP28X_Pulse_Height","RCS04XP29X_Pulse_Height","RCS04XP30X_Pulse_Height","RCS04XP31X_Pulse_Height",
      "RCS04XN00X_Pulse_Height","RCS04XN01X_Pulse_Height","RCS04XN02X_Pulse_Height","RCS04XN03X_Pulse_Height","RCS04XN04X_Pulse_Height","RCS04XN05X_Pulse_Height","RCS04XN06X_Pulse_Height","RCS04XN07X_Pulse_Height",
      "RCS04XN08X_Pulse_Height","RCS04XN09X_Pulse_Height","RCS04XN10X_Pulse_Height","RCS04XN11X_Pulse_Height","RCS04XN12X_Pulse_Height","RCS04XN13X_Pulse_Height","RCS04XN14X_Pulse_Height","RCS04XN15X_Pulse_Height",
      "RCS04XN16X_Pulse_Height","RCS04XN17X_Pulse_Height","RCS04XN18X_Pulse_Height","RCS04XN19X_Pulse_Height","RCS04XN20X_Pulse_Height","RCS04XN21X_Pulse_Height","RCS04XN22X_Pulse_Height","RCS04XN23X_Pulse_Height",
      "RCS04XN24X_Pulse_Height","RCS04XN25X_Pulse_Height","RCS04XN26X_Pulse_Height","RCS04XN27X_Pulse_Height","RCS04XN28X_Pulse_Height","RCS04XN29X_Pulse_Height","RCS04XN30X_Pulse_Height","RCS04XN31X_Pulse_Height",

      "RCS05XP00X_Pulse_Height","RCS05XP01X_Pulse_Height","RCS05XP02X_Pulse_Height","RCS05XP03X_Pulse_Height","RCS05XP04X_Pulse_Height","RCS05XP05X_Pulse_Height","RCS05XP06X_Pulse_Height","RCS05XP07X_Pulse_Height",
      "RCS05XP08X_Pulse_Height","RCS05XP09X_Pulse_Height","RCS05XP10X_Pulse_Height","RCS05XP11X_Pulse_Height","RCS05XP12X_Pulse_Height","RCS05XP13X_Pulse_Height","RCS05XP14X_Pulse_Height","RCS05XP15X_Pulse_Height",
      "RCS05XP16X_Pulse_Height","RCS05XP17X_Pulse_Height","RCS05XP18X_Pulse_Height","RCS05XP19X_Pulse_Height","RCS05XP20X_Pulse_Height","RCS05XP21X_Pulse_Height","RCS05XP22X_Pulse_Height","RCS05XP23X_Pulse_Height",
      "RCS05XP24X_Pulse_Height","RCS05XP25X_Pulse_Height","RCS05XP26X_Pulse_Height","RCS05XP27X_Pulse_Height","RCS05XP28X_Pulse_Height","RCS05XP29X_Pulse_Height","RCS05XP30X_Pulse_Height","RCS05XP31X_Pulse_Height",
      "RCS05XN00X_Pulse_Height","RCS05XN01X_Pulse_Height","RCS05XN02X_Pulse_Height","RCS05XN03X_Pulse_Height","RCS05XN04X_Pulse_Height","RCS05XN05X_Pulse_Height","RCS05XN06X_Pulse_Height","RCS05XN07X_Pulse_Height",
      "RCS05XN08X_Pulse_Height","RCS05XN09X_Pulse_Height","RCS05XN10X_Pulse_Height","RCS05XN11X_Pulse_Height","RCS05XN12X_Pulse_Height","RCS05XN13X_Pulse_Height","RCS05XN14X_Pulse_Height","RCS05XN15X_Pulse_Height",
      "RCS05XN16X_Pulse_Height","RCS05XN17X_Pulse_Height","RCS05XN18X_Pulse_Height","RCS05XN19X_Pulse_Height","RCS05XN20X_Pulse_Height","RCS05XN21X_Pulse_Height","RCS05XN22X_Pulse_Height","RCS05XN23X_Pulse_Height",
      "RCS05XN24X_Pulse_Height","RCS05XN25X_Pulse_Height","RCS05XN26X_Pulse_Height","RCS05XN27X_Pulse_Height","RCS05XN28X_Pulse_Height","RCS05XN29X_Pulse_Height","RCS05XN30X_Pulse_Height","RCS05XN31X_Pulse_Height",

      "RCS06XP00X_Pulse_Height","RCS06XP01X_Pulse_Height","RCS06XP02X_Pulse_Height","RCS06XP03X_Pulse_Height","RCS06XP04X_Pulse_Height","RCS06XP05X_Pulse_Height","RCS06XP06X_Pulse_Height","RCS06XP07X_Pulse_Height",
      "RCS06XP08X_Pulse_Height","RCS06XP09X_Pulse_Height","RCS06XP10X_Pulse_Height","RCS06XP11X_Pulse_Height","RCS06XP12X_Pulse_Height","RCS06XP13X_Pulse_Height","RCS06XP14X_Pulse_Height","RCS06XP15X_Pulse_Height",
      "RCS06XP16X_Pulse_Height","RCS06XP17X_Pulse_Height","RCS06XP18X_Pulse_Height","RCS06XP19X_Pulse_Height","RCS06XP20X_Pulse_Height","RCS06XP21X_Pulse_Height","RCS06XP22X_Pulse_Height","RCS06XP23X_Pulse_Height",
      "RCS06XP24X_Pulse_Height","RCS06XP25X_Pulse_Height","RCS06XP26X_Pulse_Height","RCS06XP27X_Pulse_Height","RCS06XP28X_Pulse_Height","RCS06XP29X_Pulse_Height","RCS06XP30X_Pulse_Height","RCS06XP31X_Pulse_Height",
      "RCS06XN00X_Pulse_Height","RCS06XN01X_Pulse_Height","RCS06XN02X_Pulse_Height","RCS06XN03X_Pulse_Height","RCS06XN04X_Pulse_Height","RCS06XN05X_Pulse_Height","RCS06XN06X_Pulse_Height","RCS06XN07X_Pulse_Height",
      "RCS06XN08X_Pulse_Height","RCS06XN09X_Pulse_Height","RCS06XN10X_Pulse_Height","RCS06XN11X_Pulse_Height","RCS06XN12X_Pulse_Height","RCS06XN13X_Pulse_Height","RCS06XN14X_Pulse_Height","RCS06XN15X_Pulse_Height",
      "RCS06XN16X_Pulse_Height","RCS06XN17X_Pulse_Height","RCS06XN18X_Pulse_Height","RCS06XN19X_Pulse_Height","RCS06XN20X_Pulse_Height","RCS06XN21X_Pulse_Height","RCS06XN22X_Pulse_Height","RCS06XN23X_Pulse_Height",
      "RCS06XN24X_Pulse_Height","RCS06XN25X_Pulse_Height","RCS06XN26X_Pulse_Height","RCS06XN27X_Pulse_Height","RCS06XN28X_Pulse_Height","RCS06XN29X_Pulse_Height","RCS06XN30X_Pulse_Height","RCS06XN31X_Pulse_Height"
    ], 'spectrumList1dPeaks' : { 'All':[5156.59, 5485.56, 5804.77] }, 'histogramFileNames' : [],
    'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'ARIES' : {'spectrumList1d' : [
      "ART40XS00X_Pulse_Height","ART41XS00X_Pulse_Height","ART42XS00X_Pulse_Height","ART43XS00X_Pulse_Height","ART44XS00X_Pulse_Height",
      "ART45XS00X_Pulse_Height","ART46XS00X_Pulse_Height","ART47XS00X_Pulse_Height","ART48XS00X_Pulse_Height","ART49XS00X_Pulse_Height",
      "ART50XS00X_Pulse_Height","ART51XS00X_Pulse_Height","ART52XS00X_Pulse_Height","ART53XS00X_Pulse_Height","ART54XS00X_Pulse_Height",
      "ART55XS00X_Pulse_Height","ART56XS00X_Pulse_Height","ART57XS00X_Pulse_Height","ART58XS00X_Pulse_Height","ART59XS00X_Pulse_Height",
      "ART60XS00X_Pulse_Height","ART61XS00X_Pulse_Height","ART62XS00X_Pulse_Height","ART63XS00X_Pulse_Height","ART64XS00X_Pulse_Height",
      "ART65XS00X_Pulse_Height","ART66XS00X_Pulse_Height","ART67XS00X_Pulse_Height","ART68XS00X_Pulse_Height","ART69XS00X_Pulse_Height",
      "ART70XS00X_Pulse_Height","ART71XS00X_Pulse_Height","ART72XS00X_Pulse_Height","ART73XS00X_Pulse_Height","ART74XS00X_Pulse_Height",
      "ART75XS00X_Pulse_Height","ART76XS00X_Pulse_Height"
    ], 'spectrumList1dPeaks' : { 'All':[100] }, 'histogramFileNames' : [],
    'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

        'DES_Wall' : {'spectrumList1d' : [
          "DSW01XN00X_Corrected_TOF",
          "DSW02XN00X_Corrected_TOF",
          "DSW03XN00X_Corrected_TOF",
          "DSW04XN00X_Corrected_TOF",
          "DSW05XN00X_Corrected_TOF",
          "DSW06XN00X_Corrected_TOF",
          "DSW07XN00X_Corrected_TOF",
          "DSW08XN00X_Corrected_TOF",
          "DSW09XN00X_Corrected_TOF",
          "DSW10XN00X_Corrected_TOF",

            "DSW11XN00X_Corrected_TOF",
            "DSW12XN00X_Corrected_TOF",
            "DSW13XN00X_Corrected_TOF",
            "DSW14XN00X_Corrected_TOF",
            "DSW15XN00X_Corrected_TOF",
            "DSW16XN00X_Corrected_TOF",
            "DSW17XN00X_Corrected_TOF",
            "DSW18XN00X_Corrected_TOF",
            "DSW19XN00X_Corrected_TOF",
            "DSW20XN00X_Corrected_TOF",

              "DSW21XN00X_Corrected_TOF",
              "DSW22XN00X_Corrected_TOF",
              "DSW23XN00X_Corrected_TOF",
              "DSW24XN00X_Corrected_TOF",
              "DSW25XN00X_Corrected_TOF",
              "DSW26XN00X_Corrected_TOF",
              "DSW27XN00X_Corrected_TOF",
              "DSW28XN00X_Corrected_TOF",
              "DSW29XN00X_Corrected_TOF",
              "DSW30XN00X_Corrected_TOF",

                "DSW31XN00X_Corrected_TOF",
                "DSW32XN00X_Corrected_TOF",
                "DSW33XN00X_Corrected_TOF",
                "DSW34XN00X_Corrected_TOF",
                "DSW35XN00X_Corrected_TOF",
                "DSW36XN00X_Corrected_TOF",
                "DSW37XN00X_Corrected_TOF",
                "DSW38XN00X_Corrected_TOF",
                "DSW39XN00X_Corrected_TOF",
                "DSW40XN00X_Corrected_TOF",

                  "DSW41XN00X_Corrected_TOF",
                  "DSW42XN00X_Corrected_TOF",
                  "DSW43XN00X_Corrected_TOF",
                  "DSW44XN00X_Corrected_TOF",
                  "DSW45XN00X_Corrected_TOF",
                  "DSW46XN00X_Corrected_TOF",
                  "DSW47XN00X_Corrected_TOF",
                  "DSW48XN00X_Corrected_TOF",
                  "DSW49XN00X_Corrected_TOF",
                  "DSW50XN00X_Corrected_TOF",

                    "DSW51XN00X_Corrected_TOF",
                    "DSW52XN00X_Corrected_TOF",
                    "DSW53XN00X_Corrected_TOF",
                    "DSW54XN00X_Corrected_TOF",
                    "DSW55XN00X_Corrected_TOF",
                    "DSW56XN00X_Corrected_TOF",
                    "DSW57XN00X_Corrected_TOF",
                    "DSW58XN00X_Corrected_TOF",
                    "DSW59XN00X_Corrected_TOF",
                    "DSW60XN00X_Corrected_TOF",
        ], 'spectrumList1dPeaks' : { 'All':[140] }, 'histogramFileNames' : [],
        'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}}

  };


  // Pagination for the results and plotting display
  // plotRegion = spectra
  // energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
  // energyCalibrator = Table of all (detector num, fit params, r2)
  // graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
  // graphSection = plot of all the residuals for specific peak
  // Variables for Pagination menu buttons
  dataStore.buttonNames = ["Spectra", "Individual detector results", "Results overview table", "Residuals Plots"];  // Names to appear on the buttons
  dataStore.buttonIDs = ["plotRegionMenuButton", "tableRegionMenuButton", "graphRegionMenuButton", "dataPlotRegionMenuButton"];    // IDs for the buttons
  dataStore.buttonPages = ["plotRegion", "detectorReportRegion", "resultsTableRegion","resultsPlotRegion"];                 // Pages (div IDs) to be associated with the buttons

  // Generate THESEdetectors object.
  dataStore.numberOfClovers = 16;
  dataStore.THESEdetectors = [];
  /*
  var crystals = ["B","G","R","W"];
  var letter = ["A"];  // var letter = ["A","B"];
  var num = 0;
  for(j=0; j<letter.length; j++){
  for(i=1; i<(dataStore.numberOfClovers+1); i++){
  for(k=0; k<4; k++){
  dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];
  num++;
}
}
}
*/

// App specific data structures
dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared],
//                                                                                       'pileupk1':[1 0 0 0 0 0 0], 'pileupk2':[1 0 0 0 0 0 0], 'pileupE1':[0 0 0 0 0 0 0], 'crosstalk:[0,1,0,0,0,0,0]'}

// dataplot definitions
dataStore._dataplot = [];                 // Place for all dataplot objects to be created as an array. This makes them indexable and iteratable
dataStore.dataplotData = [];                                       // place for dataplot data
dataStore.annotations = [0,0];
dataStore.plotStyle = [];
/*
dataStore.plotStyle[0] = {                     //dygraphs style object
labels: ["Energy (keV)", "Centroid Position (ps)"],
title: 'LaBr3 Time Walk Curve',
xlabel: 'Energy (keV)',
ylabel: 'Centroid Position (ps)',
axisLabelColor: '#FFFFFF',
colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
labelsDiv: 'detectorReportPlotLegend',
height: '320',
drawPoints: 'true',
connectSeparatedPoints: 'true',
pointSize: '5',
highlightCircleSize: '7',
strokeWidth: '0',
//customBars: true,
legend: 'always',
axes: { x: { valueRange: [0,2000] }, y : { valueRange: [0,400] } }
}
*/
dataStore.plotStyle[0] = {                     //dygraphs style object
  labels: ["Peak Energy (keV)", "Residual (keV)"],
  title: 'Energy residual in new calibration',
  xlabel: 'Energy (keV)',
  ylabel: 'Residual (keV)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'detectorReportPlotLegend',
  height: '320',
  drawPoints: 'true',
  connectSeparatedPoints: 'true',
  pointSize: '5',
  highlightCircleSize: '7',
  strokeWidth: '0',
  legend: 'always',
  axes: { x: { valueRange: [0,3500] }, y : { valueRange: [0,10] } }
}
dataStore.plotStyle[1] = {                     //dygraphs style object
  labels: ["channel", "Peak1 Width", "Peak2 Width", "Peak3 Width", "Peak4 Width"],
  title: 'Per-Crystal Resolution',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'newGainMatcherPlotLegend',
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
dataStore.plotStyle[2] = {                                              //dygraphs style object
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
dataStore.plotStyle[3] = {                                              //dygraphs style object
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
dataStore.plotStyle[4] = {                                              //dygraphs style object
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
dataStore.plotStyle[5] = {                                              //dygraphs style object
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
dataStore.plotInitData = [];
dataStore.plotInitData[0] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data for _dataplot[0]
//dataStore.plotInitData[1] = [[0,0], [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], [7,0]];      //initial dummy data for _dataplot[1]
dataStore.plotInitData[1] = [[0,0,0,0,0,0,0,0,0], [1,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,0,0,0,0,0,0,0,0], [5,0,0,0,0,0,0,0,0], [6,0,0,0,0,0,0,0,0], [7,0,0,0,0,0,0,0,0]];      //initial dummy data for _dataplot[1]

dataStore.plotInitData[2] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[3] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[4] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[5] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data

dataStore.YAxisMinValue = [[0,0],[0,0]];
dataStore.YAxisMaxValue = [[0,0],[0,0]];

// User input choices
dataStore.detectorChoice = [{"name": "HPGe"},{"name": "PACES"},{"name": "LaBr3"},{"name": "RCMP"},{"name": "ARIES"},{"name": "DES_Wall"}];       // Detector choice information to generate buttons

// Peak information for each source for gain matching
dataStore.peaksList = {
  // All peaks for fitting and use in determining the calibration
  "HPGe":{
    "56Co": [122.00,511.00,846.76, 1037.84, 1175.1, 1238.29, 1360.21, 1771.35, 2034.76, 2598.46, 3009.56, 3201.95, 3253.42,3451.15],
    "60Co": [ 74.97,788.74,1173.23,1332.49,1435.80,1460.83,2505.72,2614.52],
    "133Ba": [ 30.97,80,276.4,302.85,356.01,383.85, 788.74,1435.80,2614.52],
    "152Eu": [ 39.91, 121.8, 244.7, 344.3, 778.9, 867.4, 964.0, 1112.1, 1408.0,2614.52],
    "207Bi": [ 74.97,569.70, 788.74,1063.66,1408.0,1435.80,1770.23,2614.52],
    "26Na": [ 511, 1128.89, 1808.71, 1896.78, 2541.5,4834.61],
    "26NaS1140": [ 511, 1128.89, 1411.36, 1808.71, 1896.78, 2132.91, 2541.5, 4834.61],
    "Custom": [ ],
    // Only four peaks used for the results Table and plots
    "56CoTable": [122.00,846.76,1771.35,3253.42],
    "60CoTable": [ 74.97,1173.23,1332.49,2505.72],
    "133BaTable": [ 80,276.4,302.85,356.01,1435.80],
    "152EuTable": [ 121.8,344.3, 778.9, 1408.0],
    "207BiTable": [ 74.97,569.70,1063.66,1770.23],
    "26NaTable": [ 1128.89, 1808.71, 2541.5,4834.3 ],
    "26NaS1140Table": [ 1128.89, 1808.71, 2541.5, 4834.61 ],
    "CustomTable": [ ]
  },
  "PACES": {
    "207Bi": [74.97, 481.69, 553.8, 975.65, 1047.8, 1682.22],
    "Custom": [ ],
    // Only four peaks used for the results Table and plots
    "207BiTable": [74.97, 481.69, 975.65, 1682.22],
    "CustomTable": [ ]
  },
  "LaBr3": {
    "60Co": [ 1173.23,1332.49 ],  // "60Co": [ 225,1173.23,1332.49,2505.72],
    //  "152Eu": [ 39.91, 121.8, 244.7, 344.3, 411.1, 778.9, 867.4, 964.0, 1112.1, 1408.0,2614.52],
    "Custom": [ ],
    // Only four peaks used for the results Table and plots
    "60CoTable": [ 1173.23,1332.49, null, null],
    //  "152EuTable": [ 121.8,344.3, 778.9, 1408.0],
    "CustomTable": [ ]
  },
  "RCMP": {
    "Triple-Alpha": [5156.59,5485.56,5804.77],
    "Custom": [ ],
    // Only four peaks used for the results Table and plots
    "Triple-AlphaTable": [5156.59,5485.56,5804.77],
    "CustomTable": [ ]
  },
  "ARIES": {
    "26Na": [30],
    // Only four peaks used for the results Table and plots
    "26NaTable": [30]
  },
  "DES_Wall": {
    "11Li": [140],
    // Only four peaks used for the results Table and plots
    "11LiTable": [140]
  }
};

// Detector reference spectra
// Reference spectra are length=2000, except for RCMP (6000)
dataStore.referenceSpectrum = {};
dataStore.referenceSpectrum = {
  "LaBr3": {
    "60Co": [0,0,0,1,0,0,0,1,0,0,1,2,2,9,14,28,58,82,159,242,323,421,492,722,808,991,1077,1261,1382,1530,1582,1644,1721,1820,1717,1779,1729,1799,1779,1771,1783,1734,1659,1746,1693,1768,1835,1822,1919,1940,1945,1946,2036,2126,2133,2096,2143,2230,2175,2140,2180,2203,2141,2144,2215,2245,2310,2345,2416,2413,2436,2473,2571,2574,2468,2446,2379,2397,2391,2310,2317,2248,2296,2237,2102,2227,2093,2164,2163,2089,2068,2022,1977,1867,1979,1933,1831,1902,1767,1878,1835,1946,1830,1830,1879,1853,1866,1753,1798,1971,1927,1884,1870,1897,1846,1863,1907,1907,1926,1894,1864,1872,1931,1983,1938,1920,2069,1993,1975,1999,1992,2085,1981,1947,1962,2018,2049,2015,1976,2065,1985,2124,1986,1992,2122,2033,1984,2028,2035,2001,2019,1990,2048,1970,2130,2029,2169,2142,2182,2070,2030,2008,2011,2110,2045,2062,2055,2018,2115,2087,2096,2060,2090,2136,2089,2111,2175,2058,2207,2188,2096,2150,2139,2219,2183,2167,2128,2165,2159,2140,2234,2292,2169,2260,2269,2288,2263,2266,2244,2336,2425,2416,2403,2522,2471,2542,2541,2623,2651,2615,2748,2752,2860,2858,2898,2852,2941,2903,2900,2988,2959,2971,2986,3008,3037,2995,2958,2913,2955,2922,3021,2948,2996,2911,2949,2940,2867,2859,2852,2794,2774,2872,2767,2802,2775,2634,2636,2704,2715,2749,2624,2654,2553,2569,2495,2573,2558,2612,2581,2535,2489,2496,2476,2384,2504,2402,2373,2431,2311,2406,2444,2350,2319,2270,2374,2290,2375,2282,2198,2208,2247,2322,2204,2196,2242,2191,2120,2104,2207,2334,2162,2106,2143,2258,2127,2203,2158,2073,2120,2080,2133,2103,2031,2002,2008,2074,2034,2046,1976,2014,2032,2015,2071,2015,2050,2088,1989,1983,1971,1959,1943,1936,2009,1898,1907,1937,1897,1903,1885,1952,1839,1950,1946,1961,1918,1860,1838,1894,1872,1883,1825,1816,1950,1833,1820,1806,1834,1826,1800,1886,1861,1803,1832,1834,1763,1783,1821,1726,1743,1836,1785,1835,1783,1697,1747,1843,1727,1757,1722,1792,1760,1739,1770,1883,1658,1720,1699,1766,1756,1780,1700,1831,1697,1706,1741,1733,1764,1669,1679,1729,1755,1723,1626,1683,1770,1745,1694,1685,1674,1680,1688,1672,1693,1676,1606,1707,1574,1678,1673,1562,1666,1660,1639,1621,1611,1632,1633,1599,1632,1668,1602,1616,1599,1663,1618,1618,1622,1629,1606,1515,1609,1673,1611,1587,1566,1590,1623,1613,1595,1652,1635,1565,1610,1584,1526,1582,1583,1524,1564,1534,1489,1488,1599,1513,1570,1570,1547,1599,1520,1589,1513,1565,1514,1533,1636,1614,1531,1549,1487,1519,1572,1532,1529,1482,1483,1503,1559,1515,1505,1650,1537,1438,1537,1504,1483,1514,1550,1582,1549,1441,1470,1484,1499,1541,1529,1489,1496,1647,1559,1542,1598,1567,1566,1593,1581,1628,1563,1544,1545,1523,1550,1556,1588,1467,1558,1518,1554,1584,1490,1592,1571,1570,1551,1563,1461,1501,1516,1534,1513,1512,1535,1490,1517,1474,1518,1468,1438,1419,1436,1411,1457,1447,1465,1441,1514,1504,1459,1398,1444,1465,1412,1415,1475,1494,1445,1437,1498,1448,1385,1402,1453,1364,1422,1437,1417,1358,1337,1387,1441,1404,1374,1505,1423,1494,1345,1462,1441,1459,1400,1452,1385,1398,1389,1404,1406,1427,1398,1421,1426,1341,1369,1418,1452,1402,1394,1431,1407,1382,1335,1463,1329,1391,1387,1414,1389,1351,1405,1420,1384,1400,1413,1375,1398,1334,1301,1373,1323,1385,1379,1340,1418,1424,1356,1386,1349,1346,1364,1284,1417,1346,1360,1306,1406,1372,1419,1421,1361,1386,1402,1345,1318,1324,1428,1375,1360,1397,1399,1364,1379,1307,1382,1411,1336,1333,1409,1366,1420,1444,1380,1400,1366,1457,1371,1385,1306,1341,1400,1425,1376,1356,1350,1401,1378,1394,1293,1282,1297,1320,1345,1311,1417,1376,1444,1461,1365,1370,1368,1350,1364,1358,1374,1386,1341,1384,1418,1388,1377,1387,1350,1340,1335,1312,1360,1364,1409,1391,1341,1443,1369,1352,1355,1452,1334,1396,1333,1361,1320,1375,1347,1327,1388,1363,1376,1408,1321,1338,1329,1366,1343,1345,1370,1319,1449,1337,1458,1390,1368,1348,1396,1371,1312,1444,1415,1317,1351,1379,1376,1389,1414,1344,1391,1363,1373,1353,1355,1376,1419,1394,1374,1396,1369,1387,1351,1317,1352,1410,1310,1392,1369,1420,1331,1460,1383,1388,1432,1367,1406,1413,1410,1391,1431,1341,1379,1441,1457,1389,1394,1416,1395,1329,1422,1360,1440,1439,1396,1412,1427,1429,1312,1444,1359,1354,1421,1480,1480,1375,1470,1403,1477,1371,1462,1428,1409,1431,1391,1479,1488,1524,1422,1517,1488,1466,1502,1415,1540,1521,1504,1510,1456,1496,1420,1501,1484,1497,1481,1471,1466,1482,1548,1519,1574,1509,1468,1495,1538,1491,1463,1525,1438,1497,1536,1529,1479,1535,1502,1531,1585,1556,1524,1503,1536,1517,1545,1592,1547,1487,1468,1549,1564,1498,1473,1564,1599,1609,1541,1639,1496,1520,1604,1632,1531,1591,1592,1559,1587,1618,1567,1590,1609,1572,1646,1542,1611,1722,1627,1650,1561,1630,1542,1709,1656,1615,1636,1701,1670,1679,1691,1622,1673,1660,1749,1680,1688,1771,1730,1678,1686,1641,1635,1714,1662,1694,1720,1706,1729,1670,1727,1724,1678,1758,1714,1714,1717,1783,1685,1638,1701,1626,1720,1721,1685,1724,1638,1788,1660,1717,1614,1667,1693,1596,1576,1587,1614,1690,1586,1565,1495,1531,1539,1545,1439,1468,1421,1446,1475,1452,1403,1382,1384,1372,1340,1321,1271,1335,1264,1308,1225,1232,1266,1287,1237,1288,1192,1168,1253,1206,1141,1171,1127,1173,1141,1141,1120,1116,1163,1110,1068,1164,1109,1098,1089,1105,1108,1065,1084,1053,1106,1127,1059,1057,1047,1108,1036,1058,1033,1071,1060,1097,1104,1067,1047,1022,1115,1021,1028,1051,1051,1024,1009,1056,1033,1040,1055,1043,1028,990,1050,980,998,1052,1042,1000,1004,1066,989,1060,1052,1017,1026,1041,1060,1022,1000,1106,1078,1005,1043,1025,1044,1005,1063,1065,1032,1021,1093,1014,1019,1040,1080,1032,1016,1042,1122,1029,994,1003,1087,1058,1101,1056,1078,1017,1045,1027,1105,1042,1056,1052,1028,1054,994,1029,1039,1017,1070,1016,1048,1010,1023,947,1010,999,1044,983,1023,1000,990,990,966,963,926,931,915,910,930,860,932,895,921,886,869,896,943,971,909,935,956,998,1044,1018,1063,1116,1185,1276,1238,1270,1422,1515,1613,1726,1861,1911,2061,2217,2377,2510,2653,2751,2951,3167,3301,3512,3719,3871,4095,4236,4427,4659,4787,5097,5202,5376,5472,5519,5654,5814,5838,5884,5969,5991,5903,5891,5932,5890,5730,5591,5515,5299,5116,4955,4907,4755,4538,4290,4213,4029,3725,3629,3500,3183,3097,2921,2755,2544,2407,2262,2114,1992,1837,1716,1620,1537,1473,1320,1199,1107,1090,994,906,880,772,731,720,634,628,565,559,462,455,412,422,432,402,347,330,324,285,277,240,255,246,209,217,217,235,190,175,183,173,179,156,160,168,155,135,138,142,153,150,140,147,156,139,132,157,148,136,160,150,142,154,151,172,167,154,174,184,173,238,204,192,259,228,253,248,276,273,321,335,338,413,422,415,449,508,550,597,652,683,689,796,902,937,966,1141,1212,1369,1357,1493,1631,1752,1934,1997,2128,2226,2497,2670,2761,2844,3020,3192,3436,3468,3556,3786,3873,4050,4331,4316,4460,4337,4550,4530,4655,4705,4685,4799,4798,4570,4873,4659,4673,4454,4534,4434,4305,4149,4101,3956,3834,3762,3511,3483,3196,3135,2995,2778,2519,2573,2388,2249,2092,2031,1956,1837,1698,1624,1419,1342,1315,1188,1059,1077,1012,912,799,758,702,692,635,629,556,493,485,404,384,410,332,347,293,287,260,250,238,225,194,186,202,163,158,132,132,117,117,93,103,95,84,82,86,72,68,67,50,56,53,44,57,45,37,52,35,39,34,46,37,29,37,34,32,45,31,51,26,22,27,44,38,40,33,37,24,26,40,25,24,30,30,27,32,27,42,28,38,45,27,33,30,39,35,36,36,24,31,27,37,33,44,35,37,36,37,38,27,40,37,34,42,35,38,30,31,25,37,30,34,29,25,33,28,18,29,18,23,27,21,21,25,25,17,35,25,17,27,18,22,18,17,13,27,23,14,21,18,16,11,18,20,21,16,10,31,19,24,17,10,15,13,8,14,17,13,5,14,19,11,14,7,10,20,15,14,14,16,15,12,19,12,18,11,16,12,20,21,14,18,12,17,14,19,13,17,12,17,14,12,14,15,15,9,8,14,10,15,12,5,16,12,10,21,8,11,21,11,10,12,8,19,23,12,12,15,15,12,17,13,8,9,17,15,11,10,12,12,8,11,13,11,11,12,11,12,4,11,17,11,6,6,13,12,19,16,12,16,16,12,9,17,15,14,12,12,5,9,9,18,8,7,14,11,12,8,10,10,12,9,11,13,6,12,8,8,10,8,10,7,10,9,7,8,14,11,19,7,14,12,11,9,6,14,14,9,10,14,8,10,10,19,10,9,11,13,10,16,5,8,8,12,7,11,12,6,8,11,11,10,14,8,15,12,9,10,10,4,13,6,10,14,12,10,11,10,16,11,17,4,9,15,13,11,10,9,10,14,7,11,9,7,7,15,8,12,8,12,10,6,20,8,5,14,13,12,8,13,8,9,6,4,9,11,6,14,13,11,8,8,14,11,8,9,7,11,7,12,7,7,6,8,11,8,7,14,7,7,18,10,9,5,10,7,12,12,8,8,8,13,14,10,8,15,11,4,4,10,12,11,8,5,8,9,15,5,6,10,8,7,13,3,7,5,16,11,7,8,12,9,6,11,9,6,9,11,9,7,7,7,16,10,7,8,10,4,13,6,10,9,17,12,6,14,12,12,8,7,14,7,9,12,9,13,6,3,9,9,9,9,7,5,6,13,14,16,16,10,15,12,7,12,12,11,10,15,10,13,9,10,12,4,9,6,16,9,7,2,6,15,13,13,7,10,6,9,10,12,4,9,9,14,18,9,9,8,7,14,7,15,11,16,14,13,11,9,6,9,9,14,6,13,9,6,8,13,9,11,6,10,8,6,14,14,8,11,10,10,9,17,8,6,11,10,16,6,8,13,11,10,8,8,9,7,8,10,10,14,10,11,8,10,12,12,10,9,5,6,8,14,11,11,10,9,13,12,8,5,15,14,16,11,9,10,7,12,10,18,11,15,11,8,16,16,10,18,11,14,14,10,8,14,9,11,11,8,8,12,6,10,8,13,12,10]},
    "HPGe": {
      "60Co": [0,2,4,0,2,1,0,5,1,1,0,1,1,1,3,5,0,9,15,26,47,60,92,112,151,179,212,240,221,277,277,305,304,293,286,275,271,316,290,313,283,278,282,266,318,312,277,305,274,284,254,272,302,320,295,278,303,335,369,399,342,287,316,302,316,307,386,326,342,293,355,366,357,356,407,451,479,464,360,348,325,319,332,321,358,380,435,413,395,355,350,403,396,350,365,346,376,349,366,387,354,384,389,399,413,405,400,365,390,391,378,393,425,377,450,410,445,403,441,456,411,397,475,447,446,443,428,434,470,392,453,471,478,447,450,437,402,427,444,469,438,477,482,506,449,506,475,507,475,442,494,499,468,509,497,506,484,472,469,473,539,508,495,480,462,454,465,482,484,500,471,434,453,507,472,486,469,482,470,463,456,453,498,460,487,513,458,463,425,433,457,436,454,494,464,444,456,422,489,449,447,444,443,463,469,434,429,462,471,467,513,481,466,520,534,504,546,574,540,524,525,518,509,511,561,539,519,534,584,509,528,491,536,527,529,481,538,501,537,517,545,491,498,506,449,497,473,453,458,469,496,478,464,468,459,456,433,455,487,441,440,452,469,464,474,464,398,457,439,395,439,410,421,437,429,398,414,389,452,436,412,430,391,414,341,368,392,374,385,380,382,364,356,349,357,368,320,333,340,341,346,330,343,342,359,317,319,360,340,362,348,348,333,335,277,341,304,355,317,335,306,317,342,339,324,289,339,286,300,291,302,306,306,284,296,323,286,284,300,309,305,286,297,301,254,279,291,284,271,293,276,318,287,238,244,263,280,249,248,256,242,256,233,254,274,242,239,239,238,244,232,231,246,254,249,234,256,230,240,231,240,256,246,215,215,249,254,278,242,238,247,224,229,231,236,239,238,225,208,205,209,232,231,210,231,215,222,205,219,216,216,214,214,236,208,219,226,200,189,195,219,230,194,198,208,216,218,223,215,211,214,218,219,223,229,208,191,217,208,190,181,211,206,214,190,195,181,199,203,205,214,214,211,209,175,197,201,207,179,198,174,178,208,190,200,187,203,186,205,196,189,195,193,192,192,205,173,187,181,177,187,193,184,188,187,179,188,199,192,202,173,173,168,177,184,204,163,182,174,204,185,210,202,147,199,194,196,193,230,293,263,242,209,217,193,166,171,203,167,166,180,185,155,149,168,168,169,175,174,172,141,180,167,158,152,155,170,170,147,153,189,182,156,201,147,174,153,159,185,160,169,156,169,166,177,153,166,169,170,180,172,165,141,171,176,193,164,193,177,170,175,167,180,166,171,163,160,177,174,182,174,187,168,184,154,186,154,165,160,155,170,162,186,199,163,179,165,158,153,183,176,190,144,177,174,186,158,183,199,186,152,161,137,167,176,174,177,174,186,169,180,161,163,175,144,164,179,153,159,168,154,174,189,171,161,183,179,179,157,185,156,170,180,180,181,175,152,152,186,170,150,162,192,151,149,169,167,144,163,173,173,148,138,168,169,174,181,164,161,173,146,155,178,179,190,169,153,162,178,151,164,141,181,155,166,167,161,165,167,158,156,166,161,171,171,152,196,162,193,183,148,182,157,170,153,176,180,148,184,147,154,176,177,162,171,183,192,196,175,147,128,176,176,168,156,163,153,182,168,172,184,179,161,172,177,178,163,155,189,163,160,171,188,168,152,163,187,181,173,170,160,166,175,171,181,194,189,178,170,181,185,189,160,199,169,179,175,163,173,158,191,157,204,164,149,170,183,194,181,196,176,194,185,186,184,212,193,354,491,440,231,187,191,176,172,196,195,180,172,156,158,169,162,158,193,180,186,200,181,212,191,207,172,196,188,194,191,194,184,197,216,231,219,205,219,206,185,181,175,164,192,216,215,211,178,207,219,184,206,201,184,209,226,233,221,207,198,229,166,194,190,207,193,208,232,191,191,234,183,204,193,214,208,206,202,210,194,216,204,220,214,203,210,221,206,220,206,225,213,204,231,219,219,191,229,236,213,249,219,242,220,244,213,196,212,247,237,269,248,238,228,236,244,234,236,212,240,244,240,247,266,224,239,242,258,250,279,250,217,257,250,273,243,257,258,272,274,262,257,308,257,246,271,289,285,257,261,273,287,286,245,271,268,294,270,298,251,235,267,279,266,259,283,259,252,263,266,273,262,255,273,265,263,254,236,229,222,240,223,185,210,227,228,208,213,192,220,196,217,219,219,197,182,212,214,211,204,218,236,200,207,177,235,179,202,210,171,195,188,194,204,193,214,209,194,184,206,175,207,181,225,221,214,211,191,210,197,214,189,159,187,179,184,206,203,186,204,180,176,179,185,169,197,187,207,195,179,166,192,181,173,204,202,183,204,166,193,201,178,179,173,169,180,176,190,166,181,193,186,150,173,186,177,168,187,180,188,166,162,183,167,177,184,165,170,197,184,162,190,164,189,160,164,186,168,179,178,157,173,206,192,174,165,207,185,179,183,178,190,186,199,190,179,213,196,176,172,183,161,180,179,192,183,182,153,175,164,140,144,141,138,143,137,149,121,112,115,129,87,111,102,126,119,115,150,124,105,129,136,103,93,105,119,77,82,118,109,114,95,108,100,119,118,112,137,116,107,88,110,109,96,122,115,100,89,93,95,99,125,161,605,2687,7356,8487,4109,772,134,85,89,98,91,82,74,67,85,78,66,74,73,72,70,80,69,59,56,60,67,57,59,54,58,64,54,55,47,52,56,55,59,58,48,41,56,58,39,48,42,51,45,41,39,39,49,39,40,47,28,35,32,31,27,32,21,34,36,30,37,26,25,30,22,25,24,28,29,35,35,29,33,26,22,26,24,21,25,17,26,19,31,26,28,26,29,16,36,21,22,21,23,24,18,21,21,40,29,22,33,16,17,20,13,26,18,22,14,13,15,21,26,27,20,18,20,23,24,21,28,22,20,14,28,33,17,27,18,15,19,21,21,24,26,17,17,25,19,17,21,18,22,17,20,20,18,20,24,20,26,29,69,301,1529,5167,7849,5263,1423,164,23,8,12,4,7,4,7,8,9,5,5,6,11,7,4,12,9,10,4,9,2,4,9,10,8,10,1,7,4,5,5,4,5,4,3,6,7,5,5,5,8,9,5,7,0,6,5,9,5,8,9,8,4,4,3,6,4,8,2,8,2,7,6,4,6,5,10,6,7,5,10,5,9,5,6,4,6,9,5,5,5,2,1,8,5,4,2,6,4,7,3,7,4,4,5,9,11,67,222,413,375,122,19,1,2,2,4,2,3,0,3,5,2,4,2,6,6,6,2,7,3,4,7,57,85,60,23,6,3,5,3,10,0,4,2,3,6,5,2,6,4,0,2,1,4,2,3,2,0,3,3,3,1,0,1,4,3,4,2,5,2,4,1,2,4,3,2,6,5,3,3,5,3,4,3,10,2,2,3,5,3,3,2,3,1,2,1,4,2,3,1,3,0,3,4,1,3,2,1,5,4,6,3,1,4,0,6,4,5,1,1,0,4,3,1,2,1,2,1,3,3,3,1,1,1,4,2,2,1,6,4,2,3,1,2,4,9,7,2,1,0,4,2,1,5,1,3,4,0,0,1,5,2,2,5,5,4,2,1,4,1,2,3,1,0,2,4,2,5,2,2,4,4,2,2,0,2,5,3,0,2,3,2,6,5,2,1,2,4,3,4,2,3,4,5,3,3,1,2,1,2,2,0,2,1,5,1,4,0,1,2,1,3,4,1,2,5,3,3,3,1,1,1,2,2,2,2,3,3,1,7,5,4,5,3,0,2,4,2,2,0,1,2,1,5,1,3,5,6,2,2,3,2,3,1,0,2,4,1,3,1,4,4,1,3,3,1,2,4,2,1,2,3,3,1,2,4,2,2,2,2,2,0,2,0,0,4,0,0,1,1,3,4,7,4,5,5,3,1,1,0,4,4,2,4,1,3,4,4,3,0,1,1,4,0,3,1,2,0,2,2,1,3,2,0,1,4,6,7,11,2,2,3,2,2,0,0,0,0,2,0,4,0,4,1,1,0,2,1,2,0,1,0,1,1,2,2,1,4,2,1,2,1,1,0,1,1,2,1,0,3,2,1,1,2,1,0,2,1,3,1,1,2,1,1,0,3,0,0,1,2,1,3,4,0,3,0,1,1,4,5,3,3,2,4,0,1,2,1,3,2,3,1,1,1,1,2,1,2,0,1,1,1,3,2,2,1,1,0,4,1,7,2,0,0,3,1,4,1,0,2,3,0,1,0,2,1,0,3,3,1,2,1,2,2,1,2,2,5,5,2,2,1,0,2,2,0,4,1,1,1,2,4,2,0,1,5,1,0,4,2,2,1,0,3,3,1,2,2,0,0,2,1,3,2,0,2,2,1,0,0,1,2,1,2,0,1,1,0,2,1,2,5,0,0,2,0,0,1,2,2,0,2,1,1,1,5,0,1,2,2,1,1,1,0,2,1,2,2,3,0,2,1,2,0,2,1,0,3,0,2,2,1,0,2,1,2,1,0,1,0,2,1,4],
      "56Co": [0,2,1,3,0,0,1,0,3,2,0,1,3,4,6,23,25,50,78,137,169,254,401,524,659,853,946,1046,1264,1242,1402,1496,1466,1531,1521,1469,1511,1543,1524,1492,1490,1459,1499,1552,1435,1469,1547,1482,1473,1510,1467,1511,1495,1470,1494,1548,1649,1924,1968,1860,1559,1426,1478,1419,1590,1603,1615,1626,1551,1658,1588,1608,1696,1828,2107,2086,2402,2320,1765,1633,1679,1738,1747,1760,1820,1879,2025,2140,2048,1970,1976,1920,1907,1834,1872,1810,1886,1897,1852,1857,1856,1833,1907,1909,1947,1918,1959,1921,1960,2006,1982,2061,2211,2039,2134,2107,2147,2149,2275,2257,3688,7228,5830,2744,2270,2220,2206,2111,2182,2186,2214,2261,2221,2282,2270,2725,2847,2496,2190,2318,2324,2316,2296,2253,2306,2229,2450,2302,2365,2342,2307,2317,2407,2372,2344,2461,2325,2403,2333,2370,2413,2348,2404,2346,2355,2378,2462,2452,2463,2469,2514,2502,2565,2477,2612,2661,2470,2544,2557,2467,2597,2604,2544,2604,2537,2497,2531,2562,2530,2611,2555,2600,2629,2532,2652,2657,2637,2678,2678,2775,2730,2638,2717,2754,2743,2653,2645,2524,2691,2589,2643,2683,2713,2683,2717,2624,2564,2604,2621,2679,2673,2540,2573,2566,2559,2649,2530,2506,2557,2689,2522,2501,2532,2568,2512,2538,2568,2528,2465,2481,2477,2425,2493,2481,2498,2465,2467,2380,2355,2438,2328,2360,2434,2384,2378,2309,2221,2233,2290,2246,2259,2229,2274,2193,2174,2169,2114,2214,2209,2109,2035,2178,2066,2112,2132,2151,2128,2095,2120,2071,2096,2075,2109,2022,2084,1974,1967,2009,1892,2029,1956,1998,1917,1919,1883,1952,1993,2005,1915,1859,1838,1947,1774,1883,1885,1820,1791,1866,1882,1934,1763,1755,1864,1811,1788,1855,1801,1764,1817,1794,1765,1802,1875,1812,1885,1791,1688,1803,1727,1662,1740,1722,1764,1760,1715,1763,1696,1773,1589,1614,1601,1556,1449,1545,1480,1424,1370,1458,1425,1442,1456,1390,1438,1412,1426,1381,1329,1422,1400,1342,1324,1350,1381,1294,1231,1283,1257,1271,1211,1256,1255,1251,1307,1241,1191,1235,1210,1218,1115,1170,1136,1177,1177,1212,1200,1218,1134,1195,1159,1180,1120,1113,1136,1125,1147,1130,1061,1042,1064,1032,1103,1055,1139,1109,1031,1130,1030,1044,986,1086,1037,1121,1061,1102,1007,1026,1013,988,991,1064,1067,1022,1037,1089,1068,1012,1041,971,996,949,1018,1045,1045,1046,1020,1015,975,1023,993,1021,986,1047,938,937,936,992,997,929,928,992,979,1042,898,988,928,977,971,971,935,914,918,920,928,956,937,913,897,950,851,948,876,937,945,934,880,942,1006,934,939,946,925,930,939,926,904,966,958,949,958,955,936,975,897,890,901,905,909,944,909,912,950,881,979,1029,1031,1134,1475,2505,5338,11629,17579,16593,9317,3820,1677,1084,883,888,916,905,897,865,875,863,873,867,871,893,852,853,894,863,856,899,801,831,864,847,880,826,899,885,865,861,897,887,901,872,794,869,911,876,887,792,879,888,923,908,875,876,805,917,858,927,893,880,828,885,871,926,902,917,906,899,933,848,1001,919,909,911,934,965,926,966,934,938,966,969,1004,1010,938,943,953,969,931,933,957,982,1008,1021,1027,1044,1051,1067,979,978,975,1009,1007,1047,955,999,1081,1010,993,1036,1032,1009,1068,982,1006,984,997,1005,1049,1011,1065,1033,1009,1058,1035,1025,1080,1094,1004,1079,1077,1021,1039,1079,1026,1105,1050,1012,1002,1050,944,1047,929,900,881,877,864,852,815,775,748,757,786,766,792,736,737,763,730,742,730,719,710,779,710,710,693,722,759,690,688,683,666,690,668,689,674,710,657,684,652,632,648,677,637,645,639,673,612,624,632,629,679,642,598,617,596,628,563,623,571,551,560,581,563,560,579,547,546,533,544,532,544,531,532,530,527,545,566,499,469,535,558,552,531,534,513,562,565,506,529,509,472,454,471,444,434,471,464,481,506,479,506,497,483,472,458,422,468,468,461,444,472,473,411,455,457,428,469,462,480,440,441,444,415,439,454,446,445,461,482,462,431,449,485,373,466,406,449,442,540,744,844,691,463,464,475,440,420,435,429,432,451,407,448,438,472,405,418,416,466,424,456,547,651,615,451,446,438,410,444,408,450,478,470,416,451,454,494,406,433,470,430,437,446,481,477,532,564,525,420,445,473,495,477,591,725,1331,6371,24420,38618,21938,4694,754,399,415,394,368,387,374,375,337,369,387,369,380,352,374,378,384,348,360,367,390,346,345,342,348,393,379,330,381,359,418,335,345,329,339,346,353,330,361,352,378,396,356,344,359,356,377,407,426,394,344,362,348,374,364,344,363,364,366,378,380,374,365,370,377,358,356,352,365,358,392,375,378,385,395,405,409,393,385,391,369,369,361,402,382,404,392,362,397,392,382,380,378,379,379,393,414,412,417,419,393,358,384,353,414,406,403,402,420,396,439,429,398,400,447,460,413,432,435,401,437,414,440,463,394,439,584,857,836,603,478,441,409,437,415,426,431,447,454,417,435,438,479,486,472,447,469,530,485,438,450,409,458,458,476,446,432,477,440,441,457,502,513,470,489,453,483,473,452,454,455,451,425,402,403,415,420,406,344,353,344,338,374,350,363,424,853,2645,4505,3698,1315,428,321,323,309,309,337,312,286,327,287,294,298,297,270,297,270,291,265,271,277,273,237,306,263,289,284,287,257,276,270,278,274,252,266,253,237,233,250,267,282,262,244,243,258,252,243,240,262,239,220,233,244,252,247,231,240,227,223,241,235,230,218,221,215,210,207,208,210,210,208,209,209,216,188,175,193,175,201,175,210,203,164,172,170,171,166,157,167,177,171,193,169,138,192,172,168,171,148,164,198,174,195,162,153,159,143,135,146,156,140,136,139,157,130,138,164,163,130,155,148,189,139,130,138,138,124,126,140,140,130,146,151,192,386,669,679,353,156,149,122,132,125,136,131,112,128,147,151,113,152,134,140,130,138,136,120,142,118,136,129,121,110,128,127,108,136,128,121,139,142,118,123,113,128,109,137,113,136,137,127,138,117,128,133,108,118,136,140,139,139,135,125,157,155,227,670,3507,11579,18271,12012,3307,443,114,99,88,106,106,101,106,96,92,106,114,104,83,85,85,89,136,177,165,141,93,95,80,79,103,106,108,100,98,95,125,98,83,93,85,104,109,109,84,102,105,97,98,94,90,71,104,83,69,83,86,92,89,100,87,88,85,72,110,94,113,92,104,95,105,94,95,96,86,89,94,95,102,93,97,104,95,82,90,94,82,95,91,68,88,85,97,88,85,81,79,99,106,121,114,90,88,76,89,103,98,87,100,80,79,96,74,68,101,89,130,98,68,110,113,200,387,974,1136,672,213,116,100,83,88,106,88,82,97,81,87,107,86,89,86,97,99,86,96,76,84,86,97,92,95,102,72,94,121,113,99,112,102,90,90,92,101,99,94,112,113,102,101,97,104,112,91,123,96,125,84,94,93,84,100,97,97,91,104,101,108,101,110,96,100,96,105,97,85,95,105,147,323,536,485,246,121,92,106,140,149,113,123,105,107,99,101,118,97,124,101,99,121,98,105,107,132,147,192,157,136,114,129,96,105,115,106,95,108,125,103,100,105,108,102,122,117,124,110,90,120,107,121,110,94,110,101,115,106,105,98,109,99,100,96,114,135,105,119,114,141,122,133,113,131,103,115,118,102,117,117,97,129,114,123,117,105,103,129,137,158,154,163,135,143,123,138,105,117,120,114,113,127,120,135,132,130,96,135,123,113,114,110,125,98,111,116,108,103,96,107,123,103,116,97,101,83,74,88,87,94,109,101,91,103,77,84,94,89,95,87,141,165,236,261,227,109,98,102,81,82,91,99,93,99,88,76,117,106,96,84,87,89,103,91,77,89,82,91,98,88,100,98,88,95,92,79,89,90,102,81,86,98,77,92,85,84,84,94,94,78,75,88,91,87,78,73,107,76,68,70,88,79,64,94,76,80,88,84,105,83,71,88,93,70,88,74,77,71,72,77,69,76,83,93,80,80,80,74,68,74,84,62,70,67,69,68,71,77,67,74,96,94,74,63,60,79,81,66,76,82,83,62,63,69,71,69,69,63,67,60,67,80,82,84,90,76,97,74,78,98,87,70,63,84,64,81,66,78,63,79,72,78,83,74,82,87,74,67,89,66,85,59,67,77,66,79,78,71,77,64,71,87,79,87,70,63,84,72,80,78,70,75,93,77,120,88,93,102,106,72,96,67,67,77,63,77,84,94,78,78,90,96,87,75,108,178,619,1824,2975,2470,1047,266,59,75,70,71,81,77,78,74,88,94,71,86,85,83,70,71,61,85,76,64,80,79,75,78,81,78,78,80,74,80,71,71,61,85,137,173,177,100,69,59,47,67,68,66,65,37,56,73,51,72,60,65,56,67,73,55,49,60,62,64,61,65,75,50,66,65,90,70,71,55,55,50,51,58,66,54,59,65,54,59,67,68,75,56,74,58,54,57,52,55,51,70,54,74,54,56,61,54,52,52,61,58,66,68,43,55,64,52,64,60,60,52,50,62,48,43,53,58,52,61,58,65,58,65,56,50,57,51,43,46,44,67,64,56,44,49,42,42,54,49,63,53,46,46,51,39,48,57,42,55,51,40,46,49,35,44,40,48,41,51,39,42,44,57,45,47,40,36,55,38,38,56,35,44,40,48,38,40,35,42,44,43,44,29,41,55,57,103,136,152,94,58,43,42,37,58,30,37,34,47,38,28,47,44,36,37,35,52,43,43,39,50,51,47,34,41,38,25,43,39,38,43,34,46,46],
      "133Ba": [0,3,4,4,1,0,0,0,6,5,3,1,5,7,16,35,69,145,426,1225,1545,900,1003,1743,2486,3672,7067,11676,41653,142338,130426,31990,12367,36756,44969,18442,4143,2007,1792,1808,1898,1916,1988,2054,2100,2143,2113,2033,2028,2160,2415,4016,7504,7100,3444,2445,2920,3878,5044,5291,4425,5074,5649,5677,5618,5430,5445,5464,4720,4453,4590,4279,3770,3913,4249,4416,4664,5011,7973,30147,95753,94195,22013,3021,2136,2074,2354,2357,2174,2114,2152,2125,2105,2183,2150,2189,2170,2181,2320,2343,2455,2460,2515,2566,2491,2546,2493,2520,2510,2596,2826,2824,2571,2516,2648,2717,2674,2603,2635,2637,2695,2671,2757,2664,2820,2811,2952,2931,2856,2889,2848,3068,2913,3049,3145,3142,3216,3297,3473,3472,3459,3561,3483,3600,3595,3722,3838,3831,4017,4117,4237,4400,4342,4428,4391,4405,4444,4529,4480,5234,6175,5262,4257,4367,4223,4224,3975,4102,3870,4046,3871,3881,3819,3838,3819,3865,3926,3716,3722,3755,3765,3612,3650,3597,3637,3535,3584,3612,3480,3493,3449,3419,3224,3385,3325,3220,3301,3254,3204,3265,3110,3071,2987,2973,3027,2908,2762,2635,2525,2484,2299,2356,2251,2175,2167,2101,2125,2042,2112,2048,2009,2151,2664,2898,2266,1829,1894,1838,1780,1794,1744,1619,1652,1613,1578,1586,1537,1576,1549,1498,1499,1455,1396,1403,1396,1375,1284,1316,1342,1331,1356,1245,1202,1197,1233,1197,1158,1137,1133,1190,1119,1160,1140,1089,1089,1130,1079,1062,989,1041,985,956,1016,1053,2983,11330,13768,4635,1171,867,830,821,840,818,807,791,808,758,765,756,746,769,680,729,755,773,691,683,707,678,1742,12652,32609,22396,4227,783,662,632,592,571,585,554,560,570,538,525,470,512,467,491,481,463,481,475,450,455,457,505,461,421,434,461,486,599,478,465,431,454,465,400,366,376,346,388,344,358,407,354,352,350,392,402,446,2031,23913,86009,81243,20278,1473,250,208,163,138,130,149,130,137,131,127,128,129,126,115,123,120,119,134,150,105,119,127,366,3295,11747,11087,2980,590,416,167,114,146,167,124,74,88,66,82,80,77,62,75,87,72,89,66,72,72,79,66,86,72,79,81,102,123,125,102,88,97,101,73,76,71,88,83,90,92,88,69,65,76,63,64,73,102,177,370,302,105,65,70,72,74,67,65,68,66,67,72,63,83,73,56,64,70,74,64,69,57,68,63,70,73,72,64,57,68,68,77,63,39,41,55,63,66,53,64,60,70,67,69,61,50,61,58,60,63,47,55,68,65,51,71,55,53,54,56,55,70,57,53,80,55,74,78,89,77,92,103,126,145,135,89,65,63,55,64,60,59,60,53,50,46,53,55,57,56,65,66,59,44,52,45,70,55,51,47,52,52,70,46,33,65,52,48,42,47,59,52,41,50,53,41,55,54,64,42,53,46,63,49,53,57,53,59,57,42,45,37,66,52,59,62,66,44,53,51,47,56,48,67,50,65,74,67,63,57,48,49,42,57,40,55,51,51,41,57,63,48,50,49,45,55,36,39,44,50,63,85,56,38,53,43,49,48,42,40,43,45,32,45,49,45,45,43,50,43,36,44,57,46,49,28,39,45,58,32,39,29,54,35,47,47,45,44,54,36,47,47,43,36,41,29,36,45,40,49,34,50,41,36,39,41,35,47,49,37,30,44,35,27,37,35,29,51,37,35,30,39,34,44,29,49,37,41,46,37,45,42,32,34,34,41,32,33,33,32,42,29,29,40,35,32,41,26,37,38,35,37,34,36,37,28,37,43,38,28,39,38,32,35,33,38,36,36,26,32,45,33,37,34,38,24,32,26,34,34,33,34,37,37,34,39,37,40,41,35,34,30,26,37,40,28,34,48,45,32,32,29,35,31,28,26,47,33,25,40,38,48,28,28,31,42,36,40,36,30,27,36,33,35,32,37,26,30,35,97,389,682,452,106,36,30,34,31,37,22,42,32,21,39,30,19,32,33,17,20,25,33,31,32,30,25,27,23,28,25,25,30,32,26,30,27,38,25,29,31,24,22,21,31,24,34,28,28,30,26,24,22,23,28,24,31,31,21,27,27,28,24,27,30,36,18,30,30,25,25,18,36,28,29,28,36,26,22,15,21,27,36,22,36,32,27,30,34,19,32,29,21,28,37,24,24,24,19,27,26,23,17,31,21,26,24,24,26,24,18,22,16,34,24,16,31,25,34,33,29,27,30,26,48,37,34,23,19,28,20,23,22,21,18,23,29,28,33,34,33,30,19,23,23,28,28,23,29,23,22,17,21,24,27,18,25,23,29,23,26,19,23,27,21,19,25,30,29,33,22,26,29,27,36,21,27,32,23,22,30,32,42,38,20,28,22,23,20,32,23,20,33,22,15,15,32,11,28,28,19,30,19,29,21,11,19,28,25,20,28,20,36,29,28,21,31,24,31,15,32,22,30,20,30,20,19,25,26,15,20,15,29,24,25,26,27,22,21,27,24,16,22,14,26,30,35,29,24,20,18,23,22,26,28,35,18,34,21,22,21,16,25,20,19,23,21,23,23,29,20,23,31,24,24,35,28,28,31,20,30,29,26,27,28,26,14,23,27,18,30,23,24,21,28,29,19,24,28,24,27,20,21,16,14,16,22,25,19,31,20,24,32,20,25,28,32,25,30,30,33,24,24,23,21,25,26,13,16,32,29,29,23,25,33,32,27,23,26,36,31,16,29,34,18,25,26,20,14,20,21,25,24,25,35,30,28,31,20,27,27,20,27,20,33,23,15,30,37,23,26,25,36,27,31,21,24,29,26,31,17,25,25,20,36,30,30,23,33,22,26,30,29,22,28,29,26,29,17,30,28,25,31,27,24,22,31,29,26,34,33,28,35,28,20,34,35,27,27,28,33,29,27,20,32,21,35,28,33,26,31,30,22,22,26,24,22,24,29,28,19,20,21,20,28,37,20,20,28,19,19,22,32,24,19,17,15,29,19,18,17,14,25,17,18,19,22,15,17,20,12,13,23,19,19,17,21,24,19,21,22,18,19,17,20,23,14,23,18,20,20,17,18,18,13,24,19,19,12,13,11,8,22,14,20,12,12,30,15,10,12,11,17,8,11,6,14,20,14,14,17,19,6,12,11,9,15,23,11,21,17,11,13,6,11,11,19,10,11,12,15,10,14,7,10,9,10,10,8,11,10,12,12,9,8,11,13,8,6,9,13,17,14,8,6,12,5,3,8,8,7,11,9,15,9,2,6,11,10,8,7,8,11,6,12,8,10,6,4,10,11,14,9,8,11,8,7,9,6,9,13,8,8,7,5,9,14,7,11,5,7,13,5,8,12,7,4,8,7,5,9,14,5,4,1,9,9,7,8,6,9,8,5,7,10,8,4,8,9,4,11,10,6,11,7,10,12,119,477,959,713,284,37,7,1,2,3,5,7,8,5,4,3,7,5,5,3,3,8,7,8,11,17,89,200,124,48,5,3,0,1,2,4,2,4,3,4,3,5,6,3,0,3,3,2,3,3,3,5,2,3,2,7,2,1,2,1,6,3,5,5,4,2,2,0,3,0,4,0,7,4,1,5,6,2,4,5,1,4,1,4,2,5,5,5,4,1,3,7,2,1,1,5,1,3,3,5,7,3,2,2,3,2,4,5,3,1,5,2,2,5,4,5,3,1,4,3,8,3,2,2,1,3,3,3,3,1,4,3,1,3,6,4,4,3,3,4,3,5,7,0,3,1,0,4,2,3,4,3,3,3,4,4,4,2,4,9,6,3,4,6,5,3,2,6,4,5,7,3,2,1,0,2,1,4,2,1,3,8,4,1,2,5,2,2,5,0,1,5,4,3,2,7,3,5,3,2,3,2,2,0,2,2,2,1,3,0,2,8,3,5,2,4,3,2,0,4,1,4,3,4,0,1,3,2,3,4,4,2,2,2,1,2,2,1,4,2,2,0,1,0,1,1,1,2,4,2,2,0,3,3,4,3,1,3,4,3,2,0,1,0,0,2,3,0,1,1,1,2,1,3,3,2,1,5,3,0,1,3,2,2,2,5,4,0,7,2,4,4,3,5,4,3,9,2,2,2,1,0,1,6,2,3,1,4,3,0,2,0,2,3,4,3,2,2,2,2,5,2,1,1,2,1,3,2,3,2,13,17,9,9,3,1,3,6,2,1,3,4,2,5,3,2,2,2,2,2,4,2,2,1,3,3,3,1,1,3,1,3,1,2,0,2,2,0,2,1,2,4,3,3,2,1,4,2,1,2,5,0,3,2,5,0,3,3,4,2,2,4,1,2,1,1,0,2,2,4,1,1,2,0,3,1,2,2,1,0,2,1,1,1,1,4,0,1,2,3,2,3,4,2,0,1,3,2,3,5,2,1,2,0,1,1,2,1,2,3,2,2,2,3,1,1,3,1,1,5,1,1,1,4,0,0,1,1,2,2,5,1,2,1,1,0,3,1,4,0,1,1,1,0,2,0,3,2,2,1,2,1,2,3,2,2,1,1,2,3,1,0,4,1,1,0,5,3,0,2,1,4,2,1,2,3,2,2,5,3,1,1,2,2,4,3,1,2,1,0,3,5,3,2,0,2,1,2,3,5,0,1,3,1,1,0,1,4,3,0,1,0,2,1,1,4,1,0,1,4,2,5,0,2,4,2,0,1,2,0,3,0,1,3,1,2,2],
      "152Eu": [0,0,0,0,0,0,0,0,0,1,1,0,0,3,7,7,12,24,35,59,120,113,184,242,276,389,676,893,710,626,764,1204,1685,1694,1860,3945,14936,22504,10194,2061,1089,2033,5243,5199,2309,770,393,347,294,250,263,260,260,266,300,391,469,450,390,279,285,276,278,303,335,375,373,338,340,353,314,330,454,473,450,563,437,395,427,438,450,548,661,652,656,699,679,593,551,567,555,525,482,508,516,473,492,450,505,497,489,503,491,482,494,524,485,498,548,534,516,520,523,533,501,548,599,772,3207,12525,12186,3086,563,366,436,372,359,401,401,434,425,387,417,395,438,430,433,453,416,427,401,432,454,461,428,436,501,492,511,504,468,527,483,485,519,533,487,498,530,543,541,533,542,470,498,506,450,496,495,493,492,510,465,504,473,500,488,432,509,470,489,475,515,436,472,483,463,462,461,451,482,487,436,449,469,455,387,435,417,408,421,388,411,406,429,396,424,380,386,439,365,406,407,372,359,393,363,401,389,384,380,402,355,370,378,345,394,360,354,314,332,373,321,353,366,347,331,315,330,342,340,462,1428,2944,1720,518,355,364,313,304,304,297,274,303,302,245,274,297,275,285,256,271,287,270,281,260,280,250,294,291,287,250,261,273,303,250,246,249,268,241,224,246,227,251,247,223,254,232,255,232,198,202,222,300,346,283,226,211,222,192,214,207,206,207,196,186,227,211,208,189,218,204,200,191,194,157,174,188,179,183,179,195,179,197,181,167,180,201,186,168,165,188,171,173,158,158,160,172,166,164,225,1100,5074,6940,2614,361,159,143,153,140,160,152,140,135,135,138,140,159,146,125,138,131,123,144,151,221,340,282,189,130,146,131,106,150,119,136,127,136,134,135,120,106,154,123,133,122,109,116,124,106,108,117,112,121,117,126,97,115,133,117,109,106,123,117,107,103,131,112,157,372,619,374,153,126,143,134,137,136,131,117,114,102,109,95,108,128,119,115,103,120,110,109,103,136,118,117,94,99,103,111,153,217,633,759,316,96,96,98,107,125,102,113,99,106,113,119,112,99,109,104,109,114,99,112,124,111,82,106,118,103,104,107,112,102,99,124,113,95,93,97,113,101,110,89,98,102,123,169,166,147,100,105,118,103,113,105,123,104,99,107,104,125,113,142,114,109,123,113,129,129,127,124,111,110,100,99,119,110,114,112,96,108,109,91,119,128,103,106,112,99,110,106,113,109,111,89,111,129,119,112,108,117,101,103,96,90,98,100,114,103,110,110,100,93,109,119,99,107,81,107,90,95,152,198,190,142,118,121,124,129,98,101,121,117,111,100,101,113,103,92,116,97,114,108,126,193,139,126,116,95,85,113,97,96,88,100,68,111,80,101,102,74,107,98,100,100,88,98,86,99,105,79,98,86,104,88,88,83,79,103,92,100,90,86,95,75,92,98,100,89,89,103,72,84,102,92,90,81,73,83,83,82,70,98,90,98,84,91,84,88,84,78,92,79,95,113,97,91,89,80,75,89,75,62,94,96,81,99,87,71,105,105,105,87,106,119,81,140,160,119,90,91,78,81,88,88,95,186,199,153,104,83,91,75,94,90,90,80,90,76,113,83,86,96,93,89,88,85,73,95,91,100,109,94,71,115,106,87,116,121,112,89,94,106,96,83,97,90,84,104,76,87,76,87,93,81,91,106,90,94,84,78,78,94,94,65,89,95,90,88,103,82,95,78,95,103,97,96,86,86,99,78,101,97,108,105,74,98,82,79,75,81,89,75,72,72,191,864,1744,1365,344,110,60,75,66,63,94,112,124,93,92,82,68,69,85,78,80,61,60,57,74,69,77,85,83,76,59,67,85,106,102,95,77,60,73,72,67,67,85,71,76,68,73,70,73,62,88,78,57,56,65,83,75,75,61,69,55,86,77,77,90,72,73,74,66,80,75,68,74,67,72,74,74,82,62,69,78,73,63,67,68,74,59,76,77,174,444,616,286,112,70,85,81,80,68,63,61,76,66,74,78,69,48,55,67,72,67,82,63,61,58,80,56,75,49,84,63,64,81,83,65,62,72,64,58,80,51,61,55,62,56,50,57,51,48,51,51,58,86,92,70,53,56,49,60,68,76,61,62,68,49,48,55,40,49,54,46,50,55,45,56,36,53,43,42,43,29,56,62,46,45,39,41,61,57,39,47,43,49,57,50,118,566,1510,1443,547,102,44,43,51,47,46,40,44,37,32,45,41,42,37,32,39,35,39,33,39,33,31,39,45,44,25,35,33,32,26,36,43,35,27,19,34,35,58,90,127,73,38,31,38,37,39,30,37,33,27,29,29,41,28,40,43,30,33,36,30,34,33,34,28,30,28,33,35,24,27,34,28,29,37,32,38,32,29,30,34,24,30,27,25,26,43,32,24,30,35,35,33,30,30,37,31,46,26,34,30,41,31,39,33,32,36,27,31,37,44,38,47,35,34,43,36,33,63,229,742,1052,567,199,187,177,134,46,38,26,30,39,45,37,30,26,27,28,30,34,38,36,38,37,67,193,705,1386,1043,262,68,37,30,37,24,41,34,35,32,37,47,42,26,44,45,20,39,33,27,35,42,37,30,28,27,30,31,37,33,23,34,38,34,36,35,33,42,42,55,33,41,29,52,44,32,27,31,31,43,48,28,44,34,40,33,40,35,37,43,32,34,37,36,41,39,34,35,31,38,43,31,35,42,35,37,22,28,34,34,36,26,20,28,29,26,25,21,24,21,21,22,29,26,22,26,19,33,68,133,108,54,18,20,23,17,22,15,16,16,13,18,18,16,17,18,14,24,26,12,21,21,16,23,17,21,15,17,20,26,23,19,17,14,21,26,36,29,13,15,21,15,11,11,20,13,17,16,16,20,21,11,9,12,13,16,12,15,16,11,36,21,23,14,10,5,10,12,13,7,11,18,19,7,14,6,9,12,17,21,15,13,10,17,64,134,138,54,13,4,9,10,10,4,5,11,7,3,10,8,2,9,8,9,11,6,9,2,6,3,6,5,6,5,4,4,3,5,6,4,10,2,1,4,2,5,3,5,5,5,5,4,4,3,5,6,4,4,5,2,4,5,1,8,3,4,6,3,4,3,10,10,2,3,6,4,4,6,3,5,4,6,2,4,3,2,3,3,4,0,3,1,7,3,2,3,5,5,3,5,4,3,4,4,5,8,2,8,3,4,7,11,130,601,1545,1536,614,113,15,1,0,2,2,0,5,4,3,1,2,3,2,5,1,3,1,0,1,0,2,1,9,56,80,61,23,4,1,0,1,2,1,3,3,4,14,13,4,7,1,3,1,2,8,20,42,25,13,13,9,5,0,1,0,0,0,0,1,0,0,0,0,2,2,0,1,1,0,0,2,0,0,0,1,0,0,0,0,0,5,1,1,1,1,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1,2,0,0,0,1,1,0,0,0,1,1,1,6,11,27,12,8,3,0,0,0,0,0,2,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,0,1,1,1,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,0,0,0,1,0,1,0,3,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,1,1,1,2,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,1,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,1,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,2,0,0,1,1,1,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,0,2,0,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,0,0,1,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
      "207Bi": [0,0,0,1,1,1,0,0,0,0,2,0,0,2,3,1,1,5,7,23,17,32,54,64,96,141,129,207,200,232,210,267,310,257,257,262,260,286,291,301,276,286,292,272,311,319,332,363,342,339,357,385,397,439,465,505,609,782,921,957,714,658,625,693,690,635,706,786,718,707,828,1216,2651,3164,3899,4528,1556,796,526,453,476,441,503,889,2021,2199,1133,1106,732,436,420,299,345,343,335,338,301,321,337,334,356,386,339,359,365,347,374,346,392,378,362,378,365,390,402,405,388,370,400,373,428,426,390,381,404,435,408,392,437,435,404,383,408,416,420,415,404,432,404,403,421,441,430,397,430,440,448,429,400,441,464,427,445,411,465,426,452,453,422,436,441,441,430,432,435,483,473,447,451,448,473,403,466,453,466,466,483,533,538,530,544,564,524,503,523,537,508,503,513,488,500,495,498,467,514,528,475,486,477,485,504,463,503,474,469,465,498,454,474,481,539,466,507,499,472,435,510,492,483,493,433,475,436,459,480,433,478,476,495,455,491,458,458,450,449,444,444,464,476,490,454,435,427,425,461,447,438,462,402,465,417,453,433,449,498,421,452,439,448,449,471,447,434,463,439,468,436,409,426,420,418,445,420,453,419,393,399,387,416,403,409,415,413,431,397,415,407,425,399,397,376,423,435,408,417,409,400,433,439,420,433,412,404,356,415,387,393,393,382,386,409,393,401,412,420,378,372,371,407,385,373,429,400,367,403,396,410,358,393,390,375,386,428,412,405,419,443,407,361,358,393,399,429,424,377,419,426,372,389,415,439,446,408,432,403,443,404,373,408,390,443,405,416,377,435,407,412,464,422,406,382,405,450,407,434,452,386,458,460,424,417,425,418,420,435,381,453,413,424,392,386,429,385,370,359,358,342,345,331,308,299,296,311,293,296,296,277,322,290,284,280,263,310,261,259,262,250,278,275,241,263,247,258,266,265,258,226,244,274,252,224,249,260,240,252,218,254,271,233,256,255,230,254,243,209,233,200,207,226,218,195,221,201,199,206,217,219,198,226,224,210,205,216,216,192,200,202,200,198,199,189,192,188,203,189,211,182,186,198,181,187,167,189,205,167,184,186,176,186,190,199,184,190,155,175,187,183,203,188,171,164,163,154,157,161,180,174,197,160,178,170,181,171,173,174,180,154,172,161,177,156,149,163,165,148,160,160,189,137,158,168,159,143,164,166,191,159,155,155,153,147,146,142,144,166,143,158,155,126,145,178,171,160,154,157,173,159,179,178,163,148,160,149,142,170,190,318,1897,9920,15503,5989,701,130,98,105,92,96,106,84,107,101,110,120,104,81,108,97,86,100,97,88,102,92,101,84,101,88,100,109,101,115,112,98,98,94,93,104,108,93,111,109,91,85,82,108,90,101,108,113,98,108,90,100,108,79,109,93,98,99,85,88,114,101,98,101,93,98,93,92,112,105,94,95,97,88,87,89,114,117,96,107,114,97,113,97,96,97,106,96,98,104,99,114,101,93,110,90,114,111,118,90,103,93,98,99,112,92,97,83,94,106,109,109,110,81,91,92,100,106,95,96,110,107,103,122,91,108,111,100,110,115,109,99,103,97,110,118,92,128,107,103,86,104,130,121,111,98,113,116,119,83,101,105,113,111,114,102,94,97,110,114,115,111,110,112,117,125,112,113,105,125,105,107,98,140,128,112,121,125,130,118,120,102,116,111,120,110,118,111,130,117,115,120,106,128,122,125,129,128,150,130,123,116,121,103,118,136,132,125,105,108,142,141,121,122,136,123,159,179,142,135,121,108,133,117,143,125,146,121,120,137,140,133,125,135,156,137,147,139,128,114,133,129,145,132,148,156,143,152,133,127,148,122,150,157,149,125,149,165,153,138,123,143,131,149,148,150,154,143,148,155,163,146,129,130,149,142,175,127,145,149,152,140,130,133,140,136,132,108,107,101,99,92,120,116,121,87,99,97,85,90,100,94,96,66,84,75,72,88,91,81,82,80,74,71,82,71,83,84,85,82,76,85,73,66,73,94,83,71,76,63,71,61,78,70,78,68,75,76,75,67,65,65,58,59,69,55,55,74,73,61,61,49,57,64,65,53,60,43,55,67,48,62,54,51,52,55,46,54,70,44,51,42,63,38,35,35,35,49,45,42,43,40,30,35,40,45,37,22,35,33,25,29,31,25,32,33,26,37,40,26,38,26,28,34,28,22,21,32,31,31,33,19,26,33,27,23,31,23,19,28,32,22,27,20,23,22,25,18,26,24,14,14,27,26,20,25,33,29,25,23,27,31,21,26,19,34,28,20,25,31,20,29,17,36,22,15,25,20,19,23,21,29,16,24,18,25,30,34,25,16,26,16,24,25,25,19,15,29,28,26,39,37,24,36,19,33,34,28,84,429,2631,6984,6324,1781,148,14,7,10,6,9,5,8,12,6,2,5,11,13,4,9,8,5,8,6,9,9,9,7,13,4,11,3,10,3,9,4,5,12,1,7,14,4,6,8,4,5,6,6,7,8,10,11,4,6,7,4,7,1,10,9,8,11,2,6,3,8,9,9,7,6,5,8,6,12,10,6,11,8,7,6,6,4,5,7,7,4,3,9,5,5,10,9,3,11,10,9,2,12,8,7,13,6,5,3,8,6,4,7,6,8,5,8,13,6,6,11,7,10,13,9,7,9,5,10,5,8,6,6,7,7,7,7,6,6,14,3,7,8,6,12,9,6,9,10,10,7,8,4,8,5,8,6,12,5,12,8,11,5,14,8,8,7,13,12,6,9,5,9,9,8,8,10,5,8,8,9,10,5,7,5,8,9,4,11,9,12,6,9,8,4,5,4,7,13,8,12,20,22,15,12,12,7,9,3,5,5,7,14,6,9,3,13,6,7,11,13,5,6,8,9,10,8,7,2,6,3,7,11,7,6,2,11,12,8,5,6,6,7,8,11,6,9,6,13,5,3,8,8,9,11,5,5,8,14,1,9,11,7,4,3,3,10,6,4,14,6,4,4,6,4,7,7,6,7,12,6,9,2,4,8,6,9,7,6,5,6,11,9,7,13,9,4,6,8,8,3,9,12,9,9,8,7,11,9,2,6,4,10,9,12,12,5,6,9,6,11,10,11,6,4,6,3,8,3,5,4,11,8,7,6,6,7,6,6,10,3,8,8,7,3,5,7,6,8,9,8,6,5,7,4,4,4,9,3,10,6,5,7,8,5,5,11,12,8,8,11,9,6,5,7,9,13,46,99,71,19,10,6,11,16,16,3,6,8,5,6,11,8,3,7,9,7,5,7,4,3,13,19,18,24,16,5,7,10,8,7,4,5,11,5,1,9,7,13,13,7,6,7,12,12,7,3,13,6,10,9,8,8,8,8,8,7,10,5,11,9,12,10,6,8,14,6,8,4,5,10,11,12,13,13,12,9,11,8,7,4,10,11,7,11,8,3,8,11,11,5,7,7,11,8,7,4,15,11,10,9,9,9,12,9,10,6,11,7,4,6,7,9,6,3,8,3,5,7,8,4,3,3,9,6,3,5,8,4,2,10,8,9,5,8,7,6,6,5,5,7,5,3,6,2,5,6,4,9,4,3,7,5,5,5,10,4,3,5,3,6,1,0,3,3,6,8,2,5,6,5,5,2,5,6,5,5,3,3,4,2,7,5,2,3,6,3,2,3,7,6,7,6,5,10,17,16,5,5,4,4,3,4,6,1,2,2,5,3,2,5,2,3,2,4,2,0,2,3,3,2,4,2,2,2,3,1,1,1,2,1,2,3,3,4,2,1,3,1,2,0,0,1,3,3,0,0,1,3,3,1,2,2,2,1,0,2,3,0,2,0,1,1,0,0,1,4,1,0,2,1,0,1,1,0,3,0,3,2,1,2,2,3,2,3,2,2,0,0,0,0,2,1,0,0,0,2,3,3,3,1,1,1,2,1,1,0,0,1,0,1,0,0,0,3,1,2,1,2,0,0,0,2,2,1,2,1,3,2,11,35,193,409,394,150,23,2,1,0,0,1,0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,1,0,1,1,1,0,0,0,1,0,0,1,0,0,0,1,0,1,1,0,0,0,0,0,1,0,1,1,0,0,1,0,0,1,1,0,1,1,0,0,2,0,0,1,1,0,1,1,2,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,1,0,0,0,0,1,1,2,0,0,1,0,0,1,1,0,1,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,2,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,3,0,0,1,1,0,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,0,0,0,],
      "26Na":
      [0,0,2,0,2,4,1,2,2,1,4,1,3,8,12,28,53,96,184,267,416,627,848,1071,1364,1594,1891,2198,2436,2599,2743,3080,3037,3064,2999,3144,3253,3169,3112,3194,3151,3190,3206,3229,3300,3297,3402,3325,3439,3408,3567,3568,3465,3591,3774,3769,4173,5042,6011,5660,4361,3887,3796,3863,3971,4110,4762,4751,4433,4293,4182,4246,4647,5227,6566,6685,7363,7337,5280,4155,4072,4214,4255,4285,4502,4723,5605,5914,5012,4884,4713,4323,4227,4247,4172,4170,4263,4247,4306,4391,4403,4372,4328,4344,4368,4392,4362,4319,4348,4420,4430,4472,4536,4586,4710,4604,4634,4790,4562,4780,4685,4690,4764,4705,4686,4767,4662,4776,4706,4712,4743,4732,4768,4788,4731,4676,4803,4717,4674,4677,4790,4757,4614,4713,4701,4656,4745,4666,4727,4662,4666,4770,4635,4645,4670,4570,4800,4725,4636,4509,4670,4692,4696,4724,4605,4740,4701,4636,4732,4768,4637,4663,4764,4649,4677,4587,4745,4737,4674,4598,4626,4762,4667,4768,4710,4563,4553,4533,4557,4536,4498,4490,4552,4421,4548,4381,4462,4387,4363,4494,4392,4455,4224,4402,4418,4350,4369,4178,4286,4266,4266,4338,4231,4351,4275,4247,4346,4294,4333,4245,4243,4373,4452,4545,4478,4519,4463,4669,4653,4474,4398,4422,4402,4401,4370,4420,4359,4386,4404,4415,4351,4313,4340,4264,4287,4255,4220,4226,4150,4289,4176,4251,4042,4126,4107,4114,4093,3883,4027,3960,3942,3829,3851,3904,3825,3817,3800,3913,3755,3692,3832,3746,3657,3717,3685,3782,3720,3586,3588,3614,3605,3538,3604,3672,3490,3560,3608,3535,3466,3476,3535,3629,3517,3497,3472,3384,3503,3514,3417,3462,3426,3478,3392,3464,3351,3397,3271,3200,3340,3239,3375,3289,3314,3262,3235,3333,3235,3238,3210,3069,3225,3151,3193,3144,3108,3153,3083,3016,3168,3266,3149,3097,3019,3037,3020,3018,3086,3035,2948,3010,2852,3001,2994,2937,3088,2897,2865,2849,2903,2797,2960,2857,2959,2811,2796,2733,2921,2822,2731,2802,2718,2757,2768,2740,2725,2715,2726,2625,2705,2732,2720,2614,2755,2665,2609,2612,2647,2537,2595,2735,2629,2684,2661,2625,2613,2564,2430,2645,2691,2603,2543,2556,2534,2572,2524,2538,2515,2417,2523,2433,2415,2511,2476,2487,2416,2456,2460,2457,2466,2382,2369,2407,2396,2435,2426,2392,2451,2358,2423,2387,2369,2422,2357,2434,2363,2358,2272,2288,2328,2296,2290,2254,2327,2316,2311,2281,2348,2271,2264,2219,2277,2269,2294,2258,2228,2308,2261,2257,2291,2206,2212,2260,2208,2140,2168,2167,2191,2205,2129,2178,2175,2135,2236,2193,2119,2142,2117,2143,2147,2104,2167,2136,2116,2132,2106,2137,2138,2080,2121,2129,2039,2009,2052,2118,2189,2200,2143,2005,2030,2062,2026,2063,2020,2080,2017,2046,2063,2045,2034,2073,2011,2079,2126,2202,2118,2244,2571,3110,4325,5864,6842,6253,4463,2935,2247,1982,1926,1926,1889,1970,1890,1919,1917,1899,1825,1856,1831,1881,1876,1906,1843,1929,1875,1819,1849,1883,1847,1823,1824,1825,1831,1790,1856,1873,1715,1766,1790,1798,1786,1820,1832,1771,1801,1837,1809,1792,1757,1805,1782,1738,1761,1743,1774,1836,1790,1773,1795,1730,1740,1759,1742,1779,1731,1756,1704,1729,1805,1708,1790,1714,1681,1718,1815,1735,1752,1786,1733,1685,1704,1684,1710,1679,1692,1649,1634,1733,1630,1683,1712,1635,1677,1649,1702,1706,1731,1668,1692,1652,1729,1668,1633,1660,1678,1749,1696,1709,1555,1670,1627,1703,1579,1597,1662,1652,1631,1697,1622,1622,1675,1694,1634,1600,1515,1591,1601,1573,1610,1696,1583,1631,1594,1562,1651,1620,1641,1597,1552,1619,1717,1633,1611,1615,1529,1637,1615,1561,1551,1509,1580,1564,1533,1583,1610,1513,1582,1528,1583,1557,1483,1556,1480,1586,1543,1585,1531,1542,1602,1530,1525,1490,1586,1475,1609,1537,1544,1485,1552,1448,1566,1603,1537,1570,1545,1578,1527,1528,1517,1578,1531,1519,1594,1479,1491,1498,1548,1553,1595,1484,1470,1517,1535,1492,1565,1415,1563,1511,1537,1497,1490,1506,1499,1525,1465,1467,1493,1483,1525,1499,1506,1500,1427,1484,1522,1541,1461,1532,1454,1427,1521,1434,1513,1448,1481,1421,1516,1430,1595,1448,1420,1479,1441,1533,1542,1442,1495,1432,1576,1526,1495,1505,1415,1480,1386,1463,1532,1568,1416,1514,1457,1502,1541,1491,1519,1501,1392,1460,1468,1491,1538,1483,1581,1514,1548,1828,2466,3289,3394,2584,1832,1702,1505,1571,1556,1629,1579,1541,1498,1465,1532,1460,1540,1495,1505,1474,1505,1466,1465,1502,1522,1456,1387,1468,1447,1460,1567,1531,1434,1513,1479,1445,1482,1475,1407,1464,1516,1479,1463,1488,1425,1458,1465,1462,1487,1616,1578,1495,1421,1444,1530,1587,1616,1496,1432,1499,1505,1476,1485,1458,1425,1510,1410,1438,1412,1520,1522,1458,1491,1502,1511,1502,1491,1512,1492,1523,1468,1417,1467,1477,1503,1485,1461,1474,1548,1500,1593,1541,1472,1491,1415,1429,1486,1432,1514,1451,1498,1510,1461,1545,1454,1501,1438,1425,1470,1492,1463,1458,1434,1420,1470,1471,1409,1485,1469,1443,1421,1449,1443,1462,1488,1386,1498,1546,1471,1448,1438,1450,1443,1494,1432,1436,1387,1406,1383,1410,1392,1357,1362,1361,1381,1440,1403,1336,1390,1447,1356,1405,1416,1425,1367,1455,1354,1394,1433,1425,1406,1379,1371,1361,1340,1414,1413,1516,1365,1399,1363,1364,1364,1427,1391,1323,1384,1337,1376,1353,1347,1425,1352,1325,1373,1337,1370,1385,1397,1403,1297,1383,1401,1375,1336,1361,1383,1320,1363,1337,1369,1384,1302,1405,1397,1404,1377,1390,1326,1318,1322,1315,1352,1289,1362,1423,1515,2030,3002,3365,2562,1672,1358,1329,1379,1270,1331,1328,1275,1339,1326,1280,1319,1258,1349,1373,1302,1414,1307,1397,1329,1314,1394,1329,1301,1307,1294,1273,1324,1423,1354,1371,1244,1374,1342,1294,1298,1327,1301,1322,1338,1310,1316,1344,1343,1347,1257,1324,1255,1340,1355,1336,1362,1289,1372,1273,1366,1391,1282,1359,1325,1335,1278,1350,1281,1341,1312,1278,1296,1304,1314,1310,1365,1363,1336,1287,1392,1344,1380,1342,1373,1318,1334,1390,1308,1361,1290,1373,1362,1319,1296,1376,1375,1396,1369,1294,1352,1347,1348,1327,1440,1402,1432,1373,1436,1377,1319,1386,1409,1408,1409,1417,1394,1358,1343,1347,1322,1377,1333,1379,1471,1574,1857,2929,6193,10509,9048,4119,1785,1385,1396,1377,1387,1411,1405,1390,1374,1384,1296,1374,1342,1268,1384,1369,1341,1388,1335,1377,1368,1383,1376,1317,1356,1332,1345,1353,1346,1336,1311,1371,1366,1345,1443,1307,1352,1397,1374,1311,1396,1384,1369,1361,1432,1426,1383,1402,1383,1364,1359,1400,1378,1370,1351,1348,1406,1344,1380,1407,1388,1394,1408,1340,1404,1376,1321,1376,1367,1341,1396,1377,1401,1419,1356,1405,1381,1342,1390,1352,1300,1332,1369,1363,1392,1328,1396,1370,1375,1338,1392,1348,1379,1387,1352,1386,1332,1383,1398,1404,1402,1392,1357,1425,1288,1383,1364,1362,1395,1367,1371,1386,1385,1358,1371,1422,1440,1393,1402,1373,1322,1382,1352,1422,1327,1364,1358,1354,1392,1395,1420,1344,1352,1409,1390,1414,1476,1401,1467,1454,1313,1373,1389,1385,1472,1431,1344,1372,1398,1439,1426,1497,1407,1446,1407,1504,1490,1490,1534,1486,1604,1678,1864,2470,3334,4126,3765,2898,2071,1653,1498,1528,1497,1475,1469,1495,1362,1425,1481,1465,1484,1502,1523,1483,1529,1467,1543,1534,1483,1373,1477,1449,1484,1512,1506,1441,1575,1447,1566,1532,1504,1535,1528,1557,1500,1426,1591,1583,1575,1579,1526,1448,1513,1517,1561,1510,1539,1544,1560,1560,1553,1481,1577,1611,1542,1587,1519,1587,1548,1541,1593,1724,1873,2118,2013,1755,1541,1663,1522,1534,1641,1513,1609,1635,1623,1641,1597,1559,1668,1585,1642,1609,1648,1664,1734,1687,1642,1644,1663,1695,1687,1974,2045,1925,1760,1663,1686,1700,1653,1697,1666,1722,1736,1723,1709,1753,1919,2265,3368,4775,4592,3002,1998,1727,1736,1697,1764,1618,1837,1855,1723,1728,1736,1661,1757,1700,1771,1743,1833,1756,1794,1772,1906,1969,2029,1886,1908,1854,1776,1854,1864,1863,1806,1771,1829,1865,1882,1814,1886,1937,1898,1845,1883,1863,1993,1929,1881,1951,1973,1995,1988,1916,1950,1939,1981,1953,1988,1961,1866,1935,1964,1991,2001,1992,1914,2008,1938,2071,2061,2028,2054,2010,2119,2106,2110,2063,2168,2077,2062,2097,2170,2111,2156,2113,2087,2217,2189,2234,2172,2207,2218,2150,2169,2194,2231,2209,2188,2243,2190,2239,2226,2210,2241,2369,2322,2436,2410,2324,2442,2306,2367,2376,2345,2344,2424,2314,2404,2386,2333,2348,2384,2371,2462,2375,2362,2442,2404,2525,2449,2412,2410,2369,2513,2466,2471,2561,2484,2559,2546,2613,2516,2541,2499,2547,2559,2504,2569,2496,2616,2506,2600,2448,2633,2589,2507,2553,2532,2442,2430,2612,2591,2516,2484,2563,2546,2436,2383,2468,2385,2276,2341,2225,2146,2026,1967,1995,1833,1859,1780,1795,1830,1707,1703,1773,1662,1630,1677,1631,1691,1641,1630,1635,1665,1624,1608,1628,1551,1607,1519,1513,1640,1552,1555,1539,1557,1629,1522,1557,1571,1496,1472,1417,1496,1501,1383,1505,1460,1467,1388,1380,1392,1371,1422,1331,1327,1382,1394,1300,1291,1374,1374,1268,1237,1292,1291,1227,1217,1260,1275,1138,1176,1198,1191,1157,1084,1148,1133,1143,1196,1130,1082,1037,1064,1087,998,1017,1033,938,963,943,988,893,928,849,893,844,813,853,810,771,761,785,756,727,724,712,772,725,654,697,663,623,708,693,665,607,640,632,576,558,531,523,510,516,552,514,519,499,452,502,498,471,443,440,456,449,481,442,437,489,468,403,431,379,362,379,382,406,363,370,351,371,377,372,393,373,330,342,347,364,348,379,382,340,395,328,353,366,342,328,354,374,353,372,342,355,342,353,320,351,309,320,315,344,321,309,370,387,351,436,682,1181,1802,1871,1234,591,338,318,324,271,331,314,286,300,255,300,278,306,300,372,448,386,402,370,356,379,449,452,498,721,1135,2073,4218,9828,26866,66337,107326,92293,40013,8847,1351,453,308,284,244,212,205,167,153,142,130,108,116,119,108,109,108,91,104,96,103,109,81,120,101,91,124,93,104,97,94,103,82,99,99,91,87,108,103,78,105,104,96,95,106,72,82,110,112,97,89,90,89,91,88,87,91,93,95,92,97,90,122,99,108,86,87,88,94,89,94,104,108,80,99,87,92,113,120,125,187,294,620,1390,2199,1896,915,318,133,105,87,105,73,90,83,90,84,82,82,96,95,118,117,109,98,109,101,107,90,87,99,78,77,77,82,98,88,87,95,93,82,88,78,81,70,86,85,89,90,82,75,89,108,88,90,83,99,91,92,90,76,74,76,90,87,83,70,83,87,87,81,82,94,84,81,72,89,87,69,89,86,69,106,66,88,94,76,79,79,83,80,89,85,87,97,90,84,83,61,79,88,73,91,93,116,112,105,143],
      "26NaS1140":
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,2,2,1,2,0,2,0,1,0,1,1,0,1,1,2,0,2,0,1,1,3,2,3,2,1,1,1,5,2,1,2,3,1,3,5,2,2,2,4,3,2,1,4,0,4,3,2,6,3,6,3,1,3,3,6,2,1,4,2,2,3,2,5,4,2,3,0,3,8,5,6,4,8,2,3,6,3,4,7,4,7,5,2,7,2,6,7,5,7,11,6,10,3,12,11,7,10,10,11,12,8,6,12,14,12,13,12,17,20,17,12,11,13,5,12,19,14,28,11,16,13,18,20,22,21,22,12,17,24,20,13,21,18,23,20,19,17,25,22,23,17,23,26,25,19,25,16,18,21,24,29,17,19,20,19,27,19,29,26,27,28,31,27,34,29,31,27,25,39,30,29,38,28,48,29,28,31,31,23,32,22,24,26,16,41,41,44,61,75,67,21,28,31,30,19,34,26,37,27,45,33,42,38,37,36,35,22,34,39,30,35,44,39,33,48,47,33,48,38,48,39,43,39,30,46,52,39,39,38,40,48,46,40,38,37,67,39,48,37,46,37,34,52,42,49,46,35,48,44,51,38,38,50,51,59,47,48,41,54,52,54,39,56,48,40,46,57,54,61,55,51,47,50,52,36,54,41,62,50,55,53,50,56,61,57,58,51,54,56,59,56,55,64,57,55,70,62,66,55,70,64,59,64,62,73,68,64,62,57,56,63,77,54,68,57,62,70,59,62,65,71,78,73,57,82,79,59,64,71,54,64,68,56,70,73,66,59,63,54,57,71,73,55,68,61,55,70,83,70,62,57,64,59,65,75,65,43,50,72,58,83,72,68,55,69,69,66,54,64,56,62,81,73,52,77,60,59,66,62,62,58,67,66,69,63,73,69,76,86,69,70,64,86,74,63,56,63,79,75,79,62,63,75,62,129,133,137,98,63,59,62,73,51,76,62,71,88,71,82,64,70,64,67,83,56,63,63,65,64,57,84,70,62,69,67,67,63,68,74,56,57,79,77,78,66,62,76,47,76,64,73,73,68,62,66,70,68,59,69,67,81,69,77,65,82,75,57,77,35,55,77,69,66,72,64,80,67,74,74,83,66,72,72,75,61,62,73,69,52,57,79,73,84,79,62,58,72,63,65,70,75,64,71,66,59,77,67,68,74,68,68,75,70,71,63,73,65,68,64,54,67,84,78,87,72,67,81,81,61,106,232,367,434,221,89,66,73,72,75,53,84,77,63,77,68,75,74,63,70,84,87,60,60,76,78,61,59,59,69,66,64,73,58,64,74,61,64,64,68,53,72,71,74,71,73,72,75,58,67,55,73,84,84,67,72,79,73,66,60,60,74,75,73,68,78,70,66,85,74,70,64,79,62,56,85,78,64,77,68,53,73,77,71,83,78,70,78,63,67,64,61,72,76,61,95,81,69,77,78,78,83,63,63,82,62,68,67,76,76,74,74,88,67,69,73,71,77,76,64,85,64,63,84,65,53,72,66,75,76,62,63,83,76,62,76,72,71,67,66,77,70,75,78,76,70,58,71,73,71,70,70,72,62,59,85,85,58,72,86,75,66,79,84,84,86,81,80,104,126,155,175,178,125,79,79,81,69,73,71,66,53,74,76,65,64,66,69,80,77,75,67,71,70,68,77,96,64,75,78,80,64,76,90,79,91,69,73,69,76,71,56,86,63,73,85,73,53,83,84,70,74,75,80,70,84,67,92,77,73,73,79,76,84,94,68,70,87,87,104,80,73,80,72,91,60,78,87,67,72,77,94,75,85,87,84,77,83,84,94,89,88,90,78,78,96,95,94,105,100,87,102,78,84,95,96,92,87,89,73,99,99,106,163,184,194,146,97,86,78,85,77,81,70,89,74,90,108,92,85,71,83,89,86,95,84,90,85,89,95,80,107,85,90,81,90,87,93,91,100,84,99,93,98,81,90,86,94,92,72,77,111,136,199,185,130,104,87,102,74,86,85,85,94,92,93,89,103,86,88,104,98,104,109,101,98,107,91,94,105,111,100,89,90,93,88,94,106,86,110,94,109,99,98,93,92,106,94,101,107,107,99,108,110,102,106,101,101,97,125,111,99,120,113,113,100,119,114,128,106,94,117,128,109,103,109,101,96,116,142,111,119,120,105,118,97,104,114,110,106,136,130,122,114,105,130,124,103,101,117,108,123,127,119,129,121,125,108,134,104,101,116,115,123,123,110,112,121,97,122,108,87,126,129,112,103,120,98,113,98,83,83,86,73,104,85,75,106,86,95,90,80,64,74,66,85,86,74,76,81,71,86,77,73,66,71,84,68,72,69,84,63,77,76,86,88,85,77,78,78,78,66,81,64,62,75,63,61,76,65,68,69,77,67,67,75,53,59,57,61,60,48,57,52,63,62,47,72,62,57,48,61,60,54,51,51,59,56,56,46,49,36,58,41,45,63,49,53,42,41,50,42,53,44,43,42,31,32,44,34,47,53,21,36,43,36,35,38,28,26,30,31,36,33,34,28,31,24,26,30,31,37,33,26,36,28,37,26,21,25,25,24,16,24,21,14,25,20,25,23,19,27,28,29,22,16,25,23,15,19,24,15,29,16,22,20,24,22,17,20,18,15,27,20,17,22,21,19,21,22,33,13,25,24,18,18,26,25,27,21,21,21,17,12,20,31,34,61,75,74,46,38,18,22,12,18,20,21,16,19,16,18,15,23,15,19,20,29,18,13,22,19,28,27,29,17,24,47,131,511,1570,3215,4371,3461,1674,412,40,10,13,11,14,15,12,14,10,14,9,7,11,10,13,12,15,17,8,9,11,13,14,13,10,6,5,11,8,8,12,8,6,5,8,12,8,5,10,4,12,8,8,5,6,6,6,8,9,11,6,9,11,7,8,13,8,7,12,16,11,12,9,7,6,8,9,9,11,16,5,9,9,11,6,15,6,7,13,7,9,14,47,52,75,90,49,18,10,9,10,6,2,10,4,6,8,9,9,6,14,10,12,8,6,7,15,6,9,11,8,9,11,7,9,10,7,10,10,15,8,5,6,6,6,8,7,10,6,8,10,3,10,4,9,7,7,7,10,13,5,7,9,12,4,8,7,8,10,9,4,6,7,5,8,10,7,6,7,11,8,12,6,10,9,8,7,7,9,4,9,10,12,5,10,9,7,12,3,8,9,7,7,12,3,7,10,12],
    },
    "PACES":{
      "207Bi":[0,0,0,0,0,94,27,3,1,0,1,1,1,2,16,32,30,98,85,81,110,93,102,103,118,165,222,240,268,333,357,412,421,428,449,457,457,462,467,467,443,440,496,466,473,512,491,507,496,513,522,563,591,621,626,686,658,756,903,1073,1209,1128,1239,1316,1136,1050,878,750,699,734,827,862,853,836,795,762,901,2042,2715,2866,3638,1426,423,320,296,299,239,311,428,982,822,441,436,270,224,208,183,196,216,200,176,184,206,190,180,182,175,195,174,169,171,211,180,171,169,152,184,175,150,200,162,174,172,178,188,173,172,177,176,159,132,165,165,179,183,137,154,166,161,166,161,179,153,163,160,158,176,178,180,177,141,156,153,166,165,144,144,157,156,141,122,147,131,160,152,143,138,147,150,128,149,163,161,133,127,146,137,142,137,164,126,131,162,139,128,110,136,144,128,135,128,117,136,148,133,143,131,130,156,148,147,127,123,124,126,146,151,137,117,142,131,126,135,138,141,131,115,136,106,139,133,120,130,129,143,114,123,137,127,118,128,122,106,135,108,127,133,123,111,144,116,121,120,126,133,128,122,125,129,102,138,101,127,120,130,134,117,125,116,114,114,120,118,117,106,120,128,127,125,98,114,125,126,111,132,110,103,99,119,122,117,118,137,136,120,118,120,115,138,112,146,93,89,115,134,125,113,116,104,96,116,103,128,109,112,112,104,129,135,115,121,129,129,125,133,118,133,127,134,123,147,133,121,117,113,121,128,110,129,140,131,136,147,137,113,126,134,132,117,140,129,136,131,136,140,138,129,135,111,121,162,107,137,114,134,124,128,159,117,140,146,146,139,132,128,144,129,129,128,140,151,156,165,136,142,161,154,144,155,142,158,132,150,137,153,154,166,140,162,163,159,169,141,159,147,142,144,102,94,100,86,100,84,85,76,71,71,73,79,95,69,72,73,86,77,78,65,91,81,77,68,79,70,63,78,54,85,75,76,79,66,73,73,66,78,68,70,76,81,81,87,76,63,62,80,67,59,60,72,77,72,78,82,82,57,66,78,63,60,70,68,60,75,44,79,67,79,69,66,60,79,67,82,76,79,70,87,83,101,119,210,284,590,1048,852,298,85,57,50,33,56,58,47,39,54,63,68,58,59,59,59,62,53,50,49,55,52,53,63,50,52,56,55,35,51,49,53,46,44,51,49,52,51,50,50,48,57,44,48,76,64,57,56,36,56,55,52,46,50,52,46,65,53,61,68,50,49,57,56,56,62,71,83,112,214,315,267,160,91,61,66,52,47,61,51,79,88,140,109,74,68,70,63,66,56,46,41,53,45,44,46,42,58,61,40,62,48,40,48,35,44,50,53,39,51,56,41,43,52,50,44,41,47,38,57,57,49,59,52,60,49,42,50,47,44,56,37,38,38,53,47,37,51,46,42,51,49,42,45,54,60,54,53,49,64,50,50,56,57,45,52,48,54,44,51,47,51,48,47,49,46,48,53,56,58,50,48,59,51,51,44,48,42,53,57,68,45,56,51,45,46,44,40,51,56,53,50,44,44,40,46,55,72,49,53,43,52,52,46,55,43,63,40,57,52,64,50,57,47,52,40,55,47,47,55,61,45,45,49,50,58,51,56,44,55,53,63,51,51,50,61,45,37,51,50,50,48,57,55,47,51,63,52,43,51,48,38,51,56,50,44,51,54,46,50,45,46,46,59,47,61,57,47,48,49,63,61,46,45,55,54,41,53,47,51,50,53,55,59,65,51,58,55,57,45,63,58,36,52,55,37,43,62,71,51,63,48,49,46,46,67,63,38,55,60,52,53,63,57,57,42,50,56,51,58,57,56,45,58,57,49,59,57,61,60,54,55,68,74,55,57,51,47,42,55,64,53,60,69,56,61,61,66,60,66,62,56,55,62,61,49,60,65,55,68,55,61,49,53,68,69,54,56,58,61,69,44,63,58,46,43,45,47,38,46,40,36,29,57,27,38,42,39,36,34,44,37,54,42,42,38,43,41,37,51,28,53,34,51,42,47,36,42,40,37,36,39,37,43,43,41,41,49,34,34,30,39,48,37,32,34,31,29,39,50,42,44,29,35,43,36,41,41,42,54,39,29,40,39,39,42,38,47,38,41,42,46,34,41,43,39,54,48,38,42,27,43,31,35,38,30,43,41,46,48,39,53,43,39,67,45,62,63,62,67,69,99,99,155,185,325,481,791,1535,3263,4050,2467,647,100,21,19,19,16,16,20,29,14,23,24,8,16,11,13,16,10,12,14,12,11,15,12,7,11,9,10,7,11,14,9,14,9,11,9,6,14,11,11,11,12,10,14,10,14,12,9,15,10,11,15,15,14,19,13,18,12,26,22,13,15,35,34,48,72,126,201,438,835,963,521,181,83,43,19,20,23,23,60,123,256,238,129,119,85,35,12,2,0,1,1,3,2,1,0,2,2,2,1,3,2,0,1,4,0,1,2,0,1,1,1,0,1,0,1,1,3,0,0,1,0,0,0,0,0,2,0,1,2,1,3,2,0,0,2,1,0,1,1,0,1,3,1,1,1,2,1,1,0,1,0,2,2,0,0,1,1,4,2,1,0,0,3,2,0,0,1,0,0,1,4,0,1,1,2,2,0,3,0,3,0,2,1,0,2,0,1,0,0,0,4,2,1,1,2,0,1,0,2,2,1,0,1,0,1,1,1,2,0,2,1,2,0,4,0,1,0,1,1,1,0,1,0,0,0,1,1,1,1,1,0,0,0,0,1,2,1,0,0,1,0,0,1,1,2,1,1,1,0,0,2,0,0,1,4,1,0,1,1,0,0,0,0,1,3,1,0,0,2,0,1,0,1,0,0,0,0,0,1,0,4,0,0,0,1,1,0,0,0,0,2,2,2,1,0,0,1,1,2,1,1,2,2,1,1,1,1,1,2,1,2,3,1,1,1,1,0,0,2,1,2,0,0,1,1,3,1,2,0,0,0,1,0,2,3,1,0,0,1,0,0,0,0,1,0,0,1,1,0,1,2,0,1,0,2,1,3,1,1,3,3,0,2,0,0,3,1,0,2,1,1,1,3,1,2,1,1,0,4,1,0,0,1,1,0,0,0,2,1,1,0,2,0,1,0,2,1,2,1,1,0,1,4,0,2,1,0,0,2,1,1,1,2,1,0,1,1,0,0,2,1,2,0,0,1,1,3,0,0,0,3,2,1,0,0,1,1,0,0,1,0,1,0,2,2,0,2,0,0,0,0,1,0,0,2,0,0,1,0,2,3,1,1,1,1,0,0,1,1,2,1,1,1,0,1,1,3,0,1,1,1,2,1,1,0,0,1,2,1,3,0,0,2,1,1,0,1,1,1,0,0,0,1,0,0,3,0,0,0,3,2,1,1,0,0,1,0,1,1,0,0,1,1,1,3,0,0,2,1,2,2,1,3,1,0,1,1,1,1,0,0,2,0,2,0,0,0,0,1,0,0,1,0,1,0,3,2,0,0,1,1,0,0,2,0,0,2,1,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,0,1,0,2,9,13,10,3,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0]
    },
    "RCMP":{
      "Triple-Alpha":
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,3,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,1,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,2,0,0,1,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,2,0,1,0,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,1,1,0,0,0,1,0,1,0,0,2,1,1,0,1,0,1,0,1,0,0,1,0,0,0,0,2,1,1,4,2,0,1,2,0,1,0,1,1,1,0,4,2,0,0,1,2,3,6,0,3,4,3,5,4,1,7,1,3,5,3,6,4,5,3,4,5,2,6,2,8,8,6,6,12,11,9,11,9,8,15,13,9,12,16,18,13,12,13,10,11,17,22,17,15,17,23,15,19,10,19,14,22,26,30,23,29,24,27,20,24,21,36,42,30,34,48,46,38,42,52,51,41,54,45,58,45,59,53,56,53,76,65,42,58,73,55,58,59,52,57,65,60,50,58,58,56,56,51,38,40,51,44,46,33,34,39,30,18,30,21,14,16,23,17,14,10,9,11,15,16,8,2,3,9,5,4,4,4,3,4,1,2,3,1,2,0,0,1,0,0,4,1,0,2,0,2,2,0,1,0,0,0,3,1,2,0,1,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,1,1,0,1,0,0,0,0,0,1,0,1,1,0,0,0,0,1,1,0,1,0,0,0,0,0,1,0,0,4,1,0,1,1,1,2,0,2,2,0,0,2,3,2,3,1,1,2,2,1,1,1,6,2,2,1,4,2,1,2,0,0,3,2,5,0,2,2,5,1,6,0,2,4,2,1,2,6,3,3,1,3,5,5,0,2,4,7,5,5,4,3,3,0,1,6,5,11,10,7,12,8,10,9,17,13,9,7,8,16,11,10,14,15,15,7,18,7,14,19,11,21,18,24,21,22,17,22,22,29,22,32,21,34,28,32,17,39,42,35,37,41,35,31,37,60,55,40,60,53,49,51,56,59,69,57,66,49,42,62,59,61,52,67,60,51,42,52,38,46,51,32,37,34,41,38,40,12,25,18,27,23,14,8,20,15,19,13,9,5,7,8,7,6,6,7,4,3,4,3,1,3,1,1,0,2,0,3,3,0,1,0,0,0,1,0,1,0,1,2,0,0,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,3,0,1,0,1,0,1,1,0,1,0,0,0,1,1,0,0,1,0,0,3,2,1,3,1,0,4,1,0,3,0,1,1,5,1,3,5,7,5,2,10,7,6,6,9,10,3,10,8,5,6,11,9,9,11,13,9,14,13,16,17,14,17,9,16,12,13,15,14,18,13,18,14,13,24,20,16,12,22,18,25,24,20,18,22,20,24,18,31,20,31,29,24,24,36,38,33,25,45,30,33,48,41,37,41,38,29,29,28,28,19,31,34,18,31,25,16,32,13,15,13,19,15,11,10,8,11,9,9,8,7,4,6,8,3,2,5,0,3,5,5,1,2,4,2,0,2,1,0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    },
    "ARIES":{
      "26Na": [1,0,0,1,0,0,0,1,1,0,0,1,1,0,0,1,2,4,1,10,139,588,1519,2507,4076,5298,5612,6018,6466,5927,5533,5349,4746,4246,4027,3671,3167,3083,2770,2482,2352,2206,1948,1936,1876,1789,1645,1643,1623,1506,1426,1427,1414,1316,1196,1166,1205,1187,1122,1079,1057,1028,991,986,855,874,858,831,829,751,743,722,700,678,638,648,610,612,578,541,538,566,537,542,468,482,477,532,440,473,443,394,413,385,397,388,374,369,380,359,370,336,326,324,308,315,284,279,348,292,268,281,298,263,297,237,274,248,232,226,213,230,214,214,219,198,203,209,188,184,194,201,191,184,181,178,193,205,158,169,147,172,158,132,155,155,151,144,133,136,139,136,136,122,138,149,140,104,145,108,138,116,127,118,142,105,109,135,112,112,117,115,113,114,117,115,104,93,84,118,86,88,111,101,78,99,78,90,79,100,79,76,87,89,70,74,82,73,80,74,73,79,71,65,77,82,80,65,73,73,79,75,77,58,75,67,67,79,67,69,61,67,64,53,52,60,60,64,70,59,64,63,70,56,54,65,58,51,54,47,52,38,47,44,66,59,55,45,39,59,44,59,54,44,38,48,47,29,52,43,47,60,34,35,39,45,44,43,42,37,44,32,54,46,34,47,37,42,46,42,44,43,39,33,22,33,31,34,36,35,43,35,39,44,45,39,38,31,27,30,33,27,33,33,30,29,25,30,27,28,31,37,39,37,27,27,26,32,30,35,23,37,25,30,27,27,39,23,35,23,23,27,19,27,27,24,22,30,24,16,21,28,26,26,25,27,25,24,24,16,23,32,27,24,29,35,25,30,22,24,22,40,23,21,17,23,20,22,27,20,21,18,21,14,17,23,22,26,25,25,23,23,26,25,27,15,28,20,19,15,15,21,24,22,20,22,24,19,25,22,25,28,21,18,15,26,16,18,18,20,18,22,21,13,20,23,24,18,12,20,11,14,21,13,21,25,9,14,15,15,17,22,16,22,20,19,11,18,16,17,16,14,10,18,14,9,20,14,20,15,10,10,18,15,13,20,18,17,20,16,18,11,17,11,11,10,17,19,9,11,10,17,12,13,18,23,9,17,21,12,11,11,11,8,18,8,13,13,7,19,17,9,16,18,12,11,9,7,10,13,13,18,10,17,16,15,14,6,11,14,13,14,17,11,11,13,13,19,15,11,16,10,14,13,15,10,8,11,13,11,10,11,13,14,10,13,5,10,15,14,9,11,13,17,10,10,5,15,8,10,12,8,8,11,15,12,10,17,10,9,8,9,12,8,20,12,10,8,8,9,11,15,10,11,9,13,8,11,13,6,9,10,6,8,8,11,11,11,7,10,18,15,14,11,6,12,11,7,14,7,8,13,6,10,9,9,6,8,9,6,8,7,9,9,13,9,8,7,9,11,4,15,7,13,7,12,9,8,6,10,13,5,8,8,8,10,13,12,13,9,10,12,7,5,10,6,9,15,7,10,12,15,6,10,9,6,7,7,7,6,12,7,8,5,11,8,9,10,2,5,15,8,6,8,7,6,3,10,8,9,14,9,7,11,5,6,14,6,8,7,9,12,5,10,4,11,12,13,13,12,9,10,9,8,5,6,6,10,8,5,5,6,6,6,8,12,6,10,10,4,6,10,8,5,4,8,8,6,2,7,8,6,12,7,7,7,6,8,7,3,8,9,6,11,3,9,6,8,12,6,5,3,5,4,8,7,13,6,4,2,11,7,7,7,7,6,5,6,13,10,5,7,10,6,11,6,6,12,5,11,13,9,6,12,10,8,12,8,8,2,7,9,8,6,5,9,10,6,5,6,11,6,5,12,15,8,10,4,6,8,8,7,4,6,5,8,8,4,5,9,8,5,10,5,10,11,6,8,7,6,7,4,3,9,7,8,7,11,9,6,7,10,9,11,4,5,6,3,6,6,11,7,4,12,6,7,2,4,5,5,10,7,5,5,8,7,8,6,10,10,6,11,7,7,10,10,7,8,4,6,8,7,8,7,6,6,6,10,6,9,5,10,9,9,4,9,7,2,8,6,9,7,6,9,6,7,9,7,11,5,9,7,10,4,5,4,9,6,7,6,4,2,5,8,8,13,6,5,5,5,8,3,10,3,4,3,7,8,7,5,9,4,7,6,2,4,7,5,10,5,6,11,5,1,8,4,10,7,4,4,6,7,8,7,4,7,3,9,7,7,9,7,6,6,7,8,6,5,4,4,4,5,4,9,6,9,2,5,5,4,1,5,8,5,7,7,5,4,10,4,7,8,6,10,4,9,13,12,8,7,5,8,5,3,5,6,7,8,5,2,5,4,12,11,9,8,6,4,8,6,6,5,6,6,9,5,3,5,6,6,6,8,8,4,1,6,9,8,8,8,6,7,5,6,6,7,5,7,9,3,4,7,5,9,11,6,6,2,6,8,4,5,3,5,4,4,5,2,8,5,9,7,8,10,5,7,7,4,4,5,4,11,2,2,6,8,4,3,11,2,3,7,7,4,5,6,7,3,4,6,5,4,8,7,12,10,2,7,2,7,8,5,7,3,2,6,4,9,6,6,5,6,8,1,4,5,3,7,6,5,4,2,4,4,6,6,1,8,2,8,6,6,3,8,7,7,10,10,7,4,6,8,3,4,3,3,5,8,7,4,4,5,5,2,3,2,5,10,4,2,6,5,4,4,3,9,4,6,4,5,13,1,2,2,3,7,4,9,4,6,6,2,2,3,9,4,4,7,4,6,9,8,9,7,7,6,8,8,4,4,5,4,9,4,5,5,6,6,3,4,3,5,9,4,4,5,5,6,6,5,9,5,3,3,4,4,4,7,3,7,3,7,3,9,7,4,5,4,7,8,5,4,6,4,11,4,6,4,2,5,2,9,5,3,3,6,7,4,5,3,4,4,8,9,4,6,2,8,3,6,7,2,4,2,4,3,7,2,5,1,5,8,5,3,7,6,3,6,5,7,7,3,2,5,6,8,7,9,3,4,5,4,3,2,3,4,3,1,2,3,3,2,5,3,2,5,6,3,3,8,6,4,4,6,4,4,5,4,1,3,3,4,3,3,4,9,7,7,3,6,1,2,8,6,2,3,2,1,3,2,6,4,7,2,9,7,2,1,5,2,4,3,1,6,1,6,4,4,3,0,4,2,7,3,1,4,0,5,6,5,2,5,7,1,6,1,1,2,5,0,5,4,6,5,5,3,4,3,2,3,5,4,2,4,1,5,4,3,1,3,4,2,3,4,5,1,4,7,1,4,3,4,2,1,4,2,1,6,2,2,2,4,4,2,4,6,1,1,2,1,3,3,2,5,1,1,1,2,5,5,2,1,3,4,4,3,4,2,5,0,3,2,6,4,2,5,6,2,0,3,2,0,2,2,2,6,2,2,2,1,4,7,3,4,2,0,2,2,1,3,1,2,1,1,2,7,0,0,4,1,3,0,4,1,2,4,2,5,5,2,3,4,0,4,4,2,2,2,4,2,1,3,1,1,3,4,1,1,2,2,2,2,1,2,2,0,1,3,1,1,2,0,2,0,1,1,1,0,1,0,2,2,3,2,1,2,0,2,2,1,2,2,2,4,1,1,0,1,3,3,2,2,1,1,2,2,1,3,1,2,2,1,0,1,2,0,1,4,2,3,4,1,1,0,1,4,0,0,2,2,2,1,1,2,1,2,0,0,3,0,1,0,3,1,2,2,1,0,3,1,1,0,2,1,0,0,2,4,0,2,0,1,1,0,2,1,1,1,2,4,2,1,3,2,3,1,2,4,4,1,3,1,0,3,2,1,1,3,0,2,1,0,0,5,1,2,1,2,2,0,2,2,2,1,0,1,2,2,1,1,1,1,1,3,2,1,1,0,1,1,2,0,0,2,0,0,2,1,1,3,1,1,0,2,2,1,3,1,1,0,1,3,2,0,1,1,1,0,3,1,0,0,3,2,1,4,3,3,0,1,2,2,1,1,3,3,0,2,3,2,0,2,2,1,3,4,3,0,1,0,0,1,1,1,1,2,1,2,1,1,1,1,2,2,2,0,0,1,2,0,1,1,1,1,2,0,0,1,1,1,1,2,2,0,3,1,3,1,1,1,0,0,3,2,3,0,1,1,2,2,3,1,1,0,1,3,0,0,1,0,2,2,1,0,1,1,1,1,2,0,3,1,1,1,0,1,1,0,0,2,0,0,2,4,1,0,0,1,0,1,1,0,0,0,2,1,0,1,1,0,0,0,1,2,1,0,1,0,2,1,1,0,2,1,0,0,1,2,0,0,0,1,0,1,1,1,0,1,1,0,1,1,0,3,1,1,1,0,2,0,1,1,2,2,0,2,1,0,0,2,2,0,1,2,1,2,1,0,1,0,0,1,2,1,2,0,1,0,1,0,0,1,0,1,1,1,1,0,0,3,0,1,1,0,3,1,2,0,1,0,1,0,2,1,1,0,3,5,1,1,0,1,2,0,2,1,2,2,1,1,1,2,0,0,3,0,1,1,0,1,0,0,0,1,0,0,0,0,0,0]
    },
    "DES_Wall":{
      "11Li": [5,10,11,7,7,17,13,6,12,8,14,14,7,12,10,13,14,12,17,9,23,19,24,24,25,17,29,31,30,27,26,33,35,41,30,52,47,35,53,50,44,52,52,56,59,69,63,58,70,72,84,95,83,85,106,109,97,98,97,132,114,109,109,153,123,115,120,165,150,139,175,154,167,179,176,166,181,196,185,210,187,204,233,221,241,235,239,244,250,237,276,238,291,260,242,272,319,283,285,289,289,278,297,329,319,329,311,322,334,325,340,327,312,358,330,332,351,360,346,364,364,389,379,352,391,393,360,367,395,388,364,391,407,391,333,398,405,406,399,406,403,364,374,424,377,402,361,405,408,406,400,386,424,378,375,381,424,418,379,381,381,367,377,366,343,383,382,398,378,412,392,355,416,354,359,390,345,326,345,353,344,312,330,340,333,334,362,327,310,312,280,296,312,281,295,306,291,291,290,257,282,281,269,268,270,268,257,237,262,265,244,254,229,204,209,216,214,233,223,218,223,229,200,192,216,189,210,184,200,173,167,175,165,170,188,199,180,170,182,162,145,145,151,164,140,143,153,143,162,111,138,119,144,148,142,137,125,143,117,138,137,117,106,132,146,132,148,102,111,115,113,107,110,119,121,115,96,121,120,107,117,97,119,102,113,104,98,83,93,88,82,84,81,81,94,82,85,92,91,74,76,77,94,74,78,72,78,68,68,76,66,78,73,71,81,67,70,66,89,60,79,73,79,72,70,49,70,75,56,73,71,58,62,83,73,67,68,82,82,82,56,70,75,64,49,57,69,72,73,59,66,67,55,74,64,43,55,60,67,60,58,56,59,61,66,65,70,57,70,65,62,61,58,61,67,49,67,51,66,65,60,45,52,66,64,58,66,53,73,58,42,57,48,70,57,59,49,52,63,56,65,61,72,60,52,46,47,51,66,58,62,54,72,62,56,46,59,61,61,38,60,54,59,44,65,58,71,56,59,77,51,60,67,65,59,67,53,57,56,50,60,52,55,69,60,65,62,61,50,70,64,64,57,57,61,55,64,62,60,55,71,51,64,58,68,67,73,73,62,64,58,54,69,71,67,66,67,60,61,61,61,73,70,60,71,56,51,65,63,48,69,66,78,73,68,69,57,77,63,72,72,68,53,61,62,64,74,85,71,64,78,62,90,73,81,70,67,71,76,65,63,73,69,78,67,64,75,81,74,64,62,65,82,63,72,66,78,85,70,75,72,87,75,75,85,85,97,85,69,83,65,65,74,72,86,78,89,71,84,79,77,83,77,73,76,71,81,78,73,68,96,77,72,73,77,66,86,96,59,68,72,68,68,73,80,79,80,83,89,77,78,83,82,79,86,78,79,65,80,79,99,81,96,75,83,91,87,80,80,76,89,78,86,84,85,82,93,80,78,79,86,88,94,77,94,88,83,74,86,88,73,82,72,91,84,86,81,89,96,80,81,82,97,83,88,82,105,80,76,71,88,96,89,80,102,91,102,63,84,94,88,75,92,97,83,83,91,90,89,82,86,93,88,73,83,86,80,98,77,97,84,103,86,84,79,90,101,99,89,103,87,84,86,77,83,80,81,94,83,97,92,80,70,99,103,83,84,90,91,84,81,93,87,104,101,89,100,98,88,89,76,107,91,106,89,97,87,94,85,111,105,94,103,97,97,93,91,87,86,100,109,92,92,118,75,95,103,84,88,102,84,94,98,102,102,82,94,80,93,91,94,76,97,104,98,91,104,82,98,98,94,88,90,74,109,99,83,111,95,103,107,88,103,102,96,87,88,87,95,96,80,88,93,93,96,106,81,100,95,72,85,84,77,96,101,89,73,73,94,97,98,86,103,85,99,109,80,88,95,101,86,83,111,97,92,96,103,106,80,93,95,91,112,92,101,91,96,91,105,87,105,93,112,101,88,102,92,89,68,83,83,77,94,92,96,99,87,120,101,85,99,96,104,104,86,114,96,100,104,98,109,100,89,94,90,84,95,81,98,87,85,81,76,99,93,96,97,92,75,73,96,116,97,119,118,95,102,87,96,101,95,74,78,84,101,102,93,76,90,86,87,100,91,85,81,90,94,81,92,94,88,128,83,94,87,88,74,78,85,99,104,108,78,98,69,88,98,91,86,91,102,92,102,85,92,78,86,89,97,103,71,88,91,103,80,123,86,93,99,79,73,84,93,105,103,109,89,82,98,89,95,96,80,92,87,97,87,82,88,89,86,102,88,89,88,94,96,88,95,101,86,70,84,91,76,91,92,79,82,92,97,83,92,73,60,101,94,82,83,89,84,79,88,90,87,82,88,83,67,96,91,86,85,78,81,98,90,85,88,98,84,95,83,88,98,96,88,88,70,80,80,79,77,79,86,95,98,92,94,67,68,77,93,79,86,71,87,97,78,84,70,91,85,84,69,79,82,76,79,79,82,83,87,96,103,66,80,91,81,74,94,82,104,64,87,92,92,76,95,79,80,81,70,91,83,74,87,86,76,86,89,82,75,72,66,78,92,82,80,85,79,103,86,80,83,85,81,86,95,84,76,93,90,74,74,95,76,88,75,81,95,73,87,93,82,71,76,64,89,88,73,80,100,99,69,82,82,82,77,76,70,76,82,88,84,81,81,91,84,77,84,78,80,84,80,105,70,69,85,85,66,71,68,64,69,76,85,69,87,74,55,83,69,57,82,89,72,67,79,62,72,86,74,81,64,75,74,63,74,79,82,82,77,82,71,55,81,53,58,70,65,64,75,64,69,64,76,64,69,67,81,91,83,82,93,83,80,82,69,60,62,63,78,77,68,74,68,68,73,79,69,67,76,77,65,67,94,59,72,63,78,67,62,67,53,59,61,65,71,70,71,63,85,69,64,72,71,73,71,84,66,63,70,69,79,90,78,80,57,69,60,72,57,62,76,71,67,60,68,72,65,66,84,66,71,74,68,66,64,78,48,64,60,64,59,62,55,80,71,66,67,66,60,68,61,69,67,82,64,74,63,52,57,79,59,64,60,60,75,66,67,70,60,63,68,62,62,61,65,78,67,71,56,60,58,61,49,67,47,50,64,59,70,71,64,78,52,50,59,67,57,72,56,50,65,66,66,60,69,54,57,63,49,76,47,62,53,74,78,62,55,66,63,55,77,57,69,69,84,52,73,59,69,61,51,60,61,50,56,78,67,64,61,58,60,61,72,68,60,56,51,63,68,51,59,73,60,58,70,67,61,63,67,51,54,61,59,57,48,51,52,60,46,55,52,64,58,50,44,47,59,59,55,52,55,47,54,51,43,58,54,53,53,48,56,67,46,51,58,37,51,58,52,42,56,45,47,53,54,61,45,68,39,55,68,66,55,53,42,54,59,61,53,55,47,50,68,56,44,61,41,47,45,62,58,45,66,50,40,54,65,53,50,44,59,62,58,54,55,39,53,38,51,42,40,50,47,54,50,33,50,52,53,42,59,51,49,53,48,57,57,55,44,47,45,51,53,32,51,51,61,58,55,42,42,44,47,62,49,40,44,29,52,45,36,56,38,59,40,58,58,54,46,53,37,46,46,48,47,53,51,51,49,45,54,51,41,50,47,43,49,45,44,48,45,49,43,50,49,46,46,45,44,50,39,44,58,45,41,42,52,59,55,33,50,50,57,44,46,41,49,51,48,45,65,44,57,47,42,51,36,36,44,46,38,36,38,49,50,45,50,37,51,53,51,51,45,43,43,34,53,53,38,42,57,42,42,47,54,49,45,49,45,46,57,59,51,36,44,58,47,39,46,53,48,35,41,46,42,56,42,45,60,44,40,48,45,46,40,47,42,49,34,43,46,45,46,43,36,41,41,44,41,45,39,36,46,28,39,39,37,51,40,49,28,32,43,56,45,35,29,44,39,45,44,46,50,37,50,47,41,46,26,52,36,35,48,31,34,38,33,56,40,35,40,28,42,42,47,43,29,33,36,36,38,34,41,44,40,44,42,41,46,34,43,52,40,30,41,47,49,31,37,38,38,43,39,49,38,44,48,42,41,28,49,41,51,46,42,33,42,30,52,46,45,32,48,30,32,24,35,43,38,30,42,40,42,31,29,35,33,35,37,42,39,44,40,44,47,41,41,29,29,41,38,52,36,48,39,25,32,48,34,44,32,42,46,29,38,45,31,38,42,29,47,28,34,30,42,44,36,31,39,33,45,36,37,43,46,39,30,39,36,39,40,33,41,30,37,37,46,47,27,50,49,42,28,33,39,34,35,28,36,40,33,28,33,37,30,27,36,30,40,33,21,27,43,39,36,25,39,32,32,30,43,34,35,52,30,38,38,41,28,38,23,39,37,24,37,34,38,40,34,36,28,32,35,26,41,39,31,34,29,40,33,24,42,39,33,18,32,38,31,26,26,44,31,21,35,32,26,35,35,25,29,30,35,33,16,42,33,27,34,27,31,44,27,23,33,44,42,45,32,44,24,41,26,37,28,36,26,29,33,31,32,29,32,22,32,32,26,32,31,31,35,26,27,42,40,36,36,32,34,27,30,33,33,29,38,30]
    }
  };

} // end of setupDataStore()
setupDataStore();

function setupnewGainMatcher(detType,sourceType){

  // Save the choices to the dataStore
  dataStore.detectorType = detType;
  dataStore.sourceType = sourceType;

  // Grab the template peak-fitting script to a local copy here
  var thisScript = {};
  thisScript = dataStore.peakFitterScriptTemplate[dataStore.detectorType];

  // Get the user input on histogramFileNames
  thisScript.histogramFileNames.push(document.getElementById('HistoListSelectGRIFFIN').value);

  // Change the 1d peak list to the one for this source
  thisScript.spectrumList1dPeaks.All = [];
  thisScript.spectrumList1dPeaks.All = dataStore.peaksList[dataStore.detectorType][dataStore.sourceType];

  // Setup the peak-fitting script from the template
  receiveScript(JSON.stringify(thisScript));

  // Populate the THESEdetectors array
  dataStore.spectrumList1d.forEach((element) => dataStore.THESEdetectors.push(element.split("_")[0]));

  // Disable user inputs now we have launched the process
  for(var i=0; i<dataStore.histoChoiceBarContents.length; i++){
    var thisTitle = dataStore.histoChoiceBarContents[i];
    document.getElementById('HistoListSelect'+thisTitle).setAttribute('disabled', true);
  }

  // Disable inputs
  for(var i=0; i<dataStore.detectorChoice.length; i++){
    document.getElementById('detectorChoice-'+dataStore.detectorChoice[i].name).setAttribute('disabled', true);
  }
  var keys = Object.keys(dataStore.peaksList[dataStore.detectorType]);
  for(var i=0; i<keys.length; i++){
    if(keys[i].includes("Table")){ continue; }
    document.getElementById('automaticCalibration-'+keys[i]).setAttribute('disabled', true);
  }

  // Start the automatic process
  launchPeakFittingProcess();
}

function launchPeakFittingProcess(){
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


  // Set up the progress tracking
  setupProgressBarTracking();

  ////////////////
  // Set up the menus, reports and display objects
  ////////////////

  // Build the menu list
  var groups = [];

  for(i=0; i<dataStore.spectrumListHistoFileNames.length; i++){
    var histoName = dataStore.spectrumListHistoFileNames[i].split(".")[0];
    // Build the list of spectra for this histogram name
    var thesePlots = [];
    for(j=0; j<dataStore.spectrumList1d.length; j++){
      thesePlots.push(
        {
          "plotID": histoName + ":" + dataStore.spectrumList1d[j],
          "title": dataStore.spectrumList1d[j]
        });
      }
      // Build the top level dropdown for this histogram name
      groups.push({
        "groupID": histoName,
        "groupTitle": histoName,
        "plots": thesePlots
      });
    }
    if(dataStore.spectrumListHistoFileNames.length>1){
      dataStore.plotGroups = groups;     //groups to arrange spectra into for dropdowns
    }else{
      dataStore.plotGroups.push(groups[0]);     //add these groups to arrange spectra into for dropdowns
    }

    // Generate the spectrum lists based on the list of detectors
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();

    // Generate the newGainMatcher report table
    dataStore._newGainMatcherReport = new newGainMatcherReport('newGainMatcher','resultsTableRegion');
    dataStore._newGainMatcherReport.setup();

    // Generate the plot
    dataStore._dataplot[0] = new dataplot('detectorReportPlot',0);
    dataStore._dataplot[0].setup(0);

    // Draw the search region
    dataStore.viewers[dataStore.plots[0]].plotData();

    // Hide the subpages. They need to be not hidden while the templates are injected.
    menuButtonClick(dataStore.buttonIDs[0],0);

    ////////////////
    // Now set up for the start of the process
    ////////////////

    // Plug in the active spectra names for the 1d histograms
    dataStore._plotControl.activeSpectra = [];
    for(var i=0; i<dataStore.spectrumList1d.length; i++){
      dataStore._plotControl.activeSpectra.push(dataStore.spectrumList1d[i]);
    }
    // Plug in the active spectra names for the 2d histograms
    dataStore._plotControl.active2dSpectra = [];
    for(i=0; i<dataStore.spectrumList2d.length; i++){
      dataStore._plotControl.active2dSpectra.push(dataStore.spectrumList2d[i]);
    }

    // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
    dataStore.histoFileName = dataStore.currentHistoFileName = dataStore.spectrumListHistoFileNames[0];

    // Request the Config for this histogram to get the addresses and calibrations needed for building the Cal file
    // This also gets the midas info about this run (title, start time, duration)
    viewConfigOfHisto(dataStore.histoFileName);

    // change information message
    document.getElementById('welcomeMessage').classList.add('hidden');
    document.getElementById('fetchingMessage').classList.remove('hidden');

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'Fetching';

    // Request the first histogram file from the server.
    // This launches a series of promises. Once complete we end with fetchCallback.
    dataStore._plotControl.refreshAll();

  };

  function fetchCallback(){
    // No 2d histograms in this app, so skip straight to processing 1d

    console.log(dataStore);

    if(dataStore.currentTask == 'Setup'){
      // In setup mode so if we got here it is because we are fetching a single spectrum for the reference
      // Just plot it and quit
      var keys = Object.keys(dataStore.rawData);
      var plot = keys[0];
      dataStore.viewers[dataStore.plots[0]].addData(plot, JSON.parse(JSON.stringify(dataStore.rawData[plot])) );
      dataStore.viewers[dataStore.plots[0]].plotData();
      return;
    }

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'roughGainMatch';

    // change information message
    document.getElementById('fetchingMessage').classList.add('hidden');
    document.getElementById('roughGainMatchMessage').classList.remove('hidden');

    // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
    var histoName = dataStore.histoFileName.split(".")[0];
    var spectrumList = [];
    dataStore.spectrumList1d.forEach((element) => spectrumList.push(histoName+":"+element));

    // Update the progress tracking with the roughGainMatch tasks
    dataStore.progressBarNumberTasks += spectrumList.length;

    // Perform a rough gainMatching to a reference spectrum ahead of the whole fitting routine for singles peaks
    //  roughGainMatch(spectrumList,"HPGe","60Co");
    roughGainMatch(spectrumList,dataStore.detectorType,dataStore.sourceType);

  }

  function roughGainMatchCallback(){
    console.log(dataStore);

    // Add the createdSpectra to the menu
    var keys = Object.keys(dataStore.createdSpectra);
    var histoName = dataStore.histoFileName.split(".")[0];
    for(var i=0; i<keys.length; i++){
      newMenuItem = document.createElement('li');
      newMenuItem.setAttribute('id', 'plotList'+keys[i]);
      newMenuItem.setAttribute('value', keys[i]);
      newMenuItem.setAttribute('class', 'list-group-item toggle');
      newMenuItem.innerHTML = keys[i].split(':')[1].trim()+'<span id=\'plotListbadge'+keys[i]+'\' class=\"badge plotPresence hidden\">&#x2713;</span>';
      document.getElementById('plotListplots'+histoName).appendChild(newMenuItem);
      document.getElementById('plotList'+keys[i]).onclick = function(){ dataStore._plotListLite.exclusivePlot(this.id.split('plotList')[1], dataStore.viewers[dataStore.plots[0]]); }
    }


    // Set the current task to keep track of our progress
    dataStore.currentTask = 'SinglesFitting';

    // change information message
    document.getElementById('roughGainMatchMessage').classList.add('hidden');
    document.getElementById('fittingSinglesMessage').classList.remove('hidden');

    // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
    var histoName = dataStore.histoFileName.split(".")[0];
    var spectrumList = [];
    dataStore.spectrumList1d.forEach((element) => spectrumList.push(histoName+":"+element));

    // Build the peaks list
    var thesePeaks = {};
    for(i=0; i<spectrumList.length; i++){
      thesePeaks[spectrumList[i]] = [];
      for(var j=0; j<dataStore.peaksList[dataStore.detectorType][dataStore.sourceType].length; j++){
        thesePeaks[spectrumList[i]][j] = dataStore.peaksList[dataStore.detectorType][dataStore.sourceType][j]/dataStore.roughGainMatchParameters[spectrumList[i]];
      }
    }

    // Start the whole fitting routine for singles peaks
    fitPeaksInSeriesOfHistograms(spectrumList,thesePeaks,dataStore.detectorType);

  }

  function fittingCallback(){
    // All fitting has now been completed

    // Now we are done.
    // Reveal the download buttons
    document.getElementById('saveCSVDiv').classList.remove('hidden');
    document.getElementById('saveScriptDiv').classList.remove('hidden');

    // change information message
    document.getElementById('fittingSinglesMessage').classList.add('hidden');
    document.getElementById('reviewMessage').classList.remove('hidden');

    console.log(dataStore);
    console.log("Finished");
    console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

    // Launch the post-processing
    postProcessGainMatcher();
  }

  function postProcessGainMatcher(){

    // First determine the calibration coefficients from the fitted peaks
    // Linear fit for LaBr3, PACES and RCMP
    // Quadratic fit for HPGe
    var keys = Object.keys(dataStore.fitResults);

    // ARIES calibrations - Insert zero channel 'fit' for ARIES spectra, to enable a linear gain fit with a single 'peak'
    if(dataStore.detectorType == "ARIES"){
      for(var i=0; i<keys.length; i++){
        dataStore.fitResults[keys[i]][1] = dataStore.fitResults[keys[i]][0];
        dataStore.fitResults[keys[i]][0] = [0,0,1,0,0,10,0];

        if(i==0){
          dataStore.peaksList[dataStore.detectorType][dataStore.sourceType][1] = dataStore.peaksList[dataStore.detectorType][dataStore.sourceType][0];
          dataStore.peaksList[dataStore.detectorType][dataStore.sourceType][0] = 0;
        }
      }
    }

    // Most detector calibrations are determined from peak fits.
    // Take the peak fit results from the fitResults object, perform calculations, then put results into THESEcalibrations
    for(var i=0; i<keys.length; i++){
      thisKey = keys[i].split(":")[1].split("_")[0];
      if(!dataStore.THESEcalibrations[thisKey]){ dataStore.THESEcalibrations[thisKey] = {}; }

      // Collect the data for this detector into dataStore.THESEcalibrations
      dataStore.THESEcalibrations[thisKey]['y'] = [];
      dataStore.THESEcalibrations[thisKey]['x'] = [];
      dataStore.THESEcalibrations[thisKey]['xEn'] = [];
      dataStore.THESEcalibrations[thisKey]['residual'] = [];
      dataStore.THESEcalibrations[thisKey]['residualMean'] = 0;
      dataStore.THESEcalibrations[thisKey]['fwhm'] = [];
      dataStore.THESEcalibrations[thisKey]['residualVar'] = 0;
      var k=0;
      for(j=0; j<dataStore.fitResults[keys[i]].length; j++){ // loop over all peaks fitted in this spectrum
        if(isNaN(dataStore.fitResults[keys[i]][j][1])){ continue; } // exclude failed peak fits where the centroid is NaN
        if(dataStore.fitResults[keys[i]][j][5] < 8){ continue; }    // exclude failed peak fits where the area is less than 8 counts
        if(dataStore.fitResults[keys[i]][j][2] < 0.5){ continue; }  // exclude failed peak fits where the sigma (width) is less than 0.5 channels
        if(j>0 && (dataStore.fitResults[keys[i]][j][1]-dataStore.fitResults[keys[i]][j-1][1])<5){
          continue; // exclude peak which was matched to the previous centroid
        }
        if(j<(dataStore.fitResults[keys[i]].length-2) && (dataStore.fitResults[keys[i]][j+1][1]-dataStore.fitResults[keys[i]][j][1])<5){
          continue; // exclude peak which was matched to the next centroid
        }

        // Remember peak centroid and literature energy
        // Remember the fwhm for the resolution plot
        dataStore.THESEcalibrations[thisKey]['x'][k] = dataStore.fitResults[keys[i]][j][1]; // [1] is centroid
        dataStore.THESEcalibrations[thisKey]['y'][k] = dataStore.peaksList[dataStore.detectorType][dataStore.sourceType][j];
        dataStore.THESEcalibrations[thisKey]['fwhm'][k] = dataStore.fitResults[keys[i]][j][6]; // [6] is fwhm
        k++;
      }

      // Construct the data array needed by regression.polynomial
      var data = [];
      for(j=0; j<dataStore.THESEcalibrations[thisKey]['x'].length; j++){
        data.push([dataStore.THESEcalibrations[thisKey]['x'][j],dataStore.THESEcalibrations[thisKey]['y'][j]]);
      }

      if(dataStore.detectorType == "HPGe"){
        // Quadratic fit
        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        var result = regression.polynomial(data, { order: 2, precision: 20 });

        // 'fit': [quad, gain, offset, reduced-chi-square]
        dataStore.THESEcalibrations[thisKey]['fit'] = [result.equation[0],result.equation[1],result.equation[2],1.0];

      }else{
        // Linear fit
        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        var result = regression.polynomial(data, { order: 1, precision: 10 });

        // 'fit': [quad, gain, offset, reduced-chi-square]
        dataStore.THESEcalibrations[thisKey]['fit'] = [0.0,result.equation[0],result.equation[1],1.0];
      }

      // Calculate the residuals of the individual peaks
      for(j=0; j<dataStore.THESEcalibrations[thisKey]['x'].length; j++){
        var energy = dataStore.THESEcalibrations[thisKey]['fit'][0]*dataStore.THESEcalibrations[thisKey]['x'][j]*dataStore.THESEcalibrations[thisKey]['x'][j];
        energy += dataStore.THESEcalibrations[thisKey]['fit'][1]*dataStore.THESEcalibrations[thisKey]['x'][j];
        energy += dataStore.THESEcalibrations[thisKey]['fit'][2];
        dataStore.THESEcalibrations[thisKey]['xEn'][j] = energy;
        dataStore.THESEcalibrations[thisKey]['residual'][j] = energy - dataStore.THESEcalibrations[thisKey]['y'][j];
        dataStore.THESEcalibrations[thisKey]['residualMean'] += Math.abs(dataStore.THESEcalibrations[thisKey]['residual'][j]);
      }
      dataStore.THESEcalibrations[thisKey]['residualMean'] /= dataStore.THESEcalibrations[thisKey]['x'].length;

      // Now we have the mean, we can calculate the variance of the mean
      var mean = dataStore.THESEcalibrations[thisKey].residualMean;
      for(var j=0; j<dataStore.THESEcalibrations[thisKey].residual.length; j++){
        dataStore.THESEcalibrations[thisKey].residualVar +=
        (Math.abs(dataStore.THESEcalibrations[thisKey].residual[j]) - mean) * (Math.abs(dataStore.THESEcalibrations[thisKey].residual[j]) - mean);
      }
      dataStore.THESEcalibrations[thisKey].residualVar /= dataStore.THESEcalibrations[thisKey].residual.length;
    }

    console.log(dataStore);

    // Point to the first detector to load initial subpages content
    if(keys.length==0){
      keys = Object.keys(dataStore.roughGainMatchParameters);
    }
    thisKey = keys[0].split(":")[1].split("_")[0];

    // Now update the Table
    // Display the results in the table
    dataStore._newGainMatcherReport.refreshDetectorTableData(thisKey);

    // Update the tables
    dataStore._newGainMatcherReport.updateFitTable();
    dataStore._newGainMatcherReport.refreshResidualsByPeakPlots();
    dataStore._newGainMatcherReport.refreshResidualsByDetectorPlots();

    // Now plot the resolution data
    dataStore._newGainMatcherReport.refreshResolutionPlot();

    // Reveal the download button
    document.getElementById('saveCalDiv').classList.remove('hidden');

  }

  function updateAnalyzer(){

    // For the ODB it first grabs the PSB table and then sets values only for the channels that are defined there.
    // For the Analyzer we can get a similar list from the viewConfig command with the Histogram file as the argument.
    // That should probably be done for the building of the initial spectrum list for gain-matching if Histogram mode is selected.
    // Need to reformat the URLs generated here for the Analyzer

    // bail out if there's no fit parameters yet
    if(Object.keys(dataStore.fitResultsParameters).length == 0)
    return;

    var NumGe = 64;
    var  gain =[], offset = [], quad = [];
    var i, j=0, q, g, o, num=0, position, urls = [];
    var crystals = ["B","G","R","W"];
    var letter = ["A","B"];

    //for every channel, update the three pileup arrays of parameters:
    // Loop through all Ge crystals
    for(var thisGeindex = 0; thisGeindex<NumGe; thisGeindex++){

      // Start this url, a separate one for each crystal
      urls[num]= dataStore.spectrumServer + '?cmd=setPileupCorrection';

      // Create the channel name for this crystal
      var cloverNum = Math.floor(thisGeindex/4)+1;
      var GeName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0];
      urls[num] += "&channelName0="+GeName;

      // Add the k1 coefficients
      urls[num] += "&pileupk10=";
      for(var i=0; i<dataStore.fitResultsParameters[GeName]['k1'].length; i++){
        if(i>0){ urls[num] += ",";  }
        urls[num] += dataStore.fitResultsParameters[GeName]['k1'][i];
      }

      // Add the k2 coefficients
      urls[num] += "&pileupk20=";
      for(var i=0; i<dataStore.fitResultsParameters[GeName]['k2'].length; i++){
        if(i>0){ urls[num] += ",";  }
        urls[num] += dataStore.fitResultsParameters[GeName]['k2'][i];
      }

      // Add the e1 offset coefficients
      urls[num] += "&pileupE10=";
      for(var i=0; i<dataStore.fitResultsParameters[GeName]['e1'].length; i++){
        if(i>0){ urls[num] += ",";  }
        urls[num] += dataStore.fitResultsParameters[GeName]['e1'][i];
      }

      num++; // move to next url, one for each crystal
    } // end of Ge loop

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
