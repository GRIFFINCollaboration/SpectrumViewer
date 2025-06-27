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
  dataStore.histoChoiceBarContents = ['137Cs'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'BGO HV Alignment';                                   //header title
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
  dataStore.progressBarKey = "bgoHValignmentProgress";                        // id of the Div with class = "progress-bar ..."
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
  dataStore.peakFitterScriptTemplate["bgoHValignment"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [
      "Ge01BGO01","Ge01BGO02","Ge01BGO03","Ge01BGO04","Ge01BGO05", "Ge02BGO01","Ge02BGO02","Ge02BGO03","Ge02BGO04","Ge02BGO05",
      "Ge03BGO01","Ge03BGO02","Ge03BGO03","Ge03BGO04","Ge03BGO05", "Ge04BGO01","Ge04BGO02","Ge04BGO03","Ge04BGO04","Ge04BGO05",
      "Ge05BGO01","Ge05BGO02","Ge05BGO03","Ge05BGO04","Ge05BGO05", "Ge06BGO01","Ge06BGO02","Ge06BGO03","Ge06BGO04","Ge06BGO05",
      "Ge07BGO01","Ge07BGO02","Ge07BGO03","Ge07BGO04","Ge07BGO05", "Ge08BGO01","Ge08BGO02","Ge08BGO03","Ge08BGO04","Ge08BGO05",
      "Ge09BGO01","Ge09BGO02","Ge09BGO03","Ge09BGO04","Ge09BGO05",
      "Ge10BGO01","Ge10BGO02","Ge10BGO03","Ge10BGO04","Ge10BGO05", "Ge11BGO01","Ge11BGO02","Ge11BGO03","Ge11BGO04","Ge11BGO05",
      "Ge12BGO01","Ge12BGO02","Ge12BGO03","Ge12BGO04","Ge12BGO05", "Ge13BGO01","Ge13BGO02","Ge13BGO03","Ge13BGO04","Ge13BGO05",
      "Ge14BGO01","Ge14BGO02","Ge14BGO03","Ge14BGO04","Ge14BGO05", "Ge15BGO01","Ge15BGO02","Ge15BGO03","Ge15BGO04","Ge15BGO05",
      "Ge16BGO01","Ge16BGO02","Ge16BGO03","Ge16BGO04","Ge16BGO05", "Ge17BGO01","Ge17BGO02","Ge17BGO03","Ge17BGO04","Ge17BGO05",
      "Ge18BGO01","Ge18BGO02","Ge18BGO03","Ge18BGO04","Ge18BGO05", "Ge19BGO01","Ge19BGO02","Ge19BGO03","Ge19BGO04","Ge19BGO05",
      "Ge20BGO01","Ge20BGO02","Ge20BGO03","Ge20BGO04","Ge20BGO05", "Ge21BGO01","Ge21BGO02","Ge21BGO03","Ge21BGO04","Ge21BGO05",
      "Ge22BGO01","Ge22BGO02","Ge22BGO03","Ge22BGO04","Ge22BGO05", "Ge23BGO01","Ge23BGO02","Ge23BGO03","Ge23BGO04","Ge23BGO05",
      "Ge24BGO01","Ge24BGO02","Ge24BGO03","Ge24BGO04","Ge24BGO05", "Ge25BGO01","Ge25BGO02","Ge25BGO03","Ge25BGO04","Ge25BGO05",
      "Ge26BGO01","Ge26BGO02","Ge26BGO03","Ge26BGO04","Ge26BGO05", "Ge27BGO01","Ge27BGO02","Ge27BGO03","Ge27BGO04","Ge27BGO05",
      "Ge28BGO01","Ge28BGO02","Ge28BGO03","Ge28BGO04","Ge28BGO05", "Ge29BGO01","Ge29BGO02","Ge29BGO03","Ge29BGO04","Ge29BGO05",
      "Ge30BGO01","Ge30BGO02","Ge30BGO03","Ge30BGO04","Ge30BGO05", "Ge31BGO01","Ge31BGO02","Ge31BGO03","Ge31BGO04","Ge31BGO05",
      "Ge32BGO01","Ge32BGO02","Ge32BGO03","Ge32BGO04","Ge32BGO05", "Ge33BGO01","Ge33BGO02","Ge33BGO03","Ge33BGO04","Ge33BGO05",
      "Ge34BGO01","Ge34BGO02","Ge34BGO03","Ge34BGO04","Ge34BGO05", "Ge35BGO01","Ge35BGO02","Ge35BGO03","Ge35BGO04","Ge35BGO05",
      "Ge36BGO01","Ge36BGO02","Ge36BGO03","Ge36BGO04","Ge36BGO05", "Ge37BGO01","Ge37BGO02","Ge37BGO03","Ge37BGO04","Ge37BGO05",
      "Ge38BGO01","Ge38BGO02","Ge38BGO03","Ge38BGO04","Ge38BGO05", "Ge39BGO01","Ge39BGO02","Ge39BGO03","Ge39BGO04","Ge39BGO05",
      "Ge40BGO01","Ge40BGO02","Ge40BGO03","Ge40BGO04","Ge40BGO05", "Ge41BGO01","Ge41BGO02","Ge41BGO03","Ge41BGO04","Ge41BGO05",
      "Ge42BGO01","Ge42BGO02","Ge42BGO03","Ge42BGO04","Ge42BGO05", "Ge43BGO01","Ge43BGO02","Ge43BGO03","Ge43BGO04","Ge43BGO05",
      "Ge44BGO01","Ge44BGO02","Ge44BGO03","Ge44BGO04","Ge44BGO05", "Ge45BGO01","Ge45BGO02","Ge45BGO03","Ge45BGO04","Ge45BGO05",
      "Ge46BGO01","Ge46BGO02","Ge46BGO03","Ge46BGO04","Ge46BGO05", "Ge47BGO01","Ge47BGO02","Ge47BGO03","Ge47BGO04","Ge47BGO05",
      "Ge48BGO01","Ge48BGO02","Ge48BGO03","Ge48BGO04","Ge48BGO05", "Ge49BGO01","Ge49BGO02","Ge49BGO03","Ge49BGO04","Ge49BGO05",
      "Ge50BGO01","Ge50BGO02","Ge50BGO03","Ge50BGO04","Ge50BGO05", "Ge51BGO01","Ge51BGO02","Ge51BGO03","Ge51BGO04","Ge51BGO05",
      "Ge52BGO01","Ge52BGO02","Ge52BGO03","Ge52BGO04","Ge52BGO05", "Ge53BGO01","Ge53BGO02","Ge53BGO03","Ge53BGO04","Ge53BGO05",
      "Ge54BGO01","Ge54BGO02","Ge54BGO03","Ge54BGO04","Ge54BGO05", "Ge55BGO01","Ge55BGO02","Ge55BGO03","Ge55BGO04","Ge55BGO05",
      "Ge56BGO01","Ge56BGO02","Ge56BGO03","Ge56BGO04","Ge56BGO05", "Ge57BGO01","Ge57BGO02","Ge57BGO03","Ge57BGO04","Ge57BGO05",
      "Ge58BGO01","Ge58BGO02","Ge58BGO03","Ge58BGO04","Ge58BGO05", "Ge59BGO01","Ge59BGO02","Ge59BGO03","Ge59BGO04","Ge59BGO05",
      "Ge60BGO01","Ge60BGO02","Ge60BGO03","Ge60BGO04","Ge60BGO05", "Ge61BGO01","Ge61BGO02","Ge61BGO03","Ge61BGO04","Ge61BGO05",
      "Ge62BGO01","Ge62BGO02","Ge62BGO03","Ge62BGO04","Ge62BGO05", "Ge63BGO01","Ge63BGO02","Ge63BGO03","Ge63BGO04","Ge63BGO05",
      "Ge64BGO01","Ge64BGO02","Ge64BGO03","Ge64BGO04","Ge64BGO05"
    ],
    "spectrumList1dPeaks" : {
      "All": []
    },
    "spectrumList2d" : [],
    "spectrumListGates" : [],
    "spectrumListProjectionsPeaks" : {
      "All":[]
    }
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
  thisScript = dataStore.peakFitterScriptTemplate["bgoHValignment"];

  // Get the user input on histogramFileNames
  thisScript.histogramFileNames.push(document.getElementById('HistoListSelect137Cs').value);

  // Setup the peak-fitting script from the template
  receiveScript(JSON.stringify(thisScript));

  ////////////////
  // Set up the menus, reports and display objects
  ////////////////

  // Set up the progress tracking
  setupProgressBarTracking();

  // Create buttons for displaying groups of histograms
  injectButtonsForGroupDisplays();

  // Build the menu list for default 1st clover
  dataStore.plotGroups = buildPlotListGroup(1);     //groups to arrange spectra into for dropdowns

  // Generate the spectrum lists based on the list of detectors
  dataStore._plotListLite = new plotListLite('plotList');
  dataStore._plotListLite.setup();

  // Generate the bgoHValignment report table
  dataStore._bgoHValignmentReport = new bgoHValignmentReport('bgoHValignment');
  dataStore._bgoHValignmentReport.setup();

  // Draw the search region
  dataStore.viewers[dataStore.plots[0]].plotData();

  ////////////////
  // Modify menu buttons
  ////////////////

  // Delete the "Load Histograms" button
  document.getElementById('launchSubmitButton').parentElement.remove();

  // Reveal the clover and pagination menus
  document.getElementById('cloverMenu').classList.remove('hidden');
  document.getElementById('menu').classList.remove('hidden');

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
var color = ["B","G","R","W"];

  var keys = Object.keys(dataStore.rawData);
  for(var index=0; index<keys.length; index++){
    var detName = keys[index].split(":")[1];
    var cloverNum = parseInt(detName.split("BGO")[0].split("Ge")[1]-1/16);
    var colorNum = ((detName.split("BGO")[0].split("Ge")[1]-1)%4);
    var channelName = "GRS" + alwaysThisLong(cloverNum,2) + color[colorNum];
    channelName += "N" + alwaysThisLong(detName.split("BGO")[1],2) + "X";
    // Find the channel with the maximum counts in it
    var maxCountsChannel = 0;
    var maxCountsValue = 0;
    for(var i=0; i<dataStore.rawData[keys[index]].length; i++){
      if(dataStore.rawData[keys[index]][i] > maxCountsValue){
        maxCountsChannel = i;
        maxCountsValue = dataStore.rawData[keys[index]][i];
      }
    }
    // Set the threshold based on the maximum counts
    if(maxCountsValue == 0){ // Empty spectrum
      dataStore.THESEcalibrations[detName] = {
        "detector": channelName,
        "name": detName,
        "maxCountsChannel": 0,
        "maxCountsValue": 0,
        "comptonEdgeThreshold": 0,
        "comptonEdgeChannel": 0,
        "deltaV_1PMT": 0,
        "deltaV_2PMT": 0
      };
      continue;
    }
    thisThreshold = maxCountsValue / 4;
    if(thisThreshold < 4){ thisThreshold = 4; }

    // Find the Compton Edge
    var comptonEdgeChannel = 0;
    for(var i=dataStore.rawData[keys[index]].length-1; i>1; i--){
      if(dataStore.rawData[keys[index]][i] > thisThreshold && dataStore.rawData[keys[index]][i-1] > thisThreshold){
        comptonEdgeChannel = i;
        break;
      }
    }
    var deltaV_1PMT = (-1*(comptonEdgeChannel - 330)/66)*10;
    var deltaV_2PMT = (-1*(comptonEdgeChannel - 660)/66)*5;

    // Save these results to the THESEcalibrations object
    dataStore.THESEcalibrations[detName] = {
      "detector": channelName,
      "name": detName,
      "maxCountsChannel": maxCountsChannel,
      "maxCountsValue": maxCountsValue,
      "comptonEdgeThreshold": thisThreshold,
      "comptonEdgeChannel": comptonEdgeChannel,
      "deltaV_1PMT": deltaV_1PMT.toFixed(0),
      "deltaV_2PMT": deltaV_2PMT.toFixed(0)
    };
  }

  // change information message
  document.getElementById('fetchingMessage').classList.add('hidden');
  document.getElementById('reviewMessage').classList.remove('hidden');

  // Set the current task to keep track of our progress
  dataStore.currentTask = 'Review';

  // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
  var spectrumList = [];
  var histoName = dataStore.currentHistoFileName.split(".")[0];
  spectrumList.push(histoName+":"+dataStore.spectrumList1d[0]);

    console.log(dataStore);
    console.log("Finished");
    console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

    // Default load the Clover1 position
    document.getElementById('CloverButton'+1).click();
}

function injectButtonsForGroupDisplays(){

  dataStore.indexList = {};
  dataStore.indexList["Blue"]  = [ 0, 1, 2, 3, 4];         // Blue BGOs
  dataStore.indexList["Green"] = [ 5, 6, 7, 8, 9];         // Green BGOs
  dataStore.indexList["Red"]   = [10,11,12,13,14]          // Red BGOs
  dataStore.indexList["White"] = [15,16,17,18,19]          // White BGOs
  dataStore.indexList["Front"] = [ 0, 1, 5, 6,10,11,15,16] // Front BGOs
  dataStore.indexList["Side"]  = [ 2, 3, 7, 8,12,13,17,18] // Side BGOs
  dataStore.indexList["Back"]  = [ 4, 9,14,19]             // Back BGOs

  var buttonHTML = ["Blue BGOs","Green BGOs","Red BGOs","White BGOs","Front BGOs","Side BGOs","Back BGOs"];
  var buttonValue = ["Blue","Green","Red","White","Front","Side","Back"];
  // Create the buttons
  for(var i=0; i<buttonValue.length; i++){
    newButton = document.createElement('button');
    newButton.setAttribute('id', "groupDisplayButton"+i);
    newButton.setAttribute('class', 'btn btn-default btn-lg');
    newButton.innerHTML = buttonHTML[i];
    newButton.value = buttonValue[i];
    newButton.style.padding = '4px';
    newButton.onclick = function(){
      var index = dataStore.indexList[this.value];
      var spectrumList = [];
      for(var i=0; i<index.length; i++){ // Blue crystal BGO
        spectrumList.push( dataStore.plotGroups[0].plots[index[i]].plotID );
      }
      plotGroupOfSpectra(spectrumList);
    }.bind(newButton);
    document.getElementById('plotWrapButtons').appendChild(newButton);
  }
}

function buildPositionDetList(cloverNum){
  // Return array of strings for detector names for this position

  // Build the menu list
  var list = [];
  var cloverName = "Clover " + alwaysThisLong(cloverNum,2);
  for(var i=1; i<5; i++){
    for(var k=1; k<6; k++){
      list.push("Ge" + alwaysThisLong(((cloverNum-1)*4)+i,2) + "BGO" + alwaysThisLong(k,2));
    }
  }

  // Return array of strings for detector names for this position
  return(list);
}

function buildPlotListGroup(cloverNum){
  // Return array of objects for use with plotListLite

  // Build the menu list
  var groups = [];
  var histoName = dataStore.spectrumListHistoFileNames[0].split(".")[0];

  var crystalColor = [null,"B","G","R","W"];
  var position = [null, "Front", "Front", "Side", "Side", "Back"];
  // Build the list of spectra for this histogram name
  var cloverName = "Clover " + alwaysThisLong(cloverNum,2);
  var thesePlots = [];
  for(var i=1; i<5; i++){
    for(var k=1; k<6; k++){
      thesePlots.push(
        {
          "plotID": histoName + ":" + "Ge" + alwaysThisLong(((cloverNum-1)*4)+i,2) + "BGO" + alwaysThisLong(k,2),
          "title": "GRG" + alwaysThisLong(cloverNum,2) + crystalColor[i] + " BGO" + alwaysThisLong(k,2) + ", " + position[k]
        });
      }
    }

    // Build the top level dropdown for this histogram name
    groups.push({
      "groupID": cloverName,
      "groupTitle": cloverName,
      "plots": thesePlots
    });

    // Return array of objects for use with plotListLite
    return(groups);
  }

  function loadCloverPosition(cloverNum){

    // Populate the plotListLite with only the spectra for this position
    dataStore.plotGroups = buildPlotListGroup(cloverNum);     //groups to arrange spectra into for dropdowns
    delete dataStore._plotListLite;
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();
    // Open the menu drop-down
    document.getElementById('plotListClover '+alwaysThisLong(cloverNum,2)).click();

    // Populate 1d viewer with spectra for the first crystal of this position only
    var spectrumList = [];
    for(var i=0; i<5; i++){ // Blue crystal BGO
      spectrumList.push( dataStore.plotGroups[0].plots[i].plotID );
    }
    plotGroupOfSpectra(spectrumList);

    // Populate Table with entries for this position only
    dataStore._bgoHValignmentReport.refreshTableData(cloverNum);
  }

  function plotGroupOfSpectra(spectrumList){
    var viewerName = dataStore.plots[0];

    // Remove all spectra
    var keys = Object.keys(dataStore.viewers[viewerName].plotBuffer);
    for(var i=0; i<keys.length; i++){
      dataStore.viewers[viewerName].removeData(keys[i]);
    }

    // Plot spectra in spectrumList
    for(i=0; i<spectrumList.length; i++){
      dataStore.viewers[viewerName].addData(spectrumList[i],dataStore.rawData[spectrumList[i]]);
    }

    // Trigger a redraw
    dataStore.viewers[viewerName].plotData();
  }
