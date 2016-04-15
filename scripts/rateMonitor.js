////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore
    var i, labels = ['time']

    dataStore = {};
    dataStore.pageTitle = 'Rate Monitor'                                //header title
    dataStore.allClear = 0;                                             //counter to track when all templates are loaded
    dataStore.doUpdates = true;                                         //include update loop
    dataStore.plots = ['SUM_Singles_Energy'];                           //names of plotGrid cells and spectrumViewer objects
    dataStore.newCellListeners = ['plotControl'];
    dataStore.attachCellListeners = ['plotControl'];                    //ids to dispatch attachCell events to
    dataStore.dygraphListeners = ['rates'];                             //ids to dispatch all dygraph events to

    dataStore.manualBKG = {};                                           //string encodings of manual background ranges: 'a-b;c;d-e' indicates all bins on [a,b], plus c, plus [d,e]
    dataStore.rateData = [[new Date(),0,0,0,0,0,0,0,0]];                //dummy data to seed rate data collection
    dataStore.annotations = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.targetSpectrum = 'SUM_Singles_Energy';                    //analyzer key for spectrum to examine
    dataStore.spectrumServer = 'http://grsmid00.triumf.ca:9093/';       //host and port of analyzer
    dataStore.ODBrequests = ['http://grsmid00.triumf.ca:8081/?cmd=jcopy&odb0=/Equipment/Epics/Variables/MSRD&odb1=/Runinfo/Run number&encoding=json-p-nokeys&callback=parseScalars'];  //odb requests to make every update
    dataStore.scalars = {                                               //key:value pairs for scalrs to pull from odb
            'PC': 0,
            'LF1': 0,
            'LF2': 0
        }
    dataStore.currentSpectrum = [];                                     //latest polled spectrum, after background subtraction
    dataStore.oldSpectrum = [];                                         //previous bkg-subtracted spectrum
    dataStore.currentTime = null;                                       //in ms since epoch (current poll)
    dataStore.oldTime = null;                                           //ms since epoch (previous poll)
    dataStore.colors = [                                                //color palete to use
        "#AAE66A",
        "#EFB2F0",
        "#40DDF1",
        "#F1CB3C",
        "#FFFFFF",
        "#F22613",
        "#786FBC",
        "#619D48",
        "#AA5FC7",
        "#D35400"
    ]
    dataStore.defaults = {                                             
        'gammas':[                                                  //default parameters for gamma gates
            {
                'title': 'Gate 1',                                  //human readable name
                'min': 497,                                         //default minimum bin
                'max': 504,                                         //default maximum bin
                'onByDefault': true                                 //displayed by default?
            },
            {
                'title': 'Gate 2',
                'min': 197,
                'max': 204,
                'onByDefault': true
            },
            {
                'title': 'Gate 3',
                'min': 0,
                'max': 0,
                'onByDefault': false
            },
            {
                'title': 'Gate 4',
                'min': 0,
                'max': 0,
                'onByDefault': false
            },
            {
                'title': 'Gate 5',
                'min': 0,
                'max': 0,
                'onByDefault': false
            }  
        ],

        'levels':[
            {
                'title': 'Proton Current',                          //human readable name
                'lvlID': 'PC'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'Laser Freq. 1',
                'lvlID': 'LF1'
            },
            {
                'title': 'Laser Freq. 2',
                'lvlID': 'LF2'
            }
        ]
    }

    //annotate gamma objects
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        dataStore.defaults.gammas[i].index = i;
        dataStore.defaults.gammas[i].color = dataStore.colors[i%dataStore.colors.length];
    }

    //dygraph
    //construct plot labels
    for(i=0; i<dataStore.defaults.gammas.length; i++){
        labels.push(dataStore.defaults.gammas[i].title);
    }
    for(i=0; i<dataStore.defaults.levels.length; i++){
        labels.push(dataStore.defaults.levels[i].title)
    }

    dataStore.plotStyle = {                                             //dygraph plot style object
        labels: labels,
        title: 'Gate Integrals for ' + dataStore.targetSpectrum,
        colors: dataStore.colors,
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                }
            }
        },
        labelsDiv: 'ratesLegend',
        legend: 'always'
    };
    dataStore.plotInitData = [[new Date(),0,0,0,0,0,0,0,0]];            //dummy to initialize plot on
}
setupDataStore();

function fetchCallback(){
    //runs as callback after all data has been refreshed.

    var leadingEdge, windowWidth;

    //keep track of this histogram and the last one for calculating rates:
    if(dataStore.currentSpectrum){
        dataStore.oldSpectrum = JSON.parse(JSON.stringify(dataStore.currentSpectrum));
    }
    dataStore.currentSpectrum = JSON.parse(JSON.stringify(dataStore.viewers[dataStore.plots[0]].plotBuffer[dataStore.targetSpectrum]));

    //note that at run start, the oldSpectrum will still have the stale state of the spectrum in it from last run,
    //since the analyzer keeps broadcasting it; so, drop old spectrum on run change
    if(dataStore.scalars.run != dataStore.oldRun)
        dataStore.oldSpectrum = [];

    dataStore.oldTime = dataStore.currentTime;
    dataStore.currentTime = Date.now()/1000;

    //update the rate monitor and backgrounds fits
    leadingEdge = dataStore._rateSliders.windowLeadingEdgeTime() / 3;
    windowWidth = parseInt(document.getElementById('rateSlideswindowSlider').value,10);
    dataStore._rateControl.appendNewPoint();
    dataStore._rateControl.updateDygraph(leadingEdge, windowWidth);
    //redraw spectrum, fit results included
    dataStore.viewers[dataStore.plots[0]].plotData();
}

function parseScalars(scalars){
    //JSON-P wrapper for ODB fetch
    
    if(dataStore.scalars)
        dataStore.oldRun = dataStore.scalars.run

    dataStore.scalars = {
        'PC': scalars[0].MSRD[39],
        'LF1': scalars[0].MSRD[29],
        'LF2': scalars[0].MSRD[30],
        'run': scalars[1]['Run number']
    }
}