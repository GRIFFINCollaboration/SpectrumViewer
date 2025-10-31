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
  dataStore.outputRawFlag = false;                                    // When true binary Matrix data will be unpacked to the rawData.data2 array
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
  dataStore.roughGainMatchParameters = {};

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
    dataStore.referenceSpectrum = {
      "LaBr3": {
        "60Co": [0,0,0,1,0,0,0,1,0,0,1,2,2,9,14,28,58,82,159,242,323,421,492,722,808,991,1077,1261,1382,1530,1582,1644,1721,1820,1717,1779,1729,1799,1779,1771,1783,1734,1659,1746,1693,1768,1835,1822,1919,1940,1945,1946,2036,2126,2133,2096,2143,2230,2175,2140,2180,2203,2141,2144,2215,2245,2310,2345,2416,2413,2436,2473,2571,2574,2468,2446,2379,2397,2391,2310,2317,2248,2296,2237,2102,2227,2093,2164,2163,2089,2068,2022,1977,1867,1979,1933,1831,1902,1767,1878,1835,1946,1830,1830,1879,1853,1866,1753,1798,1971,1927,1884,1870,1897,1846,1863,1907,1907,1926,1894,1864,1872,1931,1983,1938,1920,2069,1993,1975,1999,1992,2085,1981,1947,1962,2018,2049,2015,1976,2065,1985,2124,1986,1992,2122,2033,1984,2028,2035,2001,2019,1990,2048,1970,2130,2029,2169,2142,2182,2070,2030,2008,2011,2110,2045,2062,2055,2018,2115,2087,2096,2060,2090,2136,2089,2111,2175,2058,2207,2188,2096,2150,2139,2219,2183,2167,2128,2165,2159,2140,2234,2292,2169,2260,2269,2288,2263,2266,2244,2336,2425,2416,2403,2522,2471,2542,2541,2623,2651,2615,2748,2752,2860,2858,2898,2852,2941,2903,2900,2988,2959,2971,2986,3008,3037,2995,2958,2913,2955,2922,3021,2948,2996,2911,2949,2940,2867,2859,2852,2794,2774,2872,2767,2802,2775,2634,2636,2704,2715,2749,2624,2654,2553,2569,2495,2573,2558,2612,2581,2535,2489,2496,2476,2384,2504,2402,2373,2431,2311,2406,2444,2350,2319,2270,2374,2290,2375,2282,2198,2208,2247,2322,2204,2196,2242,2191,2120,2104,2207,2334,2162,2106,2143,2258,2127,2203,2158,2073,2120,2080,2133,2103,2031,2002,2008,2074,2034,2046,1976,2014,2032,2015,2071,2015,2050,2088,1989,1983,1971,1959,1943,1936,2009,1898,1907,1937,1897,1903,1885,1952,1839,1950,1946,1961,1918,1860,1838,1894,1872,1883,1825,1816,1950,1833,1820,1806,1834,1826,1800,1886,1861,1803,1832,1834,1763,1783,1821,1726,1743,1836,1785,1835,1783,1697,1747,1843,1727,1757,1722,1792,1760,1739,1770,1883,1658,1720,1699,1766,1756,1780,1700,1831,1697,1706,1741,1733,1764,1669,1679,1729,1755,1723,1626,1683,1770,1745,1694,1685,1674,1680,1688,1672,1693,1676,1606,1707,1574,1678,1673,1562,1666,1660,1639,1621,1611,1632,1633,1599,1632,1668,1602,1616,1599,1663,1618,1618,1622,1629,1606,1515,1609,1673,1611,1587,1566,1590,1623,1613,1595,1652,1635,1565,1610,1584,1526,1582,1583,1524,1564,1534,1489,1488,1599,1513,1570,1570,1547,1599,1520,1589,1513,1565,1514,1533,1636,1614,1531,1549,1487,1519,1572,1532,1529,1482,1483,1503,1559,1515,1505,1650,1537,1438,1537,1504,1483,1514,1550,1582,1549,1441,1470,1484,1499,1541,1529,1489,1496,1647,1559,1542,1598,1567,1566,1593,1581,1628,1563,1544,1545,1523,1550,1556,1588,1467,1558,1518,1554,1584,1490,1592,1571,1570,1551,1563,1461,1501,1516,1534,1513,1512,1535,1490,1517,1474,1518,1468,1438,1419,1436,1411,1457,1447,1465,1441,1514,1504,1459,1398,1444,1465,1412,1415,1475,1494,1445,1437,1498,1448,1385,1402,1453,1364,1422,1437,1417,1358,1337,1387,1441,1404,1374,1505,1423,1494,1345,1462,1441,1459,1400,1452,1385,1398,1389,1404,1406,1427,1398,1421,1426,1341,1369,1418,1452,1402,1394,1431,1407,1382,1335,1463,1329,1391,1387,1414,1389,1351,1405,1420,1384,1400,1413,1375,1398,1334,1301,1373,1323,1385,1379,1340,1418,1424,1356,1386,1349,1346,1364,1284,1417,1346,1360,1306,1406,1372,1419,1421,1361,1386,1402,1345,1318,1324,1428,1375,1360,1397,1399,1364,1379,1307,1382,1411,1336,1333,1409,1366,1420,1444,1380,1400,1366,1457,1371,1385,1306,1341,1400,1425,1376,1356,1350,1401,1378,1394,1293,1282,1297,1320,1345,1311,1417,1376,1444,1461,1365,1370,1368,1350,1364,1358,1374,1386,1341,1384,1418,1388,1377,1387,1350,1340,1335,1312,1360,1364,1409,1391,1341,1443,1369,1352,1355,1452,1334,1396,1333,1361,1320,1375,1347,1327,1388,1363,1376,1408,1321,1338,1329,1366,1343,1345,1370,1319,1449,1337,1458,1390,1368,1348,1396,1371,1312,1444,1415,1317,1351,1379,1376,1389,1414,1344,1391,1363,1373,1353,1355,1376,1419,1394,1374,1396,1369,1387,1351,1317,1352,1410,1310,1392,1369,1420,1331,1460,1383,1388,1432,1367,1406,1413,1410,1391,1431,1341,1379,1441,1457,1389,1394,1416,1395,1329,1422,1360,1440,1439,1396,1412,1427,1429,1312,1444,1359,1354,1421,1480,1480,1375,1470,1403,1477,1371,1462,1428,1409,1431,1391,1479,1488,1524,1422,1517,1488,1466,1502,1415,1540,1521,1504,1510,1456,1496,1420,1501,1484,1497,1481,1471,1466,1482,1548,1519,1574,1509,1468,1495,1538,1491,1463,1525,1438,1497,1536,1529,1479,1535,1502,1531,1585,1556,1524,1503,1536,1517,1545,1592,1547,1487,1468,1549,1564,1498,1473,1564,1599,1609,1541,1639,1496,1520,1604,1632,1531,1591,1592,1559,1587,1618,1567,1590,1609,1572,1646,1542,1611,1722,1627,1650,1561,1630,1542,1709,1656,1615,1636,1701,1670,1679,1691,1622,1673,1660,1749,1680,1688,1771,1730,1678,1686,1641,1635,1714,1662,1694,1720,1706,1729,1670,1727,1724,1678,1758,1714,1714,1717,1783,1685,1638,1701,1626,1720,1721,1685,1724,1638,1788,1660,1717,1614,1667,1693,1596,1576,1587,1614,1690,1586,1565,1495,1531,1539,1545,1439,1468,1421,1446,1475,1452,1403,1382,1384,1372,1340,1321,1271,1335,1264,1308,1225,1232,1266,1287,1237,1288,1192,1168,1253,1206,1141,1171,1127,1173,1141,1141,1120,1116,1163,1110,1068,1164,1109,1098,1089,1105,1108,1065,1084,1053,1106,1127,1059,1057,1047,1108,1036,1058,1033,1071,1060,1097,1104,1067,1047,1022,1115,1021,1028,1051,1051,1024,1009,1056,1033,1040,1055,1043,1028,990,1050,980,998,1052,1042,1000,1004,1066,989,1060,1052,1017,1026,1041,1060,1022,1000,1106,1078,1005,1043,1025,1044,1005,1063,1065,1032,1021,1093,1014,1019,1040,1080,1032,1016,1042,1122,1029,994,1003,1087,1058,1101,1056,1078,1017,1045,1027,1105,1042,1056,1052,1028,1054,994,1029,1039,1017,1070,1016,1048,1010,1023,947,1010,999,1044,983,1023,1000,990,990,966,963,926,931,915,910,930,860,932,895,921,886,869,896,943,971,909,935,956,998,1044,1018,1063,1116,1185,1276,1238,1270,1422,1515,1613,1726,1861,1911,2061,2217,2377,2510,2653,2751,2951,3167,3301,3512,3719,3871,4095,4236,4427,4659,4787,5097,5202,5376,5472,5519,5654,5814,5838,5884,5969,5991,5903,5891,5932,5890,5730,5591,5515,5299,5116,4955,4907,4755,4538,4290,4213,4029,3725,3629,3500,3183,3097,2921,2755,2544,2407,2262,2114,1992,1837,1716,1620,1537,1473,1320,1199,1107,1090,994,906,880,772,731,720,634,628,565,559,462,455,412,422,432,402,347,330,324,285,277,240,255,246,209,217,217,235,190,175,183,173,179,156,160,168,155,135,138,142,153,150,140,147,156,139,132,157,148,136,160,150,142,154,151,172,167,154,174,184,173,238,204,192,259,228,253,248,276,273,321,335,338,413,422,415,449,508,550,597,652,683,689,796,902,937,966,1141,1212,1369,1357,1493,1631,1752,1934,1997,2128,2226,2497,2670,2761,2844,3020,3192,3436,3468,3556,3786,3873,4050,4331,4316,4460,4337,4550,4530,4655,4705,4685,4799,4798,4570,4873,4659,4673,4454,4534,4434,4305,4149,4101,3956,3834,3762,3511,3483,3196,3135,2995,2778,2519,2573,2388,2249,2092,2031,1956,1837,1698,1624,1419,1342,1315,1188,1059,1077,1012,912,799,758,702,692,635,629,556,493,485,404,384,410,332,347,293,287,260,250,238,225,194,186,202,163,158,132,132,117,117,93,103,95,84,82,86,72,68,67,50,56,53,44,57,45,37,52,35,39,34,46,37,29,37,34,32,45,31,51,26,22,27,44,38,40,33,37,24,26,40,25,24,30,30,27,32,27,42,28,38,45,27,33,30,39,35,36,36,24,31,27,37,33,44,35,37,36,37,38,27,40,37,34,42,35,38,30,31,25,37,30,34,29,25,33,28,18,29,18,23,27,21,21,25,25,17,35,25,17,27,18,22,18,17,13,27,23,14,21,18,16,11,18,20,21,16,10,31,19,24,17,10,15,13,8,14,17,13,5,14,19,11,14,7,10,20,15,14,14,16,15,12,19,12,18,11,16,12,20,21,14,18,12,17,14,19,13,17,12,17,14,12,14,15,15,9,8,14,10,15,12,5,16,12,10,21,8,11,21,11,10,12,8,19,23,12,12,15,15,12,17,13,8,9,17,15,11,10,12,12,8,11,13,11,11,12,11,12,4,11,17,11,6,6,13,12,19,16,12,16,16,12,9,17,15,14,12,12,5,9,9,18,8,7,14,11,12,8,10,10,12,9,11,13,6,12,8,8,10,8,10,7,10,9,7,8,14,11,19,7,14,12,11,9,6,14,14,9,10,14,8,10,10,19,10,9,11,13,10,16,5,8,8,12,7,11,12,6,8,11,11,10,14,8,15,12,9,10,10,4,13,6,10,14,12,10,11,10,16,11,17,4,9,15,13,11,10,9,10,14,7,11,9,7,7,15,8,12,8,12,10,6,20,8,5,14,13,12,8,13,8,9,6,4,9,11,6,14,13,11,8,8,14,11,8,9,7,11,7,12,7,7,6,8,11,8,7,14,7,7,18,10,9,5,10,7,12,12,8,8,8,13,14,10,8,15,11,4,4,10,12,11,8,5,8,9,15,5,6,10,8,7,13,3,7,5,16,11,7,8,12,9,6,11,9,6,9,11,9,7,7,7,16,10,7,8,10,4,13,6,10,9,17,12,6,14,12,12,8,7,14,7,9,12,9,13,6,3,9,9,9,9,7,5,6,13,14,16,16,10,15,12,7,12,12,11,10,15,10,13,9,10,12,4,9,6,16,9,7,2,6,15,13,13,7,10,6,9,10,12,4,9,9,14,18,9,9,8,7,14,7,15,11,16,14,13,11,9,6,9,9,14,6,13,9,6,8,13,9,11,6,10,8,6,14,14,8,11,10,10,9,17,8,6,11,10,16,6,8,13,11,10,8,8,9,7,8,10,10,14,10,11,8,10,12,12,10,9,5,6,8,14,11,11,10,9,13,12,8,5,15,14,16,11,9,10,7,12,10,18,11,15,11,8,16,16,10,18,11,14,14,10,8,14,9,11,11,8,8,12,6,10,8,13,12,10]}
      };

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
          console.log("projectionsCallback with job "+dataStore.currentJob);

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

            // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
            var histoName = dataStore.histoFileName.split(".")[0];
            var spectrumList = [];
            dataStore.spectrumList1d.forEach((element) => { if(element.includes("LBL")){spectrumList.push(histoName+":"+element);} });

            // Perform a rough gainMatching to a reference spectrum ahead of the whole fitting routine for singles peaks
            //  roughGainMatch(spectrumList,"HPGe","60Co");
            roughGainMatch(spectrumList,"LaBr3","60Co");

          }else{
            console.log('All fitting is complete. Now put it together.');
          }
        }

        function roughGainMatchCallback(){
          console.log(dataStore);

          // Add the createdSpectra to the menu
          var keys = Object.keys(dataStore.createdSpectra);
          var histoName = dataStore.histoFileName.split(".")[0];
          for(var i=0; i<keys.length; i++){
            newMenuItem = document.createElement('li');
            newMenuItem.setAttribute('id', 'plotList'+keys[i]);
            newMenuItem.setAttribute('value', keys[i]);
            newMenuItem.setAttribute('class', 'list-group-item toggle');
            newMenuItem.innerHTML = keys[i].split(':')[1].trim()+'<span id=\'plotListbadge'+keys[i]+'\' class=\"badge plotPresence hidden\">&#x2713;</span>';
            document.getElementById('plotListplots'+histoName).appendChild(newMenuItem);
            document.getElementById('plotList'+keys[i]).onclick = function(){ dataStore._plotListLite.exclusivePlot(this.id.split('plotList')[1], dataStore.viewers[dataStore.plots[0]]); }
          }

          // Set the current task to keep track of our progress
          dataStore.currentTask = 'SinglesFitting';

          // Build the list of spectrum names with the histogram name appended to the start of the string so it can be used as a key
          var histoName = dataStore.histoFileName.split(".")[0];
          var spectrumList = [];
          dataStore.spectrumList1d.forEach((element) => { if(element.includes("LBL")){spectrumList.push(histoName+":"+element);} });

          // Build the peaks list
          var peaksList = {};
          for(i=0; i<spectrumList.length; i++){
            peaksList[spectrumList[i]] = [];

            // Save the rough peak centroids for the _Pulse_Height histograms, corrected using the optimalGain
            peaksList[spectrumList[i]].push(1173/dataStore.roughGainMatchParameters[spectrumList[i]]);
            peaksList[spectrumList[i]].push(1332/dataStore.roughGainMatchParameters[spectrumList[i]]);
          }

          // Start the whole fitting routine for singles peaks
          fitPeaksInSeriesOfHistograms(spectrumList,peaksList,"LaBr3");

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

          for(var i=0; i<specList.length; i++){
            var thisKey = histoName + ":" + specList[i];
            if(!dataStore.fitResults[thisKey]){ continue; } // Bail out if there are no fit results yet

            // LaBr3 - make a linear fit for the two fitted peaks
            if(specList[i].includes("LBL")){
              var peaksList = [1173,1332];
              var thisCalKey = specList[i].split("_")[0];
              if(!dataStore.THESEcalibrations[thisCalKey]){ dataStore.THESEcalibrations[thisCalKey] = {}; }
              dataStore.THESEcalibrations[thisCalKey]['y'] = [];
              dataStore.THESEcalibrations[thisCalKey]['x'] = [];
              dataStore.THESEcalibrations[thisCalKey]['xEn'] = [];
              dataStore.THESEcalibrations[thisCalKey]['residual'] = [];
              dataStore.THESEcalibrations[thisCalKey]['residualMean'] = 0;
              dataStore.THESEcalibrations[thisCalKey]['fwhm'] = [];
              dataStore.THESEcalibrations[thisCalKey]['residualVar'] = 0;
              var data = [];
              var k=0;
              for(j=0; j<dataStore.fitResults[thisKey].length; j++){ // loop over all peaks fitted in this spectrum
                if(isNaN(dataStore.fitResults[thisKey][j][1])){ continue; } // exclude failed peak fits where the centroid is NaN
                if(dataStore.fitResults[thisKey][j][5] < 8){ continue; }    // exclude failed peak fits where the area is less than 8 counts
                if(dataStore.fitResults[thisKey][j][2] < 0.5){ continue; }  // exclude failed peak fits where the sigma (width) is less than 0.5 channels
                if(j>0 && (dataStore.fitResults[thisKey][j][1]-dataStore.fitResults[thisKey][j-1][1])<5){
                  continue; // exclude peak which was matched to the previous centroid
                }
                if(j<(dataStore.fitResults[thisKey].length-2) && (dataStore.fitResults[thisKey][j+1][1]-dataStore.fitResults[thisKey][j][1])<5){
                  continue; // exclude peak which was matched to the next centroid
                }

                // Remember peak centroid and literature energy
                // Remember the fwhm for the resolution plot
                dataStore.THESEcalibrations[thisCalKey]['x'][k] = dataStore.fitResults[thisKey][j][1]; // [1] is centroid
                dataStore.THESEcalibrations[thisCalKey]['y'][k] = peaksList[j];
                dataStore.THESEcalibrations[thisCalKey]['fwhm'][k] = dataStore.fitResults[thisKey][j][6]; // [6] is fwhm
                // Construct the data array needed by regression.polynomial
                data.push([dataStore.THESEcalibrations[thisCalKey]['x'][k],dataStore.THESEcalibrations[thisCalKey]['y'][k]]);
                k++;
              }

                // Perform Linear fit
                // Hats off to Tom Alexander, https://github.com/Tom-Alexander/regression-js
                var result = regression.polynomial(data, { order: 1, precision: 10 });
                // 'fit': [quad, gain, offset, reduced-chi-square]
                dataStore.THESEcalibrations[thisCalKey]['fit'] = [0.0,result.equation[0],result.equation[1],1.0];
            }


            // Now calculate the TAC offsets
            if(!specList[i].includes("TAC_")){ continue; } // Only use TAC histograms in the 60Co run
            if(isNaN(dataStore.fitResults[thisKey][0][1])){ dataStore.fitResults[thisKey][0][1]=500; } // Set failed fit to zero offset
            dataStore.comboOffsets[index] = 500 - dataStore.fitResults[thisKey][0][1];
            index++;
          }

          // Now we are done.
          // Reveal the download buttons
          document.getElementById('saveCalDiv').classList.remove('hidden');
          //  document.getElementById('saveCSVDiv').classList.remove('hidden');
          //  document.getElementById('saveScriptDiv').classList.remove('hidden');

          // change information message
          document.getElementById('fittingSinglesMessage').classList.add('hidden');
          document.getElementById('fittingProjectionsMessage').classList.add('hidden');
          document.getElementById('reviewMessage').classList.remove('hidden');

          // Display the results in the table
          //  dataStore._pileupCorrectionsReport.updateTable();

          console.log(dataStore);
          console.log("Finished");
          console.log("Completed: "+dataStore.progressBarTasksCompleted+"/"+dataStore.progressBarNumberTasks+" = " + dataStore.ProgressValue);

          // Reveal the post-processing buttons and report div
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
            var thisKey = "LBT" + alwaysThisLong((i+1),2) + "XT00X";
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
