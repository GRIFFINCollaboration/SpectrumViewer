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
  dataStore.histoChoiceBarContents = ['TimeCalibrator', '60Co'];  // Array defining the contents of the histoChoiceBar user input. Used in setupHistoListSelect()

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

  // Final results
  dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared],
                                     //                                                                                       'pileupk1':[1 0 0 0 0 0 0], 'pileupk2':[1 0 0 0 0 0 0], 'pileupE1':[0 0 0 0 0 0 0],
                                     //                                                                                       'crosstalk0:[0,1,0,0,0,0,0]', 'crosstalk1:[0,1,0,0,0,0,0]', 'crosstalk2:[0,1,0,0,0,0,0]'}

  //custom element config
  dataStore.dataType = 'Singles';                                         //mode of operation: Singles or Addback.

  // Workflow management and progress tracking
  dataStore.currentJob = 'timeCalibrator';           // time calibrator, 60Co
  dataStore.currentTask = 'Setup';                   // keep track of which task we are on to determine the behaviour of certain function. Setup, Fetching, Creation, Singles, Projections, Results
  dataStore.currentHistoFileName = '';               // keep track of which file we are currently working with in the list
  dataStore.currentSpectrumIndex = 0;                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentPeakIndex = 0;                               // index for the dataStore.sourceInfo while looping through sources.
  dataStore.progressBarKey = "fastTimingCalibrationsProgress";  // id of the Div with class = "progress-bar ..."
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
    'TimeCalibrator' : {'spectrumList1d' : [
      'LBT01XT00X_Pulse_Height','LBT02XT00X_Pulse_Height','LBT03XT00X_Pulse_Height','LBT04XT00X_Pulse_Height',
      'LBT05XT00X_Pulse_Height','LBT06XT00X_Pulse_Height','LBT07XT00X_Pulse_Height','LBT08XT00X_Pulse_Height',
      'LBT09XT00X_Pulse_Height','LBT10XT00X_Pulse_Height','LBT11XT00X_Pulse_Height','LBT12XT00X_Pulse_Height'],
      'spectrumList1dPeaks' : { 'All':[2650,5670,8660,11600,14450] }, 'histogramFileNames' : [],
      'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}
    },
    '60Co' : {'spectrumList1d' : [
      'uncalibrated_TAC_00_01', 'uncalibrated_TAC_00_02', 'uncalibrated_TAC_00_03', 'uncalibrated_TAC_00_04', 'uncalibrated_TAC_00_05', 'uncalibrated_TAC_00_06', 'uncalibrated_TAC_00_07',
      'uncalibrated_TAC_01_02', 'uncalibrated_TAC_01_03', 'uncalibrated_TAC_01_04', 'uncalibrated_TAC_01_05', 'uncalibrated_TAC_01_06', 'uncalibrated_TAC_01_07',
      'uncalibrated_TAC_02_03', 'uncalibrated_TAC_02_04', 'uncalibrated_TAC_02_05', 'uncalibrated_TAC_02_06', 'uncalibrated_TAC_02_07',
      'uncalibrated_TAC_03_04', 'uncalibrated_TAC_03_05', 'uncalibrated_TAC_03_06', 'uncalibrated_TAC_03_07',
      'uncalibrated_TAC_04_05', 'uncalibrated_TAC_04_06', 'uncalibrated_TAC_04_07',
      'uncalibrated_TAC_05_06', 'uncalibrated_TAC_05_07',
      'uncalibrated_TAC_06_07',
      'uncalibrated_TAC_01_00',
      'LBL01XN00X_Pulse_Height','LBL02XN00X_Pulse_Height','LBL03XN00X_Pulse_Height','LBL04XN00X_Pulse_Height',
      'LBL05XN00X_Pulse_Height','LBL06XN00X_Pulse_Height','LBL07XN00X_Pulse_Height','LBL08XN00X_Pulse_Height'
    ], 'spectrumList1dPeaks' : { 'All':[] }, 'histogramFileNames' : [],
    'spectrumList2d' : [], 'spectrumListGates' : [], 'spectrumListProjectionsPeaks' : {'All':[]}}};


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
    dataStore.buttonNames = ["Spectra"];  // Names to appear on the buttons
    dataStore.buttonIDs = ["plotRegionMenuButton"];    // IDs for the buttons
    dataStore.buttonPages = ["plotRegion"];                 // Pages (div IDs) to be associated with the buttons

    // Generate THESEdetectors object. Used for building the coefficients table
    dataStore.numberOfClovers = 16;
    dataStore.THESEdetectors = [];
    var crystals = ["B","G","R","W"];
    var letter = ["A","B"];
    var num = 0;
    for(j=0; j<letter.length; j++){
      for(i=1; i<(dataStore.numberOfClovers+1); i++){
        for(k=0; k<4; k++){
          dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];
          num++;
        }
      }
    }

    // TAC Calibrator details
    dataStore.timeCalibratorPeriod = 10000;  // time Calibrator Period setting in picoseconds (usually 10ns)
    dataStore.timeCalibratorPeaks = {};      // place to store the peaks found in the time calibrator spectrum
    dataStore.rawTACPeaks = {};              // place to store the centre-of-mass of the uncalibrated TAC peak
    dataStore.tacCalibration = {};           // Place to store fit coefficients for the TAC: key: [gain,offset]
    dataStore.tacGain = [];                  // Place to store gain coefficients as array with index as the TAC number
    dataStore.comboOffsets = [];                  // Place to store offsets for each LBL-LBL combination as array
    dataStore.LBLgains = [];                 // Place to store LaBr3 gain coefficients (offset and quad assumed to be zero)


    // LBL reference spectrum
    dataStore.referenceSpectrum = {};
    dataStore.referenceSpectrum = {"LBL": [700,738,724,736,728,711,735,723,750,771,810,799,820,850,846,882,885,952,906,900,926,936,948,915,874,855,919,893,887,986,978,1035,
      1057,1019,1018,937,982,1001,962,953,915,927,930,888,820,814,773,809,795,767,768,780,743,787,757,737,732,718,697,674,689,701,718,723,747,716,723,743,698,768,759,719,743,
      737,678,732,773,764,754,794,783,779,799,779,753,827,790,796,843,827,788,808,813,805,827,807,803,807,780,792,847,782,818,778,817,788,801,788,818,750,733,809,821,791,800,
      763,803,773,785,806,766,824,819,795,833,783,780,797,845,819,805,825,865,820,785,828,858,769,792,809,902,857,776,792,815,849,846,822,853,837,859,838,844,867,884,854,842,
      945,944,893,957,900,916,894,842,930,936,947,983,977,1019,1040,1031,1059,1102,1087,1049,1009,1117,1130,1145,1124,1120,1116,1118,1096,1154,1070,1112,1120,1099,1117,1135,
      1035,1048,1048,1015,1058,1009,1004,1009,994,982,984,989,995,988,972,969,993,976,947,961,934,917,958,856,854,907,930,938,906,870,815,869,904,874,865,858,832,871,851,865,
      882,863,903,844,861,797,796,837,851,790,842,814,779,879,824,790,849,844,840,845,821,799,818,807,852,827,766,759,751,838,844,774,844,780,854,795,858,796,855,870,820,827,
      831,856,839,785,834,816,788,773,831,809,805,816,775,797,822,822,784,792,832,824,788,783,800,849,808,780,764,799,850,788,769,757,834,811,787,817,807,785,761,767,815,772,
      734,762,757,830,781,745,763,743,718,790,742,769,773,765,747,775,752,777,815,745,750,786,773,742,795,760,753,787,771,713,748,810,721,729,796,756,707,736,733,694,778,724,
      738,727,740,728,740,766,732,721,712,741,699,723,756,693,752,742,678,685,735,733,705,662,755,656,744,668,770,696,700,669,700,715,774,760,702,664,714,691,690,700,724,714,
      691,706,686,731,678,707,719,647,702,703,672,703,715,701,731,648,686,654,652,664,690,654,702,697,675,700,689,680,677,669,638,687,692,689,664,710,652,653,691,675,639,679,
      655,651,651,684,648,681,671,660,639,701,704,696,668,672,656,679,712,616,648,657,678,678,717,633,699,653,703,694,655,637,694,640,663,688,707,740,664,710,681,669,681,655,
      679,662,692,684,663,680,671,634,642,613,625,591,648,610,627,623,593,624,659,603,648,628,639,648,632,595,642,650,540,671,627,629,629,673,640,624,624,633,644,594,631,618,
      626,629,621,617,664,602,674,612,606,591,600,647,570,582,611,590,630,639,633,602,587,646,617,584,604,621,597,640,587,561,613,623,645,572,627,598,579,594,611,607,621,593,
      581,564,628,603,646,599,642,613,562,613,607,601,589,581,598,591,600,586,598,599,572,607,610,599,612,610,578,590,578,568,590,591,562,565,575,620,595,593,611,586,592,553,
      607,595,551,628,597,600,616,565,593,547,582,644,571,561,568,591,588,633,577,552,611,581,583,594,574,568,579,591,598,565,564,564,599,593,560,576,520,596,592,586,572,547,
      621,564,551,592,599,570,551,584,557,568,595,609,558,576,573,584,587,569,570,583,569,551,611,588,537,550,575,556,578,536,577,605,575,620,549,582,572,576,575,552,618,560,
      547,589,584,576,572,584,565,544,572,526,566,563,592,554,556,557,587,586,575,548,558,585,573,592,595,555,561,577,557,563,567,541,575,563,588,539,547,538,552,582,578,596,
      606,615,583,599,581,569,573,574,554,559,607,592,588,580,596,595,564,560,590,607,575,566,564,577,525,605,573,579,541,576,575,573,585,548,535,628,530,559,588,581,600,542,
      585,548,583,595,583,620,602,585,549,565,627,573,596,600,581,574,625,620,606,561,593,625,631,572,602,624,621,576,649,586,596,625,586,589,563,639,589,608,608,649,638,597,
      622,656,589,564,591,569,624,606,601,606,617,594,590,618,590,591,566,620,555,622,627,593,615,585,586,573,618,622,619,615,624,601,642,632,598,591,611,637,624,559,607,614,
      589,570,612,625,609,622,613,624,617,603,612,641,620,633,622,593,680,654,669,643,625,609,594,644,679,641,672,660,651,618,672,636,647,626,653,663,618,661,618,655,633,628,
      667,665,667,670,697,641,620,687,653,644,687,644,682,700,660,663,631,634,598,700,616,650,677,675,628,635,618,668,610,623,632,615,600,603,608,658,581,576,621,616,577,567,
      538,549,529,577,551,544,572,564,503,514,526,522,531,481,542,510,514,545,477,443,498,449,444,436,452,461,470,434,459,446,412,443,452,450,447,431,432,462,412,446,402,392,
      420,447,426,408,424,445,415,426,394,425,383,399,384,421,410,387,385,436,427,425,386,380,391,382,394,398,408,392,393,404,399,398,403,395,386,393,400,394,453,388,396,376,
      391,394,404,350,383,390,394,404,366,380,392,369,384,432,357,390,363,402,387,385,389,403,373,417,385,390,401,410,421,384,369,444,383,403,391,399,449,415,406,398,386,403,
      449,420,414,418,408,418,419,436,404,387,371,375,418,371,400,398,372,393,405,388,362,390,418,375,379,352,375,350,382,399,353,363,363,373,356,413,338,373,380,366,372,372,
      361,371,373,354,359,372,395,372,421,411,360,419,423,466,480,476,541,534,534,574,607,627,669,703,717,839,833,835,927,1001,1132,1100,1195,1259,1302,1433,1421,1536,1554,
      1701,1681,1799,1926,1942,2021,2111,2033,2239,2177,2248,2324,2305,2408,2371,2386,2382,2364,2312,2355,2307,2151,2175,2187,2018,2082,1947,1936,1764,1744,1635,1511,1507,1408,
      1296,1182,1129,1098,1008,933,870,775,745,668,583,528,512,419,412,360,338,319,262,292,213,203,175,199,151,158,151,132,133,103,101,111,109,112,91,94,90,109,80,69,83,67,80,
      72,83,78,69,79,73,72,73,62,74,55,85,68,81,74,76,77,65,73,71,84,59,84,87,59,65,77,73,70,69,71,79,68,101,69,89,77,90,110,93,92,96,94,86,127,101,100,122,109,144,136,147,142,
      149,156,175,193,202,194,207,201,232,235,239,294,300,261,304,329,375,389,464,480,488,518,568,587,609,673,706,759,790,875,961,973,1028,1133,1129,1181,1206,1327,1338,1420,
      1483,1529,1608,1595,1688,1754,1797,1805,1846,1862,1893,1867,1991,1834,1890,1863,1905,1925,1793,1735,1770,1750,1712,1654,1605,1504,1538,1404,1419,1314,1210,1185,1068,1028,
      965,1007,866,811,764,728,641,585,540,473,486,420,419,364,334,320,254,251,226,222,163,147,155,121,132,119,86,92,78,72,74,61,55,52,30,45,44,33,29,23,36,36,26,28,29,29,20,
      19,31,19,21,17,18,21,19,11,17,25,12,20,15,19,21,17,15,17,10,13,20,17,12,11,11,10,16,13,9,16,10,12,15,17,15,20,13,10,20,12,14,14,16,19,11,13,5,11,7,13,19,14,13,11,16,16,
      13,14,13,15,19,16,18,13,10,9,15,13,15,8,14,14,14,13,12,7,13,11,7,12,11,11,12,9,14,11,17,14,17,8,11,10,13,10,10,9,9,7,11,9,10,15,3,11,11,8,7,7,5,8,12,5,7,7,8,6,8,7,3,8,3,
      9,10,3,5,6,7,3,2,8,3,5,7,8,9,6,6,3,10,5,7,4,9,5,8,4,5,11,2,7,5,5,8,4,2,7,6,5,7,4,7,6,6,4,3,7,6,9,8,7,3,13,6,4,3,7,5,6,7,7,10,1,8,7,7,3,8,7,5,5,6,6,1,2,5,4,2,4,4,7,5,6,2,
      5,4,7,5,7,5,3,3,4,8,2,4,3,4,4,8,2,6,4,7,2,7,6,6,4,7,11,6,10,4,4,3,6,6,3,5,2,6,1,8,7,5,7,6,6,11,3,6,7,0,3,4,3,6,7,5,5,2,3,6,6,2,4,6,2,11,3,6,5,8,2,9,4,3,7,2,5,5,5,4,5,5,
      6,4,3,0,0,4,8,3,7,7,5,6,4,4,10,6,5,4,2,8,11,3,1,3,1,2,5,5,2,3,4,6,5,3,4,4,6,5,7,2,5,6,8,4,6,4,6,5,4,7,4,3,2,2,7,1,2,8,3,3,5,10,6,6,7,7,4,6,6,4,5,5,6,4,6,3,5,9,5,3,5,4,3,
      3,5,3,4,6,8,4,1,1,3,2,4,6,0,6,5,6,3,4,6,7,4,5,6,5,4,6,3,8,4,2,9,6,6,8,5,5,5,6,3,2,6,3,6,5,3,5,5,4,8,4,3,3,4,3,5,5,6,5,1,2,5,5,7,2,3,7,7,2,3,3,1,5,6,3,5,3,5,4,2,3,7,3,7,4,
      6,5,4,4,2,2,3,4,5,2,3,2,4,5,4,4,4,3,4,5,3,5,7,1,1,5,3,5,1,3,6,3,6,4,9,8,4,2,8,3,9,5,5,3,1,2,4,4,4,2,1,5,4,5,3,6,5,2,4,1,4,2,3,6,6,2,5,8,6,1,4,5,5,3,4,6,4,3,1,3,5,5,5,4,1,
      5,6,4,6,2,8,3,5,6,6,3,8,4,7,3,2,2,2,4,2,4,9,4,4,4,3,4,4,2,8,2,5,4,4,4,8,6,2,5,2,5,6,2,6,3,7,5,1,1,5,5,7,5,2,4,8,6,1,5,4,3,6,4,6,4,5,6,4,7,5,7,6,6,5,5,1,5,6,3,6,4,4,5,5,4,
      8,1,5,3,6,6,3,8,7,3,4,3,8,7,5,7,4,7,2,1,6,7,7,4,6,5,3,1,1,0,3,4,5,3,2,5,6,2,3,4,3,5,3,1,4,7,4,2,6,2,5,3,4,4,5,3,8,3,4,5,1,7,6,4,5,3,2,6,4,3,6,4,3,3,6,7,3,6,5,6,3,3,4,4,1,
      4,5,4,1,2,1,3,2,7,5,5,4,4,4,2,3,2,2,4,4,7,8,4,1,1,4,4,4,3,5,4,3,6,2,1,1,1,4,4,8,3,4,2,1,4,4,5,4,3,7,3,2,4,5,3,7,1,4,3,6,1,2,3,2,0,3,0,3,1,0,4,6,10,1,4,4,1,0,1,8,5,7,2,2,2,
      5,9,9,2,2,6,1,2,2,2,4,3,7,3,2,1,3,5,2,3,5,4,5,7,2,5,1,5,5,5,3,6,5,2,7,4,2,2,1,1,3,7,4,3,3,2,3,5,3,6,2,1,3,4,6,4,2,0,6,1,1,5,3,3,1,1,3,3,7,6,3,8,1,4,2,4,4,4,1,3,2,2,5,2,5,
      5,7,7,1,3,4,6,3,0,3,2,5,2,3,4,5,8,7,2,8,6,1,2,3,2,3,3,4,2,4,5,2,4,5,8,5,5,7,6,3,5,4,1,2,4,3,2,1,4,3,7,4,1,3,3,4,1,4,4,3,3,4,4,4,8,1,0,2,2,6,3,5,2,1,1,2,5,6,1,4,3,5,2,7,2,
      2,3,3,3,4,2,2,2,1,1,3,6,3,4,3,2,5,5,2,4,1,4,1,4,1,3,2,2,0,1,1,4,0,2,3,2,1,0,2,4,3,1,1,3,2,2,5,4,3,2,1,3,2,3,5,3,1,3,5,1,3,3,3,3,4,5,2,1,1,3,3,3,1,4,4,1,4,2,1,2,2,0,1,1,3,
      1,2,2,1,3,2,2,2,2,2,0,2,3,1,0,0,2,4,1,2,4,2,3,0,3,1,0,2,4,2,1,3,0,0,1,3,0,1,1,1,2,3,2,4,1,0,0,0,0,1,1,2,2,1,2,1,0,2,0,2,1,1,1,1,0,2,0,1,1,0,1,3,1,1,2,0,1,0,1,1,1,3,2,0,1,
      1,1,0,2,0,2,3,1,0,1,0,1,1,1,1,3,1,2,1,2,2,1,0,2,2,3,3,1,3,2,1,1,1,0,4,0,3,0,2,1,2,2,3,2,1,2,0,6,3,3,6,3,6,6,3,5,3,6,4,1,3,3,5,2,3,2,4,4,5,4,1,3,5,3,4,2,4,7,5,2,2,3,5,6,4,
      6,8,5,1,3,2,0,3,5,1,3,2,3,3,1,3,1,2,2,3,3,5,1,0,4,0,1,2,5,1,1,2,2,1,5,2,0,3,1,1,1,1,0,1,1,2,0,1,0,1,0,1,0,0,0,1,2,1,2,1,2,0,2,1,0,3,1,0,1,0,2,1,1,1,0,0,3,1,0,1,0,2,1,0,0,
      0,0,1,2,0,2,1,1,0,2,1,0,0,1,0,0,1,0,2,0,0,3,1,0,1,1,1,1,0,1,2,1,0,0,0,0,0,0,1,2,0,1,0,0,0,0,0,2,0,1,0,0,1,0,0,1,2,0,1,1,1,0,0,1,1,1,2,1,1,0,0,0,3,2,1,0,1,0,1,1,3,1,0,0,2,
      2,1,2,0,0,0,1,1,0,1,1,0,1,0,3,1,2,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,3,1,0,0,2,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]};



    } // end of setupDataStore()
    setupDataStore();

    function setupFastTimingCalibrations(){
      // This fast timing app is different from the others. We dont actually want peak fitting.
      //

      // Grab the template peak-fitting script to a local copy here
      var thisScript = {};
      thisScript = dataStore.peakFitterScriptTemplate['TimeCalibrator'];

      // Get the user input on histogramFileNames
      thisScript.histogramFileNames.push(document.getElementById('HistoListSelectTimeCalibrator').value);

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

        // Generate the pileupCorrections report table
        //  dataStore._pileupCorrectionsReport = new pileupCorrectionsReport('pileupCorrections','crystalKReportRegionpileupCorrectionsDetector','crystal1stHitReportRegionpileupCorrectionsDetector');
        //  dataStore._pileupCorrectionsReport.setup();

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
          // This app is different. Instead we will call the custom functions to process the Time Calibrator spectra and the LaBr3 calibration

          if(dataStore.currentJob == 'timeCalibrator'){
            findTacCalibration(); // Find the gain of the TACs using the time calibrator run

            // Advance to the next job
            dataStore.currentJob = '60Co';

            // Grab the template peak-fitting script to a local copy here
            var thisScript = {};
            thisScript = dataStore.peakFitterScriptTemplate['60Co'];

            // Get the user input on histogramFileNames
            thisScript.histogramFileNames.push(document.getElementById('HistoListSelect60Co').value);

            // Setup the peak-fitting script from the template
            receiveScript(JSON.stringify(thisScript));

            // Request the Config for this histogram to get the addresses needed for building the Cal file
            viewConfigOfHisto(document.getElementById('HistoListSelect60Co').value);

            // Start the automatic process
            launchPeakFittingProcess();

          }else if(dataStore.currentJob == '60Co'){
            console.log(dataStore);
            findTacOffsets(); // Find the offset of the TAC for each LaBr combination using the 60Co run
            gainMatchLBL();   // Determine the gain for each LaBr energy using the 60Co run
          }else{
            console.log('All fitting is complete. Now put it together.');
          }
        }

        function fittingCallback(){
          // All fitting has now been completed
          console.log("fittingCallback");

          // We now have gain and have found the peak centroids for the TACs.
          // Use peak centroid to calculate the offset values for each LBL-LBL combination.

          var histoName = dataStore.currentHistoFileName.split(".")[0];
          var specList = dataStore.peakFitterScriptTemplate["60Co"].spectrumList1d;
          var index=0;
          dataStore.comboOffsets.fillN(0,29);

          var string = "int tac_lbl_combo_offset[(int)((N_LABR)*(N_LABR-1)/2)+2] = {";
          for(var i=0; i<specList.length; i++){
            if(!specList[i].includes("TAC_")){ continue; } // Only use TAC histograms in the 60Co run
            var thisKey = histoName + ":" + specList[i];
            if(!dataStore.fitResults[thisKey]){ continue; } // Bail out if there are no fit results yet
            if(isNaN(dataStore.fitResults[thisKey][0][1])){ dataStore.fitResults[thisKey][0][1]=500; } // Set failed fit to zero offset
            dataStore.comboOffsets[index] = 500 - dataStore.fitResults[thisKey][0][1];
            if(i>0){ string += ","; }
            string += (500 - dataStore.fitResults[thisKey][0][1]).toFixed(0);
            index++;
          }
          string += "};";

          // Now we are done.
          // Reveal the download buttons
          document.getElementById('saveCalDiv').classList.remove('hidden');
          //  document.getElementById('saveCSVDiv').classList.remove('hidden');
          //  document.getElementById('saveScriptDiv').classList.remove('hidden');

          // change information message
          document.getElementById('fittingProjectionsMessage').classList.add('hidden');
          document.getElementById('reviewMessage').classList.remove('hidden');

          // Display the results in the table
          //  dataStore._pileupCorrectionsReport.updateTable();

          console.log(dataStore);
          console.log("Finished");
          console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

          // Reveal the post-processing buttons nad report div
          //document.getElementById('postProcessDiv').classList.remove('hidden');

          // Launch the post-processing...

        }

        function postProcessTacCalibration(){
          console.log("postProcessTacCalibration");

          var keys = Object.keys(dataStore.rawData);
          for(var i=0; i<keys.length; i++){
            // Only use histograms in the 60Co run
            if(!keys[i].includes(document.getElementById('HistoListSelect60Co').value.split(".")[0])){
              continue;
            }
            // Calibrate the offset correction values
            var thisCentroid = dataStore.fitResults[keys[i]][1].toFixed(1);
          }
        }

        function findTacCalibration(){
          // The time calibrator produces a picket fence of peaks in the spectrum at well-known time differences.
          // Here we will first find the 5 peaks, then perform the linear calibration to 10 picoseconds per channel
          console.log("findTacCalibration");

          var keys = Object.keys(dataStore.rawData);
          for(var i=0; i<keys.length; i++){
            // Only use time calibrator runs
            if(!keys[i].includes(document.getElementById('HistoListSelectTimeCalibrator').value.split(".")[0])){
              continue;
            }
            // Only use TAC histograms in the 60Co run
            if(!keys[i].includes("LBT")){
              continue;
            }

            // We expect to find 5 or 6 peaks within the TAC range in a 16834 channel spectrum
            // The 1st peak is around channel zero and is unreliable so we will ignore it
            // The 6th peak is often clipping the ADC range and is unreliable so we will ignore it
            // So we will find 4 peaks
            // Split the spectrum into 4 sections and find the peak within each section
            var start = 1200; // skip the region around channel zero
            var sectionLength = 2805; // 16834 / 6 = 2805 channels per section
            for(var section=0; section<4; section++){
              var thisLowerLimit = start+(section*sectionLength);
              var thisUpperLimit = thisLowerLimit+sectionLength;
              var thisSectionData = dataStore.rawData[keys[i]].slice(thisLowerLimit,thisUpperLimit);

              if(!dataStore.timeCalibratorPeaks[keys[i]]){ dataStore.timeCalibratorPeaks[keys[i]] = []; }
              //dataStore.timeCalibratorPeaks[keys[i]].push(thisSectionData.indexOf(Math.max(thisSectionData)));
              var maxValue = 0; var index=-1;
              for(k=0; k<thisSectionData.length; k++){
                if(isNaN(thisSectionData[k])){ continue; }
                if(thisSectionData[k]>maxValue){ maxValue = thisSectionData[k]; index = k+thisLowerLimit; }
              }

              dataStore.timeCalibratorPeaks[keys[i]].push(index);
            }

            var gain = (dataStore.timeCalibratorPeaks[keys[i]][dataStore.timeCalibratorPeaks[keys[i]].length-1] - dataStore.timeCalibratorPeaks[keys[i]][0]) / ((dataStore.timeCalibratorPeaks[keys[i]].length-1)*dataStore.timeCalibratorPeriod);

            if(!dataStore.tacCalibration[keys[i]]){ dataStore.tacCalibration[keys[i]] = []; }
            dataStore.tacCalibration[keys[i]][0] = gain;

            var thisTAC = (Number(keys[i].split("LBT")[1].split("X")[0]))-1;
            dataStore.tacGain[thisTAC] = gain;
          }

          // Copy the TAC gains to the THESEcalibrations object for use in buildCalfile
          for(i=0; i<dataStore.tacGain.length; i++){
            var thisKey = "LBT" + alwaysThisLong((i+1),1) + "XT00X";
            if(!dataStore.THESEcalibrations[thisKey]){ dataStore.THESEcalibrations[thisKey] = {}; }
            dataStore.THESEcalibrations[thisKey]['y'] = [];
            dataStore.THESEcalibrations[thisKey]['x'] = [];
            dataStore.THESEcalibrations[thisKey]['xEn'] = [];
            dataStore.THESEcalibrations[thisKey]['residual'] = [];
            dataStore.THESEcalibrations[thisKey]['residualMean'] = 0;
            dataStore.THESEcalibrations[thisKey]['fwhm'] = [];
            dataStore.THESEcalibrations[thisKey]['residualVar'] = 0;
            // 'fit': [quad, gain, offset, reduced-chi-square]
            dataStore.THESEcalibrations[thisKey]['fit'] = [0.0,dataStore.tacGain[i],0.0,1.0];
          }
        }

        function findTacOffsets(){
          console.log("findTacOffsets");
          var spectrumList = [];
          var peaksList = {};

          var keys = Object.keys(dataStore.rawData);
          for(var i=0; i<keys.length; i++){
            // Only use histograms in the 60Co run
            if(!keys[i].includes(document.getElementById('HistoListSelect60Co').value.split(".")[0])){
              continue;
            }
            // Only use TAC histograms in the 60Co run
            if(!keys[i].includes("TAC_")){
              continue;
            }

            // Add this histogram to the list of spectrum names (used as a key)
            spectrumList.push(keys[i]);

            // Create the calibrated TAC spectrum using the gain coefficient
            var thisTAC = Number(keys[i].split("TAC_")[1].split("_")[0]);
            var calibratedSpectrum = [];
            calibratedSpectrum.fillN(0,8192);
            for(j=0; j<dataStore.rawData[keys[i]].length; j++){
              calibratedSpectrum[Math.floor(j*dataStore.tacGain[thisTAC])] += dataStore.rawData[keys[i]][j];
            }
            dataStore.rawData[keys[i]] = calibratedSpectrum; // Change the raw spectrum to the calibrated spectrum

            // We expect to find 1 peak within the TAC range for each LBL-LBL combo
            // There is often a spike at the overflow channel which needs to be excluded
            var thisLowerLimit = 15;
            j=calibratedSpectrum.length-1;
            while(j>0 && calibratedSpectrum[j]<1){ j--; }
            if(j>3000){ var thisUpperLimit = j-100; }else{ var thisUpperLimit = 3000; };
            var thisSectionData = calibratedSpectrum.slice(thisLowerLimit,thisUpperLimit);

            if(!dataStore.rawTACPeaks[keys[i]]){ dataStore.rawTACPeaks[keys[i]] = []; }

            // Find the maximum bin which is close to peak centre
            var maxValue = 0; var maxIndex=-1; var index;
            for(k=0; k<thisSectionData.length; k++){
              if(isNaN(thisSectionData[k])){ continue; }
              if(thisSectionData[k]>maxValue){ maxValue = thisSectionData[k]; maxIndex = index = k+thisLowerLimit; }
            }

            // Save the max bin locally for guessing the peak centroid
            peaksList[keys[i]] = [];
            peaksList[keys[i]].push(index);

            // Find the rough FWHM
            index = maxIndex-thisLowerLimit;
            while(thisSectionData[index]>maxValue/2){ index--; }
            var ROIlowerLimit = maxIndex - (maxIndex-index)*5;
            var ROIupperLimit = maxIndex + (maxIndex-index)*5;

            // Reduce the sectionData to just the peak Region of Interest
            thisSectionData = calibratedSpectrum.slice(ROIlowerLimit,ROIupperLimit);

            // Find the centre of mass of this peak
            var sum = sumProducts = 0;
            for(k=0; k<thisSectionData.length; k++){
              if(isNaN(thisSectionData[k])){ continue; }
              sum += thisSectionData[k];
              sumProducts += thisSectionData[k] * (k+ROIlowerLimit);
            }
            var mean = sumProducts / sum;

            dataStore.rawTACPeaks[keys[i]].push(mean);
          }

          // Now do fitting of these TAC Peaks

          //set the x axis valueRange
          document.getElementById('maxX').value = 16000;
          document.getElementById('maxX').onchange();

          // Start the whole fitting routine for singles peaks
          fitPeaksInSeriesOfHistograms(spectrumList,peaksList,"TAC");

        }

        function gainMatchLBL(){
          console.log("gainMatchLBL");
          var peaksList = {};

          var keys = Object.keys(dataStore.rawData);
          for(var i=0; i<keys.length; i++){
            // Only use histograms in the 60Co run
            if(!keys[i].includes(document.getElementById('HistoListSelect60Co').value.split(".")[0])){
              continue;
            }
            // Only use LBL histograms in the 60Co run
            if(!keys[i].includes("LBL")){
              continue;
            }

            // Create the empty spectrum that will be a starting point for each interation
            var testSpectrumLength = 3000;
            var testSpectrum = [];
            var errorSpectrum = [];
            var emptySpectrum = [];
            emptySpectrum.fillN(0,testSpectrumLength); // For LBL we will try and match between zero and 3MeV

            // Get the reference spectrum from the store
            var referenceSpectrum = dataStore.referenceSpectrum["LBL"].slice(0,testSpectrumLength);

            // Set the parameters for the chi-square sweep
            var gainLowerLimit = 0.7;
            var gainUpperLimit = 2.2;
            var gainStepSize = 0.001;
            var minChiSquare = 100000000;
            var chiSquareSeries = [];
            var optimalGain = 1.0;
            var lowerTestBin = 40;
            var upperTestBin = 1500;
            var lengthTestBins = upperTestBin-lowerTestBin;
            // Scan through gain values
            for(gain=gainLowerLimit; gain<gainUpperLimit; gain+=gainStepSize){
              testSpectrum = [];
              errorSpectrum = [];
              testSpectrum.fillN(0,testSpectrumLength); // For LBL we will try and match between zero and 3MeV
              errorSpectrum.fillN(0,testSpectrumLength); // For LBL we will try and match between zero and 3MeV
              for(j=0; j<testSpectrumLength; j++){
                var bin = Math.round(j*gain);
                if(bin>=0 && bin<testSpectrumLength){
                  testSpectrum[bin] += dataStore.rawData[keys[i]][j];
                }
              }
              for(j=0; j<testSpectrumLength; j++){ errorSpectrum[j] = Math.sqrt(testSpectrum[j]); }
              testSpectrum[0] = testSpectrum[1];   // elimimate noise
              errorSpectrum[0] = errorSpectrum[1]; // elimimate noise
              thisChiSquare = calculateChiSquare(testSpectrum,errorSpectrum,referenceSpectrum);
              //  thisChiSquare = calculateChiSquare(testSpectrum.slice(lowerTestBin,lengthTestBins),errorSpectrum.slice(lowerTestBin,lengthTestBins),referenceSpectrum.slice(lowerTestBin,lengthTestBins));
              chiSquareSeries.push(thisChiSquare);

              // Decide if this is the best fit and save it if it is
              if(thisChiSquare<minChiSquare){ minChiSquare = thisChiSquare; optimalGain = gain; }
            }
            dataStore.LBLgains.push(optimalGain);
            //  console.log(keys[i]+", best chi-square ("+minChiSquare +") at gain "+optimalGain);
            //  console.log(chiSquareSeries);
          }

          // Copy the LBL gains to the THESEcalibrations object for use in buildCalfile
          for(i=0; i<dataStore.LBLgains.length; i++){
            var thisKey = "LBL" + alwaysThisLong((i+1),1) + "XN00X";
            if(!dataStore.THESEcalibrations[thisKey]){ dataStore.THESEcalibrations[thisKey] = {}; }
            dataStore.THESEcalibrations[thisKey]['y'] = [];
            dataStore.THESEcalibrations[thisKey]['x'] = [];
            dataStore.THESEcalibrations[thisKey]['xEn'] = [];
            dataStore.THESEcalibrations[thisKey]['residual'] = [];
            dataStore.THESEcalibrations[thisKey]['residualMean'] = 0;
            dataStore.THESEcalibrations[thisKey]['fwhm'] = [];
            dataStore.THESEcalibrations[thisKey]['residualVar'] = 0;
            // 'fit': [quad, gain, offset, reduced-chi-square]
            dataStore.THESEcalibrations[thisKey]['fit'] = [0.0,dataStore.LBLgains[i],0.0,1.0];
          }
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
