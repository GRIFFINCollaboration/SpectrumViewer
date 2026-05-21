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
  dataStore.Midas = {};                  // Place to store the Midas info from the config file.

  // histoChoiceBar
  dataStore.histoChoiceBarContents = ['137Cs'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  // Raw spectrum data handling
  dataStore.pageTitle = 'Analysis Overview';                                   //header title
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [];                                                 //buffer for raw matrix data
  dataStore.matrix = [];                                                 //buffer for objects containing the uncompressed matrix data
  dataStore.hm = {};                                                 //object for 2d matrix stuff
  dataStore.hm._raw = [];                                                 //buffer for raw matrix data
  dataStore.outputRawFlag = true;                                    // When true binary Matrix data will be unpacked to the rawData.data2 array
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
  dataStore.peakOfInterest = null;

  // Final results
  dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared],
  //                                                                                       'pileupk1':[1 0 0 0 0 0 0], 'pileupk2':[1 0 0 0 0 0 0], 'pileupE1':[0 0 0 0 0 0 0],
  //                                                                                       'crosstalk0:[0,1,0,0,0,0,0]', 'crosstalk1:[0,1,0,0,0,0,0]', 'crosstalk2:[0,1,0,0,0,0,0]'}
  dataStore.betaEfficiency = {};  // Place to store beta efficiency information

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.

  // Workflow management and progress tracking
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "analysisOverviewProgress";            // id of the Div with class = "progress-bar ..."
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
  dataStore.peakFitterScriptTemplate["analysisOverview"] = {
    "histogramFileNames" : [],
    "spectrumList1d" : [],
    "spectrumList1dPeaks" : {
      "All": []
    },
    "spectrumList2d" : [],
    "spectrumListGates" : [],
    "spectrumListProjectionsPeaks" : {
      "All":[]
    }
  };

  // analysisOverview specific things
  // dataStore.detTypesData object controls this page
  // Key used for identifying detectorTypes from ODB.
  // Title used for reports in Title.
  dataStore.detTypesData = {
    "GRG":{
      "Title": "HPGe", "matrixName": "GeEnergy_CrystalNum", "maxChans": 64, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "GRS":{
      "Title": "BGO", "matrixName": "BgoEnergy_CrystalNum", "maxChans": 320, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "LBL":{
      "Title": "LaBr3", "matrixName": "Labr3Energy_CrystalNum", "maxChans": 8, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "LBS":{
      "Title": "Ancil. BGO", "matrixName": "BgoAncilEnergy_CrystalNum", "maxChans": 24, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "PAC":{
      "Title": "PACES", "matrixName": "PacesEnergy_CrystalNum", "maxChans": 5, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 15000, "rateError": 20000,
    }, "ZDS":{
      "Title": "ZDS", "matrixName": "ZDS01XN00A_Energy", "maxChans": 1, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 120000, "rateError": 170000,
    }, "SEP":{
      "Title": "SCEPTAR", "matrixName": "SceptarEnergy_CrystalNum", "maxChans": 20, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 40000, "rateError": 60000,
    }, "ART":{
      "Title": "ARIES", "matrixName": "AriesEnergy_CrystalNum", "maxChans": 76, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 50000, "rateError": 100000,
    }, "RCS":{
      "Title": "RCMP", "matrixName": "", "maxChans": 384, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }, "QED":{
      "Title": "QED", "matrixName": "QED01_E_strips", "maxChans": 64, "activeChans": 0,
      "totalHits": 0, "meanRate": 0, "medianRate": 0, "peakRate": 0, "tailRate": 0, "pileup": 0,
      "channelNames": [], "hitpatternData": [], "sumEnergyData": [], "lowCounters": [], "highCounters": [],
      "rateWarn": 20000, "rateError": 30000,
    }
  };

  dataStore.QEDanalysisSpectrumList = ["QED_DCS_azimuth_0_180", "QED_DCS_azimuth_70_110", "QED_DCS_azimuth_93_103", "QED_DCS_azimuth2_70_110", "QED_DCS_azimuth2_93_103"];

  // Beta efficiency calculations
  dataStore.betaEfficiencyCheck = {};
  dataStore.betaEfficiencyCheck["SCEPTAR"] = {
    "detectorName" : "sceptar",
    "spectrumName" : "Ge_Sum_En_SceptarTagged",
    "histogramName" : "",
    "active" : false,
    "counts" : 0,
    "countsUncertainty" : 0,
    "efficiency" : 0,
    "efficiencyUncertainty" : 0
  };
  dataStore.betaEfficiencyCheck["ZDS"] = {
    "detectorName" : "zds",
    "spectrumName" : "Ge_Sum_En_ZdsTagged",
    "histogramName" : "",
    "active" : false,
    "counts" : 0,
    "countsUncertainty" : 0,
    "efficiency" : 0,
    "efficiencyUncertainty" : 0
  };
  dataStore.betaEfficiencyCheck["ARIES"] = {
    "detectorName" : "aries",
    "spectrumName" : "Ge_Sum_En_AriesTagged",
    "histogramName" : "",
    "active" : false,
    "counts" : 0,
    "countsUncertainty" : 0,
    "efficiency" : 0,
    "efficiencyUncertainty" : 0
  };

// These are the number of DSSD-Ge pairs at each azimuthal scattering angle bin
// The key corresponds to histograms for which these weighting factors can be applied
dataStore.QEDAzimuthalWeightingFactors = { "QED_DCS_azimuth_0_180":[655761,1982919,3280430,4504586,5670215,6801794,7844227,8730593,9246768,9231332,8379386,7815404,7455550,7125213,7036783,7202884,7679795,8759212,10438815,9288677,8500860,8189248,8186240,8367995,8753323,9314441,8494583,7955879,7649562,7635266,7629590,7804293,7652623,7368660,7183463,7210227,7373040,7399378,7438980,7578962,7781409,8025338,8193633,8564697,9108235,8342246,8278061,8300242,9154306,8722100,8066379,7679416,7557557,7571605,7774459,7756308,7648839,7717483,7772659,7762757,7779362,7827014,7963854,8057399,8090739,8336704,8521612,8217174,8009028,8100477,8033134,7927386,8083830,8211645,7912469,7834727,7699134,7349232,7273133,7118104,7240983,7232089,7325222,7467285,7504527,7710613,7906873,8164894,8667647,8165668,8147603,8659749,8191177,7931937,7728987,7518268,7469407,7342503,7232078,7246713,7122198,7271800,7343826,7675878,7827904,7911022,8166649,8137671,7933015,8003815,8126395,8013026,8207155,8523968,8335747,8128197,8021701,8021921,7852535,7783346,7783414,7780465,7727955,7661733,7772784,7774988,7601162,7562079,7678300,8043552,8714161,9184110,8333405,8287718,8339440,9102707,8610501,8220098,8053924,7805073,7596374,7471187,7416917,7391104,7245256,7202796,7389363,7654644,7853090,7673933,7665946,7691581,7983373,8539338,9351115,8802020,8436305,8266481,8269971,8584494,9369406,10605995,8939645,7860794,7423257,7303252,7444349,7845051,8323954,9133259,10384777,10682337,10368200,9659176,8721316,7703767,6622518,5466154,4185247,2883438,2885962,4176873,5463874,6612110,7695377,8701996,9634332,10337436,10682899,10362563,9101493,8330530,7820093,7425239,7280396,7405543,7848106,8872411,10484737,9434110,8598898,8258313,8235383,8424067,8818904,9361885,8547702,7996239,7689283,7678666,7637391,7806506,7694676,7382617,7206212,7220480,7389332,7411599,7448261,7593442,7781763,8017052,8191606,8545359,9126201,8379192,8286734,8296155,9146970,8761599,8085200,7693140,7560589,7556306,7783012,7768104,7654051,7710385,7782639,7761082,7767430,7810793,7933703,8092347,8098959,8327201,8527724,8241621,8018366,8123857,8021617,7935321,8083093,8228263,7910550,7840404,7702870,7352178,7283112,7118898,7238343,7235874,7318773,7475661,7508420,7714973,7904791,8156739,8690083,8153805,8143784,8680213,8187750,7925931,7728283,7528209,7469615,7342370,7231095,7246433,7117328,7282591,7344372,7683150,7829137,7906839,8193731,8127074,7932638,8005430,8142375,8012172,8228658,8532420,8315884,8135041,8085121,7961238,7825422,7775302,7770031,7777421,7723993,7656269,7775492,7778485,7585855,7558091,7679816,8054981,8740624,9172158,8307314,8293675,8356266,9121661,8569203,8201459,8029566,7795471,7588482,7449828,7407074,7372112,7225113,7182513,7374248,7633601,7836047,7633890,7647326,7660294,7967305,8509685,9317055,8759477,8386793,8188344,8190960,8508444,9286867,10459257,8775024,7688685,7222528,7037221,7130695,7458990,7825972,8392558,9230948,9258192,8743071,7848353,6812522,5674485,4509982,3291178,1984341,655843]

,"QED_DCS_azimuth_70_110": [42607,131958,217269,300697,381375,456697,534952,593581,629289,628378,565475,530825,507842,484547,472755,478499,506138,574674,665073,605711,557937,542055,539487,540534,556254,586719,540673,516111,494923,486261,475968,479250,469047,456225,446216,445869,449785,447849,443947,447588,452698,460408,464326,484960,517626,489362,483706,487144,520135,497529,477209,461501,451383,450275,453965,451531,442405,439378,438915,437604,438944,441673,446006,452106,453837,459071,465878,456650,447407,448962,450039,453639,458668,457849,451408,447329,441253,431806,429137,422778,426025,424427,424962,424900,425272,428625,432835,439192,444712,439247,439745,447213,442414,435596,430845,427265,426310,425658,425202,427336,424332,429627,430203,439572,445033,449987,454415,458358,452553,451186,451316,450212,457062,467102,459943,456908,454486,451745,445229,439420,440701,441406,440428,443513,452790,455627,451609,451108,459777,474528,496077,518364,486675,482582,487852,517406,488543,466150,462374,455284,449665,446814,448097,449983,447949,447150,455930,468566,479041,476778,486636,495178,514175,540017,582995,553388,539093,538993,542472,557577,603401,674286,581316,512069,487120,482278,495741,527071,560753,614247,701813,718807,697907,645115,575628,507958,428775,352185,267104,177604,185474,277437,362745,439649,515363,588592,654195,704135,727964,708537,624210,569827,534129,504808,492617,499224,530366,588930,669461,618602,567356,548068,542831,548646,569133,600978,555444,524069,503417,492671,480515,483533,472852,459274,450758,452276,454570,454171,450179,452185,458876,468037,476130,497169,531505,499956,492728,496231,529316,506335,484598,468877,459754,458893,465002,461006,452009,448754,444654,443353,445357,448690,455794,464482,465223,468866,474739,465916,455188,455867,457425,462485,466329,465386,457253,453768,445785,435283,434716,426119,428959,430460,430554,431190,428828,433329,435437,441363,448105,442707,444397,451065,444319,438381,435521,431773,431949,431238,430939,430111,427961,435101,433401,444065,450987,455399,463037,465744,461998,459301,458191,458289,467107,476485,469644,468242,468000,460597,452150,446388,445501,445926,450096,452349,462547,466161,461320,459465,466885,481848,503474,527654,495025,492920,498508,532593,500162,478521,470219,463259,452945,452729,454420,454436,453680,450880,458650,470795,484198,480662,493373,502552,523179,554267,598809,565723,547279,543745,548428,567410,613739,681787,592950,531023,501647,490527,497979,523771,546349,582443,639750,640183,607324,541614,468607,387177,307167,220730,136835,43920]

,"QED_DCS_azimuth_93_103": [4475,14122,22403,30572,37987,48191,58367,65013,69714,72410,66315,64007,61903,59172,57145,59091,65989,79222,102613,90053,80845,77510,76065,75944,76235,77024,71545,67884,64162,63194,61345,61779,60398,59461,57815,57560,57509,57770,58848,60057,61058,62486,63152,64421,68393,66873,66432,66392,69715,69671,68799,66325,63619,62676,62275,61393,59713,58838,59131,59297,60382,60135,59871,60795,62246,65430,67274,66369,64187,63127,62041,62589,63215,63140,62450,61624,59138,58147,57458,56722,55746,55620,54865,54697,54506,54829,55179,56511,57216,57137,57634,58184,57995,57488,57307,56846,56632,56639,56502,56126,55919,56401,56618,57477,58998,59314,59534,59464,58636,57475,56840,56609,56879,57004,57133,57195,57165,57340,58113,58609,59737,60472,61691,62743,64255,65358,65587,67149,70096,73484,76450,76203,71298,68850,68545,70905,67858,65010,65175,64670,64546,64330,64297,64608,64686,65648,67323,68983,71488,70052,71021,73428,77167,81926,89303,81525,77180,75381,74023,74855,82295,93015,88502,77163,73375,73442,76182,81517,89220,100073,116697,119866,119213,110140,97524,87414,73705,59993,46182,31095,32938,50585,67369,82606,96691,110896,123385,132677,135849,132642,116563,108495,102209,97726,94926,97281,106043,118592,155525,141294,124820,120903,118584,119053,119402,125478,115159,107526,101709,98209,94920,93704,90101,86969,84499,84555,84358,84687,85270,86319,88136,90929,94399,98828,108574,104266,103925,104613,108093,106610,103853,100388,96091,93619,93280,91198,88976,87594,85909,85268,86060,86727,88008,90732,91873,94273,96407,95711,92878,90888,89901,90408,91666,91776,90687,89607,86164,84443,84111,82562,81600,81076,80036,78977,77930,77805,78147,79621,80316,79882,80368,81438,81106,80099,80135,80448,80964,82039,82656,82813,82131,82594,81821,83150,85738,86637,87700,87058,85535,84609,84483,84190,84618,84879,84714,85144,85887,84843,84719,84828,85623,87446,89376,91585,94265,96483,96480,98639,103519,107685,112959,114880,108963,106011,105750,109955,101240,95848,93646,92322,91274,91009,91438,91282,92652,93050,95804,99550,102862,103622,106727,110088,117263,127137,140018,127351,120996,118275,117993,120587,131262,148434,129092,115904,111782,110729,114039,122032,128227,137938,154848,157163,152042,138363,120871,102262,81725,58108,35928,11951]

,"QED_DCS_azimuth2_70_110": [42607,131958,217269,300697,381375,456697,534952,593581,629289,628378,565475,530825,507842,484547,472755,478499,506138,574674,665073,605711,557937,542055,539487,540534,556254,586719,540673,516111,494923,486261,475968,479250,469047,456225,446216,445869,449785,447849,443947,447588,452698,460408,464326,484960,517626,489362,483706,487144,520135,497529,477209,461501,451383,450275,453965,451531,442405,439378,438915,437604,438944,441673,446006,452106,453837,459071,465878,456650,447407,448962,450039,453639,458668,457849,451408,447329,441253,431806,429137,422778,426025,424427,424962,424900,425272,428625,432835,439192,444712,439247,439745,447213,442414,435596,430845,427265,426310,425658,425202,427336,424332,429627,430203,439572,445033,449987,454415,458358,452553,451186,451316,450212,457062,467102,459943,456908,454486,451745,445229,439420,440701,441406,440428,443513,452790,455627,451609,451108,459777,474528,496077,518364,486675,482582,487852,517406,488543,466150,462374,455284,449665,446814,448097,449983,447949,447150,455930,468566,479041,476778,486636,495178,514175,540017,582995,553388,539093,538993,542472,557577,603401,674286,581316,512069,487120,482278,495741,527071,560753,614247,701813,718807,697907,645115,575628,507958,428775,352185,267104,177604,185474,277437,362745,439649,515363,588592,654195,704135,727964,708537,624210,569827,534129,504808,492617,499224,530366,588930,669461,618602,567356,548068,542831,548646,569133,600978,555444,524069,503417,492671,480515,483533,472852,459274,450758,452276,454570,454171,450179,452185,458876,468037,476130,497169,531505,499956,492728,496231,529316,506335,484598,468877,459754,458893,465002,461006,452009,448754,444654,443353,445357,448690,455794,464482,465223,468866,474739,465916,455188,455867,457425,462485,466329,465386,457253,453768,445785,435283,434716,426119,428959,430460,430554,431190,428828,433329,435437,441363,448105,442707,444397,451065,444319,438381,435521,431773,431949,431238,430939,430111,427961,435101,433401,444065,450987,455399,463037,465744,461998,459301,458191,458289,467107,476485,469644,468242,468000,460597,452150,446388,445501,445926,450096,452349,462547,466161,461320,459465,466885,481848,503474,527654,495025,492920,498508,532593,500162,478521,470219,463259,452945,452729,454420,454436,453680,450880,458650,470795,484198,480662,493373,502552,523179,554267,598809,565723,547279,543745,548428,567410,613739,681787,592950,531023,501647,490527,497979,523771,546349,582443,639750,640183,607324,541614,468607,387177,307167,220730,136835,43920]

,"QED_DCS_azimuth2_93_103": [4475,14122,22403,30572,37987,48191,58367,65013,69714,72410,66315,64007,61903,59172,57145,59091,65989,79222,102613,90053,80845,77510,76065,75944,76235,77024,71545,67884,64162,63194,61345,61779,60398,59461,57815,57560,57509,57770,58848,60057,61058,62486,63152,64421,68393,66873,66432,66392,69715,69671,68799,66325,63619,62676,62275,61393,59713,58838,59131,59297,60382,60135,59871,60795,62246,65430,67274,66369,64187,63127,62041,62589,63215,63140,62450,61624,59138,58147,57458,56722,55746,55620,54865,54697,54506,54829,55179,56511,57216,57137,57634,58184,57995,57488,57307,56846,56632,56639,56502,56126,55919,56401,56618,57477,58998,59314,59534,59464,58636,57475,56840,56609,56879,57004,57133,57195,57165,57340,58113,58609,59737,60472,61691,62743,64255,65358,65587,67149,70096,73484,76450,76203,71298,68850,68545,70905,67858,65010,65175,64670,64546,64330,64297,64608,64686,65648,67323,68983,71488,70052,71021,73428,77167,81926,89303,81525,77180,75381,74023,74855,82295,93015,88502,77163,73375,73442,76182,81517,89220,100073,116697,119866,119213,110140,97524,87414,73705,59993,46182,31095,32938,50585,67369,82606,96691,110896,123385,132677,135849,132642,116563,108495,102209,97726,94926,97281,106043,118592,155525,141294,124820,120903,118584,119053,119402,125478,115159,107526,101709,98209,94920,93704,90101,86969,84499,84555,84358,84687,85270,86319,88136,90929,94399,98828,108574,104266,103925,104613,108093,106610,103853,100388,96091,93619,93280,91198,88976,87594,85909,85268,86060,86727,88008,90732,91873,94273,96407,95711,92878,90888,89901,90408,91666,91776,90687,89607,86164,84443,84111,82562,81600,81076,80036,78977,77930,77805,78147,79621,80316,79882,80368,81438,81106,80099,80135,80448,80964,82039,82656,82813,82131,82594,81821,83150,85738,86637,87700,87058,85535,84609,84483,84190,84618,84879,84714,85144,85887,84843,84719,84828,85623,87446,89376,91585,94265,96483,96480,98639,103519,107685,112959,114880,108963,106011,105750,109955,101240,95848,93646,92322,91274,91009,91438,91282,92652,93050,95804,99550,102862,103622,106727,110088,117263,127137,140018,127351,120996,118275,117993,120587,131262,148434,129092,115904,111782,110729,114039,122032,128227,137938,154848,157163,152042,138363,120871,102262,81725,58108,35928,11951]};

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
  var strips = ["P","N"];
  for(j=0; j<letter.length; j++){
    for(i=1; i<(dataStore.numberOfClovers+1); i++){
      for(k=0; k<4; k++){
        dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];
        num++;
      }
    }
  }

  // Populate channel names for each detector type
  var bgo_letter = ['A','B','C'];
  var keys = Object.keys(dataStore.detTypesData);
  for(var x=0; x<keys.length; x++){

    if(keys[x] == "GRG"){
      for(j=0; j<letter.length; j++){
        for(i=1; i<(dataStore.numberOfClovers+1); i++){
          for(k=0; k<4; k++){
            dataStore.detTypesData[keys[x]].channelNames.push('GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j]);
          }
        }
      }
    }

    if(keys[x] == "GRS"){
      for(j=0; j<letter.length; j++){
        for(i=1; i<(dataStore.numberOfClovers+1); i++){
          for(k=0; k<4; k++){
            for(var m=1; m<6; m++){
              dataStore.detTypesData[keys[x]].channelNames.push('GRS'+alwaysThisLong(i, 2)+crystals[k]+'N0'+m+'X');
            }
          }
        }
      }
    }

    if(keys[x] == "LBL"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      for(k=1; k<9; k++){
        dataStore.detTypesData[keys[x]].channelNames.push('LBL'+alwaysThisLong(k, 2)+'XN00X');
      }
    }

    if(keys[x] == "LBS"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      dataStore.detTypesData[keys[x]].channelNames[1] = "";
      dataStore.detTypesData[keys[x]].channelNames[2] = "";
      for(k=1; k<9; k++){
        for(m=0; m<3; m++){
          dataStore.detTypesData[keys[x]].channelNames.push('LBS'+alwaysThisLong(k, 2)+bgo_letter[m]+'N00X');
        }
      }
    }

    if(keys[x] == "SEP"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      for(k=1; k<21; k++){
        dataStore.detTypesData[keys[x]].channelNames.push('SEP'+alwaysThisLong(k, 2)+'XN00X');
      }
    }

    if(keys[x] == "ART"){
      dataStore.detTypesData[keys[x]].channelNames[0] = "";
      for(k=1; k<77; k++){
        dataStore.detTypesData[keys[x]].channelNames.push('ART'+alwaysThisLong(k, 2)+'XS00X');
      }
    }

    if(keys[x] == "PAC"){ dataStore.detTypesData[keys[x]].channelNames = ['','PAC01XN00A','PAC02XN00A','PAC03XN00A','PAC04XN00A','PAC05XN00A']; }
    if(keys[x] == "ZDS"){ dataStore.detTypesData[keys[x]].channelNames = ['ZDS01XN00A']; }

    if(keys[x] == "QED"){
      for(j=1; j<6; j++){
        for(i=0; i<2; i++){
          for(k=0; k<32; k++){
            dataStore.detTypesData[keys[x]].channelNames.push('QED'+alwaysThisLong(j, 2)+'X'+strips[i]+alwaysThisLong(k, 2)+'X');
          }
        }
      }
    }
  }

}


// Top level promise to control the initial load workflow
Promise.all([
  onloadInitialSetup()
]).then(
  function(){
    // This then is executed after the top level promise then is executed.
    console.log("last then");
    launchAnalysisTasks()
  }
);

// Control the initial load workflow
function onloadInitialSetup(){

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    // Set up the data store and get URL arguments. Once that is done then the event listeners can be added.
    Promise.all([
      setupDataStore(),
      promiseURLArguments(),
      setupEventListeners()
    ]
  ).then(
    function(){
      // viewConfig of the run file
      console.log("First then");
      viewConfigOfHisto(dataStore.histoFileName);
      resolve("success");
    }
  )

});
}

function setupEventListeners(){

  // Return a new promise.
  return new Promise(function(resolve, reject) {

    window.addEventListener('HTMLImportsLoaded', function(e) {

      ///////////////
      // initial setup
      ///////////////
      console.log("Add event listeners...");

      // Inject templates
      dataStore.templates = prepareTemplates(['header', 'plotGrid', 'plotControl', 'analysisOverviewReportContents', 'analysisOverviewReport', 'analysisOverviewReportTable', 'footer']);

      // Header and footer setup
      setupHeader('head', 'Analysis Overview');
      setupFooter('foot');

      // PlotControl is needed for fetching spectra. Here the parent div is hidden
      dataStore._plotControl = new plotControl('plotCtrl', 'horizontal');
      dataStore._plotControl.setup();

      // Spectrum Viewer
      dataStore._plotGrid = new plotGrid('plottingGrid');
      dataStore._plotGrid.setup();
      dataStore._plotGrid.manageCellCreation(null, dataStore.plots[0]);
      deleteNode('plottingGridnewPlotButton'); //don't want additional plots in this app

      // Inject the dismiss button to the messageDiv
      newButton = document.createElement('button');
      newButton.setAttribute('id', 'messageDivDismissButton');
      newButton.setAttribute('class', 'btn btn-default btn-lg');
      newButton.innerHTML = "Dismiss";
      //newButton.style.padding = '4px';
      newButton.onclick = function(){
        ClearErrorConnectingToAnalyzerServer();
      }.bind(newButton);
      document.getElementById('messageDivButton').appendChild(newButton);

      $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      });

      resolve("success");
    });

  });
}

function viewConfigOfHisto(histo){
  console.log('View config of Histogram '+histo);

  // Format check for the data file
  HistoFileDirectory = dataStore.histoFileDirectoryPath;
  if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
    HistoFileDirectory += '/';
  }
  filename = HistoFileDirectory + histo;

  // get the config file from the server/ODB for this histogram
  url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
  XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForOverview, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function processConfigFileForOverview(payload){
  console.log("processConfigFileForOverview");
  // Unpack the response from the server into a local variable
  //  console.log(payload);
  var thisConfig = JSON.parse(payload);

  // Unpack Midas content
  dataStore.Midas = {
    'Run': dataStore.histoFileName,
    'Title': thisConfig.Analyzer[6].Midas[0].Value,
    'EpochTime': thisConfig.Analyzer[6].Midas[1].Value*1000,
    'StartTime': new Date(thisConfig.Analyzer[6].Midas[1].Value*1000),
    'EndTime': new Date((Number(thisConfig.Analyzer[6].Midas[1].Value) + Number(thisConfig.Analyzer[6].Midas[2].Value))*1000),
    'Duration': thisConfig.Analyzer[6].Midas[2].Value
  };

  // Format the epoche time to Vancouver time (where all GRIFFIN data is collected)
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: "short",
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  });

  // Refresh the display
  document.getElementById('widget-title-header').innerHTML = dataStore.Midas.Run+": "+dataStore.Midas.Title;
  document.getElementById('widget-title-times').innerHTML =  formatter.format(dataStore.Midas.StartTime)+" to "+formatter.format(dataStore.Midas.EndTime);
  document.getElementById('widget-title').classList.add('widget-good');
}

function launchAnalysisTasks(){
  console.log("Launch analysis tasks...");

  // Plug in the active spectra names for the 1d histograms
  dataStore._plotControl.activeSpectra = [];
  dataStore.spectrumList1d = ["ZDS01XN00A_Energy", "Ge_Sum_Energy", "Ge_Sum_En_SceptarTagged", "Ge_Sum_En_ZdsTagged", "Ge_Sum_En_AriesTagged", "HPGe_cycle_activity"];
  dataStore.spectrumList1d.push(...dataStore.QEDanalysisSpectrumList);
  for(var i=0; i<dataStore.spectrumList1d.length; i++){
    dataStore._plotControl.activeSpectra.push(dataStore.spectrumList1d[i]);
  }
  // Plug in the active spectra names for the 2d histograms
  dataStore.spectrumList2d = ["GeEnergy_CrystalNum", "BgoEnergy_CrystalNum", "Labr3Energy_CrystalNum", "BgoAncilEnergy_CrystalNum", "SceptarEnergy_CrystalNum", "PacesEnergy_CrystalNum", "AriesEnergy_CrystalNum", "QED01_E_strips", "cycle_vs_Ge"];
  for(i=0; i<dataStore.spectrumList2d.length; i++){
    dataStore._plotControl.active2dSpectra.push(dataStore.spectrumList2d[i]);
  }

  // Request the first histogram file from the server.
  // This launches a series of promises. Once complete we end with fetchCallback.
  dataStore._plotControl.refreshAll();
}

function fetchCallback(){
  console.log("fetch");
  console.log(dataStore);
  constructRatesOverAllCycles();
  setupBetaEfficiency();
  // performGainmatchingCheck();
  setupQEDplots();
}

function constructRatesAndHitpatterns(){
  // The rates for all detector channels have been received as 2d histograms of channel number vs energy
  var problemString = "Details:";
  var keys = Object.keys(dataStore.detTypesData);

  for(var i=0; i<keys.length; i++){
    if(dataStore.detTypesData[keys[i]].matrixName.length<1){ continue; }
    // Build 2d spectrum name from histogram and matrixName
    var histoName = dataStore.histoFileName.split(".")[0] + ":" + dataStore.detTypesData[keys[i]].matrixName;

    // Zero this counter
    var activeChans=0;

    // Handle ZDS differently because only a 1d histogram
    if(keys[i] == "ZDS"){
      sum=0;
      console.log(keys[i]);
      if(!dataStore.rawData[histoName]){ continue; }
      for(var k=0; k<dataStore.rawData[histoName].length; k++){
        sum += dataStore.rawData[histoName][k];
      }
      // Determine number of active channels
      if(sum>10){ activeChans=1;
        // Determine number of counts for rate calculation and hitpatternData
        dataStore.detTypesData[keys[i]].hitpatternData[0] = sum;
        dataStore.detTypesData[keys[i]].totalHits = sum;
        dataStore.detTypesData[keys[i]].meanRate = sum;
      }
    }else if(!dataStore.rawData[histoName]){ // 2d histogram is missing
      continue;
    }else if(!dataStore.rawData[histoName].data2){ // 2d histogram was not unpacked
      continue;
    }else{
      // Handle this subsystem with 2d histogram
      console.log(keys[i]);
      // Loop through each detector channel in the matrix
      // j is the detector channel number
      // k is the energy channel
      for(var j=0; j<dataStore.rawData[histoName].data2[0].length; j++){
        var sum=0;
        for(var k=0; k<dataStore.rawData[histoName].data2.length; k++){
          sum += dataStore.rawData[histoName].data2[k][j];
        }
        // Determine number of active channels
        if(sum>10){ activeChans++;
          // Determine number of counts in each channel of histogram for rate calculation and hitpatternData
          dataStore.detTypesData[keys[i]].hitpatternData[j] = sum;

          // Add to totals and means
          dataStore.detTypesData[keys[i]].totalHits += sum;
          dataStore.detTypesData[keys[i]].meanRate += sum;
        }
      }
    }
    // Bail out if there are no active channels for this subsystem type
    if(activeChans==0){ continue; }

    // Inject parent div for this widget report
    newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'widget-title-'+keys[i]);
    newDiv.setAttribute('class', 'col-md-2 report report-good');
    document.getElementById('widget-title-ancillaries').appendChild(newDiv);

    // inject template for the contents
    document.getElementById('widget-title-'+keys[i]).innerHTML = Mustache.to_html(
      dataStore.templates.analysisOverviewReportContents,
      {
        'id': keys[i],
        'title': dataStore.detTypesData[keys[i]].Title,
      }
    );

    // Divide by run duration for mean rate
    dataStore.detTypesData[keys[i]].meanRate /= activeChans;
    dataStore.detTypesData[keys[i]].meanRate /= dataStore.Midas.Duration;
    dataStore.detTypesData[keys[i]].activeChans = activeChans;

    // Calculate the median value
    var orderedHitpatternData = dataStore.detTypesData[keys[i]].hitpatternData.filter(element => element !== undefined).toSorted((a, b) => a - b);
    var index = parseInt(orderedHitpatternData.length / 2);
    dataStore.detTypesData[keys[i]].medianRate = orderedHitpatternData[index] / dataStore.Midas.Duration;
    console.log("Mean / Median = "+dataStore.detTypesData[keys[i]].meanRate+" / "+dataStore.detTypesData[keys[i]].medianRate);

    // Exclude outliers using the IQR (Interquartile Range) Method
    var dataset = orderedHitpatternData.slice(0,index);
    var Q1 = dataset[parseInt(dataset.length/2)] / dataStore.Midas.Duration;
    var Q2 = dataStore.detTypesData[keys[i]].medianRate;
    dataset = orderedHitpatternData.slice(index);
    var Q3 = dataset[parseInt(dataset.length/2)] / dataStore.Midas.Duration;
    var IQR = Q3 - Q1;
    console.log("Q1,Q2,Q3,IQR: "+Q1+","+Q2+","+Q3+","+IQR);
    var lowerFence = Q1 - (1.5*IQR);
    var upperFence = Q3 + (1.5*IQR);
    console.log("Lower/Upper Fence: "+lowerFence+", "+upperFence);

    // Check for noisy channels or low-counting channels
    for(var j=0; j<dataStore.detTypesData[keys[i]].hitpatternData.length; j++){
      if((dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration) > upperFence){
        console.log("Noisey "+keys[i]+" channel["+j+"]: "+(dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration)+" kHz where mean is "+dataStore.detTypesData[keys[i]].meanRate+", median is "+dataStore.detTypesData[keys[i]].medianRate+", and upper fence is "+upperFence);
        dataStore.detTypesData[keys[i]].highCounters.push(j);
        console.log("high: "+dataStore.detTypesData[keys[i]].channelNames[j]);
      }
      if((dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration) < lowerFence){
        console.log("Low-counting "+keys[i]+" channel["+j+"]: "+(dataStore.detTypesData[keys[i]].hitpatternData[j] / dataStore.Midas.Duration)+" kHz where mean is "+dataStore.detTypesData[keys[i]].meanRate+", median is "+dataStore.detTypesData[keys[i]].medianRate+", and lower fence is "+lowerFence);
        dataStore.detTypesData[keys[i]].lowCounters.push(j);
        console.log("low: "+dataStore.detTypesData[keys[i]].channelNames[j]);
      }
    }

    // Print statitics to the div
    var string;
    document.getElementById(keys[i]+'-activeChans').innerHTML = dataStore.detTypesData[keys[i]].activeChans+" of "+dataStore.detTypesData[keys[i]].maxChans+" active";
    document.getElementById(keys[i]+'-rates').innerHTML = (dataStore.detTypesData[keys[i]].meanRate/1000).toFixed(1)+"kHz/crystal average";
    if(dataStore.detTypesData[keys[i]].highCounters.length>0){
      string = dataStore.detTypesData[keys[i]].highCounters.length + " counting at a higher rate";
      problemString += "<br>"+dataStore.detTypesData[keys[i]].highCounters.length + " " + dataStore.detTypesData[keys[i]].Title + " counting at a higher rate: ";
      problemString += dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].highCounters[0]];
      for(j=1; j<dataStore.detTypesData[keys[i]].highCounters.length; j++){
        problemString += ", "+dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].highCounters[j]];
      }
      document.getElementById(keys[i]+'-highCounters').innerHTML = string;
    }
    if(dataStore.detTypesData[keys[i]].lowCounters.length>0){
      string = dataStore.detTypesData[keys[i]].lowCounters.length + " counting at a lower rate";
      problemString += "<br>"+dataStore.detTypesData[keys[i]].lowCounters.length + " " + dataStore.detTypesData[keys[i]].Title + " counting at a lower rate: ";
      problemString += dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].lowCounters[0]];
      for(j=1; j<dataStore.detTypesData[keys[i]].lowCounters.length; j++){
        problemString += ", "+dataStore.detTypesData[keys[i]].channelNames[dataStore.detTypesData[keys[i]].lowCounters[j]];
      }
      document.getElementById(keys[i]+'-lowCounters').innerHTML = string;
    }

    // Inject hitpattern plot
    createBasicHitsBarchart(keys[i]+"-plotly-Div",dataStore.detTypesData[keys[i]].hitpatternData,dataStore.detTypesData[keys[i]].Title)

    // Color the Div based on the rates
    if(dataStore.detTypesData[keys[i]].meanRate>dataStore.detTypesData[keys[i]].rateError){
      console.log('error for '+keys[i]);
      document.getElementById('widget-title-'+keys[i]).classList.remove('report-good');
      document.getElementById('widget-title-'+keys[i]).classList.add('report-error');
    }else if(dataStore.detTypesData[keys[i]].meanRate>dataStore.detTypesData[keys[i]].rateWarn
      || dataStore.detTypesData[keys[i]].highCounters.length>0
      || dataStore.detTypesData[keys[i]].lowCounters.length>0){
        console.log('warn for '+keys[i]);
        document.getElementById('widget-title-'+keys[i]).classList.remove('report-good');
        document.getElementById('widget-title-'+keys[i]).classList.add('report-warn');
      }

    }

    // Print the problems string to the problems div
    document.getElementById('widget-title-problems').innerHTML = problemString;
    console.log(dataStore);

  }

  function createBasicHitsBarchart(targetDiv, hitpatternData, title){
    // re-create the specified histogram
    var layout = {
      margin:{ t:0,r:0,b:0,l:0},
      plot_bgcolor: "#222222",
      paper_bgcolor: "#222222",
      range: [0, null]   // Sets the minimum to 0, maximum is auto-calculated
    };

    var labels = [];
    for(var i=1; i<=hitpatternData.length; i++){
      labels.push(title+alwaysThisLong(i,2));
    }

    var hits = {
      x: labels,
      y: hitpatternData,
      type: 'bar'
    };

    // hitpattern bar chart
    Plotly.newPlot(targetDiv, [hits], layout, {displayModeBar: false});
  }

  function constructRatesOverAllCycles(){
    //  var histoName = dataStore.histoFileName.split(".")[0] + ":" + "HPGe_cycle_activity";
    var histoName = dataStore.histoFileName.split(".")[0] + ":" + "cycle_vs_Ge";
    if(!dataStore.rawData[histoName]){ return; }
    if(!dataStore.rawData[histoName].data2[0]){ return; }

    var layout = {
      autosize: true,
      margin:{ t:40,r:50,b:50,l:50,pad:4},
      plot_bgcolor: "#222222",
      paper_bgcolor: "#222222",
      title: 'Total event rate throughout this run',
      xaxis: {
        autorange: true,
        rangeselector: {buttons: [
          {
            count: 1,
            label: '1m',
            step: 'month',
            stepmode: 'backward'
          },
          {
            count: 6,
            label: '6m',
            step: 'month',
            stepmode: 'backward'
          },
          {step: 'all'}
        ]},
        rangeslider: { autorange: true },
        type: 'date'
      },
      yaxis: {
        autorange: "max", // Automatically determines the maximum
        range: [0, null],   // Sets the minimum to 0, maximum is auto-calculated
        type: 'linear'
      }
    };

    // Construct the cycles data from the 2d histogram
    var xData = [], yData = [];
    var cyclesTimeUnit = 100; // Default in grif-replay is 100ms per bin in cycles data

    // First find cycle duration which is less than the axis length
    var thisCycleLength = dataStore.rawData[histoName].YaxisLength;
    var i=0;
    while(dataStore.rawData[histoName].data2[i][0]>0){
      i++;
      if(i>=thisCycleLength){ break; }
    }
    thisCycleLength = i;

    // Build the time and rate data from the 2d histogram into single series suitable for plotting
    var cycleNumber = 0;
    var maxTimeLength = Math.ceil( (dataStore.Midas.Duration * 1000) / cyclesTimeUnit);
    for(var j=0; j<dataStore.rawData[histoName].data2[0].length; j++){
      for(i=0; i<thisCycleLength; i++){
        var thisTime = dataStore.Midas.EpochTime + (cycleNumber * thisCycleLength * cyclesTimeUnit) + (i * cyclesTimeUnit);
        xData.push(thisTime);
        yData.push(dataStore.rawData[histoName].data2[i][j]);

        // Find maximum bin per cycle. Remember the bin index in an array

        if(xData.length>maxTimeLength){ break; }
      }
      if(xData.length>maxTimeLength){ break; }
      cycleNumber++;
    }
    // Trim the zero data from the end
    while(yData[yData.length-1] == 0){
      xData.pop();
      yData.pop();
    }

    // Calculate a more accurate run duration
    var original = dataStore.Midas.Duration;
    console.log("Compared to original MIDAS duration of "+original+" seconds.");
    dataStore.Midas.Duration = parseFloat(xData.length*cyclesTimeUnit)/1000;
    console.log("Run duration from cycles is "+(xData.length*cyclesTimeUnit)+" milliseconds.");

    // Update the Run duration printed in the top widget
    document.getElementById('widget-title-times').innerHTML += ", Duration: "+dataStore.Midas.Duration+"s";

    // Find average of all maximum bin contents. Might need to average over several bins.
    // Find the variance

    var cycleData = [{
      type: "scatter",
      mode: "lines",
      name: "Cycle data",
      x: xData,
      y: yData,
      line: {color: '#17BECF'}
    }];

    Plotly.newPlot('widget-cycles-plotly', cycleData, layout, {displayModeBar: false});

    // Color the Div based on the rates
    document.getElementById('widget-cycles').classList.add('widget-good');
    document.getElementById('widget-cycles-plotly').classList.add('report-good');

    // Now calculate rates and hitpatterns
    constructRatesAndHitpatterns();
  }

  function setupBetaEfficiency(){
    console.log("setupBetaEfficiency function called");

    //var betaEff_keys = ["SCEPTAR", "ZDS", "ARIES"];
    //  var betaEff_names = ["sceptar", "zds", "aries"];
    //  var beta_spectra = ["Ge_Sum_Energy", "Ge_Sum_En_SceptarTagged", "Ge_Sum_En_ZdsTagged", "Ge_Sum_En_AriesTagged"];
    var viewerName = dataStore.plots[0];
    var fileName = dataStore.histoFileName.split(".")[0];
    var theseHistograms = [], thesePeaks = {}, theseLimits=[];
    var sum=0;

    // Add the Ge singles spectrum
    var thisSpectrum = fileName+":"+"Ge_Sum_Energy";
    dataStore.viewers[viewerName].addData(thisSpectrum,dataStore.rawData[thisSpectrum]);
    theseHistograms.push(thisSpectrum);
    sum=0; maxValue=0; maxChan=0;
    for(var j=0; j<dataStore.rawData[thisSpectrum].length; j++){
      sum += dataStore.rawData[thisSpectrum][j];
      if(j>100 && dataStore.rawData[thisSpectrum][j]>maxValue){
        maxValue = dataStore.rawData[thisSpectrum][j];
        maxChan = j;
      }
    }
    if(dataStore.peakOfInterest == null){
      dataStore.peakOfInterest = maxChan;
      document.getElementById('peakOfInterestInput').value = maxChan;
    }
    thesePeaks[thisSpectrum] = [dataStore.peakOfInterest];
    theseLimits.push([-1,-1]);

    var keys = Object.keys(dataStore.betaEfficiencyCheck);
    // Plot spectra for the beta detectors present in this run
    // Add this plot to the list for peak fitting
    for(var i=0; i<keys.length; i++){
      sum=0; maxValue=0; maxChan=0;
      var thisSpectrum = fileName+":"+dataStore.betaEfficiencyCheck[keys[i]].spectrumName;
      if(!dataStore.rawData[thisSpectrum]){ continue; }

      for(var j=0; j<dataStore.rawData[thisSpectrum].length; j++){
        sum += dataStore.rawData[thisSpectrum][j];
        if(j>100 && dataStore.rawData[thisSpectrum][j]>maxValue){
          maxValue = dataStore.rawData[thisSpectrum][j];
          maxChan = j;
        }
      }
      if(sum<100){ continue; } // Skip empty spectra
      dataStore.betaEfficiencyCheck[keys[i]].active = true;
      dataStore.betaEfficiencyCheck[keys[i]].histogramName = thisSpectrum;

      if(dataStore.peakOfInterest == null){
        dataStore.peakOfInterest = maxChan;
        document.getElementById('peakOfInterestInput').value = maxChan;
      }

      dataStore.viewers[viewerName].addData(thisSpectrum,dataStore.rawData[thisSpectrum]);
      theseHistograms.push(thisSpectrum);
      thesePeaks[thisSpectrum] = [dataStore.peakOfInterest];
      theseLimits.push([-1,-1]);
    }

    // Bail out here if we dont have any beta detectors active.
    if(theseHistograms.length<2){
      document.getElementById('widget-beta-efficiency').classList.add('hidden');
      return;
    }

    // Save this list for replotting
    dataStore.betaEfficiencySpectra = theseHistograms;

    // Set the axis limits
    var xMin = (dataStore.peakOfInterest<100) ? 100 : (dataStore.peakOfInterest - 100);
    var xMax = (dataStore.peakOfInterest+100 > 8191) ? 8191 : (dataStore.peakOfInterest + 100);
    dataStore.viewers[viewerName].XaxisLimitMin = xMin;
    dataStore.viewers[viewerName].XaxisLimitMax = xMax;
    dataStore.viewers[viewerName].setAxisType('log');

    // Trigger the initial draw
    dataStore.viewers[viewerName].plotData();

    // Start the fitting routine for singles peaks
    fitPeaksInSeriesOfHistograms(theseHistograms,thesePeaks,"HPGe",theseLimits);
  }

  function fittingCallback(){
    console.log("fittingCallback function");
    var viewerName = dataStore.plots[0];

    // Add the gamma singles
    var histo = dataStore.histoFileName.split(".")[0] + ":Ge_Sum_Energy";
    dataStore.viewers[viewerName].addData(histo,dataStore.rawData[histo]);
    // Update the spectra for each active beta detector
    var keys = Object.keys(dataStore.betaEfficiencyCheck);
    for(var i=0; i<keys.length; i++){
      if(dataStore.betaEfficiencyCheck[keys[i]].active){
        histo = dataStore.betaEfficiencyCheck[keys[i]].histogramName;
        dataStore.viewers[viewerName].addData(histo,dataStore.rawData[histo]);
      }
    }

    // Set the axis limits
    var xMin = (dataStore.peakOfInterest<100) ? 100 : (dataStore.peakOfInterest - 100);
    var xMax = (dataStore.peakOfInterest+100 > 8191) ? 8191 : (dataStore.peakOfInterest + 100);
    dataStore.viewers[viewerName].XaxisLimitMin = xMin;
    dataStore.viewers[viewerName].XaxisLimitMax = xMax;
    dataStore.viewers[viewerName].setAxisType('log');

    // Plot the data
    dataStore.viewers[viewerName].plotData();

    // Print beta Efficiency Results
    calculateBetaEfficiency();
  }

  function calculateBetaEfficiency(){
    console.log("calculateBetaEfficiency function called");
    console.log(dataStore);

    var singlesCounts = dataStore.fitResults[dataStore.histoFileName.split(".")[0] + ":Ge_Sum_Energy"][0][5];
    var singlesCountsUnc = Math.sqrt(singlesCounts);

    var keys = Object.keys(dataStore.betaEfficiencyCheck);
    for(var i=0; i<keys.length; i++){
      if(dataStore.betaEfficiencyCheck[keys[i]].active){
        // First clear any existing results
        dataStore.betaEfficiencyCheck[keys[i]].counts = 0;
        dataStore.betaEfficiencyCheck[keys[i]].countsUncertainty = 0;
        dataStore.betaEfficiencyCheck[keys[i]].efficiency = 0;
        dataStore.betaEfficiencyCheck[keys[i]].efficiencyUncertainty = 0;

        var histo = dataStore.betaEfficiencyCheck[keys[i]].histogramName;
        dataStore.betaEfficiencyCheck[keys[i]].counts = dataStore.fitResults[histo][0][5];
        dataStore.betaEfficiencyCheck[keys[i]].countsUncertainty = Math.sqrt(dataStore.betaEfficiencyCheck[keys[i]].counts)/dataStore.betaEfficiencyCheck[keys[i]].counts;
        dataStore.betaEfficiencyCheck[keys[i]].efficiency = ((dataStore.betaEfficiencyCheck[keys[i]].counts / singlesCounts)*100).toFixed(1);
        dataStore.betaEfficiencyCheck[keys[i]].efficiencyUncertainty = (dataStore.betaEfficiencyCheck[keys[i]].countsUncertainty * dataStore.betaEfficiencyCheck[keys[i]].efficiency).toFixed(2);

        var detName = dataStore.betaEfficiencyCheck[keys[i]].detectorName;
        document.getElementById('betaEff'+detName+'Row').classList.remove('hidden');
        document.getElementById('betaEff'+detName+'Cell1').innerHTML = parseInt(dataStore.betaEfficiencyCheck[keys[i]].counts)+"/"+parseInt(singlesCounts);
        document.getElementById('betaEff'+detName+'Cell2').innerHTML = dataStore.betaEfficiencyCheck[keys[i]].efficiency+" %";
        document.getElementById('betaEff'+detName+'Cell3').innerHTML = "&plusmn;"+dataStore.betaEfficiencyCheck[keys[i]].efficiencyUncertainty+" %";
      }
    }
  }
