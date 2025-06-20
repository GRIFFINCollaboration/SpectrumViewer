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
  dataStore.pageTitle = 'Fast-Timing Calibrations';                                   //header title
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

  //fitting
  dataStore.ROI = {};                                                   //regions of interest to look for peaks in: 'plotname': [[low bin, high bin], [low bin, high bin], ...]
  //                                                                      dataStore.ROI[sourceKey][peakIndex] = [low bin, high bin]
  dataStore.fitResults = {};                                            //fit results: 'plotname': [[amplitude, center, width, intercept, slope, area, FWHM], [amplitude, center, width, intercept, slope, area, FWHM]]
  dataStore.fitResultsData = {};              // Store the data of the curve fitting, 'detector-name':{ 'k1':[[x0,y0],[x1,y1]...], 'k2':[[x0,y0],[x1,y1]...], 'e1':[[x0,y0],[x1,y1]...] }
  dataStore.fitResultsParameters = {};        // Store the parameters of the curve fitting, 'detector-name':{ 'k1':[p0,p1,p2,p3,p4,p5,p6], 'k2':[p0,p1,p2,p3,p4,p5,p6], 'e1':[p0,p1,p2,p3,p4,p5,p6] }

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.

  // Workflow management and progress tracking
  dataStore.currentJob = '60Co';                      // 60Co
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "fastTimingWalkCurvesProgress";  // id of the Div with class = "progress-bar ..."
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
    '60Co' : {'spectrumList1d' : [], 'spectrumList1dPeaks' : { 'All':[] }, 'histogramFileNames' : [],
    'spectrumList2d' : [
      'TAC01_LBL01-00_CompWalk','TAC00_LBL00-01_CompWalk','TAC00_LBL00-02_CompWalk','TAC00_LBL00-03_CompWalk','TAC00_LBL00-04_CompWalk','TAC00_LBL00-05_CompWalk','TAC00_LBL00-06_CompWalk','TAC00_LBL00-07_CompWalk'
    ], 'spectrumListGates' : [
      ["x", 25, 50],
      ["x", 50, 75],
      ["x", 75,100],
      ["x",100,125],
      ["x",125,150],
      ["x",150,175],
      ["x",175,200],
      ["x",200,225],
      ["x",225,250],
      ["x",250,275],
      ["x",275,300],
      ["x",300,325],
      ["x",325,350],
      ["x",350,375],
      ["x",375,400],
      ["x",400,500],
      ["x",500,600],
      ["x",600,700],
      ["x",700,800],
      ["x",800,900],
      ["x",900,1000],
      ["x",1143,1203]
    ], 'spectrumListProjectionsPeaks' : {'All':[500]}}};


    // Pagination for the results and plotting display
    // plotRegion = spectra
    // energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
    // energyCalibrator = Table of all (detector num, fit params, r2)
    // graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
    // graphSection = plot of all the residuals for specific peak
    // Variables for Pagination menu buttons
    //dataStore.buttonNames = ["Spectra", "Peak-Fitting Results", "per Crystal k-dependance fits", "per Crystal 1st-Hit-dependance fits"];  // Names to appear on the buttons
    //  dataStore.buttonIDs = ["plotRegionMenuButton", "graphRegionMenuButton", "crystalKRegionMenuButton", "crystal1stHitRegionMenuButton"];    // IDs for the buttons
    //dataStore.buttonPages = ["plotRegion", "resultsTableRegion", "crystalKReportRegion", "crystal1stHitReportRegion"];                 // Pages (div IDs) to be associated with the buttons
    dataStore.buttonNames = ["Spectra", "Individual Compton Walk Curves", "Peak-Fitting Results", "Compton Walk Curves Plot"];  // Names to appear on the buttons
    dataStore.buttonIDs = ["plotRegionMenuButton", "tableRegionMenuButton", "graphRegionMenuButton", "dataPlotRegionMenuButton"];    // IDs for the buttons
    dataStore.buttonPages = ["plotRegion", "detectorReportRegion", "resultsTableRegion","resultsPlotRegion"];                 // Pages (div IDs) to be associated with the buttons

    // Generate THESEdetectors object. Used for building the walk curve table
    dataStore.THESEdetectors = [];
      for(i=0; i<8; i++){
          dataStore.THESEdetectors[i] = 'LaBr3 '+alwaysThisLong(i, 2);
    }

    // App specific data structures
    dataStore.ComptonWalkCurves = {};  // Place to store the data for the Compton walk curves

// dataplot definitions
dataStore._dataplot = [];                 // Place for all dataplot objects to be created as an array. This makes them indexable and iteratable
dataStore.dataplotData = [];                                       // place for dataplot data
dataStore.annotations = [0,0];
dataStore.plotStyle = [];
dataStore.plotStyle[0] = {                     //dygraphs style object
  labels: ["Energy (keV)", "Centroid Position (ps)"],
  title: 'LaBr3 Time Walk Curve',
  xlabel: 'Energy (keV)',
  ylabel: 'Centroid Position (ps)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'detectorReportPlotLegend',
  height: '640',
  drawPoints: 'true',
  connectSeparatedPoints: 'true',
  pointSize: '5',
  highlightCircleSize: '7',
  strokeWidth: '0',
  errorBars: true,
  legend: 'always',
  axes: { x: { valueRange: [0,2000] }, y : { valueRange: [0,400] } }
}
dataStore.plotStyle[1] = {                     //dygraphs style object
  labels: ["Energy (keV)", "Det 0", "Det 1", "Det 2", "Det 3", "Det 4", "Det 5", "Det 6", "Det 7"],
  title: 'LaBr3 Compton Time Walk Curve',
  xlabel: 'Energy (keV)',
  ylabel: 'Centroid Position (ps)',
  axisLabelColor: '#FFFFFF',
  colors: ["#FFFFFF", "#FF0000", "#00FFFF", "#FFFF00", "#FF9900", "#0066FF", "#44FF44", "#FF00CC"],
  labelsDiv: 'fastTimingWalkCurvesPlotLegend',
  height: '960',
  drawPoints: 'true',
  connectSeparatedPoints: 'true',
  pointSize: '5',
  highlightCircleSize: '7',
  strokeWidth: '0',
  //customBars: true,
  legend: 'always',
  axes: { x: { valueRange: [0,2000] }, y : { valueRange: [0,400] } }
}
dataStore.plotInitData = [];
dataStore.plotInitData[0] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data for _dataplot[0]
//dataStore.plotInitData[1] = [[0,0], [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], [7,0]];      //initial dummy data for _dataplot[1]
dataStore.plotInitData[1] = [[0,0,0,0,0,0,0,0,0], [1,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,0,0,0,0,0,0,0,0], [5,0,0,0,0,0,0,0,0], [6,0,0,0,0,0,0,0,0], [7,0,0,0,0,0,0,0,0]];      //initial dummy data for _dataplot[1]
dataStore.YAxisMinValue = [[0,0],[0,0]];
dataStore.YAxisMaxValue = [[0,0],[0,0]];


  } // end of setupDataStore()
  setupDataStore();

  function setupfastTimingWalkCurves(){
    // This fast timing app is different from the others. We dont actually want peak fitting.
    //

    // Grab the template peak-fitting script to a local copy here
    var thisScript = {};
    thisScript = dataStore.peakFitterScriptTemplate['60Co'];

    // Get the user input on histogramFileNames
    thisScript.histogramFileNames.push(document.getElementById('HistoListSelect60Co').value);

    // Setup the peak-fitting script from the template
    receiveScript(JSON.stringify(thisScript));

    // Disable user inputs now we have launched the process
    for(var i=0; i<dataStore.histoChoiceBarContents.length; i++){
      var thisTitle = dataStore.histoChoiceBarContents[i];
      document.getElementById('HistoListSelect'+thisTitle).setAttribute('disabled', true);
    }
    document.getElementById('launchSubmitButton').setAttribute('disabled', true);

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

      // Generate the fastTimingWalkCurves report table
      dataStore._fastTimingWalkCurvesReport = new fastTimingWalkCurvesReport('fastTimingWalkCurves','resultsTableRegion');
      dataStore._fastTimingWalkCurvesReport.setup();

      // Generate the plot
      dataStore._dataplot[0] = new dataplot('detectorReportPlot',0);
      dataStore._dataplot[0].setup(0);

      // Generate the plot
      dataStore._dataplot[1] = new dataplot('fastTimingWalkCurvesPlot',1);
      dataStore._dataplot[1].setup(1);

      // Draw the search region
      dataStore.viewers[dataStore.plots[0]].plotData();

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
        console.log("projectionsCallback with job "+dataStore.currentJob);
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

        // Here most apps would initiate the peak-fitting process with a function call to fitPeaksInSeriesOfHistograms

        console.log(dataStore);

        // Set the current task to keep track of our progress
        dataStore.currentTask = 'ProjectionsFitting';

        // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
        // Create list of projections to fit for this histogram file
        var theseProjections = [];
        var histoName = dataStore.currentHistoFileName.split(".")[0];
        for(var i=0; i<dataStore.spectrumListProjections.length; i++){
          // Only process the newly created projections for the current histogram file
          if(dataStore.spectrumListProjections[i].includes(histoName)){
            theseProjections.push(dataStore.spectrumListProjections[i]);
          }
        }

        // Start the whole fitting routine for projections peaks
        fitCOMInSeriesOfHistograms(theseProjections,dataStore.spectrumListProjectionsPeaks);
        //  fitPeaksInSeriesOfHistograms(theseProjections,dataStore.spectrumListProjectionsPeaks,"TAC");

      }

      function fittingCOMCallback(){
        // All fitting has now been completed
        console.log("fittingCOMCallback");

        // Now we are done.
        // Reveal the download buttons
        //document.getElementById('saveCalDiv').classList.remove('hidden');
        document.getElementById('saveCSVDiv').classList.remove('hidden');
        document.getElementById('saveScriptDiv').classList.remove('hidden');

        // change information message
        document.getElementById('fittingProjectionsMessage').classList.add('hidden');
        document.getElementById('reviewMessage').classList.remove('hidden');

                // Display the results in the table
                dataStore._fastTimingWalkCurvesReport.updateFitTable();

        console.log(dataStore);
        console.log("Finished");
        console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

        // Reveal the post-processing buttons nad report div
        //document.getElementById('postProcessDiv').classList.remove('hidden');

        // Launch the post-processing...
        postProcessWalkCurves();

      }

      function postProcessWalkCurves(){
        console.log("postProcessWalkCurves");

        // Build the walk curve data series for each plot
        // Results come from the fitResults object with key being the histogram name
        // x series is the centroid of the projection limits
        // y series is the difference from the COM centroid of this Compton bin from the Full-energy peak (1173keV projection)
        // The Center-Of-Mass centroid is stored in the fitResults object with key being the histogram name
        // y series error bars are the standard deviation of the Center-Of-Mass centroid, which is the width stored in fitResults

        var walkCurveData = {};
        var binIndexes = [25,50,75,100,125,150,175,200,225,250,275,300,325,350,375,400,500,600,700,800,900,1143];

        // The dataStore.spectrumListProjections array is a list of all projection histograms
        // Loop through this, extract the TAC number and gate limits from the histogram name
        // Then find the associated results from the fitResults object
        // In this first pass we will save the COM centroid - then we will turn it into the difference from the full-energy peak later
        for(var i=0; i<dataStore.spectrumListProjections.length; i++){
          // TAC_00
          var thisTAC = -1;
          if(dataStore.spectrumListProjections[i].includes("TAC01")){
            thisTAC = 0;
          }else if(dataStore.spectrumListProjections[i].includes("LBL00")){
            thisTAC = parseInt(dataStore.spectrumListProjections[i].split("-")[1].split("_")[0]);
          }
          if(!walkCurveData["TAC"+thisTAC]){
            // Create the object for this TAC
            walkCurveData["TAC"+thisTAC] = {
              "xSeries": [],
              "ySeries": [],
              "yUncSeries": [], // lo,hi
              "yUncHiLoSeries": [], // lo,hi
              "yMeans": [],
              "ySigmas": [],
            };
          }
          // Determine the index and bin
          var thisIndex = binIndexes.indexOf(parseInt(dataStore.spectrumListProjections[i].split("-")[2]));
          var thisBin = (parseInt(dataStore.spectrumListProjections[i].split("-")[3]) - parseInt(dataStore.spectrumListProjections[i].split("-")[2]))/2 + parseInt(dataStore.spectrumListProjections[i].split("-")[2]);

          // Get the results
          var thisYvalue = dataStore.fitResults[dataStore.spectrumListProjections[i]][0][1];
          var thisYerror = dataStore.fitResults[dataStore.spectrumListProjections[i]][0][2];

          // Save the results
          walkCurveData["TAC"+thisTAC].xSeries[thisIndex] = thisBin;
          walkCurveData["TAC"+thisTAC].yMeans[thisIndex] = thisYvalue;
          walkCurveData["TAC"+thisTAC].ySigmas[thisIndex] = thisYerror;
        }

        // Now calculate the differences of the centroids
        var keys = Object.keys(walkCurveData);
        for(i=0; i<keys.length; i++){
          for(var j=0; j<walkCurveData[keys[i]].xSeries.length; j++){
            walkCurveData[keys[i]].ySeries[j] = walkCurveData[keys[i]].yMeans[j] - walkCurveData[keys[i]].yMeans[walkCurveData[keys[i]].xSeries.length-1];
            walkCurveData[keys[i]].yUncSeries[j] = (walkCurveData[keys[i]].ySigmas[j] / walkCurveData[keys[i]].yMeans[j]) * walkCurveData[keys[i]].ySeries[j];
            walkCurveData[keys[i]].yUncHiLoSeries[j] = [];
            walkCurveData[keys[i]].yUncHiLoSeries[j][0] = walkCurveData[keys[i]].ySeries[j] - ((walkCurveData[keys[i]].ySigmas[j] / walkCurveData[keys[i]].yMeans[j]) * walkCurveData[keys[i]].ySeries[j]);
            walkCurveData[keys[i]].yUncHiLoSeries[j][1] = walkCurveData[keys[i]].ySeries[j] + ((walkCurveData[keys[i]].ySigmas[j] / walkCurveData[keys[i]].yMeans[j]) * walkCurveData[keys[i]].ySeries[j]);
          }
        }

        // Store this object in the dataStore for later use
        dataStore.ComptonWalkCurves = walkCurveData;

        console.log(dataStore);

        // Display the results in the table
        dataStore._fastTimingWalkCurvesReport.updateTable();
        // The indivudal curve plots are triggered from the above function. Here draw the full plot with all curves
        dataStore._fastTimingWalkCurvesReport.refreshFullPlotData();
      }

      function buildCalfile(){
        console.log('Download initiated');

        // This cal file will contain:
        // LBL energy calibration Coefficients
        // LBT TAC Gain coefficients
        // TAC_OFFSET parameters for the different LBL-LBL combinations

        var tac_offset_name = [
          "TAC_01_02", "TAC_01_03", "TAC_01_04", "TAC_01_05", "TAC_01_06", "TAC_01_07", "TAC_01_08",
          "TAC_02_03", "TAC_02_04", "TAC_02_05", "TAC_02_06", "TAC_02_07", "TAC_02_08",
          "TAC_03_04", "TAC_03_05", "TAC_03_06", "TAC_03_07", "TAC_03_08",
          "TAC_04_05", "TAC_04_06", "TAC_04_07", "TAC_04_08",
          "TAC_05_06", "TAC_05_07", "TAC_05_08",
          "TAC_06_07", "TAC_06_08",
          "TAC_07_08",
          "TAC_02_01"
        ];

        // Write the Cal file
        CAL = '';

        // The LBL energy calibration Coefficients
        for(var i=0; i<dataStore.LBLgains.length; i++){
          var thisName = "LBL" + alwaysThisLong(i+1,2) + "XN00X";
          CAL += thisName+' { \n';
          CAL += 'Name:	'+thisName+'\n';
          CAL += 'Number:	'+i+'\n';
          var thisCalibrationIndex = dataStore.Config.map(function(e) { return e.name; }).indexOf(thisName);
          var thisAddress = dataStore.Config[thisCalibrationIndex].address;
          CAL += 'Address:  0x'+thisAddress.toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
          CAL += 'Digitizer:	GRF16\n';
          CAL += 'EngCoeff:	'+0.0+' '+dataStore.LBLgains[i]+' '+0.0+'\n';
          CAL += 'Integration:	0\n';
          CAL += 'ENGChi2:	0\n';
          CAL += 'FileInt:	0\n';
          CAL += '}\n';
          CAL += '\n';
          CAL += '//====================================//\n';
        }


        // LBT TAC Gain coefficients
        for(var i=0; i<dataStore.tacGain.length; i++){
          var thisName = "LBT" + alwaysThisLong(i+1,2) + "XT00X";
          CAL += thisName+' { \n';
          CAL += 'Name:	'+thisName+'\n';
          CAL += 'Number:	'+i+'\n';
          var thisCalibrationIndex = dataStore.Config.map(function(e) { return e.name; }).indexOf(thisName);
          var thisAddress = dataStore.Config[thisCalibrationIndex].address;
          CAL += 'Address:  0x'+thisAddress.toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
          CAL += 'Digitizer:	GRF16\n';
          CAL += 'EngCoeff:	'+0.0+' '+dataStore.tacGain[i]+' '+0.0+'\n';
          CAL += 'Integration:	0\n';
          CAL += 'ENGChi2:	0\n';
          CAL += 'FileInt:	0\n';
          CAL += '}\n';
          CAL += '\n';
          CAL += '//====================================//\n';
        }

        // TAC_OFFSET parameters for the different LBL-LBL combinations
        for(var i=0; i<dataStore.comboOffsets.length; i++){
          CAL += "TAC_OFFSET"+' { \n';
          CAL += 'Name:	'+tac_offset_name[i]+'\n';
          CAL += 'EngCoeff:	'+dataStore.comboOffsets[i]+' '+tac_offset_name[i].split("_")[1]+' '+tac_offset_name[i].split("_")[2]+'\n';
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
