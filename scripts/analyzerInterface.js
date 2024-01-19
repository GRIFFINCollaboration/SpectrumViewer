////////////////////////////////////////////
// main setup
////////////////////////////////////////////

// Obtain the MIDAS server information from the URL
var urlData = parseQuery();
var thisSpectrumServer = 'http://'+urlData.backend+'.triumf.ca:'+urlData.port;
//var thisSpectrumServer = 'http://grifstore1.triumf.ca:9093';

// Declare Global variables
var currentTime         // Global object for current time timeout timer
var dataStore = {};     // Global object to pass variables around

function setupDataStore(callback){
    
    // Create the dataStore object
    dataStore = {
	// General variables
        "pageTitle": 'Analyzer Interface',               //header title
        "spectrumServer": thisSpectrumServer,            //analyzer url + port number
	"ODBhost": 'http://grifstore0.triumf.ca:8081',   // mhttpd server 

	// Sorting Status variables
	"configFileDataDirectoryPath": "/home/grifstor/daq/analyzer/grif-replay",                                 // initial config file directory path
	"midasFileDataDirectoryPath": "/tig/grifstore0b/griffin/schedule140/Calibrations-Aug2021",                // initial data directory path
	"midasFileList": { "Names" : [], "Sizes" : [] },  // place to store the list of midas files available to sort which is provided by the server
	"midasRunList": {},                               // place to store the list of midas runs available to sort which is provided by the server

	"SortStatusCurrentTimestamp" : 10,
	"SortStatusCurrentFileName" : "",
	"SortStatusCurrentRunNumber" : 10001,
	"SortStatusCurrentSubRunNumber" : 10,
	"SortStatusCurrentFileSize" : 100000,
	"SortStatusCurrentMegaBytesSorted" : 10000,
	"SortStatusCurrentSortSpeed" : 10000,
	"SortStatusCurrentPercentageComplete" : 10.0,
	"SortStatusCurrentRemainingSortTime" : 10.0,
	"SortStatusPreviousTimestamp" : 10,
	"SortStatusPreviousMegaBytesSorted" : 10,
	"SortStatusAverageSortSpeed" : 10000,
	"SortStatusSortSpeedHistory" : [],

	
	// Gating and Histogram variables
	"Configs" : {},                          // plase to park Config file information
        "globalCondition" : {                   // place to park Global condition info on the dataStore
                "globalIndex" : 0,               // monotonically increasing counter to create unique IDs for new Glabal condition blocks
	    "contents" : []             // array of structures holding the variables and values for each Global condition
    	},
	
        "gateCondition" : {                  // place to park Gate condition info on the dataStore
              "gateIndex" : 0,                 // monotonically increasing counter to create unique IDs for new Gate condition blocks
            "nRows" : [],                 // array of monotonic counters for number of rows inserted into Gate condition block; Gate block # == array index. 
	    "contents" : []             // array of structures holding the variables and values for each Gate condition
	},
        "histogramDefinition" : {             // place to park Histogram definition info on the dataStore
                   "histogramIndex" : 0,            // monotonically increasing counter to create unique IDs for new Histogram condition blocks
            "nRows" : [],            // array of monotonic counters for number of rows inserted into Histogram condition block; Histogram block # == array index. 
            "contents" : []            // place to save Histogram definition parameters
	},
	"uniqueGloablName" : '',        // place to save the unique global namne entered in the modal     
	"uniqueGateName" : '',          // place to save the unique gate namne entered in the modal     
	"uniqueHistogramName" : '',     // place to save the unique histogram namne entered in the modal             

        "sortCodeVariables" : [],          // List of sort Code Variables available for histograms, gates and conditions

	"logicOptions" : [                       // List of logic options used for building Gating conditions
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
	],
	
	// Spectrum viewer variables
	"histoFileDirectoryPath": "/tig/grifstore0b/griffin/schedule140/Histograms",    // initial histogram file directory path
	"histoFileList": [],                                                            // place to store the list of histogram files available to be opened
	"histoFileName": "run21850_000.tar",                        // place to store the name of the histogram file to be opened
	"histoFileSpectrumList": [],                                // place to store the current list of spectra available from the current histogram file
	"histoSumFilename": "SummedHisto.tar",                      // initial filename for a sum of histogram files
        "pageTitle": 'Spectrum Viewer',                             //header title
        "topGroups": [],                                            //groups in top nav row
        "waveformSnap": true,                                       //do we want the snap to waveform functionality?
        "doUpdates": true,                                          //do we want the data update button and loop?
        "scaling": false,                                           //do we want to expose x-axis rescaling UI?
        "plots": [],                                                //array of names for default plot cells
        "ODBrequests": [],                                          //array of odb requests to make on refresh
        "zeroedPlots": {},                                          //initialize empty object for zeroed plots
	
      // Heartbeat variables
    "heartbeat": {                               // queries and callbacks for the periodic data poll
        "URLqueries": [],                        // elements == ['url string', 'response type string', callback]; response type can be 'arraybuffer' or 'json'
        "scriptQueries": [],
        "ADCrequest": [],                         // same format as URL queries.
	"errorMessage": ''
	
    }, 
    "heartbeatInterval": 1000,                   // ms between data updates
    "heartbeatTimer": '',                        // the TimeOut object so that it can be terminated with a clearTimeout call
  }

    callback();
}

// Get the Spectrum List from the server and then set up the data store. Once that is done then the event listeners can be added.
setupDataStore(setupEventListeners);


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
    console.log('Execute setupEventListeners...');

    
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
	    setupAnalyzerSorting('AnalyzerDisplay');
	    setupFooter('foot');
	    
	    // Launch the current time counter which includes a timeout
	    updateTime();
	    
	});
    
    console.log('Finished setupEventListeners');
}

function ErrorConnectingToAnalyzerServer(error){
    var string = 'Problem connecting to analyzer server: '+thisSpectrumServer+'<br>'+error;
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
