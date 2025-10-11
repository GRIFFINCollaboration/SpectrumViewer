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
  dataStore.histoChoiceBarContents = ['152Eu'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Pileup Corrections';                                   //header title
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
  dataStore.progressBarKey = "pileupCorrectionsProgress";                        // id of the Div with class = "progress-bar ..."
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

  // pileup Corrections for k1, k2 and 1st-Hit energy dependence.
  dataStore.peakFitterScriptTemplate["PU-combined"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [
      "GRG01BN00A_Energy","GRG01GN00A_Energy","GRG01RN00A_Energy","GRG01WN00A_Energy",
      "GRG02BN00A_Energy","GRG02GN00A_Energy","GRG02RN00A_Energy","GRG02WN00A_Energy",
      "GRG03BN00A_Energy","GRG03GN00A_Energy","GRG03RN00A_Energy","GRG03WN00A_Energy",
      "GRG04BN00A_Energy","GRG04GN00A_Energy","GRG04RN00A_Energy","GRG04WN00A_Energy",
      "GRG05BN00A_Energy","GRG05GN00A_Energy","GRG05RN00A_Energy","GRG05WN00A_Energy",
      "GRG06BN00A_Energy","GRG06GN00A_Energy","GRG06RN00A_Energy","GRG06WN00A_Energy",
      "GRG07BN00A_Energy","GRG07GN00A_Energy","GRG07RN00A_Energy","GRG07WN00A_Energy",
      "GRG08BN00A_Energy","GRG08GN00A_Energy","GRG08RN00A_Energy","GRG08WN00A_Energy",
      "GRG09BN00A_Energy","GRG09GN00A_Energy","GRG09RN00A_Energy","GRG09WN00A_Energy",
      "GRG10BN00A_Energy","GRG10GN00A_Energy","GRG10RN00A_Energy","GRG10WN00A_Energy",
      "GRG11BN00A_Energy","GRG11GN00A_Energy","GRG11RN00A_Energy","GRG11WN00A_Energy",
      "GRG12BN00A_Energy","GRG12GN00A_Energy","GRG12RN00A_Energy","GRG12WN00A_Energy",
      "GRG13BN00A_Energy","GRG13GN00A_Energy","GRG13RN00A_Energy","GRG13WN00A_Energy",
      "GRG14BN00A_Energy","GRG14GN00A_Energy","GRG14RN00A_Energy","GRG14WN00A_Energy",
      "GRG15BN00A_Energy","GRG15GN00A_Energy","GRG15RN00A_Energy","GRG15WN00A_Energy",
      "GRG16BN00A_Energy","GRG16GN00A_Energy","GRG16RN00A_Energy","GRG16WN00A_Energy"
    ],
    "spectrumList1dPeaks" : {
      "All": [121,1408]
    },
    "spectrumList2d" : [
      "Ge00_E_vs_k_1st_of_2hit",
      "Ge01_E_vs_k_1st_of_2hit",
      "Ge02_E_vs_k_1st_of_2hit",
      "Ge03_E_vs_k_1st_of_2hit",
      "Ge04_E_vs_k_1st_of_2hit",
      "Ge05_E_vs_k_1st_of_2hit",
      "Ge06_E_vs_k_1st_of_2hit",
      "Ge07_E_vs_k_1st_of_2hit",
      "Ge08_E_vs_k_1st_of_2hit",
      "Ge09_E_vs_k_1st_of_2hit",
      "Ge10_E_vs_k_1st_of_2hit",
      "Ge11_E_vs_k_1st_of_2hit",
      "Ge12_E_vs_k_1st_of_2hit",
      "Ge13_E_vs_k_1st_of_2hit",
      "Ge14_E_vs_k_1st_of_2hit",
      "Ge15_E_vs_k_1st_of_2hit",
      "Ge16_E_vs_k_1st_of_2hit",
      "Ge17_E_vs_k_1st_of_2hit",
      "Ge18_E_vs_k_1st_of_2hit",
      "Ge19_E_vs_k_1st_of_2hit",
      "Ge20_E_vs_k_1st_of_2hit",
      "Ge21_E_vs_k_1st_of_2hit",
      "Ge22_E_vs_k_1st_of_2hit",
      "Ge23_E_vs_k_1st_of_2hit",
      "Ge24_E_vs_k_1st_of_2hit",
      "Ge25_E_vs_k_1st_of_2hit",
      "Ge26_E_vs_k_1st_of_2hit",
      "Ge27_E_vs_k_1st_of_2hit",
      "Ge28_E_vs_k_1st_of_2hit",
      "Ge29_E_vs_k_1st_of_2hit",
      "Ge30_E_vs_k_1st_of_2hit",
      "Ge31_E_vs_k_1st_of_2hit",
      "Ge32_E_vs_k_1st_of_2hit",
      "Ge33_E_vs_k_1st_of_2hit",
      "Ge34_E_vs_k_1st_of_2hit",
      "Ge35_E_vs_k_1st_of_2hit",
      "Ge36_E_vs_k_1st_of_2hit",
      "Ge37_E_vs_k_1st_of_2hit",
      "Ge38_E_vs_k_1st_of_2hit",
      "Ge39_E_vs_k_1st_of_2hit",
      "Ge40_E_vs_k_1st_of_2hit",
      "Ge41_E_vs_k_1st_of_2hit",
      "Ge42_E_vs_k_1st_of_2hit",
      "Ge43_E_vs_k_1st_of_2hit",
      "Ge44_E_vs_k_1st_of_2hit",
      "Ge45_E_vs_k_1st_of_2hit",
      "Ge46_E_vs_k_1st_of_2hit",
      "Ge47_E_vs_k_1st_of_2hit",
      "Ge48_E_vs_k_1st_of_2hit",
      "Ge49_E_vs_k_1st_of_2hit",
      "Ge50_E_vs_k_1st_of_2hit",
      "Ge51_E_vs_k_1st_of_2hit",
      "Ge52_E_vs_k_1st_of_2hit",
      "Ge53_E_vs_k_1st_of_2hit",
      "Ge54_E_vs_k_1st_of_2hit",
      "Ge55_E_vs_k_1st_of_2hit",
      "Ge56_E_vs_k_1st_of_2hit",
      "Ge57_E_vs_k_1st_of_2hit",
      "Ge58_E_vs_k_1st_of_2hit",
      "Ge59_E_vs_k_1st_of_2hit",
      "Ge60_E_vs_k_1st_of_2hit",
      "Ge61_E_vs_k_1st_of_2hit",
      "Ge62_E_vs_k_1st_of_2hit",
      "Ge63_E_vs_k_1st_of_2hit",
      "Ge00_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge01_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge02_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge03_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge04_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge05_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge06_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge07_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge08_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge09_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge10_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge11_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge12_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge13_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge14_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge15_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge16_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge17_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge18_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge19_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge20_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge21_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge22_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge23_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge24_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge25_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge26_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge27_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge28_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge29_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge30_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge31_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge32_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge33_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge34_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge35_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge36_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge37_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge38_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge39_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge40_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge41_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge42_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge43_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge44_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge45_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge46_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge47_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge48_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge49_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge50_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge51_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge52_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge53_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge54_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge55_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge56_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge57_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge58_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge59_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge60_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge61_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge62_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge63_PU2_E2_vs_k2_E1gated_on_Xrays",
      "Ge00_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge01_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge02_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge03_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge04_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge05_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge06_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge07_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge08_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge09_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge10_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge11_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge12_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge13_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge14_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge15_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge16_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge17_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge18_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge19_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge20_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge21_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge22_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge23_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge24_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge25_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge26_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge27_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge28_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge29_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge30_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge31_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge32_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge33_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge34_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge35_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge36_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge37_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge38_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge39_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge40_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge41_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge42_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge43_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge44_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge45_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge46_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge47_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge48_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge49_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge50_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge51_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge52_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge53_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge54_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge55_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge56_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge57_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge58_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge59_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge60_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge61_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge62_PU2_E2_vs_k2_E1gated_on_1408keV",
      "Ge63_PU2_E2_vs_k2_E1gated_on_1408keV"
    ],
    "spectrumListGates" : [
      ["x",0,10],
      ["x",20,30],
      ["x",40,50],
      ["x",60,70],
      ["x",80,90],
      ["x",100,110],
      ["x",120,130],
      ["x",140,150],
      ["x",160,170],
      ["x",180,190],
      ["x",200,210],
      ["x",220,230],
      ["x",240,250],
      ["x",260,270],
      ["x",280,290],
      ["x",300,310],
      ["x",320,330],
      ["x",340,350],
      ["x",360,370]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[1408],
      "Ge00_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge01_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge02_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge03_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge04_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge05_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge06_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge07_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge08_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge09_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge10_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge11_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge12_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge13_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge14_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge15_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge16_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge17_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge18_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge19_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge20_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge21_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge22_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge23_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge24_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge25_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge26_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge27_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge28_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge29_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge30_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge31_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge32_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge33_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge34_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge35_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge36_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge37_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge38_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge39_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge40_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge41_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge42_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge43_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge44_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge45_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge46_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge47_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge48_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge49_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge50_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge51_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge52_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge53_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge54_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge55_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge56_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge57_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge58_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge59_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge60_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge61_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge62_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge63_PU2_E2_vs_k2_E1gated_on_Xrays":[136],
      "Ge00_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge01_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge02_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge03_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge04_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge05_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge06_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge07_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge08_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge09_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge10_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge11_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge12_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge13_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge14_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge15_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge16_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge17_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge18_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge19_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge20_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge21_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge22_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge23_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge24_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge25_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge26_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge27_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge28_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge29_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge30_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge31_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge32_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge33_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge34_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge35_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge36_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge37_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge38_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge39_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge40_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge41_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge42_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge43_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge44_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge45_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge46_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge47_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge48_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge49_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge50_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge51_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge52_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge53_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge54_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge55_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge56_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge57_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge58_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge59_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge60_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge61_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge62_PU2_E2_vs_k2_E1gated_on_1408keV":[136],
      "Ge63_PU2_E2_vs_k2_E1gated_on_1408keV":[136]
    }
  };

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
  thisScript = dataStore.peakFitterScriptTemplate["PU-combined"];

  // Get the user input on histogramFileNames
  thisScript.histogramFileNames.push(document.getElementById('HistoListSelect152Eu').value);

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

    // Generate the pileupCorrections report table
    dataStore._pileupCorrectionsReport = new pileupCorrectionsReport('pileupCorrections','crystalKReportRegionpileupCorrectionsDetector','crystal1stHitReportRegionpileupCorrectionsDetector');
    dataStore._pileupCorrectionsReport.setup();

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
    // Create the objects for each matrix in the local storage
    // createAllLocalMatrices(listOfMatrices,callback);
    createAllLocalMatrices(dataStore.spectrumList2d,createAllLocalMatricesCallback);

  }

  function createAllLocalMatricesCallback(){

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
      projectAllMatrices(projectionsList,false,histoName);
    }

    function projectionsCallback(){

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

      if(dataStore.currentTask == 'SinglesFitting'){
        // Now perform peak fitting for projections

        // change information message
        document.getElementById('fittingSinglesMessage').classList.add('hidden');
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
        fitPeaksInSeriesOfHistograms(theseProjections,dataStore.spectrumListProjectionsPeaks,"HPGe");
        return;
      }

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

      // change information message
      document.getElementById('fittingProjectionsMessage').classList.add('hidden');
      document.getElementById('reviewMessage').classList.remove('hidden');

      // Display the results in the table
      dataStore._pileupCorrectionsReport.updateTable();

      console.log(dataStore);
      console.log("Finished");
      console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

      // Reveal the post-processing buttons nad report div
      document.getElementById('postProcessDiv').classList.remove('hidden');

      // Launch the post-processing
      postProcessPUFirstHit();
    }

    function postProcessPUFirstHit(){
      // Post processing for 2-Hit pileup, 1st Hit correction as function of k.
      //
      // Perform 6th order polynomial fit of correction factor as function of k.
      // Result is function describing correction factor as function of k.

      // Inject the report card templates and setup
      var NumGe=64;

      // Get the keys from the fitResults object.
      // Get the single hit energy
      var keys = Object.keys(dataStore.fitResults);

      // Loop through all Ge crystals
      for(var thisGeindex = 0; thisGeindex<NumGe; thisGeindex++){

        console.log("\n\n==============================\n  Post-processing for pile-up, k1 dependance correction...\n\n");
        var GeString = "Ge" + alwaysThisLong(thisGeindex, 2);
        var matrixString = "_E_vs_k_1st_of_2hitx";
        var data = [];
        var Cstring = "";

        // Get the single hit centroid energy of 1408keV peak for this crystal
        // GRG01BN00A_Energy
        var crystals = ["B","G","R","W"];
        var letter = ["A","B"];
        var cloverNum = Math.floor(thisGeindex/4)+1;
        var GeName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0];
        var GeSingleSpecName = GeName + "_Energy";
        var singleHitEnergy = dataStore.fitResults[dataStore.histoFileName.split(".")[0]+":"+GeSingleSpecName][1][1]+0.5;
        console.log("SinglesEnergy for k1 of "+GeSingleSpecName+" in "+dataStore.histoFileName+" is "+singleHitEnergy);

        /////////////////////////////////////
        // Start of mapping the k1 dependence
        /////////////////////////////////////

        // Please to store this data for plotting later
        if(typeof(dataStore.fitResultsData[GeName]) == 'undefined'){
          dataStore.fitResultsData[GeName] = {};
        }
        if(typeof(dataStore.fitResultsData[GeName]['k1']) == 'undefined'){
          dataStore.fitResultsData[GeName]['k1'] = [];
        }

        // Loop over k1 values
        for(var thisKvalue=5; thisKvalue<380; thisKvalue+=20){

          // Spectrum names of the form: GeX_E_vs_k_1st_of_2hitx where X is Ge number.
          // Kstring will be the projection values in this case.
          var Kstring = "x-"+(parseInt(thisKvalue)-5)+"-"+(parseInt(thisKvalue)+5);

          for(var j=0; j<keys.length; j++){

            if(keys[j].includes(matrixString) && keys[j].includes(GeString) && keys[j].includes(Kstring)){
              // xValue is k value.
              var xValue = parseInt(thisKvalue);

              // yValue is the necessary correction to the Energy centroid to match the centroid from the single Hit spectrum
              var yValue = parseFloat(singleHitEnergy/dataStore.fitResults[keys[j]][0][1]);

              data.push([xValue,yValue]);

              // Save the data for plotting later
              dataStore.fitResultsData[GeName]['k1'].push([xValue,yValue]);
            }
          }
        } // end of k1 loop

        // Add the single hit data point. This seems to be important for getting an accurate fit.
        data.push([379,1.0]);
        dataStore.fitResultsData[GeName]['k1'].push([379,1.0]);

        console.log(data);
        // Perform polynomial fit of the series of y=correction factor as a function of x=k.
        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        var result = regression.polynomial(data, { order: 6, precision: 20 });

        // Save the fit parameter results for accessing and plotting later
        if(typeof(dataStore.fitResultsParameters[GeName]) == 'undefined'){
          dataStore.fitResultsParameters[GeName] = {};
        }
        dataStore.fitResultsParameters[GeName]['k1'] = result.equation.reverse();

        // Test for NaN values and correct to defaults if they are
        if(dataStore.fitResultsParameters[GeName]['k1'].every(isNaN)){
          console.log("\n\n\n\n------------------------\n------------------------\n------------------------ isNaN \n------------------------\n------------------------\n------------------------\n\n\n");
          dataStore.fitResultsParameters[GeName]['k1'] = [1.0,0.0,0.0,0.0,0.0,0.0,0.0];
        }


        /////////////////////////////////////
        // Start of mapping the k2 dependence
        /////////////////////////////////////
        console.log("\n\n==============================\n  Post-processing for pile-up, k2 dependance correction...\n\n");

        // Change to the 2d spectrum for k2 mapping
        var matrixString = "_PU2_E2_vs_k2_E1gated_on_Xraysx";

        // Clear the data array
        data = [];

        // Create the space for saving the data if it does not exist
        if(typeof(dataStore.fitResultsData[GeName]['k2']) == 'undefined'){
          dataStore.fitResultsData[GeName]['k2'] = [];
        }

        // Loop over k2 values
        for(var thisKvalue=5; thisKvalue<380; thisKvalue+=20){

          // Spectrum names of the form: GeX_E_vs_k_1st_of_2hitx where X is Ge number.
          // Kstring will be the projection values in this case.
          var Kstring = "x-"+(parseInt(thisKvalue)-5)+"-"+(parseInt(thisKvalue)+5);

          for(var j=0; j<keys.length; j++){

            if(keys[j].includes(matrixString) && keys[j].includes(GeString) && keys[j].includes(Kstring)){
              // xValue is k value.
              var xValue = parseInt(thisKvalue);

              // yValue is the necessary correction to the Energy centroid to match the centroid from the single Hit spectrum
              var yValue = parseFloat(singleHitEnergy/(dataStore.fitResults[keys[j]][0][1]+1272)); // 1272keV subtracted at histogram filling to reduce matrix size

              data.push([xValue,yValue]);

              // Save the data for plotting later
              dataStore.fitResultsData[GeName]['k2'].push([xValue,yValue]);
              Cstring += yValue + "<br>";
            }
          }
        } // end of k2 loop

        // Add the single hit data point. This seems to be important.
        data.push([379,1.0]);
        dataStore.fitResultsData[GeName]['k2'].push([379,1.0]);

        console.log(data);
        // Perform 6th order polynomial fit of the series of y=correction factor as a function of x=k.
        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        result = regression.polynomial(data, { order: 6, precision: 20 });

        console.log(result.equation);
        console.log(result.string);       //  A string representation of the equation

        // Save the fit parameter results for accessing and plotting later
        dataStore.fitResultsParameters[GeName]['k2'] = result.equation.reverse();

        // Test for NaN values and correct to defaults if they are
        if(dataStore.fitResultsParameters[GeName]['k2'].every(isNaN)){
          console.log("\n\n\n\n------------------------\n------------------------\n------------------------ isNaN \n------------------------\n------------------------\n------------------------\n\n\n");
          dataStore.fitResultsParameters[GeName]['k2'] = [1.0,0.0,0.0,0.0,0.0,0.0,0.0];
        }


        /////////////////////////////////////
        // Start of mapping the e1 offset
        /////////////////////////////////////
        console.log("\n\n==============================\n  Post-processing for pile-up, e1 offset correction...\n\n");

        // Now get the 121keV single hit energy
        singleHitEnergy = dataStore.fitResults[dataStore.histoFileName.split(".")[0]+":"+GeSingleSpecName][0][1]+0.5;
        console.log("SinglesEnergy for k2 of "+GeSingleSpecName+" in "+dataStore.histoFileName+" is "+singleHitEnergy);

        matrixString = "_PU2_E2_vs_k2_E1gated_on_1408keVx";
        data = [];
        var kData =[];
        var mData =[];

        // Create the space for saving the data if it does not exist
        if(typeof(dataStore.fitResultsData[GeName]['e1']) == 'undefined'){
          dataStore.fitResultsData[GeName]['e1'] = [];
        }

        for(var thisKvalue=25; thisKvalue<380; thisKvalue+=20){
          // Kstring will be the projection values in this case.
          var Kstring = "x-"+(parseInt(thisKvalue)-5)+"-"+(parseInt(thisKvalue)+5);

          // Format the data for this detector
          for(var j=0; j<keys.length; j++){

            if(keys[j].includes(matrixString) && keys[j].includes(GeString) && keys[j].includes(Kstring)){

              // Omit failed peak fit results. Test the centroid for NaN or undefined.
              if(isNaN(dataStore.fitResults[keys[j]][0][1])){ continue; }

              // Save the fit results into the object for this detector

              // First apply the k2 correction to the peak centroid.
              // Then find the offset value from the calibrated single-hit centroid.
              var correction = 0.0;
              for(var i=0; i<result.equation.length; i++){
                correction += dataStore.fitResultsParameters[GeName]['k2'][i] * Math.pow(thisKvalue,i);
              }
              var correctedCentroid = dataStore.fitResults[keys[j]][0][1] * correction;

              kData.push(thisKvalue);
              yValue = ((singleHitEnergy-correctedCentroid)/1408.5); // This offset is a fraction of the E1 energy, here the 1408keV gate
              mData.push( yValue );  // The coefficient of the slope term of the equation

              console.log(dataStore.fitResults[keys[j]][0][1]+" corrected with "+correction+" for k="+thisKvalue+" to "+correctedCentroid+" so E1 offset = "+yValue);
            }
          }


        }

        // Perform 6th order polynomial fit of each series of m and c as a function of k.
        console.log("Now fit the m coefficient as a function of k");
        var data = [];
        for(var i=0; i<kData.length; i++){
          data.push([kData[i],mData[i]]);
          // Save the data for plotting later
          dataStore.fitResultsData[GeName]['e1'].push([kData[i],mData[i]]);
        }
        console.log(data);

        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        result = regression.polynomial(data, { order: 6, precision: 20 });

        console.log(result.equation);
        console.log(result.string);       //  A string representation of the equation

        // Save the fit parameter results for accessing and plotting later
        dataStore.fitResultsParameters[GeName]['e1'] = result.equation.reverse();

        // Test for NaN values and correct to defaults if they are
        if(dataStore.fitResultsParameters[GeName]['e1'].every(isNaN)){
          console.log("\n\n\n\n------------------------\n------------------------\n------------------------ isNaN \n------------------------\n------------------------\n------------------------\n\n\n");
          dataStore.fitResultsParameters[GeName]['e1'] = [0.0,0.0,0.0,0.0,0.0,0.0,0.0];
        }

      } // end of Ge loop

      // Construct the C array string
      var Cstring = "";
      // Loop through all Ge crystals
      for(var thisGeindex = 0; thisGeindex<NumGe; thisGeindex++){
        Cstring += "{";

        // Get the single hit centroid energy of 1408keV peak for this crystal
        // GRG01BN00A_Energy
        var crystals = ["B","G","R","W"];
        var letter = ["A","B"];
        var cloverNum = Math.floor(thisGeindex/4)+1;
        var GeName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0];

        for(var i=0; i<dataStore.fitResultsParameters[GeName]['k1'].length; i++){
          if(i>0){ Cstring += ",";  }
          if(isNaN(dataStore.fitResultsParameters[GeName]['k1'][i])){
            Cstring += (i==1) ? 1.0 : 0.0;
          }else{
            Cstring += dataStore.fitResultsParameters[GeName]['k1'][i];
          }
        }
        Cstring += "},<br>\n";
      } // end of Ge loop

      Cstring += "<br>\n";

      // Loop through all Ge crystals
      for(var thisGeindex = 0; thisGeindex<NumGe; thisGeindex++){
        Cstring += "{";

        // Get the single hit centroid energy of 1408keV peak for this crystal
        // GRG01BN00A_Energy
        var crystals = ["B","G","R","W"];
        var letter = ["A","B"];
        var cloverNum = Math.floor(thisGeindex/4)+1;
        var GeName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0];

        for(var i=0; i<dataStore.fitResultsParameters[GeName]['k2'].length; i++){
          if(i>0){ Cstring += ",";  }
          if(isNaN(dataStore.fitResultsParameters[GeName]['k2'][i])){
            Cstring += (i==1) ? 1.0 : 0.0;
          }else{
            Cstring += dataStore.fitResultsParameters[GeName]['k2'][i];
          }
        }
        Cstring += "},<br>\n";
      } // end of Ge loop
      Cstring += "<br>\n";

      // Loop through all Ge crystals
      for(var thisGeindex = 0; thisGeindex<NumGe; thisGeindex++){
        Cstring += "{";

        // Get the single hit centroid energy of 1408keV peak for this crystal
        // GRG01BN00A_Energy
        var crystals = ["B","G","R","W"];
        var letter = ["A","B"];
        var cloverNum = Math.floor(thisGeindex/4)+1;
        var GeName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0];

        for(var i=0; i<dataStore.fitResultsParameters[GeName]['e1'].length; i++){
          if(i>0){ Cstring += ",";  }
          if(isNaN(dataStore.fitResultsParameters[GeName]['e1'][i])){
            Cstring += 0.0;
          }else{
            Cstring += dataStore.fitResultsParameters[GeName]['e1'][i];
          }
        }
        Cstring += "},<br>\n";


                  // Save these parameters to the THESEcalibrations object used by buildCalfile and updateAnalyzer
                  if(!dataStore.THESEcalibrations[GeName]){ dataStore.THESEcalibrations[GeName] = {}; }
                  if(!dataStore.THESEcalibrations[GeName].pileupk1){ dataStore.THESEcalibrations[GeName].pileupk1 = []; dataStore.THESEcalibrations[GeName].pileupk2 = []; dataStore.THESEcalibrations[GeName].pileupE1 = []; }
                //  dataStore.THESEcalibrations[GeName]["crosstalk"+thisMatrixIndex] = dataStore.fitResultsParameters[GeName][thisColor];
                  dataStore.THESEcalibrations[GeName].pileupk1 = dataStore.fitResultsParameters[GeName]['k1'];
                  dataStore.THESEcalibrations[GeName].pileupk2 = dataStore.fitResultsParameters[GeName]['k2'];
                  dataStore.THESEcalibrations[GeName].pileupE1 = dataStore.fitResultsParameters[GeName]['e1'];

      } // end of Ge loop
    //  document.getElementById("postProcessResults").innerHTML = Cstring + "<br>";

      console.log(dataStore);


      // Create the Launch Submit button to begin the process
      newButton = document.createElement('button');
      newButton.setAttribute('id', 'analyzerSubmitButton');
      newButton.setAttribute('class', 'btn btn-default btn-lg');
      newButton.innerHTML = "Write Pileup Corrections to Analyzer";
      newButton.style.padding = '4px';
      newButton.onclick = function(){
        updateAnalyzer();
      }.bind(newButton);
      document.getElementById('postProcessResults').appendChild(newButton);

      // Display the results in the Coefficients table
      dataStore._pileupCorrectionsReport.updateCoefficientsTable();

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

      console.log(urls);

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
/*
    function buildCalfile(){
      console.log('Download initiated');

      // Write the Cal file
      CAL = '';

      for(var i=0; i<dataStore.THESEdetectors.length; i++){
        var GeName = dataStore.THESEdetectors[i];
        var index = dataStore.Config.map(function(e) { return e.name; }).indexOf(GeName);
        if(index<0){ continue; }
        CAL += GeName+' { \n';
        CAL += 'Name:	'+GeName+'\n';
        CAL += 'Number:	'+i+'\n';
        CAL += 'Address:  0x'+dataStore.Config[index].address.toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
        CAL += 'Digitizer:	GRF16\n';
        CAL += 'EngCoeff:	'+dataStore.Config[index].offset+' '+dataStore.Config[index].gain+' '+dataStore.Config[index].quad+'\n';
        if(typeof(dataStore.fitResultsParameters[GeName]['k1']) != "undefined"){
          CAL += 'pileupk1:	'+dataStore.fitResultsParameters[GeName]['k1'][0]+' '+dataStore.fitResultsParameters[GeName]['k1'][1]+' '+dataStore.fitResultsParameters[GeName]['k1'][2];
          CAL +=          ' '+dataStore.fitResultsParameters[GeName]['k1'][3]+' '+dataStore.fitResultsParameters[GeName]['k1'][4]+' '+dataStore.fitResultsParameters[GeName]['k1'][5]+' '+dataStore.fitResultsParameters[GeName]['k1'][6]+'\n';

          CAL += 'pileupk2:	'+dataStore.fitResultsParameters[GeName]['k2'][0]+' '+dataStore.fitResultsParameters[GeName]['k2'][1]+' '+dataStore.fitResultsParameters[GeName]['k2'][2];
          CAL +=          ' '+dataStore.fitResultsParameters[GeName]['k2'][3]+' '+dataStore.fitResultsParameters[GeName]['k2'][4]+' '+dataStore.fitResultsParameters[GeName]['k2'][5]+' '+dataStore.fitResultsParameters[GeName]['k2'][6]+'\n';

          CAL += 'pileupE1:	'+dataStore.fitResultsParameters[GeName]['e1'][0]+' '+dataStore.fitResultsParameters[GeName]['e1'][1]+' '+dataStore.fitResultsParameters[GeName]['e1'][2];
          CAL +=          ' '+dataStore.fitResultsParameters[GeName]['e1'][3]+' '+dataStore.fitResultsParameters[GeName]['e1'][4]+' '+dataStore.fitResultsParameters[GeName]['e1'][5]+' '+dataStore.fitResultsParameters[GeName]['e1'][6]+'\n';
        }else{
          CAL += 'pileupk1:	1 0 0 0 0 0 0\n';
          CAL += 'pileupk2:	1 0 0 0 0 0 0\n';
          CAL += 'pileupE1:	0 0 0 0 0 0 0\n';
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
*/
    function postProcessPUFirst2Hit(){
      // Post processing for 2-Hit pileup, 2nd Hit correction as function of k.
      //
      // Perform 6th order polynomial fit of correction factor as function of k.
      // Result is function describing correction factor as function of k.
      console.log("\n\n==============================\n  Post-processing for pile-up, k dependance correction...\n\n");

      // Inject the report card templates and setup


      // Get the keys from the fitResults object.
      var keys = Object.keys(dataStore.fitResults);

      // Loop through all Ge crystals
      for(var thisGeindex = 0; thisGeindex<8; thisGeindex++){
        var GeNum = 1;
        var GeString = "Ge" + alwaysThisLong(GeNum, 2);
        var matrixString = "_PU2_E2_vs_k2_E1gated_on_x-raysx";
        var data = [];


        var Cstring = "";

        // Get the single hit centroid energy of 1408keV peak for this crystal
        // GRG01BN00A_Energy
        var crystals = ["B","G","R","W"];
        var letter = ["A","B"];
        var cloverNum = Math.floor(thisGeindex/4)+1;
        var GeSingleSpecName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0] + "_Energy";
        var singleHitEnergy = dataStore.fitResults[dataStore.histoFileName.split(".")[0]+":"+GeSingleSpecName][0][1];
        console.log("SinglesEnergy for "+GeSingleSpecName+" in "+dataStore.histoFileName+" is "+singleHitEnergy);

        for(var thisKvalue=5; thisKvalue<380; thisKvalue+=20){

          // Spectrum names of the form: GeX_E_vs_k_1st_of_2hitx where X is Ge number.
          // Kstring will be the projection values in this case.
          var Kstring = "x-"+(parseInt(thisKvalue)-5)+"-"+(parseInt(thisKvalue)+5);

          for(var j=0; j<keys.length; j++){

            if(keys[j].includes(matrixString) && keys[j].includes(GeString) && keys[j].includes(Kstring)){
              // xValue is k value.
              var xValue = parseInt(thisKvalue);

              // yValue is the necessary correction to the Energy centroid to match the centroid from the single Hit spectrum
              var yValue = parseFloat(1.0-(dataStore.fitResults[keys[j]][0][1]/singleHitEnergy)+1.0);

              data.push([xValue,yValue]);
              Cstring += yValue + "<br>";
            }
          }
        }

        // Add the single hit data point. This seems to be important.
        data.push([379,1.0]);

        console.log(data);
        // Perform 6th order polynomial fit of the series of y=correction factor as a function of x=k.
        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        const result = regression.polynomial(data, { order: 3, precision: 20 });

        console.log(result.equation);
        console.log(result.string);       //  A string representation of the equation

        // Save the Cstring.
        // An array of the parameters for this HPGe
        Cstring += "<br>{"
        for(var i=result.equation.length-1; i>=0; i--){ Cstring += result.equation[i]; if(i>0){ Cstring += ","; } }
        Cstring += "},";

        console.log(Cstring);
      } // End of Ge loop

      document.getElementById("postProcessResults").innerHTML = Cstring + "<br>";
    }
