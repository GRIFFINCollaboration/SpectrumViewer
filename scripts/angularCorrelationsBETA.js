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
  dataStore.pageTitle = 'Angular Correlations';                        //header title
  dataStore.plotGroups = [];                                          // groups used for building the specturm menu (plotlite)
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [];                                                 //buffer for raw matrix data
  dataStore.sparseData = {},                                            //buffer for raw data in sparse data mode
  dataStore.matrix = [];                                                 //buffer for objects containing the uncompressed matrix data
  dataStore.hm = {};                                                 //object for 2d matrix stuff
  dataStore.hm._raw = [];                                                 //buffer for raw matrix data
  dataStore.outputRawFlag = true;                                    // When true binary Matrix data will be unpacked to the rawData.data2 array
  dataStore.outputDenseFlag = false;                                 // When true binary Matrix data will be unpacked to the dataStore.hm._raw and dataStore.hm.raw arrays
  dataStore.outputSparseFlag = false;                                // When true binary Matrix data will be unpacked to the sparseData object
  dataStore.outputDeleteFlag = true;                                 // When true the original arrayBuffer will be deleted from dataStore.rawData
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
    'GRG-GRG-145mm' : {'spectrumList1d' : [
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
      "Ge-Ge_145mm_angular_bin01","Ge-Ge_145mm_angular_bin02","Ge-Ge_145mm_angular_bin03","Ge-Ge_145mm_angular_bin04",

      "Ge-Ge_145mm_angular_bin05","Ge-Ge_145mm_angular_bin06","Ge-Ge_145mm_angular_bin07","Ge-Ge_145mm_angular_bin08","Ge-Ge_145mm_angular_bin09",
      "Ge-Ge_145mm_angular_bin10","Ge-Ge_145mm_angular_bin11","Ge-Ge_145mm_angular_bin12","Ge-Ge_145mm_angular_bin13","Ge-Ge_145mm_angular_bin14",
      "Ge-Ge_145mm_angular_bin15","Ge-Ge_145mm_angular_bin16","Ge-Ge_145mm_angular_bin17","Ge-Ge_145mm_angular_bin18","Ge-Ge_145mm_angular_bin19",
      "Ge-Ge_145mm_angular_bin20","Ge-Ge_145mm_angular_bin21","Ge-Ge_145mm_angular_bin22","Ge-Ge_145mm_angular_bin23","Ge-Ge_145mm_angular_bin24",
      "Ge-Ge_145mm_angular_bin25","Ge-Ge_145mm_angular_bin26",
      "Ge-Ge_145mm_angular_bin27","Ge-Ge_145mm_angular_bin28","Ge-Ge_145mm_angular_bin29",
      "Ge-Ge_145mm_angular_bin30","Ge-Ge_145mm_angular_bin31","Ge-Ge_145mm_angular_bin32","Ge-Ge_145mm_angular_bin33","Ge-Ge_145mm_angular_bin34",
      "Ge-Ge_145mm_angular_bin35","Ge-Ge_145mm_angular_bin36","Ge-Ge_145mm_angular_bin37","Ge-Ge_145mm_angular_bin38","Ge-Ge_145mm_angular_bin39",
      "Ge-Ge_145mm_angular_bin40","Ge-Ge_145mm_angular_bin41","Ge-Ge_145mm_angular_bin42","Ge-Ge_145mm_angular_bin43","Ge-Ge_145mm_angular_bin44",
      "Ge-Ge_145mm_angular_bin45","Ge-Ge_145mm_angular_bin46","Ge-Ge_145mm_angular_bin47","Ge-Ge_145mm_angular_bin48","Ge-Ge_145mm_angular_bin49",
      "Ge-Ge_145mm_angular_bin50","Ge-Ge_145mm_angular_bin51"

    ], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}},

    'GRG-GRG-110mm' : {'spectrumList1d' : [
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
      "Ge-Ge_110mm_angular_bin01","Ge-Ge_110mm_angular_bin02","Ge-Ge_110mm_angular_bin03","Ge-Ge_110mm_angular_bin04",
      "Ge-Ge_110mm_angular_bin05","Ge-Ge_110mm_angular_bin06","Ge-Ge_110mm_angular_bin07","Ge-Ge_110mm_angular_bin08","Ge-Ge_110mm_angular_bin09",
      "Ge-Ge_110mm_angular_bin10","Ge-Ge_110mm_angular_bin11","Ge-Ge_110mm_angular_bin12","Ge-Ge_110mm_angular_bin13","Ge-Ge_110mm_angular_bin14",
      "Ge-Ge_110mm_angular_bin15","Ge-Ge_110mm_angular_bin16","Ge-Ge_110mm_angular_bin17","Ge-Ge_110mm_angular_bin18","Ge-Ge_110mm_angular_bin19",
      "Ge-Ge_110mm_angular_bin20","Ge-Ge_110mm_angular_bin21","Ge-Ge_110mm_angular_bin22","Ge-Ge_110mm_angular_bin23","Ge-Ge_110mm_angular_bin24",
      "Ge-Ge_110mm_angular_bin25","Ge-Ge_110mm_angular_bin26","Ge-Ge_110mm_angular_bin27","Ge-Ge_110mm_angular_bin28","Ge-Ge_110mm_angular_bin29",
      "Ge-Ge_110mm_angular_bin30","Ge-Ge_110mm_angular_bin31","Ge-Ge_110mm_angular_bin32","Ge-Ge_110mm_angular_bin33","Ge-Ge_110mm_angular_bin34",
      "Ge-Ge_110mm_angular_bin35","Ge-Ge_110mm_angular_bin36","Ge-Ge_110mm_angular_bin37","Ge-Ge_110mm_angular_bin38","Ge-Ge_110mm_angular_bin39",
      "Ge-Ge_110mm_angular_bin40","Ge-Ge_110mm_angular_bin41","Ge-Ge_110mm_angular_bin42","Ge-Ge_110mm_angular_bin43","Ge-Ge_110mm_angular_bin44",
      "Ge-Ge_110mm_angular_bin45","Ge-Ge_110mm_angular_bin46","Ge-Ge_110mm_angular_bin47","Ge-Ge_110mm_angular_bin48","Ge-Ge_110mm_angular_bin49",
      "Ge-Ge_110mm_angular_bin50","Ge-Ge_110mm_angular_bin51"

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
  labelsDiv: 'angularCorrelationsPlotLegend',
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
dataStore.angularBinData = [];             // place to store the data value for each angular bin. raw area * bin weight * Normalization
dataStore.angularBinDataUnc = [];          // place to store the data value uncertainty for each angular bin. raw area * bin weight * Normalization
dataStore.angularBinDataResiduals = [];    // place to store the residuals of the data vs best fit
dataStore.singlesPeakArea = [];            // place to store the peak areas from each angular bin
dataStore.singlesPeakAreaUnc = [];            // place to store the peak areas from each angular bin
dataStore.numCrystalPairs = [];            // place to store the number of crystal pairs for each angular bin
dataStore.iteration = 0;
dataStore.bestFitCoeffs = [null,null];              // place to store best fit c2,c4 values
dataStore.minimaDetails = {};            // place to store best fit result values for all series

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
        var matrixNameString = "Ge-Ge_145mm_angular_bin";
      }else{
        dataStore.theseAngularBins = dataStore.angular_bins_110mm;
        dataStore.theseGeAngles = dataStore.ge_angles_110mm;
        dataStore.HPGeDistance = 110;
        var matrixNameString = "Ge-Ge_110mm_angular_bin";
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
        thesePlots.push( { "plotID": histoName + dataStore.THESEdetectors[i] + '_Energy', "title": dataStore.THESEdetectors[i] });
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

        // Generate the spectrum lists based on the list of detectors
        dataStore._plotListLite = new plotListLite('plotList');
        dataStore._plotListLite.setup();

        // Generate the angularCorrelations report table
        dataStore._angularCorrelationsReport = new angularCorrelationsReport('angularCorrelations','resultsTableRegion');
        dataStore._angularCorrelationsReport.setup();

        // Generate the plot
        dataStore._dataplot[0] = new dataplot('detectorReportPlot',0);
        dataStore._dataplot[0].setup(0);

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

        ////////////////
        // Now set up for the start of the fetching process
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

        // change information message
        document.getElementById('welcomeMessage').classList.add('hidden');
        document.getElementById('fetchingMessage').classList.remove('hidden');

        // Set the current task to keep track of our progress
        dataStore.currentTask = 'Fetching';

        // Request the first histogram file from the server.
        // This launches a series of promises. Once complete we end with fetchCallback.
        dataStore._plotControl.refreshAll();

      }

      function launchAngularCorrelations(){
        // This is the start of the automated process
        console.log(dataStore);

        // change messages
        document.getElementById('readyMessage').classList.add('hidden');
        document.getElementById('projectionsMessage').classList.remove('hidden');

        // Get the peak energies from the User input
        var g1E = parseInt(document.getElementById('gamma1Input').value);
        var g2E = parseInt(document.getElementById('gamma2Input').value);

        // Use the higher energy peak as the gate because that will likely give less background
        var gateE = (g1E > g2E) ? g1E : g2E;
        var fitE  = (g1E > g2E) ? g2E : g1E;

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
        for(var i=0; i<thisScript.spectrumList2d.length; i++){
          //  thisScript.spectrumListGates[histoName + ":" + thisScript.spectrumList2d[i]] = [];
          //thisScript.spectrumListGates[thisScript.spectrumList2d[i]] = [];
          //  thisScript.spectrumListGates[thisScript.spectrumList2d[i]].push(["x",gateMin,gateMax,BG1Min,BG1Max,BG2Min,BG2Max]);
        }
        thisScript.spectrumListGates.push(["x",gateMin,gateMax,BG1Min,BG1Max,BG2Min,BG2Max]);

        // Add the peaks for fitting
        thisScript.spectrumList1dPeaks.All.push(fitE);
        thisScript.spectrumList1dPeaks.All.push(gateE);
        thisScript.spectrumListProjectionsPeaks.All.push(fitE);
        thisScript.spectrumListProjectionsPeaks.All.push(gateE);

        // Setup the peak-fitting script from the template
        receiveScript(JSON.stringify(thisScript));

        // Set up the progress tracking
        setupProgressBarTracking();

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
          // No 2d histograms in this app, so skip straight to processing 1d
          console.log("fetchCallback");
          console.log(dataStore);

          // Reveal the gate input controls
          document.getElementById('gateInputsParentDiv').classList.remove('hidden');

          // Plot a single spectrum for determining the gate and fit regions
          var plot = dataStore.histoFileName.split(".")[0] + ":" + dataStore.spectrumList1d[0];
          dataStore.viewers[dataStore.plots[0]].addData(plot, JSON.parse(JSON.stringify(dataStore.rawData[plot])) );
          dataStore.viewers[dataStore.plots[0]].plotData();

          // Set the current task to keep track of our progress
          dataStore.currentTask = 'peakInfoInput';

          // change information message
          document.getElementById('fetchingMessage').classList.add('hidden');
          document.getElementById('readyMessage').classList.remove('hidden');

          // Nothing further to do here on fetchCallback. Further tasks are initiated following User input.
        }

        function projectionsCallback(){
          console.log("ProjectionsCallback");

          // Add this projection spectrum to the list which will be used in processAngularCorrelationData
          dataStore.angCorrProjections = dataStore.spectrumListProjections;

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

          // Start the whole fitting routine for singles peaks
          fitPeaksInSeriesOfHistograms(spectrumList,dataStore.spectrumList1dPeaks,"HPGe");
        }

        function fittingCallback(){
          // Might not be finished all fitting yet because singles and projections fitting is done sequentially.
          if(dataStore.currentTask == 'SinglesFitting'){
            // Now perform peak fitting for projections
            console.log("Now initiate projections fitting");

            // Set the current task to keep track of our progress
            dataStore.currentTask = 'ProjectionsFitting';

            // Start the fitting routine for projections peaks for this run file
            fitPeaksInSeriesOfHistograms(dataStore.angCorrProjections,dataStore.spectrumListProjectionsPeaks,"HPGe");
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

          var sumAngularBinAreas = 0;
          var sumSinglesAreas = [0,0];
          var sumAngularBinAreasUnc = 0;
          var sumSinglesAreasUnc = [0,0];
          //var sumSinglesAreas = [];

          // Collect the angular bin peak areas
          // skip the zero angular difference bin (which is last in the dataStore.angCorrProjections list) - not needed in the sum
          // This list contains both total projection and peak-gated projection
          for(var i=0; i<dataStore.angCorrProjections.length-2; i+=2){
            // Here we make the subtraction of the gateE peak from the fitE peak to account for time-random coincidences
            // Peak index 0 is fitE, index 1 is gateE
            var index = parseInt(i/2);

            // Determine the time-random background subtraction factor from the ratio of the two peaks in the total projection
            // The [i] index is the total projection of each matrix, [i+1] is the projection of gateE.
            dataStore.angularBinTRBGFactor[index] = dataStore.fitResults[dataStore.angCorrProjections[i]][0][5] / dataStore.fitResults[dataStore.angCorrProjections[i]][1][5];
            dataStore.angularBinTRBGFactorUnc[index] = Math.sqrt( Math.pow(dataStore.fitUncertainty[dataStore.angCorrProjections[i]][0]/dataStore.fitResults[dataStore.angCorrProjections[i]][0][5],2)
            + Math.pow(dataStore.fitUncertainty[dataStore.angCorrProjections[i]][1]/dataStore.fitResults[dataStore.angCorrProjections[i]][1][5],2) );

            // Save the raw area and uncertainties for the peak and time-random coincidence peak
            // The [i] index is the total projection of each matrix, [i+1] is the projection of gateE.
            dataStore.angularBinRawPeakArea[index] = dataStore.fitResults[dataStore.angCorrProjections[i+1]][0][5];
            dataStore.angularBinTRBGPeakArea[index] = dataStore.fitResults[dataStore.angCorrProjections[i+1]][1][5];
            dataStore.angularBinRawPeakAreaUnc[index] = dataStore.fitUncertainty[dataStore.angCorrProjections[i+1]][0];
            dataStore.angularBinTRBGPeakAreaUnc[index] = dataStore.fitUncertainty[dataStore.angCorrProjections[i+1]][1];

            // Subtract time-random coincidence from the raw peak area
            dataStore.angularBinPeakArea[index] = dataStore.angularBinRawPeakArea[index] - (dataStore.angularBinTRBGPeakArea[index] * dataStore.angularBinTRBGFactor[index]);
            var secondTerm = ( Math.pow(dataStore.angularBinTRBGPeakAreaUnc[index]/dataStore.angularBinTRBGPeakArea[index],2)
            + Math.pow(dataStore.angularBinTRBGFactorUnc[index]/dataStore.angularBinTRBGFactor[index],2) );
            dataStore.angularBinPeakAreaUnc[index] = Math.sqrt( dataStore.angularBinRawPeakAreaUnc[index]*dataStore.angularBinRawPeakAreaUnc[index] + secondTerm );
            console.log(index+" Ang bin Peak Area Unc "+dataStore.angularBinPeakAreaUnc[index]+" from: "+dataStore.angularBinRawPeakAreaUnc[index]+"/"+dataStore.angularBinRawPeakArea[index]+"="+dataStore.angularBinRawPeakAreaUnc[index]/dataStore.angularBinRawPeakArea[index]);
            console.log(index+" and "+" from: "+dataStore.angularBinTRBGPeakAreaUnc[index]+"/"+dataStore.angularBinTRBGPeakArea[index]+"="+dataStore.angularBinTRBGPeakAreaUnc[index]/dataStore.angularBinTRBGPeakArea[index]);
            console.log(index+" and "+" from: "+dataStore.angularBinTRBGFactorUnc[index]+"/"+dataStore.angularBinTRBGFactor[index]+"="+dataStore.angularBinTRBGFactorUnc[index]/dataStore.angularBinTRBGFactor[index]);
            sumAngularBinAreas += dataStore.angularBinPeakArea[index];
            sumAngularBinAreasUnc += (dataStore.angularBinPeakAreaUnc[index]*dataStore.angularBinPeakAreaUnc[index]);
            dataStore.angularBinWeight[index] = 0;    // zero the weighting factors here
            dataStore.angularBinWeightUnc[index] = 0; // zero the uncertainty in the weighting factors here
            dataStore.numCrystalPairs[index] = 0;     // zero the number of crystal pairs here
          }
          sumAngularBinAreasUnc = Math.sqrt(sumAngularBinAreasUnc); // Squares of the uncertainties were summed in the loop, now find sqrt

          // The normalization factor is the sum of all angular bin peak areas
          dataStore.normalizationFactor = sumAngularBinAreas;
          dataStore.normalizationFactorUnc = sumAngularBinAreasUnc;
          var normalizationFactorUncFraction = Math.pow(Math.sqrt(dataStore.normalizationFactorUnc)/dataStore.normalizationFactor,2);
          console.log("dataStore.normalizationFactor = "+dataStore.normalizationFactor);

          // Collect the singles peak areas from the fitResults object
          for(i=0; i<dataStore.singlesSpectra.length; i++){
            dataStore.singlesPeakArea[i] = [0,0]; // initialize this element
            dataStore.singlesPeakAreaUnc[i] = [0,0]; // initialize this element
            dataStore.singlesPeakArea[i][0] = dataStore.fitResults[dataStore.singlesSpectra[i]][0][5]; // the fit energy peak
            dataStore.singlesPeakArea[i][1] = dataStore.fitResults[dataStore.singlesSpectra[i]][1][5]; // the gate energy peak
            dataStore.singlesPeakAreaUnc[i][0] = dataStore.fitUncertainty[dataStore.singlesSpectra[i]][0]; // the fit energy peak
            dataStore.singlesPeakAreaUnc[i][1] = dataStore.fitUncertainty[dataStore.singlesSpectra[i]][1]; // the gate energy peak
            sumSinglesAreas[0] += dataStore.fitResults[dataStore.singlesSpectra[i]][0][5]; // the fit energy peak
            sumSinglesAreas[1] += dataStore.fitResults[dataStore.singlesSpectra[i]][1][5]; // the gate energy peak
            sumSinglesAreasUnc[0] += (dataStore.fitUncertainty[dataStore.singlesSpectra[i]][0]*dataStore.fitUncertainty[dataStore.singlesSpectra[i]][0]); // the fit energy peak
            sumSinglesAreasUnc[1] += (dataStore.fitUncertainty[dataStore.singlesSpectra[i]][1]*dataStore.fitUncertainty[dataStore.singlesSpectra[i]][1]); // the gate energy peak
          }
          sumSinglesAreasUnc[0] = Math.sqrt(sumSinglesAreasUnc[0]); // sqrt after the sum of squares in the loop
          sumSinglesAreasUnc[1] = Math.sqrt(sumSinglesAreasUnc[1]); // sqrt after the sum of squares in the loop

          console.log(sumAngularBinAreas);
          console.log(sumAngularBinAreasUnc);
          console.log(sumSinglesAreas);
          console.log(sumSinglesAreasUnc);

          console.log(dataStore);

          // Calculate the weighting factors from singles peak areas of all crystals involved in each angular bin
          for(i=0; i<64; i++){
            for(var j=0; j<64; j++){
              var angleIndex = dataStore.theseGeAngles[i][j];
              dataStore.angularBinWeight[angleIndex] += (dataStore.singlesPeakArea[i][0]/sumSinglesAreas[0])*(dataStore.singlesPeakArea[j][1]/sumSinglesAreas[1]) * 0.5;
              dataStore.angularBinWeight[angleIndex] += (dataStore.singlesPeakArea[j][0]/sumSinglesAreas[0])*(dataStore.singlesPeakArea[i][1]/sumSinglesAreas[1]) * 0.5;
              var uncert1 = (dataStore.singlesPeakAreaUnc[i][0]/dataStore.singlesPeakArea[i][0]) * (dataStore.singlesPeakAreaUnc[i][0]/dataStore.singlesPeakArea[i][0]);
              var uncert2 = (dataStore.singlesPeakAreaUnc[j][0]/dataStore.singlesPeakArea[j][0]) * (dataStore.singlesPeakAreaUnc[j][0]/dataStore.singlesPeakArea[j][0]);
              var uncert3 = (dataStore.singlesPeakAreaUnc[i][1]/dataStore.singlesPeakArea[i][1]) * (dataStore.singlesPeakAreaUnc[i][1]/dataStore.singlesPeakArea[i][1]);
              var uncert4 = (dataStore.singlesPeakAreaUnc[j][1]/dataStore.singlesPeakArea[j][1]) * (dataStore.singlesPeakAreaUnc[j][1]/dataStore.singlesPeakArea[j][1]);
              var uncert5 = (sumSinglesAreasUnc[0]/sumSinglesAreas[0]) * (sumSinglesAreasUnc[0]/sumSinglesAreas[0]);
              var uncert6 = (sumSinglesAreasUnc[1]/sumSinglesAreas[1]) * (sumSinglesAreasUnc[1]/sumSinglesAreas[1]);
              dataStore.angularBinWeightUnc[angleIndex] +=  Math.sqrt( uncert1 + uncert2 + uncert3 + uncert4 + uncert5 + uncert6 )
              * ( ((dataStore.singlesPeakArea[i][0]/sumSinglesAreas[0])*(dataStore.singlesPeakArea[j][1]/sumSinglesAreas[1]) * 0.5)
              +((dataStore.singlesPeakArea[j][0]/sumSinglesAreas[0])*(dataStore.singlesPeakArea[i][1]/sumSinglesAreas[1]) * 0.5));
              dataStore.numCrystalPairs[angleIndex]++;
            }
          }

          console.log("Angular Correlation Data:");
          // Calculate the angular correlation data points
          // Also find the min and max values
          var min=10000; var max=0;
          for(i=0; i<dataStore.angularBinPeakArea.length; i++){

            // The uncertainty in the weighting factor of the angular bins is the uncertainties in the peak areas added in quadrature. So we we sqrt the sum of these.
            dataStore.angularBinWeightUnc[i] =  Math.sqrt(dataStore.angularBinWeightUnc[i]) * dataStore.angularBinWeight[i];

            dataStore.angularBinData[i] = dataStore.angularBinPeakArea[i] / (dataStore.angularBinWeight[i] * dataStore.normalizationFactor);
            dataStore.angularBinDataUnc[i] = Math.sqrt(  ((dataStore.angularBinPeakAreaUnc[i]/dataStore.angularBinPeakArea[i]) * (dataStore.angularBinPeakAreaUnc[i]/dataStore.angularBinPeakArea[i]))
            // + ((dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[i]) * (dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[i]))
            // + ((dataStore.normalizationFactorUnc/dataStore.normalizationFactor) * (dataStore.normalizationFactorUnc/dataStore.normalizationFactor))
          )
          * dataStore.angularBinData[i];
          console.log(dataStore.theseAngularBins[i]+","+dataStore.angularBinData[i]+","+dataStore.angularBinDataUnc[i]);
          console.log("Error from "+dataStore.angularBinPeakAreaUnc[i]+"/"+dataStore.angularBinPeakArea[i]+"="+(dataStore.angularBinPeakAreaUnc[i]/dataStore.angularBinPeakArea[i])+", "+dataStore.angularBinWeightUnc[i]+"/"+dataStore.angularBinWeight[i]+"="+(dataStore.angularBinWeightUnc[i]/dataStore.angularBinWeight[i])+", "+dataStore.normalizationFactorUnc+"/"+dataStore.normalizationFactor+"="+(dataStore.normalizationFactorUnc/dataStore.normalizationFactor) );
          if(dataStore.angularBinData[i]<min){ min=dataStore.angularBinData[i]; }
          if(dataStore.angularBinData[i]>max){ max=dataStore.angularBinData[i]; }
        }

        console.log(dataStore.angularBinData);
        console.log(dataStore.angularBinDataUnc);

        // Report the statistics of this correlation
        document.getElementById('dataPlotMessage').innerHTML = "Total gamma-gamma coincidences = "+sumAngularBinAreas.toFixed(0)+", mean peak area in an individual angular bin = "+(sumAngularBinAreas/51).toFixed(0);

        // Trigger the Chi square plot generation and obtain the best fit
        var bestFitCoeffs = generateChiSquareData();
        console.log(bestFitCoeffs);
        dataStore.bestFitCoeffs = bestFitCoeffs;  // Save these here in order to Draw best-fit theory curve on data plot in the callback
        //drawDygraphAngCorrLine(0,bestFitCoeffs[0],bestFitCoeffs[1], '#0096FF'); // Draw best-fit theory curve on data plot

        // Plot the experimental data
        populateDataPlot();

        // Plot the residuals plot
        generateResidualsData(bestFitCoeffs[0],bestFitCoeffs[1]);

        var thisTimeout = setTimeout(populateResidualsPlot,50);

        // Write the results to the Table
        updateChiSquareResultsTable();

        // Show the download button
        document.getElementById('downloadDiv').classList.remove('hidden');
      }

      function generateResidualsData(c2,c4){

        var theorySeries = theoreticalAngularCorrelation(c2,c4, dataStore.theseAngularBinsRadians);

        for(var i=0; i<dataStore.angularBinData.length; i++){
          dataStore.angularBinDataResiduals[i] = dataStore.angularBinData[i] - theorySeries[i];
        }
      }

      function generateChiSquareData(){
        console.log("generateChiSquareData");
        dataStore.theseAngularBinsRadians = [];
        for(var i=0; i<dataStore.theseAngularBins.length; i++){
          dataStore.theseAngularBinsRadians.push(Math.cos(dataStore.theseAngularBins[i]*(Math.PI / 180.000)));
        }

        var thisTheory = [];
        // Declare the variables
        var j1, j2, j3, l1a, l1b, l2a, l2b, delta1, delta2;
        var bestFit = [], pure=0;

        // Grab the user input for the cascade
        var nu=(dataStore.quickDataY.length - 2);
        j1=parseFloat(document.getElementById('j1').value);
        j2=parseFloat(document.getElementById('j2').value);
        j3=parseFloat(document.getElementById('j3').value);
        delta1 = parseFloat(document.getElementById('mix1').value);
        delta2 = parseFloat(document.getElementById('mix2').value);

        // Calculate the l2 momenta
        l2a = l2b = Math.abs(j2-j3);
        if(l2a<1){ l2a = l2b = 1; } // E0 is not permitted
        if((j2+j3)>l2b){ l2b++; }

        var chiSquareSeries = [];
        var minChiSquareSeries = [];
        var thisChiSquare, minChiSquare = 100000;
        var index=0;
        for(j1=0; j1<5; j1++){
          l1a = l1b = Math.abs(j1-j2);
          if(l1a<1){ l1a = l1b = 1; } // E0 is not permitted
          if((j1+j2)>l1b){ l1b++; }
          if(l1a == l1b && l1a == l2a && l1a == l2b){ pure=1; }else{ pure=0; }
          console.log("j1,j2,j3,l1a,l1b,l2a,l2b: "+j1+","+j2+","+j3+","+l1a+","+l1b+","+l2a+","+l2b);
          delta1Series = [];
          chiSquareSeries[index] = [];
          minChiSquareSeries[index] = 100000;
          for(var atanDelta1=-1.5; atanDelta1<=1.5; atanDelta1+=0.01){
            if(atanDelta1>-0.01 && atanDelta1<0.01){ atanDelta1=0.0; }
            delta1Series.push(atanDelta1.toFixed(2));
            if(pure && atanDelta1 != 0){
              chiSquareSeries[index].push(null);
              continue;
            }
            newCoEffs = calculateTheoreticalAngularCorrelationCoefficients(j1, j2, j3, l1a, l1b, l2a, l2b, Math.tan(atanDelta1), delta2);
            //console.log(newCoEffs);
            thisTheory = theoreticalAngularCorrelation(newCoEffs[0],newCoEffs[1], dataStore.theseAngularBinsRadians);
            thisChiSquare = calculateChiSquare(dataStore.angularBinData,dataStore.angularBinDataUnc,thisTheory)/nu;
            chiSquareSeries[index].push(thisChiSquare);
            if(thisChiSquare<minChiSquareSeries[index]){
              minChiSquareSeries[index] = thisChiSquare;
              dataStore.minimaDetails[dataStore.plotStyle[2].labels[index+1]] = {
                'series': dataStore.plotStyle[2].labels[index+1],
                'atanDelta1': atanDelta1.toFixed(4),
                'Delta1': Math.tan(atanDelta1).toFixed(4),
                'chiSquare': thisChiSquare.toFixed(4),
                'bestFitCoeffs': newCoEffs,
              };
              if(thisChiSquare<minChiSquare){ minChiSquare = thisChiSquare; bestFit = newCoEffs; }
            }
          }
          index++;
        }

        console.log([delta1Series,chiSquareSeries]);
        populateChiSquarePlot(delta1Series,chiSquareSeries);

        console.log(dataStore);

        return(bestFit);
      }

      function updateChiSquareResultsTable(){
        //$("chiSquareReportTable tbody tr").remove();
        //  chiSquareReportTable
        var string = "";
        var results = dataStore.minimaDetails;
        var keys = Object.keys(results);

        string = "<h3>Results of chi-square analysis:</h3>";
        for(var i=0; i<keys.length; i++){
          string += "<p>"+results[keys[i]].series+", "+results[keys[i]].chiSquare+", "+results[keys[i]].atanDelta1+", "+results[keys[i]].Delta1+", c2="+results[keys[i]].bestFitCoeffs[0].toFixed(4)+", c4="+results[keys[i]].bestFitCoeffs[1].toFixed(4)+"</p><br>";
        }
        document.getElementById('chiSquareReportTableDiv').innerHTML = string;
      }

      function populateDataPlot(){
        // First determine the residuals by applying the calibration coefficients to the fitted centroid, then comparing it to the literature energy.
        // Save the residuals data to the dataStore, then
        //arrange the latest residual info for representation in the dygraph.

        // Find the plot id for this source
        var thisPlotID = 0;
        console.log('Data for plot'+thisPlotID);

        // The peak energies over all sources are not sequential. So build an
        // object of the peak energies and efficienicies so we can
        // then sort them into energy order before displaying the plot.
        // x value should be the literature energy value
        // y value is raw efficiency normalized to 152Eu

        // Fill the arrays with the data
        for(var i=0; i<dataStore.angularBinData.length; i++){
          dataStore.dataplotDataX[thisPlotID].push( Math.cos(dataStore.theseAngularBins[i]*(Math.PI / 180.000)) );
          dataStore.dataplotDataY[thisPlotID].push( dataStore.angularBinData[i] );
          //dataStore.dataplotDataYUnc[thisPlotID].push( (dataStore.angularBinData[i]+dataStore.angularBinDataUnc[i]),(dataStore.angularBinData[i]-dataStore.angularBinDataUnc[i]) );
          dataStore.dataplotDataYUnc[thisPlotID].push( dataStore.angularBinDataUnc[i] );
        }
        console.log(dataStore.theseAngularBins);
        console.log(dataStore.dataplotDataX[thisPlotID]);
        console.log(dataStore.dataplotDataY[thisPlotID]);
        console.log(dataStore.dataplotDataYUnc[thisPlotID]);

        // Fill the flags array
        var flags = [];
        flags.fillN(0, dataStore.dataplotDataX[thisPlotID].length);

        // Update the Y axis range
        var min = 10000;
        var max = 0.001;
        for(i=0; i<dataStore.dataplotDataY[thisPlotID].length; i++){
          if(dataStore.dataplotDataY[thisPlotID][i]-dataStore.dataplotDataYUnc[thisPlotID][i]<min){  min = dataStore.dataplotDataY[thisPlotID][i]-dataStore.dataplotDataYUnc[thisPlotID][i]; }
          if(dataStore.dataplotDataY[thisPlotID][i]+dataStore.dataplotDataYUnc[thisPlotID][i]>max){  max = dataStore.dataplotDataY[thisPlotID][i]+dataStore.dataplotDataYUnc[thisPlotID][i]; }
        }
        min -= 0.04; if(min<0.001){ min=0.001; }
        max += 0.04; if(max<1){ max=1; }
        dataStore.YAxisMinValue[thisPlotID][0] = min;
        dataStore.YAxisMaxValue[thisPlotID][0] = max;

        // Save the uncertainty data to these arrays for plotting the errorBars
        // The error bars are drawn by the callback function, underlayCallback
        dataStore.angCorrPlotXData[thisPlotID] = dataStore.dataplotDataX[thisPlotID];
        dataStore.angCorrPlotData[thisPlotID] = dataStore.dataplotDataY[thisPlotID];
        dataStore.angCorrPlotDataUnc[thisPlotID] = dataStore.dataplotDataYUnc[thisPlotID];

        // Send the main series data to the plot
        dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.dataplotDataX[thisPlotID], [dataStore.dataplotDataY[thisPlotID]], flags );
        var eventString = 'updateDyData'+thisPlotID;
        console.log(eventString);
        dispatcher({ 'data': dataStore.dataplotData[thisPlotID] }, eventString);

      }

      function populateResidualsPlot(){

        // Find the plot id for this source
        var thisPlotID = 1;
        console.log('Data for plot'+thisPlotID);

        // Fill the arrays with the data
        for(var i=0; i<dataStore.angularBinData.length; i++){
          dataStore.dataplotDataX[thisPlotID].push( Math.cos(dataStore.theseAngularBins[i]*(Math.PI / 180.000)) );
          dataStore.dataplotDataY[thisPlotID].push( dataStore.angularBinDataResiduals[i] );
          //dataStore.dataplotDataYUnc[thisPlotID].push( (dataStore.angularBinData[i]+dataStore.angularBinDataUnc[i]),(dataStore.angularBinData[i]-dataStore.angularBinDataUnc[i]) );
          dataStore.dataplotDataYUnc[thisPlotID].push( dataStore.angularBinDataUnc[i] );
        }

        // Fill the flags array
        var flags = [];
        flags.fillN(0, dataStore.dataplotDataX[thisPlotID].length);

        // Update the Y axis range
        var min = 10;
        var max = -10;
        for(i=0; i<dataStore.dataplotDataY[thisPlotID].length; i++){
          if(dataStore.dataplotDataY[thisPlotID][i]-dataStore.dataplotDataYUnc[thisPlotID][i]<min){  min = dataStore.dataplotDataY[thisPlotID][i]-dataStore.dataplotDataYUnc[thisPlotID][i]; }
          if(dataStore.dataplotDataY[thisPlotID][i]+dataStore.dataplotDataYUnc[thisPlotID][i]>max){  max = dataStore.dataplotDataY[thisPlotID][i]+dataStore.dataplotDataYUnc[thisPlotID][i]; }
        }
        min -= 0.04; if(min<-2){ min=-2; }
        max += 0.04;
        // Now make the Y axis limits symmetric about zero
        if(Math.abs(min)>max){
          max = Math.abs(min);
        }else{
          min = max * -1;
        }
        dataStore.YAxisMinValue[thisPlotID][0] = min;
        dataStore.YAxisMaxValue[thisPlotID][0] = max;

        // Save the uncertainty data to these arrays for plotting the errorBars
        // The error bars are drawn by the callback function, underlayCallback
        dataStore.angCorrPlotXData[thisPlotID] = dataStore.dataplotDataX[thisPlotID];
        dataStore.angCorrPlotData[thisPlotID] = dataStore.dataplotDataY[thisPlotID];
        dataStore.angCorrPlotDataUnc[thisPlotID] = dataStore.dataplotDataYUnc[thisPlotID];

        // Send the main series data to the plot
        dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.dataplotDataX[thisPlotID], [dataStore.dataplotDataY[thisPlotID]], flags );
        var eventString = 'updateDyData'+thisPlotID;
        console.log(eventString);
        dispatcher({ 'data': dataStore.dataplotData[thisPlotID] }, eventString);

      }

      function populateChiSquarePlot(xSeries,ySeries){
        return;
        // Find the plot id for this source
        var thisPlotID = 2;
        console.log('Data for chi-squared plot'+thisPlotID);

        // Fill the arrays with the data
        for(var i=0; i<xSeries.length; i++){
          dataStore.dataplotDataX[thisPlotID].push( xSeries[i] );
          //  var string = ySeries[0][i]+","+ySeries[1][i]+","+ySeries[2][i]+","+ySeries[3][i];
          dataStore.dataplotDataY[thisPlotID].push( ySeries[0][i],ySeries[1][i],ySeries[2][i],ySeries[3][i],ySeries[4][i] );
        }

        // Fill the flags array
        var flags = [];
        flags.fillN(0, dataStore.dataplotDataX[thisPlotID].length);

        // Update the Y axis scale if needed
        var min=100000, max=0.001;
        for(i=1; i<5; i++){
          if(Math.min(...ySeries[i]) < min){ min = Math.min(...ySeries[i]); }
          if(Math.max(...ySeries[i]) > max){ max = Math.max(...ySeries[i]); }
          if(min<0.01){ min=0.01; }
          if(max<10){ max=10; }
        }
        dataStore.YAxisMinValue[thisPlotID][0] = min*0.65;
        dataStore.YAxisMaxValue[thisPlotID][0] = max*1.7;

        // Send the data to the plot
        //  dataStore.dataplotData[thisPlotID] = arrangePoints(dataStore.dataplotDataX[thisPlotID], [dataStore.dataplotDataY[thisPlotID]], flags );
        dataStore.dataplotData[thisPlotID] = arrangePoints(xSeries,ySeries, flags );
        var eventString = 'updateDyData'+thisPlotID;
        console.log(eventString);
        dispatcher({ 'data': dataStore.dataplotData[thisPlotID] }, eventString);
      }

      function buildCSVfile(){
        console.log('Download initiated');
        var keys = Object.keys(dataStore.sourceInfo);

        // Write the table of results to a CSV file for download.
        CSV = '';

        CSV += 'GRIFFIN Gamma-Gamma Angular Correlations Data\n\n';

        // List the run files used for this calibration
        CSV += 'Histogram file:,' + dataStore.histoFileName + '\n';
        CSV += dataStore.detectorType + '\n';

        // Print the column titles
        CSV += '\nAngular Bin Index,';
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
            CSV += Math.sqrt(dataStore.angularBinPeakArea[i]) + ',';
            CSV += dataStore.angularBinWeight[i] + ',';
            CSV += dataStore.normalizationFactor + ',';
            CSV += dataStore.angularBinData[i] + ',';
            CSV += '-' + ', , ,';
            CSV += i + ',';
            CSV += dataStore.gatePeakEnergy + ',';
            CSV += dataStore.singlesPeakArea[i-1][1] + ',';
            CSV += Math.sqrt(dataStore.singlesPeakArea[i-1][1]) + ',';
            CSV += dataStore.fitPeakEnergies[0] + ',';
            CSV += dataStore.singlesPeakArea[i-1][0] + ',';
            CSV += Math.sqrt(dataStore.singlesPeakArea[i-1][0]) + '\n';
          }else{
            CSV += ' , , , , , , , , , , , , , , ,';
            CSV += i + ',';
            CSV += dataStore.gatePeakEnergy + ',';
            CSV += dataStore.singlesPeakArea[i-1][1] + ',';
            CSV += Math.sqrt(dataStore.singlesPeakArea[i-1][1]) + ',';
            CSV += dataStore.fitPeakEnergies[0] + ',';
            CSV += dataStore.singlesPeakArea[i-1][0] + ',';
            CSV += Math.sqrt(dataStore.singlesPeakArea[i-1][0]) + '\n';
          }

        }

        // Create a download link
        const textBlob = new Blob([CSV], {type: 'text/plain'});
        URL.revokeObjectURL(window.textBlobURL);
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(textBlob);
        downloadLink.download = document.getElementById('saveCSVname').value;

        // Trigger the download
        document.body.appendChild(downloadLink);
        downloadLink.click();
      }
