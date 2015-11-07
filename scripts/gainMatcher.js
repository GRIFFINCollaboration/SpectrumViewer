////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore

    var i, groups = [];

    dataStore = {}
    //network and raw data
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //base url + port of analyzer server
    dataStore.ODBrequests = [];                                             //request strings for odb parameters
    dataStore.rawData = {};                                                 //buffer for raw spectrum data
    //fitting
    dataStore.ROI = {};                                                     //regions of interest to look for peaks in: 'plotname': {'ROIupper':[low bin, high bin], 'ROIlower': [low bin, high bin]}
    dataStore.fitResults = {};                                              //fit results: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]            
    //custom element config
    dataStore.plots = ['Spectra'];                                          //names of x-plots cells and spectrumViewer objects
    dataStore.attachCellListeners = ['plotControl'];                        //ids to dispatch attachCell events to
    dataStore.fitAllCompleteListeners = ['plotList'];                       //ids to dispatch fitAllComplete events to
    dataStore.dygraphUpdateListeners = ['resolution'];                      //ids to dispatch dygraphUpdate events to
    //resolution plot
    dataStore.plotStyle = {                                                 //dygraphs style object
        labels: ['channel', 'Low Energy Peak', 'High Energy Peak'],
        title: 'Per-Crystal Resolution',
        axisLabelColor: '#FFFFFF',
        colors: ["#AAE66A", "#EFB2F0"],
        labelsDiv: 'resolutionLegend',
        legend: 'always',
        valueFormatter: function(num, opts, seriesName, dygraph, row, col){

            if(col == 0)
                return dataStore.GRIFFINdetectors[num]
            else
                return num.toFixed(3)
        },
        axes: {
            x: {
                axisLabelFormatter: function(number, granularity, opts, dygraph){
                    if(number < dataStore.GRIFFINdetectors.length)
                        return dataStore.GRIFFINdetectors[number].slice(3,6);
                    else
                        return number
                    
                }
            }
        }
    }
    dataStore.plotInitData = [[0,0,0], [1,0,0], [2,0,0], [3,0,0]];      //initial dummy data
    dataStore.resolutionData = [];                                      //dygraphs-sorted peak widths for both peaks, in same order as GRIFFINdetectors: [[detectorIndex, low peak width, high peak width], ...]
    dataStore.lowPeakResolution = [];                                   //low energy peak resolutions, indexed per GRIFFINdetectors
    dataStore.lowPeakResolution.fill(0,64);                             //start with zeroes
    dataStore.highPeakResolution = [];                                  //as lowPeakResolution
    dataStore.highPeakResolution.fill(0,64);                            //start with zeroes

    dataStore.GRIFFINdetectors = [                                      //10-char codes of griffin detectors, in order.
            'GRG01BN00A',
            'GRG01GN00A',
            'GRG01RN00A',
            'GRG01WN00A',
            'GRG02BN00A',
            'GRG02GN00A',
            'GRG02RN00A',
            'GRG02WN00A',
            'GRG03BN00A',
            'GRG03GN00A',
            'GRG03RN00A',
            'GRG03WN00A',
            'GRG04BN00A',
            'GRG04GN00A',
            'GRG04RN00A',
            'GRG04WN00A',
            'GRG05BN00A',
            'GRG05GN00A',
            'GRG05RN00A',
            'GRG05WN00A',
            'GRG06BN00A',
            'GRG06GN00A',
            'GRG06RN00A',
            'GRG06WN00A',
            'GRG07BN00A',
            'GRG07GN00A',
            'GRG07RN00A',
            'GRG07WN00A',
            'GRG08BN00A',
            'GRG08GN00A',
            'GRG08RN00A',
            'GRG08WN00A',
            'GRG09BN00A',
            'GRG09GN00A',
            'GRG09RN00A',
            'GRG09WN00A',
            'GRG10BN00A',
            'GRG10GN00A',
            'GRG10RN00A',
            'GRG10WN00A',
            'GRG11BN00A',
            'GRG11GN00A',
            'GRG11RN00A',
            'GRG11WN00A',
            'GRG12BN00A',
            'GRG12GN00A',
            'GRG12RN00A',
            'GRG12WN00A',
            'GRG13BN00A',
            'GRG13GN00A',
            'GRG13RN00A',
            'GRG13WN00A',
            'GRG14BN00A',
            'GRG14GN00A',
            'GRG14RN00A',
            'GRG14WN00A',
            'GRG15BN00A',
            'GRG15GN00A',
            'GRG15RN00A',
            'GRG15WN00A',
            'GRG16BN00A',
            'GRG16GN00A',
            'GRG16RN00A',
            'GRG16WN00A'
        ];

    //generate groups for plot selector
    for(i=1; i<17; i++){
        groups.push({
            "groupID": 'GRG' + alwaysThisLong(i, 2),
            "groupTitle": 'GRIFFIN ' + alwaysThisLong(i, 2),
            "plots": [
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'BN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'BN00A'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'GN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'GN00A'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'RN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'RN00A'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'WN00A', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'WN00A'
                }
            ]
        })
    }

    dataStore.plotGroups = groups;                                      //groups to arrange detectors into for dropdowns
    dataStore.cellIndex = dataStore.plots.length;
}
setupDataStore();