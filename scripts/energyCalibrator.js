////////////////////////////////////////////
// main setup
////////////////////////////////////////////
//
// Efficiency Fitting general work flow:
// The sources required are 133Ba, 152Eu and 56Co for relative efficiency. 60Co can be used for absolute efficiency.
// User input of histogram files (one for each source) which are already energy gainmatched.
// Fit the Sum energy spectrum for all peaks listed for this source to obtain peak widths and areas.
// Project the 180degree coincidence matrix for each peak energy to obtain the number of counts in the projection for summing-out corrections.
// Project the 180degree coincidence matrix for each peak energy to obtain the number of counts in the peaks for summing-in corrections.
// Apply the summing-in and summing-out corrections to the peak areas; uncorrectedArea -> correctedArea
// Fit the relative efficiency curve to each set of data for the four sources.
// Normalize the relative efficiency curve of 133Ba to that of 152Eu.
// Normalize the relative efficiency curve of 56Co to that of 152Eu.
// Normalize the relative efficiency curve from high-energy GEANT4 data to that of 56Co.
// Normalize the relative efficiency curve to an absolute calibration of the 60Co data points.
// Job done.

// Done. Add histogram name at start of all spectrum names with ':' as separator. Do this after ':2d' is removed in processSpectrumList() in helpers.js.
// Done but not pretty in gainMatcher.js. Add histogram name to top groups definitions in all apps if required.
// Done. Change spectrum name handling of "_Pulse_Height" to use substring instead of slice.
// Add a check to flush the activeSpectra or rawData of any spectrum names which contain different histogram names??
// Modify the refreshAll function in plotControl.html where the queries are built. And where the spectrum data are received.

function setupDataStore(){
  //sets up global variable datastore

  var i, groups = [];

  dataStore = {};

  //network and raw data
  dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //host + port of analyzer server
  dataStore.ODBhost = 'http://grsmid00.triumf.ca:8081/';                  //MIDAS / ODB host + port

  // Histogram directory and filename
  dataStore.histoFileDirectoryPath = '/tig/grifstore0b/griffin/schedule140/Histograms';
  dataStore.histoFileName = '';
  dataStore.histoAutoLoad = false;        // Flag set by the presence of a directory and filename in the URL to automatically load it. Default is off.

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments(setMidasDirectoryToHistos);

  dataStore.numberOfClovers = 16;                                     // Default number of clovers is all of the array
  // shouldn't need to change anything below this line -----------------------------------------------------------------------

  // Pagination for the results and plotting display
  // plotRegion = spectra
  // energyCalibrator = Table of per detector (lit En., centroids PH and En and residuals)
  // energyCalibrator = Table of all (detector num, fit params, r2)
  // graphSection = plot of per detector the PH vs Lit en with Fit and a residuals pane
  // graphSection = plot of all the residuals for specific peak
  // Variables for Pagination menu buttons
  dataStore.buttonNames = ["Spectra", "Detector Results", "Fit Coefficients"];                      // Names to appear on the buttons
  dataStore.buttonIDs = ["plotRegionMenuButton", "tableRegionMenuButton", "graphRegionMenuButton"]; // IDs for the buttons
  dataStore.buttonPages = ["plotRegion", "detectorReportRegion", "resultsTableRegion"];             // Pages (div IDs) to be associated with the buttons


  dataStore.pageTitle = 'Efficiency Fitter';                                   //header title
  dataStore.DAQquery = '';
  dataStore.ViewConfigQuery = '';
  dataStore.ODBrequests = [];                                               //request strings for odb parameters
  dataStore.PSCchannels = {};                                             //store the full list of channels in the PSC table for building a Cal file
  dataStore.PSCaddresses = {};                                            //store the full list of addresses in the PSC table for building a Cal file
  dataStore.RunNumber = '';                                               //store the run number for naming the Cal file
  dataStore.rawData = {};                                                 //buffer for raw spectrum data
  dataStore.raw = [0];                                                 //buffer for raw matrix data
  dataStore.hm = {};                                                 //object for 2d matrix stuff
  dataStore.hm._raw = [0];                                                 //buffer for raw matrix data
  dataStore.createdSpectra = {};                                       //initialize empty object for created spectra
  //fitting
  dataStore.mode = 'auto';                                              //mode of operation: manual (user defined search regions) or auto (predefined search regions).
  dataStore.ROI = [];                                                     //regions of interest (singles) to look for peaks in: dataStore.ROI[sourceKey][crystalIndex][peakIndex] = [low bin, high bin]
  dataStore.fitResults = {};                                            //fit results of singles: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]

  //custom element config
  dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects

  dataStore.resolutionData = [];                                      //dygraphs-sorted peak widths for both peaks, in same order as THESEdetectors: [[detectorIndex, low peak width, high peak width], ...]
  dataStore.lowPeakResolution = [];                                   //low energy peak resolutions, indexed per GRIFFINdetectors
  dataStore.lowPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                             //start with zeroes
  dataStore.midPeakResolution = [];                                  //as midPeakResolution
  dataStore.midPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                            //start with zeroes
  dataStore.highPeakResolution = [];                                  //as highPeakResolution
  dataStore.highPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                           //start with zeroes
  dataStore.vhiPeakResolution = [];                                  //as highPeakResolution
  dataStore.vhiPeakResolution.fillN(0,(dataStore.numberOfClovers*4*2));                            //start with zeroes
  dataStore.searchRegionP1 = [];                                         //[x_start, x_finish, y for peak search bar]
  dataStore.searchRegionP2 = [];                                         //[x_start, x_finish, y for peak search bar]
  dataStore.searchRegionP3 = [];                                         //[x_start, x_finish, y for peak search bar]
  dataStore.searchRegionP4 = [];                                         //[x_start, x_finish, y for peak search bar]

  dataStore.modeType = 'Histo';                                         //mode of operation: Online or Histo.
  dataStore.modeChoice = [                                               // Mode choice (online/histogram file) information to generate buttons
    {"name": "Online", "text": "Use online data"},
    {"name": "Histo", "text": "Use a histogram file"}
  ];

  dataStore.detectorChoice = [{"name": "HPGe"},{"name": "PACES"}];       // Detector choice information to generate buttons
  dataStore.detectorType = 'HPGe';                                       // The selected Detector choice

  dataStore.currentTask = 'Setup';               // keep track of which task we are on to determine the behaviour of certain function. Mostly used to decide where to write fit results. Singles, Summing
  dataStore.currentSource = '133Ba';                                           // index for the dataStore.sourceInfo while looping through sources.
  dataStore.currentDetector = 0;                                           // index for the dataStore.THESEdetectors while looping through spectra.
  dataStore.sourceCalibration = {                                              // NIST-certification of 60Co sources. Used for calculating absolute efficiency.
    'R-0793': {"date": 1180724400,  "activity": 38480, "halflife": 1.66372e+8, "lambda": 4.1653e-9},
    'R-0850': {"date": 1221505200,  "activity": 35350, "halflife": 1.66372e+8, "lambda": 4.1653e-9},
    'R-1105': {"date": 1462129200,  "activity": 38180, "halflife": 1.66372e+8, "lambda": 4.1653e-9}
  };
  dataStore.sourceInfo = {                                                  // Source information and settings
    '133Ba' : {"name": "Ba-133", "title": "133Ba", 'histoFileName' : '', "maxXValue": 2000,       // General source details
    "Config": {},         // Place to store the Calibrations from the Config file of this run
    "literaturePeaks": [ //53.16,
      // 79.61,     // 79 and 80keV are hard to fit. Omit to start with. Would be helpful for detemrining the turn-over point.
      80,        // This peak is the sum of 79 and 80keV - fit them as one.
      276.4,
      302.85,
      356.01,
      383.85 ],     // Peak energies from this source. Literature values taken from ENSDF.


      "literatureIntensity":    [ /*0.02141,*/ 0.32949, 0.07161, 0.18336, 0.62050, 0.08941 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
      "literatureIntensityUnc": [ /*0.00032,*/ 0.00326, 0.00049, 0.00125, 0.00190, 0.00062 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
      "peakWidth": 4,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
      "uncalibratedCentroids": [],
      "calibratedCentroids": [],
      "uncorrectedArea": [],
      "correctedArea": [],
      "FWHM": [],
      "FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
      "summingInCorrectionPeaks": [ //[[]],// An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak'
        [[]], // for 80keV
        [[53.16,223]],      // for 276keV. 79 and 80keV are hard to fit.
        [[223,79.61]],      // for 302keV. 79 and 80keV are hard to fit.
        [[276.4,79.61],[53.16,302.85]], // for 356keV
        [[302.85,80],[223,160]] ],   // for 383keV
        "summingInCorrectionCounts": [],  // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
        "summingOutCorrectionCounts": [], // An array of the counts found in the 180 degree coincidence matrix projection.
        "relativeEfficiency": [],            // Relative efficiency calculated for this peak energy
        "rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
        "normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
        "normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
        "normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
        "absoluteEfficiency": []             // Absolute efficiency calculated for this peak energy
      },
      '152Eu' : {"name": "Eu-152", "title": "152Eu", 'histoFileName' : '', "maxXValue": 2000,       // General source details
      "Config": {},         // Place to store the Calibrations from the Config file of this run
      "literaturePeaks": [ 121.8, 244.7, 344.3, 411.1, 778.9, 867.4, 964.0,
        //	 1085.8,  // for 1085.8 keV. Doublet is hard to fit, omit for now.
        //	 1089.7,  // for 1089.7 keV. Doublet is hard to fit, omit for now.
        1112.1,
        //	 1212.9,  // low statistics, omit for now.
        //	 1299.1,  // low statistics, omit for now.
        1408.0 ],     // Peak energies from this source. Literature values taken from ENSDF.
        "literatureIntensity":    [ 0.28531, 0.07549, 0.26590, 0.02237, 0.12928, 0.04228, 0.14510, 0.13667, 0.20868 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
        "literatureIntensityUnc": [ 0.00159, 0.00041, 0.00120, 0.00012, 0.00083, 0.00030, 0.00069, 0.00083, 0.00093 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
        "peakWidth": 4,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
        "uncalibratedCentroids": [],
        "calibratedCentroids": [],
        "uncorrectedArea": [],
        "correctedArea": [],
        "FWHM": [],
        "FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
        "summingInCorrectionPeaks": [ [[]],  [[]],  [[]],  [[]], // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak'
        [[367,411.1],[192,586]], // for 778.9 keV
        [[210,656],[148,719],[423,444]], // for 867.4 keV
        [[719,244.7],[401,562],[275,689]], // for 964.0 keV
        // [[964,121],[275,810]],           // for 1085.8 keV. Doublet is hard to fit, omit for now.
        //  [[678,411],[503,586],[324,764]], // for 1089.7 keV. Doublet is hard to fit, omit for now.
        [[867.4,244.7],[688,423],[210,901],[148,964.0]], // for 1112.1 keV
        //  [[768,444],[556,656],[538,674],[493,719],[345,867],[286,926],[207,1005]], // for 1212.9 keV. low statistics, omit for now.
        //  [[712,586],[534,764],[520,778],[328,970],[324,974],[209,1089]], // for 1299.1 keV. low statistics, omit for now.
        [[719,688],[566,841],[488,919],[443,964.0],[295,1112.1],[237,1170]] // for 1408.0 keV
      ],
      "summingInCorrectionCounts": [],  // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
      "summingOutCorrectionCounts": [], // An array of the counts found in the 180 degree coincidence matrix projection.
      "relativeEfficiency": [],            // Relative efficiency calculated for this peak energy
      "rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
      "normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
      "normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
      "normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
      "absoluteEfficiency": []             // Absolute efficiency calculated for this peak energy
    },
    '56Co' : {"name":  "Co-56", "title":  "56Co", 'histoFileName' : '', "maxXValue":4000,       // General source details
    "Config": {},         // Place to store the Calibrations from the Config file of this run
    "literaturePeaks": [ 846.76, 1037.84, 1175.1, 1238.29, 1360.21, 1771.35, 2034.76, 2598.46, 3009.56, 3201.95,
      3253.42,
      // 3272.99,
      3451.15,
      // 3548.27
    ],     // Peak energies from this source. Literature values taken from ENSDF.
    "literatureIntensity":    [ 0.14052, 0.02252, 0.66460, 0.04283, 0.15411, 0.03016, 0.07769, 0.16970, 0.03209, 0.07923, 0.01876, 0.00949, 0.00196 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
    "literatureIntensityUnc": [ 0.00040, 0.00006, 0.00120, 0.00012, 0.00060, 0.00012, 0.00028, 0.00040, 0.00012, 0.00021, 0.00002, 0.00005, 0.00002 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
    "peakWidth": 4,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
    "uncalibratedCentroids": [],
    "calibratedCentroids": [],
    "uncorrectedArea": [],
    "correctedArea": [],
    "FWHM": [],
    "FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
    "summingInCorrectionPeaks": [ [[]],  [[]],  [[]],  [[]], // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak'
    [[733,1037.84],[411,1360]], // for 1771.35 keV
    [[977,1037.84],[655,1360]], // for 2015.18 keV
    [[996,1037.84],[674,1360],[263,1771]], // for 2034.76 keV
    [[1360,1238],[787,1810]], // for 2598.46 keV
    [[1963,1238],[1088,2113]], // for 3201.95 keV
    [[2015.18,1238],[1442,1810],[1140,2113],[977,2276],[655,2598.46]], // for 3253.42 keV
    [[2034,1238],[1462,1810],[1159,2113],[996,2276],[674,2598.46],[263,3009]], // for 3272 keV
    [[2212,1238],[1640,1810],[1175.1,2276],[852,2598.46]], // for 3451.15 keV
    [[1271,2276]] // for 3548.27 keV
  ],
  "summingInCorrectionCounts": [],  // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [], // An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [],            // Relative efficiency calculated for this peak energy
  "normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
  "absoluteEfficiency": []             // Absolute efficiency calculated for this peak energy
},
'60Co' : {"name":  "Co-60", "title":  "60Co", 'histoFileName' : '', "maxXValue": 2000,       // General source details
"Config": {},         // Place to store the Calibrations from the Config file of this run
"literaturePeaks": [ 1173.23, 1332.49],     // Peak energies from this source. Literature values taken from ENSDF.
"literatureIntensity": [ 0.9985, 0.999826 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"literatureIntensityUnc": [ 0.0003, 0.000006 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"peakWidth": 4,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
"uncalibratedCentroids": [],
"calibratedCentroids": [],
"uncorrectedArea": [],
"correctedArea": [],
"FWHM": [],
"FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
"summingInCorrectionPeaks": [ [[]], [[]] ],   // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak'
"summingInCorrectionCounts": [],  // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
"summingOutCorrectionCounts": [], // An array of the counts found in the 180 degree coincidence matrix projection.
"rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
"relativeEfficiency": [],            // Relative efficiency calculated for this peak energy after summing corrections
"normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
"normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
"normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
"absoluteEfficiency": [],            // Absolute efficiency calculated for this peak energy after summing corrections
"sourceCalibration": {},             // NIST-certified calibration details for this source
"Midas": {},                          // Midas info of this historgram file; Title, StartTime, Duration
"timeSinceCertification": 0,         // time in seconds between the certification of the source activity and the start of the run
"sourceActivity": 0,                // source Activity in becquerels at the start of the run
"sourceTotalDecaysDuringThisRun": 0 // Total number of decays of this source during this run
},
'66Ga' : {"name": "66Ga", "title": "66Ga", 'histoFileName' : '', "maxXValue": 7000,       // General source details
"Config": {},         // Place to store the Calibrations from the Config file of this run
"literaturePeaks": [ 833.53, 1039.22, 1333.11, 1918.32, 2189.62, 2422.52, 2751.83, 3228.80, 3380.85, 4085.85, 4295.7, 4461.20, 4806.01 ],     // Peak energies from this source. Literature values taken from ENSDF.
"peakWidth": 4,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
"uncalibratedCentroids": [],
"calibratedCentroids": [],
"FWHM": []
},
'244Cm+13C' : {"name": "244Cm+13C", "title": "244Cm+13C", 'histoFileName' : '', "maxXValue": 7000,       // General source details
"Config": {},         // Place to store the Calibrations from the Config file of this run
"literaturePeaks": [ 6129.89 ],     // Peak energies from this source. Literature values taken from ENSDF.
"peakWidth": 4,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
"uncalibratedCentroids": [],
"calibratedCentroids": [],
"FWHM": []
}
};
dataStore.sourceInfoPACES = [
  {"name": "PACES",  "title": "PACES 207Bi", "lowEnergy":  74.97, "midEnergy":  481.69, "highEnergy":  975.65, "vhiEnergy": 1682.22, "maxXValue":2000 }
];

dataStore.THESEdetectors = [];                                    //10-char codes of all possible griffin/paces detectors. Contents based on detectorChoice
dataStore.THESEcalibrations = [];  // Array of objects to store together the cailbration data and results. 'detectorName':{ 'x'(pulseHeight centroids):[],'y'(literature energy):[],'residual':[],'fit':[quad,gain,offset,reduced-chi-squared]  }
dataStore.spectrumListSingles = {};                               // List of all the Singles Sum spectra
dataStore.spectrumListHits = {};                                  // List of all the Hitpattern spectra
dataStore.spectrumListOpp = {};                                   // List of all the 180degree coincidence matrices
dataStore.spectrumListProjections = {};                           // List of all projections from the 180degree coincidence matrices
dataStore.spectrumListProjectionsPeaks = {};                      // List of peaks to fit for each projection from the 180degree coincidence matrix
dataStore.progressBarNumberTasks = 0;                             // Total count of tasks (spectra to fetch, projections to make, peaks to fit) for use with the progress bar
dataStore.progressBarTasksCompleted =0;                           // Number of tasks completed so far for use with the progress bar

dataStore.cellIndex = dataStore.plots.length;

//resolution plot
dataStore._dataplot = [];                 // Place for all dataplot objects to be created as an array. This makes them indexable and iteratable
dataStore.dataplotData = [];                                       // place for dataplot data
dataStore.PlotDetails = {};
dataStore.PlotDetails = {
  'detectorEfficiencyCurve':{
    'plotID':0,                         // Used for the dataStore._dataplot[plotID]
    'equationParameters':[],            // Equation for a line to be plotted over data
    'plotInitData': [[0,0], [1,0], [2,0], [3,0], [4,0]], // initial data has to match number of series
    'Xdata': [],                        // X axis data points
    'Ydata': [],                        // Y axis data points
    'Y2data': [],                       // Y2 axis data points
    'YAxisMinValue': [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0]], // initial min values for each series,
    'YAxisMaxValue': [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0]], // initial max values for each series
    'annotations': [0,0],               // place for annotations
    'plotStyle' : {                     //dygraphs style object
      labels: ["Peak Energy (keV)", "Residual (keV)"],
      title: 'Energy residual in new calibration',
      axisLabelColor: '#FFFFFF',
      colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
      labelsDiv: 'detectorReportPlotLegend',
      drawPoints: 'true',
      connectSeparatedPoints: 'true',
      pointSize: '5',
      strokeWidth: '0',
      legend: 'always',
      axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
    }
  }
};
dataStore.plotStyle = [];
dataStore.plotStyle[0] = {                     //dygraphs style object
  labels: ["Peak Energy (keV)", "Residual (keV)"],
  title: 'Energy residual in new calibration',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'detectorReportPlotLegend',
  drawPoints: 'true',
  connectSeparatedPoints: 'true',
  pointSize: '5',
  strokeWidth: '0',
  legend: 'always',
  axes: { x: { valueRange: [0,10000] }, y : { valueRange: [0,10] } }
}
dataStore.efficiencyPlotDataKeyMap = ['Abs', 'Rel', '133Ba', '152Eu', '56Co', '60Co', '11Be'];
dataStore.efficiencyPlotEquationParameters = [[],[]];
dataStore.efficiencyPlotData = [];
dataStore.efficiencyPlotDataUnc = [[],[],[],[],[],[],[]]; // Y uncertainty values for drawing the error bars
dataStore.efficiencyPlotY2Data = [];
dataStore.efficiencyPlotY2Data[0] = [];
dataStore.efficiencyPlotY2Data[1] = [];
dataStore.efficiencyPlotXData = [];
dataStore.efficiencyPlotXData[0] = [];
dataStore.efficiencyPlotXData[1] = [];
dataStore.efficiencyPlotData[0] = [];    // Absolute efficiency
dataStore.efficiencyPlotData[1] = [];    // Relative efficiency
dataStore.efficiencyPlotData[2] = [];    // 133Ba only
dataStore.efficiencyPlotData[3] = [];    // 152Eu only
dataStore.efficiencyPlotData[4] = [];    // 56Co only
dataStore.efficiencyPlotData[5] = [];    // 60Co only
dataStore.efficiencyPlotData[6] = [];    // 11Be only
dataStore.plotInitData = [];
dataStore.plotInitData[0] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[1] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[2] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[3] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[4] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[5] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.plotInitData[6] = [[0,0], [1,0], [2,0], [3,0], [4,0]];      //initial dummy data
dataStore.YAxisMinValue = [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]];
dataStore.YAxisMaxValue = [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]];
dataStore.annotations = [0,0];


}
setupDataStore();

function setMidasDirectoryToHistos(){
  // Callback of GetURLArguments()
  // Here set the MIDAS file directory to match that set for the Histograms
  // This will then be used to fetch the run titles of midas files in this Directory
  // If the midas files are stored in the same directory as the histogram files then we will get titles.
  dataStore.midasFileDataDirectoryPath = dataStore.histoFileDirectoryPath;
}

function fetchCallback(){

  // If we have not recieved the histograms from all sources yet, request the histograms from the next source
  // Get the keys of all the different sources
  var keys = Object.keys(dataStore.sourceInfo);
  if(dataStore.currentSource != keys[keys.length-1]){
    var j=0;
    while(keys[j] != dataStore.currentSource){ j++; }
    j++;

    // update the progress bar
    dataStore.progressBarTasksCompleted++;
    document.getElementById('progress').setAttribute('style', 'width:' + (100*(dataStore.progressBarTasksCompleted / dataStore.progressBarNumberTasks)) + '%' );

    // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
    dataStore.currentSource = keys[j];
    dataStore.histoFileName = dataStore.sourceInfo[keys[j]].histoFileName;

    // Request spectra from the server
    dataStore._plotControl.refreshAll();
    return;
  }

  // We have all the histograms, we need to get the config file of each file to obtain the Calibrations
  // Request viewConfig from the server for the histrogram file of the first source
  // Set the dataStore.histoFileName to this source
  dataStore.currentSource = keys[0];
  dataStore.histoFileName = dataStore.sourceInfo[keys[0]].histoFileName;
  viewConfigOfHisto(dataStore.histoFileName);

}

function setupHistoListSelect(){
  // Remove the select if it already exists
  try{
    document.getElementById('HistoListSelect').remove();
    document.getElementById('HistoListSelectLabel').remove();
  }
  catch(err){ }

  var keys = Object.keys(dataStore.sourceInfo);

  // loop over all sources
  for(i=0; i<keys.length; i++){
    var thisTitle = dataStore.sourceInfo[keys[i]].title;

    // Add the title text
    var newLabel = document.createElement("label");
    newLabel.for = 'HistoListSelect'+thisTitle;
    newLabel.id = 'HistoListSelectLabel'+thisTitle;
    newLabel.innerHTML = thisTitle+' Histogram file: ';
    document.getElementById('histoChoice'+thisTitle).appendChild(newLabel);

    // Create a select input for the histo file list
    var newSelect = document.createElement("select");
    newSelect.id = 'HistoListSelect'+thisTitle;
    newSelect.name = 'HistoListSelect'+thisTitle;
    newSelect.style.width = '185px';
    newSelect.style.maxWidth = '185px';
    newSelect.onchange = function(){
      var thisKey = this.name.split('Select')[1];
      dataStore.sourceInfo[thisKey].histoFileName = this.value;
    }.bind(newSelect);
    document.getElementById('histoChoice'+thisTitle).appendChild(newSelect);

    // Add the list of histo files as the options
    thisSelect = document.getElementById('HistoListSelect'+thisTitle);
    thisSelect.add( new Option("Do not include "+thisTitle, "exclude") );
    for(var j=0; j<dataStore.histoFileList.length; j++){
      thisSelect.add( new Option(dataStore.histoFileList[j], dataStore.histoFileList[j]) );
    }

    // Fire the onchange event for the select with the default value to set it
    document.getElementById('HistoListSelect'+thisTitle).onchange();
  }

  // Create the Submit button
  newButton = document.createElement('button');
  newButton.setAttribute('id', 'submitHistoFilenameChoicesButton');
  newButton.setAttribute('class', 'btn btn-default btn-lg');
  newButton.innerHTML = "Perform Energy Calibrations";
  newButton.style.padding = '4px';
  newButton.onclick = function(){
    document.getElementById('progressDiv').classList.remove('hidden');
    submitHistoFilenameChoices();
  }.bind(newButton);
  document.getElementById('histoChoiceSubmit').appendChild(newButton);

}

function addTitlesToHistoListSelect(){

  var keys = Object.keys(dataStore.sourceInfo);

  // loop over all sources
  for(i=0; i<keys.length; i++){

    // Use the title of this source to get the option list of the select
    var thisTitle = dataStore.sourceInfo[keys[i]].title;
    numOptions = document.getElementById('HistoListSelect'+thisTitle).options.length;
    for(var j=0; j<numOptions; j++){

      var thisRunName = document.getElementById('HistoListSelect'+thisTitle).options[j].text.split(".")[0];

      // Find the details for this run
      var num = dataStore.midasRunList.map(function(e) { return e.RunName; }).indexOf(thisRunName);

      // Only add the run title if this run number was found in the run details list
      if(num>=0){
        document.getElementById('HistoListSelect'+thisTitle).options[j].text = thisRunName+'.tar, '+dataStore.midasRunList[num].RunTitle;
      }
    }
  }
}

function submitHistoFilenameChoices(){
  // this is the main setup and start of the automatic process.

  // TRIGGERING THIS FUNCTION SHOULD DISABLE CHANGING THE SELECTS
  var group = document.getElementsByTagName('select');
  for(var i=0; i<group.length; i++){
    group[i].disabled = true;
  }
  /*
  document.getElementById('HistoListSelect133Ba').disabled = true;
  document.getElementById('HistoListSelect152Eu').disabled = true;
  document.getElementById('HistoListSelect56Co').disabled = true;
  document.getElementById('HistoListSelect60Co').disabled = true;
  */
  document.getElementById('HistoDirectoryInput').disabled = true;
  document.getElementById('submitHistoFilenameChoicesButton').disabled = true;

  // Display the results menu and spectra
  document.getElementById("menu").classList.remove('hidden');
  document.getElementById(dataStore.buttonPages[0]).classList.remove('hidden');

  // setup the dataStore for this choice of detectorType
  var i, num=0, groups = [];

  // Get the keys of the different sources
  var keys = Object.keys(dataStore.sourceInfo);

  // Remove any sources that are set to exclude or empty
  for(i=0; i<keys.length; i++){
    if(dataStore.sourceInfo[keys[i]].histoFileName == "exclude" ||
    dataStore.sourceInfo[keys[i]].histoFileName.length<2){
      delete dataStore.sourceInfo[keys[i]];
      if(document.getElementById('efficiencyPlot'+keys[i])){
        document.getElementById('efficiencyPlot'+keys[i]).style.display = 'none';
      }
    }
  }

  // Get the keys of the different sources again as they may have changed
  var keys = Object.keys(dataStore.sourceInfo);

  // Add the file and config fetching as tasks to complete for the progress bar
  dataStore.progressBarNumberTasks += keys.length;

  // Save the lists of spectrum names to the dataStore for this detectorType
  if(dataStore.detectorType == 'HPGe'){
    // Set up GRIFFIN detectors

    var crystals = ["B","G","R","W"];
    var letter = ["A","B"];
    for(j=0; j<letter.length; j++){
      for(i=1; i<(dataStore.numberOfClovers+1); i++){
        for(k=0; k<4; k++){
          dataStore.THESEdetectors[num] = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];
          num++;
        }
      }
    }

    //generate the groups for plot selector
    // One group per crystal containing the different source spectra
    // HPGe A crystals first, then B crystals
    for(j=0; j<letter.length; j++){
      for(i=1; i<=(dataStore.numberOfClovers*4); i++){
        for(k=0; k<4; k++){
          let thisCrystalname = 'GRG'+alwaysThisLong(i, 2)+crystals[k]+'N00'+letter[j];

          let thesePlots = [];
          for(thisKey=0; thisKey<keys.length; thisKey++){
            // Generate the spectrum names of each source for this crystal
            thesePlots.push(
              {
                "plotID": dataStore.sourceInfo[keys[thisKey]].histoFileName.split('.')[0]+':'+thisCrystalname+"_Energy",
                "title": keys[thisKey]+":"+dataStore.sourceInfo[keys[thisKey]].histoFileName.split('.')[0]
              }
            );

          }

          // Push the group for this crystal
          groups.push({
            "groupID": thisCrystalname,
            "groupTitle": thisCrystalname,
            "plots": thesePlots
          });

        }
      }
    }

  }else if(dataStore.detectorType == 'PACES'){

  }

  dataStore.plotGroups = groups;     //groups to arrange detectors into for dropdowns

  // Generate the spectrum lists based on the list of detectors
  dataStore._plotListLite = new plotListLite('plotList');
  dataStore._plotListLite.setup();

  //user guidance
  deleteNode('histogramMessage');
  document.getElementById('downloadMessage').classList.remove('hidden');

  // Draw the search region
  dataStore.viewers[dataStore.plots[0]].plotData();

  // Plug in the active spectra names
  // Here we just need the names of the spectra that will be fetched for each run file.
  for(i=0; i<dataStore.THESEdetectors.length; i++){
    dataStore._plotControl.activeSpectra.push(dataStore.THESEdetectors[i]+"_Energy");
  }

  // Define the Regions of Interest for the full peak fitting based on the literature peaks for each source
  // dataStore.ROI[sourceKey][crystalIndex][peakIndex] = [low bin, high bin]
  var ROIwidth=6;
  for(thisKey=0; thisKey<keys.length; thisKey++){
    dataStore.ROI[keys[thisKey]] = [];
    for(i=0; i<dataStore.THESEdetectors.length; i++){
      dataStore.ROI[keys[thisKey]][i] = [];
      for(j=0; j<dataStore.sourceInfo[keys[thisKey]]['literaturePeaks'].length; j++){
        ROIwidth = typicalPeakWidth(dataStore.sourceInfo[keys[thisKey]].literaturePeaks[j],"HPGe")*3;
        dataStore.ROI[keys[thisKey]][i][j] = [parseInt(Math.floor(dataStore.sourceInfo[keys[thisKey]].literaturePeaks[j]) - ROIwidth), parseInt(Math.floor(dataStore.sourceInfo[keys[thisKey]].literaturePeaks[j]) + ROIwidth)];

        // Count the total number of peaks to fit for use in the progress bar
        dataStore.progressBarNumberTasks++;
      }
    }
  }

  // Collect the list of Literature energies from all sources
  var listOfLiteratureEnergies = [];
  for(thisKey=0; thisKey<keys.length; thisKey++){
    for(j=0; j<dataStore.sourceInfo[keys[thisKey]]['literaturePeaks'].length; j++){
      listOfLiteratureEnergies.push(dataStore.sourceInfo[keys[thisKey]].literaturePeaks[j]);
    }
  }
  // Sort the list of Literature peak energies
  listOfLiteratureEnergies.sort(function(a, b){return a-b});

  // Initialize the THESEcalibrations array of objects
  for(i=0; i<dataStore.THESEdetectors.length; i++){
    dataStore.THESEcalibrations[i] = {
      'name':dataStore.THESEdetectors[i],    //name of this detector
      'address':0,                           //address of this detector
      'xPH':[],                              //pulseHeight centroids
      'xEn':[],                              //Calibrated energy centroids (using newly determined coefficients)
      'y': listOfLiteratureEnergies,         //literature energies
      'residual':[],                         // difference of Energy centroid to literature energy
      'residualMean':0,                      // mean of the residuals
      'residualVar':0,                       // standard deviation of the residuals
      'fit':{'string':"",'quad':0, 'gain':0, 'offset':0,'r2':0}       // string is the equation, quad, gain, offset the coefficient, r2 the efficient of determination
    }
  }

  // Generate the Energy Calibrator detector report table
  dataStore._energyCalibratorReport = new energyCalibratorReport('energyCalibratorDetector','energyCalibratorResults');
  dataStore._energyCalibratorReport.setup();

  // Generate the residuals plot
  dataStore._dataplot[0] = new dataplot('detectorReportPlot',0);
  dataStore._dataplot[0].setup(0);

  // Hide the subpages. They need to be not hidden while the templates are injected.
  menuButtonClick(dataStore.buttonIDs[0],0);

  // Issue the request for the spectra of the first source.
  // The request for additional sources will be issued in the fetchCallback

  // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
  dataStore.currentSource = keys[0];
  dataStore.histoFileName = dataStore.sourceInfo[keys[0]].histoFileName;

  // Set the current task to keep track of our progress
  dataStore.currentTask = 'Fetching';

  // Request spectra from the server. This launches a series of promises. Once complete we end with fetchCallback.
  dataStore._plotControl.refreshAll();
}

function setOptionsForPeakRefitSelect(){

  // Set the current Source for this spectrum
  dataStore.currentSource = Object.keys(dataStore.sourceInfo).find(key => dataStore.sourceInfo[key].histoFileName.split('.')[0] === dataStore.currentPlot.split(':')[0]);

  // Set up the drop-down list of peaks available to refit
  thisSelect = document.getElementById('refitSelect');
  // Remove all options from the select
  thisSelect.removeAllChildren();

  // Loop through all peaks for this source
  for(var i=0; i<dataStore.sourceInfo[dataStore.currentSource].literaturePeaks.length; i++){
    //add this peak as an option to the refit select
    var newSelect = document.createElement("select");
    thisSelect.add( new Option("Peak "+i+", "+dataStore.sourceInfo[dataStore.currentSource].literaturePeaks[i]+"keV", i) );
  }
}

function updateAnalyzer(){

  // For the ODB it first grabs the PSB table and then sets values only for the channels that are defined there.
  // For the Analyzer we can get a similar list from the viewConfig command with the Histogram file as the argument.
  // That should probably be done for the building of the initial spectrum list for gain-matching if Histogram mode is selected.
  // Need to reformat the URLs generated here for the Analyzer

  // bail out if there's no fit yet
  if(Object.keys(dataStore.fitResults).length == 0)
  return;

  var  gain =[], offset = [], quad = [];
  var i, j=0, q, g, o, num=0, position, urls = [];

  //for every channel, update the quads, gains and offsets:
  urls[0]=dataStore.spectrumServer + '?cmd=setCalibration';
  for(i=0; i<dataStore.THESEdetectors.length; i++){
    if( document.getElementById(dataStore.THESEdetectors[i]+'write').checked){
      q = dataStore.fitResults[dataStore.THESEdetectors[i]+'_Pulse_Height'][4][2];
      q = isNumeric(q) ? q : 1;
      quad[i] = q;
      g = dataStore.fitResults[dataStore.THESEdetectors[i]+'_Pulse_Height'][4][1];
      g = isNumeric(g) ? g : 1;
      gain[i] = g;
      o = dataStore.fitResults[dataStore.THESEdetectors[i]+'_Pulse_Height'][4][0];
      o = isNumeric(o) ? o : 0;
      offset[i] = o;

      // Write a separate URL for each clover
      if(i>0 && (dataStore.THESEdetectors[i].includes('GRG')) && ((i%4) == 0)){ num++; j=0; urls[num]= dataStore.spectrumServer + '?cmd=setCalibration';}
      urls[num] += '&channelName'+j+'='+dataStore.THESEdetectors[i]+'&quad'+j+'='+quad[i]+'&gain'+j+'='+gain[i]+'&offset'+j+'='+offset[i];
      j++;

    }else{
      // Set some values rather than have these entries undefined for unchecked channels
      // Channels that did not produce good coefficients are not included in the URLs
      quad[i] = 1;
      gain[i] = 1;
      offset[i] = 0;
    }
  }

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

function updateODB(obj){

  //bail out if there's no fit yet
  if(Object.keys(dataStore.fitResults).length == 0)
  return;

  var channel = obj[0].chan,
  gain = obj[1].gain,
  offset = obj[2].offset,
  quad = obj[3].quadratic,
  i, q, g, o, position, urls = [];

  //for every channel, update the quads, gains and offsets:
  for(i=0; i<channel.length; i++){
    position = dataStore.THESEdetectors.indexOf(channel[i]);
    if( (position != -1) && (document.getElementById(channel[i]+'write').checked)){
      q = dataStore.fitResults[dataStore.THESEdetectors[position]+'_Pulse_Height'][4][2];
      q = isNumeric(q) ? q : 1;
      quad[i] = q;
      g = dataStore.fitResults[dataStore.THESEdetectors[position]+'_Pulse_Height'][4][1];
      g = isNumeric(g) ? g : 1;
      gain[i] = g;
      o = dataStore.fitResults[dataStore.THESEdetectors[position]+'_Pulse_Height'][4][0];
      o = isNumeric(o) ? o : 0;
      offset[i] = o;
    }
  }

  //turn gain and offset arrays into csv strings
  quad = JSON.stringify(quad).slice(1,-1)
  gain = JSON.stringify(gain).slice(1,-1)
  offset = JSON.stringify(offset).slice(1,-1)

  //construct urls to post to
  urls[0] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/quadratic[*]&value='+quad;
  urls[1] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/gain[*]&value='+gain;
  urls[2] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/offset[*]&value='+offset;

  //send requests
  for(i=0; i<urls.length; i++){
    XHR(urls[i],
      'check ODB - response rejected. This will happen despite successful ODB write if this app is served from anywhere other than the same host and port as MIDAS (ie, as a custom page).',
      function(){return 0},
      function(error){console.log(error)}
    )
  }

  //get rid of the modal
  document.getElementById('dismissODBmodal').click();
}


function buildCalfile(){
  console.log('Download initiated');

  // Write the Cal file
  CAL = '';

  for(var i=0; i<dataStore.THESEdetectors.length; i++){
    CAL += dataStore.THESEdetectors[i]+' { \n';
    CAL += 'Name:	'+dataStore.THESEdetectors[i]+'\n';
    CAL += 'Number:	'+i+'\n';
    CAL += 'Address:  0x'+dataStore.THESEcalibrations[i].address.toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
    CAL += 'Digitizer:	GRF16\n';
    CAL += 'EngCoeff:	'+dataStore.THESEcalibrations[i].fit.offset+' '+dataStore.THESEcalibrations[i].fit.gain+' '+dataStore.THESEcalibrations[i].fit.quad+'\n';

    CAL += 'Integration:	0\n';
    CAL += 'ENGChi2:	0\n';
    CAL += 'FileInt:	0\n';
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

function viewConfigOfHisto(histo){

  // Format check for the data file
  HistoFileDirectory = dataStore.histoFileDirectoryPath;
  if(HistoFileDirectory[HistoFileDirectory.length]!='/'){
    HistoFileDirectory += '/';
  }
  filename = HistoFileDirectory + histo;

  // get the config file from the server/ODB for this histogram
  url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
  XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForCalibrations, function(error){ErrorConnectingToAnalyzerServer(error)});

}

function processConfigFileForCalibrations(payload){

  // Unpack the response from the server into a local variable
  var thisConfig = JSON.parse(payload);

  var content = '';

  // We only care about the Calbrations in this app
  // Save the contents of the Config file for this Histogram file for this source
  dataStore.sourceInfo[dataStore.currentSource].Config = thisConfig.Analyzer[4].Calibrations;

  // If we have not recieved the config files from all runfiles yet, request the config from the next source
  // Get the keys of all the different sources
  var keys = Object.keys(dataStore.sourceInfo);
  if(dataStore.currentSource != keys[keys.length-1]){
    var j=0;
    while(keys[j] != dataStore.currentSource){ j++; }
    j++;

    // update the progress bar
    dataStore.progressBarTasksCompleted++;
    document.getElementById('progress').setAttribute('style', 'width:' + (100*(dataStore.progressBarTasksCompleted / dataStore.progressBarNumberTasks)) + '%' );

    // Set the dataStore.histoFileName to this source
    dataStore.currentSource = keys[j];
    dataStore.histoFileName = dataStore.sourceInfo[keys[j]].histoFileName;

    // Request viewConfig from the server for this histrogram file
    viewConfigOfHisto(dataStore.histoFileName);
    return;
  }

  // If we get to here than we have received all Config files from all sources.
  // Next launch the fitting.

  // change messages
  deleteNode('downloadMessage');
  document.getElementById('fittingSinglesMessage').classList.remove('hidden');

  // Populate the list of spectra to be fitted
  var spectrumKeys = Object.keys(dataStore.rawData);
  for(var i=0; i<spectrumKeys.length; i++){
    // List of all singles spectra to be fitted
    dataStore.spectrumListSingles[spectrumKeys[i]] = dataStore.rawData[spectrumKeys[i]];
  }

  // Set the current task to keep track of our progress
  dataStore.currentTask = 'SinglesFitting';

  // Start the whole fitting routine for singles peaks
  dataStore._energyCalibratorReport.fitAllSinglesPeaks();
}
