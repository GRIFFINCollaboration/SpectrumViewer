////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore

    var i, groups = [];

    dataStore = {}

    //network and raw data
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';           //host + port of analyzer server
    dataStore.ODBhost = 'http://grsmid00.triumf.ca:8081/';                  //MIDAS / ODB host + port

    // shouldn't need to change anything below this line -----------------------------------------------------------------------

    dataStore.pageTitle = 'Gain Matcher';                                   //header title
    dataStore.DAQquery = dataStore.ODBhost + '?cmd=jcopy&odb0=/DAQ/PSC/chan&encoding=json-p-nokeys&callback=loadData';
    dataStore.ODBrequests = [                                               //request strings for odb parameters
        dataStore.ODBhost + '?cmd=jcopy&odb0=/DAQ/PSC/chan&odb1=/DAQ/PSC/gain&odb2=/DAQ/PSC/offset&encoding=json-p-nokeys&callback=updateODB'
    ];
    dataStore.rawData = {};                                                 //buffer for raw spectrum data
    //fitting
    dataStore.ROI = {};                                                     //regions of interest to look for peaks in: 'plotname': {'ROIupper':[low bin, high bin], 'ROIlower': [low bin, high bin]}
    dataStore.fitResults = {};                                              //fit results: 'plotname': [[amplitude, center, width, intercept, slope], [amplitude, center, width, intercept, slope]]            
    //custom element config
    dataStore.plots = ['Spectra'];                                          //names of plotGrid cells and spectrumViewer objects
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
    dataStore.searchRegion = []                                         //[x_start, x_finish, y for peak search bar]

    dataStore.GRIFFINdetectors = [                                      //10-char codes of all possible griffin detectors.
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
            'GRG16WN00A',
            'GRG01BN00B',
            'GRG01GN00B',
            'GRG01RN00B',
            'GRG01WN00B',
            'GRG02BN00B',
            'GRG02GN00B',
            'GRG02RN00B',
            'GRG02WN00B',
            'GRG03BN00B',
            'GRG03GN00B',
            'GRG03RN00B',
            'GRG03WN00B',
            'GRG04BN00B',
            'GRG04GN00B',
            'GRG04RN00B',
            'GRG04WN00B',
            'GRG05BN00B',
            'GRG05GN00B',
            'GRG05RN00B',
            'GRG05WN00B',
            'GRG06BN00B',
            'GRG06GN00B',
            'GRG06RN00B',
            'GRG06WN00B',
            'GRG07BN00B',
            'GRG07GN00B',
            'GRG07RN00B',
            'GRG07WN00B',
            'GRG08BN00B',
            'GRG08GN00B',
            'GRG08RN00B',
            'GRG08WN00B',
            'GRG09BN00B',
            'GRG09GN00B',
            'GRG09RN00B',
            'GRG09WN00B',
            'GRG10BN00B',
            'GRG10GN00B',
            'GRG10RN00B',
            'GRG10WN00B',
            'GRG11BN00B',
            'GRG11GN00B',
            'GRG11RN00B',
            'GRG11WN00B',
            'GRG12BN00B',
            'GRG12GN00B',
            'GRG12RN00B',
            'GRG12WN00B',
            'GRG13BN00B',
            'GRG13GN00B',
            'GRG13RN00B',
            'GRG13WN00B',
            'GRG14BN00B',
            'GRG14GN00B',
            'GRG14RN00B',
            'GRG14WN00B',
            'GRG15BN00B',
            'GRG15GN00B',
            'GRG15RN00B',
            'GRG15WN00B',
            'GRG16BN00B',
            'GRG16GN00B',
            'GRG16RN00B',
            'GRG16WN00B'
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
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'BN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'BN00B'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'GN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'GN00B'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'RN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'RN00B'
                },
                {
                    "plotID": 'GRG' + alwaysThisLong(i, 2) + 'WN00B', 
                    "title": 'GRG' + alwaysThisLong(i, 2) + 'WN00B'
                }
            ]
        })
    }

    dataStore.plotGroups = groups;                                      //groups to arrange detectors into for dropdowns
    dataStore.cellIndex = dataStore.plots.length;
}
setupDataStore();

function fetchCallback(){
    // change messages
    deleteNode('waitMessage');
    document.getElementById('regionMessage').classList.remove('hidden');

    //show first plot
    dataStore._plotListLite.snapToTop();
}

function loadData(DAQ){
    // given the list of channels plugged into the DAQ from the ODB, load the appropriate spectra.

    var i,
        channels = DAQ[0].chan;

    for(i=0; i<channels.length; i++){
        if(channels[i].slice(0,3) == 'GRG')
            dataStore._plotControl.activeSpectra.push(channels[i] + '_Pulse_Height');
    }

    dataStore._plotControl.refreshAll();
}

function updateODB(obj){

    //bail out if there's no fit yet
    if(Object.keys(dataStore.fitResults).length == 0)
        return;

    var channel = obj[0].chan,
        gain = obj[1].gain,
        offset = obj[2].offset,
        i, g, o, position, urls = [];

    //for every griffin channel, update the gains and offsets:
    for(i=0; i<channel.length; i++){
        position = dataStore.GRIFFINdetectors.indexOf(channel[i]);
        if( (position != -1) && (document.getElementById(channel[i]+'write').checked)){
            g = dataStore.fitResults[dataStore.GRIFFINdetectors[position]+'_Pulse_Height'][2][1];
            g = isNumeric(g) ? g : 1;
            gain[i] = g;
            o = dataStore.fitResults[dataStore.GRIFFINdetectors[position]+'_Pulse_Height'][2][0];
            o = isNumeric(o) ? o : 0;
            offset[i] = o;
        }
    }

    //turn gain and offset arrays into csv strings
    gain = JSON.stringify(gain).slice(1,-1) 
    offset = JSON.stringify(offset).slice(1,-1) 

    //construct urls to post to
    urls[0] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/gain[*]&value='+gain;
    urls[1] = dataStore.ODBhost + '?cmd=jset&odb=DAQ/PSC/offset[*]&value='+offset;
    
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

function shiftclick(clickCoords){
    // callback for shift-click on plot - draw a horizontal line as the peak search region.
    // this == spectrumViewer object

    var buffer

    if(dataStore.searchRegion.length == 0){
        dataStore.searchRegion[0] = clickCoords.x;
        dataStore.searchRegion[2] = clickCoords.y;
    } else if (dataStore.searchRegion.length == 3){
        dataStore.searchRegion[1] = clickCoords.x;
        if(dataStore.searchRegion[0] > dataStore.searchRegion[1]){
            buffer = dataStore.searchRegion[0];
            dataStore.searchRegion[0] = dataStore.searchRegion[1];
            dataStore.searchRegion[1] = buffer;
        }
        this.addLine('searchRegion', dataStore.searchRegion[0], dataStore.searchRegion[2], dataStore.searchRegion[1], dataStore.searchRegion[2], '#00FFFF');
        this.plotData();

        //user guidance
        deleteNode('regionMessage');
        document.getElementById('pickerMessage').classList.remove('hidden');
        document.getElementById('fitAll').classList.remove('disabled');
    }
}
