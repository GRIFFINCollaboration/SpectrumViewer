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

  // Histogram directory and filename
  dataStore.histoFileDirectoryPath = '/Users/garns/Work/Data';
  dataStore.histoFileName = '';
  dataStore.histoAutoLoad = false;        // Flag set by the presence of a directory and filename in the URL to automatically load it. Default is off.

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Peak Fitter';                                   //header title
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

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.

  // Workflow management and progress tracking
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "peakFitterProgress";                        // id of the Div with class = "progress-bar ..."
  dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
  dataStore.progressBarTasksCompleted = 0;                           // Number of tasks completed so far for use with the progress bar

  // Script configuration - all are arrays used only as user input
  // The 'peakFitterScript' can be provided by the user as an upload and will be copied into this 'dataStore.peakFitterScript' object
  dataStore.peakFitterScript = {
    'histogramFileNames' : [],                                // List of all the histogram files
    'spectrumList1d' : [],                                    // Names of all the 1d spectra
    'spectrumList1dPeaks' : [],                               // List of all peak centroids to be fitted in the 1d spectra
    'spectrumList2d' : [],                                    // Names of all the 2d spectra
    'spectrumListGates' : [[],[]],                            // List of all the gate limits to make projections from the 2d spectra, [[low bin, high bin], [low bin, high bin], ...]
    'spectrumListProjectionsPeaks' : []                      // List of all peak centroids to be fitted in the projected 1d spectra from the 2d spectra
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

  // Test example setup
  dataStore.peakFitterScript = {
    'histogramFileNames' : [],                                // List of all the histogram files
    'spectrumList1d' : [],                                    // Names of all the 1d spectra
    'spectrumList1dPeaks' : [],                               // List of all peak centroids to be fitted in the 1d spectra
    'spectrumList2d' : [],                                    // Names of all the 2d spectra
    'spectrumListGates' : [],
    // List of all the gate limits to make projections from the 2d spectra,
    // Format for gates: 'matrixname': [[axis,gateMin,gateMax,BG1SF,BG1Min,BG1Max,BG2SF,BG2Min,BG2Max], [], ...]
    'spectrumListProjectionsPeaks' : []                      // List of all peak centroids to be fitted in the projected 1d spectra from the 2d spectra
  };


  //receiveScript(JSON.stringify(dataStore.peakFitterScript));

  console.log(dataStore);
}
setupDataStore();

function setupHistoListSelect(){
  return;
  // Remove the select if it already exists
  try{
    document.getElementById('HistoListSelect').remove();
    document.getElementById('HistoListSelectLabel').remove();
  }
  catch(err){ }

  // Create a select input for the histo file list
  var newSelect = document.createElement("select");
  newSelect.id = 'HistoListSelect';
  newSelect.name = 'HistoListSelect';
  newSelect.onchange = function(){
    var valueString = document.getElementById('inputHistogramFiles').value;
    if(valueString.length>1){ valueString += ","; }
    document.getElementById('inputHistogramFiles').value = valueString + this.value;
  }.bind(newSelect);
  document.getElementById('histo-list-menu-div').appendChild(newSelect);

  // Add the list of histo files as the options
  thisSelect = document.getElementById('HistoListSelect');
  for(var j=0; j<dataStore.histoFileList.length; j++){
    thisSelect.add( new Option(dataStore.histoFileList[j], dataStore.histoFileList[j]) );
  }

  // Fire the onchange event for the select with the default value to set it
  //document.getElementById('HistoListSelect'+thisTitle).onchange();

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
  console.log("\nlaunchPeakFittingProcess");
  console.log("Begin the auto process...");


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
    dataStore.plotGroups = groups;     //groups to arrange spectra into for dropdowns

    // Generate the spectrum lists based on the list of detectors
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();

    // Generate the peakFitter report table
    dataStore._peakFitterReport = new peakFitterReport('peakFitter');
    dataStore._peakFitterReport.setup();

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

    // Request the config file for this histogram file in order to get the details on runtime
    // First format check for the data file directory path
    var filename = dataStore.histoFileDirectoryPath;
    if(filename[filename.length]!='/'){
      filename += '/';
    }
    filename += dataStore.histoFileName;
    url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
    XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForRunDetails, function(error){ErrorConnectingToAnalyzerServer(error)});

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
    console.log('\n=======================================================fetchCallback');
    console.log(dataStore);

    // Create the objects for each matrix in the local storage
    // createAllLocalMatrices(listOfMatrices,callback);
    createAllLocalMatrices(dataStore.spectrumList2d,createAllLocalMatricesCallback);

  }

  function createAllLocalMatricesCallback(){

    // Now change the DOM in preparation for peak inputs needed for projections
    console.log("\n=======================================================createAllLocalMatricesCallback");
    console.log("finished unpacking");
    console.log(dataStore);

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
      console.log('\n=======================================================projectionsCallback');

      console.log('Projections have been made so all spectra are ready for fitting.');
      console.log('Ready to fit all spectra');

      // Need to move these projections into the dataStore.spectrumListProjections object
      // Need to add these projections to the spectrum menu
      var keys = Object.keys(dataStore.createdSpectra);
      var histoName = dataStore.histoFileName.split(".")[0];

      for(i=0; i<keys.length; i++){
        // Only process the newly created projections for the current histogram file
        if(!keys[i].includes(histoName)){ continue; }

        // Add this projection spectrum to the list which need to be fitted
        dataStore.spectrumListProjections.push(keys[i]);

        // Create the list of peaks to fit for this projection if it does not alreayd exist.
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

        // Add the list of peaks for this projection name, if it exists
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

      console.log(dataStore);

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
      console.log("\n=======================================================fittingCallback");

      if(dataStore.currentTask == 'SinglesFitting'){
        // Now perform peak fitting for projections
        console.log("Now initiate projections fitting");

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


      // Organize the results from this file into the table
      //  populateReportTable();

      // If we have not recieved the histograms from all files yet, request the histograms from the next filename
      if(dataStore.histoFileName != dataStore.spectrumListHistoFileNames[dataStore.spectrumListHistoFileNames.length-1]){
        dataStore.histoFileName = dataStore.spectrumListHistoFileNames[dataStore.spectrumListHistoFileNames.indexOf(dataStore.histoFileName)+1];
        console.log('Next histogram file to fetch: '+dataStore.histoFileName);

        // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
        dataStore.currentHistoFileName = dataStore.histoFileName;

        // Request the config file for this histogram file in order to get the details on runtime
        // First format check for the data file directory path
        var filename = dataStore.histoFileDirectoryPath;
        if(filename[filename.length]!='/'){
          filename += '/';
        }
        filename += dataStore.histoFileName;
        url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
        XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForRunDetails, function(error){ErrorConnectingToAnalyzerServer(error)});

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
      document.getElementById('postProcessDiv').classList.remove('hidden');

      // change information message
      document.getElementById('fittingProjectionsMessage').classList.add('hidden');
      document.getElementById('reviewMessage').classList.remove('hidden');

      // Display the results in the table
      dataStore._peakFitterReport.updateTable();

      console.log(dataStore);
      console.log("Finished");
      console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

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


    function postProcessPUFirstHit(){
      // Post processing for 2-Hit pileup, 1st Hit correction as function of k.
      //
      // Perform 6th order polynomial fit of correction factor as function of k.
      // Result is function describing correction factor as function of k.
      console.log("\n\n==============================\n  Post-processing for pile-up, k dependance correction...\n\n");

      var keys = Object.keys(dataStore.fitResults);
      if(typeof(dataStore.fitResults["run29578-no-2ndHit-Correction:single_hit"]) != "undefined"){
        var singleHitEnergy = dataStore.fitResults["run29578-no-2ndHit-Correction:single_hit"][0][1]; // Get the single hit centroid energy of 1332keV peak
      }else{
        var singleHitEnergy = dataStore.fitResults["run29572:single_hit"][0][1]; // Get the single hit centroid energy of 1408keV peak
      }


      var thisGeindex = 1; // Eventually will be a loop here over all Ge
      var GeNum = 1;
      //var GeString = "Ge" + alwaysThisLong(GeNum, 2);
      var GeString = "Ge" + GeNum;
      var matrixString = "_E_vs_k_1st_of_2hitx";
      var data = [];
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
          }
        }
      }

      // Add the single hit data point. This seems to be important.
      data.push([379,1.0]);

      console.log(data);
      // Perform 6th order polynomial fit of the series of y=correction factor as a function of x=k.
      // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
      const result = regression.polynomial(data, { order: 6, precision: 20 });

      console.log(result.equation);
      console.log(result.string);       //  A string representation of the equation

      // Save the Cstring.
      // An array of the parameters for this HPGe
      var Cmstring = "{"
      for(var i=result.equation.length-1; i>=0; i--){ Cmstring += result.equation[i]; if(i>0){ Cmstring += ","; } }
      Cmstring += "},";

      var Ccstring = "{"
      for(var i=result.equation.length-1; i>=0; i--){ Ccstring += result.equation[i]; if(i>0){ Ccstring += ","; } }
      Ccstring += "},";

      console.log(Cmstring);
      console.log(Ccstring);
    }


    function postProcessPUSecondHit(){
      // Post processing for 2-Hit pileup, energy2 vs energy1 as function of k.
      //
      // Perform linear fit of each series of projections for each 2d spectrum.
      // Result y=mx+c where y = correction to E2, x=E1, m=gradient for this k value, c=intercept for this k value.
      //
      // Perform 6th order polynomial fit of m and c coefficients of the above.
      // Result is function describing m and c as function of k.
      //
      var kData = [];
      var mData = [];
      var cData = [];

      var keys = Object.keys(dataStore.fitResults);
      if(typeof(dataStore.fitResults["run29578:single_hit"]) != "undefined"){
        var singleHitEnergy = dataStore.fitResults["run29578:single_hit"][1][1]; // Get the single hit centroid energy of 1332keV peak
      }else if(typeof(dataStore.fitResults["run29572:single_hit"]) != "undefined"){
        var singleHitEnergy = dataStore.fitResults["run29572:single_hit"][0][1]; // Get the single hit centroid energy of 1332keV peak
      }else{
        var singleHitEnergy = dataStore.fitResults["run29543-k-dependance-corrected:single_hit"][0][1]; // Get the single hit centroid energy of 1408keV peak
      }

      // Perform linear fit of each series of projections for each 2d spectrum.
      // Result y=mx+c where y = correction to E2, x=E1, m=gradient for this k value, c=intercept for this k value.
      var thisGeindex = 1; // Eventually will be a loop here over all Ge
      var GeNum = 1;
      var GeString = "Ge" + alwaysThisLong(GeNum, 2);
      for(var thisKvalue=10; thisKvalue<380; thisKvalue+=20){

        var Kstring = "k"+thisKvalue+"x";
        kData.push(thisKvalue);

        // Format the data for this detector
        var data = [];

        for(var j=0; j<keys.length; j++){

          if(keys[j].includes(Kstring)){

            // Omit failed peak fit results. Test the centroid for NaN.
            if(isNaN(dataStore.fitResults[keys[j]][0][1])){ continue; }

            // xValue is the E1 energy. Calculate from gate in the projection name
            var tail = keys[j].split(Kstring)[1];
            tail = tail.substr(1);
            var xValue = parseInt(tail.split("-")[1]-tail.split("-")[0]/2);

            // yValue is the correction required to E2, derived from the centroid of this fit
            var yValue = parseFloat(1.0-(dataStore.fitResults[keys[j]][0][1]/singleHitEnergy)+1.0);

            data.push([xValue,yValue]);
          }
        }

        // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
        const result = regression.polynomial(data, { order: 1, precision: 20 });

        // Save the fit results into the object for this detector
        mData.push(result.equation[0]);  // The coefficient of the slope term of the equation
        cData.push(result.equation[1]);  // The coefficient of the offset term of the equation
      }

      console.log(kData);
      console.log(mData);
      console.log(cData);

      // Perform 6th order polynomial fit of each series of m and c as a function of k.
      console.log("Now fit the m coefficient as a function of k");
      var data = [];
      for(var i=0; i<kData.length; i++){
        data.push([kData[i],mData[i]]);
      }

      // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
      const result_m = regression.polynomial(data, { order: 6, precision: 20 });

      console.log(result_m.equation);
      console.log(result_m.string);       //  A string representation of the equation

      console.log("Now fit the c coefficient as a function of k");
      var data = [];
      for(var i=0; i<kData.length; i++){
        data.push([kData[i],cData[i]]);
      }

      // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
      const result_c = regression.polynomial(data, { order: 6, precision: 20 });

      console.log(result_c.equation);
      console.log(result_c.string);       //  A string representation of the equation

      // Save the Cstring.
      // An array of the parameters for this HPGe
      var Cmstring = "{"
      for(var i=result_m.equation.length-1; i>=0; i--){ Cmstring += result_m.equation[i]; if(i>0){ Cmstring += ","; } }
      Cmstring += "},";

      var Ccstring = "{"
      for(var i=result_c.equation.length-1; i>=0; i--){ Ccstring += result_c.equation[i]; if(i>0){ Ccstring += ","; } }
      Ccstring += "},";

      console.log(Cmstring);
      console.log(Ccstring);
    }
