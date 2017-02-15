////////////////////////////////////////////
// main setup
////////////////////////////////////////////

function setupDataStore(){
    var i,j
    var griffinQuads = ['B', 'G', 'R', 'W'];
    var griffinCodes = []
    var sceptarCodes = []
    var pacesCodes = []
    var labr3Codes = []
    var tacCodes = []
    var descantCodes = []

    //generate GRIFFFIN detector nomenclature codes
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            griffinCodes.push('GRG' + alwaysThisLong(i,2) + griffinQuads[j] + 'N00A');
        }
    }
    for(i=1; i<17; i++){
        for(j=0; j<griffinQuads.length; j++){
            griffinCodes.push('GRG' + alwaysThisLong(i,2) + griffinQuads[j] + 'N00B');
        }
    }

    //generate SCEPTAR detector nomenclature codes
    for(i=0; i<20; i++){
        sceptarCodes.push('SEP' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate PACES detector nomenclature codes
    for(i=0; i<5; i++){
        pacesCodes.push('PAC' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate LaBr3 detector nomenclature codes
    for(i=1; i<8; i++){
        labr3Codes.push('DAL' + alwaysThisLong(i,2) + 'XN00X');
    }

    //generate LaBr3 TACs detector nomenclature codes
    for(i=1; i<8; i++){
        tacCodes.push('DAT' + alwaysThisLong(i,2) + 'XN00X');
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
                        'SUM_Singles_Low_gain_Energy',
                        'SUM_Singles_High_gain_Energy',
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
            "name": "PACES",
            "id": "PACES",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "PACenergy",
                    "items": pacesCodes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "PACtime",
                    "items": pacesCodes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "PACpulseHeight",
                    "items": pacesCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Waveform",
                    "id": "PACwaveform",
                    "items": pacesCodes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "LABR3",
            "id": "LABR3",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Energy",
                    "id": "DALenergy",
                    "items": labr3Codes.map(function(c){return c + '_Energy'})
                },
                {
                    "subname": "Time",
                    "id": "DALtime",
                    "items": labr3Codes.map(function(c){return c + '_Time'})
                },
                {
                    "subname": "Pulse Height",
                    "id": "DALpulseHeight",
                    "items": labr3Codes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "Energy Waveform",
                    "id": "DALwaveform",
                    "items": labr3Codes.map(function(c){return c + '_Waveform'})
                }
            ]
        },

        {
            "name": "TACS",
            "id": "TACS",
            "color": '#367FA9',
            "subGroups": [
                {
                    "subname": "Pulse Height",
                    "id": "DATpulseHeight",
                    "items": tacCodes.map(function(c){return c + '_Pulse_Height'})
                },
                {
                    "subname": "TAC Waveform",
                    "id": "DATwaveform",
                    "items": tacCodes.map(function(c){return c + '_Waveform'})
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