////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    var i,j
    var griffinQuads = ['B', 'G', 'R', 'W'];
    var griffinCodes = []
    var sceptarCodes = []
    var descantCodes = []

    //generate GRIFFFIN detector nomenclature codes
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            griffinCodes.push('GRG' + alwaysThisLong(i,2) + griffinQuads[j] + 'N00A');
        }
    }

    //generate SCEPTAR detector nomenclature codes
    for(i=1; i<21; i++){
        sceptarCodes.push('SEP' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate DESCANT detector nomenclature codes
    for(i=1; i<71; i++){
        descantCodes.push('DSC' + alwaysThisLong(i,2) + 'XN00X');
    }

    //declare top level groups
    var topGroups = [
        {
            "name": "Hit Patterns & Sums",
            "id": "hitsAndSums",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Hit Patterns",
                    "id": "hits",
                    "items": [
                        'HITPATTERN_Energy',
                        'HITPATTERN_Time',
                        'HITPATTERN_Waveform',
                        'HITPATTERN_Pulse_Height',
                        'HITPATTERN_Rate'
                    ]
                },
                {
                    "subname": "Sum Spectra",
                    "id": "sums",
                    "items": [
                        'SUM_Singles_Energy',
                        'SUM_Addback_Energy'
                    ]
                }
            ]
        },

        {
            "name": "GRIFFIN",
            "id": "GRIFFIN",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "GRGenergy",
                    "items": griffinCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "GRGtime",
                    "items": griffinCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "GRGpulseHeight",
                    "items": griffinCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "GRGwaveform",
                    "items": griffinCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "SCEPTAR",
            "id": "SCEPTAR",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "SEPenergy",
                    "items": sceptarCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "SEPtime",
                    "items": sceptarCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "SEPpulseHeight",
                    "items": sceptarCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "SEPwaveform",
                    "items": sceptarCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "DESCANT",
            "id": "DESCANT",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "DSCenergy",
                    "items": descantCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "DSCtime",
                    "items": descantCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "DSCpulseHeight",
                    "items": descantCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "DSCwaveform",
                    "items": descantCodes.map(function(c){return c + '_Waveform'})
                },
                {
                    "subname": "Zero Crossing",
                    "id": "DSCzero",
                    "items": descantCodes.map(function(c){return c + '_Zero_Crossing'})
                },
                {
                    "subname": "Long Integration",
                    "id": "DSClongInt",
                    "items": descantCodes.map(function(c){return c + '_Long_Integration'})
                },
                {
                    "subname": "Short Integration",
                    "id": "DSCshortInt",
                    "items": descantCodes.map(function(c){return c + '_Short_Integration'})
                }
            ]
        }
    ]

    dataStore = {
        "pageTitle": 'Spectrum Viewer',                             //header title
        "topGroups": topGroups,                                     //groups in top nav row
        "waveformSnap": true,                                       //do we want the snap to waveform functionality?
        "doUpdates": true,                                          //do we want the data update button and loop?
        "scaling": false,                                           //do we want to expose x-axis rescaling UI?
        "plots": [],                                                //array of names for default plot cells
        "spectrumServer": 'http://grsmid00.triumf.ca:9093',         //analyzer url + port
        "ODBrequests": [],                                          //array of odb requests to make on refresh
        "zeroedPlots": {},                                          //initialize empty object for zeroed plots
        "fitLimits": [],                                            //limits for fitting
        "shiftClickCallback": peakFit                               //function to assign to viewers shift click callback as they are created
    }
    dataStore.cellIndex = dataStore.plots.length;

}
setupDataStore();


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

function peakFit(event, viewer, xBin, yBin){
    // handle peak + bkg fitting; intended as onshiftclick callback for spectrumViewer object
    var target = viewer.canvasID,
        radio = checkedRadio(this.wrapID + 'fitTarget'),
        spectrum = document.querySelector('input.' + target + '-fit-target:checked').getAttribute('spectrum'),
        reportDiv = document.getElementById(target+spectrum+'FitResult'),
        integral = 0,
        functionVals = [],
        i, x, fitResult, sigmas = 5, stepSize = 0.01;

    if(dataStore.fitLimits.length == 0)
        dataStore.fitLimits[0] = xBin;
    else if(dataStore.fitLimits.length == 1){
        dataStore.fitLimits[1] = xBin;

        //do the fit
        fitResult = fitGaussianPlusLinearBkg(viewer.plotBuffer[Object.keys(viewer.plotBuffer)[0]], dataStore.fitLimits[0], dataStore.fitLimits[1]);
        //draw it on the spectrum
        viewer.updatePersistentOverlay(fitResult);
        //report results in the table
        if(reportDiv.innerHTML == '-')
            reportDiv.innerHTML = '';
        for(i=0; i<2*sigmas*fitResult.width/stepSize; i++){
            x = fitResult.center - sigmas*fitResult.width + i*stepSize
            functionVals.push( gauss(fitResult.amplitude, fitResult.center, fitResult.width, x)*stepSize )
            integral = functionVals.integrate()
        }
        reportDiv.innerHTML += 'Center: ' + fitResult.center.toFixed(2) + ', FWHM: ' + (2.35482*fitResult.width).toFixed(2) + ', Area: ' + integral.toFixed(2) + '<br>';

        //refresh for next time.
        dataStore.fitLimits = [];
    }
}