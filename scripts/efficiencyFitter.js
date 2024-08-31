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

var thisX=[0,5,10,15,20,25];
var thisY=[5,20,35,50,65,80];
var thisYerror=[2,2,2,0.2,0.2,0.2];

efficiencyRegression(thisX,thisY,thisYerror);


  var i, groups = [];

  dataStore = {};

  //network and raw data
  dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //host + port of analyzer server
  dataStore.ODBhost = 'http://grsmid00.triumf.ca:8081/';                  //MIDAS / ODB host + port

  // Histogram directory and filename
  dataStore.histoFileDirectoryPath = '/data3/S5020/Histograms';
  dataStore.histoFileName = '';
  dataStore.histoAutoLoad = false;        // Flag set by the presence of a directory and filename in the URL to automatically load it. Default is off.

  // Get the analyzer Server and ODB host names from the URL
  GetURLArguments();

  dataStore.numberOfClovers = 16;                                     // Default number of clovers is all of the array
  // shouldn't need to change anything below this line -----------------------------------------------------------------------

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
  dataStore.ROI = {};                                                     //regions of interest (singles) to look for peaks in: 'plotname': {'ROIupper':[low bin, high bin], 'ROIlower': [low bin, high bin]}
  dataStore.ROIprojections = {};                                        //regions of interest (projections) to look for peaks in: 'plotname': {'ROIupper':[low bin, high bin], 'ROIlower': [low bin, high bin]}
  dataStore.fitResults = {};                                            //fit results of singles: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]
  dataStore.fitResultsProjections = {};                                 //fit results of Projections: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]

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
  dataStore.sourceCalibration = {                                              // NIST-certification of 60Co sources. Used for calculating absolute efficiency.
    'R-0793': {"date": 1180724400,  "activity": 38480, "halflife": 1.66372e+8, "lambda": 4.1653e-9},
    'R-0850': {"date": 1221505200,  "activity": 35350, "halflife": 1.66372e+8, "lambda": 4.1653e-9},
    'R-1105': {"date": 1462129200,  "activity": 38180, "halflife": 1.66372e+8, "lambda": 4.1653e-9}
  };
  dataStore.sourceInfo = {                                                  // Source information and settings
    '133Ba' : {"name": "Ba-133", "title": "133Ba", 'histoFileName' : '', "maxXValue": 2000,       // General source details
    "literaturePeaks": [ //53.16,
      // 79.61,     // 79 and 80keV are hard to fit. Omit to start with. Would be helpful for detemrining the turn-over point.
      80,        // This peak is the sum of 79 and 80keV - fit them as one.
      276.4,
      302.85,
      356.01,
      383.85 ],     // Peak energies from this source. Literature values taken from ENSDF.

      "literatureIntensity":    [ /*0.02141,*/ 0.32949, 0.07161, 0.18336, 0.62050, 0.08941 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
      "literatureIntensityUnc": [ /*0.00032,*/ 0.00326, 0.00049, 0.00125, 0.00190, 0.00062 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
      "peakWidth": 3,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
      "ROIWidth": 10,                      // integer number of channels used for setting ROI limits. [centroid-peakWidth ... centroid+peakWidth]
      "uncalibratedCentroids": [],
      "calibratedCentroids": [],
      "uncorrectedArea": [],
      "uncorrectedAreaUnc": [],
      "correctedArea": [],
      "correctedAreaUnc": [],
      "FWHM": [],
      "FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
      "summingInCorrectionPeaks": [ //[[]],// An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
        [[]], // for 80keV
        [[53.16,223]],      // for 276keV. 79 and 80keV are hard to fit.
        [[223,79.61]],      // for 302keV. 79 and 80keV are hard to fit.
        [[276.4,79.61],[53.16,302.85]], // for 356keV
        [[302.85,80],[223,160]] ],   // for 383keV
        "summingInCorrectionCounts": [],  // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
        "summingInCorrectionCountsUnc": [],  // Uncertainty in An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
        "summingOutCorrectionCounts": [],    // An array of the counts found in the 180 degree coincidence matrix projection.
        "summingOutCorrectionCountsUnc": [], // Uncertainty in An array of the counts found in the 180 degree coincidence matrix projection.
        "rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
        "rawEfficiencyUnc": [],              // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections
        "relativeEfficiency": [],            // Relative efficiency calculated for this peak energy after summing corrections
        "relativeEfficiencyUnc": [],         // Uncertainty for relative efficiency calculated for this peak energy after summing corrections
        "normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
        "normalizedEfficiencyUnc": [],       // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
        "normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
        "normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
        "normalizationAbsFactor": 0,         // Normalization factor for the absolute efficiency curve of this source
        "absoluteEfficiency": [],            // Absolute efficiency calculated for this peak energy after summing corrections
        "absoluteEfficiencyUnc": [],         // Uncertainty for Absolute efficiency calculated for this peak energy after summing corrections
      },
      '152Eu' : {"name": "Eu-152", "title": "152Eu", 'histoFileName' : '', "maxXValue": 2000,       // General source details
      "literaturePeaks": [ 121.8, 244.7, 344.3, 411.1, 778.9, 867.4, 964.0,
        //	 1085.8,  // for 1085.8 keV. Doublet is hard to fit, omit for now.
        //	 1089.7,  // for 1089.7 keV. Doublet is hard to fit, omit for now.
        1112.1,
        //	 1212.9,  // low statistics, omit for now.
        //	 1299.1,  // low statistics, omit for now.
        1408.0 ],     // Peak energies from this source. Literature values taken from ENSDF.
        "literatureIntensity":    [ 0.28531, 0.07549, 0.26590, 0.02237, 0.12928, 0.04228, 0.14510, 0.13667, 0.20868 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
        "literatureIntensityUnc": [ 0.00159, 0.00041, 0.00120, 0.00012, 0.00083, 0.00030, 0.00069, 0.00083, 0.00093 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
        "peakWidth": 3,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
        "ROIWidth": 10,                      // integer number of channels used for setting ROI limits. [centroid-peakWidth ... centroid+peakWidth]
        "uncalibratedCentroids": [],
        "calibratedCentroids": [],
        "uncorrectedArea": [],
        "uncorrectedAreaUnc": [],
        "correctedArea": [],
        "correctedAreaUnc": [],
        "FWHM": [],
        "FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
        "summingInCorrectionPeaks": [ [[]],  [[]],  [[]],  [[]], // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
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
      "summingInCorrectionCountsUnc": [],  // Uncertainty in An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
      "summingOutCorrectionCounts": [],    // An array of the counts found in the 180 degree coincidence matrix projection.
      "summingOutCorrectionCountsUnc": [], // Uncertainty in An array of the counts found in the 180 degree coincidence matrix projection.
      "rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
      "rawEfficiencyUnc": [],              // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections
      "relativeEfficiency": [],            // Relative efficiency calculated for this peak energy after summing corrections
      "relativeEfficiencyUnc": [],         // Uncertainty for relative efficiency calculated for this peak energy after summing corrections
      "normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
      "normalizedEfficiencyUnc": [],       // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
      "normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
      "normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
      "normalizationAbsFactor": 0,         // Normalization factor for the absolute efficiency curve of this source
      "absoluteEfficiency": [],            // Absolute efficiency calculated for this peak energy after summing corrections
      "absoluteEfficiencyUnc": [],         // Uncertainty for Absolute efficiency calculated for this peak energy after summing corrections
    },
    '56Co' : {"name":  "Co-56", "title":  "56Co", 'histoFileName' : '', "maxXValue":4000,       // General source details
    "literaturePeaks": [ 846.76, 1037.84, 1175.1, 1238.29, 1360.21, 1771.35, 2015.18, 2034.76, 2598.46, 3201.95, 3253.42, 3272.99, 3451.15, 3548.27 ],     // Peak energies from this source. Literature values taken from ENSDF.
    "literatureIntensity":    [ 0.99940, 0.14052, 0.02252, 0.66460, 0.04283, 0.15411, 0.03016, 0.07769, 0.16970, 0.03209, 0.07923, 0.01876, 0.00949, 0.00196 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
    "literatureIntensityUnc": [ 0.00002, 0.00040, 0.00006, 0.00120, 0.00012, 0.00060, 0.00012, 0.00028, 0.00040, 0.00012, 0.00021, 0.00002, 0.00005, 0.00002 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
    "peakWidth": 3,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
    "ROIWidth": 10,                      // integer number of channels used for setting ROI limits. [centroid-peakWidth ... centroid+peakWidth]
    "uncalibratedCentroids": [],
    "calibratedCentroids": [],
    "uncorrectedArea": [],
    "uncorrectedAreaUnc": [],
    "correctedArea": [],
    "correctedAreaUnc": [],
    "FWHM": [],
    "FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
    "summingInCorrectionPeaks": [ [[]],  [[]],  [[]],  [[]],  [[]], // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
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
  "summingInCorrectionCountsUnc": [],  // Uncertainty in An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCounts": [],    // An array of the counts found in the 180 degree coincidence matrix projection.
  "summingOutCorrectionCountsUnc": [], // Uncertainty in An array of the counts found in the 180 degree coincidence matrix projection.
  "rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
  "rawEfficiencyUnc": [],              // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections
  "relativeEfficiency": [],            // Relative efficiency calculated for this peak energy after summing corrections
  "relativeEfficiencyUnc": [],         // Uncertainty for relative efficiency calculated for this peak energy after summing corrections
  "normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizedEfficiencyUnc": [],       // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
  "normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
  "normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
  "normalizationAbsFactor": 0,         // Normalization factor for the absolute efficiency curve of this source
  "absoluteEfficiency": [],            // Absolute efficiency calculated for this peak energy after summing corrections
  "absoluteEfficiencyUnc": [],         // Uncertainty for Absolute efficiency calculated for this peak energy after summing corrections
},
'11Be' : {"name":  "Be-11", "title":  "11Be", 'histoFileName' : '', "maxXValue":8100,       // General source details
"literaturePeaks": [ 2124.47, 2895.30, 4443.90, 4665.90, 5018.98, 5851.47, 6789.81, 7282.92, 7974.73 ],     // Peak energies from this source. Literature values taken from ENSDF.
"literatureIntensity":    [ 1.0, 0.144, 1.0, 0.285, 0.856, 0.532, 0.675, 0.870, 0.462 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"literatureIntensityUnc": [ 0.01, 0.006, 0.01, 0.011, 0.006, 0.012, 0.011, 0.020, 0.011 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"peakWidth":10,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
"ROIWidth": 20,                      // integer number of channels used for setting ROI limits. [centroid-peakWidth ... centroid+peakWidth]
"uncalibratedCentroids": [],
"calibratedCentroids": [],
"uncorrectedArea": [],
"uncorrectedAreaUnc": [],
"correctedArea": [],
"correctedAreaUnc": [],
"FWHM": [],
"FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
"summingInCorrectionPeaks": [ [[]],  [[]],  [[]],   // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
[[1771.31,2895.30]], // for 4665.90 keV
[[2895.30,2124.47]], // for 5018.98 keV
[[]],
[[4665.90,2124.47],[1771.31,5018.98]], // for 6789.81 keV
[[]],
[[5851.47,2124.47]] // for 5018.98 keV
],
"summingInCorrectionCounts": [],  // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
"summingOutCorrectionCounts": [], // An array of the counts found in the 180 degree coincidence matrix projection.
"summingInCorrectionCountsUnc": [],  // Uncertainty in An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
"summingOutCorrectionCounts": [],    // An array of the counts found in the 180 degree coincidence matrix projection.
"summingOutCorrectionCountsUnc": [], // Uncertainty in An array of the counts found in the 180 degree coincidence matrix projection.
"rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
"rawEfficiencyUnc": [],              // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections
"relativeEfficiency": [],            // Relative efficiency calculated for this peak energy after summing corrections
"relativeEfficiencyUnc": [],         // Uncertainty for relative efficiency calculated for this peak energy after summing corrections
"normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
"normalizedEfficiencyUnc": [],       // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
"normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
"normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
"normalizationAbsFactor": 0,         // Normalization factor for the absolute efficiency curve of this source
"absoluteEfficiency": [],            // Absolute efficiency calculated for this peak energy after summing corrections
"absoluteEfficiencyUnc": [],         // Uncertainty for Absolute efficiency calculated for this peak energy after summing corrections
},
'60Co' : {"name":  "Co-60", "title":  "60Co", 'histoFileName' : '', "maxXValue": 2000,       // General source details
"literaturePeaks": [ 1173.23, 1332.49],     // Peak energies from this source. Literature values taken from ENSDF.
"literatureIntensity": [ 0.9985, 0.999826 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"literatureIntensityUnc": [ 0.0003, 0.000006 ], // Peak intensities from this source. Literature values taken from ENSDF (gamma rays per 100 decays of the parent).
"peakWidth": 3,                     // integer number of channels used for gating. [centroid-peakWidth ... centroid+peakWidth]
"ROIWidth": 10,                      // integer number of channels used for setting ROI limits. [centroid-peakWidth ... centroid+peakWidth]
"uncalibratedCentroids": [],
"calibratedCentroids": [],
"uncorrectedArea": [],
"uncorrectedAreaUnc": [],
"correctedArea": [],
"correctedAreaUnc": [],
"FWHM": [],
"FCorrectionFactor": [],           // F factor determined from the number of active/inactive crystals which contribute to the 180 degree coincidence matrix
"summingInCorrectionPeaks": [ [[]], [[]] ],   // An array of arrays of literautre peak energies which need to be gated on and fit to obtain the summing-In correction for the corresponding (by index number) 'literaturePeak' [fit_energy,gate_energy]
"summingInCorrectionCounts": [],     // An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
"summingInCorrectionCountsUnc": [],  // Uncertainty in An array of arrays of the counts found in the peak in the 180 degree coincidence matrix projection.
"summingOutCorrectionCounts": [],    // An array of the counts found in the 180 degree coincidence matrix projection.
"summingOutCorrectionCountsUnc": [], // Uncertainty in An array of the counts found in the 180 degree coincidence matrix projection.
"rawEfficiency": [],                 // Relative efficiency calculated for this peak energy before summing corrections
"rawEfficiencyUnc": [],              // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections
"relativeEfficiency": [],            // Relative efficiency calculated for this peak energy after summing corrections
"relativeEfficiencyUnc": [],         // Uncertainty for relative efficiency calculated for this peak energy after summing corrections
"normalizedEfficiency": [],          // Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
"normalizedEfficiencyUnc": [],       // Uncertainty for Relative efficiency calculated for this peak energy before summing corrections, normalized to 152Eu
"normalizationFactorParameter": [],  // paremeters of the fitting used to determine the Normalization factor
"normalizationFactor": 0,            // Normalization factor for the relative efficiency curve of this source
"normalizationAbsFactor": 0,         // Normalization factor for the absolute efficiency curve of this source
"absoluteEfficiency": [],            // Absolute efficiency calculated for this peak energy after summing corrections
"absoluteEfficiencyUnc": [],         // Uncertainty for Absolute efficiency calculated for this peak energy after summing corrections
"sourceCalibration": {},             // NIST-certified calibration details for this source
"Midas": {},                          // Midas info of this historgram file; Title, StartTime, Duration
"timeSinceCertification": 0,         // time in seconds between the certification of the source activity and the start of the run
"sourceActivity": 0,                // source Activity in becquerels at the start of the run
"sourceTotalDecaysDuringThisRun": 0 // Total number of decays of this source during this run
}
};
dataStore.sourceInfoPACES = [
  {"name": "PACES",  "title": "PACES 207Bi", "lowEnergy":  74.97, "midEnergy":  481.69, "highEnergy":  975.65, "vhiEnergy": 1682.22, "maxXValue":2000 }
];

dataStore.THESEdetectors = [];                                    //10-char codes of all possible griffin/paces detectors. Contents based on detectorChoice
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
dataStore.plotStyle = [];
dataStore.plotStyle[0] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Absolute Efficiency"],
  title: 'Absolute Efficiency',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlotAbsLegend',
  drawPoints: true,
  underlayCallback: drawDygraphCanvasObjects,
  //connectSeparatedPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
}

dataStore.plotStyle[1] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Relative Efficiency"],
  title: 'Relative Efficiency (no summing corrections)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlotRelLegend',
  drawPoints: true,
  underlayCallback: drawDygraphCanvasObjects,
//  connectSeparatedPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  series: {
    'Relative Efficiency fit': {
      strokeWidth: 3,
      drawPoints: false,
      highlightCircleSize: 3
    }
  },
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
}
dataStore.plotStyle[2] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 133Ba (unnormalized, no summing corrections)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlot133BaLegend',
  drawPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
}

dataStore.plotStyle[3] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 152Eu (unnormalized, no summing corrections)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlot152EuLegend',
  drawPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
};

dataStore.plotStyle[4] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 56Co (unnormalized, no summing corrections)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlot56CoLegend',
  drawPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
}

dataStore.plotStyle[5] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 60Co (unnormalized, no summing corrections)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlot60CoLegend',
  drawPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
}

dataStore.plotStyle[6] = {                                              //dygraphs style object
  labels: ["Energy (keV)", "Efficiency (arbitary units)"],
  title: 'Efficiency - 11Be (unnormalized, no summing corrections)',
  axisLabelColor: '#FFFFFF',
  colors: ["#AAE66A", "#EFB2F0", "#B2D1F0", "#F0DBB2"],
  labelsDiv: 'efficiencyPlot60CoLegend',
  drawPoints: 'true',
//  customBars: true,
  pointSize: 5,
  highlightCircleSize: 7,
  strokeWidth: 0.0,
  legend: 'always',
  axes: {
    x: {
      valueRange: [0,10000]
    },

    y : {
      valueRange: [0,10]
    }
  }
}


}
setupDataStore();

function drawDygraphCanvasObjects(ctx, area, layout) {

    // Identify which graph this is
            if(layout.maindiv_.id.includes('Abs')){
              var thisPlotID = 0;
            }else if(layout.maindiv_.id.includes('Rel')){
              var thisPlotID = 1;
            }else{ console.log('Unrecognized Div for dygraph drawEfficiencyLine'); return;}

  // Bail out if there is no data yet
  if (typeof(dataStore._dataplot[thisPlotID].dygraph) == 'undefined') return;  // won't be set on the initial draw.
  if (dataStore.efficiencyPlotData.length<1) return;  // won't be set on the initial draw.
  if (dataStore.efficiencyPlotData[thisPlotID].length<1) return;  // won't be set on the initial draw.

    drawDygraphEfficiencyLine(thisPlotID, ctx, area, layout);
    drawDygraphErrorBars(thisPlotID, ctx, area, layout);
}

function drawDygraphEfficiencyLine(thisPlotID, ctx, area, layout) {
  console.log('drawLines');

  var range = [0,5000];
  var params = dataStore.efficiencyPlotEquationParameters[thisPlotID];
  var color = '#E67E22';
  var step = 1;
  //ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.0;

  var y1 = HPGeEfficiency(params, Math.log(parseFloat(range[0]/1000)));
  var p1 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(range[0], y1);
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(p1[0], p1[1]);
  for(i=range[0]+step; i<=range[1]; i+=step){
    // HPGeEfficiency() expects energy in MeV and the natural log.
    y1 = HPGeEfficiency(params, Math.log(parseFloat(i/1000)));
    var p1 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(i, y1);
    ctx.lineTo(p1[0], p1[1]);
  }
  ctx.stroke();
  //ctx.restore();
}

function drawDygraphErrorBars(thisPlotID, ctx, area, layout) {
  console.log('drawErrorBars');
  console.log(dataStore.efficiencyPlotXData[thisPlotID]);
  console.log(dataStore.efficiencyPlotData[thisPlotID]);
  console.log(dataStore.efficiencyPlotDataUnc[thisPlotID]);

  var range = [0,5000];
  var params = dataStore.efficiencyPlotEquationParameters[thisPlotID];
  var color = '#AAE66A';
  var step = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  for(i=0; i<dataStore.efficiencyPlotXData[thisPlotID].length; i++){
    x1 = dataStore.efficiencyPlotXData[thisPlotID][i];
    y1 = dataStore.efficiencyPlotData[thisPlotID][i] - dataStore.efficiencyPlotDataUnc[thisPlotID][i];
    y2 = dataStore.efficiencyPlotData[thisPlotID][i] + dataStore.efficiencyPlotDataUnc[thisPlotID][i];
  //  y1 = dataStore.efficiencyPlotData[thisPlotID][i] * 0.8;
//    y2 = dataStore.efficiencyPlotData[thisPlotID][i] *1.2;
    var p1 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(x1, y1);
    var p2 = dataStore._dataplot[thisPlotID].dygraph.toDomCoords(x1, y2);

    //ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    //ctx.restore();
  }

}

function fetchCallback(){
    console.log('fetchCallback');

    // If we have not recieved the histograms from all sources yet, request the histograms from the next source
    // Get the keys of all the different sources
    var keys = Object.keys(dataStore.sourceInfo);
    if(dataStore.currentSource != keys[keys.length-1]){
	var j=0;
	while(keys[j] != dataStore.currentSource){ j++; }
	j++;
	console.log('Next source in fetchCallback(): '+dataStore.sourceInfo[keys[j]].title);
  document.getElementById('progress').setAttribute('style', 'width:' + (5*(j+1)) + '%' );

	// Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
	dataStore.currentSource = keys[j];
	dataStore.histoFileName = dataStore.sourceInfo[keys[j]].histoFileName;

	// Request spectra from the server
	dataStore._plotControl.refreshAll();
	return;
    }
    document.getElementById('progress').setAttribute('style', 'width:' + (25) + '%' );
    console.log('I think I have all the spectra from all histogram files!');
    console.log(dataStore.rawData);
    console.log(dataStore.THESEdetectors);

    // change messages
    deleteNode('downloadMessage');
    document.getElementById('projectionsMessage').classList.remove('hidden');

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'Projections';

    // Now we have all the spectra received...

    // Revise the spectrum list to include the histogram names.
    dataStore.THESEdetectors =   [
	'Ge_Sum_Energy'
    ];

    var spectrumKeys = Object.keys(dataStore.rawData);
    for(i=0; i<spectrumKeys.length; i++){
	if(spectrumKeys[i].includes('Sum')){
	    // List of all singles spectra to be fitted
	    dataStore.spectrumListSingles[spectrumKeys[i]] = dataStore.rawData[spectrumKeys[i]];
	}

	if(spectrumKeys[i].includes('Hit')){
    // List of all Hitpattern spectra to be fitted
	    dataStore.spectrumListHits[spectrumKeys[i]] = dataStore.rawData[spectrumKeys[i]];
	}

	if(spectrumKeys[i].includes('oppo')){
    // List of all Hitpattern spectra to be fitted
	    dataStore.spectrumListOpp[spectrumKeys[i]] = dataStore.rawData[spectrumKeys[i]];
	}
    }

    console.log(spectrumKeys);
    console.log(dataStore.spectrumListSingles);
    console.log(dataStore.spectrumListHits);

    //show first plot for the first source
    dataStore.currentSource = keys[0];

    // Make the projections needed from each matrix
    projectAllMatrices();
}

function projectionsCallback(){
    console.log('projectionsCallback');

    console.log('Projections have been made so all spectra are ready for fitting.');
    console.log('Ready to fit all spectra');

    // change messages
    deleteNode('projectionsMessage');
    document.getElementById('fittingSinglesMessage').classList.remove('hidden');

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'SinglesFitting';

    // Start the whole fitting routine for singles peaks
    dataStore._efficiencyFitterReport.fitAllSinglesPeaks();
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
	thisTitle = dataStore.sourceInfo[keys[i]].title;

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
	newSelect.onchange = function(){
	   var thisKey = this.name.split('Select')[1];
	   dataStore.sourceInfo[thisKey].histoFileName = this.value;
	}.bind(newSelect);
	document.getElementById('histoChoice'+thisTitle).appendChild(newSelect);

	// Add the list of histo files as the options
	thisSelect = document.getElementById('HistoListSelect'+thisTitle);
	for(var j=0; j<dataStore.histoFileList.length; j++){
	    thisSelect.add( new Option(dataStore.histoFileList[j], dataStore.histoFileList[j]) );
	}

	// Fire the onchange event for the select with the default value to set it
	document.getElementById('HistoListSelect'+thisTitle).onchange();
    }

    // Create the input and select for the 60Co which defines the activity
	// Add the title text
	var newLabel = document.createElement("label");
	newLabel.for = 'SourceChoiceSelect60Co';
	newLabel.id = 'SourceChoiceSelect60CoLabel';
	newLabel.innerHTML = '60Co source: ';
	document.getElementById('sourceChoice60Co').appendChild(newLabel);

	// Create a select input for the 60Co source list
	var newSelect = document.createElement("select");
	newSelect.id = 'SourceChoiceSelect60Co';
	newSelect.name = 'SourceChoiceSelect60Co';
	newSelect.onchange = function(){
	    console.log('onchange of sourceSelect: '+this.value);
	    dataStore.sourceInfo['60Co'].sourceCalibration = dataStore.sourceCalibration[this.value];
	}.bind(newSelect);
	document.getElementById('sourceChoice60Co').appendChild(newSelect);

	// Add the list of histo files as the options
	thisSelect = document.getElementById('SourceChoiceSelect60Co');
        var keys = Object.keys(dataStore.sourceCalibration);
        for(i=0; i<keys.length; i++){
	    thisSelect.add( new Option(keys[i], keys[i]) );
	}

    // Fire the onchange event for the select with the default value to set it
    document.getElementById('SourceChoiceSelect60Co').onchange();


    // Create the Submit button
    newButton = document.createElement('button');
    newButton.setAttribute('id', 'submitHistoFilenameChoicesButton');
    newButton.setAttribute('class', 'btn btn-default btn-lg');
    newButton.innerHTML = "Build efficiency curve";
    newButton.style.padding = '4px';
    newButton.onclick = function(){
        document.getElementById('progressDiv').classList.remove('hidden');
	submitHistoFilenameChoices();
    }.bind(newButton);
      document.getElementById('histoChoiceSubmit').appendChild(newButton);

}

function submitHistoFilenameChoices(){
    // this is the main setup and start of the automatic process.

// TRIGGERING THIS FUNCTION SHOULD DISABLE CHANGING THE SELECTS
document.getElementById('HistoListSelect11Be').disabled = true;
document.getElementById('HistoListSelect133Ba').disabled = true;
document.getElementById('HistoListSelect152Eu').disabled = true;
document.getElementById('HistoListSelect56Co').disabled = true;
document.getElementById('HistoListSelect60Co').disabled = true;
document.getElementById('SourceChoiceSelect60Co').disabled = true;
document.getElementById('HistoDirectoryInput').disabled = true;
document.getElementById('submitHistoFilenameChoicesButton').disabled = true;

    // Get the config file for the 60Co histogram file in order to get the details for absolute efficiency
    // Format check for the data file
    var filename = dataStore.histoFileDirectoryPath;
    if(filename[filename.length]!='/'){
	filename += '/';
    }
    filename += dataStore.sourceInfo['60Co'].histoFileName;
    url = dataStore.spectrumServer + '/?cmd=viewConfig' + '&filename=' + filename;
    XHR(url, "Problem getting Config file for "+ filename +" from analyzer server", processConfigFileForRuntime, function(error){ErrorConnectingToAnalyzerServer(error)});


    // setup the dataStore for this choice of detectorType
    var i, num=0, groups = [];

    // Get the keys of the different sources
    var keys = Object.keys(dataStore.sourceInfo);

    // Save the lists of spectrum names to the dataStore for this detectorType
    if(dataStore.detectorType == 'HPGe'){
	// Set up GRIFFIN detectors

	//10-char codes of all possible griffin detectors.
	    dataStore.THESEdetectors =   [
		'Ge_Sum_Energy',
		'Hitpattern_Energy',
		'GGoppo'
    ];

	for(i=0; i<keys.length; i++){

	//generate groups for plot selector
        groups.push({
            "groupID": dataStore.sourceInfo[keys[i]].title,
            "groupTitle": dataStore.sourceInfo[keys[i]].title+':'+dataStore.sourceInfo[keys[i]].histoFileName.split('.')[0],
            "plots": [
                {
                    "plotID": dataStore.sourceInfo[keys[i]].histoFileName.split('.')[0]+':'+'Ge_Sum_Energy',
                    "title": 'Ge_Sum_Energy'
                }//,
               // {
               //     "plotID": dataStore.sourceInfo[keys[i]].histoFileName+':'+'Hitpattern_Energy',
              //      "title": 'Hitpattern_Energy'
              //  }
            ]
        })
    }

    }else if(dataStore.detectorType == 'PACES'){

}

    dataStore.plotGroups = groups;     //groups to arrange detectors into for dropdowns

    // Generate the spectrum lists based on the list of detectors
    dataStore._plotListLite = new plotListLite('plotList');
    dataStore._plotListLite.setup();

    // Generate the Efficiency Fitter report table
    dataStore._efficiencyFitterReport = new efficiencyFitterReport('efficiencyFitter');
    dataStore._efficiencyFitterReport.setup();

    //user guidance
    deleteNode('histogramMessage');
    document.getElementById('downloadMessage').classList.remove('hidden');

    // Draw the search region
    dataStore.viewers[dataStore.plots[0]].plotData();

    //plug in special fit controls
    // MIGHT not need refit buttons when using energy spectra??
    /*
    document.getElementById('fitLow').onclick = dataStore._efficiencyFitterReport.toggleFitMode;
    document.getElementById('fitMid').onclick = dataStore._efficiencyFitterReport.toggleFitMode;
    document.getElementById('fitHigh').onclick = dataStore._efficiencyFitterReport.toggleFitMode;
    document.getElementById('fitvHi').onclick = dataStore._efficiencyFitterReport.toggleFitMode;
    */

    // Plug in the active spectra names
    for(i=0; i<dataStore.THESEdetectors.length; i++){
            dataStore._plotControl.activeSpectra.push(dataStore.THESEdetectors[i]);
    }

    // Define the Regions of Interest for the full peak fitting based on the literature peaks for each source
    // dataStore.ROI[sourceKey][peakIndex] = [low bin, high bin]
    for(i=0; i<keys.length; i++){
	dataStore.ROI[keys[i]] = [];
	for(j=0; j<dataStore.sourceInfo[keys[i]]['literaturePeaks'].length; j++){
      var ROIwidth= dataStore.sourceInfo[keys[i]].literaturePeaks[j]*0.0028 + 4.434; // HPGe singles ROI width
	    dataStore.ROI[keys[i]][j] = [Math.floor(dataStore.sourceInfo[keys[i]].literaturePeaks[j] - ROIwidth), Math.ceil(dataStore.sourceInfo[keys[i]].literaturePeaks[j] + ROIwidth)];

	    // Count the total number of peaks to fit for use in the progress bar
	    dataStore.progressBarNumberTasks++;
	}
    }
    console.log(dataStore.ROI);

    // Issue the request for the spectra of the first source.
    // The request for additional sources will be issued in the fetchCallback
    console.log('First source in submitHistoFilenameChoices(): '+dataStore.sourceInfo[keys[0]].title);

    // Set the dataStore.histoFileName to this source so that constructQueries requests the correct spectrum
    dataStore.currentSource = keys[0];
    dataStore.histoFileName = dataStore.sourceInfo[keys[0]].histoFileName;

    // Set the current task to keep track of our progress
    dataStore.currentTask = 'Fetching';

    // Request spectra from the server. This launches a series of promises. Once complete we end with fetchCallback.
    dataStore._plotControl.refreshAll();
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

    // Write the Cal file content based on the list in the ODB and the fitted results
    CAL = '';

    for(i=0; i<dataStore.PSCchannels.length; i++){
        if(dataStore.PSCchannels[i].slice(0,3) == 'XXX'){ continue; }
       CAL += dataStore.PSCchannels[i]+' { \n';
       CAL += 'Name:	'+dataStore.PSCchannels[i]+'\n';
       CAL += 'Number:	'+i+'\n';
	CAL += 'Address:	0x'+dataStore.PSCaddresses[i].toString(16).toLocaleString(undefined, {minimumIntegerDigits: 2})+'\n';
       CAL += 'Digitizer:	GRF16\n';
        if(dataStore.PSCchannels[i].slice(0,3) == dataStore.THESEdetectors[0].slice(0,3)){
	CAL += 'EngCoeff:	'+dataStore.fitResults[dataStore.PSCchannels[i]+'_Pulse_Height'][4][0]+' '+dataStore.fitResults[dataStore.PSCchannels[i]+'_Pulse_Height'][4][1]+' '+dataStore.fitResults[dataStore.PSCchannels[i]+'_Pulse_Height'][4][2]+'\n';
	}else{
       CAL += 'EngCoeff:	0 1 0\n';
	}
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

function buildCSVfile(){
    console.log('Download initiated');
    var keys = Object.keys(dataStore.sourceInfo);

    // Write the table of results to a CSV file for download.
    CSV = '';

    CSV += 'GRIFFIN Efficiency Data\n\n';

    // List the run files used for this calibration
    for(i=0; i<keys.length; i++){
      currentSource = keys[i];
      CSV += keys[i] + ' runfile:,' + dataStore.sourceInfo[currentSource].histoFileName + '\n';
    }

    // Print the column titles
    CSV += '\nSource,';
    CSV += 'Peak Energy (keV),';
    CSV += 'Peak Intensity,';
    CSV += 'Peak Intensity Uncertainty,';
    CSV += 'FWHM (keV),';
    CSV += 'Raw Singles Area,';
    CSV += 'Raw Singles Area Uncertainty,';
    CSV += 'Summing-In Correction,';
    CSV += 'Summing-In Correction Uncertainty,';
    CSV += 'Summing-Out Correction,';
    CSV += 'Summing-Out Correction Uncertainty,';
    // F factor
    CSV += 'Corrected Area,';
    CSV += 'Corrected Area Uncertainty,';
    CSV += 'Normalization Factor (Rel),';
    CSV += 'Relative Efficiency,';
    CSV += 'Relative Efficiency Uncertainty,';
    CSV += 'Normalization Factor (Abs),';
    CSV += 'Absolute Efficiency,';
    CSV += 'Absolute Efficiency Uncertainty\n';

    // Loop through all peaks for all sources to provide the data
    for(i=0; i<keys.length; i++){
      currentSource = keys[i];
      for(currentPeak=0; currentPeak<dataStore.sourceInfo[currentSource]['literaturePeaks'].length; currentPeak++){

        if(currentPeak == 0){
          CSV += dataStore.sourceInfo[currentSource].title;
        }
        CSV += ',' + dataStore.sourceInfo[currentSource].literaturePeaks[currentPeak] + ',';
        CSV += dataStore.sourceInfo[currentSource].literatureIntensity[currentPeak]+','+dataStore.sourceInfo[currentSource].literatureIntensityUnc[currentPeak]+',';
        CSV += dataStore.sourceInfo[currentSource].FWHM[currentPeak] + ',';
        CSV += dataStore.sourceInfo[currentSource].uncorrectedArea[currentPeak]+','+dataStore.sourceInfo[currentSource].uncorrectedAreaUnc[currentPeak]+',';
        CSV += dataStore.sourceInfo[currentSource].summingInCorrectionCounts[currentPeak]+','+dataStore.sourceInfo[currentSource].summingInCorrectionCountsUnc[currentPeak]+',';
        CSV += dataStore.sourceInfo[currentSource].summingOutCorrectionCounts[currentPeak]+','+dataStore.sourceInfo[currentSource].summingOutCorrectionCountsUnc[currentPeak]+',';
        // F factor
        CSV += dataStore.sourceInfo[currentSource].correctedArea[currentPeak]+','+dataStore.sourceInfo[currentSource].correctedAreaUnc[currentPeak]+',';
        CSV += dataStore.sourceInfo[currentSource].normalizationFactor+',';
        CSV += dataStore.sourceInfo[currentSource].normalizedEfficiency[currentPeak]+','+dataStore.sourceInfo[currentSource].normalizedEfficiencyUnc[currentPeak]+',';
        CSV += dataStore.sourceInfo[currentSource].normalizationAbsFactor+',';
        CSV += dataStore.sourceInfo[currentSource].absoluteEfficiency[currentPeak]+','+dataStore.sourceInfo[currentSource].absoluteEfficiencyUnc[currentPeak]+'\n';

        }
     }

    // Define all the columns in a legend


    // Create a download link
    const textBlob = new Blob([CSV], {type: 'text/plain'});
    URL.revokeObjectURL(window.textBlobURL);
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(textBlob);
    downloadLink.download = document.getElementById('saveCSVname').value;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
}

function projectAllMatrices(){
            //make the projections for the matrix of each source based on the peaks defined.
            console.log(dataStore);

            // Change rawData to another list that is just the Opp spectrum
    var i,j,k, plotName, thisKey, oppKeys = Object.keys(dataStore.spectrumListOpp),
                buffer = dataStore.currentPlot //keep track of whatever was originally plotted so we can return to it

            releaser(
                function(i){
                    // Change rawData to another list that is just the Sum_Energy_ spectrum
                    var oppKeys = Object.keys(dataStore.spectrumListOpp);

		    // Identify the source from the histogram name in the spectrum title
		    dataStore.currentSource = Object.keys(dataStore.sourceInfo).find(key => dataStore.sourceInfo[key].histoFileName.split('.')[0] === oppKeys[i].split(':')[0])

		    // Set the details for this matrix and then unpack it
		    dataStore.activeMatrix = oppKeys[i];
			dataStore.raw2 = dataStore.rawData[oppKeys[i]].data2;
			dataStore.activeMatrixXaxisLength = dataStore.rawData[oppKeys[i]].XaxisLength;
			dataStore.activeMatrixYaxisLength = dataStore.rawData[oppKeys[i]].YaxisLength;
			dataStore.activeMatrixSymmetrized = dataStore.rawData[oppKeys[i]].symmetrized;
      dataStore.hm._raw = packZcompressed(dataStore.rawData[oppKeys[i]].data2,dataStore.activeMatrixXaxisLength,dataStore.activeMatrixYaxisLength,dataStore.activeMatrixZaxisMax,false);


		    // Loop through the making all the projections required for this source
		    for(j=0; j<dataStore.sourceInfo[dataStore.currentSource].literaturePeaks.length; j++){

      // Convenient to set the summing-in counts to zero here for all literature peaks
      dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionCounts[j] = 0;
      dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionCountsUnc[j] = 0;

      // Set limits for the projections
			console.log('Make projection for '+dataStore.sourceInfo[dataStore.currentSource].literaturePeaks[j]);
      var thisPeakWidth = dataStore.sourceInfo[dataStore.currentSource].literaturePeaks[j]*0.0014 + 2.2; // HPGe singles peak width
			min = Math.floor(dataStore.sourceInfo[dataStore.currentSource].literaturePeaks[j]-thisPeakWidth);
			max = Math.ceil(dataStore.sourceInfo[dataStore.currentSource].literaturePeaks[j]+thisPeakWidth);

			plotName = projectXaxis(min,max);
			console.log('Created '+plotName);
			// Add this projection to the rawData storage for plotting
			// Add this projection spectrum to the list which need to be fitted
			dataStore.rawData[plotName] = dataStore.createdSpectra[plotName];
			dataStore.spectrumListProjections[plotName] = dataStore.createdSpectra[plotName];
			dataStore.spectrumListProjectionsPeaks[plotName] = {
        'parentPeakId': j,
        'peaks': []
      };

			// Add this projection to the spectrum menu
			newMenuItem = document.createElement('li');
			newMenuItem.setAttribute('id', 'plotList'+plotName);
			newMenuItem.setAttribute('value', plotName);
			newMenuItem.setAttribute('class', 'list-group-item toggle');
			newMenuItem.innerHTML = plotName.split(':')[1].trim()+'<span id=\'plotListbadge'+plotName+'\' class=\"badge plotPresence hidden\">&#x2713;</span>';
			document.getElementById('plotListplots'+dataStore.currentSource).appendChild(newMenuItem);
			document.getElementById('plotList'+plotName).onclick = function(){ dataStore._plotListLite.exclusivePlot(this.id.split('plotList')[1], dataStore.viewers[dataStore.plots[0]]); }

			// The summing-out correction is the total number of counts in this 180 degree coincidence multiplied by the F factor.
			// The F factor is determined from the number of active crystals which contributed to this 180degree coincidence matrix.
			// F factor will be deduced from the Hittpattern for this source histrogram file.
			dataStore.sourceInfo[dataStore.currentSource].summingOutCorrectionCounts[j] = dataStore.createdSpectra[plotName].reduce((partialSum, a) => parseFloat(partialSum) + parseFloat(a), 0);
			dataStore.sourceInfo[dataStore.currentSource].summingOutCorrectionCountsUnc[j] = Math.ceil(Math.sqrt(dataStore.sourceInfo[dataStore.currentSource].summingOutCorrectionCounts[j]));

			// Build the list of peaks to be fitted for this projection spectrum - these contribute to the summing-in corrections.
			for(k=0; k<dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j].length; k++){
			    // This is an array of two peak energies. The first will be the peak energy to fit in the projection of the second energy.
			    // Check if this projection has been made yet and if not make it.
			    // Make a list of the peaks to fit for this projection name.
			    console.log('Process summingInCorrectionPeaks:');
			    console.log(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j]);
			    console.log(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][0].length);
			    if(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][0].length==0){ continue; }

			    if(dataStore.sourceInfo[dataStore.currentSource].literaturePeaks.indexOf(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][1])<0){
				// This peak is not a peak we are fitting as a single, so it does not have a projection spectrum yet.
				// Make it now, unless it has already been created

			console.log('Projections: This peak is not a literature peak, '+dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][1]);
      var thisPeakWidth = dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][1]*0.0014 + 2.2; // HPGe singles peak width
			min = Math.floor(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][1]-thisPeakWidth);
			max = Math.ceil(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][1]+thisPeakWidth);

			thisKey = dataStore.activeMatrix+'y-'+min+'-'+max;
				if(!(thisKey in dataStore.createdSpectra)){
				    console.log('This projection is not in createdSpectra so make it now');

			plotName = projectXaxis(min,max);
			console.log('Created '+plotName);
			// Add this projection to the rawData storage for plotting
			// Add this projection spectrum to the list which need to be fitted
			dataStore.rawData[plotName] = dataStore.createdSpectra[plotName];
			dataStore.spectrumListProjections[plotName] = dataStore.createdSpectra[plotName];
			dataStore.spectrumListProjectionsPeaks[plotName] = {
        'parentPeakId': j,
        'peaks': []
      };

			// Add this projection to the spectrum menu
			newMenuItem = document.createElement('li');
			newMenuItem.setAttribute('id', 'plotList'+plotName);
			newMenuItem.setAttribute('value', plotName);
			newMenuItem.setAttribute('class', 'list-group-item toggle');
			newMenuItem.innerHTML = plotName.split(':')[1].trim()+'<span id=\'plotListbadge'+plotName+'\' class=\"badge plotPresence hidden\">&#x2713;</span>';
			document.getElementById('plotListplots'+dataStore.currentSource).appendChild(newMenuItem);
			document.getElementById('plotList'+plotName).onclick = function(){ dataStore._plotListLite.exclusivePlot(this.id.split('plotList')[1], dataStore.viewers[dataStore.plots[0]]); }
			    }
			    }
			    // Add the peak to the list to fit in this projection spectrum
			    dataStore.spectrumListProjectionsPeaks[plotName].peaks.push(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][0]);
			    console.log('Save this peak '+dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][0]+' for the projection '+plotName);

			    // Count the total number of peaks to fit for use in the progress bar
			    dataStore.progressBarNumberTasks++;

			    // Save the ROI for projections so it can be used for drawing the fitlines
			    if(!dataStore.ROIprojections[plotName]) dataStore.ROIprojections[plotName] = [];
          var ROIwidth= dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][0]*0.0028 + 4.434; // HPGe singles ROI width
			    dataStore.ROIprojections[plotName].push([Math.floor(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][0]-ROIwidth),Math.ceil(dataStore.sourceInfo[dataStore.currentSource].summingInCorrectionPeaks[j][k][0]+ROIwidth)]);
			}
			console.log(dataStore.spectrumListProjectionsPeaks[plotName].peaks);

		    }
                }.bind(this),

                function(){
                    //leave the viewer pointing at the first spectrum for fitting
                    dispatcher({target: buffer}, 'fitAllComplete')
		    console.log('Completed all projections for all sources.');

		    projectionsCallback();
                }.bind(this),

                oppKeys.length-1
            )
        };


function processConfigFileForRuntime(payload){

	// Unpack the response from the server into a local variable
	console.log(payload);
    var thisConfig = JSON.parse(payload);
	console.log(thisConfig.Analyzer[6].Midas);

    // Unpack Midas content
    dataStore.sourceInfo['60Co'].Midas = {
	'Title': thisConfig.Analyzer[6].Midas[0].Value,
	'StartTime': thisConfig.Analyzer[6].Midas[1].Value,
	'Duration': thisConfig.Analyzer[6].Midas[2].Value,
    };

    // Calculate the time in seconds between the certification of the source activity and the run start
    dataStore.sourceInfo['60Co'].timeSinceCertification = dataStore.sourceInfo['60Co'].Midas.StartTime - dataStore.sourceInfo['60Co'].sourceCalibration.date;

    // Calculate the source activity at the time of the run start
    dataStore.sourceInfo['60Co'].sourceActivity = dataStore.sourceInfo['60Co'].sourceCalibration.activity * Math.exp(-1.0*dataStore.sourceInfo['60Co'].sourceCalibration.lambda*dataStore.sourceInfo['60Co'].timeSinceCertification);

    // Calculate the number of decays of this source during the full run duration
    dataStore.sourceInfo['60Co'].sourceTotalDecaysDuringThisRun = dataStore.sourceInfo['60Co'].sourceActivity * dataStore.sourceInfo['60Co'].Midas.Duration;
    dataStore.sourceInfo['60Co'].normalizationAbsFactor = 1.0/dataStore.sourceInfo['60Co'].sourceTotalDecaysDuringThisRun;

    console.log('Source activity at Run start:');
    console.log(dataStore.sourceInfo['60Co'].timeSinceCertification);
    console.log(dataStore.sourceInfo['60Co'].sourceActivity);
    console.log(dataStore.sourceInfo['60Co'].sourceTotalDecaysDuringThisRun);
    console.log(dataStore.sourceInfo['60Co'].normalizationFactor);
    console.log(dataStore);
}
