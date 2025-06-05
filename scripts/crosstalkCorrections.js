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
  dataStore.histoChoiceBarContents = ['60Co'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Crosstalk Corrections';                                   //header title
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
  dataStore.progressBarKey = "crosstalkCorrectionsProgress";                        // id of the Div with class = "progress-bar ..."
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

  // crosstalk Corrections for k1, k2 and 1st-Hit energy dependence.
  dataStore.peakFitterScriptTemplate["crosstalkClover1Only"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [],
    "spectrumList1dPeaks" : {
      "All": []
    },
    "spectrumList2d" : [
      "Crosstalk_Green_E_vs_dt_Ge00","Crosstalk_Red_E_vs_dt_Ge00","Crosstalk_White_E_vs_dt_Ge00",
      "Crosstalk_Blue_E_vs_dt_Ge01",                               "Crosstalk_Red_E_vs_dt_Ge01","Crosstalk_White_E_vs_dt_Ge01",
      "Crosstalk_Blue_E_vs_dt_Ge02","Crosstalk_Green_E_vs_dt_Ge02",                             "Crosstalk_White_E_vs_dt_Ge02",
      "Crosstalk_Blue_E_vs_dt_Ge03","Crosstalk_Green_E_vs_dt_Ge03","Crosstalk_Red_E_vs_dt_Ge03"
    ],
    "spectrumListGates" : [
      ["y",2250,2300],
      ["y",2200,2250],
      ["y",2150,2200],
      ["y",2100,2150],
      ["y",2050,2100],
      ["y",2000,2050],
      ["y",1950,2000],
      ["y",1900,1950],
      ["y",1850,1900],
      ["y",1800,1850],
      ["y",1750,1800],
      ["y",1700,1750],
      ["y",1650,1700],
      ["y",1600,1650],
      ["y",1550,1600],
      ["y",1500,1550],
      ["y",1450,1500],
      ["y",1400,1450],
      ["y",1350,1400],
      ["y",1300,1350],
      ["y",1250,1300],
      ["y",1200,1250],
      ["y",1150,1200],
      ["y",1100,1150],
      ["y",1050,1100],
      ["y",1000,1050],
      ["y",950,1000],
      ["y",900,950],
      ["y",850,900],
      ["y",800,850],
      ["y",750,800],
      ["y",700,750],
      ["y",650,700],
      ["y",600,650],
      ["y",550,600],
      ["y",100,500]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[73]
    }
  };
  dataStore.peakFitterScriptTemplate["crosstalk"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [],
    "spectrumList1dPeaks" : {
      "All": []
    },
    "spectrumList2d" : [
      "Crosstalk_Green_E_vs_dt_Ge00","Crosstalk_Red_E_vs_dt_Ge00","Crosstalk_White_E_vs_dt_Ge00",
      "Crosstalk_Blue_E_vs_dt_Ge01",                               "Crosstalk_Red_E_vs_dt_Ge01","Crosstalk_White_E_vs_dt_Ge01",
      "Crosstalk_Blue_E_vs_dt_Ge02","Crosstalk_Green_E_vs_dt_Ge02",                             "Crosstalk_White_E_vs_dt_Ge02",
      "Crosstalk_Blue_E_vs_dt_Ge03","Crosstalk_Green_E_vs_dt_Ge03","Crosstalk_Red_E_vs_dt_Ge03",

      "Crosstalk_Green_E_vs_dt_Ge04","Crosstalk_Red_E_vs_dt_Ge04","Crosstalk_White_E_vs_dt_Ge04",
      "Crosstalk_Blue_E_vs_dt_Ge05",                               "Crosstalk_Red_E_vs_dt_Ge05","Crosstalk_White_E_vs_dt_Ge05",
      "Crosstalk_Blue_E_vs_dt_Ge06","Crosstalk_Green_E_vs_dt_Ge06",                             "Crosstalk_White_E_vs_dt_Ge06",
      "Crosstalk_Blue_E_vs_dt_Ge07","Crosstalk_Green_E_vs_dt_Ge07","Crosstalk_Red_E_vs_dt_Ge07",

      "Crosstalk_Green_E_vs_dt_Ge08","Crosstalk_Red_E_vs_dt_Ge08","Crosstalk_White_E_vs_dt_Ge08",
      "Crosstalk_Blue_E_vs_dt_Ge09",                               "Crosstalk_Red_E_vs_dt_Ge09","Crosstalk_White_E_vs_dt_Ge09",
      "Crosstalk_Blue_E_vs_dt_Ge10","Crosstalk_Green_E_vs_dt_Ge10",                             "Crosstalk_White_E_vs_dt_Ge10",
      "Crosstalk_Blue_E_vs_dt_Ge11","Crosstalk_Green_E_vs_dt_Ge11","Crosstalk_Red_E_vs_dt_Ge11",

      "Crosstalk_Green_E_vs_dt_Ge12","Crosstalk_Red_E_vs_dt_Ge12","Crosstalk_White_E_vs_dt_Ge12",
      "Crosstalk_Blue_E_vs_dt_Ge13",                               "Crosstalk_Red_E_vs_dt_Ge13","Crosstalk_White_E_vs_dt_Ge13",
      "Crosstalk_Blue_E_vs_dt_Ge14","Crosstalk_Green_E_vs_dt_Ge14",                             "Crosstalk_White_E_vs_dt_Ge14",
      "Crosstalk_Blue_E_vs_dt_Ge15","Crosstalk_Green_E_vs_dt_Ge15","Crosstalk_Red_E_vs_dt_Ge15",

      "Crosstalk_Green_E_vs_dt_Ge16","Crosstalk_Red_E_vs_dt_Ge16","Crosstalk_White_E_vs_dt_Ge16",
      "Crosstalk_Blue_E_vs_dt_Ge17",                               "Crosstalk_Red_E_vs_dt_Ge17","Crosstalk_White_E_vs_dt_Ge17",
      "Crosstalk_Blue_E_vs_dt_Ge18","Crosstalk_Green_E_vs_dt_Ge18",                             "Crosstalk_White_E_vs_dt_Ge18",
      "Crosstalk_Blue_E_vs_dt_Ge19","Crosstalk_Green_E_vs_dt_Ge19","Crosstalk_Red_E_vs_dt_Ge19",

      "Crosstalk_Green_E_vs_dt_Ge20","Crosstalk_Red_E_vs_dt_Ge20","Crosstalk_White_E_vs_dt_Ge20",
      "Crosstalk_Blue_E_vs_dt_Ge21",                               "Crosstalk_Red_E_vs_dt_Ge21","Crosstalk_White_E_vs_dt_Ge21",
      "Crosstalk_Blue_E_vs_dt_Ge22","Crosstalk_Green_E_vs_dt_Ge22",                             "Crosstalk_White_E_vs_dt_Ge22",
      "Crosstalk_Blue_E_vs_dt_Ge23","Crosstalk_Green_E_vs_dt_Ge23","Crosstalk_Red_E_vs_dt_Ge23",

      "Crosstalk_Green_E_vs_dt_Ge24","Crosstalk_Red_E_vs_dt_Ge24","Crosstalk_White_E_vs_dt_Ge24",
      "Crosstalk_Blue_E_vs_dt_Ge25",                               "Crosstalk_Red_E_vs_dt_Ge25","Crosstalk_White_E_vs_dt_Ge25",
      "Crosstalk_Blue_E_vs_dt_Ge26","Crosstalk_Green_E_vs_dt_Ge26",                             "Crosstalk_White_E_vs_dt_Ge26",
      "Crosstalk_Blue_E_vs_dt_Ge27","Crosstalk_Green_E_vs_dt_Ge27","Crosstalk_Red_E_vs_dt_Ge27",

      "Crosstalk_Green_E_vs_dt_Ge28","Crosstalk_Red_E_vs_dt_Ge28","Crosstalk_White_E_vs_dt_Ge28",
      "Crosstalk_Blue_E_vs_dt_Ge29",                               "Crosstalk_Red_E_vs_dt_Ge29","Crosstalk_White_E_vs_dt_Ge29",
      "Crosstalk_Blue_E_vs_dt_Ge30","Crosstalk_Green_E_vs_dt_Ge30",                             "Crosstalk_White_E_vs_dt_Ge30",
      "Crosstalk_Blue_E_vs_dt_Ge31","Crosstalk_Green_E_vs_dt_Ge31","Crosstalk_Red_E_vs_dt_Ge31",

      "Crosstalk_Green_E_vs_dt_Ge32","Crosstalk_Red_E_vs_dt_Ge32","Crosstalk_White_E_vs_dt_Ge32",
      "Crosstalk_Blue_E_vs_dt_Ge33",                               "Crosstalk_Red_E_vs_dt_Ge33","Crosstalk_White_E_vs_dt_Ge33",
      "Crosstalk_Blue_E_vs_dt_Ge34","Crosstalk_Green_E_vs_dt_Ge34",                             "Crosstalk_White_E_vs_dt_Ge34",
      "Crosstalk_Blue_E_vs_dt_Ge35","Crosstalk_Green_E_vs_dt_Ge35","Crosstalk_Red_E_vs_dt_Ge35",

      "Crosstalk_Green_E_vs_dt_Ge36","Crosstalk_Red_E_vs_dt_Ge36","Crosstalk_White_E_vs_dt_Ge36",
      "Crosstalk_Blue_E_vs_dt_Ge37",                               "Crosstalk_Red_E_vs_dt_Ge37","Crosstalk_White_E_vs_dt_Ge37",
      "Crosstalk_Blue_E_vs_dt_Ge38","Crosstalk_Green_E_vs_dt_Ge38",                             "Crosstalk_White_E_vs_dt_Ge38",
      "Crosstalk_Blue_E_vs_dt_Ge39","Crosstalk_Green_E_vs_dt_Ge39","Crosstalk_Red_E_vs_dt_Ge39",

      "Crosstalk_Green_E_vs_dt_Ge40","Crosstalk_Red_E_vs_dt_Ge40","Crosstalk_White_E_vs_dt_Ge40",
      "Crosstalk_Blue_E_vs_dt_Ge41",                               "Crosstalk_Red_E_vs_dt_Ge41","Crosstalk_White_E_vs_dt_Ge41",
      "Crosstalk_Blue_E_vs_dt_Ge42","Crosstalk_Green_E_vs_dt_Ge42",                             "Crosstalk_White_E_vs_dt_Ge42",
      "Crosstalk_Blue_E_vs_dt_Ge43","Crosstalk_Green_E_vs_dt_Ge43","Crosstalk_Red_E_vs_dt_Ge43",

      "Crosstalk_Green_E_vs_dt_Ge44","Crosstalk_Red_E_vs_dt_Ge44","Crosstalk_White_E_vs_dt_Ge44",
      "Crosstalk_Blue_E_vs_dt_Ge45",                               "Crosstalk_Red_E_vs_dt_Ge45","Crosstalk_White_E_vs_dt_Ge45",
      "Crosstalk_Blue_E_vs_dt_Ge46","Crosstalk_Green_E_vs_dt_Ge46",                             "Crosstalk_White_E_vs_dt_Ge46",
      "Crosstalk_Blue_E_vs_dt_Ge47","Crosstalk_Green_E_vs_dt_Ge47","Crosstalk_Red_E_vs_dt_Ge47",

      "Crosstalk_Green_E_vs_dt_Ge48","Crosstalk_Red_E_vs_dt_Ge48","Crosstalk_White_E_vs_dt_Ge48",
      "Crosstalk_Blue_E_vs_dt_Ge49",                               "Crosstalk_Red_E_vs_dt_Ge49","Crosstalk_White_E_vs_dt_Ge49",
      "Crosstalk_Blue_E_vs_dt_Ge50","Crosstalk_Green_E_vs_dt_Ge50",                             "Crosstalk_White_E_vs_dt_Ge50",
      "Crosstalk_Blue_E_vs_dt_Ge51","Crosstalk_Green_E_vs_dt_Ge51","Crosstalk_Red_E_vs_dt_Ge51",

      "Crosstalk_Green_E_vs_dt_Ge52","Crosstalk_Red_E_vs_dt_Ge52","Crosstalk_White_E_vs_dt_Ge52",
      "Crosstalk_Blue_E_vs_dt_Ge53",                               "Crosstalk_Red_E_vs_dt_Ge53","Crosstalk_White_E_vs_dt_Ge53",
      "Crosstalk_Blue_E_vs_dt_Ge54","Crosstalk_Green_E_vs_dt_Ge54",                             "Crosstalk_White_E_vs_dt_Ge54",
      "Crosstalk_Blue_E_vs_dt_Ge55","Crosstalk_Green_E_vs_dt_Ge55","Crosstalk_Red_E_vs_dt_Ge55",

      "Crosstalk_Green_E_vs_dt_Ge56","Crosstalk_Red_E_vs_dt_Ge56","Crosstalk_White_E_vs_dt_Ge56",
      "Crosstalk_Blue_E_vs_dt_Ge57",                               "Crosstalk_Red_E_vs_dt_Ge57","Crosstalk_White_E_vs_dt_Ge57",
      "Crosstalk_Blue_E_vs_dt_Ge58","Crosstalk_Green_E_vs_dt_Ge58",                             "Crosstalk_White_E_vs_dt_Ge58",
      "Crosstalk_Blue_E_vs_dt_Ge59","Crosstalk_Green_E_vs_dt_Ge59","Crosstalk_Red_E_vs_dt_Ge59",

      "Crosstalk_Green_E_vs_dt_Ge60","Crosstalk_Red_E_vs_dt_Ge60","Crosstalk_White_E_vs_dt_Ge60",
      "Crosstalk_Blue_E_vs_dt_Ge61",                               "Crosstalk_Red_E_vs_dt_Ge61","Crosstalk_White_E_vs_dt_Ge61",
      "Crosstalk_Blue_E_vs_dt_Ge62","Crosstalk_Green_E_vs_dt_Ge62",                             "Crosstalk_White_E_vs_dt_Ge62",
      "Crosstalk_Blue_E_vs_dt_Ge63","Crosstalk_Green_E_vs_dt_Ge63","Crosstalk_Red_E_vs_dt_Ge63"
    ],
    "spectrumListGates" : [
      ["y",2250,2300],
      ["y",2200,2250],
      ["y",2150,2200],
      ["y",2100,2150],
      ["y",2050,2100],
      ["y",2000,2050],
      ["y",1950,2000],
      ["y",1900,1950],
      ["y",1850,1900],
      ["y",1800,1850],
      ["y",1750,1800],
      ["y",1700,1750],
      ["y",1650,1700],
      ["y",1600,1650],
      ["y",1550,1600],
      ["y",1500,1550],
      ["y",1450,1500],
      ["y",1400,1450],
      ["y",1350,1400],
      ["y",1300,1350],
      ["y",1250,1300],
      ["y",1200,1250],
      ["y",1150,1200],
      ["y",1100,1150],
      ["y",1050,1100],
      ["y",1000,1050],
      ["y",950,1000],
      ["y",900,950],
      ["y",850,900],
      ["y",800,850],
      ["y",750,800],
      ["y",700,750],
      ["y",650,700],
      ["y",600,650],
      ["y",550,600],
      ["y",100,500]
    ],
    "spectrumListProjectionsPeaks" : {
      "All":[73]
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
  thisScript = dataStore.peakFitterScriptTemplate["crosstalk"];
  //thisScript = dataStore.peakFitterScriptTemplate["crosstalkClover1Only"];

  // Get the user input on histogramFileNames
  thisScript.histogramFileNames.push(document.getElementById('HistoListSelect60Co').value);

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

    // Generate the crosstalkCorrections report table
    dataStore._crosstalkCorrectionsReport = new crosstalkCorrectionsReport('crosstalkCorrections','crystalKReportRegioncrosstalkCorrectionsDetector','crystal1stHitReportRegioncrosstalkCorrectionsDetector');
    dataStore._crosstalkCorrectionsReport.setup();

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

      // Make the projections needed from each matrix
      projectAllMatrices(projectionsList);
    }

    function projectionsCallback(){
      // Need to move these projections into the dataStore.spectrumListProjections object
      // Need to add these projections to the spectrum menu
      var keys = Object.keys(dataStore.createdSpectra);
      var histoName = dataStore.histoFileName.split(".")[0];

      for(i=0; i<keys.length; i++){
        // Only process the newly created projections for the current histogram file
        if(!keys[i].includes(histoName)){ continue; }

        // Add this projection spectrum to the list which need to be fitted
        dataStore.spectrumListProjections.push(keys[i]);

        // Create the list of peaks to fit for this projection if it does not already exist.
        // If it exists it is because it has unique peaks specified for it.
        if(!dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i])){
          // A key for this spectrum name does not exist.
          dataStore.spectrumListProjectionsPeaks[keys[i]] = [];
        }

        // Add the list of peaks for this filename, if it exists
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[0])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[0]]);
        }

        // Add the list of peaks for this 2d spectrum name, if it exists
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[1].split("x-")[0])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[1].split("x-")[0]]);
        }
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[1].split("y-")[0])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[1].split("y-")[0]]);
        }

        // Add the list of peaks for this projection for all 2d spectra for all filenames, if it exists
        // Projection list keys will start with either 'x' or 'y'
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(("x-"+(keys[i].split(":")[1].split("x-")[1])))){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[("x-"+(keys[i].split(":")[1].split("x-")[1]))]);
        }
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(("y-"+(keys[i].split(":")[1].split("y-")[1])))){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[("y-"+(keys[i].split(":")[1].split("y-")[1]))]);
        }

        // Add the list of peaks for this specific projection name, if it exists
        if(dataStore.spectrumListProjectionsPeaks.hasOwnProperty(keys[i].split(":")[1])){
          dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks[keys[i].split(":")[1]]);
        }

        // Add the All peaks for projections
        dataStore.spectrumListProjectionsPeaks[keys[i]].push(...dataStore.spectrumListProjectionsPeaks["All"]);

        // Remove any duplicate values. This seems to be easier than checking before pushing the other lists.
        dataStore.spectrumListProjectionsPeaks[keys[i]] = [...new Set(dataStore.spectrumListProjectionsPeaks[keys[i]])];

        // Sort the Array now we have added all peaks
        dataStore.spectrumListProjectionsPeaks[keys[i]].sort(function(a, b){return a-b});

        // Add this projection to the spectrum menu
        newMenuItem = document.createElement('li');
        newMenuItem.setAttribute('id', 'plotList'+keys[i]);
        newMenuItem.setAttribute('value', keys[i]);
        newMenuItem.setAttribute('class', 'list-group-item toggle');
        newMenuItem.innerHTML = keys[i].split(':')[1].trim()+'<span id=\'plotListbadge'+keys[i]+'\' class=\"badge plotPresence hidden\">&#x2713;</span>';
        document.getElementById('plotListplots'+histoName).appendChild(newMenuItem);
        document.getElementById('plotList'+keys[i]).onclick = function(){ dataStore._plotListLite.exclusivePlot(this.id.split('plotList')[1], dataStore.viewers[dataStore.plots[0]]); }
      }

      // change information message
      document.getElementById('projectionsMessage').classList.add('hidden');
      document.getElementById('fittingSinglesMessage').classList.remove('hidden');

      // Set the current task to keep track of our progress
      dataStore.currentTask = 'SinglesFitting';

      // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
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
      dataStore._crosstalkCorrectionsReport.updateTable();

      console.log(dataStore);
      console.log("Finished");
      console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

      // Reveal the post-processing buttons nad report div
      document.getElementById('postProcessDiv').classList.remove('hidden');

      // Launch the post-processing
      postProcessCrosstalkCorrections();
    }

    function buildCSVfile(){
      console.log('Download initiated');
      var keys = Object.keys(dataStore.fitResults);
      var index = 1;

      // Write the table of results to a CSV file for download.
      var CSV = '';

      CSV += 'GRIFFIN Peak Fitter Results Data\n\n';

      //fit results: 'plotname': [[amplitude, center, width, intercept, slope, area, FWHM], [amplitude, center, width, intercept, slope, area, FWHM]]

      CSV += 'Fit Index,';
      CSV += 'Histogram File,';
      CSV += 'Run Title,Run StartTime,Run Duration,';
      CSV += 'Spectrum,';
      CSV += 'Centroid,'; //
      CSV += 'Height,'; //
      CSV += 'Width,'; //
      CSV += 'Intercept (BG),'; //
      CSV += 'Slope (BG),'; //
      CSV += 'Area,'; //
      CSV += 'Area Unc.,'; //
      CSV += 'FWHM\n'; //
      for(var i=0; i<keys.length; i++){
        for(var j=0; j<dataStore.fitResults[keys[i]].length; j++){
          CSV += index + ','; index++;
          CSV += keys[i].split(":")[0] + ',';
          CSV += dataStore.spectrumListHistoFileDetails[keys[i].split(":")[0]].Title + ',';
          CSV += dataStore.spectrumListHistoFileDetails[keys[i].split(":")[0]].StartTime + ',';
          CSV += dataStore.spectrumListHistoFileDetails[keys[i].split(":")[0]].Duration + ',';
          CSV += keys[i].split(":")[1] + ',';
          CSV += dataStore.fitResults[keys[i]][j][1].toFixed(2) + ','; // Center
          CSV += dataStore.fitResults[keys[i]][j][0].toFixed(2) + ','; // Amplitude
          CSV += dataStore.fitResults[keys[i]][j][2].toFixed(2) + ','; // width
          CSV += dataStore.fitResults[keys[i]][j][3].toFixed(2) + ','; // intercept
          CSV += dataStore.fitResults[keys[i]][j][4].toFixed(2) + ','; // slope
          CSV += dataStore.fitResults[keys[i]][j][5].toFixed(2) + ','; // area
          CSV += Math.sqrt(dataStore.fitResults[keys[i]][j][5]).toFixed(2) + ','; // area uncertainty
          CSV += dataStore.fitResults[keys[i]][j][6].toFixed(2) + '\n'; // FWHM
        }
      }
      CSV += '\n';

      // Create a download link
      const textBlob = new Blob([CSV], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = 'GRIFFIN-peakFitter-Results.csv';

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }

    function buildScriptfile(){
      console.log('Download initiated');

      // Write the contents of the json script to a file for download.
      var JSONstring = '';
      JSONstring = JSON.stringify(dataStore.peakFitterScript, null, 4);

      // Need to purge some spectrum specific peak entries if they match All.


      // Create a download link
      const textBlob = new Blob([JSONstring], {type: 'text/plain'});
      URL.revokeObjectURL(window.textBlobURL);
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(textBlob);
      downloadLink.download = 'GRIFFIN-peakFitter-script.json';

      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
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

    function postProcessCrosstalkCorrections(){
      console.log("Post-Process crosstalk");

      // Post processing for time-dependent crosstalk between crystals in a clover
      //
      // Perform 6th order polynomial fit of correction factor as function of time between hits.
      // Result is function describing correction factor as function of time between hits.

      // Inject the report card templates and setup
      var NumGe=64;
      var colorString = ["Blue","Green","Red","White"];

      // Get the keys from the fitResults object.
      // Get the single hit energy
      var keys = Object.keys(dataStore.fitResults);
      var thisHistoName = dataStore.histoFileName.split(".")[0];

      // Loop through all Ge crystals
      for(var thisGeindex = 0; thisGeindex<NumGe; thisGeindex++){

        console.log("\n\n==============================\n  Post-processing for crosstalk correction...\n\n");
        var GeString = "Ge" + alwaysThisLong(thisGeindex, 2);
        var matrixString = [];
        for(var i=0; i<4; i++){
          if(thisGeindex%4 == i){ continue; }
          matrixString.push("Crosstalk_" + colorString[i] + "_E_vs_dt_Ge"+ alwaysThisLong(thisGeindex,2) +"y");
        }
        var data = [];

        // Get the single hit centroid energy of 1408keV peak for this crystal
        // GRG01BN00A_Energy
        var crystals = ["B","G","R","W"];
        var letter = ["A","B"];
        var cloverNum = Math.floor(thisGeindex/4)+1;
        var GeName = "GRG" + alwaysThisLong(cloverNum, 2) + crystals[thisGeindex%4] + 'N00' + letter[0];
        var GeSingleSpecName = GeName + "_Energy";

        // There are three matrices associated with each crystal; crosstalk from the three other crystals in the clover
        for(var thisMatrixIndex=0; thisMatrixIndex<matrixString.length; thisMatrixIndex++){
          var thisColor = matrixString[thisMatrixIndex].split("_")[1];
          // Place to store this data for plotting later
          if(typeof(dataStore.fitResultsData[GeName]) == 'undefined'){
            dataStore.fitResultsData[GeName] = {};
          }
          if(typeof(dataStore.fitResultsData[GeName][thisColor]) == 'undefined'){
            dataStore.fitResultsData[GeName][thisColor] = [];
          }

          // Get the energy centroid for this matrix that is unaffected by crosstalk
          var thisProjectionString = "-100-500";
          var nonCrosstalkEnergy = dataStore.fitResults[thisHistoName+":"+matrixString[thisMatrixIndex]+thisProjectionString][0][1];
          console.log("Energy of nonCrosstalk peak for "+GeName+", "+thisColor+" is "+nonCrosstalkEnergy);

          // Loop over projection values
          for(var thisProjectionValue=550; thisProjectionValue<2300; thisProjectionValue+=50){

            // Spectrum names of the form: GeX_E_vs_k_1st_of_2hitx where X is Ge number.
            // Kstring will be the projection values in this case.
            thisProjectionString = "-"+parseInt(thisProjectionValue)+"-"+(parseInt(thisProjectionValue)+50);
            var thisKey = thisHistoName+":"+matrixString[thisMatrixIndex]+thisProjectionString;

            if(!dataStore.fitResults[thisKey]){
              console.log("Failed to find "+thisKey+" in the fitResults");
              continue;
            }
            if(!dataStore.fitResults[thisKey][0][1]){
              console.log("Failed to find peak fit for "+thisKey+" in the fitResults");
              continue;
            }
            // xValue is projection value plus 25 for center of bin.
            var xValue = (parseInt(thisProjectionValue)+25)-2275; // 25 for centre of bin. -2275 to translate channel number to timestamp difference in presort function.

            // yValue is the necessary correction to the Energy centroid to match the centroid which is unaffected by crosstalk
            var yValue = parseFloat(nonCrosstalkEnergy-dataStore.fitResults[thisKey][0][1]) / 1332.492;

            data.push([xValue,yValue]);

            // Save the data for plotting later
            dataStore.fitResultsData[GeName][thisColor].push([xValue,yValue]);

          } // end of projections loop

          console.log(data);
          // Perform polynomial fit of the series of y=correction factor as a function of x=k.
          // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
          var result = regression.polynomial(data, { order: 6, precision: 20 });

          // Save the fit parameter results for accessing and plotting later
          if(typeof(dataStore.fitResultsParameters[GeName]) == 'undefined'){
            dataStore.fitResultsParameters[GeName] = {};
          }
          dataStore.fitResultsParameters[GeName][thisColor] = result.equation.reverse();

          // Save these parameters to the THESEcalibrations object used by buildCalfile and updateAnalyzer
          if(!dataStore.THESEcalibrations[GeName]){ dataStore.THESEcalibrations[GeName] = {}; }
          if(!dataStore.THESEcalibrations[GeName].crosstalk0){ dataStore.THESEcalibrations[GeName].crosstalk0 = []; dataStore.THESEcalibrations[GeName].crosstalk1 = []; dataStore.THESEcalibrations[GeName].crosstalk2 = []; }
          dataStore.THESEcalibrations[GeName]["crosstalk"+thisMatrixIndex] = dataStore.fitResultsParameters[GeName][thisColor];

          // Test for NaN values and correct to defaults if they are
          if(dataStore.fitResultsParameters[GeName][thisColor].every(isNaN)){
            console.log("\n\n\n\n------------------------\n------------------------\n------------------------ isNaN \n------------------------\n------------------------\n------------------------\n\n\n");
            dataStore.fitResultsParameters[GeName][thisColor] = [0.0,1.0,0.0,0.0,0.0,0.0,0.0];
          }
        }
      } // end of Ge loop

      console.log(dataStore);

      // Create the Launch Submit button to begin the process
      newButton = document.createElement('button');
      newButton.setAttribute('id', 'analyzerSubmitButton');
      newButton.setAttribute('class', 'btn btn-default btn-lg');
      newButton.innerHTML = "Write Crosstalk Corrections to Analyzer";
      newButton.style.padding = '4px';
      newButton.onclick = function(){
        updateAnalyzer();
      }.bind(newButton);
      document.getElementById('postProcessResults').appendChild(newButton);

      // Display the results in the Coefficients table
      dataStore._crosstalkCorrectionsReport.updateCoefficientsTable();

    }
