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
        "allClear": 0,                                              //counter to track when all templates are loaded
        "topGroups": topGroups,                                     //groups in top nav row
        "waveformSnap": true,                                       //do we want the snap to waveform functionality?
        "doUpdates": true,                                          //do we want the data update button and loop?
        "plots": ['Cell0'],                                         //array of names for default plot cells
        "plotNameListeners": ['plotControl'],                       //array of ids of elements listneing for requestPlot events
        "addPlotRowListeners": ['auxCtrl'],                         //array of ids of elements listneing for addPlotRow events
        "attachCellListeners": ['plotControl'],                     //array of ids of elements listneing for attachCell events
        "deleteCellListeners": ['plotControl', 'auxCtrl'],          //array of ids of elements listneing for deleteCell events
        "newCellListeners": ['plotControl','auxCtrl'],              //array of ids of elements listneing for newCell events
        "spectrumServer": 'http://grsmid00.triumf.ca:9093/',        //analyzer url + port
        "ODBrequests": ['http://grsmid00.triumf.ca:8081/?cmd=jcopy&odb0=/Runinfo/Run number&encoding=json-p-nokeys&callback=parseODB'], //array of odb requests to make on refresh
        "zeroedPlots": {}                                           //initialize empty object for zeroed plots
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

function parseODB(payload){
    //keep track of the current run number after every data update
    var i,
        keys = Object.keys(dataStore.viewers);

    dataStore.currentRun = payload[0]['Run number']

    //dump all spectra zeroing on run change
    if(dataStore.currentRun != dataStore.lastRun){
        for(i=0; i<keys.length; i++){
            dataStore.viewers[keys[i]].baselines = {};
        }
        dataStore.lastRun = dataStore.currentRun
    }
}