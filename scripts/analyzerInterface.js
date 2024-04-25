////////////////////////////////////////////
// main setup
////////////////////////////////////////////

// This analyzer interface is split into three sub-pages; sorting, histograms and viewer.
// The three sub-pages are contained in wrapper divs which have their class toggled to and from hidden when the menu button is clicked.
// The content for the subpages come from a collection of calls to the server which are containted in the functions;
// initiateSortStatusHeartbeat(), getConfigFileFromServer(), getMidasFileListFromServer(), getHistoFileListFromServer(), getMidasFileDetailsFromServer()
// These functions are all called at the initial load. The displaying of a sub-page does NOT trigger a reload of the content from the server in order to ensure a smooth transition.
//
// Each subpage has two functions which create or reload the content.
// setupAnalyzerSorting(wrapperID): Initial setup function of the Sorting subpage that injects the template and creates input and table objects etc.
// setupSortingContent(): Triggered when new content is received from the server. Removes all table content and rebuilds it for this subpage.
// setupAnalyzerHistograms(wrapperID): Initial setup function of the Histograms subpage that injects the template and creates input and table objects etc.
// setupHistogramsContent(): Triggered when new content is received from the server. Removes all table content and rebuilds it for this subpage.
// setupAnalyzerViewer(wrapperID): Initial setup function of the Viewer subpage that injects the template and creates input and table objects etc.
// setupViewerContent(): Triggered when new content is received from the server. Removes all table content and rebuilds it for this subpage.
//
// Reloading of the various server calls are triggered by certain events.
// initiateSortStatusHeartbeat(): a heartbeat is started on initial load to regularly update the sort status. The frequency of the heartbeat is higher when the Sorting subpage is dispalyed.
// getConfigFileFromServer(): The timestamp of the latest config file is provided in the SortStatus. This is compared to the most recent timestamp at which the getConfigFileFromServer() was called.
//                            If there is a more recent config file available from the server then the getConfigFileFromServer() is triggered and the subpage content updated.
// getMidasFileListFromServer(): A change in the dataStore.midasFileDataDirectoryPath will trigger the getMidasFileListFromServer() function to get a new list and update the subpgae content.
//                               Currently there is no mechanism for this list to be reloaded if there is a new file added to the directory and there is no periodic update.
// getMidasFileDetailsFromServer(): The server can be very slow to respond with the titles of the runs. This is because this title string must be extracted from the odb saved in the .mid file and
//                                  some directories can contain thousands of files. This request is sent after the other requests are received so that there is no wait for initial content.
// getHistoFileListFromServer(): A change in the dataStore.histoFileDirectoryPath will trigger the getHistoFileListFromServer() function to get a new list and update the subpgae content.
//                               After sortStatus indicates the sorting of a file has completed then this function is triggered following a delay.
//

// Declare Global variables
var currentTime         // Global object for current time timeout timer
var dataStore = {};     // Global object to pass variables around

function setupDataStore(){

    // The dataStore object is declared as a global variable.
    // Here we fill the dataStore object with most values
    // Some initial values are filled elsewhere, like getURLArguments() and getConfigFileFromServer()
    
    // General variables
    dataStore.pageTitle = 'Analyzer Interface';               //header title
    //dataStore.spectrumServer = '';                            // [added in GetURLArguments()] analyzer url + port number
    dataStore.ODBhost = 'http://grifstore0.triumf.ca:8081';   // mhttpd server 
    
    // Sorting Status variables
   // dataStore.midasFileDataDirectoryPath = '';                // [added in processConfigFile()] initial data directory path
    dataStore.midasFileDataDirectoryPath = "/tig/grifstore0b/griffin/schedule140/Calibrations-Aug2021";                // [added in processConfigFile()] initial data directory path
    
    dataStore.midasFileList = { "Names" : [], "Sizes" : [], "Titles" : []};  // place to store the list of midas files available to sort which is provided by the server
    dataStore.midasRunList = {};                               // place to store the list of midas runs available to sort which is provided by the server
    dataStore.midasTableLastRowClicked = 1;                    // place to remember the last row number clicked with a single mouse click
    dataStore.CalibrationSource = 'midas';                     // selection the source of calibrations to be applied in the submitted sort job (either midas or config)
    
    dataStore.SortStatusCurrentTimestamp = 10;
    dataStore.SortStatusCurrentFileName = "";
    dataStore.SortStatusCurrentRunNumber = 10001;
    dataStore.SortStatusCurrentSubRunNumber = 10;
    dataStore.SortStatusCurrentFileSize = 100000;
    dataStore.SortStatusCurrentBytesSorted = 10000;
    dataStore.SortStatusCurrentMegaBytesSorted = 10000;
    dataStore.SortStatusCurrentSortSpeed = 10000;
    dataStore.SortStatusCurrentPercentageComplete = 10.0;
    dataStore.SortStatusCurrentRemainingSortTime = 10.0;
    dataStore.SortStatusPreviousTimestamp = 10;
    dataStore.SortStatusPreviousBytesSorted = 10;
    dataStore.SortStatusPreviousMegaBytesSorted = 10;
    dataStore.SortStatusAverageSortSpeed = 10000;
    dataStore.SortStatusSortSpeedHistory = [];
    dataStore.SortStatusHistory = [];
    dataStore.SortStatusPreviousState = 'IDLE';              // Previous state to determine if a file has recently finished sorting. IDLE or BUSY
    
    
    // Gating and Histogram variables
    dataStore.configFileDataDirectoryPath = "/home/grifstor/daq/analyzer/grif-replay";                                 // [added in processConfigFile()] initial config file directory path
 //   dataStore.configFileDataDirectoryPath = '';                                 // [added in processConfigFile()] initial config file directory path
    dataStore.configFileTimestamp = 0;               // Timestamp recorded at the most recent request for the config file (viewConfig)
    dataStore.Configs = {};                          // plase to park Config file information
    dataStore.globalCondition = {                   // place to park Global condition info on the dataStore
        "globalIndex" : 0,               // monotonically increasing counter to create unique IDs for new Glabal condition blocks
	"contents" : []             // array of structures holding the variables and values for each Global condition
    };
    
    dataStore.gateCondition = {                  // place to park Gate condition info on the dataStore
        "gateIndex" : 0,                 // monotonically increasing counter to create unique IDs for new Gate condition blocks
        "nRows" : [],                 // array of monotonic counters for number of rows inserted into Gate condition block; Gate block # == array index. 
	"contents" : []             // array of structures holding the variables and values for each Gate condition
	};
    dataStore.histogramDefinition = {             // place to park Histogram definition info on the dataStore
        "histogramIndex" : 0,            // monotonically increasing counter to create unique IDs for new Histogram condition blocks
        "nRows" : [],            // array of monotonic counters for number of rows inserted into Histogram condition block; Histogram block # == array index. 
        "contents" : []            // place to save Histogram definition parameters
    };
    dataStore.uniqueGlobalName = '';        // place to save the unique global name entered in the modal     
    dataStore.uniqueGateName = '';          // place to save the unique gate namne entered in the modal     
    dataStore.uniqueHistogramName = '';     // place to save the unique histogram namne entered in the modal             
    
    dataStore.sortCodeVariables = [];          // place to store the sort Code Variables available for histograms, gates and conditions
    
    dataStore.logicOptions = [                       // List of logic options used for building Gating conditions
	{
            "short": 'EQ',
            "description": 'Equal to'
	},
	{
            "short": 'LT',
            "description": 'Less than'
	},
	{
            "short": 'LTE',
            "description": 'Less than or equal to'
	},
	{
            "short": 'GT',
            "description": 'Greater than'
	},
	{
            "short": 'GTE',
            "description": 'Greater than or equal to'
	},
	{
            "short": 'NE',
            "description": 'Not equal to'
	},
	{
            "short": 'RA',
            "description": 'Range[Min-Max]'
	}
    ];
    
    // Spectrum viewer variables
    dataStore.histoFileDirectoryPath = "/tig/grifstore0b/griffin/schedule140/Histograms";    // [added in processConfigFile()] initial histogram file directory path
   // dataStore.histoFileDirectoryPath = '';    // [added in processConfigFile()] initial histogram file directory path
    dataStore.histoFileList = [];                                                            // place to store the list of histogram files available to be opened
    dataStore.histoFileName = "run21850_000.tar";                        // place to store the name of the histogram file to be opened
    dataStore.histoFileSpectrumList = [],                                // place to store the current list of spectra available from the current histogram file
    dataStore.histoSumFilename = "SummedHisto.tar";                      // initial filename for a sum of histogram files
    dataStore.pageTitle = 'Spectrum Viewer';                             //header title
    dataStore.topGroups = [];                                            //groups in top nav row
    dataStore.waveformSnap = true;                                       //do we want the snap to waveform functionality?
    dataStore.doUpdates = true;                                          //do we want the data update button and loop?
    dataStore.scaling = false;                                           //do we want to expose x-axis rescaling UI?
    dataStore.plots = [];                                                //array of names for default plot cells
    dataStore.ODBrequests = [];                                          //array of odb requests to make on refresh
    dataStore.zeroedPlots = {};                                          //initialize empty object for zeroed plots
    
    // Heartbeat variables
    dataStore.heartbeat = {                               // queries and callbacks for the periodic data poll
        "URLqueries": [],                        // elements == ['url string', 'response type string', callback]; response type can be 'arraybuffer' or 'json'
        "scriptQueries": [],
        "ADCrequest": [],                         // same format as URL queries.
	"errorMessage": ''
    }; 
    dataStore.heartbeatInterval = 1000;                   // ms between data updates
    dataStore.heartbeatIntervalBUSYvalue = 1000;          // default Busy inteval
    dataStore.heartbeatIntervalIDLEvalue = 5000;          // default IDLE inteval
    dataStore.heartbeatTimer = '';                        // the TimeOut object so that it can be terminated with a clearTimeout call
    dataStore.waitCounter = 0;
    
}

// Control the initial load workflow
function onloadInitialSetup(){

// Set up the data store. Once that is done then the event listeners can be added.
    //setupDataStore(setupEventListeners);
    Promise.all([
	setupDataStore(),
	GetURLArguments(setupEventListeners)
    ]
	       ).then(
		   function(){
		       // Do the work of getConfigFileFromServer() but with a resolved promise
		       // get the Global conditions, Gates conditions and Histogram definitions from the server/ODB
		       url = dataStore.spectrumServer + '/?cmd=viewConfig';
		       promiseXHR(url, "Problem getting Config file from analyzer server", processConfigFile, function(error){ErrorConnectingToAnalyzerServer(error)});
		   }
	       )
    
}

// Top level promise to control the initial load workflow
Promise.all([
    onloadInitialSetup()
]).then(
 	                              
    getMidasFileListFromServer(),
    getHistoFileListFromServer()
);

/////////////////
// helpers
/////////////////

function fetchCallback(){
    //fires after all data has been updated

    var i, 
        keys = Object.keys(dataStore.viewers);

    for(i=0; i<keys.length; i++){
        dataStore.viewers[keys[i]].plotData(null, true);
    }
}

function setupEventListeners(){

	window.addEventListener('HTMLImportsLoaded', function(e) {

	///////////////
	// initial setup
	///////////////

	
	///////////////////////////
	//handle templates
	///////////////////////////
	    dataStore.templates = prepareTemplates(['header', 'analyzer-menu', 'analyzer-sorting', 'analyzer-histograms', 'analyzer-viewer', 'globalBlock', 'gateBlock', 'histogramBlock', 'histogramConditionRow', 'gateConditionRow', 'plotList', 'plotGrid', 'plotControl', 'auxPlotControl', 'auxPlotControlTable', 'fitRow', 'footer']);
       	    
            setupHeader('head', 'Analyzer Interface');
	    setupAnalyzerMenu('menu');
	    setupAnalyzerSorting('AnalyzerDisplaySorting');
	    setupAnalyzerHistograms('AnalyzerDisplayHistograms');
	    setupAnalyzerViewer('AnalyzerDisplayViewer');
	    setupFooter('foot');
	    
	    // Launch the current time counter which includes a timeout
	    updateTime();

	    // Launch the heartbeat for regularly grabbing the sort status
	    initiateSortStatusHeartbeat();
	    
	});
}

function ErrorConnectingToAnalyzerServer(error){
    var string = 'Problem connecting to analyzer server: '+dataStore.spectrumServer+'<br>'+error;
    document.getElementById('messageDiv').innerHTML = string;
    document.getElementById('messageDiv').style.display= 'block';

    // Stop the heartbeat if the server is not responding
    clearTimeout(dataStore.heartbeatTimer);
}

function updateTime(){

   // var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    var today = new Date();
  //  var dateNow = today.getFullYear() + '-' + months[today.getMonth()] + '-' + today.getDate();
  //  var timeNow = today.getHours() + ':' + today.getMinutes().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ':' + today.getSeconds().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
    document.getElementById('currentDateTimeDisplay').innerHTML = today.toString();
    // console.log(timeNow);
    
    window.clearTimeout(currentTime)
    currentTime = window.setTimeout(updateTime, 1000);
}

function processSortStatus(payload){

    // A response was received from the server, so ensure the connection error is not displayed
    ClearErrorConnectingToAnalyzerServer();
    
    //
    // The function in the analyzer server (c syntax)  
    //int send_sort_status(int fd)
    //{
    //   char tmp[256];
    //   sprintf(tmp,"%d %d %ld %ld", current_run, current_subrun, current_filesize, midas_bytes);
    //   put_line(fd, tmp, strlen(tmp) );
    //   return(0);
    // }
    //
    // dataStore.SortStatusHistory.push(payload);
    // console.log(dataStore.SortStatusHistory);
    // Handle the Analyzer IDLE response
    // Set the progress bar to orange and write a status message
    if(strncmp(payload,'IDLE',4)){

	// Check the timestamp of the most recent config file saved on the server
	checkConfigTimestamps(payload.split(' ')[1]);

	// Check if a file just finished sorting and if so, grab the latest list of histogram files
	// Need to add somewhere a way to detect that one file in the queue has completed, while others are still sorting
	if(dataStore.previousSortStatus != 'IDLE'){
	    getHistoFileListFromServer();
	}
	dataStore.previousSortStatus = 'IDLE';
	
	// Set the heartbeat frequency
	dataStore.heartbeatInterval = dataStore.heartbeatIntervalIDLEvalue;
	
	// Update the progress bar
	document.getElementById('progress').className = 'progress-bar progress-bar-warning progress-bar-striped';
	document.getElementById('progress').setAttribute('style', 'width:' + 100 + '%' );
	document.getElementById('progress').innerHTML = 'Analyzer is idle, ready for files to be submitted.';
	document.getElementById("SortingStatus").innerHTML = 'Analyzer is idle, ready for files to be submitted.';
	return;
    }else{
	// Set the heartbeat frequency
	dataStore.heartbeatInterval = dataStore.heartbeatIntervalBUSYvalue;
	
	// Remember the sorting state
	dataStore.previousSortStatus = 'BUSY';
    }
    
    // Handle the Analyzer running response
    // [Data Directory] [Filename] [Run number] [Subrun number] [File size in bytes] [bytes sorted]
    // The above line repeats for all files in the current queue

    // Timestamp this Sort Status (in seconds)
    dataStore.SortStatusCurrentTimestamp = Math.floor(Date.now() / 1000);

    // Unpack the Sort Status response from the server
    var thisPayload = payload.split(" ");
  //  console.log(thisPayload);
    dataStore.midasFileDataDirectoryPath = thisPayload[0];
    dataStore.SortStatusCurrentFileName = thisPayload[1];
    dataStore.SortStatusCurrentRunNumber = parseInt(thisPayload[2]);
    dataStore.SortStatusCurrentSubRunNumber = parseInt(thisPayload[3]);
    dataStore.SortStatusCurrentBytesFileSize = parseInt(thisPayload[4]);
    dataStore.SortStatusCurrentFileSize = parseInt(thisPayload[4] / 1000000);
    dataStore.SortStatusCurrentBytesSorted = parseInt(thisPayload[5]);
    dataStore.SortStatusCurrentMegaBytesSorted = parseInt(thisPayload[5] / 1000000);

    /*
    console.log('===================================');
    console.log('Dir, File, Run, Subrun:');
    console.log(dataStore.midasFileDataDirectoryPath);
    console.log(dataStore.SortStatusCurrentFileName);
    console.log(dataStore.SortStatusCurrentRunNumber);
    console.log(dataStore.SortStatusCurrentSubRunNumber);
    console.log('Filesize, bytes sorted, Config timestamp:');
    console.log(dataStore.SortStatusCurrentBytesFileSize);
    console.log(dataStore.SortStatusCurrentBytesSorted);
    console.log(thisPayload[6]);
    */
    
    // Check the timestamp of the most recent config file saved on the server
    checkConfigTimestamps(thisPayload[6].split(',')[0]);

    // Skip the first update so that we can have valid sort speed values
    if(dataStore.SortStatusPreviousTimestamp<100){
	dataStore.SortStatusPreviousTimestamp = dataStore.SortStatusCurrentTimestamp;
	dataStore.SortStatusPreviousBytesSorted = dataStore.SortStatusCurrentBytesSorted;
	dataStore.SortStatusPreviousMegaBytesSorted = dataStore.SortStatusCurrentMegaBytesSorted;
    }

    // Calculate quantities from the current Sort Status values
    dataStore.SortStatusCurrentSortSpeed = parseFloat((dataStore.SortStatusCurrentMegaBytesSorted-dataStore.SortStatusPreviousMegaBytesSorted)/(dataStore.SortStatusCurrentTimestamp - dataStore.SortStatusPreviousTimestamp)).toFixed(1);
    calculateAverageSortSpeed();
    dataStore.SortStatusCurrentPercentageComplete = parseFloat((dataStore.SortStatusCurrentMegaBytesSorted/dataStore.SortStatusCurrentFileSize)*100.0).toFixed(1);
    dataStore.SortStatusCurrentRemainingSortTime = parseFloat((dataStore.SortStatusCurrentFileSize-dataStore.SortStatusCurrentMegaBytesSorted)/dataStore.SortStatusCurrentSortSpeed).toFixed(1);

    /*
    console.log('===================================');
    console.log(dataStore.SortStatusCurrentTimestamp);
    console.log(dataStore.SortStatusSortSpeedHistory);
    console.log(dataStore.SortStatusCurrentSortSpeed);
    console.log(dataStore.SortStatusAverageSortSpeed);
    */
    
    // Protect against nonsense values, but also against divide by zero errors
    if(dataStore.SortStatusCurrentSortSpeed<0){ dataStore.SortStatusCurrentSortSpeed=0.1; }
    if(!dataStore.SortStatusCurrentSortSpeed){ dataStore.SortStatusCurrentSortSpeed=0.1; }
    if(dataStore.SortStatusCurrentPercentageComplete<0){ dataStore.SortStatusCurrentPercentageComplete=0.1; }
    if(dataStore.SortStatusCurrentRemainingSortTime<0){ dataStore.SortStatusCurrentRemainingSortTime=0.1; }

    // Check the values in the console
    /*
    console.log('Dir: '+dataStore.midasFileDataDirectoryPath);
    console.log('File: '+dataStore.SortStatusCurrentFileName);
    console.log('Run: '+dataStore.SortStatusCurrentRunNumber);
    console.log('Sub: '+dataStore.SortStatusCurrentSubRunNumber);
    console.log('Size: '+dataStore.SortStatusCurrentFileSize+' MB');
    console.log('Sorted: '+dataStore.SortStatusCurrentBytesSorted+' Bytes');
    console.log('Sorted: '+dataStore.SortStatusCurrentMegaBytesSorted+' MB');
    console.log('Percent: '+dataStore.SortStatusCurrentPercentageComplete);
    console.log('Current Speed: '+dataStore.SortStatusCurrentSortSpeed);
    console.log('Average Speed: '+dataStore.SortStatusAverageSortSpeed);
    console.log('Remaining: '+dataStore.SortStatusCurrentRemainingSortTime);
    */

    // Update the printed Sort Status information on screen
    string = 'Run '+dataStore.SortStatusCurrentRunNumber+', subrun '+dataStore.SortStatusCurrentSubRunNumber+' at '+dataStore.SortStatusAverageSortSpeed+' MB/s. Sorted '+prettyFileSizeString(dataStore.SortStatusCurrentBytesSorted)+' of '+prettyFileSizeString(dataStore.SortStatusCurrentBytesFileSize)+'s ('+dataStore.SortStatusCurrentPercentageComplete+'% completed).<br>Estimated '+prettyTimeString(parseInt(dataStore.SortStatusCurrentRemainingSortTime))+' remaining.';
    document.getElementById("SortingStatus").innerHTML = string;

    // Update the progress bar to show the current sort progress
    if(document.getElementById('progress').className == 'progress-bar progress-bar-warning progress-bar-striped'){
	document.getElementById('progress').className = 'progress-bar progress-bar-success progress-bar-striped';
    }
    document.getElementById('progress').setAttribute('style', 'width:' + dataStore.SortStatusCurrentPercentageComplete + '%' );
    document.getElementById('progress').innerHTML = dataStore.SortStatusCurrentPercentageComplete+'% Completed';

    // Save the timestamp and bytes sorted for use at the next update
    dataStore.SortStatusPreviousTimestamp = dataStore.SortStatusCurrentTimestamp;
    dataStore.SortStatusPreviousMegaBytesSorted = dataStore.SortStatusCurrentMegaBytesSorted;

    // Update the Sort queue table
    var thisPayloadArray = payload.split(",");
    document.getElementById("JobsQueue").innerHTML = '';
    var totalQueueFileSize = 0;
    for(i=0; i<thisPayloadArray.length-1; i++){
	var thisPayload = thisPayloadArray[i].split(" ");
	if(i>0){
	    document.getElementById("JobsQueue").innerHTML += '<br>'+thisPayload[1]+' ('+prettyFileSizeString(thisPayload[4])+', requires '+prettyTimeString(parseInt(thisPayload[4] / 1000000)/dataStore.SortStatusAverageSortSpeed)+' to sort)';
	    totalQueueFileSize += parseInt(thisPayload[4]);
	}else{
	    document.getElementById("JobsQueue").innerHTML += thisPayload[1]+' ('+prettyFileSizeString(thisPayload[4])+', requires '+prettyTimeString(parseInt(thisPayload[4] / 1000000)/dataStore.SortStatusAverageSortSpeed)+' to sort)';
	}
    }
    if(totalQueueFileSize>0){
   // document.getElementById("JobsQueue").innerHTML += '<br>Time to sort entire queue is '+parseFloat(totalQueueFileSize/dataStore.SortStatusAverageSortSpeed).toFixed(1)+' seconds';
	document.getElementById("JobsQueue").innerHTML += '<br>Time to sort entire queue of '+(thisPayloadArray.length-1)+' runs ('+prettyFileSizeString(totalQueueFileSize)+') is '+prettyTimeString((totalQueueFileSize/1000000)/dataStore.SortStatusAverageSortSpeed);
    }
}

function checkConfigTimestamps(serverTimestamp){

    // Compare this lastest Config timestamp received from the sever with the timestamp saved the last time we received a Config file
    // If our local version is out-of-date then request the lastest version from the server
    if(serverTimestamp > dataStore.configFileTimestamp){
	getConfigFileFromServer();
    }
}
