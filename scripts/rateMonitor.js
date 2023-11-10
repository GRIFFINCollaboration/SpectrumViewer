////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    //sets up global variable datastore
    var i, labels = [];
    labels[0] = ['time'];
    labels[1] = ['time'];
    labels[2] = ['time'];
    labels[3] = ['time'];
    labels[4] = ['time'];
    labels[5] = ['time'];
    labels[6] = ['time'];

    dataStore = {};
    dataStore.plots = ['SUM_Singles_GeA_Energy'];                       //what plot will we be focusing on?
    dataStore.spectrumServer = 'http://grifstore1.triumf.ca:9093/';       //host and port of analyzer
    dataStore.ODBrequests = ['http://grifstore1.triumf.ca:8081/?cmd=jcopy&odb0=/Equipment/Epics/Variables/MSRD&odb1=/Runinfo/Run number&encoding=json-p-nokeys&callback=parseScalars'];  //odb requests to make every update

    //you probably don't need to change anything below this line----------------------------------------------------

    dataStore.pageTitle = 'Rate Monitor'                                //header title
    dataStore.allClear = 0;                                             //counter to track when all templates are loaded
    dataStore.doUpdates = true;                                         //include update loop
    dataStore.manualBKG = {};                                           //string encodings of manual background ranges: 'a-b;c;d-e' indicates all bins on [a,b], plus c, plus [d,e]
    dataStore.rateData = [];
    dataStore.rateData[0] = [[new Date(),0,0,0,0,0,0,0]];                //dummy data to seed rate data collection
    dataStore.rateData[1] = [[new Date(),5E-7,21]];                //dummy data to seed rate data collection
    dataStore.rateData[2] = [[new Date(),0,0]];                //dummy data to seed rate data collection
    dataStore.rateData[3] = [[new Date(),0,0]];                //dummy data to seed rate data collection
    dataStore.rateData[4] = [[new Date(),0,0]];                //dummy data to seed rate data collection
    dataStore.rateData[5] = [[new Date(),0,0]];                //dummy data to seed rate data collection
    dataStore.rateData[6] = [[new Date(),0,0]];                //dummy data to seed rate data collection
    dataStore.annotations = [];                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[0] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[1] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[2] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[3] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[4] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[5] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.annotations[6] = {};                                         //annotations queued up to add to the next dygraph point
    dataStore.targetSpectrum = dataStore.plots[0];                      //analyzer key for spectrum to examine
    dataStore.scalars = {  
        'HVac': 0,
        'RVac': 0,
        'PC': 0,
        'Kick': 0,
        'STemp': 0,
        'GRG': 0,
        'SEP': 0,
        'LBL': 0,
        'PAC': 0,
        'TAC': 0,
        'kByte': 0,
        'PSMQ': 0,
        'PSB': 0,
        'MSMQ': 0,
        'MSB': 0,
        'LF1': 0,
        'LF2': 0,
        'LF3': 0,
        'LF4': 0
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
    ];
 //   dataStore.Y1AxisMinValue = [0,1E-8,0,-6000,0,0,0];               //default Y axis limits - Min value for Y1 axis
 //   dataStore.Y1AxisMaxValue = [100,1E-6,25,6000,10000,5000,1000];     //default Y axis limits - Max value for Y1 axis
 //   dataStore.Y2AxisMinValue = [750,0,0,-6000,0,0,0];                //default Y axis limits - Min value for Y2 axis
 //   dataStore.Y2AxisMaxValue = [950,35,50,6000,5000,5000,10000];      //default Y axis limits - Max value for Y2 axis

    dataStore.YAxisMinValue = [  //default Y axis limits - for Y1 amd Y2 axis of each plot
	[0,750],                 // First entry is Y1 axis, second entry is Y2 axis for each plot
	[1E-8,0],
	[0,0],
	[-6000,-6000],
	[0,0],
	[0,0],
	[0,0]
    ];
    dataStore.YAxisMaxValue = [   //default Y axis limits - for Y1 amd Y2 axis of each plot
	[2000,950],                // First entry is Y1 axis, second entry is Y2 axis for each plot
	[5E-6,35],
	[25,8],
	[6000,6000],
	[70000,10000],
	[30000,8000],
	[3000,20000]
    ];



    
    dataStore.defaults = [];
    dataStore.defaults[0] = {                                             
        'gammas':[                                                  //default parameters for gamma gates
            {
                'title': 'Gate 1',                                  //human readable name
                'min': 139,                                         //default minimum bin
                'max': 146,                                         //default maximum bin
                'onByDefault': true                                 //displayed by default?
            },
            {
                'title': 'Gate 2',
                'min': 156,
                'max': 163,
                'onByDefault': true
            },
            {
                'title': 'Gate 3',
                'min': 53,
                'max': 59,
                'onByDefault': false
            } 
        ],

        'levels':[
            {
                'title': 'TRILIS Freq. 1',                          //human readable name
                'lvlID': 'LF1'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'TRILIS Freq. 2',
                'lvlID': 'LF2'
            },
            {
                'title': 'TRILIS Freq. 3',
                'lvlID': 'LF3'
            },
            {
                'title': 'TRILIS Freq. 4',
                'lvlID': 'LF4'
            }
        ]
    }
    dataStore.defaults[1] = {                                             
        'gammas':[],

        'levels':[
            {
                'title': 'GRIFFIN Chamber Vacuum',                  //human readable name
                'lvlID': 'HVac'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'Shack temperature (C)',
                'lvlID': 'STemp'
            }
        ]
    }
    dataStore.defaults[2] = {                                             
        'gammas':[],

        'levels':[
            {
                'title': 'Proton Current',                          //human readable name
                'lvlID': 'PC'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'Kicker Voltage (V)',
                'lvlID': 'Kick'
            }
        ]
    }
    dataStore.defaults[3] = {                                             
        'gammas':[],

        'levels':[
            {
                'title': 'Pre-Separator Field',                     //human readable name
                'lvlID': 'PSB'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'Mass-Separator Field',
                'lvlID': 'MSB'
            }
        ]
    }
    dataStore.defaults[4] = {                                             
        'gammas':[],

        'levels':[
            {
                'title': 'HPGe Array Rate LG (Hz)',                          //human readable name
                'lvlID': 'GRG'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'LaBr3 Array Rate (Hz)',
                'lvlID': 'LBL'
            }
        ]
    }
    dataStore.defaults[5] = {                                             
        'gammas':[],

        'levels':[
            {
                'title': 'Beta Array Rate (Hz)',                          //human readable name
                'lvlID': 'SEP'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'PACES Array Rate (Hz)',
                'lvlID': 'PAC'
            }
        ]
    }
    dataStore.defaults[6] = {                                             
        'gammas':[],

        'levels':[
            {
                'title': 'LaBr3 TAC Rate (Hz)',                          //human readable name
                'lvlID': 'TAC'                                       //key corresponding to dataStore.scalars
            },
            {
                'title': 'kBytes per sec',
                'lvlID': 'kByte'
            }
        ]
    }

    //annotate gamma objects
    for(i=0; i<dataStore.defaults[0].gammas.length; i++){
        dataStore.defaults[0].gammas[i].index = i;
        dataStore.defaults[0].gammas[i].color = dataStore.colors[i%dataStore.colors.length];
    }

    //dygraph
    //construct plot labels
    for(i=0; i<dataStore.defaults[0].gammas.length; i++){
        labels[0].push(dataStore.defaults[0].gammas[i].title);
    }
    for(j=0; j<dataStore.defaults.length; j++){
	for(i=0; i<dataStore.defaults[j].levels.length; i++){
            labels[j].push(dataStore.defaults[j].levels[i].title)
	}
    }

    dataStore.plotStyle = [];
    dataStore.plotStyle[0] = {                                             //dygraph plot style object for rates
        labels: labels[0],
        title: 'Gate Integrals for ' + dataStore.targetSpectrum,
	series: {
	    'TRILIS Freq. 1':{
		axis: 'y2'
	    },
	    'TRILIS Freq. 2':{
		axis: 'y2'
	    },
	    'TRILIS Freq. 3':{
		axis: 'y2'
	    },
	    'TRILIS Freq. 4':{
		axis: 'y2'
	    },
	},
        colors: dataStore.colors,
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
            y: {
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'ratesLegend',
        legend: 'always'
    };
    dataStore.plotStyle[1] = {                                             //dygraph plot style object for Infrarates
        labels: labels[1],
        title: 'GRIFFIN Vacuum and Shack',
	series: {
	    'Shack temperature (C)':{
		axis: 'y2'
	    },
	},
        colors: [ "#AAE66A", "#40DDF1" ],
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
	    y: {
                logscale : 'true',
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'InfraratesLegend',
        legend: 'always'
    };
    dataStore.plotStyle[2] = {                                             //dygraph plot style object for ISACrates
        labels: labels[2],
        title: 'Proton beam and Beam kicker',
	series: {
	    'Kicker Voltage (V)':{
		axis: 'y2'
	    },
	},
        colors: [ "#DA1D0B", "#786FBC" ],
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
            y: {
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'ISACratesLegend',
        legend: 'always'
    };
    dataStore.plotStyle[3] = {                                             //dygraph plot style object for SEPrates
        labels: labels[3],
        title: 'Mass separators',
	series: {
	    'Mass-Separator Field':{
		axis: 'y2'
	    },
	},
        colors: dataStore.colors,
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
            y: {
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'SEPratesLegend',
        legend: 'always'
    };
    dataStore.plotStyle[4] = {                                             //dygraph plot style object for SEPrates
        labels: labels[4],
        title: 'Gamma Hit rates',
	series: {
	    'LaBr3 Array Rate (Hz)':{
		axis: 'y2'
	    },
	},
        colors: dataStore.colors,
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
            y: {
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'PhotonratesLegend',
        legend: 'always'
    };
    dataStore.plotStyle[5] = {                                             //dygraph plot style object for SEPrates
        labels: labels[5],
        title: 'Charged-particle Hit rates',
	series: {
	    'PACES Array Rate (Hz)':{
		axis: 'y2'
	    },
	},
        colors: [ "#F1CB3C", "#619D48" ],
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
            y: {
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'ChargedratesLegend',
        legend: 'always'
    };
    dataStore.plotStyle[6] = {                                             //dygraph plot style object for SEPrates
        labels: labels[6],
        title: 'TACs and total data rate',
	series: {
	    'kBytes per sec':{
		axis: 'y2'
	    },
	},
        colors: [ "#D35400", "#FFFFFF" ],
        axisLabelColor: '#FFFFFF',
        axes: {
            x: {
                axisLabelFormatter: function(Date, granularity, opts, dygraph){
                    return alwaysThisLong(Date.getHours(), 2) + ':' + alwaysThisLong(Date.getMinutes(), 2) + ':' + alwaysThisLong(Date.getSeconds(), 2)
                },
            y: {
                drawGrid: 'true',
                independentTicks: 'true'
               },
            y2: {
                drawGrid: 'true',
                independentTicks: 'true'
                },
            }
        },
        labelsDiv: 'OtherratesLegend',
        legend: 'always'
    };
    dataStore.plotInitData = [];
    dataStore.plotInitData[0] = [[new Date(),0,0,0,0,0,0,0]];            //dummy to initialize plot on
    dataStore.plotInitData[1] = [[new Date(),5E-7,21]];            //dummy to initialize plot on
    dataStore.plotInitData[2] = [[new Date(),0,0]];            //dummy to initialize plot on
    dataStore.plotInitData[3] = [[new Date(),0,0]];            //dummy to initialize plot on
    dataStore.plotInitData[4] = [[new Date(),0,0]];            //dummy to initialize plot on
    dataStore.plotInitData[5] = [[new Date(),0,0]];            //dummy to initialize plot on
    dataStore.plotInitData[6] = [[new Date(),0,0]];            //dummy to initialize plot on
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
    leadingEdge = dataStore._striptoolSliders.windowLeadingEdgeTime() / 3;
    windowWidth = parseInt(document.getElementById('rateSlideswindowSlider').value,10);
    dataStore._rateControl.appendNewPoint();
    dataStore._rateControl.updateDygraph(leadingEdge, windowWidth);
    //update the static dygraph data and plots
    updateScalerData();
    updateStaticDygraphs(leadingEdge, windowWidth);
    //redraw spectrum, fit results included
    dataStore.viewers[dataStore.plots[0]].plotData();
}

function parseScalars(scalars){
    //JSON-P wrapper for ODB fetch
    
    if(dataStore.scalars)
        dataStore.oldRun = dataStore.scalars.run

    dataStore.scalars = {
        'HVac': scalars[0].MSRD[38],
        'RVac': scalars[0].MSRD[37],
        'PC': scalars[0].MSRD[39],
        'Kick': scalars[0].MSRD[27],
        'STemp': scalars[0].MSRD[24],
        'GRG': scalars[0].MSRD[0],
        'SEP': scalars[0].MSRD[1],
        'LBL': scalars[0].MSRD[2],
        'PAC': scalars[0].MSRD[3],
        'TAC': scalars[0].MSRD[11],
        'kByte': scalars[0].MSRD[18],
        'PSMQ': scalars[0].MSRD[20],
        'PSB': scalars[0].MSRD[21],
        'MSMQ': scalars[0].MSRD[22],
        'MSB': scalars[0].MSRD[23],
        'LF1': scalars[0].MSRD[29],
        'LF2': scalars[0].MSRD[30],
        'LF3': scalars[0].MSRD[31],
        'LF4': scalars[0].MSRD[32],
        'run': scalars[1]['Run number']
    }
}

function updateScalerData(){
    // Update the scalar data used for the static dygraphs
    // The scalar data for the rates dygrpah is done in rateControl along with the gamma gates

    var i, j, levels = [];

    // Loop through the plots
    for(j=1; j<dataStore.defaults.length; j++){
        // Reset the levels data between plots
	levels = [];
	
	//add on levels data
        for(i=0; i<dataStore.defaults[j].levels.length; i++){
            levels.push( parseFloat(dataStore.scalars[dataStore.defaults[j].levels[i].lvlID]) );
        }
	
	//update data history
	dataStore.rateData[j].push( [new Date()].concat(levels) );
	
	//Protect against keeping the initial zero values at the start because this makes the y scaling very annoying
	if(dataStore.rateData[j].length == 3){
	    dataStore.rateData[j][0] = dataStore.rateData[j][1] = dataStore.rateData[j][2];
	}
    }
    
}

function updateStaticDygraphs(leadingEdge, windowWidth){
    //decide how many points to keep from the history, and plot.
    //<leadingEdge>: number; as returned by rateSlider.windowLeadingEdgeTime
    //<windowWidth>: number; in minutes
    
    var i, period, data, annotations, keys
    
    //extract the appropriate tail of the data history
    period = windowWidth * 60 // in seconds
    period = Math.ceil(period/3); //this many points to keep at the end, 3 seconds per point
    
    for(j=1; j<dataStore.rateData.length; j++){
	data = dataStore.rateData[j].slice(Math.max(0,dataStore.rateData[j].length - period - leadingEdge), Math.max(0,dataStore.rateData[j].length - leadingEdge));
	
	//update the dygraph
	dispatcher({ 'data': data }, 'updateDyData'+j)
    }
}
