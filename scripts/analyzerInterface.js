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
	"configFileDataDirectoryPath": "/home/grifstor/daq/analyzer/grif-replay",                // initial config file directory path
	"midasFileDataDirectoryPath": "/tig/grifstore0b/griffin/schedule140/Calibrations-July2021",                // initial data directory path
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
	/*
            // HPGe
	    {
            "short": 'HPGeE',
            "description": 'Singles HPGe Energy in keV with Compton suppression'
	    },
	    {
            "short": 'HPGeA',
            "description": 'Addback HPGe Energy in keV with Compton suppression'
	    },
	    {
            "short": 'HPGeT',
            "description": 'HPGe Time from CFD in nanoseconds'
	    },
	    {
            "short": 'HPGeTS',
            "description": 'HPGe Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'HPGePH',
            "description": 'Singles HPGe raw Pulse Height in ADC units'
	    },
	    {
            "short": 'HPGeC',
            "description": 'HPGe detector number (1-64)'
	    },
	    {
            "short": 'HPGeCl',
            "description": 'HPGe Clover number (1-16)'
	    },
	    {
            "short": 'HPGePU',
            "description": 'HPGe Pileup value equal to number of Hits'
	    },
	    {
            "short": 'HPGeIP',
            "description": 'HPGe Integration period of the Pulse Height evaluation algorithum'
	    },
	    {
            "short": 'HPGeDT',
            "description": 'HPGe deadtime accumulated since previous accepted hit'
	    },
	    {
            "short": 'HPGeEU',
            "description": 'Singles HPGe Energy in keV without Compton suppression'
	    },
	    {
            "short": 'HPGeAU',
            "description": 'Addback HPGe Energy in keV without Compton suppression'
	    },
	    {
            "short": 'GRGTHETA',
            "description": 'Theta angle of HPGE crystal with respect to the beam axis'
	    },
	    {
            "short": 'GRGPHI',
            "description": 'Phi angle of HPGE crystal with respect to lab coordinate system'
	    },
	    {
            "short": 'CLVTHETA',
            "description": 'Theta angle of centre of HPGE clover with respect to the beam axis'
	    },
	    {
            "short": 'CLVPHI',
            "description": 'Phi angle of centre of HPGE clover with respect to lab coordinate system'
	    },
	    // SCEPTAR
	    {
            "short": 'SEPE',
            "description": 'SCEPTAR Pulse Height in arbitrary units'
	    },
	    {
            "short": 'SEPT',
            "description": 'SCEPTAR Time from CFD in nanoseconds'
	    },
	    {
            "short": 'SEPTS',
            "description": 'SCEPTAR Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'SEPPH',
            "description": 'SCEPTAR raw Pulse Height in ADC units'
	    },
	    {
            "short": 'SEPPU',
            "description": 'SCEPTAR Pileup value equal to number of Hits'
	    },
	    {
            "short": 'SEPTHETA',
            "description": 'Theta angle of SCEPTAR paddle with respect to the beam axis'
	    },
	    {
            "short": 'SEPPHI',
            "description": 'Phi angle of SCEPTAR paddle with respect to lab coordinate system'
	    },
	    {
            "short": 'SEPNUM',
            "description": 'The number of this SCEPTAR paddle [1-20]'
	    },
	    // PACES
	    {
            "short": 'PACE',
            "description": 'PACES energy in keV'
	    },
	    {
            "short": 'PACT',
            "description": 'PACES Time from CFD in nanoseconds'
	    },
	    {
            "short": 'PACTS',
            "description": 'PACES Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'PACPH',
            "description": 'PACES raw Pulse Height in ADC units'
	    },
	    {
            "short": 'PACPU',
            "description": 'PACES Pileup value equal to number of Hits'
	    },
	    {
            "short": 'PACTHETA',
            "description": 'Theta angle of PACES crystal with respect to the beam axis'
	    },
	    {
            "short": 'PACPHI',
            "description": 'Phi angle of PACES crystal with respect to lab coordinate system'
	    },
	    {
            "short": 'PACNUM',
            "description": 'The number of this PACES crystal [1-5]'
	    },
	    // LaBr3
	    {
            "short": 'LBLE',
            "description": 'LaBr3 energy in keV'
	    },
	    {
            "short": 'LBLT',
            "description": 'LaBr3 Time from CFD in nanoseconds'
	    },
	    {
            "short": 'LBLTS',
            "description": 'LaBr3 Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'LBLPH',
            "description": 'LaBr3 raw Pulse Height in ADC units'
	    },
	    {
            "short": 'LBLPU',
            "description": 'LaBr3 Pileup value equal to number of Hits'
	    },
	    {
            "short": 'LBLTHETA',
            "description": 'Theta angle of LaBr3 crystal with respect to the beam axis'
	    },
	    {
            "short": 'LBLPHI',
            "description": 'Phi angle of LaBr3 crystal with respect to lab coordinate system'
	    },
	    {
            "short": 'LBLNUM',
            "description": 'The number of this LaBr3 crystal [1-8]'
	    },
	    // TACs
	    {
            "short": 'LBTE',
            "description": 'TAC Pulse Height in arbitrary units'
	    },
	    {
            "short": 'LBTT',
            "description": 'TAC Time from CFD in nanoseconds'
	    },
	    {
            "short": 'LBTTS',
            "description": 'TAC Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'LBTPH',
            "description": 'TAC raw Pulse Height in ADC units'
	    },
	    {
            "short": 'LBTPU',
            "description": 'TAC Pileup value equal to number of Hits'
	    },
	    {
            "short": 'LBTNUM',
            "description": 'The number of this TAC module [1-8]'
	    },
	    // Clover BGO Suppression shields
	    {
            "short": 'GRSE',
            "description": 'Clover BGO energy in keV'
	    },
	    {
            "short": 'GRST',
            "description": 'Clover BGO Time from CFD in nanoseconds'
	    },
	    {
            "short": 'GRSTS',
            "description": 'Clover BGO Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'GRSPH',
            "description": 'Clover BGO raw Pulse Height in ADC units'
	    },
	    {
            "short": 'GRSPU',
            "description": 'Clover BGO Pileup value equal to number of Hits'
	    },
	    {
            "short": 'GRSNUM',
            "description": 'The number of this Clover BGO crystal [1 to 20*16=320]'
	    },
	    {
            "short": 'GRSPOS',
            "description": 'The HPGe Clover number (1-16) to which this BGO belongs'
	    },
	    {
            "short": 'GRSTYPE',
            "description": 'The type of this Clover BGO crystal [front, side, back]'
	    },
	    // Ancillary position BGO Suppression shields
	    {
            "short": 'LBSE',
            "description": 'Ancillary position BGO energy in keV'
	    },
	    {
            "short": 'LBST',
            "description": 'Ancillary position BGO Time from CFD in nanoseconds'
	    },
	    {
            "short": 'LBSTS',
            "description": 'Ancillary position BGO Timestamp value from leading-edge in 10 nanoseconds steps'
	    },
	    {
            "short": 'LBSPH',
            "description": 'Ancillary position BGO raw Pulse Height in ADC units'
	    },
	    {
            "short": 'LBSPU',
            "description": 'Ancillary position BGO Pileup value equal to number of Hits'
	    },
	    {
            "short": 'LBSNUM',
            "description": 'The number of this Ancillary position BGO crystal [1 to 3*8=24]'
	    },
	    {
            "short": 'LBSPOS',
            "description": 'The ancillary position number (1-8) to which this BGO belongs'
	    },
            // Time Differences
	    {
            "short": 'MIDAS_Time',
            "description": 'Time since the beginning of run based on the MIDAS CPU time'
	    },
	    {
            "short": 'TD_GRG_GRG',
            "description": 'Time difference between two HPGe crystals using CFD in nanoseconds'
	    },
	    {
            "short": 'TD_SEP_SEP',
            "description": 'Time difference between two SCEPTAR paddles using CFD in nanoseconds'
	    },
	    {
            "short": 'TD_PAC_PAC',
            "description": 'Time difference between two PACES crystals using CFD in nanoseconds'
	    },
	    {
            "short": 'TD_LBL_LBL',
            "description": 'Time difference between two LaBr3 detectors using CFD in nanoseconds'
	    },
	    {
            "short": 'TD_GRG_GRG',
            "description": 'Time difference between two HPGe crystals using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_SEP_SEP',
            "description": 'Time difference between two SCEPTAR paddles using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_PAC_PAC',
            "description": 'Time difference between two PACES crystals using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_LBL_LBL',
            "description": 'Time difference between two LaBr3 detectors using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_GRG_SEP',
            "description": 'Time difference between HPGe and SCEPTAR using CFD in nanoseconds'
	    },
	    {
            "short": 'TSD_GRG_SEP',
            "description": 'Time difference between HPGe and SCEPTAR using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_GRG_PAC',
            "description": 'Time difference between HPGe and PACES using CFD in nanoseconds'
	    },
	    {
            "short": 'TSD_GRG_PAC',
            "description": 'Time difference between HPGe and PACES using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_PAC_SEP',
            "description": 'Time difference between PACES and SCEPTAR using CFD in nanoseconds'
	    },
	    {
            "short": 'TSD_PAC_SEP',
            "description": 'Time difference between PACES and SCEPTAR using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_GRG_LBL',
            "description": 'Time difference between HPGe and LaBr3 using CFD in nanoseconds'
	    },
	    {
            "short": 'TSD_GRG_LBL',
            "description": 'Time difference between HPGe and LaBr3 using leading edge in 10 nanosecond units'
	    },
	    {
            "short": 'TD_LBL_SEP',
            "description": 'Time difference between LaBr3 and SCEPTAR using CFD in nanoseconds'
	    },
	    {
            "short": 'TSD_LBL_SEP',
            "description": 'Time difference between LaBr3 and SCEPTAR using leading edge in 10 nanosecond units'
	    },
            // Angular Differences - for HPGe need to know the distance of 110mm or 145mm
	    {
            "short": 'ANG_GRG_GRG',
            "description": 'Angular difference between the centre of two HPGe crystals in degrees'
	    },
	    {
            "short": 'ANG_CLV_CLV',
            "description": 'Angular difference between the centre of two HPGe clovers in degrees'
	    },
	    {
            "short": 'ANG_SEP_SEP',
            "description": 'Angular difference between the centre of two SCEPTAR paddles in degrees'
	    },
	    {
            "short": 'ANG_PAC_PAC',
            "description": 'Angular difference between the centre of two PACES crystals in degrees'
	    },
	    {
            "short": 'ANG_LBL_LBL',
            "description": 'Angular difference between the centre of two LaBr3 detectors in degrees'
	    },
	    {
            "short": 'ANG_GRG_SEP',
            "description": 'Angular difference between the centre of a HPGe crystal and SCEPTAR paddle in degrees'
	    },
	    {
            "short": 'ANG_GRG_PAC',
            "description": 'Angular difference between the centre of a HPGe crystal and PACES crystal in degrees'
	    },
	    {
            "short": 'ANG_GRG_LBL',
            "description": 'Angular difference between the centre of a HPGe crystal and LaBr3 detector in degrees'
	    },
	    {
            "short": 'ANG_PAC_LBL',
            "description": 'Angular difference between the centre of a PACES crystal and LaBr3 detector in degrees'
	    },
	    {
            "short": 'ANG_LBL_SEP',
            "description": 'Angular difference between the centre of a LaBr3 detector and SCEPTAR paddle in degrees'
	    },
            // Cycle Timing (PPG events)
	    {
            "short": 'Cycle_Num',
            "description": 'Cycle number since beginning of run'
	    },
	    {
            "short": 'Cycle_Time',
            "description": 'Time since the beginning of the current Cycle'
	    },
	    {
            "short": 'Cycle_Pattern',
            "description": 'The current PPG pattern'
	    }
	],
*/
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
	"histoFileDirectoryPath": "/tig/grifstore0b/griffin/schedule140/Calibrations-July2021",                // initial histogram file directory path
	"histoFileList": [],                                // place to store the list of histogram files available to be opened
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
