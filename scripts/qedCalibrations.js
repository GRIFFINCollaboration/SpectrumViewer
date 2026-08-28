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
  dataStore.histoChoiceBarContents = ['22Na'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Pileup Corrections';                                   //header title
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
  dataStore.progressBarKey = "qedCalibrationsProgress";                        // id of the Div with class = "progress-bar ..."
  dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
  dataStore.progressBarTasksCompleted = 0;                           // Number of tasks completed so far for use with the progress bar
  dataStore.refitPeakID = -1;
  dataStore.refitCallback = function(){ setTimeout(postProcessQEDCalibrations(), 1000); }  // callback function for after a peak refit

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

  // qed Calibrations of siliconstrips from Compton scattered 511keV gamma rays coincident with HPGe
  dataStore.peakFitterScriptTemplate["QED-calibration"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [],
    "spectrumList1dPeaks" : {
      "All": []
    },
    "spectrumList2d" : [

      "QED1P00_E_vs_theta", "QED1P01_E_vs_theta", "QED1P02_E_vs_theta", "QED1P03_E_vs_theta", "QED1P04_E_vs_theta", "QED1P05_E_vs_theta",
      "QED1P06_E_vs_theta", "QED1P07_E_vs_theta", "QED1P08_E_vs_theta", "QED1P09_E_vs_theta", "QED1P10_E_vs_theta", "QED1P11_E_vs_theta",
      "QED1P12_E_vs_theta", "QED1P13_E_vs_theta", "QED1P14_E_vs_theta", "QED1P15_E_vs_theta", "QED1P16_E_vs_theta", "QED1P17_E_vs_theta",
      "QED1P18_E_vs_theta", "QED1P19_E_vs_theta", "QED1P20_E_vs_theta", "QED1P21_E_vs_theta", "QED1P22_E_vs_theta", "QED1P23_E_vs_theta",
      "QED1P24_E_vs_theta", "QED1P25_E_vs_theta", "QED1P26_E_vs_theta", "QED1P27_E_vs_theta", "QED1P28_E_vs_theta", "QED1P29_E_vs_theta",
      "QED1P30_E_vs_theta", "QED1P31_E_vs_theta",

      "QED2P00_E_vs_theta", "QED2P01_E_vs_theta", "QED2P02_E_vs_theta", "QED2P03_E_vs_theta", "QED2P04_E_vs_theta", "QED2P05_E_vs_theta",
      "QED2P06_E_vs_theta", "QED2P07_E_vs_theta", "QED2P08_E_vs_theta", "QED2P09_E_vs_theta", "QED2P10_E_vs_theta", "QED2P11_E_vs_theta",
      "QED2P12_E_vs_theta", "QED2P13_E_vs_theta", "QED2P14_E_vs_theta", "QED2P15_E_vs_theta", "QED2P16_E_vs_theta", "QED2P17_E_vs_theta",
      "QED2P18_E_vs_theta", "QED2P19_E_vs_theta", "QED2P20_E_vs_theta", "QED2P21_E_vs_theta", "QED2P22_E_vs_theta", "QED2P23_E_vs_theta",
      "QED2P24_E_vs_theta", "QED2P25_E_vs_theta", "QED2P26_E_vs_theta", "QED2P27_E_vs_theta", "QED2P28_E_vs_theta", "QED2P29_E_vs_theta",
      "QED2P30_E_vs_theta", "QED2P31_E_vs_theta",

      "QED3P00_E_vs_theta", "QED3P01_E_vs_theta", "QED3P02_E_vs_theta", "QED3P03_E_vs_theta", "QED3P04_E_vs_theta", "QED3P05_E_vs_theta",
      "QED3P06_E_vs_theta", "QED3P07_E_vs_theta", "QED3P08_E_vs_theta", "QED3P09_E_vs_theta", "QED3P10_E_vs_theta", "QED3P11_E_vs_theta",
      "QED3P12_E_vs_theta", "QED3P13_E_vs_theta", "QED3P14_E_vs_theta", "QED3P15_E_vs_theta", "QED3P16_E_vs_theta", "QED3P17_E_vs_theta",
      "QED3P18_E_vs_theta", "QED3P19_E_vs_theta", "QED3P20_E_vs_theta", "QED3P21_E_vs_theta", "QED3P22_E_vs_theta", "QED3P23_E_vs_theta",
      "QED3P24_E_vs_theta", "QED3P25_E_vs_theta", "QED3P26_E_vs_theta", "QED3P27_E_vs_theta", "QED3P28_E_vs_theta", "QED3P29_E_vs_theta",
      "QED3P30_E_vs_theta", "QED3P31_E_vs_theta",

      "QED4P00_E_vs_theta", "QED4P01_E_vs_theta", "QED4P02_E_vs_theta", "QED4P03_E_vs_theta", "QED4P04_E_vs_theta", "QED4P05_E_vs_theta",
      "QED4P06_E_vs_theta", "QED4P07_E_vs_theta", "QED4P08_E_vs_theta", "QED4P09_E_vs_theta", "QED4P10_E_vs_theta", "QED4P11_E_vs_theta",
      "QED4P12_E_vs_theta", "QED4P13_E_vs_theta", "QED4P14_E_vs_theta", "QED4P15_E_vs_theta", "QED4P16_E_vs_theta", "QED4P17_E_vs_theta",
      "QED4P18_E_vs_theta", "QED4P19_E_vs_theta", "QED4P20_E_vs_theta", "QED4P21_E_vs_theta", "QED4P22_E_vs_theta", "QED4P23_E_vs_theta",
      "QED4P24_E_vs_theta", "QED4P25_E_vs_theta", "QED4P26_E_vs_theta", "QED4P27_E_vs_theta", "QED4P28_E_vs_theta", "QED4P29_E_vs_theta",
      "QED4P30_E_vs_theta", "QED4P31_E_vs_theta",

      "QED5P00_E_vs_theta", "QED5P01_E_vs_theta", "QED5P02_E_vs_theta", "QED5P03_E_vs_theta", "QED5P04_E_vs_theta", "QED5P05_E_vs_theta",
      "QED5P06_E_vs_theta", "QED5P07_E_vs_theta", "QED5P08_E_vs_theta", "QED5P09_E_vs_theta", "QED5P10_E_vs_theta", "QED5P11_E_vs_theta",
      "QED5P12_E_vs_theta", "QED5P13_E_vs_theta", "QED5P14_E_vs_theta", "QED5P15_E_vs_theta", "QED5P16_E_vs_theta", "QED5P17_E_vs_theta",
      "QED5P18_E_vs_theta", "QED5P19_E_vs_theta", "QED5P20_E_vs_theta", "QED5P21_E_vs_theta", "QED5P22_E_vs_theta", "QED5P23_E_vs_theta",
      "QED5P24_E_vs_theta", "QED5P25_E_vs_theta", "QED5P26_E_vs_theta", "QED5P27_E_vs_theta", "QED5P28_E_vs_theta", "QED5P29_E_vs_theta",
      "QED5P30_E_vs_theta", "QED5P31_E_vs_theta",

      "QED6P00_E_vs_theta", "QED6P01_E_vs_theta", "QED6P02_E_vs_theta", "QED6P03_E_vs_theta", "QED6P04_E_vs_theta", "QED6P05_E_vs_theta",
      "QED6P06_E_vs_theta", "QED6P07_E_vs_theta", "QED6P08_E_vs_theta", "QED6P09_E_vs_theta", "QED6P10_E_vs_theta", "QED6P11_E_vs_theta",
      "QED6P12_E_vs_theta", "QED6P13_E_vs_theta", "QED6P14_E_vs_theta", "QED6P15_E_vs_theta", "QED6P16_E_vs_theta", "QED6P17_E_vs_theta",
      "QED6P18_E_vs_theta", "QED6P19_E_vs_theta", "QED6P20_E_vs_theta", "QED6P21_E_vs_theta", "QED6P22_E_vs_theta", "QED6P23_E_vs_theta",
      "QED6P24_E_vs_theta", "QED6P25_E_vs_theta", "QED6P26_E_vs_theta", "QED6P27_E_vs_theta", "QED6P28_E_vs_theta", "QED6P29_E_vs_theta",
      "QED6P30_E_vs_theta", "QED6P31_E_vs_theta",

      "QED1N00_E_vs_theta", "QED1N01_E_vs_theta", "QED1N02_E_vs_theta", "QED1N03_E_vs_theta", "QED1N04_E_vs_theta", "QED1N05_E_vs_theta",
      "QED1N06_E_vs_theta", "QED1N07_E_vs_theta", "QED1N08_E_vs_theta", "QED1N09_E_vs_theta", "QED1N10_E_vs_theta", "QED1N11_E_vs_theta",
      "QED1N12_E_vs_theta", "QED1N13_E_vs_theta", "QED1N14_E_vs_theta", "QED1N15_E_vs_theta", "QED1N16_E_vs_theta", "QED1N17_E_vs_theta",
      "QED1N18_E_vs_theta", "QED1N19_E_vs_theta", "QED1N20_E_vs_theta", "QED1N21_E_vs_theta", "QED1N22_E_vs_theta", "QED1N23_E_vs_theta",
      "QED1N24_E_vs_theta", "QED1N25_E_vs_theta", "QED1N26_E_vs_theta", "QED1N27_E_vs_theta", "QED1N28_E_vs_theta", "QED1N29_E_vs_theta",
      "QED1N30_E_vs_theta", "QED1N31_E_vs_theta",

      "QED2N00_E_vs_theta", "QED2N01_E_vs_theta", "QED2N02_E_vs_theta", "QED2N03_E_vs_theta", "QED2N04_E_vs_theta", "QED2N05_E_vs_theta",
      "QED2N06_E_vs_theta", "QED2N07_E_vs_theta", "QED2N08_E_vs_theta", "QED2N09_E_vs_theta", "QED2N10_E_vs_theta", "QED2N11_E_vs_theta",
      "QED2N12_E_vs_theta", "QED2N13_E_vs_theta", "QED2N14_E_vs_theta", "QED2N15_E_vs_theta", "QED2N16_E_vs_theta", "QED2N17_E_vs_theta",
      "QED2N18_E_vs_theta", "QED2N19_E_vs_theta", "QED2N20_E_vs_theta", "QED2N21_E_vs_theta", "QED2N22_E_vs_theta", "QED2N23_E_vs_theta",
      "QED2N24_E_vs_theta", "QED2N25_E_vs_theta", "QED2N26_E_vs_theta", "QED2N27_E_vs_theta", "QED2N28_E_vs_theta", "QED2N29_E_vs_theta",
      "QED2N30_E_vs_theta", "QED2N31_E_vs_theta",

      "QED3N00_E_vs_theta", "QED3N01_E_vs_theta", "QED3N02_E_vs_theta", "QED3N03_E_vs_theta", "QED3N04_E_vs_theta", "QED3N05_E_vs_theta",
      "QED3N06_E_vs_theta", "QED3N07_E_vs_theta", "QED3N08_E_vs_theta", "QED3N09_E_vs_theta", "QED3N10_E_vs_theta", "QED3N11_E_vs_theta",
      "QED3N12_E_vs_theta", "QED3N13_E_vs_theta", "QED3N14_E_vs_theta", "QED3N15_E_vs_theta", "QED3N16_E_vs_theta", "QED3N17_E_vs_theta",
      "QED3N18_E_vs_theta", "QED3N19_E_vs_theta", "QED3N20_E_vs_theta", "QED3N21_E_vs_theta", "QED3N22_E_vs_theta", "QED3N23_E_vs_theta",
      "QED3N24_E_vs_theta", "QED3N25_E_vs_theta", "QED3N26_E_vs_theta", "QED3N27_E_vs_theta", "QED3N28_E_vs_theta", "QED3N29_E_vs_theta",
      "QED3N30_E_vs_theta", "QED3N31_E_vs_theta",

      "QED4N00_E_vs_theta", "QED4N01_E_vs_theta", "QED4N02_E_vs_theta", "QED4N03_E_vs_theta", "QED4N04_E_vs_theta", "QED4N05_E_vs_theta",
      "QED4N06_E_vs_theta", "QED4N07_E_vs_theta", "QED4N08_E_vs_theta", "QED4N09_E_vs_theta", "QED4N10_E_vs_theta", "QED4N11_E_vs_theta",
      "QED4N12_E_vs_theta", "QED4N13_E_vs_theta", "QED4N14_E_vs_theta", "QED4N15_E_vs_theta", "QED4N16_E_vs_theta", "QED4N17_E_vs_theta",
      "QED4N18_E_vs_theta", "QED4N19_E_vs_theta", "QED4N20_E_vs_theta", "QED4N21_E_vs_theta", "QED4N22_E_vs_theta", "QED4N23_E_vs_theta",
      "QED4N24_E_vs_theta", "QED4N25_E_vs_theta", "QED4N26_E_vs_theta", "QED4N27_E_vs_theta", "QED4N28_E_vs_theta", "QED4N29_E_vs_theta",
      "QED4N30_E_vs_theta", "QED4N31_E_vs_theta",

      "QED5N00_E_vs_theta", "QED5N01_E_vs_theta", "QED5N02_E_vs_theta", "QED5N03_E_vs_theta", "QED5N04_E_vs_theta", "QED5N05_E_vs_theta",
      "QED5N06_E_vs_theta", "QED5N07_E_vs_theta", "QED5N08_E_vs_theta", "QED5N09_E_vs_theta", "QED5N10_E_vs_theta", "QED5N11_E_vs_theta",
      "QED5N12_E_vs_theta", "QED5N13_E_vs_theta", "QED5N14_E_vs_theta", "QED5N15_E_vs_theta", "QED5N16_E_vs_theta", "QED5N17_E_vs_theta",
      "QED5N18_E_vs_theta", "QED5N19_E_vs_theta", "QED5N20_E_vs_theta", "QED5N21_E_vs_theta", "QED5N22_E_vs_theta", "QED5N23_E_vs_theta",
      "QED5N24_E_vs_theta", "QED5N25_E_vs_theta", "QED5N26_E_vs_theta", "QED5N27_E_vs_theta", "QED5N28_E_vs_theta", "QED5N29_E_vs_theta",
      "QED5N30_E_vs_theta", "QED5N31_E_vs_theta",

      "QED6N00_E_vs_theta", "QED6N01_E_vs_theta", "QED6N02_E_vs_theta", "QED6N03_E_vs_theta", "QED6N04_E_vs_theta", "QED6N05_E_vs_theta",
      "QED6N06_E_vs_theta", "QED6N07_E_vs_theta", "QED6N08_E_vs_theta", "QED6N09_E_vs_theta", "QED6N10_E_vs_theta", "QED6N11_E_vs_theta",
      "QED6N12_E_vs_theta", "QED6N13_E_vs_theta", "QED6N14_E_vs_theta", "QED6N15_E_vs_theta", "QED6N16_E_vs_theta", "QED6N17_E_vs_theta",
      "QED6N18_E_vs_theta", "QED6N19_E_vs_theta", "QED6N20_E_vs_theta", "QED6N21_E_vs_theta", "QED6N22_E_vs_theta", "QED6N23_E_vs_theta",
      "QED6N24_E_vs_theta", "QED6N25_E_vs_theta", "QED6N26_E_vs_theta", "QED6N27_E_vs_theta", "QED6N28_E_vs_theta", "QED6N29_E_vs_theta",
      "QED6N30_E_vs_theta", "QED6N31_E_vs_theta"

    ],
    "spectrumListGates" : [
      ["x",40,50],
      ["x",50,60],
      ["x",60,70],
      ["x",70,80],
      ["x",80,90],
      ["x",90,100],
      ["x",100,110],
      ["x",110,120],
      ["x",120,130],
      ["x",130,140],
      ["x",140,150],
      ["x",150,160],
      ["x",160,170]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[],
      "x-40-50":[118],
      "x-50-60":[153],
      "x-60-70":[193],
      "x-70-80":[218],
      "x-80-90":[246],
      "x-90-100":[267],
      "x-100-110":[285],
      "x-110-120":[301],
      "x-120-130":[313],
      "x-130-140":[321],
      "x-140-150":[330],
      "x-150-160":[335],
      "x-160-170":[340]
    }
  };

  // Compton energies deposited in DSSD pixel for scattering angles of 45, 55, 65, ... 145, 155, 165 degrees.
  dataStore.comptonEnergies = [ 115.8,152.8,187.0,217.5,243.9,266.2,284.8,300.1,312.4,322.2,329.7,335.2,338.7 ];

  // Pagination for the results and plotting display
  // plotRegion = spectra
  // energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
  // energyCalibrator = Table of all (detector num, fit params, r2)
  // graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
  // graphSection = plot of all the residuals for specific peak
  // Variables for Pagination menu buttons
  dataStore.buttonNames = ["Spectra", "Peak-Fitting Results", "per Crystal k-dependance fits", "per Crystal 1st-Hit-dependance fits"];  // Names to appear on the buttons
  dataStore.buttonIDs = ["plotRegionMenuButton", "graphRegionMenuButton", "crystalKRegionMenuButton", "crystal1stHitRegionMenuButton"];    // IDs for the buttons
  dataStore.buttonPages = ["plotRegion", "resultsTableRegion", "crystalKReportRegion", "crystal1stHitReportRegion"];                 // Pages (div IDs) to be associated with the buttons

  // Generate THESEdetectors object. Used for building the coefficients table
  dataStore.numberOfClovers = 16;
  dataStore.THESEdetectors = [];
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

}
setupDataStore();

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

  ///////////////
  // Setup the peakFitting script
  ///////////////

  // Grab the template peak-fitting script to a local copy here
  var thisScript = {};
  thisScript = dataStore.peakFitterScriptTemplate["QED-calibration"];

  // Get the user input on histogramFileNames
  thisScript.histogramFileNames.push(document.getElementById('HistoListSelect22Na').value);

  // Setup the peak-fitting script from the template
  receiveScript(JSON.stringify(thisScript));


  ////////////////
  // Set up the menus, reports and display objects
  ////////////////

  // Set up the progress tracking
  setupProgressBarTracking();

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
    dataStore.plotGroups = groups;     //groups to arrange spectra into for dropdowns

    // Generate the spectrum lists based on the list of detectors
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();

    // Generate the qedCalibrations report table
    dataStore._qedCalibrationsReport = new qedCalibrationsReport('qedCalibrations','crystalKReportRegionqedCalibrationsDetector','crystal1stHitReportRegionqedCalibrationsDetector');
    dataStore._qedCalibrationsReport.setup();

    // Draw the search region
    dataStore.viewers[dataStore.plots[0]].plotData();

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
    document.getElementById('welcomeMessage').classList.add('hidden');
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

      // change information message
      document.getElementById('projectionsMessage').classList.add('hidden');
      document.getElementById('fittingProjectionsMessage').classList.remove('hidden');

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

      // Start the fitting routine for projections peaks for this run file
      fitPeaksInSeriesOfHistograms(theseProjections,dataStore.spectrumListProjectionsPeaks,"QED");
    }

    function fittingCallback(){
      // All fitting has now been completed

      // If we have not recieved the histograms from all files yet, request the histograms from the next filename
      if(dataStore.histoFileName != dataStore.spectrumListHistoFileNames[dataStore.spectrumListHistoFileNames.length-1]){
        dataStore.histoFileName = dataStore.spectrumListHistoFileNames[dataStore.spectrumListHistoFileNames.indexOf(dataStore.histoFileName)+1];

        // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
        dataStore.currentHistoFileName = dataStore.histoFileName;

        // Request the Config for this histogram to get the addresses and calibrations needed for building the Cal file
        // This also gets the midas info about this run (title, start time, duration)
        viewConfigOfHisto(dataStore.histoFileName);

        // Drop as much as possible to reduce overall memory usage
        //clearLocalMemory();

        // Request spectra from the server
        dataStore._plotControl.refreshAll();
        return;
      }

      // Now we are done.
      // Reveal the download buttons
      document.getElementById('saveCSVDiv').classList.remove('hidden');
      document.getElementById('saveScriptDiv').classList.remove('hidden');
      document.getElementById('saveCalFileDiv').classList.remove('hidden');
      document.getElementById('saveJSONDiv').classList.remove('hidden');

      // change information message
      document.getElementById('fittingProjectionsMessage').classList.add('hidden');
      document.getElementById('reviewMessage').classList.remove('hidden');

      console.log(dataStore);
      console.log("Finished");
      console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

      // Reveal the post-processing buttons and report div
      document.getElementById('postProcessDiv').classList.remove('hidden');

      // Launch the post-processing
      postProcessQEDCalibrations();
    }

    function postProcessQEDCalibrations(){
      // Post processing for QED silicon strip calibrations.
      //
      // The matrix is 511keV single Compton scatters between DSSD pixel and HPGe.
      // Y axis is theta angle
      // X axis is silicon strip detected energy
      //
      // Calculate the pulse-height from the DSSD energy and ODB calibration coefficients
      // Calculate expected energies as a function of theta from Compton scattering angle
      // Fit pulse-height vs Expected energy as a quadratic calibration
      console.log("\n\n==============================\n  Post-processing for QED calibration...\n\n");

      // Display the results in the table
      dataStore._qedCalibrationsReport.updateTable();

      // Inject the report card templates and setup
      var NumQED=6;
      var NumStrips=32;
      var polarity = ["P","N"];

      // Loop through all strips of all QED
      for(var thisQEDindex = 1; thisQEDindex<=NumQED; thisQEDindex++){
        for(var thisPolarityindex = 0; thisPolarityindex<polarity.length; thisPolarityindex++){
          for(var thisStripIndex = 0; thisStripIndex<NumStrips; thisStripIndex++){

            var detString = "QED"+thisQEDindex+polarity[thisPolarityindex]+alwaysThisLong(thisStripIndex,2);
            var matrixString = detString+"_E_vs_theta";
            var calibrationString = "QED0"+thisQEDindex+"X"+polarity[thisPolarityindex]+alwaysThisLong(thisStripIndex,2)+"X";
            var data = [];
            var Cstring = "";

            // Get the gain coefficient from the Config calibration needed to convert energy to pulse_height
            // Find the index from the "name" member, then extract the "gain" value
            for(var configIndex=0; configIndex<dataStore.Config.length; configIndex++){
              if(dataStore.Config[configIndex].name == calibrationString){ break; }
            }
            console.log(detString+" has configIndex = "+configIndex);
            var thisQuadFromODB = parseFloat(dataStore.Config[configIndex].quad);
            var thisGainFromODB = parseFloat(dataStore.Config[configIndex].gain);
            var thisOffsetFromODB = parseFloat(dataStore.Config[configIndex].offset);

            // Please to store this data for plotting later
            if(typeof(dataStore.fitResultsData[detString]) == 'undefined'){
              dataStore.fitResultsData[detString] = [];
            }

            // Loop over gate values which are make on the theta axis
            for(var thisGateIndex=0; thisGateIndex<dataStore.peakFitterScriptTemplate["QED-calibration"]["spectrumListGates"].length; thisGateIndex++){
              var thisGateLower = dataStore.peakFitterScriptTemplate["QED-calibration"]["spectrumListGates"][thisGateIndex][1];
              var thisGateUpper = dataStore.peakFitterScriptTemplate["QED-calibration"]["spectrumListGates"][thisGateIndex][2];
              var thisGateCenter = thisGateLower + ((thisGateUpper-thisGateLower)*0.5);

              // Build the key for the
              var projectionString = "x-"+thisGateLower+"-"+thisGateUpper;
              var thisKey = dataStore.histoFileName.split(".")[0]+":"+matrixString+projectionString;
              if(!dataStore.fitResults[thisKey]){ continue; }

              // xValue is the necessary correction to the Energy centroid to match the centroid from the single Hit spectrum
              var thisCentroid = dataStore.fitResults[thisKey][0][1];
              if(isNaN(thisCentroid)){ continue; }
              if(thisQuadFromODB==0 && thisOffsetFromODB==0){
                var xValue = thisCentroid/thisGainFromODB;
              }else{
                var xValue = (-1*thisGainFromODB + Math.sqrt( thisGainFromODB*thisGainFromODB - 4*thisQuadFromODB*thisOffsetFromODB + 4*thisQuadFromODB*thisCentroid)) ;
                if(thisQuadFromODB!=0){ xValue /= (2*thisQuadFromODB); }
              }

              // yValue is Compton energy value.
              var yValue = parseInt(dataStore.comptonEnergies[thisGateIndex]);

              data.push([xValue,yValue]);

              // Save the data for plotting later
              dataStore.fitResultsData[detString].push([xValue,yValue]);
            }

            console.log(data);

            // Perform quadratic fit of the series of y=Compton_energies as a function of x=pulse_height_centroids.
            // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
            var result = regression.polynomial(data, { order: 2, precision: 20 });

            // Save the fit parameter results for accessing and plotting later
            if(typeof(dataStore.fitResultsParameters[detString]) == 'undefined'){
              dataStore.fitResultsParameters[detString] = {};
            }
            dataStore.fitResultsParameters[detString] = result.equation.reverse();

            // Save these parameters to the THESEcalibrations object used by buildCalfile or buildJSONfile
            if(!isNaN(dataStore.fitResultsParameters[detString][1])){
              if(!dataStore.THESEcalibrations[calibrationString]){ dataStore.THESEcalibrations[calibrationString] = {}; }
              if(!dataStore.THESEcalibrations[calibrationString]['fit']){ dataStore.THESEcalibrations[calibrationString].fit = []; }
              dataStore.THESEcalibrations[calibrationString].fit[0] = dataStore.fitResultsParameters[detString][2]; // quad
              dataStore.THESEcalibrations[calibrationString].fit[1] = dataStore.fitResultsParameters[detString][1]; // gain
              dataStore.THESEcalibrations[calibrationString].fit[2] = dataStore.fitResultsParameters[detString][0]; // offset
              //document.getElementById(calibrationString+'write')
            }

          } // end of strip loop
        }
      } // end of QED loop
      console.log(dataStore);

      // Display the results in the Coefficients table
      //dataStore._qedCalibrationsReport.updateCoefficientsTable();

    }
